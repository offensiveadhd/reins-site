# Grants and scopes

> What an agent is allowed to do on one page, how it asks, who can narrow the answer, and how a grant ends.

## Scopes

A scope is a kind of thing an agent may do. In canonical order:

| scope | lets the agent |
|---|---|
| `observe` | read the UI tree, visible text and exposed state; subscribe to events |
| `act` | call the app's declared actions |
| `ui` | synthesise clicks, typing, selection, scrolling and keys on exposed elements |
| `cursor` | show and move the virtual cursor. Visual only: it never dispatches input |
| `show` | toasts, highlights, and the app's data views |
| `nav` | open same-origin URLs the policy allows |
| `chat` | talk with the person in the page's chat room: say something, read what was said to it, show what it is doing |

Every method needs one scope: see [Methods](../reference/methods.md). The split between `act` and `ui` matters most. `act` calls actions the app declared, with validated arguments and a risk tier. `ui` synthesises input on whatever is exposed. The kiosk profile has no `ui`, no `nav` and no `chat` at all.

## Attaching

An agent asks for a grant with `surface.attach {s, scopes, reason}`. Three parties narrow the answer:

1. **The hub** intersects the requested scopes with the agent credential's cap and the hub policy's `scopes`. An empty result is `E_SCOPE`. Hub policy `attach: deny` is `E_DENIED`.
2. The hub sends `attach {agent, scopes, reason, levels, decisions, chatRelay, cred}` to the surface, with `c:1` when the hub policy says `confirm`. `levels` is the list of [permission levels](./permission-levels.md) the hub's policy offers, `decisions` is what the hub's policy decides for each action of the surface's manifest, `chatRelay` is the hub's setting for whether agents hear each other in the [chat](./chat.md), and `cred` is the id of the agent's credential: what stays the same when an agent comes back under another session id or another name.
3. **The surface** intersects with its own policy and decides by its `attach` setting: `allow`, `confirm` with an on-screen prompt, or `deny`. It answers `{scopes, ttlMs, kept?}`. A refusal is `E_CONSENT` or `E_DENIED`. `kept`, when present, is what stays of the person's earlier settings for this agent: the level `strict`, rules `confirm` and `deny`, and scopes switched off.
4. The hub records the grant with expiry `min(hub ttl, surface ttl)` and returns `{grant, surface, manifest, kept?}`. `grant.scopes` holds the scopes in force: those granted, without the ones that were kept switched off. `kept` repeats the level and the rules, so that the agent knows from the first moment what it is held to.

So an agent never gets more than its credential, the hub's policy and the page's policy allow, and the scopes it ends up with may be fewer than it asked for. The `reason` is shown to the person in the prompt.

The surface asks the person even when its policy says `allow` if the hub is unverified, or if the user has pressed Stop, or a revocation after refusals has happened, since the page loaded, or if the person has tightened something for an agent that the surface cannot tell this one from (below).

## Attach is bounded

Each attach may put a prompt in front of a person, so it is limited:

- The hub forwards one attach at a time per credential and surface, across all of the credential's sessions. Another gets `E_BUSY`.
- A credential gets a burst of 3 attaches per surface, then one every 2 s. Beyond that: `E_RATE`.
- When an agent session disconnects while its attach is pending, the hub tells the surface, which withdraws the prompt.
- A surface holds at most 32 grants at a time, so that the list a person has to read stays one they can read. It refuses an attach from a further agent with `E_BUSY`, before it asks the person.

## One grant per agent and surface

One agent holds at most one grant per surface. Attaching again replaces it.

A request without a live grant fails with `E_NOT_ATTACHED`. A request whose scope the grant lacks fails with `E_SCOPE`.

## How a grant ends

A grant ends, and the hub tells each side, as follows:

| the grant ends because | the surface gets | the agent gets |
|---|---|---|
| the agent sends `surface.detach` | `detach {why:"agent"}` | the answer `{}` |
| the agent disconnects | `detach {why:"agent"}` | |
| the surface disconnects | | `evt surface {kind:"gone"}`, like every agent that may attach to it |
| it reaches `exp`, or `idleMs` passes without a request | `detach {why:"expired"}` | `evt grant {kind:"expired"}` |
| the surface sends `evt grant {kind:"revoked"}` (Stop, or refusals, section 12), with `ag` for one agent, without for all | | `evt grant {kind:"revoked"}` |
| the surface reports a level that the hub's policy does not offer, more than 20 changes of what the person set within one second, or a change that lets the agent do more while the hub cannot write its audit log (section 13) | `detach {why:"hub"}` | `evt grant {kind:"revoked"}` |
| a new attach by the same agent replaces it | | the new attach result |

Grant lifetimes come from the policy profile: `ttlMs` is the lifetime, and a grant with no request for `idleMs` expires. Under `guarded` that is 2 hours and 15 minutes.

A grant lasts as long as the agent's connection to the hub. That is why the [shell tools](../start/shell-tools.md) keep a small session process: it holds the connection, and the grant, between commands.

## Scope switches

The person can switch single scopes of a live grant off and back on, in the panel that opens from the indicator. The surface refuses a request whose scope is off with `E_SCOPE`, and tells the hub which scopes are now in force. The hub then lets the grant carry only those of the reported scopes that were granted at attach: a report never widens a grant. It tells the agent with `evt grant {kind:"scopes", scopes}`.

When `cursor` goes, that agent's pointer streams are closed and its cursor is hidden. A grant with every scope switched off stays live: the person can switch them back on.

## What ends with a grant, and what stays

**What lets an agent do more ends with the grant.** The levels `auto` and `bypass`, a rule `allow`, a remembered approval and what the person switched on in the chat belong to one grant and end with it, however it ends. A new grant, also one that replaces another for the same agent, has none of them. An agent cannot keep what the person gave an earlier grant by detaching and attaching again.

**What the person tightened stays.** The level `strict`, the rules `confirm` and `deny` and the scopes the person switched off hold an agent back, and no sequence of the agent's own calls takes them away: not attaching again, not a detach and a new attach, not letting the grant run out, not coming back under another session id or name. The surface keeps them for as long as the page lives and puts them on every new grant of the same agent, where they are in force from the first request. What the person lifts themselves, in the panel, is no longer kept. The surface says what is kept in its attach answer (`kept`), and the hub starts the grant with it and records it. The hub reads nothing else from an attach answer: no other level, no rule `allow`, no scope that was not granted.

**The same agent** is told by the credential. A surface that got `cred` from a hub it verified keeps what was tightened under that id, and every grant that comes with the same id is the same agent to it, whatever its session id or name. Two credentials are two agents. Where the surface cannot tell (the hub sent no `cred`, or the surface did not verify the hub), every agent is the same agent to it: what the person tightened for one is put on every later grant. Such an attach is never silent: the surface asks the person even where its policy says `allow`, and the prompt says what was set and that it stays.

## Events follow the grant

The hub relays an event only to live grants with the scope its topic needs: `ui`, `state` and `nav` need `observe`, and `user` goes to every live grant. `grant` and `surface` events need no subscription. A `chat` event is never broadcast: it goes to the one grant it names, while that grant holds `chat`. See [Events](../reference/events.md).

## Further reading

- [Policy profiles](./policy-profiles.md)
- [Consent](./consent.md)
- [Specification, section 8](../reference/specification.md#8-grants-and-scopes)
