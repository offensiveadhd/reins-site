// Animates the picture at the top of the home page: an agent's cursor runs two actions and
// is held on its rein before the third. The markup already shows the last moment, so
// without this script, or when the system asks for less motion, the picture is a still.

const stage = document.querySelector('[data-rein-stage]');
const svg = stage?.querySelector('svg');
const agent = svg?.querySelector('[data-agent]');
const rein = svg?.querySelector('[data-rein]');
const hand = svg?.querySelector('[data-hand]');
const nodes = svg ? [...svg.querySelectorAll('[data-node]')] : [];
const still = svg ? { agent: agent.getAttribute('transform'), rein: rein.getAttribute('d') } : null;

const LOOP_MS = 9000;
const HAND = [64, 318];
// time (0..1), cursor x, cursor y, how slack the rein is (1 loose, 0 taut)
const KEYS = [
  [0, 120, 238, 1],
  [0.1, 150, 150, 1],
  [0.26, 150, 150, 1],
  [0.36, 290, 84, 0.8],
  [0.52, 290, 84, 0.8],
  [0.62, 403, 160, 0],
  [0.66, 394, 163, 0.05],
  [0.93, 394, 163, 0.05],
  [0.96, 120, 238, 1],
  [1, 120, 238, 1],
];
const ease = (f) => 1 - (1 - f) ** 3;

function at(t) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const f = ease(Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1))));
  return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
}

function draw(t) {
  const [x, y, slack] = at(t);
  const ex = x + 7;
  const ey = y + 24;
  const tug = t > 0.6 && t < 0.69 ? 1 - Math.abs(t - 0.63) / 0.06 : 0;
  const hx = HAND[0] + Math.max(0, tug) * 5;
  const hy = HAND[1] - Math.max(0, tug) * 2;
  const cx = (hx + ex) / 2;
  const cy = (hy + ey) / 2 + 10 + slack * 95;
  agent.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  rein.setAttribute('d', `M${hx.toFixed(1)} ${hy.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
  hand.setAttribute('transform', `translate(${(hx - HAND[0]).toFixed(1)} ${(hy - HAND[1]).toFixed(1)})`);
  const shown = t < 0.03 ? t / 0.03 : t < 0.9 ? 1 : t < 0.93 ? (0.93 - t) / 0.03 : 0;
  agent.setAttribute('opacity', shown.toFixed(2));
  rein.setAttribute('opacity', shown.toFixed(2));
  nodes[0].classList.toggle('is-done', t >= 0.13 && t < 0.93);
  nodes[1].classList.toggle('is-done', t >= 0.39 && t < 0.93);
  nodes[2].classList.toggle('is-waiting', t >= 0.64 && t < 0.93);
}

function showStill() {
  agent.setAttribute('transform', still.agent);
  rein.setAttribute('d', still.rein);
  hand.removeAttribute('transform');
  agent.setAttribute('opacity', '1');
  rein.setAttribute('opacity', '1');
  nodes[0].classList.add('is-done');
  nodes[1].classList.add('is-done');
  nodes[2].classList.add('is-waiting');
}

if (svg && agent && rein && hand && nodes.length === 3) {
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let onScreen = true;
  let frame = 0;
  let origin = 0;
  const tick = (now) => {
    frame = 0;
    if (!origin) origin = now;
    draw(((now - origin) % LOOP_MS) / LOOP_MS);
    schedule();
  };
  const schedule = () => {
    if (frame || calm.matches || !onScreen || document.hidden) return;
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const update = () => {
    if (calm.matches) {
      stop();
      showStill();
    } else if (onScreen && !document.hidden) schedule();
    else stop();
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries.at(-1).isIntersecting;
      update();
    }).observe(svg);
  }
  document.addEventListener('visibilitychange', update);
  calm.addEventListener('change', update);
  update();
}
