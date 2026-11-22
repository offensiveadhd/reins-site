// The playground: Reins with no hub process. The page, a broker, a scripted assistant and
// a console all live in this tab, as in examples/kiosk/public/inpage.js. Everything Reins
// comes from one file, the kit bundle the repository builds (dist/bundle/reins.js).
import * as reins from '../reins/reins.js';
import * as app from '../kiosk/app.js';
import { registerActions } from '../kiosk/actions.js';
import { CHAT_HELP, serveChat } from '../kiosk/chat-script.js';
import { createAssistant } from './assistant.js';
import { createConsole } from './console.js';
import { createInspector } from './inspector.js';
import { mountKiosk } from './kiosk-view.js';
import { relay } from './tap.js';

const { Broker, ReinsError, connect, createDriver, linkPair, randomToken } = reins;
const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ── the policy profile comes from the address, as in the demo: ?profile=kiosk ──
const PROFILES = ['guarded', 'kiosk', 'open'];
const asked = new URLSearchParams(location.search).get('profile');
const profile = PROFILES.includes(asked) ? asked : 'guarded';
for (const a of $('pg-profile').querySelectorAll('a')) {
  if (a.dataset.profile === profile) a.setAttribute('aria-current', 'true');
}

// ── the status line under the buttons ──
const statusEl = $('pg-status');
function status(tone, lead, text) {
  statusEl.dataset.tone = tone;
  statusEl.replaceChildren(el('b', '', lead), ` ${text}`);
}

// ── tabs ──
const tabs = [...document.querySelectorAll('.pg-tabs [role="tab"]')];
function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  }
  if (focus) tab.focus();
  tab.dispatchEvent(new CustomEvent('tabshown'));
}
for (const t of tabs) {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const shown = tabs.filter((x) => !x.hidden);
    const i = shown.indexOf(t);
    if (e.key === 'ArrowRight') selectTab(shown[(i + 1) % shown.length], true);
    else if (e.key === 'ArrowLeft') selectTab(shown[(i - 1 + shown.length) % shown.length], true);
    else if (e.key === 'Home') selectTab(shown[0], true);
    else if (e.key === 'End') selectTab(shown.at(-1), true);
    else return;
    e.preventDefault();
  });
}

// ── the script log ──
const scriptLog = $('script-log');
const log = {
  clear() {
    scriptLog.replaceChildren();
    $('script-empty').hidden = true;
  },
  step(text) {
    scriptLog.append(el('li', 's-step', text));
  },
  line(kind, label, detail) {
    const li = el('li', `s-${kind}`);
    li.append(el('span', 's-tag', kind === 'ok' ? 'ok' : kind === 'held' ? 'held' : 'error'), el('span', 's-text', detail ? `${label} → ${detail}` : label));
    scriptLog.append(li);
    li.scrollIntoView({ block: 'nearest' });
  },
  block(text) {
    const li = el('li');
    li.append(el('pre', '', text));
    scriptLog.append(li);
  },
};

async function start() {
  if (location.protocol === 'file:') throw new Error('open this page through a web server, not from a file: a module cannot be loaded from disk.');
  const inspector = createInspector();
  const kiosk = mountKiosk();
  const origin = location.origin;

  // 1. A broker in the tab, with one credential for the assistant and one for the console.
  //    The secrets are made here and never leave the page.
  const keys = { assistant: randomToken(32), console: randomToken(32) };
  const audit = typeof reins.memoryAudit === 'function' ? reins.memoryAudit() : undefined;
  const broker = new Broker({
    agents: [
      { kid: 'tab-assistant', key: keys.assistant, name: 'Tab assistant', origins: [origin] },
      { kid: 'console', key: keys.console, name: 'You, at the console', origins: [origin] },
    ],
    surfaces: { origins: [origin] },
    policy: profile,
    ...(audit && { audit }),
  });

  /** A link to the broker with a tap in the middle. Returns the end the SDK or the driver holds. */
  const tappedLink = (lane) => {
    const [peerEnd, tapPeerSide] = linkPair();
    const [tapBrokerSide, brokerEnd] = linkPair();
    relay(tapPeerSide, tapBrokerSide, (direction, data) => inspector.record(lane, direction, data));
    broker.accept(brokerEnd, { origin });
    return peerEnd;
  };

  // 2. The page side: the driver, on the demo app only (root), under the chosen profile.
  const driver = createDriver({
    app: { id: 'brew-kiosk', name: 'Brew Kiosk', version: '1.0.0', description: 'Self-service coffee ordering.' },
    link: tappedLink('surface'),
    // One page, so no agent navigation at all: that also keeps ?profile= out of an agent's reach.
    // `offer`: the attach prompt offers to let the assistant place orders without asking each time,
    // as the demo's own in-tab page does (examples/kiosk/public/inpage.js).
    policy: { profile, nav: [], human: { offer: ['order.submit'] } },
    root: $('kiosk'),
  });
  registerActions(driver, { app, ReinsError });
  app.subscribe(() => driver.notify());
  await driver.connect();

  const leave = $('pg-leave');

  // 3. The agent side: the assistant and the console connect the same way any agent does.
  const openAgent = (kid, key, name, lane) => () => connect({ link: tappedLink(lane), kid, key, name });
  const assistant = createAssistant({
    openAgent: openAgent('tab-assistant', keys.assistant, 'Tab assistant', 'agent'),
    ReinsError,
    driver,
    log,
    status,
    salesUrl: new URL('../kiosk/sales.json', import.meta.url),
    // the demo's own scripted answers to the person's chat messages: no model
    chat: { serveChat, CHAT_HELP },
    onPhase: (phase) => {
      leave.hidden = phase !== 'chat';
    },
  });
  const con = createConsole({ openAgent: openAgent('console', keys.console, 'You, at the console', 'console'), ReinsError });

  // A kiosk starts the next visitor from a clean slate whenever the assistant lets go.
  driver.on('detach', () => {
    if (profile === 'kiosk') kiosk.reset();
  });

  const run = $('pg-run');
  const reset = $('pg-reset');
  leave.addEventListener('click', () => assistant.leave());
  const idle = () => status('', 'Ready.', `The driver is connected to the broker in this tab, under the ${profile} profile. Press “Run the assistant”, or open the Console and attach yourself as a second agent.`);
  run.addEventListener('click', async () => {
    run.disabled = true;
    await assistant.run();
    run.disabled = false;
  });
  reset.addEventListener('click', () => {
    kiosk.reset();
    if (!assistant.running) idle();
  });
  run.disabled = false;
  reset.disabled = false;
  con.enable();
  idle();

  // ── the audit tab, when the bundle exports memoryAudit ──
  if (audit) {
    const tab = $('tab-audit');
    const rows = $('audit-rows');
    const table = $('audit-table');
    const count = $('count-audit');
    let drawn = 0;
    const short = (s) => (typeof s === 'string' && s.length > 12 ? `${s.slice(0, 12)}…` : (s ?? ''));
    const draw = () => {
      const records = audit.records;
      count.textContent = String(records.length);
      if ($('panel-audit').hidden) return;
      for (; drawn < records.length; drawn++) {
        const r = records[drawn];
        const tr = document.createElement('tr');
        // a `person` record says what the person set (value) or how long their chat message was (chars), never its text
        const what = [r.method, r.action, r.value, r.chars !== undefined ? `${r.chars} chars` : undefined].filter((x) => x !== undefined && x !== '').join(' ');
        const cells = [r.seq, r.kind, r.agent ?? r.kid ?? r.role ?? '', what, r.outcome + (r.ref !== undefined ? ` (ref ${r.ref})` : ''), short(r.args)];
        for (const c of cells) tr.append(el('td', '', String(c)));
        tr.append(el('td', 'a-hash', short(r.hash)));
        rows.append(tr);
      }
      table.hidden = records.length === 0;
      $('audit-empty').hidden = records.length > 0;
    };
    tab.hidden = false;
    tab.addEventListener('tabshown', draw);
    setInterval(draw, 600);
  }

  // for people who open the developer tools
  window.reinsPlayground = { driver, profile };
}

try {
  await start();
} catch (err) {
  console.error(err);
  const box = $('pg-error');
  box.hidden = false;
  box.textContent = `The playground could not start: ${String(err?.message ?? err)}`;
  status('danger', 'Not running.', 'See the message above.');
}
