# Policy profiles

> The three profiles, open, guarded and kiosk, what each row of their table means, how single actions are overridden, and why a request has to pass two policies.

## A policy is a profile plus overrides

A policy answers one question for everything an agent asks: **allow**, **confirm** or **deny**. `confirm` means the person is asked on screen. The strictness order is allow < confirm < deny.

Three profiles exist:

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
| `human.yieldMs` | 600 ms | 800 ms | 400 ms |
| grant `ttlMs` / `idleMs` | 8 h / 30 min | 2 h / 15 min | 8 h / 5 min |
| `rates` per second: observe, act, ui, cursor, show, nav, chat | 30, 30, 60, 120, 30, 2, 10 | 20, 20, 40, 60, 20, 1, 5 | 20, 10, 0, 60, 10, 0, 0 |
| `pointerRate` per second | 4000 | 2000 | 2000 |

- **`open`** is for local development. Everything is reachable, and risky actions still ask. It is the only profile that remembers an approval for the rest of a grant.
- **`guarded`** is the default, for a person's own browser. The person approves every attach and every sensitive action. Dangerous actions are denied. The person can change how much one agent asks, and agents in the chat hear each other only once the person says so.
- **`kiosk`** is for unattended stations, where nobody is there to ask: a fixed allowlist, no synthetic input, no navigation, annotated elements only, no Stop button for visitors, no panel, no level to switch and no chat.

## Reading the table

| Row | Meaning |
|---|---|
| attach | How a request to attach is decided. Under `kiosk` it is allowed for an agent the hub was provisioned with, and the page must hold a surface key. |
| safe / sensitive / dangerous | The decision for an action of each risk tier. |
| scopes | The ceiling on the scopes a grant may carry. |
| exposure | What the UI tree shows: `auto` is interactive elements, headings and the like, plus what is annotated; `annotated` is only what is annotated. |
| raw coordinates | Whether `cursor.move` may take a point, and whether a pointer stream may open. `ui.*` never takes coordinates. |
| a page inside a frame | No profile lets the driver connect inside a frame. An app opts in with `framed: true`. |
| navigation | Whether `nav.go` may open same-origin paths. |
| user controls | Which buttons the indicator has. |
| levels the person may set | Which [permission levels](./permission-levels.md) the panel offers. `strict` and `ask` are always on offer; the kiosk profile offers no other. |
| the indicator opens the panel | Whether the indicator's text is a button that opens the panel with its Permissions, Activity and Chat tabs. |
| agents hear each other in the chat | `chatRelay`: always, once the person switches it on, or never. See [Chat](./chat.md). |
| remember approvals | With `session`, an approved action is not asked again under the same grant. |
| `consent.timeoutMs` | A prompt nobody answers is a refusal after this long. |
| `human.yieldMs` | After real input from the person, input-synthesising commands wait this long. |
| grant `ttlMs` / `idleMs` | The lifetime of a grant, and how long it survives without a request. |
| `rates` | Requests per second by scope, enforced by the hub. A rate of 0 means the scope cannot be used. |
| `pointerRate` | Points per second on pointer streams. |

Every field is described in [Policy fields](../reference/policy-fields.md).

## Choosing and overriding

Pass a profile name, or a profile with overrides. Nested objects merge one level deep.

```js
createDriver({
  app,
  policy: {
    profile: 'guarded',
    nav: [],                              // one page: no agent navigation at all
    actions: {
      'order.refund': 'deny',             // off, whatever its risk tier says
      'cart.*': 'allow',                  // a prefix
    },
    consent: { timeoutMs: 30_000 },
  },
});
```

An unknown field, or a value of the wrong type, is an error when the policy is resolved: a mistyped restriction never means "any".

## How an action is decided

The driver looks for an override in `policy.actions`: the exact name first, then the longest matching `prefix.*`. Without one it uses `policy.risk[action.risk]`.

With the overrides above, `order.refund` is denied, `cart.add` and `cart.clear` are allowed, and `order.submit`, which is `sensitive` and has no override, is `confirm` under `guarded`.

## Two enforcement points

The hub has a policy of its own. A request has to pass both.

The hub evaluates its policy on every request and either refuses, forwards, or forwards with `c:1`, which says that the hub's policy demands a human confirmation. The surface evaluates the app's policy and takes the stricter of its decision, of what the hub said at attach that it decides for the action, and of `c:1`.

Rate limits and grant expiry are the hub's job. Exposure, privacy, frames, consent and human control are the surface's. The person sets levels, rules and scope switches on the surface; the hub caps the levels by its own policy and enforces the scopes. The page enforces its policy by itself, so the app's guardrails hold even behind a misconfigured hub.

Start the hub with a profile, and optionally a configuration file that carries a whole policy object:

```bash
npx --no -- reins-hub --profile kiosk --allow-origin http://localhost:5173
```

## Frames

A page inside a frame is not in charge of what the person sees of it. The page around the frame can cover or overlay any part of it, the consent prompt and the indicator included, and the framed page cannot tell.

A driver whose document is not the top-level document of its tab does not connect to a hub unless the app's policy sets `framed: true`. Its `connect()` fails with `E_DENIED` before anything is sent to the hub or added to the page. No profile sets `framed`. An app that sets it should also say which pages may embed it, with a `Content-Security-Policy: frame-ancestors` header.

An Electron `<webview>` guest is in the same position, and its driver cannot tell: the guest is the top-level document of its own frame tree, while the page that embeds it can draw over it. That check is the main process's.

## See the profiles side by side

The [playground](../../playground.html) runs the same scripted assistant under each profile: switch between `guarded`, `kiosk` and `open` at the top of the page.

## For implementers

The profile table, the override precedence and the strictness order are in the test vectors: [`policy.json`](../implementers/vectors/policy.md).

## Further reading

- [Consent](./consent.md) and [Human control](./human-control.md)
- [Kiosk deployment](../guides/kiosk-deployment.md)
- [Specification, section 12](../reference/specification.md#12-policy)
