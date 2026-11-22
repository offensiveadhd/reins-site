# What's new in 0.2

> Protocol 0.2 next to 0.1, requests that wait in the panel instead of failing, offers on the attach card, a rule for a time, the rate cap, and what a peer on 0.1 still gets. From the repository's changelog.

## In one paragraph

Protocol 0.2 is the version this build of the package speaks (0.2.0). A hub, an agent and a page of this version still speak 0.1 with a peer that knows no other: the hub lists both in its challenge, newest first, and each link has its own version. What 0.2 adds, in the person's hands, is that a request they did not answer in time, or put off with "Later", waits for them in the panel instead of failing; offers on the attach card; an Allow rule for a time; a cap on how often an action runs unasked; and a notice after a refusal. On the wire it adds the error `E_WAITING` with a ticket, the ticket on a repeated request, the event kind `answer`, `v` on the attach the surface receives, and `SurfaceInfo.v`. The pages that explain each: [Requests that wait](../concepts/waiting-requests.md), [Permission levels](../concepts/permission-levels.md#offers-on-the-attach-card), [Protocol versions](../reference/protocol-versions.md).

The text below is the entry for 0.2.0 of the repository's [changelog](./changelog.md), as it is in the file.

## The changelog entry for 0.2.0

Protocol 0.2. A hub, an agent and a page of this version still speak protocol 0.1 with a
peer that knows no other.

### For the person at the page

- A request you did not answer in time, or put off with "Later", waits in the panel
  instead of failing: a "Waiting for your answer" list, where you review, allow, refuse or
  discard it. An allowed request runs when the agent asks again; nothing runs on your
  typing in the chat.
- The indicator "AI connected" is a button that opens a panel. For each attached agent it
  has a permission level (`strict`, `ask`, `auto`, `bypass`), a rule for each of the app's
  actions (Allow, Ask, Block), a switch for each scope of the grant, and a list of what
  the agent did.
- What you tightened for an agent stays for its next connection: the level `strict`, the
  rules Ask and Block, and the scopes you switched off. What lets an agent do more ends
  with the grant.
- A Chat tab in the same panel. You type to the agent that drives the page, and it answers
  there. What you type approves nothing: an action that needs your approval still asks on
  its own prompt.

### For apps

- A page reports what the person set to the hub, and an app can read it (`driver.agents()`,
  the events `level`, `rule`, `scopes` and `chat`).
- `driver.hubProtocol` is the protocol version the page speaks with its hub.
- An Electron app can be a surface without a socket on the page side, and `reins-electron`
  adopts a running Electron app (docs/ELECTRON.md).

### For agents

- A request the person has not answered yet is `E_WAITING` with a ticket (`data: {tk, ms}`),
  not a refusal: nothing ran. The SDK waits for the person's answer by default, up to ten
  minutes, and repeats an allowed request once with its ticket (`handle.act(..., { wait })`, `client.attach(...,
  { wait })`, `WaitingError`, `handle.waiting()`, the `answer` event). The MCP tools say in
  plain words that the request waits, for how long, and how to wait for the answer (`wait`
  on `reins_act` and `reins_attach`); a `[reins]` notice tells the answer; `reins_surfaces`
  counts what waits. The `reins` command waits for the answer unless told `--no-wait`.
- New scope `chat` with the methods `chat.say`, `chat.read` and `chat.status`, and the tool
  `reins_chat`. `reins-tools chat-serve` runs a command for each message of the person.
- An agent is told what the person set for its grant: `evt user` with the kinds `level`,
  `rule` and `relay`, and `evt grant {kind:"scopes"}` when a scope is switched. The SDK
  keeps `handle.level`, `handle.rules` and `handle.grant.scopes` current, and the MCP tools
  say it as a `[reins]` notice with the next answer.
- The tool `reins_read` returns the text of an element or of the page, and the state the
  app exposes.
- An agent with a shell needs no registration: the hub leaves a launcher in the Reins
  folder that runs the same tools the MCP adapter has (`reins-tools`).
- `ReinsClient.version` is the protocol version of the connection, and `SurfaceInfo.v` the
  version each page speaks. `reins_surfaces` marks a page on 0.1 with `protocol=0.1`.

### For whoever runs a hub

- The hub checks every ticket before it forwards a request: a ticket that is not the
  agent's own for that surface and that request is refused at the hub, and a ticket is
  used once. It relays the person's answer only for a ticket it gave, sends the surface the
  agent's protocol version with every attach, withdraws an attach it stopped waiting for or
  whose agent left (`detach {why:"hub"}`), and records waits, answers and repeated requests
  with their ticket. It keeps at most 3 tickets of one agent on one page and 16 in all, and
  answers `E_BUSY` over that.
- The hub prints the protocol versions it offers when it starts, and each `connect` record
  of the audit log has `v`, the version that connection speaks.
- What the person set for a grant is in the audit log as records of kind `person`. A chat
  message is on record by its length and its digest, never by its text.
- `versions` in the hub's configuration limits it to some of the versions it speaks.

### Compatibility with 0.1

The hub lists `0.2` and `0.1` in its challenge, and a peer takes the first one it speaks.
On a link that speaks 0.1 neither end uses what 0.2 added. Nothing has to be changed on
the side that stays on 0.1.

- **A 0.1 agent on a 0.2 hub** works as before. It has no chat. It is not told the level,
  the rules or a scope switch: a request the person no longer allows is refused
  (`E_SCOPE`, `E_CONSENT`), as a refusal always was. The hub does not send it
  `evt grant {kind:"scopes"}`, because the 0.1 SDK ends its handle on any `grant` event.
- **A 0.1 page on a 0.2 hub** works as before. Agents get no chat there, and the hub takes
  no level, rule or scope switch from it.
- **A 0.2 agent on a 0.1 hub** has no chat (the SDK refuses the call with
  `E_UNKNOWN_METHOD` and asks for no `chat` scope) and is not told what the person set.
- **A 0.2 page on a 0.1 hub** shows its panel, and what the person sets there holds on the
  page. The hub and the agent are not told, the levels `auto` and `bypass` are not
  offered, chat is off, and the page cannot recognise an agent that comes back.
- The manifest a 0.2 driver sends says `reins: "0.2"`. A manifest digest pinned at a hub
  (`surfaces.pins`) for a 0.1 build of the same app has to be pinned again.
- The package name, the WebSocket subprotocol (`reins.v1`), the keys and the token file
  are unchanged.

## Where to read on

| What changed | Where it is explained |
|---|---|
| A request that waits, "Later", the ticket, `E_WAITING` | [Requests that wait](../concepts/waiting-requests.md), [Consent](../concepts/consent.md) |
| Offers at attach, a rule for a time, the rate cap, the notice after a refusal | [Permission levels](../concepts/permission-levels.md) |
| The `attention` event, the taskbar flash and badge in Electron | [Human control](../concepts/human-control.md#drawing-the-persons-eye), [Electron: build it in](../guides/electron.md) |
| The Hermes plugin's offer, cap and notification | [Claude and Hermes](../guides/claude-and-hermes.md), [The Hermes Desktop plugin](../guides/hermes-desktop-plugin.md) |
| Version negotiation and what a link on 0.1 leaves out | [Protocol versions](../reference/protocol-versions.md), [Error codes](../reference/error-codes.md) |
| The `wait` option of the SDK, the tools and the `reins` command | [Drive it from Node](../start/drive-from-node.md), [Use it from Claude Code and other MCP harnesses](../start/mcp.md), [SDK API](../reference/sdk.md) |
| What the hub records: `v`, tickets, answers | [The audit log](../concepts/audit-log.md) |
| The new requirements and test vectors | [Requirements index](../implementers/requirements.md), [Test vectors](../implementers/test-vectors.md) |

A manifest digest pinned at a hub (`surfaces.pins`) for a 0.1 build of the same app has to be pinned again: the manifest of a 0.2 driver says `reins: "0.2"`. See [Surface keys](../guides/surface-keys.md#manifest-pins).
