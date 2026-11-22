// Brew Kiosk on this page: the view. The state and the logic are the repository's own
// examples/kiosk/public/app.js, copied here by the build; this file only draws it and
// wires the person's input, as examples/kiosk/public/main.js does for the demo.
import * as api from '../kiosk/app.js';

const $ = (id) => document.getElementById(id);
const money = (n) => `$${n.toFixed(2)}`;
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Draw the app and keep it drawn. */
export function mountKiosk() {
  const grid = $('menu-grid');
  const lines = $('cart-lines');
  const emptyNote = $('cart-empty');
  const total = $('cart-total');
  const place = $('place-order');
  const name = $('customer-name');
  const confirm = $('order-confirmation');
  const insights = $('insights-body');

  const say = (text, isError = false) => {
    confirm.textContent = text;
    confirm.classList.toggle('is-error', isError);
  };

  for (const item of api.MENU) {
    const card = el('button', 'k-card');
    card.type = 'button';
    card.dataset.reinsId = `menu.${item.sku}`;
    card.append(el('span', 'k-name', item.name), el('span', 'k-note', item.note), el('span', 'k-price', money(item.price)));
    card.addEventListener('click', () => {
      try {
        api.addToCart(item.sku, 1);
      } catch (err) {
        say(err.message, true);
      }
    });
    grid.append(card);
  }

  function drawCart({ cart }) {
    lines.replaceChildren();
    for (const line of cart.items) {
      const li = el('li');
      const remove = el('button', 'k-remove', 'Remove');
      remove.type = 'button';
      remove.dataset.reinsId = `cart.remove.${line.sku}`;
      remove.setAttribute('aria-label', `Remove ${line.name}`);
      remove.addEventListener('click', () => api.removeFromCart(line.sku));
      li.append(el('span', 'k-qty', `${line.qty}×`), el('span', '', line.name), el('span', '', money(line.total)), remove);
      lines.append(li);
    }
    emptyNote.hidden = cart.items.length > 0;
    total.textContent = money(cart.total);
    place.disabled = cart.items.length === 0;
  }

  function drawOrder(state) {
    if (document.activeElement !== name && name.value !== state.customer) name.value = state.customer;
    if (state.lastOrder) {
      const o = state.lastOrder;
      say(`Order ${o.id} placed${o.customer ? ` for ${o.customer}` : ''}: ${money(o.total)}. Thank you!`);
    } else if (!confirm.classList.contains('is-error')) say('');
  }

  function drawInsights() {
    const data = api.getInsights();
    insights.replaceChildren();
    if (!data || data.series.length === 0) {
      insights.append(el('p', 'k-empty', 'No insights yet.'));
      return;
    }
    insights.append(el('p', 'k-chart-title', data.title));
    const max = Math.max(...data.series.map((p) => Math.abs(p.value)), 0) || 1;
    const bars = el('ul', 'k-bars');
    for (const point of data.series) {
      const row = el('li');
      const track = el('span', 'k-track');
      const fill = el('span', 'k-fill');
      fill.style.setProperty('width', `${Math.max(2, (Math.abs(point.value) / max) * 100)}%`);
      track.append(fill);
      const value = `${Number.isInteger(point.value) ? point.value : point.value.toFixed(2)}${data.unit ? ` ${data.unit}` : ''}`;
      row.append(el('span', '', point.label), track, el('span', '', value));
      bars.append(row);
    }
    insights.append(bars);
  }

  name.addEventListener('input', () => api.setCustomer(name.value));
  name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !place.disabled) place.click();
  });
  place.addEventListener('click', () => {
    try {
      api.submitOrder();
    } catch (err) {
      say(err.message, true);
    }
  });

  // Staff: a person with the PIN can refund. An agent cannot read the PIN field or type into it.
  const pin = $('staff-pin');
  const order = $('staff-order');
  const result = $('staff-result');
  $('staff-refund').addEventListener('click', () => {
    result.classList.remove('is-error');
    if (pin.value !== '2468') {
      result.classList.add('is-error');
      result.textContent = 'Incorrect PIN.';
      return;
    }
    try {
      const r = api.refundOrder(order.value);
      result.textContent = `Refunded ${money(r.refunded)} on order ${r.id}.`;
    } catch (err) {
      result.classList.add('is-error');
      result.textContent = `Error: ${err.message}.`;
    }
  });

  const draw = (state) => {
    drawCart(state);
    drawOrder(state);
    drawInsights();
  };
  api.subscribe(draw);
  draw(api.getState());

  return {
    /** Back to an empty order: what a kiosk does when the assistant lets go. */
    reset() {
      api.resetSession();
      api.showInsights(null);
      confirm.classList.remove('is-error');
      pin.value = '';
      order.value = '';
      result.textContent = '';
      draw(api.getState());
    },
  };
}
