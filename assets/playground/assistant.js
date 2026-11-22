// The scripted assistant. It is an ordinary agent: it connects with the agent SDK, attaches,
// and drives the page through the protocol, like examples/kiosk/agent-demo.mjs does through
// a hub. Whatever the page refuses is written down and the script carries on, so the same
// script shows each policy profile for what it is. After its tour it stays attached and
// answers in the Chat tab, with the demo's own scripted answers
// (examples/kiosk/public/chat-script.js): no model is involved anywhere.

const PACE_MS = 700;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const compact = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s === undefined ? '' : s.length > 160 ? `${s.slice(0, 159)}…` : s;
};

/** The session cannot go on: the person stopped it, or refused the attach. */
class Halt extends Error {}

/**
 * @param o.openAgent   () => Promise<ReinsClient>: a new authenticated connection to the broker
 * @param o.ReinsError  the error class of the bundle
 * @param o.driver      the page's driver, read for its status only
 * @param o.log         { step(text), line(kind, label, detail), block(text), clear() }
 * @param o.status      (tone, lead, text) => void
 * @param o.salesUrl    a JSON file for the chart view
 * @param o.chat        { serveChat, CHAT_HELP } of the demo's chat script
 * @param o.onPhase     (phase: 'tour' | 'chat' | 'idle') => void
 */
export function createAssistant({ openAgent, ReinsError, driver, log, status, salesUrl, chat, onPhase = () => {} }) {
  let running = false;
  let leave = () => {};

  /** Resolves when the person has pressed Resume (or Stop, which also ends the pause). */
  const resumed = () =>
    new Promise((resolve) => {
      if (driver.status !== 'paused') return resolve();
      const off = driver.on('status', () => {
        if (driver.status !== 'paused') {
          off();
          resolve();
        }
      });
    });

  async function script(client) {
    let revoked = false;

    /** Run one command. A refusal is logged, not thrown; a pause is waited out and the command sent again. */
    async function attempt(label, fn) {
      for (let tries = 0; ; tries++) {
        try {
          const result = await fn();
          log.line('ok', label, compact(result));
          return { ok: true, result };
        } catch (err) {
          if (!(err instanceof ReinsError)) throw err;
          log.line(err.code === 'E_INTERNAL' ? 'err' : 'held', label, `${err.code}: ${err.message}`);
          if (revoked || err.code === 'E_NOT_ATTACHED' || err.code === 'E_GONE') throw new Halt('stopped');
          if (err.code === 'E_PAUSED' && tries < 30) {
            status('warn', 'Paused by you.', 'The command came back E_PAUSED and nothing changed on the page. Press Resume in the indicator and the assistant sends it again.');
            await resumed();
            await sleep(350);
            if (revoked) throw new Halt('stopped');
            status('', 'Resumed.', 'The assistant sends the held command again.');
            continue;
          }
          return { ok: false, code: err.code };
        }
      }
    }

    log.step('Find the page');
    const surfaces = await client.surfaces();
    const surface = surfaces.find((s) => s.app.id === 'brew-kiosk');
    if (!surface) throw new Error('the page is not registered with the broker');
    log.line('ok', 'surfaces.list', `${surface.s}: ${surface.app.name}, profile ${surface.profile}`);

    log.step('Attach: ask for scopes, and the page decides');
    status('warn', 'Asking to attach.', 'If the page asks you, answer the prompt: Allow lets the assistant in with the scopes the card lists.');
    let page;
    try {
      page = await client.attach(surface.s, { scopes: ['observe', 'act', 'cursor', 'show', 'chat'], reason: 'Order a coffee for you' });
    } catch (err) {
      if (!(err instanceof ReinsError)) throw err;
      log.line('held', 'surface.attach', `${err.code}: ${err.message}`);
      throw new Halt(err.code === 'E_CONSENT' ? 'refused' : err.code);
    }
    // What the person sets in the panel reaches the agent as events. It can read them, and
    // change none of it. A `scopes` event is not the end of the grant.
    page.on('grant', (d) => {
      if (d?.kind === 'scopes') log.line('ok', 'told by the page', `the person switched scopes: now ${Array.isArray(d.scopes) && d.scopes.length ? d.scopes.join(' ') : 'none'}`);
      else revoked = true;
    });
    page.on('user', (d) => {
      if (d?.kind === 'level') log.line('ok', 'told by the page', `the person set this agent's level to ${d.level}`);
      else if (d?.kind === 'rule') log.line('ok', 'told by the page', `the person's rule for ${d.a}: ${d.d === null ? 'removed' : d.d}`);
      else if (d?.kind === 'relay') log.line('ok', 'told by the page', `agents can hear each other: ${d.on ? 'on' : 'off'} for this agent`);
    });
    log.line('ok', 'surface.attach', `granted: ${page.grant.scopes.join(' ')}`);
    // An offer ticked on the attach card is a rule the grant starts with: the agent is told it like any rule.
    if (page.rules?.['order.submit'] === 'allow') log.line('ok', 'told by the page', 'the person ticked order.submit on the card: it runs without asking');
    // The person answered a request of ours that waited (protocol 0.2): allow, deny or expired.
    page.on('answer', (d) => log.line(d?.answer === 'allow' ? 'ok' : 'held', 'told by the page', `the person answered the waiting request ${d?.a ?? 'to connect'}: ${d?.answer}${d?.answer === 'allow' ? '. The SDK asks again with the ticket' : ''}`));
    // What the person tightened for this agent before stays, and the agent is told from the start.
    const kept = [];
    if (page.level === 'strict') kept.push('level strict');
    for (const [a, d] of Object.entries(page.rules ?? {})) kept.push(`${a}: ${d}`);
    if (kept.length) log.line('held', 'kept from before', `${kept.join(', ')}. Only the person lifts these, in the panel.`);
    status('ok', 'Attached.', 'The indicator in the corner names the assistant. Pause and Stop are yours at any time, and its text opens the panel.');

    log.step('The prompt card: everything a model is told about this app');
    const card = page.card();
    log.block(card);
    log.line('ok', 'card', `${card.length} characters`);

    log.step('Observe: the screen as a compact tree');
    const tree = await attempt('observe', () => page.observeText());
    if (tree.ok) {
      log.block(tree.result);
      log.line('ok', 'size', `${tree.result.length} characters for the whole screen`);
    }
    await sleep(PACE_MS);

    log.step('Show the cursor and say hello');
    await attempt('cursor.set', () => page.cursor.show('Assistant'));
    await attempt('show.toast', () => page.show.toast('Hi! Let me set up your order.', 'info', 2600));
    await sleep(PACE_MS);

    log.step('Point at a drink, then call the app action');
    status('ok', 'Working.', 'The cursor is visual only. The order changes through the app action cart.add.');
    await attempt('cursor.move #menu.latte', () => page.cursor.move('#menu.latte'));
    await attempt('show.highlight #menu.latte', () => page.show.highlight('#menu.latte', 'A latte', 1500));
    await attempt('act cart.add latte', () => page.act('cart.add', { sku: 'latte' }));
    await sleep(PACE_MS);

    log.step('One action does what several clicks would; bad arguments never reach the app');
    await attempt('act cart.add mocha x2', () => page.act('cart.add', { sku: 'mocha', qty: 2 }));
    await attempt('act cart.add whisky', () => page.act('cart.add', { sku: 'whisky' }));
    await attempt('cursor.move #customer.name', () => page.cursor.move('#customer.name'));
    await attempt('act customer.set', () => page.act('customer.set', { name: 'Sam' }));
    await sleep(PACE_MS);

    log.step('Observe again: only what changed');
    const delta = await attempt('observe', () => page.observeText());
    if (delta.ok) {
      log.block(delta.result);
      log.line('ok', 'size', `${delta.result.length} characters${tree.ok ? `, against ${tree.result.length} for the full tree` : ''}`);
    }
    await sleep(PACE_MS);

    log.step('Put a chart on screen from a file: the data does not pass through a model');
    const sales = await (await fetch(salesUrl)).json();
    await attempt('cursor.move #insights', () => page.cursor.move('#insights'));
    await attempt('show.view insights', () => page.show.view('insights', sales));
    await sleep(PACE_MS);

    log.step('A sensitive action: placing the order is up to you');
    status('warn', 'Your call.', 'order.submit is marked sensitive. At the level Ask the page asks you under guarded and open; under kiosk it is refused outright. Press “Later”, or do nothing for a minute, and the request waits in the panel: this step waits with it.');
    await attempt('cursor.move #order.submit', () => page.cursor.move('#order.submit'));
    // handle.act() waits for the person's answer by default when the request waits (E_WAITING), up to ten
    // minutes, and repeats it with the ticket once it is allowed. Meanwhile, say so.
    let seen = false;
    const watch = setInterval(() => {
      const w = page.waiting?.().find((x) => x.action === 'order.submit');
      if (!w || seen) return;
      seen = true;
      const left = Math.max(0, Math.round((w.until - Date.now()) / 1000));
      log.line('held', 'act order.submit', `E_WAITING: ticket ${w.ticket}, waits ${left} s. Nothing ran. The SDK waits for your answer and asks again with the ticket.`);
      status('warn', 'Waiting for your answer.', 'The request is in the panel: select “AI connected”, then Review under “Waiting for your answer”, and Allow or Deny. Discard refuses it without a card. The assistant waits.');
    }, 300);
    let order;
    try {
      order = await attempt('act order.submit', () => page.act('order.submit'));
    } finally {
      clearInterval(watch);
    }
    // A refusal on the card is followed by a cool-off: asking again at once shows it. A request that
    // waited and was then discarded or refused in the list moved no cool-off, so it is not asked again.
    if (!order.ok && order.code === 'E_CONSENT' && !seen) {
      log.step('Asking again at once: a refusal is followed by a cool-off');
      await attempt('act order.submit', () => page.act('order.submit'));
    }
    if (!order.ok) await attempt('show.highlight #order.submit', () => page.show.highlight('#order.submit', 'Yours to press', 3000));
    await sleep(PACE_MS);

    log.step('A dangerous action');
    status('ok', 'Working.', 'order.refund is marked dangerous: denied under guarded and kiosk, asked under open.');
    await attempt('act order.refund', () => page.act('order.refund', { order: order.ok ? order.result.id : 'A-101' }));
    await sleep(PACE_MS);

    await attempt('show.toast', () => page.show.toast(order.ok ? `Order ${order.result.id} is in. Enjoy!` : 'Your order is ready to place.', 'ok', 2600));
    await sleep(900);
    await attempt('cursor.set', () => page.cursor.hide());

    // ── the tour is over: stay, and answer in the Chat tab ──
    if (page.attached && page.grant.scopes.includes('chat')) {
      log.step('Stay attached and listen in the Chat tab (scripted answers, no model)');
      onPhase('chat');
      status('ok', 'Listening in the chat.', 'Select “AI connected” in the corner, then Chat, and type “add two mochas” or “place my order”. Under Permissions you can change how much the assistant asks. Type “stop”, or press “Send it away”.');
      // serveChat ends when the grant does: to send the assistant away, tell it so.
      const enders = [];
      const room = {
        chat: page.chat,
        act: (action, args) => page.act(action, args),
        state: (name) => page.state(name),
        on: (event, fn) => {
          if (event === 'grant') enders.push(fn);
          return page.on(event, fn);
        },
      };
      leave = () => {
        for (const fn of enders) fn({ kind: 'revoked' });
      };
      const why = await chat.serveChat(room, {
        hello: `I am done with the tour and I am listening here. ${chat.CHAT_HELP}`,
        log: (line) => log.line('ok', 'chat', line),
      });
      leave = () => {};
      if (revoked || !page.attached) throw new Halt('stopped');
      log.line('ok', 'chat', why === 'stop' ? 'the person said stop' : 'sent away');
    } else if (page.attached) {
      log.line('held', 'chat', 'the grant has no chat scope: this profile grants none');
      await sleep(900);
    }

    log.step('Done: detach');
    await page.detach();
    log.line('ok', 'surface.detach', 'the grant is gone; the indicator leaves the page');
  }

  async function run() {
    if (running) return;
    running = true;
    onPhase('tour');
    log.clear();
    let client;
    try {
      log.step('Connect: challenge, hello, welcome, then a sealed ping and pong');
      status('', 'Connecting.', 'The assistant opens a link to the broker and proves its key.');
      client = await openAgent();
      log.line('ok', 'connect', `session ${client.session}`);
      await script(client);
      status('ok', 'Finished.', 'The assistant detached. Open the Script tab for what it did, or the Wire tab for every frame.');
    } catch (err) {
      if (err instanceof Halt) {
        if (err.message === 'stopped') status('danger', 'Stopped by you.', 'The grant was revoked, and every later request is refused. Until this page is reloaded, each new attach asks you first.');
        else if (err.message === 'refused') status('warn', 'Not attached.', 'You refused, or the prompt timed out. The assistant got E_CONSENT and has no access.');
        else status('warn', 'Not attached.', `The attach was refused with ${err.message}. The Script tab has the message.`);
      } else {
        log.line('err', 'script', String(err?.message ?? err));
        status('danger', 'The script failed.', String(err?.message ?? err).slice(0, 160));
        console.error(err);
      }
    } finally {
      leave = () => {};
      client?.close();
      running = false;
      onPhase('idle');
    }
  }

  return {
    run,
    /** End the chat phase: the assistant detaches. */
    leave: () => leave(),
    get running() {
      return running;
    },
  };
}
