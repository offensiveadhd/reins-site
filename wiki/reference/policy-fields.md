# Policy fields

> Every field of a policy, what it controls, who enforces it, and its value in each of the three profiles.

## The shape

A policy is a profile plus overrides. Pass a profile name (`'open'`, `'guarded'`, `'kiosk'`), or an object that names a profile and overrides fields of it. Without `profile` an object starts from `guarded`. Nested objects (`risk`, `rates`, `human`, `consent`) merge one level deep.

An unknown field, or a value of the wrong type, is refused when the policy is resolved.

## Fields

| Field | Type | What it controls |
|---|---|---|
| `profile` | `open`, `guarded` or `kiosk` | The preset the rest starts from. |
| `scopes` | list of scopes | The ceiling on the scopes a grant may carry. |
| `attach` | decision | How an attach request is decided. |
| `risk` | `{safe, sensitive, dangerous}`, each a decision | The decision per risk tier. |
| `actions` | `{name or prefix.*: decision}` | Per-action overrides. Exact beats prefix, longer prefix beats shorter. |
| `exposure` | `auto`, `annotated` or `none` | Which elements the UI tree exposes. |
| `chatRelay` | `off`, `person` or `on` | Whether the agents in a page's chat room hear each other: never, once the person switches it on, or always. `true` and `false` still read as `on` and `off`. |
| `privateInput` | boolean | May `ui.type` write into private fields (passwords, card numbers, one-time codes). |
| `coordinates` | boolean | May `cursor.move` take raw viewport coordinates, and may a pointer stream open. `ui.*` never takes coordinates. |
| `framed` | boolean | May the driver run in a page that sits inside a frame. |
| `nav` | list of path prefixes | Same-origin path prefixes `nav.go` may open. Empty means navigation is off. |
| `rates` | `{scope: number}` | Requests per second, per agent credential per surface, by scope. Enforced by the hub. |
| `pointerRate` | number | Pointer-stream points per second. Enforced by the hub. |
| `ttlMs` | number | The lifetime of a grant. |
| `idleMs` | number | A grant with no request for this long expires. |
| `human.yieldMs` | number | After real user input, input-synthesising commands wait this long. 0 turns yielding off. |
| `human.pause` | boolean | Show a Pause control. |
| `human.stop` | boolean | Show a Stop control that revokes the grant. |
| `human.levels` | list of levels | The permission levels the person may switch a grant to. `strict` and `ask` are always available, listed or not. |
| `human.panel` | boolean | The indicator opens the panel: levels, per-action rules, scope switches, activity and chat. |
| `consent.timeoutMs` | number | A prompt nobody answers is a refusal after this long. |
| `consent.remember` | `never` or `session` | With `session`, an approved action is not asked again under the same grant. |
| `consent.waitMs` | number | (0.2) How long a request nobody answered in time, or one the person put off with "Later", waits in the panel's list; 0 switches the list off. 10 minutes under `open` and `guarded`, 0 under `kiosk`. |
| `human.offer` | list of action names | (0.2) Up to 8 actions the attach prompt may offer to allow without asking each time, each as an unticked box. None by default. |
| `human.allowMs` | number | (0.2) How long a rule `allow` set "for a time" lasts; 0 means the confirm step offers no time. 15 minutes in every profile. |
| `human.burst` | `{max, perMs}` or `false` | (0.2) How many runs of one action by one agent whose prompt was waived go unasked within `perMs` before the next call asks again. 60 in 10 minutes under `open`, 20 under `guarded`, off under `kiosk`. |

A decision is `allow`, `confirm` or `deny`. The strictness order is allow < confirm < deny, and exposure is ordered the same way: auto < annotated < none. For `chatRelay` the strictest is `off`, then `person`, then `on`. A level is `strict`, `ask`, `auto` or `bypass`.

## The profiles

| Field | `open` | `guarded` | `kiosk` |
|---|---|---|---|
| `scopes` | `observe`, `act`, `ui`, `cursor`, `show`, `nav`, `chat` | `observe`, `act`, `ui`, `cursor`, `show`, `nav`, `chat` | `observe`, `act`, `cursor`, `show` |
| `attach` | `allow` | `confirm` | `allow` |
| `risk.safe` | `allow` | `allow` | `allow` |
| `risk.sensitive` | `confirm` | `confirm` | `deny` |
| `risk.dangerous` | `confirm` | `deny` | `deny` |
| `actions` | none | none | none |
| `exposure` | `auto` | `auto` | `annotated` |
| `privateInput` | off | off | off |
| `coordinates` | `true` | `true` | off |
| `framed` | off | off | off |
| `nav` | `/` | `/` | none |
| `chatRelay` | `on` | `person` | `off` |
| `rates.observe` | 30 | 20 | 20 |
| `rates.act` | 30 | 20 | 10 |
| `rates.ui` | 60 | 40 | 0 |
| `rates.cursor` | 120 | 60 | 60 |
| `rates.show` | 30 | 20 | 10 |
| `rates.nav` | 2 | 1 | 0 |
| `rates.chat` | 10 | 5 | 0 |
| `pointerRate` | 4000 | 2000 | 2000 |
| `ttlMs` | 8 h | 2 h | 8 h |
| `idleMs` | 30 min | 15 min | 5 min |
| `human.yieldMs` | 600 ms | 800 ms | 400 ms |
| `human.pause` | `true` | `true` | `true` |
| `human.stop` | `true` | `true` | off |
| `human.levels` | `strict`, `ask`, `auto`, `bypass` | `strict`, `ask`, `auto`, `bypass` | none |
| `human.panel` | `true` | `true` | off |
| `human.offer` | none | none | none |
| `human.allowMs` | 15 min | 15 min | 15 min |
| `human.burst.max` | 60 | 20 | off |
| `human.burst.perMs` | 10 min | 10 min | off |
| `consent.timeoutMs` | 60 s | 60 s | 30 s |
| `consent.remember` | `session` | `never` | `never` |
| `consent.waitMs` | 10 min | 10 min | off |

This table is printed from `POLICY_PRESETS` of the built package (`packages/core/src/protocol.ts`) when the site is built. The specification gives the same table in its own words:

| | `open` | `guarded` | `kiosk` |
|---|---|---|---|
| intended for | local development | a person's own browser | unattended stations |
| attach | allow | confirm | allow, with a provisioned agent |
| safe / sensitive / dangerous | allow / confirm / confirm | allow / confirm / deny | allow / deny / deny |
| scopes | all | all | observe, act, cursor, show |
| exposure | auto | auto | annotated |
| raw coordinates | yes | yes | no |
| a page inside a frame (`framed`) | refused | refused | refused |
| navigation | same origin | same origin | off |
| user controls | pause, stop | pause, stop | pause |
| levels the person may set (`human.levels`; strict and ask are always on offer) | strict, ask, auto, bypass | strict, ask, auto, bypass | strict, ask |
| the indicator opens the panel (`human.panel`) | yes | yes | no |
| agents hear each other in the chat (`chatRelay`) | `on`: always | `person`: once the person switches it on | `off`: never |
| remember approvals (`consent.remember`) | session | never | never |
| `consent.timeoutMs` | 60 s | 60 s | 30 s |
| a request nobody answered waits (`consent.waitMs`, 0.2) | 10 min | 10 min | no |
| a rule `allow` for a time (`human.allowMs`, 0.2) | 15 min | 15 min | 15 min |
| unasked runs of one action before it asks again (`human.burst`, 0.2) | 60 in 10 min | 20 in 10 min | no cap |
| actions offered at attach (`human.offer`, 0.2) | none | none | none |
| `human.yieldMs` | 600 ms | 800 ms | 400 ms |
| grant `ttlMs` / `idleMs` | 8 h / 30 min | 2 h / 15 min | 8 h / 5 min |
| `rates` per second: observe, act, ui, cursor, show, nav, chat | 30, 30, 60, 120, 30, 2, 10 | 20, 20, 40, 60, 20, 1, 5 | 20, 10, 0, 60, 10, 0, 0 |
| `pointerRate` per second | 4000 | 2000 | 2000 |

## Who enforces what

The hub and the surface each hold a policy, and a request has to pass both.

- **The hub** enforces `scopes` (when it intersects an attach, and when the person switches one off), `attach`, the risk decision for `act` (it forwards with `c:1` on `confirm`, and says at attach what it decides for each action), `nav`, `coordinates` for `stream.open`, `rates`, `pointerRate`, `ttlMs` and `idleMs`. It caps `human.levels`: the person is offered `auto` and `bypass` only where both policies list them, and the hub ends a grant whose page reports a level beyond its own list. It enforces its own `chatRelay`.
- **The surface** enforces `scopes`, `attach`, the risk decision and `actions` again, and everything only it can: `exposure`, `privateInput`, `coordinates`, `framed`, `nav`, `human`, `consent` and who hears whom in the chat. The stricter `chatRelay` of the two applies.

A grant's expiry is `min(hub ttl, surface ttl)`.

## Example

```js
const policy = {
  profile: 'guarded',
  scopes: ['observe', 'act', 'cursor', 'show'],   // no synthetic input, no navigation
  actions: { 'order.refund': 'deny' },
  nav: [],
  human: { yieldMs: 1000 },
  consent: { timeoutMs: 30_000 },
};
```

## With the SDK

`resolvePolicy(input)` in `@offensiveadhd/reins/core` returns the validated policy: a deep copy of a preset plus the overrides. `decideAction(policy, { name, risk })` returns the decision for an action, and `stricter(a, b)` the stricter of two decisions. `driver.policy` is the policy a driver runs.

## For implementers

The profile table with its defaults, the override precedence and the strictness order are in the test vectors: [`policy.json`](../implementers/vectors/policy.md).

## Further reading

- [Policy profiles](../concepts/policy-profiles.md)
- [Specification, section 12](./specification.md#12-policy)
