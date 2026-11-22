// Brew Kiosk: state and logic. No DOM access.

const DRINKS = [
  { sku: 'latte', name: 'Latte', cents: 450, note: 'Espresso with silky steamed milk' },
  { sku: 'mocha', name: 'Mocha', cents: 490, note: 'Espresso, dark chocolate, milk' },
  { sku: 'espresso', name: 'Espresso', cents: 300, note: 'A short, intense double shot' },
  { sku: 'cappuccino', name: 'Cappuccino', cents: 440, note: 'Equal parts espresso, milk, foam' },
  { sku: 'americano', name: 'Americano', cents: 340, note: 'Espresso stretched with hot water' },
  { sku: 'flatwhite', name: 'Flat White', cents: 460, note: 'Velvety microfoam over a double shot' },
  { sku: 'chai', name: 'Chai Latte', cents: 430, note: 'Spiced black tea with steamed milk' },
  { sku: 'matcha', name: 'Matcha Latte', cents: 500, note: 'Ceremonial matcha whisked with milk' },
];

export const MENU = Object.freeze(
  DRINKS.map((d) => Object.freeze({ sku: d.sku, name: d.name, price: d.cents / 100, note: d.note })),
);

const MAX_QTY = 9;
const MAX_NAME = 40;

const cents = new Map(DRINKS.map((d) => [d.sku, d.cents]));
const bySku = new Map(MENU.map((m) => [m.sku, m]));

const toMoney = (c) => c / 100;

let cart = new Map(); // sku -> qty (insertion ordered)
let customer = '';
let lastOrder = null;
let nextId = 101;
let insights = null;
const orders = new Map(); // id -> order record
const listeners = new Set();

function buildCart() {
  const items = [];
  let count = 0;
  let totalCents = 0;
  for (const [sku, qty] of cart) {
    const m = bySku.get(sku);
    const lineCents = cents.get(sku) * qty;
    items.push({ sku, name: m.name, qty, price: m.price, total: toMoney(lineCents) });
    count += qty;
    totalCents += lineCents;
  }
  return { items, count, total: toMoney(totalCents) };
}

function cloneOrder(o) {
  return o && { id: o.id, items: o.items.map((i) => ({ ...i })), total: o.total, customer: o.customer, at: o.at };
}

export function getState() {
  return { cart: buildCart(), customer, lastOrder: cloneOrder(lastOrder), orders: orders.size };
}

function emit() {
  const state = getState();
  for (const fn of [...listeners]) {
    try {
      fn(state);
    } catch (err) {
      console.error(err);
    }
  }
}

export function subscribe(fn) {
  if (typeof fn !== 'function') throw new Error('listener must be a function');
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function addToCart(sku, qty = 1) {
  if (typeof sku !== 'string' || !bySku.has(sku)) throw new Error('unknown item');
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new Error('bad quantity');
  const next = (cart.get(sku) || 0) + qty;
  if (next > MAX_QTY) throw new Error('bad quantity');
  cart.set(sku, next);
  emit();
  return getState().cart;
}

export function removeFromCart(sku) {
  if (cart.delete(sku)) emit();
  return getState().cart;
}

export function clearCart() {
  if (cart.size === 0) return;
  cart = new Map();
  emit();
}

export function setCustomer(name) {
  customer = String(name ?? '').trim().slice(0, MAX_NAME);
  emit();
}

export function submitOrder() {
  if (cart.size === 0) throw new Error('cart is empty');
  const c = buildCart();
  const order = {
    id: `A-${nextId++}`,
    items: c.items,
    total: c.total,
    customer,
    at: new Date().toISOString(),
    refunded: false,
  };
  orders.set(order.id, order);
  lastOrder = order;
  cart = new Map();
  emit();
  return { id: order.id, total: order.total, items: order.items.map((i) => ({ ...i })), customer: order.customer };
}

export function refundOrder(id) {
  const order = orders.get(String(id ?? '').trim().toUpperCase());
  if (!order) throw new Error('unknown order');
  order.refunded = true;
  emit();
  return { id: order.id, refunded: order.total };
}

export function resetSession() {
  cart = new Map();
  customer = '';
  lastOrder = null;
  emit();
}

export function showInsights(data) {
  if (data === null || data === undefined) {
    insights = null;
  } else {
    if (
      typeof data !== 'object' ||
      typeof data.title !== 'string' ||
      !Array.isArray(data.series) ||
      !data.series.every((p) => p && typeof p.label === 'string' && Number.isFinite(p.value))
    ) {
      throw new Error('bad insights');
    }
    insights = {
      title: data.title,
      ...(typeof data.unit === 'string' ? { unit: data.unit } : {}),
      series: data.series.map((p) => ({ label: p.label, value: p.value })),
    };
  }
  emit();
}

export function getInsights() {
  return insights && { ...insights, series: insights.series.map((p) => ({ ...p })) };
}
