// Search over the index the build wrote (search-index.json): one entry per section of
// every wiki page. Everything happens in the browser; no query leaves the page.

const dialog = document.getElementById('search');
const input = document.getElementById('search-input');
const list = document.getElementById('search-results');
const status = document.getElementById('search-status');
const root = new URL('../', import.meta.url);
const MAX = 40;

let entries;
let loading;
let active = -1;

async function load() {
  if (entries) return entries;
  loading ??= fetch(new URL('search-index.json', root))
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then((data) => {
      // lower-case copies once, so a keystroke only compares strings
      entries = data.map((e) => ({ ...e, lp: e.p.toLowerCase(), lh: e.h.toLowerCase(), lx: e.x.toLowerCase() }));
      return entries;
    });
  return loading;
}

const terms = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);

function score(e, words) {
  let total = 0;
  for (const w of words) {
    let s = 0;
    if (e.lh === w || e.lp === w) s += 40;
    if (e.lh.includes(w)) s += 14;
    if (e.lp.includes(w)) s += e.h === '' ? 12 : 5;
    const at = e.lx.indexOf(w);
    if (at !== -1) {
      s += 3;
      // a whole word counts for more than a fragment of one
      const before = e.lx[at - 1];
      const after = e.lx[at + w.length];
      if ((before === undefined || /[^a-z0-9_]/.test(before)) && (after === undefined || /[^a-z0-9_]/.test(after))) s += 3;
    }
    if (s === 0) return 0; // every word has to be somewhere in the entry
    total += s;
  }
  return total;
}

/** `text` as nodes, with each occurrence of a search word wrapped in <mark>. */
function marked(text, words) {
  const frag = document.createDocumentFragment();
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    let next = -1;
    let len = 0;
    for (const w of words) {
      const at = lower.indexOf(w, i);
      if (at !== -1 && (next === -1 || at < next || (at === next && w.length > len))) {
        next = at;
        len = w.length;
      }
    }
    if (next === -1) break;
    if (next > i) frag.append(text.slice(i, next));
    const m = document.createElement('mark');
    m.textContent = text.slice(next, next + len);
    frag.append(m);
    i = next + len;
  }
  if (i < text.length) frag.append(text.slice(i));
  return frag;
}

function snippet(e, words) {
  let at = -1;
  for (const w of words) {
    const k = e.lx.indexOf(w);
    if (k !== -1 && (at === -1 || k < at)) at = k;
  }
  if (at === -1) return e.x.slice(0, 150) + (e.x.length > 150 ? ' …' : '');
  const start = Math.max(0, at - 60);
  const end = Math.min(e.x.length, at + 110);
  return (start > 0 ? '… ' : '') + e.x.slice(start, end).trim() + (end < e.x.length ? ' …' : '');
}

function setActive(i) {
  const items = [...list.children];
  if (items.length === 0) {
    active = -1;
    input.removeAttribute('aria-activedescendant');
    return;
  }
  active = (i + items.length) % items.length;
  for (const [k, li] of items.entries()) li.setAttribute('aria-selected', String(k === active));
  input.setAttribute('aria-activedescendant', items[active].id);
  items[active].scrollIntoView({ block: 'nearest' });
}

function render(q) {
  list.replaceChildren();
  active = -1;
  input.removeAttribute('aria-activedescendant');
  const words = terms(q);
  if (words.length === 0) {
    status.textContent = entries ? `Search ${entries.length} sections of the wiki, the specification and the security model.` : '';
    return;
  }
  const hits = entries
    .map((e) => ({ e, s: score(e, words) }))
    .filter((h) => h.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX);
  status.textContent = hits.length === 0 ? `Nothing found for "${q.trim()}".` : `${hits.length === MAX ? `The first ${MAX}` : hits.length} result${hits.length === 1 ? '' : 's'}. Arrow keys to move, Enter to open.`;
  for (const [k, { e }] of hits.entries()) {
    const li = document.createElement('li');
    li.id = `search-hit-${k}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    const a = document.createElement('a');
    a.href = new URL(e.u, root).href;
    const where = document.createElement('span');
    where.className = 'sr-where';
    const title = document.createElement('span');
    title.append(marked(e.h ? `${e.p}: ${e.h}` : e.p, words));
    const section = document.createElement('small');
    section.textContent = e.s;
    where.append(title, section);
    const text = document.createElement('span');
    text.className = 'sr-snippet';
    text.append(marked(snippet(e, words), words));
    a.append(where, text);
    li.append(a);
    list.append(li);
  }
  if (hits.length > 0) setActive(0);
}

list.setAttribute('role', 'listbox');
list.setAttribute('aria-label', 'Search results');
input.setAttribute('role', 'combobox');
input.setAttribute('aria-expanded', 'true');
input.setAttribute('aria-autocomplete', 'list');

input.addEventListener('input', () => {
  if (entries) render(input.value);
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(active + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(active - 1);
  } else if (e.key === 'Enter' && active !== -1) {
    e.preventDefault();
    list.children[active]?.querySelector('a')?.click();
  }
});
// a result on the page already open: the dialog has to close for the jump to show
list.addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('a')) dialog.close();
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close(); // a click on the backdrop
});
dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());

export async function open() {
  if (!dialog.open) dialog.showModal();
  input.focus();
  input.select();
  if (!entries) status.textContent = 'Loading the index…';
  try {
    await load();
    render(input.value);
  } catch {
    status.textContent = 'The search index could not be loaded. The wiki home lists every page.';
  }
}
