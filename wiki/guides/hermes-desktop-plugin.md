# Reins for Hermes Desktop

> A Hermes Desktop plugin that makes the Hermes window a surface with three named actions. Built and statically checked, not run in Hermes. Rendered from integrations/hermes-desktop/README.md.

A desktop plugin for Hermes Agent (Nous Research) that makes the Hermes Desktop window a
Reins surface with declared actions. An agent outside Hermes, Claude Code for one, can
then send Hermes a prompt and read the reply, with the Reins consent prompt, indicator,
panel, Pause and Stop in the Hermes window.

**Status: run once in a live Hermes Desktop, on Windows.** On 22 November 2026 the
built plugin was installed in Hermes Desktop (Windows 11, the version current that day),
switched on, attached to a hub started with [`hub.json`](https://github.com/offensiveadhd/reins/blob/main/integrations/hermes-desktop/hub.json), and an agent sent a
prompt with `prompt.send` after the person allowed both cards. Hermes (GLM 5.3) carried
out the task and `reply.read` returned its final answer with `complete: true`, 55 s
later. That one run is all that was run live: not macOS or Linux, not `prompt.draft`,
not the levels or the Chat tab in Hermes. The plugin's own source also runs in the
repository's tests against a stand-in for Hermes's SDK
(`packages/electron/test/hermes-plugin.test.ts`). It was written from the Desktop plugin SDK documentation
in the Hermes repository (`website/docs/developer-guide/desktop-plugin-sdk.md`) at the
version installed in November 2026 (Electron 44.10.2).

The other way to reach Hermes Desktop, with nothing installed into it, is to adopt it
with `reins-electron`: see [docs/ELECTRON.md, section 6](../reference/electron-guide.md#6-claude-controls-hermes).
That way gives an agent the whole Hermes window, every button in it. This plugin gives it
three named actions and nothing else, and is the one to use when the point is to let an
agent talk to Hermes.

## What an agent gets, and what it does not

Hermes is an agent that holds tools: your files, your shell, your accounts. So the
question for this plugin is what one approved attach is worth, and the answer is kept
small on purpose.

| | Risk | |
|---|---|---|
| action `prompt.send {text}` | dangerous | Sends `text` in Hermes's conversation in front, through `host.composer.submit(null, text)`: the same as typing and pressing Enter. You are asked each time and shown the whole prompt. Refused with `E_BUSY` while Hermes is in the middle of a turn there, with `E_NO_TARGET` when no chat takes the prompt, and with `E_INTERNAL` when this Hermes gives no sign of whether a turn is under way. Where Hermes names no live session for the chat in front (`host.state.focusedSessionId` is null, as in the build this was run in, though the chat answers), the prompt goes to the chat the app's focus routes to, is refused while any conversation is mid-turn, and the reply is the first turn that starts within 30 s; the result then says `learning: true`. |
| action `prompt.draft {text}` | dangerous | Puts `text` in Hermes's message box and sends nothing (`host.composer.setDraft`). You are asked each time as well: the words are then one Enter away from Hermes, in your name. |
| action `reply.read` | safe | Hermes's reply to the caller's own last `prompt.send`: `{ session, text, complete, truncated, at, status?, working? }`. While Hermes works, `text` is the part it is writing now and `complete` is false; once the turn has ended, `text` is its final answer, and `status` says how it ended (`complete`, `error`, `interrupted`) when Hermes says so. `working` is whether Hermes is in the middle of a turn in that conversation. An agent that did not send the prompt gets an empty reply. |
| state `conversation` | | `{ session, busy, awaitingResponse, model, profile }` of Hermes's conversation in front. |

What it does not get:

- **No clicks and no typing.** The plugin's policy grants no `ui` scope, whatever an
  agent asks for at attach. It cannot press Send, and it cannot press the button with
  which you approve a tool call of Hermes.
- **No view of the page.** Nothing of Hermes's interface is exposed (`exposure: 'none'`):
  `reins_observe` returns an empty tree and `reins_read` no text. What an agent learns of
  Hermes is what `reply.read` gives it and what the state `conversation` says.
- **No reply that is another agent's.** The reply is held to the agent whose prompt it
  answers: `reply.read` gives it to that agent and an empty one to any other, and it is
  not a state, because a state is the same for every agent that was allowed to look. It
  is forgotten when that agent's grant ends.
- **No reply from another conversation.** The reply is collected from the gateway events
  `message.start`, `message.delta`, `message.interim`, `message.complete` and
  `message.error`, at most 16 000 characters, and only from events that name the session
  the prompt went to. An event without a session id, or from a conversation in the
  background, is not taken for the answer. A turn with tool calls is written in parts:
  what is kept is the part being written now, and at the end the turn's final text, so
  the commentary of a long run does not use up the room the answer needs. And because
  the reply is whatever Hermes says next in that conversation,
  `prompt.send` is refused while Hermes is in the middle of a turn there
  (`host.state.busyBySession`, `host.state.busy`, `host.state.awaitingResponse`), and
  also when this Hermes offers none of those signs: otherwise the end of an answer to
  your own message could be read as the answer to the agent's prompt.
- **No prompt you could not read.** A prompt is approved on a card that shows all of it,
  or it is not sent. See below for the limit.
- **No way to act without you, unless you say so.** See the next section.
- **No refusal because you were looking elsewhere.** A card you did not answer waits for
  you in the panel; see "When you are in another window".

The scopes an agent can hold are `observe`, `act`, `show` and `chat`.

## The levels, and letting prompts through without the question

Both writing actions are declared `dangerous`. In Reins that word has one exact
consequence: the level Auto stops asking about sensitive actions and never about
dangerous ones. So this is what each level in the panel of the Hermes window ("AI
connected", Permissions) means for this plugin:

| Level | `prompt.send` and `prompt.draft` | `reply.read` |
|---|---|---|
| Strict | ask you, every time | asks you too |
| Ask, where every agent starts | ask you, every time | runs |
| Auto | ask you, every time. For this plugin Auto is the same as Ask | runs |
| Bypass | run without asking, unseen, at any length up to 8000 characters | runs |

**Bypass is the only level under which a prompt reaches Hermes without you.** The rule
Allow for `prompt.send` or `prompt.draft` does the same for that one action; it can be
set for the same reason Bypass can, and only because Bypass is on offer. Either takes
two steps: you choose it, and then confirm on a step that names the agent and the
actions that will stop asking. While it holds, the indicator in the Hermes window shows
it in red. The level lasts until that agent disconnects or you set it back.

**The rule Allow for `prompt.send` is the easy way, and it is offered where you are
anyway.** There are three places to set it, and it is the same rule in each:

- on the card that lets the agent connect, as a box to tick: "Without asking each time",
  `prompt.send`. Unticked, nothing changes. Ticked, Allow shows a second step that names
  the agent and the action, and the button there sets it;
- on a card that asks about one prompt, as "Always allow", with the same second step;
- in the panel, on the action's row.

On the second step you choose how long: until this agent disconnects, or for fifteen
minutes, after which every prompt asks again. `prompt.draft` is not offered on the
connect card: an unasked draft puts the agent's words into your message box, where one
Enter sends them as yours. You can still set its rule in the panel.

**Prompts that run without a question are counted.** After five of them by one agent in
ten minutes, the next one asks again, with a card that says why and shows the prompt,
whatever waived the question: your rule, or Bypass. Allow on that card starts the count
again. Five is this plugin's choice, well under the twenty of the guarded profile: each
prompt is a turn of Hermes's model, and whatever Hermes does with it.

Know what it means before you do it. From then on every prompt that agent writes goes to
Hermes without you seeing it first, and Hermes acts on a prompt with its own tools, under
whatever Hermes's own approvals are set to. A web page, a document or another agent that
manages to steer the outer agent can then reach those tools through it. Leave the level
at Ask unless you are watching, or unless Hermes itself asks you before it acts.

**A prompt too long to show cannot be approved.** A consent card shows the whole prompt
or the request is refused before you are asked: nobody should approve words they cannot
read. A card holds 2000 characters in all, of which the argument's name and its
quotation marks take 16, and a line break or a quotation mark inside the prompt counts
as two. That leaves about 1,900 characters for a prompt in plain text. A longer one
answers `E_TOO_LARGE` under Strict, Ask and Auto, and nothing is sent. What to do: send
a shorter prompt, or several, one after the other. Under Bypass there is no card, so the
limit there is the action's own, 8000 characters, none of which you see.

## When you are in another window

You drive the outer agent from its own window, and the card comes up in the Hermes
window, which you are not looking at. Before, the request was refused after a minute.
Now:

1. **The card waits for a minute, then the request waits in the panel.** Nothing is
   refused and nothing runs. "Later" on the card does the same at once. The request stays
   in the list for ten minutes.
2. **The agent is told** that its request waits in your window, that nothing ran, and for
   how long it stays there (error `E_WAITING`, with a ticket). The Reins tools say this to
   the model in plain words and tell it not to ask you for the approval in the chat.
3. **The plugin tells you**, with one desktop notification, while the Hermes window is not
   in front: "Hermes Desktop: a request is waiting for you". The words are the plugin's.
   Nothing an agent named or wrote is in them: no agent name, no action, no prompt. The
   notification takes no focus and raises no window. One per stretch: a card that then
   moves to the list does not notify again, and coming to the window ends the stretch. If
   Hermes Desktop does not grant notifications to its page, there is none; the plugin does
   not ask for the permission.
4. **In the Hermes window** the indicator reads "1 waiting". The panel lists the request
   under "Waiting for your answer": the agent, the action, its risk and since when, and
   not the prompt. **Review** opens the card again exactly as it was asked, with the whole
   prompt, and with every rule a card has. Allow there approves it; Deny refuses it;
   **Discard** in the list refuses it without a card.
5. **The agent repeats the request**, and it runs: once. The approval is for that request
   by that agent, word for word; the same ticket with another prompt, or from another
   agent, is a new question. After it ran, the next prompt asks again. An approval you
   gave and the agent has not used yet can be taken back in the list.

A request also stops waiting when its agent disconnects, and when its ten minutes are
over (the agent is told that too). One agent can have three requests waiting, and the
window twelve.

## Two conversations in one window

With the plugin on, the Hermes window holds two conversations. They are not the same and
do not mix:

| | who talks | where it is | how an agent uses it |
|---|---|---|---|
| Hermes's own conversation | you and Hermes | the Hermes interface: its message box and transcript | `prompt.send`, `prompt.draft`, `reply.read`, the state `conversation` |
| the Reins chat room | you and the agent that drives Hermes (Claude, say) | the Chat tab of the panel that opens from "AI connected" | `reins_chat` (scope `chat`) |

An agent that calls `prompt.send` puts words into Hermes's message box, and Hermes
answers them. An agent that calls `reins_chat say` talks to you in the panel, and Hermes
never sees it. What you type in the Chat tab goes to the attached agent, not to Hermes;
what you type in Hermes's message box goes to Hermes, and the attached agent does not see
it, since the page is not exposed. The Reins transcript is in a closed shadow root and is
not part of what the plugin exposes either. A message in the Reins chat approves nothing:
"yes, send it" there does not answer the prompt for `prompt.send`.

## Build

The plugin is built with the package: after `npm install` in a checkout of the Reins
repository,

```bash
npm run build
```

writes `dist/hermes-desktop/reins/plugin.js`, about 350 kB: the plugin with the Reins
driver bundled in. Hermes loads a desktop plugin as one module and refuses every import
but `@hermes/plugin-sdk` and React, which is why the driver cannot be loaded from a file
next to it. The build fails if the result imports anything else. The npm package ships
the built file at `node_modules/@offensiveadhd/reins/dist/hermes-desktop/reins/plugin.js`;
the source is `integrations/hermes-desktop/src/plugin.js` in the repository.

## Install (not run)

A desktop plugin is a folder named after its id, holding `plugin.js`, in Hermes's
`desktop-plugins` folder. Hermes watches that folder.

```powershell
# Windows
Copy-Item -Recurse dist\hermes-desktop\reins "$env:LOCALAPPDATA\hermes\desktop-plugins\reins"
```

```bash
# macOS, Linux: $HERMES_HOME is ~/.hermes unless you moved it
cp -r dist/hermes-desktop/reins "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/reins"
```

Then, in Hermes Desktop, enable "Reins" under Capabilities, Plugins. The plugin declares
`defaultEnabled: false`, so it does nothing until you do.

Start a hub that admits the Hermes window and asks about the two writing actions. The
window is a page loaded from a file, so its origin is `file://`. And a hub under the
plain guarded profile refuses a dangerous action outright (`prompt.send` would answer
`E_DENIED`, "action denied by hub policy"), so the hub needs to be told to ask instead.
[`hub.json`](https://github.com/offensiveadhd/reins/blob/main/integrations/hermes-desktop/hub.json), next to this file and in the npm package, says both:

```bash
npx --no -- reins-hub --config node_modules/@offensiveadhd/reins/integrations/hermes-desktop/hub.json
```

```json
{
  "policy": { "profile": "guarded", "actions": { "prompt.send": "confirm", "prompt.draft": "confirm" } },
  "surfaces": { "origins": ["file://"] }
}
```

The hub prints a warning about `file://`: it is true, see the first limit below. (What
this configuration decides for the plugin's actions is checked in
`packages/electron/test/hermes-plugin.test.ts`; the hub was not run with Hermes
connected.)

## Use (not run)

In the order you and the agent meet it. None of this was run in a live Hermes; every step
is run against the stand-in for Hermes's SDK in `packages/electron/test/hermes-plugin.test.ts`.

```bash
node "$HOME/.reins/reins.mjs" reins_attach '{"reason":"ask Hermes a question"}'
node "$HOME/.reins/reins.mjs" reins_act '{"action":"prompt.send","args":{"text":"Summarise the open pull requests"}}'
node "$HOME/.reins/reins.mjs" reins_act '{"action":"reply.read"}'    # repeat until "complete":true
```

1. **Connect.** `reins_attach` raises a card in the Hermes window. You are there for this
   one: read it, and decide about the box "Without asking each time: `prompt.send`".
   - Left unticked: Allow connects the agent, and every prompt will ask you.
   - Ticked: Allow shows what will run without asking; choose "For 15 minutes" or "Until
     this agent disconnects", and press "Allow with these".
2. **The first prompt.** `reins_act` with `prompt.send`. With the rule it goes to Hermes
   at once. Without it, a card shows the whole prompt.
3. **If you miss the card**, the agent's call does not fail with a refusal: it is told
   that the request waits in your window. You get the notification, find the request
   under "Waiting for your answer", press Review, read the prompt and press Allow. The
   agent calls `reins_act` again with the same arguments, and the prompt is sent. (The
   tool keeps the ticket; an agent on the SDK passes it as `tk`, or lets the SDK wait and
   repeat.)
4. **The reply.** `reins_act` with `reply.read`, until `complete` is true.
5. **After a while.** A fifteen-minute rule ends by itself, and the next prompt asks. And
   the sixth unasked prompt within ten minutes asks whatever the rule says.

With the MCP adapter registered, the same are the tools `reins_attach` and `reins_act`.
`reply.read` answers the session that sent the prompt: read with the same agent.

## Handing Hermes a whole task

A prompt has to fit on the card the person approves (about 1,900 characters), and a
reply holds 16 000. A task with a brief of several pages, and results longer than a
reply, still goes through, when both agents read the same disk:

1. The outer agent writes the brief to a file.
2. It sends a short prompt that points at it: read this file, write your results to
   that file, report back here when you are done. The card shows the two paths, which is
   what the person approves; the brief is theirs to open.
3. It reads the state `conversation` now and then (no prompt, under any level), and
   `reply.read` when Hermes is no longer working, until `complete` is true. `status`
   says whether the turn ended in `error` or was `interrupted`.
4. It reads the result file. The reply is the short report.

Three things to keep to, whatever does the handing over:

- **A person who said no is not asked another way.** `E_CONSENT` that comes back at
  once is a refusal: the task is not sent by some other route instead. In protocol 0.1
  a prompt nobody touched answers the same code when its time is up (60 s under the
  guarded profile), so a caller tells the two apart by how long the answer took.
- **A task that was sent is not sent again** because the reply is late. The grant can
  end before the reply is complete (Stop, a reload, its time), and the reply goes with
  it; what Hermes wrote to the result file stays.
- **The reply is page data.** The hub could not verify this page, and Hermes's answer
  is another agent's text: read it as tool output, not as instructions.

One caller that does all of this is the `desktop` route of a delegation script for
Claude Code (not part of this repository). It was run end to end against a stand-in for
Hermes: the built plugin of this folder in a browser page, a real hub with
[`hub.json`](https://github.com/offensiveadhd/reins/blob/main/integrations/hermes-desktop/hub.json), the shell tools, and a person's clicks on the real cards
(allowed, refused, and left to run out). It was then run once in a live Hermes Desktop
(see Status): the prompt and the attach allowed, the brief carried out, the result file
written and the final answer returned.

## Limits, and what is not known

- **`file://` on a socket.** A hub that admits `file://` admits every local HTML file
  opened in a Chromium browser, not only Hermes (docs/SECURITY.md, T57). Run that hub only
  while you use it. Adopting Hermes with `reins-electron` does not have this limit, and
  gives the agent every button in the window in exchange.
- **The hub is unverified to the page.** The plugin holds no surface key, so the prompt,
  the indicator, the panel's confirm step and the Chat tab say "Unverified hub", and
  every attach asks. A key in a plugin would be readable by every other plugin in the
  same page, so none is offered.
- **A plugin is not a boundary.** It runs in Hermes's own page with the app's authority,
  next to every other plugin. Reins protects the person from the agent; it does not
  protect Hermes from its plugins.
- **Seen in the one live run**: `host.composer.submit(null, text)` returned `true` with a
  chat in front; `host.state.focusedSessionId` stayed null although that chat answered,
  which is why `prompt.send` falls back to learning the session from the turn. **Not
  verified in a live Hermes**: the exact fields of the `message.*`
  events (the plugin reads `payload.text`, as the app's own handler does, and looks for
  the session id under `session_id`, `sessionId` and `payload.session_id`; an event that
  carries none is ignored); that the driver's indicator and panel sit well over Hermes's
  interface; that hot reload disposes the driver (`ctx.onDispose`). Read in the Hermes
  source of that install, and not run: `host.composer.submit(sessionId, text)` returns a
  boolean (`apps/desktop/src/sdk/composer.ts`); `host.state` has `focusedSessionId`,
  `busyBySession`, `busy`, `awaitingResponse`, `model` and `profile`
  (`apps/desktop/src/sdk/index.ts`); a gateway event is `{type, session_id, payload}`;
  `message.interim` seals the commentary beside a tool call, and `message.complete` ends
  the turn once, with its final text and a `status` of `complete`, `error` or
  `interrupted` (`tui_gateway/contracts/events.py`).
- **Also not verified in a live Hermes**: that Hermes Desktop grants its page the Web
  Notifications API (Electron does by default; an app can refuse it, and then the plugin
  stays silent), and what such a notification looks like on each system.
- **The waiting list needs a hub that speaks protocol 0.2**, which the hub of this
  package does. With an older hub a card nobody answers is refused after a minute, as
  before, and the connect card offers nothing.
- **The hub address is fixed** at `ws://127.0.0.1:7346` in `src/plugin.js`.
