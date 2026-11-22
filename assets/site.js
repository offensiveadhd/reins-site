// What every page needs from a script: the theme button, the menus on a narrow screen,
// copy buttons on code, keyboard access to boxes that scroll, the "on this page" marker,
// and the search dialog (loaded when first asked for). No dependency, no build step.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ── a live region for short announcements ──
const live = document.createElement('p');
live.className = 'sr-only';
live.setAttribute('role', 'status');
document.body.append(live);
export function announce(text) {
  live.textContent = '';
  requestAnimationFrame(() => {
    live.textContent = text;
  });
}

// ── theme: system, then light, then dark ──
const MODES = ['system', 'light', 'dark'];
const LABEL = {
  system: 'Theme: follows your system. Change theme',
  light: 'Theme: light. Change theme',
  dark: 'Theme: dark. Change theme',
};
function currentMode() {
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' || t === 'dark' ? t : 'system';
}
function showMode(mode) {
  for (const b of $$('[data-theme-toggle]')) {
    b.dataset.mode = mode;
    b.setAttribute('aria-label', LABEL[mode]);
    b.title = LABEL[mode];
  }
}
showMode(currentMode());
for (const b of $$('[data-theme-toggle]')) {
  b.addEventListener('click', () => {
    const next = MODES[(MODES.indexOf(currentMode()) + 1) % MODES.length];
    if (next === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', next);
    try {
      if (next === 'system') localStorage.removeItem('reins-theme');
      else localStorage.setItem('reins-theme', next);
    } catch {
      /* the choice lasts for this page only */
    }
    showMode(next);
    announce(LABEL[next].split('.')[0]);
  });
}

// ── menus that fold away on a narrow screen ──
function disclosure(button, panel) {
  if (!button || !panel) return;
  const set = (open) => {
    button.setAttribute('aria-expanded', String(open));
    panel.dataset.open = String(open);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      set(false);
      button.focus();
    }
  });
}
disclosure($('[data-nav-toggle]'), $('#site-nav'));
disclosure($('[data-side-toggle]'), $('#sidebar'));

// keep the current page in view inside a long sidebar
const here = $('.sidebar [aria-current="page"]');
const side = $('.sidebar');
if (here && side && side.scrollHeight > side.clientHeight) {
  side.scrollTop = Math.max(0, here.offsetTop - side.clientHeight / 2);
}

// ── copy buttons ──
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr-only';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
document.addEventListener('click', async (e) => {
  const button = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!button) return;
  const code = $('pre', button.closest('.code'));
  if (!code) return;
  const ok = await copyText(code.textContent ?? '');
  button.textContent = ok ? 'Copied' : 'Press Ctrl+C';
  if (ok) button.dataset.done = '';
  announce(ok ? 'Copied to the clipboard' : 'Could not copy');
  setTimeout(() => {
    button.textContent = 'Copy';
    delete button.dataset.done;
  }, 1600);
});

// ── a box that scrolls sideways can be reached and scrolled from the keyboard ──
function markScrollable() {
  for (const el of $$('.code pre, .table-wrap')) {
    if (el.scrollWidth > el.clientWidth + 1) {
      el.tabIndex = 0;
      el.setAttribute('role', 'region');
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.matches('pre') ? 'Code, scrolls sideways' : 'Table, scrolls sideways');
    } else if (el.getAttribute('role') === 'region') {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
    }
  }
}
markScrollable();
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(markScrollable, 150);
});

// ── "on this page": mark the section being read ──
const tocLinks = $$('.toc a');
if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
  const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const visible = new Set();
  let current;
  const pick = () => {
    const headings = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    // the last heading above the middle of the reading area
    let best = headings[0];
    for (const h of headings) if (h.getBoundingClientRect().top < 140) best = h;
    const link = best ? byId.get(best.id) : undefined;
    if (link === current) return;
    current?.classList.remove('is-current');
    link?.classList.add('is-current');
    current = link;
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target));
      pick();
    },
    { rootMargin: '-80px 0px -60% 0px' },
  );
  for (const id of byId.keys()) {
    const h = document.getElementById(id);
    if (h) io.observe(h);
  }
  pick();
}

// ── search: loaded on first use ──
let searchModule;
async function openSearch() {
  searchModule ??= import('./search.js');
  (await searchModule).open();
}
for (const b of $$('[data-search-open]')) b.addEventListener('click', openSearch);
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if (e.key === '/' && !typing) {
    e.preventDefault();
    openSearch();
  }
});

// ── the picture at the top of the home page ──
if ($('[data-rein-stage]')) import('./hero.js');
