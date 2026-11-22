# Privacy annotations: the data-reins attributes

> Four attributes decide what an agent sees of your page. Name what it should use, hide what it should not see, and mark what it must never read.

## The attributes

| Attribute | Effect |
|---|---|
| `data-reins-id="cart.checkout"` | Names the element. An agent addresses it as `#cart.checkout`, and the element is exposed under every exposure but `none`. |
| `data-reins="expose"` | Exposes the element without giving it a name. |
| `data-reins="ignore"` | Hides the element and everything inside it. |
| `data-reins="private"` | Marks the element and everything inside it as private: present, but never read and, by default, never written. |
| `data-reins-label="Card number"` | The name an agent sees, ahead of every other source of a name. The only name a private subtree may have. |

## Name what the agent should use

```html
<button data-reins-id="order.submit">Place order</button>
<strong data-reins-id="cart.total" role="status">$0.00</strong>
```

A semantic id survives a redesign. An agent that learned `#order.submit` from one observation can use it in the next session; a handle like `e12` is stable only for the element's lifetime.

Under the `kiosk` profile, annotation is the whole interface: only annotated elements exist for the agent. Annotate only the elements the assistant should see.

## Hide what is not the agent's business

```html
<aside data-reins="ignore">
  <!-- debug panels, internal notes, another customer's data -->
</aside>
```

An ignored subtree is never exposed: not in the tree, not in `read`, not as a target.

Also never exposed, without any annotation: anything hidden (`hidden`, `inert`, `aria-hidden="true"`, `display:none`, `visibility:hidden`), and the driver's own overlay.

## Mark what must never be read

```html
<div data-reins="private" data-reins-label="Payment details">
  <input name="iban">
  <output id="balance">4,210.00</output>
</div>
```

A private node appears in the tree with state `private`, so an agent knows something is there, and that is all it learns:

- it never carries a value;
- besides `private` it reports only `disabled` and `focused`, never `checked` or `selected`;
- its text is never returned by `read`;
- inside a private subtree, a node is named only by `data-reins-label`, so the text of a private element never becomes the name of another node.

## What is private without any annotation

- `input[type=password]`
- fields whose `autocomplete` is `cc-number`, `cc-csc`, `cc-exp`, `cc-exp-month`, `cc-exp-year`, `one-time-code`, `current-password` or `new-password`

So use the standard `autocomplete` values on payment and sign-in forms. They help the browser, and they tell Reins what is private. A field that is private for one of these reasons is named by its attributes and labels, never by its value or its content.

## Private fields are not written either

By default no agent can change a private field. Every command that synthesises input (`ui.click`, `ui.type`, `ui.select`, `ui.key` on any key, `ui.scroll` aimed at an element), and a click on the label of a private control, fails with `E_DENIED` on a private target.

So does a command that would change a private control it does not target:

- `ui.type` with `clear` on an editable element that contains private elements;
- a radio whose group has a private member;
- a reset control whose form holds a private field.

`Tab` moves focus as the browser would among exposed elements, and never to a private one.

The policy field `privateInput` lifts this for an app that wants an agent to fill such fields. No profile sets it.

## Privacy is sticky

An element that was ever private stays private for its lifetime. A "show password" toggle that changes the input's type exposes nothing, and neither does removing the `autocomplete` attribute or the annotation.

It also survives a node swap. Frameworks often replace a node where a script would change an attribute. A text field is private for its lifetime when it has the same non-empty `id`, `name` or `data-reins-id` as one of the last 32 private text fields that left the document, or when it is inserted under the same parent as one of them within one second of its removal.

## Expose a part of the page only

`createDriver({ root })` limits the driver to a subtree: nothing outside it is in the tree. The [playground](../../playground.html) does this, so the assistant sees the demo app and not the inspector beside it.

## Check your work

Read the page the way an agent does:

```bash
npx --no -- reins observe
```

or `await handle.observeText({ full: true })` with the SDK. What is not in that text does not exist for an agent. In the playground, open the Staff panel and send `observe` from the console: the PIN field is there as `[private]`, with no value.

## What annotations do not do

They decide what an agent learns through Reins. They do not protect a page from script running in it. See "Hostile script inside the app's own origin" in [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against).

## Further reading

- [Observation, handles and deltas](../concepts/observation.md)
- [Security requirements](../reference/specification.md#14-security-requirements): rule 9.
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T18.
