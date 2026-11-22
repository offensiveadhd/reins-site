// What Brew Kiosk lets an agent do: its actions, view and state, registered on a Reins driver.
// Shared by the hub-connected page (reins.js) and the in-tab page (inpage.js).
//
// `ReinsError` is passed in because it must be the class of the bundle the driver came from.

/**
 * @param driver  a driver from createDriver()
 * @param deps    { app: the app.js module, ReinsError }
 */
export function registerActions(driver, { app, ReinsError }) {
  /** A refusal by the app is the agent's to fix, so it goes back as bad arguments, not as a crash. */
  const guard = (fn) => (args, ctx) => {
    try {
      return fn(args ?? {}, ctx);
    } catch (err) {
      throw new ReinsError('E_BAD_ARGS', String(err?.message ?? 'refused').slice(0, 120));
    }
  };

  const skus = app.MENU.map((item) => item.sku);
  const sku = { type: 'string', enum: skus };
  const totals = (cart) => ({ count: cart.count, total: cart.total, items: cart.items.map((i) => `${i.qty} ${i.sku}`) });

  driver
    .action(
      { name: 'menu.list', description: 'List the drinks and their prices.', risk: 'safe', returns: 'menu' },
      () => app.MENU.map((item) => ({ sku: item.sku, name: item.name, price: item.price })),
    )
    .action(
      {
        name: 'cart.add',
        description: 'Add a drink to the order.',
        risk: 'safe',
        returns: 'cart totals',
        params: { type: 'object', properties: { sku, qty: { type: 'integer', minimum: 1, maximum: 9 } }, required: ['sku'] },
      },
      guard((args) => totals(app.addToCart(args.sku, args.qty ?? 1))),
    )
    .action(
      {
        name: 'cart.remove',
        description: 'Take a drink off the order.',
        risk: 'safe',
        returns: 'cart totals',
        params: { type: 'object', properties: { sku }, required: ['sku'] },
      },
      guard((args) => totals(app.removeFromCart(args.sku))),
    )
    .action({ name: 'cart.clear', description: 'Empty the order.', risk: 'safe' }, () => {
      app.clearCart();
    })
    .action(
      {
        name: 'customer.set',
        description: 'Set the name the order is called out under.',
        risk: 'safe',
        params: { type: 'object', properties: { name: { type: 'string', maxLength: 40 } }, required: ['name'] },
      },
      (args) => {
        app.setCustomer(args.name);
      },
    )
    .action(
      { name: 'order.submit', description: 'Place the order.', risk: 'sensitive', returns: 'order id and total' },
      guard(() => {
        const order = app.submitOrder();
        return { id: order.id, total: order.total };
      }),
    )
    .action(
      {
        name: 'order.refund',
        description: 'Refund a placed order.',
        risk: 'dangerous',
        params: { type: 'object', properties: { order: { type: 'string', maxLength: 12 } }, required: ['order'] },
      },
      guard((args) => app.refundOrder(args.order)),
    )
    .view(
      {
        name: 'insights',
        description: 'Bar chart in the Insights panel.',
        params: {
          type: 'object',
          properties: {
            title: { type: 'string', maxLength: 60 },
            unit: { type: 'string', maxLength: 12 },
            series: {
              type: 'array',
              maxItems: 8,
              items: {
                type: 'object',
                properties: { label: { type: 'string', maxLength: 24 }, value: { type: 'number', minimum: 0 } },
                required: ['label', 'value'],
              },
            },
          },
          required: ['title', 'series'],
        },
      },
      (data) => {
        app.showInsights(data);
      },
    )
    .state('cart', () => app.getState().cart, 'items and totals')
    .state('order', () => app.getState().lastOrder, 'the last order placed');
}
