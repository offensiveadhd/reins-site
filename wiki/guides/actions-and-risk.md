# Writing good actions and risk tiers

> How to declare actions an agent can use well, with schemas that reject bad arguments before your code runs, results worth returning, and a risk tier that puts the person in the loop where it matters.

## Why actions

An agent can drive a page two ways: by clicking and typing on exposed elements (`ui.*`), or by calling actions the app declared (`act`). The protocol tells every model to prefer actions; the prompt card says so on its fourth line.

An action is better for everyone. One call does what several clicks would. Its arguments are validated before your code sees them. It has a risk tier, so policy knows what it is. And it keeps working when you redesign the page.

## Declaring an action

```js
driver.action(
  {
    name: 'cart.add',
    description: 'Add a drink to the order.',
    risk: 'safe',
    returns: 'cart totals',
    params: {
      type: 'object',
      properties: {
        sku: { type: 'string', enum: ['latte', 'mocha'] },
        qty: { type: 'integer', minimum: 1, maximum: 9 },
      },
      required: ['sku'],
    },
  },
  ({ sku, qty = 1 }) => cart.add(sku, qty),
);
```

| Field | Notes |
|---|---|
| `name` | Dot-separated lowercase identifiers, at most 64 characters: `cart.add`, `order.submit`. A prefix lets policy address a group: `cart.*`. |
| `description` | One line. It ends up on the prompt card, so write it for a model: what the action does, in the app's own words. |
| `params` | A schema for the arguments. Always an object schema when present. |
| `risk` | `safe`, `sensitive` or `dangerous`. |
| `returns` | One line describing the result, for the prompt card. |

A manifest holds at most 256 actions and 64 views, in 64 KiB.

## Schemas

Schemas are a subset of JSON Schema:

| Type | Constraints |
|---|---|
| `string` | `enum`, `minLength`, `maxLength`, `pattern` |
| `number`, `integer` | `minimum`, `maximum` |
| `boolean` | |
| `array` | `items`, `minItems`, `maxItems` |
| `object` | `properties`, `required` |

Two rules make them a guardrail and not a hint:

- **Arguments are validated against the schema before any handler runs.** A failure is `E_BAD_ARGS` with the failing path.
- **Objects reject properties that are not declared.** An agent cannot smuggle an extra field past you.

A request without `args` carries no arguments: it is validated as `{}`, which is also what the handler is given. So declare every bound you rely on. An `enum` beats a free string, a `maximum` beats a check in the handler, and `maxLength` on every string keeps a model from sending you a novel.

The schema is also the documentation. From the declaration above the card says:

```text
cart.add(sku: "latte"|"mocha", qty?: int 1..9) -> cart totals. Add a drink to the order.
```

## The handler

- **Return something useful and small.** The result goes back to the model. It MUST be JSON and at most 32 KiB: a larger one is `E_TOO_LARGE`, and a value JSON cannot hold (a cycle, a BigInt) is `E_INTERNAL`.
- **Refuse with a `ReinsError`.** A handler that throws yields `E_INTERNAL` with a generic message, unless it throws a `ReinsError`. When the request is the agent's to fix, say so:

```js
import { createDriver, ReinsError } from '@offensiveadhd/reins';

driver.action({ name: 'cart.remove', description: 'Take a drink off the order.', risk: 'safe', params }, ({ sku }) => {
  if (!cart.has(sku)) throw new ReinsError('E_BAD_ARGS', 'that drink is not in the order');
  return cart.remove(sku);
});
```

- **Keep messages short and free of internals.** Error messages are shown to a model. They never contain stack traces, file paths or secrets.
- **The handler knows who asked.** Its second argument is `{ agent, scopes }`.

Commands that change the page run one at a time, in arrival order.

## Risk tiers

Risk is your statement about the action. Policy turns it into a decision:

| risk | `open` | `guarded` | `kiosk` |
|---|---|---|---|
| `safe` | allow | allow | allow |
| `sensitive` | confirm | confirm | deny |
| `dangerous` | confirm | deny | deny |

A way to choose:

- **`safe`**: easy to undo, costs nothing, and the person can see it happen. Adding to a cart, filling a field, changing a filter.
- **`sensitive`**: commits something. Placing an order, sending a message, saving a change others will see. The person is asked, and sees the full arguments.
- **`dangerous`**: destructive or costly, and not something an assistant should start. Refunds, deletions, anything administrative.

Policy bounds what an agent can do. It cannot judge whether a permitted action was wise. The security model's advice is short: mark anything costly as `sensitive` or `dangerous`.

## Risk tiers and the person's levels

The person can change how much one agent asks, in the panel: see [Permission levels](../concepts/permission-levels.md). Your risk tiers are what those levels are read against.

- **`auto` trusts your labels.** Under `auto` an action runs without asking unless you marked it `dangerous`. An action that is destructive but marked `sensitive` or `safe` runs unasked.
- **`dangerous` is the only tier `auto` still asks about**, and under `guarded` it is denied outright. No level and no rule relaxes a `deny`.
- **A rule covers any arguments.** The person's rule Allow for `pay.send` allows every payment the agent sends for the rest of the grant. If different arguments mean different risks, make them different actions.
- **You decide what is on offer.** `human.levels` in your policy lists the levels beyond `strict` and `ask`. A deployment that must never run unasked leaves `auto` and `bypass` out of it.

## Design for the prompt

When an action is `sensitive`, the person approves it from a card that lists every argument in full. Design the action so that card is easy to read:

- **Few, plain arguments.** Arguments that cannot be shown in full are not put to the person at all: more than 40 keys and items in total, nesting deeper than 4, or a listing of more than 2000 code points fails with `E_TOO_LARGE`.
- **One thing per action.** "Place the order" is a question a person can answer. "Apply these twelve changes" is not.
- **Bulk data goes to a view, not through an action.** `show.view` takes data straight to your renderer.

With `remember: session`, the `open` profile's default, one approval covers the action name with any arguments for the rest of the grant. If different arguments mean different risks, make them different actions.

## Overrides

`policy.actions` overrides the tier for single actions or prefixes:

```js
policy: {
  profile: 'guarded',
  actions: { 'order.refund': 'deny', 'cart.*': 'allow' },
}
```

The exact name wins over a prefix, and a longer prefix over a shorter one. The prompt card shows the profile's decision for each tier, not your overrides, so its tags can be more permissive than what happens: the refusal is the truth.

## Views and state

A **view** shows data. Declare its schema the same way; the driver validates the data before it calls your renderer.

```js
driver.view({ name: 'chart', description: 'Bar chart panel.', params: chartSchema }, (data) => renderChart(data));
```

**State** lets an agent read a named piece of app state without scraping the screen:

```js
driver.state('cart', () => cart.summary(), 'items and totals');
```

Call `driver.notify()` when state changed. Subscribed agents get a merge patch.

## A complete example

The demo's actions are in [`examples/kiosk/public/actions.js`](https://github.com/offensiveadhd/reins/blob/main/examples/kiosk/public/actions.js): seven actions across the three tiers, one view and two pieces of state. The [playground](../../playground.html) runs that file.

## Further reading

- [Manifest and prompt card](../concepts/manifest-and-prompt-card.md)
- [Consent](../concepts/consent.md)
- [Specification, section 9](../reference/specification.md#9-methods)
