# Manifest and prompt card

> How a surface describes itself, and the short text rendered from that description that teaches a model to drive the app.

## The manifest

A surface describes itself in `hello.surface.manifest`:

| Field | What it holds |
|---|---|
| `reins` | The protocol version the manifest was written for. |
| `app` | The app's `id`, `name`, `version` and `description`. |
| `actions` | For each action: `name`, `description`, `params` (a schema-lite object), `risk`, `returns`. |
| `views` | Named renderers the app offers for showing data. |
| `state` | Named pieces of app state an agent may read. |
| `exposure` | What the UI tree exposes: `auto`, `annotated` or `none`. |
| `profile` | Which policy profile runs: `open`, `guarded` or `kiosk`. |

You do not write a manifest by hand. The driver builds it from what you registered with `action`, `view` and `state`: see [Make an app drivable](../start/make-an-app-drivable.md).

Names of actions, views and state are dot-separated lowercase identifiers such as `cart.add`. A manifest is at most 64 KiB, 256 actions and 64 views. The hub validates it and computes `digest`, the base64url SHA-256 of its canonical JSON. An agent sees the digest in the surface listing, and a hub can pin an app id to one.

## Canonical JSON

Canonical JSON, which the audit log uses as well, is JSON without whitespace, with object keys sorted by UTF-16 code units, strings and finite numbers written as ECMAScript `JSON.stringify` writes them, other numbers as `null`, and properties whose value is undefined left out. For JSON input this is the serialisation of RFC 8785. A value nested more than 100 levels deep has no canonical JSON.

## The prompt card

The prompt card is the text an assistant is given so it can drive the app. It is rendered from the manifest and is the same wherever it is produced:

```
# Reins surface s1: Brew Kiosk 1.0.0 (brew-kiosk)
Self-service coffee ordering.
origin http://localhost:5173 | profile guarded | scopes observe act cursor show
Prefer actions over ui ops. [confirm] asks the user on screen. [deny] is blocked.

## actions
cart.add(sku: "latte"|"mocha"|"tea", qty?: int 1..9) -> cart totals. Add an item.
order.submit() [confirm]. Place the order.
admin.refund(order: str) [deny]. Refund an order.

## views
chart(title: str, series: [{label: str, value: num}]). Bar chart panel.

## state
cart: items and totals
```

That is the whole briefing. A model that has read it knows what the app is, which scopes it holds, which actions exist with their arguments, which of them will ask the person and which are blocked. The README puts its size at about a thousand characters.

With the agent SDK the card is `handle.card()`. With the MCP adapter and the shell tools it is what `reins_attach` returns.

## How a card is built

Line by line:

1. `# Reins surface`, then the surface id when it is known, then the app's name, its version if there is one, and its id in parentheses.
2. The app description, if any.
3. `origin`, `profile` and `scopes` (the granted scopes, in canonical order), joined by ` | `.
4. The fixed line: `Prefer actions over ui ops. [confirm] asks the user on screen. [deny] is blocked.`
5. For each of actions, views and state that is not empty: an empty line, the heading, and one line per entry in manifest order.

An action line is the name, its signature, ` -> <returns>` if any, ` [<decision>]` unless the decision is `allow`, and `. <description>`. A view line is the name, its signature and the description. A state line is `<name>: <description>`, or the name alone.

Free text is put on one line first: every run of whitespace and control characters becomes one space and the ends are trimmed. So a description cannot break out of its line.

## Signatures

The signature lists the params of an object schema in declaration order inside parentheses; `()` without params. Each is `name: type`, with `?` after the name when it is not required.

| Schema | Written as |
|---|---|
| a string with `enum` | the values as JSON strings joined by a vertical bar: `"latte"` or `"mocha"` |
| string | `str` |
| integer, number | `int`, `num`, with ` a..b` when a range is given (either end may be missing) |
| boolean | `bool` |
| array | `[T]` |
| object | `{name: T, ...}` |

## The decision tag can be optimistic

The decision tag is what policy says for that action. `allow` has no tag.

A manifest names its profile but does not carry policy overrides, so a card rendered on the agent side shows the profile's decision for each risk tier. Where an app overrides single actions, or the hub's policy is stricter, the tag can be more permissive than what happens: the refusal (`E_DENIED`, `E_CONSENT`) is the truth.

The level and the rules the person sets are not on the card either: under `auto` or `bypass` a `[confirm]` action may run unasked, and a rule may block an action that has no tag. See [Permission levels](./permission-levels.md).

## For implementers

The manifest behind the example card, its canonical JSON, its digest and the card are in the test vectors: [`manifest.json`](../implementers/vectors/manifest.md). A card has to match character for character.

## Further reading

- [Writing good actions and risk tiers](../guides/actions-and-risk.md)
- [Specification, section 7](../reference/specification.md#7-manifest-and-prompt-card)
