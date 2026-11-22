# Consent

> The prompt that asks the person before an agent attaches or runs a sensitive action, and the rules that keep an agent from getting a yes it did not earn.

## What a prompt is

When policy answers `confirm`, the driver asks the person on screen. A prompt names the agent, the scopes or the action, and shows the arguments as text. There are two kinds:

- an **attach** prompt: an agent wants to control this page, with the scopes it asks for and its reason;
- an **action** prompt: an agent wants to run an action, with its name, risk tier, description and every argument.

The agent's name is shown inside quotation marks and followed by its session id, as in `“Tab assistant” (a1) wants to control this page`, so that a name cannot pass for words of the page and two agents with one name are told apart.

The prompt lives in a closed shadow root owned by the driver and accepts only trusted input events, so an agent cannot approve its own request: a synthetic click does nothing. That holds against agents and against events a script makes or borrows; it does not hold against script that runs in the page's own JavaScript realm ([Human control](./human-control.md#what-script-in-the-page-can-do)). An unanswered prompt is a refusal after `consent.timeoutMs` (60 s under `open` and `guarded`, 30 s under `kiosk`).

A refusal, or a timeout, reaches the agent as `E_CONSENT`.

## The third button: Always allow

An action prompt can have three buttons: Deny, Always allow and Allow. Allow approves this one request. "Always allow" also sets the person's rule `allow` for that action and that agent: it will then run without asking, with any arguments, until the agent disconnects.

Because that lets an agent do more, it takes two steps. The first press does not approve anything: the card says what the rule covers, and a second button, armed again after a moment, sets it. The rule shows in the panel, where the person can take it back, and the indicator shows that a rule is waiving a prompt. "Always allow" is offered only where a level on offer would waive the same prompt. See [Permission levels](./permission-levels.md).

Whether a prompt appears at all is no longer the policy's decision alone. The person can set an agent to ask every time (`strict`), to stop asking (`auto`, `bypass`), or block a single action, in which case the request fails with `E_CONSENT` ("the user blocked this action") without any prompt. No level and no rule relaxes a policy `deny`.

## What is approved is what runs

The prompt lists every argument in full and shortens nothing: indented JSON, two spaces per level.

- **Invisible and look-alike characters are shown.** Every code point in the Unicode categories C (control, format, private use, unassigned) and Z (separators) other than a plain space, every default-ignorable code point, and the blank Braille pattern U+2800 is shown as a `\u{XXXX}` escape, in the arguments and in every other string an agent or the hub wrote that the overlay shows: agent names, the attach reason, toasts and their captions, cursor and highlight labels, chat. In the same strings every combining mark beyond the second in a row is shown as such an escape, and each line of the argument listing clips what it paints, so that a letter stacked with marks cannot paint over the lines around it.
- **What cannot be shown in full is not asked at all.** More than 40 object keys and array items in total, containers nested deeper than 4, a rendered listing of more than 2000 code points, or a value that is not JSON: the request fails with `E_TOO_LARGE`.
- **A tall card has to be read.** A card taller than the window scrolls and says "Scroll to the end to review everything before allowing." Allow, "Always allow" and its second step stay inactive until the person has scrolled the card to its end.
- **The page cannot change under the prompt.** While a consent prompt is showing or queued, every method that is not read-only, from every agent, fails with `E_BUSY`.

## What keeps prompts honest

- **Bounded.** One pending prompt per agent and four in total. More fail with `E_BUSY`.
- **Cool-off.** After a refusal or a timeout, that agent's action prompts, and attach prompts from any agent, are refused with `E_RATE` for 2 s, doubling with each further refusal or timeout up to 60 s. An approval resets it.
- **Three refusals end it.** Three explicit refusals in a row of one agent's action prompts revoke its grant as Stop does, and the third request fails with `E_CONSENT`. Timeouts do not count toward the three.
- **No accidental approval.** Allow ignores clicks for the first 500 ms after the prompt appears or moves, and shows that it is not yet active. A pointer click on Deny is taken at once. The pointer answers all along.
- **Keys meant for the page answer nothing.** A prompt takes the focus, and the person may be typing, tabbing through a form or about to press Enter. The prompt puts the focus on itself, the dialog, where no key presses anything, and not on a button. A key answers only as Enter or Space on a button of the prompt that has the focus, or as Escape (which denies), and only when all of this holds: it is not a repeat of a key held down; at least 500 ms have passed since the prompt appeared or moved, since the focus landed on that button, and since any other key was pressed; and at least 3 s have passed since the last key that types (a character, Backspace or Delete, or any key pressed with Ctrl, Alt or Meta), wherever the focus was then, also before the prompt came up. Tab does nothing during the prompt's first 500 ms. While the 3 s run the card says so: "Keys do not answer this request right now, because something was just typed. Use the pointer, or wait a moment and press the key again." This goes for Deny and Escape as for Allow: a key meant for the page neither approves nor refuses.
- **The keyboard still works, and that is its limit.** A person who means it answers by the keyboard alone: Tab to the button, let the focus rest there, Enter. A person who tabs onto Allow, lets half a second pass and presses Enter has approved, whether or not they read the card first.
- **Nothing an agent drew stands beside a prompt.** When a prompt comes up, every toast and highlight is taken down and the cursor's label is hidden, and none can be put up while it shows (`E_BUSY`). What an agent says about a request is on the prompt itself, under the agent's name. The cursor's label comes back when the prompt has gone; toasts and highlights do not.
- **No timer has to fire.** Every wait named here is a time, compared with the clock when a click, a key or a request arrives: the arming delays, the 3 s after typing, the cool-off, the deadline of a prompt. A prompt past `consent.timeoutMs` is a refusal from the moment anything looks at it, whether or not its timer fired.
- **The focus comes back.** When a prompt goes away, the focus goes back to where it was when the prompt appeared: the element of the page, or the control of the overlay.
- **Nothing loosens while the overlay cannot be relied on.** The driver checks that its overlay is where the person can see and use it: in the document, in the browser's top layer, drawn at its own size, not faded, filtered, clipped or transformed by a style of the page, and what a hit test finds. While that does not hold, a click on Allow or "Always allow" is not taken. The prompt stays up and its time runs on; Deny is still taken. A click that made the check put the overlay back on top is not taken either: only a later, separate one counts. See [Human control](./human-control.md#the-indicator-has-to-stay-visible-and-usable).
- **No silent swap.** A prompt withdrawn while it is showing, because its agent detached or disconnected, becomes a "Request withdrawn" notice with no Allow button for 1.5 s before any next prompt.
- **Honest about the hub.** When the hub is unverified the prompt says so.

The indicator stays above a prompt's backdrop, so Pause and Stop work while a prompt is up. While a prompt is showing or queued, the Chat tab shows nothing an agent wrote, and `chat.say` and `chat.status` fail with `E_BUSY`: no agent's words stand next to a decision. See [Chat](./chat.md).

## Remembered approvals

With `remember: session` an approved action is remembered once its handler has run, and is not asked again under the same grant unless the hub confirms the request; an approval of such a request is not remembered. Where an approval will be remembered, the prompt says so before the person gives it ("Allow is remembered: ..."). The panel shows a remembered approval where it shows the person's rules, the indicator carries a mark for it ("1 approved"), and the person takes it back in the panel. Nothing is remembered under the level `strict` or the rule `confirm`, and a remembered approval ends with its grant.

> [!WARNING]
> The remembered approval covers that action name with any arguments. This is why only the `open` profile remembers by default.

## When the page asks even though policy says allow

The surface asks before an attach even when its policy says `allow` if the hub is unverified, or if the person has pressed Stop, or a revocation after refusals has happened, since the page loaded, or if the person has tightened something for an agent that the page cannot tell this one from. In the last case the card lists what was set and says that it stays. See [Permission levels](./permission-levels.md#what-the-person-tightened-stays).

## Your own consent handler

An app may supply its own consent handler, for example an attendant PIN on a kiosk. It gets the request as data and answers yes or no. The display rules above are those of the driver's own prompt: a handler that shows the request has to keep them itself. See [Make an app drivable](../start/make-an-app-drivable.md#your-own-consent-prompt).

## What an agent should do with the answers

| Answer | Meaning | What to do |
|---|---|---|
| `E_CONSENT` | The person refused or blocked the action, or the prompt timed out. | Do not ask again at once. Tell the person what you wanted and why. |
| `E_RATE` | A cool-off after a refusal. | Wait. The cool-off doubles each time. |
| `E_BUSY` | A prompt is up or queued, yours or another agent's, or a permission changed while the request waited. | Wait for the prompt to be answered, then send the request again. |
| `E_TOO_LARGE` | The arguments cannot be shown in full. | Send smaller arguments. Bulk data belongs in a view, not in an action. |
| `E_TIMEOUT` | The page did not answer within the hub's wait. | Treat it as a prompt nobody answered. Ask the person to bring the page to the front, then ask again. |

About `E_TIMEOUT`: a prompt nobody answers normally ends as `E_CONSENT`, well inside the hub's wait. It does not when the prompt first waited its turn behind another one, when the app set `consent.timeoutMs` above the hub's `consentTimeoutMs`, or when the page ran its timers late, as a browser may make a tab in the background do. The prompt can still be on the page, and a request approved there later still takes effect. Before repeating an action that is not safe to run twice, observe whether it ran.

## Further reading

- [Permission levels](./permission-levels.md) and [Human control](./human-control.md)
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T14, T15, T16 and T31 are about prompts.
- [Specification, section 12](../reference/specification.md#12-policy)
