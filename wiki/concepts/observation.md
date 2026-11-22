# Observation, handles and deltas

> How an agent reads the screen, as a flat tree of the elements that matter, with stable handles, private fields that are never read, and deltas after the first reading.

## The UI tree

An agent does not get pixels or HTML. `observe` returns the UI tree: a flat list of nodes in document order, one per exposed element.

| Field | What it is |
|---|---|
| `h` | The handle, stable for the element's lifetime: `e` plus a base36 counter. |
| `role` | The ARIA role, explicit or implied by the tag. |
| `id` | The semantic id from `data-reins-id`, addressable as `#id`. |
| `name` | The accessible name, at most 120 characters. |
| `val` | The current value of a form control, at most 200 characters. Never present on private fields. |
| `st` | States: `disabled`, `checked`, `selected`, `expanded`, `focused`, `required`, `invalid`, `readonly`, `private`. |
| `p` | The handle of the nearest exposed ancestor. |
| `box` | The viewport box `[x, y, w, h]`, only when the request asked for boxes. |

An agent addresses an element by its handle (`e12`) or by its semantic id (`#cart.checkout`), never by a selector. An unknown, detached or unexposed target is `E_NO_TARGET`.

## The compact text

`renderTree` turns an observation into the form a model reads, one node per line, children indented one space under their parent:

```
e1 heading "Brew Kiosk"
e2 button "Latte 4.50" #menu.latte
e3 textbox "Name" = "Dana" [focused]
 e4 checkbox "Extra shot" [checked]
```

A node line is the handle and the role, then the name in quotes, ` #<id>`, ` = "<val>"`, ` [<states>]` and ` @x,y,w,h`, each only when present. This is what `observeText()` in the agent SDK and `reins_observe` in the MCP adapter return.

## What is exposed

It depends on the policy's `exposure`:

- **`auto`**: interactive elements (buttons, links, inputs, selects, textareas, elements with an interactive ARIA role or a `tabindex`), headings, images with alt text, dialogs, live regions (`status`, `alert`), named landmarks and forms, and every annotated element.
- **`annotated`**: only elements carrying `data-reins-id` or `data-reins="expose"`. This is the kiosk profile.
- **`none`**: nothing.

**Never exposed**: the driver's own overlay; anything hidden (`hidden`, `inert`, `aria-hidden="true"`, `display:none`, `visibility:hidden`); any subtree marked `data-reins="ignore"`.

## Private fields

Private are: `input[type=password]`; fields whose `autocomplete` is `cc-number`, `cc-csc`, `cc-exp`, `cc-exp-month`, `cc-exp-year`, `one-time-code`, `current-password` or `new-password`; and any subtree marked `data-reins="private"`.

A private node appears with state `private` and never carries `val`. Besides `private` it reports only `disabled` and `focused`, never `checked` or `selected`. Its text is never returned by `read`.

**Privacy is sticky.** An element that was ever private stays private for its lifetime, so a "show password" toggle that changes the input's type exposes nothing. It also survives a node swap: a text field is private for its lifetime when it has the same non-empty `id`, `name` or `data-reins-id` as one of the last 32 private text fields that left the document, or when it is inserted under the same parent as one of them within one second of its removal.

Private fields also refuse synthetic input: see [Privacy annotations](../guides/privacy-annotations.md).

## Names

`name` follows a simplified accessible-name order: `data-reins-label`, `aria-label`, `aria-labelledby`, `<label>`, `placeholder`, `alt`, `title`, text content.

A node inside a private subtree, or itself marked `data-reins="private"`, is named only by `data-reins-label`. A field that is private for another reason is named by its attributes and labels, never by `alt`, its value or its content. Text of an element with `visibility: hidden` is left out of names and of `read`.

## Revisions and deltas

The surface keeps one revision counter for its tree and remembers, per agent, the tree that agent last received.

- `observe` without `since` returns a full snapshot: `{rev, nodes, url, title, vp}`.
- `observe {since}` where `since` equals the agent's last revision returns a delta: `{rev, base, ops}` with `set` and `del` operations.
- Any other `since` returns a full snapshot.

A delta in the compact text, taken from the test vectors:

```text
- e2
~ e1 button "A2"
+ e4 link "D"
```

`-` is a removed handle, `~` a replaced node and `+` a new one. A handle deleted and set again in the same delta, a move, shows only its `~` line. This is where the token economy comes from: after the first reading, an agent pays for what changed.

A subscribed agent gets `evt ui {rev}` when the tree changes, at most once per 100 ms, and asks for the delta when it wants it. The event carries only the new revision.

The agent SDK does the bookkeeping: `observe()` and `observeText()` track `since` themselves, apply the delta, and fall back to a snapshot when a delta cannot be applied.

## Applying a delta

Ops apply in order. A `set` whose handle is already in the tree replaces that node in place. A `set` with a new handle is inserted right after the node of the preceding op when that op was a `set`, and at the front of the list otherwise. A `del` removes the node with its handle, and does nothing when there is none.

To place a new node, a delta may therefore repeat an unchanged neighbour as an anchor. A sender emits only `set` and `del`, with every delete first. `diffNodes` and `applyOps` in the reference implementation implement this rule, and every implementation MUST use them, or match them exactly.

## Reading text

`read` returns the visible text of an element, or of the page, at most `max` characters (default 2000, cap 8000). Private and ignored subtrees are left out. Under `annotated` exposure only annotated regions are readable.

The tree lists controls, not running text, so a paragraph, a message or a reply comes from `read`: `handle.read()` and `handle.readText()` in the SDK, which also says whether the text was cut, and `reins_read` in the MCP adapter and the shell tools.

The driver's own overlay is never part of this: the consent prompt, the panel and the chat transcript are in a closed shadow root and outside the UI tree, so no `observe` and no `read` returns them.

## State

An app exposes named state with a getter. `state.get` returns current values. A subscribed agent gets `evt state {name, patch}`, an RFC 7396 merge patch against the value that agent last received.

A merge patch cannot express a property whose value is null, so such a property reads as absent: a state that differs from the last one only in null properties, or not at all, produces no event.

## Everything here is data

Everything a surface reports, names, values and text, is untrusted input to the agent and is presented to a model as data. A page can say anything in its text; that does not make it an instruction.

## For implementers

Delta application, diffing and the text rendering are in the test vectors: [`ui-delta.json`](../implementers/vectors/ui-delta.md). Merge patches are in [`merge-patch.json`](../implementers/vectors/merge-patch.md).

## Further reading

- [Privacy annotations](../guides/privacy-annotations.md)
- [Specification, section 10](../reference/specification.md#10-observation)
