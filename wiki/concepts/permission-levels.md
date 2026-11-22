# Permission levels

> The panel that opens from the indicator. For each attached agent the person sets how much it asks, a rule for single actions and which scopes are on, and sees what it did. Only the person can change any of it.

## The panel

While an agent is attached, the page shows the indicator "AI connected: ..." with the agent's name. Under the `open` and `guarded` profiles its text is a button. It opens a panel with three tabs:

- **Permissions**: for each attached agent, how much it asks, what happens when it calls each of the app's actions, the scopes of its grant as switches, and a control that ends that one grant.
- **Activity**: the last 50 commands, with what let each run.
- **Chat**: the page's chat room. See [Chat](./chat.md).

Above the agents the Permissions tab lists the requests that wait for the person's answer, with Review, Discard and Take back: see [Requests that wait](./waiting-requests.md).

The panel belongs to the person at the page. It opens and closes on their input alone, and Escape closes it. No protocol message opens it, closes it or reaches anything in it, and the driver's API has no way to set what it sets. It lives in the same closed shadow root as the consent prompt and is never part of the tree an agent sees. This holds against agents and against the page's styles. It does not hold against script that runs in the page's own JavaScript realm, whichever of the two loads first: see [What script in the page can do](./human-control.md#what-script-in-the-page-can-do).

The `kiosk` profile has no panel: a kiosk visitor is not the owner.

## Levels

How much the person is asked about one agent's actions is theirs to set, for each grant.

| level | what an `act` request does |
|---|---|
| `strict` | asks every time, also for an action the policy allows |
| `ask` | asks when the policy says `confirm` or the hub sent `c:1` |
| `auto` | runs without asking, unless the action's risk is `dangerous` |
| `bypass` | runs without asking |

A grant starts at `ask`, with one exception: an agent the person set to Strict earlier on this page starts at `strict` again ([below](#what-the-person-tightened-stays)). In the panel the levels are Strict, Ask, Auto and Bypass, under "How much it asks you".

- `strict` and `ask` are on offer for every grant, whatever a policy lists: neither lets an agent do more.
- `auto` and `bypass` are on offer only where both the page's policy and the hub's policy list them in `human.levels`.
- **A `deny` stays a `deny`.** No level and no rule runs what the page's policy or the hub's denies. The panel shows such an action as "Blocked by app" or "Blocked by hub".

A level decides `act` requests only: whether an action the app declared asks first. The other scopes are switched off as a whole, below.

## Rules for single actions

For one action of one agent the person can set a rule: Allow, Ask or Block (`allow`, `confirm`, `deny` on the wire).

- A rule beats the level. Under Bypass the rule Ask still asks, and under Strict the rule Allow still runs.
- A rule covers the action name with any arguments, and the panel and the prompt say so where a rule is set.
- Ask and Block only tighten and can always be set. A blocked action fails with `E_CONSENT` ("the user blocked this action"): no prompt is shown, and nothing counts toward the cool-off.
- Allow, for an action the policy asks about, can be set only where a level on offer would waive the same prompt: `auto` or `bypass` for an action that is not dangerous, `bypass` for a dangerous one. Where it cannot be set, the panel shows Allow switched off and says why.
- "Always allow" on a consent card sets the same rule Allow. See [Consent](./consent.md#the-third-button-always-allow).

Under each action the panel says why it stands as it does: the person's rule, an approval the page remembers, or the level, and that the hub asks about it where only the hub does. The panel never shows an action as asking while a remembered approval would let it run: it shows it as allowed and says that the person approved it earlier. Reset takes the person's rule away and that approval with it, and choosing Ask forgets the approval as well.

## How a request is decided

An `act` request is decided in this order. `decideAct` in the reference implementation implements it, and every surface has to use it or match it exactly.

1. The policy's decision for the action, made `confirm` at least when the request carries `c:1` or the hub said that it confirms the action. `deny` is `E_DENIED`: nothing the person sets relaxes it.
2. The rule Block is `E_CONSENT`. No prompt is shown and nothing counts toward the cool-off.
3. A prompt is needed when the decision is `confirm`, or the level is `strict`, or the rule is Ask.
4. A needed prompt is waived by the rule Allow, by the level `bypass`, and by the level `auto` unless the action's risk is `dangerous`.
5. The rule Allow waives a prompt the policy demands only where it could be set. A level that is not on offer counts as `ask`.
6. A prompt that is still needed is shown, unless a remembered approval answers it (`remember: session`). Nothing is remembered, or answered from memory, under `strict`, under the rule Ask, or for a request the hub confirms.

The page takes the stricter of its own policy's decision and the hub's, which the hub sends at attach, and takes the hub's as `confirm` for an action the hub did not name. It also holds the hub to its word: a request for an action the hub said it confirms asks whether it carries `c:1` or not. What the panel shows as asking therefore does ask, and no step in the panel waives without saying so a prompt that only the hub wants.

**A waived prompt is not an approval.** An action that runs because a level or a rule waived its prompt does not run while a consent prompt is showing or queued: it fails with `E_BUSY`, like any other command, and it is not remembered as approved. Changing a level or a rule answers no prompt: one that is showing or queued stays until the person answers it or it times out.

## Loosening takes two steps

Whatever lets an agent do more shows a confirm step first, and applies only when the person confirms it there:

- a level of `auto` or `bypass` above the current one;
- any level under which an action that asks now would stop asking, such as `ask` after `strict`;
- the rule Allow, always;
- Reset, where the action would then run without asking.
- a box ticked on the attach card (below): Allow then opens a second step that names what was ticked, and only its button grants;
- the longer of the two times for a rule Allow, where the step offers a time (below).

The step names the agent, lists the actions that would stop asking, among them those that only the hub asks about, and repeats the warning about an unverified hub when that applies. Its confirm button ignores activation for the first 500 ms after the step appears or moves, and a step that opens below the visible part of the panel is scrolled into view. These delays are judged by the clock when the click arrives, so a timer that never fires leaves a button inactive, never active. In the [playground](../../playground.html) the step reads: "Set “Tab assistant” (a1) to Auto? “Tab assistant” (a1) will then run this action without asking you, with any arguments: order.submit".

"Always allow" on a prompt sets the rule Allow the same way: a second press, armed again, after the card has said what the rule covers.

What makes an agent ask more or do less applies at once: a level under which nothing stops asking, the rules Ask and Block, a scope switched off, a reset after which the action asks. Lifting the person's own Block to Ask, and switching a scope back on, give back a prompt or what the person granted at attach: they take one click, on a list that has settled.

**No silent redraw.** When what is under the pointer changes other than by the click the person is making, the controls that let an agent do more ignore activation for 500 ms. That is so when the list changes (an agent attached or left), when a consent card or its backdrop goes away, when a confirm step opens, and after the person's own click on a confirm step's button, whose second half as a double click would land on what comes up under it.

**Nothing loosens while the overlay cannot be relied on.** While the page covers the overlay, fades it or moves it out of the browser's top layer, no click on a control that lets an agent do more is taken; what makes an agent do less still is. Once the overlay can be relied on again, the panel says that a click was not taken and why, and every arming delay starts again. See [Human control](./human-control.md#the-indicator-has-to-stay-visible-and-usable).

While a consent prompt is up, a wide window shows the card beside the panel; on a narrow one the panel stays under the prompt's backdrop until the prompt is answered. With focus in the panel, Escape closes the panel and denies nothing.

## Offers on the attach card

(0.2) An app can name, in `human.offer`, up to 8 of its actions that the attach prompt may offer to allow without asking each time. The prompt lists them under "Without asking each time", each with a box that is never ticked for the person. An action is offered only where the person could set the rule Allow for it in the panel and the rule would change something: the app declares it, a request for it asks (the stricter of the app's decision and the hub's is `confirm`), and a level on offer would waive that prompt. What the person tightened before for the agent wins: nothing is offered for a grant that stays at Strict, an action that keeps their Ask or Block rule is left out, and the prompt names what was left out. Nothing is offered where there is no attach prompt (`attach: allow`), with an app's own consent handler, or without the panel.

A tick alone changes nothing. When any box is ticked, Allow does not grant: it opens a second step that names the agent and exactly the ticked actions, says that they will run without asking, with any arguments, and for how long, and whose button ("Allow with these") is armed anew. Only that button grants. The grant then starts with the rule Allow for each ticked action, set as if the person had set it in the panel: shown on the indicator and in the panel, where it is taken back, and reported to the hub before any action runs under it. The playground's kiosk offers `order.submit` this way.

From the security model: `human.offer` is the app's choice. An app that offers a sensitive action at every attach makes it one tick and one confirm away from running unasked for the whole grant; an app should offer only what its users would set in the panel anyway.

## A rule for a time

(0.2) Where the policy has `human.allowMs` above 0 (15 minutes in every profile), every confirm step that sets the rule Allow lets the person choose how long it holds: until the agent disconnects, which is preselected, or for that time. That goes for the panel, for "Always allow" on a prompt, and for the offers on an attach card. Choosing the longer of the two is a click that lets an agent do more, and the step's button is armed anew after either choice; it is named by the choice ("Allow for 15 minutes"). A rule for a time ends by the clock, whether or not a timer fired: the action then follows the level again, the hub and the agent are told as for a rule the person removed (`evt user {kind:"rule", a, d:null}`), and while it holds the panel and the indicator say when it ends. On the wire the rule is reported with `ms`, how long it lasts from now. The time is the app's (`human.allowMs`), not something the step lets anybody type.

## A cap on unasked runs

(0.2) A level or a rule lets an action run without asking however often it is called. `human.burst` `{max, perMs}` bounds that: the page counts, for each grant and action, the runs whose prompt was waived, by the person's rule Allow, by the level, or by a remembered approval. At most `max` such runs within `perMs` go unasked (20 in 10 minutes under `guarded`, 60 under `open`; a run no longer counts `perMs` after it happened). A further call within that time asks: its prompt says, in the page's own words, how often the action ran unasked in that time and what let it, and offers no "Always allow". Allow runs that call and starts the count again; the rule or the level stays as it is. An action that needs no prompt at all (the policy allows it and the level is not Strict) is not counted: the hub's rates bound those. `human.burst: false` switches the cap off, as the kiosk profile does.

## After a refusal

(0.2) When the person refused an action prompt, the page shows a notice of its own for 8 s: that the action did not run, with one click to Block that action for that agent (it tightens, so no second step) and, where the agent holds the `chat` scope, one to say why in the Chat tab. It asks nothing, takes no focus, and is taken down when a prompt comes up. See [Consent](./consent.md#what-keeps-prompts-honest).

## Scope switches
## Scope switches

Under "What it may do" the scopes of the grant are switches. The person can switch one off and back on. A request whose scope is off fails with `E_SCOPE`. Switching `ui` off, for example, leaves an agent able to look, read and talk, and unable to click or type.

A switch never widens a grant: only scopes granted at attach can be on. A grant with every scope switched off stays live, so the person can switch them back on. See [Grants and scopes](./grants-and-scopes.md#scope-switches).

Disconnect ends one agent's grant, as Stop does for all, and leaves the others.

## Activity

The Activity tab lists the last 50 commands: the time, the agent, the method or the name of a declared action, the outcome, and whether the person, a level, a rule or a remembered approval let an action run. The same command of the same agent several times in a row is one line with a count; two agents with one name are two agents there too. The list holds no arguments, no results and no page text.

## What the indicator shows

What the person loosened stays in sight, with the panel closed:

- While an attached agent's level is not `ask`, the indicator shows that level: a chip with its name, and a dot that is amber for `auto` and red for `bypass`.
- While a rule Allow of the person waives a prompt that would otherwise be shown, the indicator shows that too: a chip that counts those rules ("1 rule"), and the dot of the level that would waive the same, amber, or red when one of the actions is dangerous. An approval the page remembers does what such a rule does, and is counted on the same chip ("1 approved").
- While a rule Allow set for a time holds, the chip says when it ends ("1 rule until 14:05").
- While requests wait for the person's answer, the indicator counts them ("1 waiting"); with nobody attached and a request to connect waiting, it reads "An AI agent is waiting to connect". See [Requests that wait](./waiting-requests.md).
- When the hub is unverified, the indicator, the panel and the confirm step say so.

Wherever the overlay names an agent in words of its own (a prompt, a confirm step, a heading of the panel, the indicator, a line of the activity list), the agent's name is shown inside quotation marks and followed by its session id, as in `“Tab assistant” (a1)`, so that a name cannot pass for words of the page or finish one of its sentences, and two agents with one name are told apart.

The indicator's colours and marks are part of the overlay's own stylesheet, not values a page can set. Pause and Stop stay where they are and stay usable while the panel is open, also inside a modal dialog or a fullscreen element.

## What the app and the hub decide

The person chooses within what the app and the hub offer.

```js
createDriver({ app, policy: { profile: 'guarded', human: { levels: ['auto'] } } });   // Strict, Ask, Auto: no Bypass
```

- `human.levels` in the page's policy lists the levels on offer beyond `strict` and `ask`. `human: { levels: [] }` leaves those two, and `human: { panel: false }` leaves the panel out, and with it the chat.
- The hub's policy caps the page's. The hub sends its list with every attach, and a page that got none offers `strict` and `ask` alone.
- The page reports each change to the hub, which records it in the [audit log](./audit-log.md) and tells the agent. The hub ends a grant whose page reports a level beyond the hub's own list, or more than 20 changes within one second (no person makes them). A rule Allow that the hub's policy would not honour is recorded as refused and is neither kept nor told to the agent; the grant goes on, and the hub still refuses or marks every request for that action itself.
- While the hub cannot write its audit log, a reported change that lets the agent do or hear more (a higher level, a rule that holds an action back less, a scope switched back on, the chat switch on) ends the grant, because the hub cannot record it. A change that only tightens is taken, and its record waits with the others.

See [Policy fields](../reference/policy-fields.md).

## What ends with the grant

What lets an agent do more lasts for one grant: the levels `auto` and `bypass`, the rule Allow, a remembered approval, and "Agents can hear each other" in the chat. When the agent detaches, is stopped or attaches again, the next grant has none of them.

## What the person tightened stays

The level Strict, the rules Ask and Block and the scopes the person switched off stay with the agent for as long as the page lives. No sequence of the agent's own calls sheds them: not attaching again, not a detach and a new attach, not letting the grant run out, not coming back under another session id or name. They are on its next grant from the first request, and only the person lifts them, in the panel. A reload of the page ends them, like everything the page holds.

The page tells the agent by the id of its credential, which the hub sends with every attach. Two credentials are two agents. Where the page cannot tell agents apart (the hub sent no id, or the page did not verify the hub), every agent is the same agent to it: an attach that follows a tightening asks the person even under `attach: allow`, and the card lists what was set, under "What you set for this agent before stays:" (or, where the page cannot tell which agent it is, "This page cannot tell whether this is an agent you restricted before. What you set then stays for this one:"). The attach answer carries what is kept (`kept`), the hub starts the grant with it and records each item in the [audit log](./audit-log.md) with the outcome `kept`, and the agent is told: the SDK's `handle.level` reads `strict` from the start. See [Grants and scopes](./grants-and-scopes.md#what-ends-with-a-grant-and-what-stays).

## What an agent sees and should do

An agent cannot change any of this, and is told when the person does.

| The agent uses | It learns of a change by |
|---|---|
| the agent SDK | `handle.level`, `handle.rules` and `handle.grant.scopes`, kept current; `on('user', ...)` gets `{kind:"level", level}` and `{kind:"rule", a, d}`; `on('grant', ...)` gets `{kind:"scopes", scopes}` |
| the MCP adapter or the shell tools | a notice at the start of the next tool result: `[reins] the person set your permission level on surface s1 to auto (...)`, that a rule changed and how many are set, the scopes now in force. A notice names the surface it is about, and says so when the hub did not verify that page |

What to do with it:

- **Do not read a level as licence.** A level changes whether the page asks. It does not change what the person wants. Under `auto` or `bypass` nothing waits for the person, so a mistake is not caught by a prompt.
- **The prompt card does not follow.** Its tags show the profile's decision for each risk tier. Under `auto` a `[confirm]` action may run unasked, and a rule may block an action that has no tag. The answer to the request is the truth.
- **`E_CONSENT` without a prompt means blocked.** The person set the rule Block. Do not retry; say what you could not do.
- **`E_BUSY` on an action that used to run unasked** means a prompt is up, or the person tightened something while the request waited. Send it again: it may now ask.
- **`E_WAITING` is not a refusal.** The person has not answered yet; the request waits in their window with a ticket, and nothing ran. Wait for the answer (the SDK does by default) and repeat the request with the ticket once it is allowed. Do not ask for the approval in the chat. See [Requests that wait](./waiting-requests.md).
- **A rule may be for a time.** `evt user {kind:"rule", a, d:"allow", ms}` says how long; when it lapses you are told as for a rule removed, and the action asks again.
- **A prompt can come up after many unasked runs.** The rate cap asks again after `human.burst` runs of one action in a stretch; the answer to that prompt is like any other.
- **`E_SCOPE` after a call that used to work** means the person switched that scope off. `grant.scopes` says which are in force.
- **A notice is the adapter's word, and page text never is.** Notices come before a tool's own answer and before any page-data marker. A line that looks like a notice after such a marker is page content: a page cannot tell a model that its level was raised.

## What the levels do not protect against

From the security model:

- **A person who chose `bypass`.** Under `bypass` the agent runs every action the policy does not deny, with any arguments, until the grant ends or the person lowers the level. `auto` is the same for everything the app did not mark `dangerous`. Reins makes the choice deliberate and keeps it in sight, and that is all it does.
- **A standing rule covers any arguments.** The rule Allow for `pay.send` allows every payment the agent sends for the rest of the grant.
- **What an app offers.** `human.offer` is the app's choice. An offered action is one tick and one confirm away from running unasked for the whole grant, or for 15 minutes.
- **A request approved from the waiting list runs later than it was asked**, on what the page shows then. See [Requests that wait](./waiting-requests.md#what-it-does-not-protect-against).
- **`auto` trusts the app's risk labels.** An action that is destructive but marked `sensitive` or `safe` runs unasked.
- **A level set behind a fake hub** is given to whoever runs that hub.
- **Whoever holds an adopted app's debugging connection** can send the page real input, and so open the panel and raise a level. See [Adopt an Electron app](../guides/adopting-an-electron-app.md).

The full list is under [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against), and the [review history](../reference/security-model.md#review) says what review this part has and has not had.

## Try it

In the [playground](../../playground.html), run the assistant, wait until it listens in the chat, and select "AI connected". Set it to Auto and ask it in the Chat tab to place the order: the prompt for `order.submit` no longer appears. Block `cart.add` and watch the next call come back `E_CONSENT`. Switch `act` off and watch `E_SCOPE`. The Wire tab shows each report cross as `evt user` and `evt grant`, and the Script tab what the assistant was told.

On the attach card, tick `order.submit` under "Without asking each time": Allow then shows a second step, "Allow with these", and the order is placed without a prompt. Press "Later" on a prompt instead, and the request waits ([Requests that wait](./waiting-requests.md#try-it)). Refuse one, and the notice offers to block the action.

## For implementers

The cases of `decideAct` are in the test vectors: [`levels.json`](../implementers/vectors/levels.md). The requirements are the `LV-` entries of the [requirements index](../implementers/requirements.md); `LV-27` to `LV-37` are those of the second review, among them what stays after a new attach and that no wait relies on a timer. Offers at attach are the `OF-` entries, a rule for a time `RT-1`, the rate cap `RC-1`, the notice after a refusal `AD-1` and the attention event `AT-1`; their cases are in [`consent.json`](../implementers/vectors/consent.md).

## Further reading

- [Consent](./consent.md) and [Human control](./human-control.md)
- [Specification, section 12](../reference/specification.md#12-policy): "Levels and rules" and "The panel"; [section 13](../reference/specification.md#13-hub-behaviour): "What the person set".
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T38 to T45 and T67 to T75; T79 to T83 for offers, a rule for a time, the rate cap, the attention event and the notice after a refusal.
