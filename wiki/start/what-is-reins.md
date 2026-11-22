# What is Reins

> A protocol, and a reference implementation, that lets an AI agent drive a web app running in a browser tab, under the control of the app and of the person using it.

## In one paragraph

Reins lets an AI agent drive a web app that is running in a browser tab. The agent reads the screen as a compact tree, calls the app's own actions, moves a visible cursor and puts data in front of the person. The app decides what an agent may do, the person watches and can stop it, and a kiosk can lock it down to a fixed allowlist.

Reins is two things: a protocol, written down in the [specification](../reference/specification.md), and a reference implementation of it in TypeScript, published as one package, `@offensiveadhd/reins`.

## What an agent can do through it

- **Read the screen.** Not as pixels and not as raw HTML: as a flat list of the elements that matter, each with a handle, a role, a name and a value. After the first reading the agent gets only what changed. See [Observation, handles and deltas](../concepts/observation.md).
- **Call the app's own actions.** The app declares actions such as `cart.add` with a schema for their arguments and a risk tier. One action does what several clicks would. See [Writing good actions and risk tiers](../guides/actions-and-risk.md).
- **Move a visible cursor.** The cursor is drawn by the page so the person can follow along. It is visual only and never dispatches input. See [Cursor and the pointer stream](../concepts/cursor-and-pointer-stream.md).
- **Put data in front of the person.** Toasts, highlights and the app's own views. A view takes data straight to the screen, so bulk data does not pass through the model.
- **Click, type and scroll**, when the app allows it, on elements the page exposes. The protocol prefers actions: synthetic input is a separate scope, and a kiosk has it switched off.
- **Talk with the person.** The page has a chat room, in a panel that only the person can open. The person types to the agent that is driving the page, and it answers there while it works. What they type is a request, never an approval. See [Chat](../concepts/chat.md).

## Who is in control

Three parties have a say, and an agent needs all three.

- **The app** declares what exists (actions, views, state), marks each action `safe`, `sensitive` or `dangerous`, and chooses a [policy profile](../concepts/policy-profiles.md). Policy answers allow, confirm or deny.
- **The person** sees an indicator naming the agent for as long as it is attached, approves what the policy says needs approval, and can press Pause or Stop at any time. Real input wins over synthetic input. The indicator opens a panel where the person, and only the person, changes how much each agent asks, from every time to never, within what the app and the hub offer. This holds against agents; hostile script in the page itself is outside it. See [Consent](../concepts/consent.md), [Human control](../concepts/human-control.md) and [Permission levels](../concepts/permission-levels.md).
- **The hub**, the broker between agent and page, authenticates both sides, issues grants with scopes, applies a policy of its own, limits rates and keeps an audit log. A request has to pass the hub's policy and the page's.

Nothing in the protocol evaluates agent-supplied code, HTML or CSS. Text an agent sends is inserted as text.

## The goals, as the specification states them

1. **Live control.** Commands take effect within one animation frame of arriving. Cursor motion is smooth at display rate whatever the network does.
2. **Token economy.** An agent learns an app from a short prompt card, acts through the app's own semantic actions, and reads the screen as a compact tree with deltas.
3. **App-defined guardrails.** The app declares its actions and their risk. Policy decides allow, confirm or deny. There is no path to run agent-supplied code.
4. **Human in control.** The user sees when an agent is connected, approves what the policy says needs approval, and can pause or stop at any time.
5. **Kiosk grade.** An unattended station runs a fixed policy: allowlisted actions, annotated elements only, no synthetic input, no navigation, tamper-evident audit.
6. **One protocol, any transport.** The same frames run over a loopback WebSocket and over an in-page message port.

## The parts

```
  agent harness                 hub (loopback)                  browser tab
 ┌──────────────┐   reins.v1   ┌──────────────┐   reins.v1   ┌────────────────┐
 │ agent SDK    │◄────────────►│ broker       │◄────────────►│ driver         │
 │ or MCP tools │  ws / port   │ auth, grants │  ws / port   │ app actions,   │
 └──────────────┘              │ policy, audit│              │ UI tree, cursor│
                               └──────────────┘              └────────────────┘
```

- A **surface** is a web page that embeds the driver. It dials out to the hub, because a tab cannot listen.
- An **agent** is an AI harness, or an assistant running in another tab or in the same page.
- The **hub** is the broker both connect to. The broker does not care about the transport: the hub process binds it to a WebSocket on loopback, and a page can bind it to in-memory links.

[Roles and trust](../concepts/roles-and-trust.md) says who is trusted with what.

## Two shapes

**With a hub**, the agent is outside the browser and reaches the tab through a broker on loopback (`ws://127.0.0.1:7346`). This is the shape for an agent harness: [the agent SDK](./drive-from-node.md), [the shell tools](./shell-tools.md) or [the MCP adapter](./mcp.md).

**In the tab**, the assistant runs in the page itself: no process and no network, the same protocol over in-memory links. See [The in-tab shape](./in-tab.md), and try it in the [playground](../../playground.html), which is this shape running on this site.

**In an Electron window.** An Electron window is a page too. An app you write is a surface with no socket on the page side: its main process hosts the broker and hands the window a port. An app you did not write can be adopted from the outside through its debugging connection, which gives an attached agent the whole window. See [Electron: build Reins into your app](../guides/electron.md) and [Adopt an Electron app](../guides/adopting-an-electron-app.md).

## What is in the package

| Import | Use it for | Runs in |
|---|---|---|
| `@offensiveadhd/reins` | The kit: `createDriver`, `connect`, `Broker`, `linkPair`, `randomToken`, `ReinsError` and the protocol types | browser, Node |
| `@offensiveadhd/reins/driver` | Making a page drivable | browser |
| `@offensiveadhd/reins/agent` | Driving a page from an agent | browser, Node |
| `@offensiveadhd/reins/broker` | Hosting the broker yourself, for example inside the tab | browser, Node |
| `@offensiveadhd/reins/hub` | The loopback WebSocket hub, `startHub` | Node |
| `@offensiveadhd/reins/mcp` | The MCP adapter, `createReinsMcpServer` | Node |
| `@offensiveadhd/reins/core` | Wire types, codec, policy, crypto, links | browser, Node |
| `@offensiveadhd/reins/electron` | An Electron window as a surface: `reinsMain`, `preloadPath` | Electron main process |
| `@offensiveadhd/reins/electron/renderer` | The page half, `electronLink` | Electron page |
| `@offensiveadhd/reins/electron/adopt` | Adopting an app through its debugging connection | Node |

The package also installs 5 commands: `reins-hub`, `reins`, `reins-mcp`, `reins-tools` and `reins-electron`. See the [CLI reference](../reference/cli.md).

## Where it stands

Protocol 0.1, package 0.1.0. This is a first version: the wire format may change before 1.0, and a version change is announced in the handshake. The package is not on the npm registry; it installs from Git or from a tarball.

The demo has been run end to end in Chromium, with the page served from loopback. Firefox, Safari and pages served from a public `https:` origin have not been tested: see the [browser notes in the security model](../reference/security-model.md#browser-access-to-loopback). The in-tab shape needs no network access and so is not affected by loopback restrictions.

Version 0.1 was attacked by reviewers that did not write the code, and so was each part added since: the [review history](../reference/security-model.md#review) in the security model says what they found, what was changed, what is left as a stated limit, and that the latest fixes have not been reviewed again. What Reins does not protect against is [listed there too](../reference/security-model.md#what-reins-does-not-protect-against); read that list before deploying. Nothing was run with a model, in a real Claude Code session or against a live Hermes.

## Next

- [Quickstart: run the demo](./quickstart.md)
- [Make an app drivable](./make-an-app-drivable.md)
- [The specification](../reference/specification.md)
