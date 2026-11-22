// The console: the visitor as a second agent, with a credential of its own. A request is
// made through the public agent SDK (connect, attach, the surface handle), so what crosses
// the link is exactly what any SDK user would send, and the Wire tab shows it.

const ALL_SCOPES = ['observe', 'act', 'ui', 'cursor', 'show', 'nav', 'chat'];
const TOPICS = ['ui', 'state', 'user', 'nav', 'grant', 'surface', 'chat'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the method list offers: a method of the protocol, example params, and the SDK call behind it. */
const PRESETS = [
  {
    group: 'Hub (no scope)',
    items: [
      { label: 'surface.attach', m: 'surface.attach', p: { scopes: ALL_SCOPES, reason: 'Trying the console' }, note: 'Asks the page. The answer is the grant; the prompt card rendered from the manifest is shown under it.' },
      { label: 'hub.info', m: 'hub.info', p: {} },
      { label: 'surfaces.list', m: 'surfaces.list', p: {}, note: 'Without an observe grant the listing is reduced: url is the origin and title is the app name.' },
      { label: 'surface.detach', m: 'surface.detach', p: {} },
      { label: 'what the person set for you (no request)', m: 'local.settings', p: {}, note: 'Not a request: the SDK keeps the level, the rules and the scopes in force current from the events the hub sends. Change them in the panel and read them again.' },
    ],
  },
  {
    group: 'Scope observe',
    items: [
      { label: 'observe (compact text)', m: 'observe', p: { full: false, text: true }, note: 'text: true renders the tree the way a model reads it (the SDK tracks since for you). full: true asks for a snapshot instead of a delta.' },
      { label: 'observe (JSON, with boxes)', m: 'observe', p: { full: true, boxes: true, text: false } },
      { label: 'read', m: 'read', p: { h: '#cart', max: 2000 }, note: 'Visible text of an element, or of the page without h. Private and ignored subtrees are left out.' },
      { label: 'state.get', m: 'state.get', p: { name: 'cart' } },
      { label: 'sub', m: 'sub', p: { topics: ['ui', 'state', 'user'] }, note: 'Events then arrive on their own; they are listed here as they come.' },
    ],
  },
  {
    group: 'Scope act',
    items: [
      { label: 'act: cart.add (safe)', m: 'act', p: { a: 'cart.add', args: { sku: 'latte', qty: 1 } } },
      { label: 'act: cart.add with a bad argument', m: 'act', p: { a: 'cart.add', args: { sku: 'whisky' } }, note: 'Arguments are validated against the schema before any handler runs.' },
      { label: 'act: order.submit (sensitive)', m: 'act', p: { a: 'order.submit', wait: false }, note: 'Sensitive: the page asks you under guarded and open, and refuses under kiosk. Press Later, or let the card time out, and the answer is E_WAITING with a ticket: the request waits in the panel. Send the same call again once you allowed it there, and the SDK repeats it with the ticket.' },
      { label: 'act: order.submit, waiting for your answer', m: 'act', p: { a: 'order.submit', wait: true }, note: 'The same, with the SDK\'s default: the call does not return until you answered on the card or in the panel (up to ten minutes). Answer there; the console waits.' },
      { label: 'act: order.refund (dangerous)', m: 'act', p: { a: 'order.refund', args: { order: 'A-101' } } },
    ],
  },
  {
    group: 'Scope ui',
    items: [
      { label: 'ui.click', m: 'ui.click', p: { h: '#menu.mocha' }, note: 'Input-synthesising commands wait until you have stopped using the page for human.yieldMs.' },
      { label: 'ui.type', m: 'ui.type', p: { h: '#customer.name', text: 'Sam', clear: true } },
      { label: 'ui.type into the private PIN field', m: 'ui.type', p: { h: '#staff.pin', text: '2468' }, note: 'Open the Staff panel first, or the field is not exposed at all.' },
      { label: 'ui.key', m: 'ui.key', p: { key: 'Tab' } },
      { label: 'ui.scroll', m: 'ui.scroll', p: { h: '#insights', to: 'view' } },
    ],
  },
  {
    group: 'Scope cursor',
    items: [
      { label: 'cursor.set', m: 'cursor.set', p: { visible: true, label: 'You', color: '#16a34a' } },
      { label: 'cursor.move to an element', m: 'cursor.move', p: { to: '#cart.total' } },
      { label: 'cursor.move to a point', m: 'cursor.move', p: { to: { x: 240, y: 320 }, ms: 600 }, note: 'Raw coordinates need policy.coordinates: the kiosk profile says no.' },
      { label: 'stream.open: circle the total with the pointer stream', m: 'stream.open', p: { turns: 2 }, note: 'Opens a pointer stream and sends binary frames; watch them and the flow frames in the Wire tab.' },
    ],
  },
  {
    group: 'Scope show',
    items: [
      { label: 'show.toast', m: 'show.toast', p: { text: 'Hello from the console', kind: 'info', ms: 2500 } },
      { label: 'show.highlight', m: 'show.highlight', p: { h: '#order.submit', label: 'Here', ms: 2500 } },
      {
        label: 'show.view',
        m: 'show.view',
        p: { view: 'insights', data: { title: 'Cups today', unit: 'cups', series: [{ label: 'Latte', value: 42 }, { label: 'Mocha', value: 18 }] } },
      },
      { label: 'show.clear', m: 'show.clear', p: {} },
    ],
  },
  {
    group: 'Scope chat',
    items: [
      { label: 'chat.say', m: 'chat.say', p: { text: 'Hello from the console.' }, note: 'Goes to everyone who hears you: the person always, other agents only where the room relays (under guarded, once the person switches "Agents can hear each other" on).' },
      { label: 'chat.say to the person alone', m: 'chat.say', p: { text: 'Only you see this.', to: 'person' } },
      { label: 'chat.say to the other agent', m: 'chat.say', p: { text: 'Can you hear me?', to: 'a1' }, note: 'to is the other agent\'s session id, shown after its name in the panel: a1 when the assistant connected first. E_DENIED while no other agent hears you; E_BAD_ARGS when it names no agent that does.' },
      { label: 'chat.read', m: 'chat.read', p: { max: 20 }, note: 'What you may read: nothing from before your grant, nothing addressed to someone else.' },
      { label: 'chat.status', m: 'chat.status', p: { state: 'working', note: 'reading the menu' } },
    ],
  },
  {
    group: 'Scope nav',
    items: [{ label: 'nav.go', m: 'nav.go', p: { url: '/' }, note: 'This page sets policy.nav to an empty list, so navigation is off and the answer is E_DENIED.' }],
  },
];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const pretty = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2) ?? 'undefined');

/**
 * @param o.openAgent   () => Promise<ReinsClient>
 * @param o.ReinsError  the error class of the bundle
 */
export function createConsole({ openAgent, ReinsError }) {
  const form = document.getElementById('console-form');
  const select = document.getElementById('console-method');
  const params = document.getElementById('console-params');
  const note = document.getElementById('console-note');
  const out = document.getElementById('console-out');
  const send = document.getElementById('console-send');
  const flat = PRESETS.flatMap((g) => g.items);
  let client;
  let page;

  for (const g of PRESETS) {
    const group = document.createElement('optgroup');
    group.label = g.group;
    for (const item of g.items) {
      const option = document.createElement('option');
      option.value = String(flat.indexOf(item));
      option.textContent = item.label;
      group.append(option);
    }
    select.append(group);
  }
  const choose = () => {
    const item = flat[Number(select.value)];
    params.value = JSON.stringify(item.p, null, 2);
    note.textContent = item.note ?? '';
  };
  select.addEventListener('change', choose);
  choose();

  function show(kind, title, detail, body) {
    const li = el('li');
    const head = el('div', 'co-head');
    head.append(el('b', '', title), el('span', kind === 'ok' ? 'co-ok' : kind === 'err' ? 'co-err' : 'co-local', kind === 'ok' ? 'ok' : kind === 'err' ? 'error' : kind));
    if (detail) head.append(el('span', '', detail));
    li.append(head);
    if (body !== undefined && body !== '') li.append(el('pre', 'co-body', pretty(body)));
    out.prepend(li);
    while (out.childElementCount > 40) out.lastElementChild.remove();
  }

  async function ensureClient() {
    if (client) return client;
    const c = await openAgent();
    c.on('close', () => {
      if (client === c) {
        client = undefined;
        page = undefined;
      }
    });
    client = c;
    return c;
  }

  const needPage = () => {
    if (page && page.attached) return page;
    return undefined;
  };

  /** Circle the order total with a live pointer stream, as the demo agent does. */
  async function circle(h, turns) {
    const snapshot = await h.observe({ boxes: true, full: true });
    const total = (snapshot.nodes ?? []).find((n) => n.id === 'cart.total');
    if (!total?.box || !(snapshot.vp[0] > 0) || !(snapshot.vp[1] > 0)) throw new ReinsError('E_NO_TARGET', 'the total has no box to circle');
    const [x, y, w, bh] = total.box;
    const [vw, vh] = snapshot.vp;
    const cx = (x + w / 2) / vw;
    const cy = (y + bh / 2) / vh;
    const rx = (w / 2 + 22) / vw;
    const ry = (bh / 2 + 14) / vh;
    const pen = await h.pointer();
    const points = Math.round(120 * Math.min(4, Math.max(1, Number(turns) || 2)));
    for (let i = 0; i <= points; i++) {
      const a = (i / 120) * Math.PI * 2 - Math.PI / 2;
      pen.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 8);
      if (i % 4 === 3) await sleep(32);
    }
    await pen.end();
    return { sent: pen.stats.sent, dropped: pen.stats.dropped };
  }

  /** One request: the SDK call behind each method of the protocol. Returns { call, result }. */
  async function request(m, p) {
    const c = await ensureClient();
    if (m === 'hub.info') return { call: 'client.info()', result: await c.info() };
    if (m === 'surfaces.list') return { call: 'client.surfaces()', result: await c.surfaces() };
    if (m === 'surface.attach') {
      const surface = (await c.surfaces()).find((s) => s.app.id === 'brew-kiosk');
      if (!surface) throw new ReinsError('E_NO_SURFACE', 'the page is not registered with the broker');
      const opts = {};
      if (p.scopes !== undefined) opts.scopes = p.scopes;
      if (p.reason !== undefined) opts.reason = p.reason;
      page = await c.attach(surface.s, opts);
      for (const topic of TOPICS) page.on(topic, (d) => show('event', `evt ${topic}`, 'an event from the hub', d ?? {}));
      return { call: `client.attach("${surface.s}", …)`, result: { grant: page.grant, surface: page.info }, card: page.card() };
    }
    const h = needPage();
    if (!h) return { local: 'No live grant, so nothing was sent. The SDK hands out a surface handle when the page accepts an attach, and the handle ends with the grant. Send surface.attach.' };
    switch (m) {
      case 'surface.detach':
        return { call: 'page.detach()', result: (await h.detach()) ?? {} };
      case 'observe':
        if (p.text === false) return { call: 'page.observe(…)', result: await h.observe({ full: p.full === true, boxes: p.boxes === true }) };
        return { call: 'page.observeText(…)', result: await h.observeText({ full: p.full === true }) };
      case 'read':
        return { call: 'page.read(…)', result: await h.read(p.h, p.max) };
      case 'state.get':
        return { call: 'page.state(…)', result: await h.state(p.name) };
      case 'sub':
        return { call: 'page.subscribe(…)', result: (await h.subscribe(p.topics)) ?? { subscribed: p.topics } };
      case 'act':
        // wait: false shows E_WAITING, with its ticket, at once; wait: true lets the SDK wait for the person's answer
        return { call: `page.act("${p.a}", …, { wait: ${p.wait === true} })`, result: (await h.act(p.a, p.args, { wait: p.wait === true })) ?? null };
      case 'ui.click':
        return { call: 'page.click(…)', result: (await h.click(p.h)) ?? {} };
      case 'ui.type':
        return { call: 'page.type(…)', result: (await h.type(p.h, p.text, { clear: p.clear, enter: p.enter })) ?? {} };
      case 'ui.select':
        return { call: 'page.select(…)', result: (await h.select(p.h, p.value)) ?? {} };
      case 'ui.scroll':
        return { call: 'page.scroll(…)', result: (await h.scroll({ h: p.h, dx: p.dx, dy: p.dy, to: p.to })) ?? {} };
      case 'ui.key':
        return { call: 'page.key(…)', result: (await h.key(p.key, p.h)) ?? {} };
      case 'cursor.move':
        return { call: 'page.cursor.move(…)', result: await h.cursor.move(p.to, { ms: p.ms, wait: p.wait }) };
      case 'cursor.set':
        return { call: p.visible === false ? 'page.cursor.hide()' : 'page.cursor.show(…)', result: (p.visible === false ? await h.cursor.hide() : await h.cursor.show(p.label, p.color)) ?? {} };
      case 'show.toast':
        return { call: 'page.show.toast(…)', result: (await h.show.toast(p.text, p.kind, p.ms)) ?? {} };
      case 'show.highlight':
        return { call: 'page.show.highlight(…)', result: (await h.show.highlight(p.h, p.label, p.ms)) ?? {} };
      case 'show.view':
        return { call: 'page.show.view(…)', result: (await h.show.view(p.view, p.data)) ?? {} };
      case 'show.clear':
        return { call: 'page.show.clear()', result: (await h.show.clear()) ?? {} };
      case 'chat.say':
        return { call: 'page.chat.say(…)', result: await h.chat.say(p.text, p.to === undefined ? undefined : { to: p.to }) };
      case 'chat.read':
        return { call: 'page.chat.read(…)', result: await h.chat.read({ since: p.since, max: p.max }) };
      case 'chat.status':
        return { call: 'page.chat.status(…)', result: (await h.chat.status(p.state, p.note)) ?? {} };
      case 'local.settings':
        return { call: 'page.level, page.rules, page.grant.scopes, page.chatRelay, page.waiting()', result: { level: h.level, rules: h.rules, scopes: h.grant.scopes, chatRelay: h.chatRelay, waiting: h.waiting?.() ?? [] } };
      case 'nav.go':
        return { call: 'page.go(…)', result: (await h.go(p.url)) ?? {} };
      case 'stream.open':
        return { call: 'page.pointer(), push(…), end()', result: await circle(h, p.turns) };
      default:
        return { local: `The console has no SDK call for ${m}.` };
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = flat[Number(select.value)];
    let p;
    try {
      p = params.value.trim() === '' ? {} : JSON.parse(params.value);
      if (p === null || typeof p !== 'object' || Array.isArray(p)) throw new Error('params must be a JSON object');
    } catch (err) {
      show('console', item.m, 'not sent', `The params are not a JSON object: ${err.message}`);
      return;
    }
    send.disabled = true;
    const started = performance.now();
    try {
      const r = await request(item.m, p);
      const ms = `${Math.round(performance.now() - started)} ms`;
      if (r.local) show('console', item.m, 'not sent', r.local);
      else {
        if (r.card) show('ok', 'prompt card', 'page.card(): rendered from the manifest in the answer', r.card);
        show('ok', item.m, `${r.call} · ${ms}`, r.result);
      }
    } catch (err) {
      const ms = `${Math.round(performance.now() - started)} ms`;
      if (err instanceof ReinsError) show('err', item.m, ms, `${err.code}: ${err.message}`);
      else {
        show('err', item.m, ms, String(err?.message ?? err));
        console.error(err);
      }
    } finally {
      send.disabled = false;
    }
  });

  return {
    enable() {
      send.disabled = false;
    },
  };
}
