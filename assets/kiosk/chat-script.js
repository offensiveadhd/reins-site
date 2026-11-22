// The scripted answers of the demo agents to the person's chat: a few intents, no model.
// Shared by the hub-connected demo agent (agent-demo.mjs, in Node) and the in-tab assistant
// (inpage.js, in the browser), so it imports nothing.
//
// What the person types is their request to the agent. It is never an approval: "place my
// order" below calls the app's action, and the page then asks the person on its own prompt.

export const CHAT_HELP = 'Try "add a latte", "what is in my order", "place my order" or "stop".';
export const CHAT_HELLO = `Hi, I am a scripted demo, so I only know a few things. ${CHAT_HELP}`;

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const money = (n) => `$${Number(n).toFixed(2)}`;
const words = (text) => String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

/** What a refusal means, in words for the person. */
function refused(err) {
  const code = typeof err?.code === 'string' ? err.code : '';
  if (code === 'E_CONSENT') return 'You said no on the page, so I left it.';
  if (code === 'E_DENIED') return 'This page does not let me do that.';
  if (code === 'E_PAUSED') return 'I am paused. Press Resume on the indicator and ask me again.';
  if (code === 'E_SCOPE') return 'You switched that off for me, so I cannot.';
  if (code === 'E_RATE') return 'That was too fast for me. Ask again in a moment.';
  if (code === 'E_BUSY') return 'The page is waiting for your answer to a request. Answer it there first.';
  if (code.startsWith('E_')) return `That did not work (${code}).`;
  throw err;
}

/** The drink a message names, and how many: "two mochas", "3 lattes", "a flat white". */
function drinkIn(text, menu) {
  const w = words(text);
  // The longest name first, so that "chai latte" is not taken for a latte.
  for (const item of [...menu].sort((a, b) => words(b.name).length - words(a.name).length)) {
    const name = words(item.name);
    for (let i = 0; i + name.length <= w.length; i++) {
      // The last word may be a plural: "lattes".
      const hit = name.every((n, k) => w[i + k] === n || (k === name.length - 1 && (w[i + k] === `${n}s` || w[i + k] === `${n}es`)));
      if (!hit) continue;
      const before = w[i - 1];
      const qty = before === undefined ? 1 : /^[1-9]$/.test(before) ? Number(before) : (NUMBERS[before] ?? 1);
      return { sku: item.sku, name: item.name, qty };
    }
  }
  return undefined;
}

function describeCart(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  if (items.length === 0) return 'Your order is empty.';
  const list = items.map((i) => `${i.qty} ${i.name ?? i.sku}`).join(', ');
  return `Your order: ${list}. Total ${money(cart.total ?? 0)}.`;
}

/**
 * Answer one message of the person.
 *
 * @param text   what the person typed
 * @param kiosk  the SurfaceHandle of the attached page (`act`, `state`)
 * @returns {Promise<{ reply: string, stop?: boolean, note?: string }>}  `note` is what the agent was doing, for its status
 */
export async function answerChat(text, kiosk) {
  const t = ` ${words(text).join(' ')} `;
  if (/ (stop|bye|goodbye|quit|leave|that is all|that's all|thanks that is all) /.test(t)) {
    return { reply: 'Okay, I will leave you to it. Goodbye!', stop: true };
  }
  try {
    if (/ (place|submit|send|checkout|check out|pay) /.test(t)) {
      // The message is a request, not an approval: the page asks the person now.
      const order = await kiosk.act('order.submit');
      return { reply: `Done: order ${order?.id ?? ''} is placed, ${money(order?.total ?? 0)}.`.replace('  ', ' '), note: 'placing your order' };
    }
    if (/ (what|which|show|list|read) .*(order|cart|basket|total) /.test(t) || / (my order|the order|total) /.test(t)) {
      const state = await kiosk.state('cart');
      return { reply: describeCart(state.cart), note: 'reading your order' };
    }
    const menu = await kiosk.act('menu.list');
    if (/ (menu|drinks|what do you have|what can i get) /.test(t)) {
      return { reply: `We have ${menu.map((m) => `${m.name} (${money(m.price)})`).join(', ')}.`, note: 'reading the menu' };
    }
    const drink = drinkIn(text, menu);
    if (drink && / (remove|without|take off|drop|no|cancel) /.test(t)) {
      const cart = await kiosk.act('cart.remove', { sku: drink.sku });
      return { reply: `Removed the ${drink.name}. Your total is ${money(cart?.total ?? 0)}.`, note: `removing the ${drink.name}` };
    }
    if (drink) {
      const cart = await kiosk.act('cart.add', { sku: drink.sku, qty: drink.qty });
      return { reply: `Added ${drink.qty} ${drink.name}. Your total is ${money(cart?.total ?? 0)}.`, note: `adding ${drink.qty} ${drink.name}` };
    }
  } catch (err) {
    return { reply: refused(err) };
  }
  return { reply: `I did not understand that. ${CHAT_HELP}` };
}

/**
 * Serve the chat of one attached page with the scripted answers, until the person says stop
 * or the grant ends. Messages are answered one at a time, in order; other agents' messages
 * are not requests and get no answer.
 *
 * @param kiosk  the SurfaceHandle, attached with the `chat` scope
 * @param opts   { log?: (line) => void, hello?: string | false, keepaliveMs?: number }
 * @returns {Promise<'stop' | 'ended'>}
 */
export function serveChat(kiosk, opts = {}) {
  const log = opts.log ?? (() => {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /**
   * Say something; while a consent prompt is up the page takes no chat, so try again for a
   * while. `to: 'person'` is for the person alone: no other agent in the chat is sent it.
   */
  const say = async (text, to) => {
    for (let i = 0; i < 60; i++) {
      try {
        return await (to === undefined ? kiosk.chat.say(text) : kiosk.chat.say(text, { to }));
      } catch (err) {
        if (err?.code !== 'E_BUSY' && err?.code !== 'E_RATE') return undefined;
        await sleep(1500);
      }
    }
    return undefined;
  };
  return new Promise((resolve) => {
    const queue = [];
    let busy = false;
    let done = false;
    const finish = (why) => {
      if (done) return;
      done = true;
      clearInterval(keep);
      offChat();
      offGrant();
      offSurface();
      resolve(why);
    };
    // An agent that only listens makes no request, and a grant nobody uses lapses after the
    // policy's idle time. While it serves the chat, and only then, it reads the room now and
    // then (as `reins_chat` does while it waits) and drops the answer.
    const keep = setInterval(() => void kiosk.chat.read({ max: 1 }).catch(() => {}), opts.keepaliveMs ?? 45_000);
    keep.unref?.();
    const pump = async () => {
      if (busy) return;
      busy = true;
      while (queue.length && !done) {
        const m = queue.shift();
        log(`chat #${m.id} from the person (${m.text.length} characters)`);
        await kiosk.chat.status('thinking').catch(() => {});
        const a = await answerChat(m.text, kiosk).catch(() => ({ reply: 'Something went wrong on my side.' }));
        if (a.note) await kiosk.chat.status('working', a.note).catch(() => {});
        // Asked in private, answered in private: a message that was for this agent alone
        // (`to`) is answered to the person alone.
        await say(a.reply, m.to === undefined ? undefined : 'person');
        await kiosk.chat.status('idle').catch(() => {});
        if (a.stop) finish('stop');
      }
      busy = false;
    };
    const offChat = kiosk.on('chat', (m) => {
      if (m?.from?.kind !== 'person') return;
      queue.push(m);
      void pump();
    });
    const offGrant = kiosk.on('grant', (d) => {
      if (d?.kind === 'revoked' || d?.kind === 'expired') finish('ended');
    });
    const offSurface = kiosk.on('surface', (d) => {
      if (d?.kind === 'gone') finish('ended');
    });
    if (opts.hello !== false) void say(opts.hello ?? CHAT_HELLO);
  });
}
