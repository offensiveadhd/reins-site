# The in-tab shape

> Run the assistant in the page itself. The page hosts the broker and both sides talk over in-memory links, with no hub process and no network.

## When the assistant lives in the page

When the assistant itself runs in the page, for example a model compiled to WebAssembly or one reached from the page, nothing has to listen on a port. The page hosts the broker and both sides talk over in-memory links. The same grants, policy and consent prompts apply.

The [playground](../../playground.html) is this shape, running on this site, with a view of every frame that crosses the links.

## The whole thing

```js
import { Broker, connect, createDriver, linkPair, randomToken } from '@offensiveadhd/reins';

const key = randomToken(32);
const broker = new Broker({
  agents: [{ kid: 'tab-assistant', key, name: 'Tab assistant', origins: [location.origin] }],
  surfaces: { origins: [location.origin] },
  policy: 'guarded',
});

// the page side
const [pageEnd, brokerEnd] = linkPair();
broker.accept(brokerEnd, { origin: location.origin });
const driver = createDriver({ app: { id: 'my-app', name: 'My app', version: '1.0.0' }, link: pageEnd, policy: 'guarded' });
// ... driver.action(...), driver.view(...), driver.state(...)
await driver.connect();

// the assistant side
const [agentEnd, brokerEnd2] = linkPair();
broker.accept(brokerEnd2, { origin: location.origin });
const client = await connect({ link: agentEnd, kid: 'tab-assistant', key, name: 'Tab assistant' });
const [surface] = await client.surfaces();
const page = await client.attach(surface.s, { scopes: ['observe', 'act', 'cursor', 'show'], reason: 'Help with your order' });
```

Step by step:

1. **A broker in the tab.** `Broker` is the hub's broker. It is isomorphic: the hub process binds it to a WebSocket, and here the page binds it to in-memory links. The assistant holds one credential. `randomToken(32)` makes its key, which never leaves the page.
2. **The page side.** `linkPair()` returns the two ends of an in-memory link. The broker accepts one end, and is told the origin, because there is no `Origin` header to read it from. The driver gets the other end as `link`, in place of a hub URL.
3. **The assistant side.** A second link pair, and `connect` from the agent SDK with `link` in place of a URL. From here on the code is the code of [Drive it from Node](./drive-from-node.md).

A complete page built this way is in [`examples/kiosk/public/inpage.js`](https://github.com/offensiveadhd/reins/blob/main/examples/kiosk/public/inpage.js). Its policy names `human: { offer: ['order.submit'] }`, so its attach prompt offers to let the assistant place orders without asking each time, and a prompt nobody answers waits in its panel ([Requests that wait](../concepts/waiting-requests.md)). To run it, start `npm run demo` in a checkout and open <http://127.0.0.1:5173/inpage.html>. Its assistant adds a latte and then listens in the Chat tab, answering from a script, until you type "stop".

## What stays the same

Everything the protocol does:

- The assistant authenticates with its key, and because it did, its session is **sealed**: every message after `welcome` carries a MAC. See [Handshake, authentication and sealed sessions](../concepts/handshake.md).
- The broker checks the grant, the scope and the rate of every request, and applies its own policy. The driver checks the app's policy again.
- The person is asked before an attach under the `guarded` profile, and before a sensitive action. The indicator shows the assistant for as long as it is attached, with Pause and Stop.
- The indicator opens the panel: the person sets the assistant's [permission level](../concepts/permission-levels.md), blocks single actions, switches scopes off, and talks to it in the [chat](../concepts/chat.md). An assistant that wants to be in the chat asks for the `chat` scope at attach.

## What is different

- **The link counts as verified.** A link the app built itself needs no surface key, so the driver does not treat the broker as unverified, and the kiosk profile can run without a key.
- **No loopback access is needed.** The browser's rules about reaching `127.0.0.1` do not apply, so this shape works wherever the page works. See [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback).
- **No hub files.** There is no token file, no launcher and no announcement, because there is no hub process. An audit log has to be given a sink by the page: `memoryAudit()` keeps one in memory.

## What it does not give you

> [!WARNING]
> In this shape the assistant and the app share one JavaScript realm. The protocol keeps the assistant to its grant only as far as the assistant's own code goes through it. Code running in the page can call the app's functions directly and can interfere with the driver. See "Hostile script inside the app's own origin" in [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against).

The in-tab shape is the right one when you ship the assistant yourself and want the protocol's structure: one description of the app for the model, the person's consent and controls, the same code path as a hub deployment. It is not a sandbox for code you do not trust. Keep a [strict Content Security Policy](../guides/strict-csp.md).

## Other in-page transports

`linkPair()` is for two parties in one realm. The protocol's in-page transport is more general: a `MessagePort` carries the same frames, with strings for text frames and `Uint8Array` for binary frames. `portLink(port)` in `@offensiveadhd/reins/core` wraps one as a link.

## Next

- [Playground](../../playground.html)
- [Roles and trust](../concepts/roles-and-trust.md)
- [The SDK reference](../reference/sdk.md)
