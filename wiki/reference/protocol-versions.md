# Protocol versions

> How a hub and a peer agree on a version, what 0.2 adds to 0.1, and what each end does on a link that negotiated 0.1. From section 16 of the specification.

## Two versions, one link each

This build of the package speaks protocol 0.2, and also 0.2 and 0.1: the hub lists both in `challenge.v`, newest first, and the peer names in `hello.v` the first version in that list that it speaks. With none in common the peer sends `bye {code:"E_VERSION"}` and closes; a `hello.v` the hub did not list is refused with `E_VERSION`, and the hub repeats the agreed version in `welcome.v`.

That version holds for the link until it closes, and each link has its own: an agent on 0.1 can attach to a surface on 0.2, and the other way round. The WebSocket subprotocol (`reins.v1`) and the contexts of the proofs and of the seal (`reins.v1.*`) are the same in both versions, and so are the keys and the token file.

```text
hub  → peer   challenge { v:["0.2","0.1"], nonce, hub }
peer → hub    hello     { v:"0.2", ... }        a peer that knows only 0.1 names "0.1"
hub  → peer   welcome   { v:"0.2", session, role, limits, proof? }
```

Within a version, receivers ignore unknown fields on frames and unknown event topics, and refuse unknown methods with `E_UNKNOWN_METHOD`. From 0.2 on, an event of a kind the receiver does not know, on a topic it knows, ends nothing and changes nothing. In 0.1 that was not so: an agent on 0.1 ends its handle on any `grant` event, and a hub on 0.1 relays a surface's `user` events as they came, whatever their kind. That is why a 0.2 hub keeps some events away from a 0.1 agent, below.

## What 0.2 adds to 0.1

| | 0.1 has | 0.2 adds |
|---|---|---|
| scopes | `observe`, `act`, `ui`, `cursor`, `show`, `nav` | `chat` |
| methods of an agent | those of section 9 without `chat.*` | `chat.say`, `chat.read`, `chat.status` |
| requests the hub itself sends a surface | `attach`, `detach`, `stream.open`, `stream.close` | `chat.undelivered` |
| event topics | `ui`, `state`, `nav`, `user`, `grant`, `surface` | `chat` |
| kinds of `evt user` | `override`, `pause`, `resume` | `level`, `rule`, `relay` |
| kinds of `evt grant` | `revoked`, `expired` | `scopes` |
| params of `attach` (hub to surface) | `agent`, `scopes`, `reason` | `levels`, `decisions`, `chatRelay`, `cred` |
| the surface's answer to `attach` | `scopes`, `ttlMs` | `kept` |
| the result of `surface.attach` | `grant`, `surface`, `manifest` | `kept` |
| `SurfaceInfo` | every field but `v` | `v` |
| error codes | those of section 6 without `E_WAITING` | `E_WAITING` |
| params of `act` and `surface.attach` | without `tk` | `tk` |

With them came what they carry: the [levels, the rules and the scope switches](../concepts/permission-levels.md), what [stays of them for an agent's next grant](../concepts/grants-and-scopes.md#what-ends-with-a-grant-and-what-stays), [chat](../concepts/chat.md), and [requests that wait](../concepts/waiting-requests.md).

## A link on 0.1

On a link that negotiated 0.1, an implementation of 0.2 keeps to 0.1: it sends nothing there that 0.1 does not have, the right-hand column above, and takes nothing of it from the peer. A peer that speaks 0.1 alone needs no change. For each end:

| on a 0.1 link | what the 0.2 end does |
|---|---|
| the hub, toward an **agent** on 0.1 | Sends no `evt grant {kind:"scopes"}`. The grant narrows at the hub all the same: a request that needs a scope the person switched off is `E_SCOPE`, and the `evt surface {kind:"changed"}` that follows is sent. Sends no `evt user` of kind `level`, `rule`, `relay` or `answer` and no `chat` event; it holds and records what they say. Takes `chat` out of the scopes the agent asks for, and answers `chat.*` with `E_UNKNOWN_METHOD`. Leaves `kept` out of the result of `surface.attach` and `v` out of `SurfaceInfo`. Sends `E_WAITING` as `E_CONSENT`, without its `data`, keeps no ticket for the agent, and withdraws a waiting attach of its at the surface at once (`detach {why:"hub"}`); the audit record keeps `E_WAITING` and the ticket. A `tk` from such an agent is never a ticket of its own (`E_BAD_ARGS`). Tells the surface `v: "0.1"` in `attach`, so that the surface puts no request of this agent in its list. |
| the hub, toward a **surface** on 0.1 | Sends `attach` with `agent`, `scopes` and `reason`, and `v` (which 0.1 ignores like every field it does not know), never with `chat` among the scopes: no grant there has `chat`, so `chat.*` from an agent on 0.2 is `E_SCOPE`. Reads no `kept` from the answer. Drops an event of a topic or kind 0.1 does not have, unread and unrecorded: a level, a rule, a scope switch, a relay switch, an answer, a chat message. Sends no `chat.undelivered`. Such a surface gives no ticket, so no request of any agent waits there: an `E_WAITING` from it is a bad answer (`E_INTERNAL`). |
| an **agent**, with a hub on 0.1 | Asks for no `chat` scope and sends no `chat.*` request. Drops an event of a topic or kind 0.1 does not have: such a hub relays a surface's `user` events as they came. Gets no `E_WAITING` from such a hub, and sends it no `tk`. |
| a **surface**, with a hub on 0.1 | Sends no `evt grant {kind:"scopes"}`, no `evt user` of kind `level`, `rule` or `relay`, and no `chat` event. Reads `agent`, `scopes` and `reason` from `attach` and nothing else: without `levels` it offers no level beyond `ask`, and without `cred` it cannot tell one agent from another. Grants no `chat`. Answers `attach` without `kept`. What the person sets in the panel holds on the page, where every request is checked against it; the hub and the agent are not told. |

So an agent on 0.1 is not told the level, the rules or the scopes in force for its grant: it learns them from the refusal (`E_SCOPE`, `E_CONSENT`), which is the truth in any version. A request of such an agent never waits: the hub tells the surface `v: "0.1"` with its attach, the surface puts no request of it in its list, and a surface on 0.1 has no list and gives no ticket.

## Where the version shows

- The hub puts `v`, the version a connection speaks, in that connection's `connect` record of the [audit log](../concepts/audit-log.md), lists what it offers in `hub.info`, and gives an agent on 0.2 each surface's version as `SurfaceInfo.v`.
- The reference hub prints the versions it offers when it starts. `versions` in its configuration (`BrokerConfig.versions`) limits it to some of the versions it speaks, and the `versions` option of `connect` does the same for an agent.
- `ReinsClient.version` and `Driver.hubProtocol` are the version of the own connection.
- The MCP adapter and the shell tools mark a page on 0.1 in the surface listing with `protocol=0.1`, say so on a second line after `reins_attach`, start the listing with such a line for a hub on 0.1, and refuse `reins_chat` where chat cannot exist: with `E_UNKNOWN_METHOD` for the hub, `E_SCOPE` for the page.

## Pins

The manifest a 0.2 driver sends says `reins: "0.2"`, so its digest differs from that of the same app built with 0.1. A manifest digest pinned at a hub (`surfaces.pins`) has to be pinned again after the app moves to 0.2. See [Surface keys](../guides/surface-keys.md#manifest-pins).

## For implementers

The cases of version negotiation and of what a 0.1 link leaves out are in the test vectors: [`versions.json`](../implementers/vectors/versions.md). The requirements are the `VER-` entries of the [requirements index](../implementers/requirements.md); the hub's conduct toward a 0.1 agent is checked by the `versions` and `versions-surface` tests of the [conformance suite](../implementers/conformance-suite.md), which run a 0.1 peer as a raw socket.

## Further reading

- [Specification, section 16](./specification.md#16-versioning), the normative text.
- [What's new in 0.2](../community/whats-new-0.2.md) and the [changelog](../community/changelog.md).
- [How to propose a protocol change](../community/protocol-changes.md).
