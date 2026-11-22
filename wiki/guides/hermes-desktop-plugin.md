# Reins for Hermes Desktop

> A Hermes Desktop plugin that makes the Hermes window a surface with three named actions. Built and statically checked, not run in Hermes. Rendered from integrations/hermes-desktop/README.md.

A desktop plugin for Hermes Agent (Nous Research) that makes the Hermes Desktop window a
Reins surface with declared actions. An agent outside Hermes, Claude Code for one, can
then send Hermes a prompt and read the reply, with the Reins consent prompt, indicator,
panel, Pause and Stop in the Hermes window.

**Status: built and statically checked, not run in Hermes.** The plugin builds, and its
own source runs in the repository's tests against a stand-in for Hermes's SDK
(`packages/electron/test/hermes-plugin.test.ts`). The built file passed the import
scanner of Hermes's own plugin loader (`apps/desktop/src/contrib/runtime-loader.ts`)
when that was run over it by hand, outside Hermes. It has not been installed, loaded or
used in a live Hermes Desktop. It was written from the Desktop plugin SDK documentation
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
| action `prompt.send {text}` | dangerous | Sends `text` in Hermes's conversation in front, through `host.composer.submit(null, text)`: the same as typing and pressing Enter. You are asked each time and shown the whole prompt. Refused with `E_BUSY` while Hermes is in the middle of a turn there, with `E_NO_TARGET` when Hermes does not say which conversation is in front, and with `E_INTERNAL` when this Hermes gives no sign of whether a turn is under way. |
| action `prompt.draft {text}` | dangerous | Puts `text` in Hermes's message box and sends nothing (`host.composer.setDraft`). You are asked each time as well: the words are then one Enter away from Hermes, in your name. |
| action `reply.read` | safe | Hermes's reply to the caller's own last `prompt.send`: `{ session, text, complete, truncated, at }`. An agent that did not send the prompt gets an empty reply. |
| state `conversation` | | `{ session, busy, awaitingResponse, model }` of Hermes's conversation in front. |

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
  `message.start`, `message.delta`, `message.complete` and `message.error`, at most
  16 000 characters, and only from events that name the session the prompt went to. An
  event without a session id, or from a conversation in the background, is not taken for
  the answer. And because the reply is whatever Hermes says next in that conversation,
  `prompt.send` is refused while Hermes is in the middle of a turn there
  (`host.state.busyBySession`, `host.state.busy`, `host.state.awaitingResponse`), and
  also when this Hermes offers none of those signs: otherwise the end of an answer to
  your own message could be read as the answer to the agent's prompt.
- **No prompt you could not read.** A prompt is approved on a card that shows all of it,
  or it is not sent. See below for the limit.
- **No way to act without you, unless you say so.** See the next section.

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
it in red. It lasts until that agent disconnects or you set it back.

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

```bash
node "$HOME/.reins/reins.mjs" reins_attach '{"reason":"ask Hermes a question"}'    # Hermes asks you: allow
node "$HOME/.reins/reins.mjs" reins_act '{"action":"prompt.send","args":{"text":"Summarise the open pull requests"}}'    # asks again
node "$HOME/.reins/reins.mjs" reins_act '{"action":"reply.read"}'    # repeat until "complete":true
```

With the MCP adapter registered, the same are the tools `reins_attach` and `reins_act`.
`reply.read` answers the session that sent the prompt: read with the same agent.

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
- **Not verified in a live Hermes**: that `host.composer.submit(null, text)` returns
  `true` when a conversation is in front; that `host.state.focusedSessionId` names it at
  that moment (without it `prompt.send` refuses); the exact fields of the `message.*`
  events (the plugin reads `payload.text`, as the app's own handler does, and looks for
  the session id under `session_id`, `sessionId` and `payload.session_id`; an event that
  carries none is ignored); that the driver's indicator and panel sit well over Hermes's
  interface; that hot reload disposes the driver (`ctx.onDispose`).
- **The hub address is fixed** at `ws://127.0.0.1:7346` in `src/plugin.js`.
