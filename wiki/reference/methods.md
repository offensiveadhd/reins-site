# Methods

> Every request an agent can send, with its parameters, its result and the scope it needs, and how a surface behaves for each.

## The table

Agent side. All but the first two and `stream.close` take `s`, the surface id.

| method | params | result | scope |
|---|---|---|---|
| `hub.info` | | `HubInfo` | |
| `surfaces.list` | | `{surfaces}` | |
| `surface.attach` | `scopes, reason?` | `{grant, surface, manifest}` | |
| `surface.detach` | | `{}` | |
| `observe` | `since?, boxes?` | `Observation` | observe |
| `read` | `h?, max?` | `{text, truncated}` | observe |
| `state.get` | `name?` | `{state}` | observe |
| `sub` / `unsub` | `topics` | `{topics}` now subscribed | observe |
| `act` | `a, args?` | `{result?, rev}` | act |
| `ui.click` | `h` | `{rev}` | ui |
| `ui.type` | `h, text, clear?, enter?` | `{rev}` | ui |
| `ui.select` | `h, value` | `{rev}` | ui |
| `ui.scroll` | `h?, dx?, dy?, to?` | `{rev}` | ui |
| `ui.key` | `key, h?` | `{rev}` | ui |
| `cursor.move` | `to, ms?, wait?` | `{x, y}` | cursor |
| `cursor.set` | `visible?, label?, color?` | `{}` | cursor |
| `show.toast` | `text, kind?, ms?` | `{}` | show |
| `show.highlight` | `h, label?, ms?` | `{}` | show |
| `show.view` | `view, data?` | `{result?}` | show |
| `show.clear` | | `{}` | show |
| `nav.go` | `url` | `{}` | nav |
| `chat.say` | `text, to?` | `{id}` | chat |
| `chat.read` | `since?, max?` | `{messages, next}` | chat |
| `chat.status` | `state, note?` | `{}` | chat |
| `stream.open` | `kind:"pointer"` | `{ch, credit}` | cursor |
| `stream.close` | `ch` | `{}` | |

A request is `req {id, m, p}` and is answered by exactly one `res`. There are 27 methods in protocol 0.1. An unknown method is answered `E_UNKNOWN_METHOD` before any parameter is checked.

## Who answers

The hub answers six methods itself: `hub.info`, `surfaces.list`, `surface.attach`, `surface.detach`, `stream.open` and `stream.close`.

Every other method is forwarded. The hub checks the grant, the scope and the rate limit, strips `s`, and sends the request to the surface with `ag` set to the agent's session id, and `c:1` when the hub policy demands a human confirmation. The surface's answer is relayed back unchanged.

## Read-only methods

`observe`, `read`, `state.get`, `sub`, `unsub` and `chat.read` are the read-only methods. They stay available while the person has paused control and while a consent prompt is up. Every other forwarded method fails with `E_PAUSED` in the first case and `E_BUSY` in the second, with one exception: `chat.say` and `chat.status` are served while control is paused, so that a paused agent can still answer the person. While a prompt is up they fail with `E_BUSY` like the rest.

## Targets

A target is a handle from the tree (`e12`) or a semantic id (`#cart.checkout`). An unknown, detached or unexposed target is `E_NO_TARGET`. `ui.*` never accepts coordinates; `cursor.move` accepts a point `{x, y}` in viewport pixels when `policy.coordinates` is on.

## Scope observe

**`observe`** returns the UI tree: a full snapshot, or a delta when `since` equals the agent's last revision. `boxes: true` adds viewport boxes. See [Observation](../concepts/observation.md).

**`read`** returns the visible text of an element or of the page, at most `max` characters (default 2000, cap 8000). Private and ignored subtrees are left out. Under `annotated` exposure only annotated regions are readable.

**`state.get`** returns the current value of one named piece of state, or of all of them.

**`sub`** and **`unsub`** change which event topics the agent receives, and answer with the topics now subscribed. An agent opts into `ui`, `state`, `user` and `nav`.

## Scope act

**`act`** calls an action the app declared.

- An unknown action is `E_BAD_ARGS`. Args are validated against the action's schema: `E_BAD_ARGS` with the failing path.
- A request without `args` is validated as `{}`, which is also what the handler is given.
- Policy decides by the action's risk and overrides: `deny` is `E_DENIED`; `confirm`, or a request carrying `c:1`, shows a consent prompt, and a refusal is `E_CONSENT`.
- The level and the rules the person set for the agent can add a prompt, waive one, or block the action (`E_CONSENT`, with no prompt). See [Permission levels](../concepts/permission-levels.md).
- Then the handler runs. Its result MUST be JSON and at most 32 KiB.
- The answer is `{result?, rev}`: the handler's result and the tree revision after it ran.

## Scope ui

Synthetic input on exposed elements. Every `ui.*` command waits until the person has stopped using the page, and answers `{rev}`.

**`ui.click`** resolves the handle, scrolls it into view, dispatches pointer and mouse events and the click. Disabled elements fail with `E_NO_TARGET`.

**`ui.type`** focuses the element, optionally clears it, sets the value through the native setter and dispatches `input` and `change`. `enter` then sends Enter and submits the enclosing form. A target that takes no text is `E_BAD_ARGS`; a read-only or disabled one is `E_NO_TARGET`.

**`ui.select`** chooses an option of a `<select>` by value or label.

**`ui.scroll`** scrolls the element or the page by `dx, dy`, to `top` or `bottom`, or brings `h` into `view`.

**`ui.key`** dispatches one key on `h` or the focused element. The keys are `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `Space`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `PageUp`, `PageDown`, `Home` and `End`. Tab moves focus as the browser would among exposed elements, and never to a private one.

Every command that synthesises input fails with `E_DENIED` on a private target unless `policy.privateInput`. See [Privacy annotations](../guides/privacy-annotations.md).

## Scope cursor

Visual only: never dispatches input.

**`cursor.move`** animates the virtual cursor to a target or, when `policy.coordinates`, to a point. It answers `{x, y}` when the motion ends, or at once with `wait: false`.

**`cursor.set`** shows or hides the cursor, and sets its label (at most 40 characters) and colour (`#rgb` or `#rrggbb`).

**`stream.open`** opens a pointer stream and answers `{ch, credit}`. It fails with `E_DENIED` when `policy.coordinates` is off. **`stream.close`** closes it. See [Cursor and the pointer stream](../concepts/cursor-and-pointer-stream.md).

## Scope show

**`show.toast`**, **`show.highlight`** and **`show.clear`** are overlays the driver renders. Text is always inserted as text. A toast has a `kind`: `info`, `ok` or `warn`.

**`show.view`** validates `data` against the view's schema and calls the app's renderer. A request without `data`, for a view whose schema is an object, is validated as `{}`. This is how data reaches the screen without passing through a model.

## Scope nav

**`nav.go`** resolves `url` against the page. It MUST be same-origin, `http:` or `https:`, with a path under one of `policy.nav`. Otherwise `E_DENIED`. A navigation that reloads the page ends the surface session, and the agent attaches again.

## Scope chat

The room in the page's panel, between the person and the attached agents. See [Chat](../concepts/chat.md).

**`chat.say`** posts a message. `text` is trimmed and is then 1 to 4000 characters; anything else is `E_BAD_ARGS`. `to` is `person`, for the person alone, or names one other agent of the room by its session id. `to: "person"` is always taken. Any other `to` is `E_DENIED` when no other agent hears the speaker, and `E_BAD_ARGS` when it names no other agent that hears the speaker. The answer is the `id` the message has for the agent that said it.

**`chat.read`** returns the messages this agent may read, its own among them, oldest first: without `since` the latest `max` of them, with `since` the first `max` whose `id` is greater. `max` is 20 by default and 50 at most, and an answer holds at most 128 KiB. `next`, passed as `since`, reads on from there.

**`chat.status`** says what the agent is doing: `state` is `idle`, `thinking` or `working`, with a `note` of at most 80 characters. A state that was not renewed for 2 minutes reads `idle` again, and every state is dropped when a consent prompt comes up.

Only `text` and `to` of a `chat.say` are forwarded to the surface. An agent cannot send an event: it hears the room as `evt chat`.

## Ordering

A surface runs commands that change the page one at a time, in arrival order. `observe`, `read`, `state.get` and the three `chat` methods are answered immediately: chat changes the Chat tab and nothing on the page.

## On the other leg

Between the hub and a surface, forwarded methods arrive with the same name and params minus `s`. Five methods exist only on that leg:

| method | params | result |
|---|---|---|
| `attach` | `agent, scopes, reason?, levels?, decisions?, chatRelay?, cred?` | `{scopes, ttlMs, kept?}` |
| `detach` | `why`: `agent`, `hub` or `expired` | `{}` |
| `stream.open` | `kind:"pointer", ch` | `{credit}` |
| `stream.close` | `ch` | `{}` |
| `chat.undelivered` | `id` | `{}` |

In `attach`, `levels` is the list of permission levels the hub's policy offers, `decisions` is what the hub's policy decides for each action of the surface's manifest, `chatRelay` is the hub's setting for who hears whom in the chat, and `cred` is the id of the agent's credential, by which a surface knows an agent again whatever its session id or name. In the answer, `kept` is what stays of the person's earlier settings for that agent: the level `strict`, rules `confirm` and `deny`, and scopes switched off. The hub reads nothing else from it, and `surface.attach` hands `kept` on to the agent with the grant. See [Grants and scopes](../concepts/grants-and-scopes.md#what-ends-with-a-grant-and-what-stays). `chat.undelivered` tells the surface that the hub did not relay a message of the person to the agent `ag` names; the surface shows it as not delivered.

## For implementers

The method to scope table, the hub methods, the read-only methods and scope intersection are in the test vectors: [`methods.json`](../implementers/vectors/methods.md).

## Further reading

- [Specification, section 9](./specification.md#9-methods): the normative text, with every edge case.
- [Error codes](./error-codes.md)
