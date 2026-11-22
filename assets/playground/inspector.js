// The Wire tab: one row per message that crossed a link, in the order it crossed.
import { describe } from './frames.js';

const MAX_ROWS = 800;
const LANES = {
  agent: { up: 'agent → broker', down: 'broker → agent' },
  console: { up: 'you → broker', down: 'broker → you' },
  surface: { up: 'page → broker', down: 'broker → page' },
};
const utf8 = new TextEncoder();

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function createInspector() {
  const list = document.getElementById('frames');
  const scroll = document.getElementById('wire-scroll');
  const empty = document.getElementById('wire-empty');
  const count = document.getElementById('count-wire');
  const follow = document.getElementById('wire-follow');
  const filters = document.getElementById('wire-filters');
  const started = performance.now();
  const hiddenGroups = new Set();
  const pendingByLane = new Map(); // lane -> { up: Map(id -> method), down: Map(id -> method) }
  let total = 0;

  const find = document.getElementById('wire-find');
  let needle = '';
  const visible = (li) => !hiddenGroups.has(li.dataset.group) && (needle === '' || li.dataset.text.includes(needle));

  function body(row) {
    const d = row.described;
    const wrap = document.createDocumentFragment();
    const pre = el('pre', 'f-body', typeof d.body === 'string' ? d.body : JSON.stringify(d.body, null, 2));
    wrap.append(pre);
    const size = typeof row.data === 'string' ? utf8.encode(row.data).length : row.data.length;
    const notes = [`${size} bytes on the link`];
    if (d.sealed && typeof row.data === 'string') notes.push(`sealed: the message began with the MAC ${d.mac}, then "."`);
    else if (d.sealed) notes.push(`sealed: ${d.mac}`);
    else if (row.lane === 'surface') notes.push('not sealed: the app built this link itself, and the page holds no key');
    else notes.push('not sealed: sealing starts after welcome');
    if (d.type === 'pointer') notes.push('decoded from the binary layout of section 11');
    wrap.append(el('p', 'f-note', `${notes.join('. ')}.`));
    return wrap;
  }

  /** Report one message. `lane` is agent, console or surface; `direction` is up (towards the broker) or down. */
  function record(lane, direction, data) {
    let pending = pendingByLane.get(lane);
    if (!pending) pendingByLane.set(lane, (pending = { up: new Map(), down: new Map() }));
    // a res answers a req that went the other way on the same link
    const described = describe(data, pending[direction], pending[direction === 'up' ? 'down' : 'up']);
    const row = { lane, direction, data: typeof data === 'string' ? data : data.slice(), described };

    const li = el('li', 'frame is-new');
    li.dataset.group = described.group;
    li.dataset.t = described.type;
    li.dataset.lane = lane;
    const details = el('details');
    const summary = el('summary');
    const s = described.summary;
    summary.append(
      el('span', 'f-time', ((performance.now() - started) / 1000).toFixed(2)),
      el('span', 'f-lane', LANES[lane][direction]),
      el('span', 'f-type', described.type),
    );
    const sum = el('span', 'f-sum');
    if (typeof s === 'string') sum.append(s);
    else {
      if (s.id !== undefined) sum.append(`#${s.id} `);
      sum.append(el('b', '', s.lead));
      if (s.rest) sum.append(` ${s.rest}`);
      if (s.error) li.dataset.err = '';
    }
    if (described.sealed) sum.append(el('span', 'f-seal', 'sealed'));
    summary.append(sum);
    details.append(summary);
    details.addEventListener('toggle', () => {
      if (details.open && details.childElementCount === 1) details.append(body(row));
    });
    li.append(details);
    // what the row says, for the text filter: the lane, the type and the summary
    li.dataset.text = summary.textContent.toLowerCase();
    li.hidden = !visible(li);
    list.append(li);
    while (list.childElementCount > MAX_ROWS) list.firstElementChild.remove();
    total++;
    count.textContent = String(total);
    empty.hidden = true;
    if (follow.getAttribute('aria-pressed') === 'true') scroll.scrollTop = scroll.scrollHeight;
    setTimeout(() => li.classList.remove('is-new'), 1000);
  }

  filters.addEventListener('click', (e) => {
    const chip = e.target instanceof Element ? e.target.closest('[data-filter]') : null;
    if (!chip) return;
    const on = chip.getAttribute('aria-pressed') !== 'true';
    chip.setAttribute('aria-pressed', String(on));
    if (on) hiddenGroups.delete(chip.dataset.filter);
    else hiddenGroups.add(chip.dataset.filter);
    for (const li of list.children) li.hidden = !visible(li);
  });
  find.addEventListener('input', () => {
    needle = find.value.trim().toLowerCase();
    for (const li of list.children) li.hidden = !visible(li);
  });
  follow.addEventListener('click', () => {
    const on = follow.getAttribute('aria-pressed') !== 'true';
    follow.setAttribute('aria-pressed', String(on));
    if (on) scroll.scrollTop = scroll.scrollHeight;
  });
  document.getElementById('wire-clear').addEventListener('click', () => {
    list.replaceChildren();
    total = 0;
    count.textContent = '0';
    empty.hidden = false;
    empty.textContent = 'Cleared. New frames appear here as they cross.';
  });

  return { record };
}
