# Make an app drivable

> Install the package, create a driver, declare actions, views and state, and mark the elements an agent should see.

## Install

Reins ships as one package, `@offensiveadhd/reins`. It requires Node 22 or newer to build and to run the hub; the browser parts need no Node at all. The package is not on the npm registry.

From Git, in a project that has a bundler (the package builds itself on install):

```bash
npm i github:offensiveadhd/reins
```

From a tarball, built once in a checkout of the repository with `npm pack`:

```bash
npm i ../reins/offensiveadhd-reins-0.2.0.tgz
```

For a static page with no build step, copy one file out of the package and import it:

```html
<script type="module">
  import { createDriver, connect, Broker, linkPair } from './reins.js';
</script>
```

| File in `dist/bundle/` | What it is | Size in this build |
|---|---|---|
| `reins.js` | The kit: driver, agent SDK, in-tab broker | 518 KiB |
| `reins-driver.js` | The driver only (ES module) | 396 KiB |
| `reins-driver.iife.js` | The driver as a global, `Reins.createDriver(...)` | 416 KiB |
| `reins-agent.js` | The agent SDK only | 80 KiB |
| `reins-broker.js` | The in-tab broker only | 137 KiB |
| `reins-electron.js` | `electronLink()`, for a page in an Electron window | 12 KiB |
| `reins-adopt.iife.js` | The driver for an app adopted by `reins-electron` | 427 KiB |

Sizes are unminified and uncompressed, measured when this site was built. The bundles have no dependencies and no `node:` imports, and they run under a strict Content Security Policy (`script-src 'self'`, no inline script, no `eval`). See [Running under a strict CSP](../guides/strict-csp.md).

## Create the driver

The driver is the in-page runtime: it builds the UI tree, runs commands, draws the cursor, the consent prompt and the indicator.

```js
import { createDriver } from '@offensiveadhd/reins';

const driver = createDriver({
  app: { id: 'brew-kiosk', name: 'Brew Kiosk', version: '1.0.0' },
  hub: 'ws://127.0.0.1:7346',
  policy: 'guarded', // or 'open', 'kiosk', or a profile with overrides
});

driver
  .action(
    {
      name: 'cart.add',
      description: 'Add a drink to the order.',
      risk: 'safe',
      params: {
        type: 'object',
        properties: { sku: { type: 'string', enum: ['latte', 'mocha'] }, qty: { type: 'integer', minimum: 1, maximum: 9 } },
        required: ['sku'],
      },
    },
    ({ sku, qty = 1 }) => cart.add(sku, qty),
  )
  .action({ name: 'order.submit', description: 'Place the order.', risk: 'sensitive' }, () => cart.submit())
  .view({ name: 'chart', description: 'Bar chart panel.' }, (data) => renderChart(data))
  .state('cart', () => cart.summary());

await driver.connect();
```

Actions, views and state are registered before `connect()`. `connect()` resolves once the hub has welcomed the surface.

| Option | What it is |
|---|---|
| `app` | The app's id, name, version and description. The id is stable and is also the key id for a surface key. |
| `hub` | The hub's WebSocket URL. Default `ws://127.0.0.1:7346`. |
| `link` | A link to use instead of a WebSocket. This is how [the in-tab shape](./in-tab.md) works. |
| `key` | The surface key, when the hub has one for the app. |
| `policy` | A profile name, or a profile with overrides. Default `'guarded'`. |
| `consent` | Your own consent handler, in place of the built-in prompt. |
| `indicator` | Show the control indicator while an agent is attached. Default `true`. |
| `reconnect` | Reconnect after an unexpected close, with backoff from 0.5 s to 10 s. Default `true`. |
| `root` | The subtree to expose. Default `document.body`. |

## Actions, views and state

- An **action** is something the app can do: a name, a description, a schema for its arguments, a risk tier, and a handler. Policy decides by the risk tier whether a call is allowed, needs the person's confirmation, or is denied. [Writing good actions and risk tiers](../guides/actions-and-risk.md) goes into detail.
- A **view** is a named renderer the app offers for showing data, such as a chart panel. An agent sends data to it with `show.view`; the driver validates the data against the view's schema and calls your renderer.
- **State** is a named piece of app state an agent may read, with a getter. Call `driver.notify()` when it changed, and subscribed agents get a patch.

The driver turns these into a manifest, and the manifest into the [prompt card](../concepts/manifest-and-prompt-card.md) a model reads.

## The surface key

Pass `key` when the hub has a surface key for the app. With a key the page and the hub prove themselves to each other and the session is sealed. Without one the driver treats the hub as unverified: it always asks the person before an agent attaches, and the kiosk profile refuses to start. See [Surface keys](../guides/surface-keys.md).

## Frames

The driver connects only in a page that is the top-level document of its tab. Inside a frame, the page around it could cover the consent prompt and the indicator, so `connect()` fails there with `E_DENIED`. A page that is embedded on purpose, by pages you control, opts in with `policy: { profile: 'guarded', framed: true }`.

## Mark the elements an agent should see

Mark the elements an agent should see by name with `data-reins-id="cart.checkout"`. An agent then addresses the element as `#cart.checkout`. Use `data-reins="ignore"` to hide a subtree and `data-reins="private"` for anything an agent must never read. Password, card and one-time-code fields are private automatically.

Under the `guarded` and `open` profiles, interactive elements are exposed without annotation. Under `kiosk`, only annotated elements are. See [Privacy annotations](../guides/privacy-annotations.md).

## Watch what the driver does

```js
driver.on('status', () => console.log(driver.status));
driver.on('attach', ({ agent, scopes }) => console.log(agent.name, 'attached with', scopes));
driver.on('detach', ({ agent, why }) => console.log(agent.name, 'left:', why));
driver.on('command', ({ agent, m, ok, code }) => console.log(agent.name, m, ok ? 'ok' : code));
```

Four more events say what the person did in the panel and that something was said in the chat. The API only reads them:

```js
driver.on('level', ({ agent, level }) => {});          // the person set this agent to strict, ask, auto or bypass
driver.on('rule', ({ agent, action, rule }) => {});    // allow, confirm or deny for one action; null when removed
driver.on('scopes', ({ agent, scopes }) => {});        // the scopes now in force for this agent
driver.on('chat', ({ id, from, chars, to }) => {});    // who said something and how long it is, never the text
driver.agents();                                       // each attached agent with its level, scopes and rules
```

Nothing in the API sets a level, a rule or a scope switch, opens the panel, posts a chat message or reads the transcript.

`driver.status` is one of `idle`, `connecting`, `ready`, `controlled`, `paused` and `offline`. `driver.hubVerified` is true while the driver is connected to a hub it verified: it holds a key and the hub proved the same key, or the app supplied the link. `driver.pause()`, `driver.resume()` and `driver.stop()` do what the indicator's buttons do.

The driver reports a blocked or refused connection as `offline` and keeps retrying with backoff. It never treats a failed connection as permission to skip policy.

## The panel, levels and chat come with the driver

While an agent is attached, the text of the indicator is a button. It opens a panel with three tabs: Permissions, Activity and Chat. There the person sets how much each agent asks, switches single scopes off, sees what the agent did and talks to it. You add nothing for this. What you decide is how much of it is on offer, in the policy:

```js
createDriver({
  app,
  policy: {
    profile: 'guarded',
    human: { levels: ['auto'] },     // offer Auto besides Strict and Ask, and no Bypass
    chatRelay: 'off',                // agents never hear each other in the chat
  },
});
```

- `human.levels` lists the levels the person may set beyond `strict` and `ask`, which are always on offer because neither lets an agent do more. The hub's policy caps yours.
- `human.panel: false` leaves the indicator without a panel, and with it the chat.
- A policy whose `scopes` leave out `chat` has no chat. The `open` and `guarded` profiles grant it; `kiosk` does not.

Nothing the person sets makes an action run that your policy denies. See [Permission levels](../concepts/permission-levels.md) and [Chat](../concepts/chat.md).

> [!WARNING]
> The chat is drawn in your page. Script in your page can read what the person types there and change what is sent, as it can with any of your own fields. Load no script into the page that you would not show the chat to.

## In an Electron app

An Electron window gets its link from the main process and not from a socket: see [Electron: build Reins into your app](../guides/electron.md).

## Your own consent prompt

An app may supply its own consent handler, for example an attendant PIN on a kiosk:

```js
createDriver({
  app,
  policy: 'guarded',
  consent: async (request) => {
    // request.kind is 'attach' or 'action'; request.agent, request.scopes,
    // request.action, request.args and request.reason say what is asked.
    return await askThePerson(request);
  },
});
```

The handler gets the request as data and answers `true` or `false`. The rules about what a prompt has to show are those of the driver's own prompt: see [Consent](../concepts/consent.md).

## Next

- [Drive it from Node](./drive-from-node.md)
- [Policy profiles](../concepts/policy-profiles.md)
- [The SDK reference](../reference/sdk.md)
