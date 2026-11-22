# Troubleshooting

> Every error code of the protocol with what causes it and what to do, and the problems that show up before any code does.

Every refusal in Reins carries a code and a short message. The codes are a closed list: [Error codes](../reference/error-codes.md) has the table. This page says, for each one, what usually causes it and what to do. A receiver reads an unknown code in a response as `E_INTERNAL` and in a `bye` as `E_GONE`.

## Before any code: setup problems

### The MCP tools are listed, and every call fails with E_AUTH

The registration holds a relative path. The harness starts the adapter in whatever folder the session is in, and from there a relative `.reins/token` is not found. Register with full paths, or register the launcher, which needs none:

```bash
claude mcp add --scope user reins node "$HOME/.reins/reins.mjs" mcp
```

See [Use it from Claude Code and other MCP harnesses](../start/mcp.md).

### A session has no Reins tools at all

Either it was running before you registered the adapter (start a new agent session: one that is already running does not get the tools), or the adapter was registered without `--scope user` and the session was opened in another folder.

### npx offers to install a package called reins-mcp

Reins is not on the npm registry, and `reins-mcp` there is the name of an unrelated package. In a folder that does not have Reins, a plain `npx reins-mcp` offers to install that package instead, and installs it without asking when there is no terminal. Always run the commands as `npx --no -- <command>` in the project that installed the package: with `--no`, npx runs what is installed or stops.

### unknown option '--no' in PowerShell

When `claude` was installed with npm, PowerShell drops a bare `--`. Quote it: `'--'`. The Windows form of the registration command is in [the MCP page](../start/mcp.md#without-the-launcher).

### The arguments are not valid JSON, in Windows PowerShell

Windows PowerShell (5.1, and PowerShell before 7.3) removes the double quotes inside an argument. Pipe the JSON and pass `-` in its place:

```powershell
'{"action":"cart.add"}' | node "$HOME/.reins/reins.mjs" reins_act -
```

### There is no launcher at ~/.reins/reins.mjs

A hub writes it when it starts, and so does `npx --no -- reins-tools setup` in a project that has the package. A hub started with `--no-announce` writes none.

### The hub does not start

- `profile guarded needs at least one --allow-origin <origin>`: only the `open` profile has default origins. Name the origin of your page.
- `invalid configuration ...`: the configuration file has a field of the wrong type, a key shorter than 32 characters, or a limit that is not a positive number.
- A secret file is refused: on POSIX the hub refuses an existing token, key or audit file if group or others have any permission on it. Restrict the file to your account. A failure to restrict a secret stops the hub.
- The audit log is refused: its chain or its head does not verify, a line is longer than 1 MiB, or the last line is incomplete. The hub does not continue a log it cannot vouch for.

### The page stays offline

The driver reports a blocked or refused connection as `offline` and keeps retrying with backoff. Check, in this order: that a hub is running on the port the page dials; that the hub admits the page's origin (`--allow-origin`); that your Content Security Policy allows the WebSocket in `connect-src`; and that the browser lets the page reach loopback. A page served from a public `https:` origin may need a permission in Chrome and Edge, and Safari has historically blocked it: see [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback).

### A level, a rule or a scope switch is gone

What lets an agent do more lasts for one grant: Auto, Bypass, an Allow rule, a remembered approval and "Agents can hear each other" are gone when the agent detaches and attaches again. Set them again. What the person tightened (Strict, the rules Ask and Block, scopes switched off) stays with that agent for as long as the page is open; a reload of the page ends those too.

### An agent is still held back after it attached again

That is meant. Strict, the person's Ask and Block rules and the scopes they switched off stay with an agent across grants, whatever session id or name it comes back under, until the person lifts them in the panel. The attach result carries `kept`, and `grant.scopes` lists the scopes in force. Where the page cannot tell agents apart (no credential id from the hub, or an unverified hub), what was tightened for one agent is put on every later grant, and such an attach asks the person even under `attach: allow`.

### Enter or Space does not answer a prompt

That is meant, for a moment. A prompt takes the focus, and keys that could be typing meant for the page answer nothing: a key answers only as Enter or Space on a button of the prompt that has the focus, or as Escape, at least 500 ms after the prompt appeared, after the focus landed on that button and after any other key, and at least 3 s after the last key that types. While that lock runs the card says "Keys do not answer this request right now, because something was just typed." Use the pointer, or Tab to the button, let the focus rest there, and press Enter. See [Consent](../concepts/consent.md#what-keeps-prompts-honest).

### Allow does nothing on a tall card

A card taller than the window says "Scroll to the end to review everything before allowing." Allow, "Always allow" and its second step wait until the card was scrolled to its end.

### Attach and every command that changes the page answer E_PAUSED on a page that uses zoom

A page that puts `zoom` on `html` or `body` fails the driver's check that its overlay is drawn where the person can see and use it, for as long as it does. Reading still works; nothing else does. Reins does not drive such a page. See [Human control](../concepts/human-control.md#the-indicator-has-to-stay-visible-and-usable).

### A tool option is refused on a running session

A shell session takes `--scopes`, `--kid`, `--token-file`, `--data-dir` and `--name` when it starts. A later command that names another value is refused with `E_BAD_ARGS`, and the message says what the session has. End the session with `stop` and start it again with the new value.

### chat-serve refuses the command

`chat-serve` settles which file `--exec` names before it takes a message. A bare name is looked for in the folders of `PATH`, never in the working directory: write a path (`./agent`, `.\agent.exe`) for a file there. A `.cmd`, `.bat` or `.ps1` script needs a shell, and the runner uses none: name the program it wraps. On Windows a run is held in a job object made by a Windows PowerShell helper; where that helper cannot run, `chat-serve` starts no command at all and says why.

### The panel offers no Auto or Bypass

`auto` and `bypass` are on offer only where the page's policy and the hub's policy both list them in `human.levels`. The kiosk profile offers neither and has no panel. The panel of an app adopted with `reins-electron` offers them only when the command was started with `--levels`.

### One agent does not hear the other in the chat

Under the `guarded` profile agents hear each other only after the person switches "Agents can hear each other" on in the Chat tab, and an agent that attached later has to be added there. A `chat.say` to another agent answers `E_DENIED` until then. See [Chat](../concepts/chat.md).

### chat-serve refuses to serve the page

The page did not prove a surface key to the hub, so any program on the computer that can reach the hub's port could be that page and write as its person. Give the app a [surface key](./surface-keys.md), or read what `--allow-unverified` accepts in [Serve chat from any command-line agent](./chat-serve.md) before you pass it.

### Something about an Electron window

The Electron guide has a table of its own, from a missing preload to an app that does not answer on its debugging connection: see [Troubleshooting](../reference/electron-guide.md#9-troubleshooting) there. Two that come up often: a page adopted through a debugging port (`--attach`, `--debug-port`) always shows "Unverified hub" and is listed as unverified, so `chat-serve` needs `--allow-unverified` there; and the Hermes plugin's `prompt.send` answers `E_DENIED` behind a hub that runs the plain guarded profile, which refuses dangerous actions: start the hub with the plugin's `hub.json`.

### createDriver throws under the kiosk profile

The kiosk profile has nobody to ask, so the driver must be able to verify the hub: pass `key`, the surface key. See [Surface keys](./surface-keys.md).

## The connection

### E_BAD_FRAME

A malformed frame, an unknown frame type, or a frame out of place: not valid JSON, an unknown `t`, a missing field, or something other than `hello` as the first frame.

**What to do.** This is a bug in whatever built the frame. If you are writing an implementation, check the frame against `protocol.ts` and decode it with the test vectors. A peer speaking another subprotocol, or plain HTTP, never gets this far: the hub requires `reins.v1`.

### E_VERSION

No protocol version in common. `challenge.v` lists what the hub speaks, and the peer has to pick one of them.

**What to do.** Update the older side. This build speaks protocol 0.2 and 0.1: a hub lists both in `challenge.v`, newest first, and a peer that speaks only 0.1 still connects. `E_VERSION` comes from a peer that speaks neither, from a `hello.v` the hub did not list, or from a hub whose `versions` configuration was narrowed to one. See [Protocol versions](../reference/protocol-versions.md).

### E_AUTH

A missing or wrong proof, an unknown `kid`, a surface key that is required and was not proved, or a key confirmation that failed.

**What to do.**

- For an agent: check where the key comes from. The SDK looks in `options.key`, `REINS_TOKEN`, the file named by `REINS_TOKEN_FILE`, the token file the running hub announced, then `.reins/token` in the working directory. An old token file from another hub is the usual cause.
- For a page: "surface key required" means the hub holds a key for the app id the page claims, or runs with `--require-key`. Give the driver the same key.
- Failed proofs are answered slower each time, up to 3 s. A correct proof is never delayed.

### E_ORIGIN

The connection's origin is not allowed for its role. A surface's origin is not on the hub's allowlist, `hello.surface.url` has another origin, an agent connected from a browser page whose origin is not listed on its credential, or a surface tried a socket that takes agents only (`--no-surface-sockets`).

**What to do.** Start the hub with `--allow-origin` naming the page's exact origin: scheme, host and port. `http://localhost:5173` and `http://127.0.0.1:5173` are different origins. For an agent that runs in a page, list the page's origin in the credential's `origins`. A page loaded from a file has the origin `file://`, and one on an app's own scheme `app://name`: `*` does not cover either, and each has to be named. See [Electron: build Reins into your app](./electron.md#what-origin-your-page-has).

### E_TOO_LARGE

A frame, a manifest, a result or a set of consent arguments over its limit: a text frame over 256 KiB, a manifest over 64 KiB, an action result over 32 KiB, or arguments too large to show on a consent card (more than 40 entries, nesting deeper than 4, or 2000 code points).

**What to do.** Send less. Return a summary from an action, not a dataset. Give sensitive actions few and plain arguments. Send bulk data to a view with `show.view`.

### E_TIMEOUT

The other side did not answer in time: 15 s for an ordinary request by default.

**What to do.** A prompt nobody answers ends inside the hub's wait (`E_CONSENT`, or `E_WAITING` where the request can wait), so `E_TIMEOUT` on `surface.attach` or `act` means the page itself did not answer: it did not run at all for that long, or its link is gone. Ask the person to bring the page to the front, then ask again. The hub withdraws an attach it stopped waiting for; an action whose prompt comes up late can still be approved and run, so before repeating an action that is not safe to run twice, observe whether it ran. On other requests, the page is probably busy or in a background tab.

### E_GONE

The other side disconnected: the page was closed, reloaded or navigated while a request was pending.

**What to do.** List the surfaces again and attach again. A navigation that reloads the page ends the surface session, and the new page is a new surface with a new id.

## The grant

### E_NO_SURFACE

No such surface id, or a surface the credential may not attach to. The two cases get exactly the same answer, so an agent cannot probe for surfaces it is not meant to see.

**What to do.** Call `surfaces.list` and use an id from the answer. Surface ids change when a page reconnects. If the page is missing from the list, it is not connected to this hub, or the credential's `surfaces` restriction excludes its origin.

### E_NOT_ATTACHED

No live grant for this surface. The agent never attached, the person pressed Stop, the grant expired or went idle, or the page reloaded.

**What to do.** Attach again. With the MCP adapter and the shell tools, call `reins_attach`: it is the only tool that attaches. After Stop, the page asks the person before any new attach until it is reloaded.

### E_SCOPE

The grant lacks the method's scope, the person switched that scope off, or no requested scope is permitted.

**What to do.** Read the scopes in force (`grant.scopes`; the MCP adapter tells them in a notice). The scope was cut by the credential's cap, the hub's policy or the page's policy, or the person switched it off in the panel: only they can switch it back on. The kiosk profile has no `ui`, no `nav` and no `chat`: use the app's actions there.

## Policy and the person

### E_DENIED

Policy says no. An action whose risk tier or override is `deny`, at the page or at the hub, an attach under `attach: deny`, synthetic input aimed at a private field, a navigation outside `policy.nav` or on a page that is not `http(s)`, raw coordinates or a pointer stream where `policy.coordinates` is off, a `chat.say` to another agent while no agent hears the speaker, a manifest that does not match its pin, or a driver that was asked to connect inside a frame. No level the person sets relaxes a `deny`.

**What to do.** Do not retry: the answer will not change. Tell the person what could not be done. If you own the app and the denial is wrong, change the action's risk tier or the policy.

### E_CONSENT

The person refused or blocked the action; a prompt nobody answered where the request could not wait (a kiosk, an app's own consent handler, an agent on protocol 0.1, a full waiting list); or a request that waited and was refused, discarded or left to lapse. With the SDK's default `wait`, a refusal of a request that waited also ends as `E_CONSENT`.

**What to do.** Do not ask again at once: the same request is answered `E_RATE` during a cool-off, and three explicit refusals in a row revoke the grant. Say what you wanted to do and why, and let the person decide. When the answer came with no prompt ("the user blocked this action"), the person set the rule Block for that action in the panel: retrying changes nothing.

### E_WAITING

(0.2) The person has not answered yet: nobody answered the prompt in time, or they pressed "Later", and the request waits in their window for up to ten minutes with a ticket (`data: {tk, ms}`). Nothing ran.

**What to do.** Wait for the person. The SDK does that by default and repeats the request with its ticket once it is allowed; with the MCP tools, call again with `wait`; with the `reins` command, it waits unless told `--no-wait`. Do not ask the person for the approval in the chat: a message there approves nothing, the card does. If you are told `expired` or `deny`, say what you wanted and let the person decide. An agent on protocol 0.1 never sees this code: its requests cannot wait. See [Requests that wait](../concepts/waiting-requests.md).

### E_PAUSED

Control is paused, the indicator cannot be shown, or the person is using the page.

**What to do.** Wait. Reading still works while control is paused (`observe`, `read`, `state.get`). For `ui.*` commands the cause can be the person typing or clicking: the command waits for a quiet moment and gives up after 5 s. Subscribe to `user` events to learn when the person resumes.

## Limits

### E_RATE

A rate or admission limit, or a consent cool-off: too many requests per second in one scope, more than 3 attaches in a burst, pointer points over `pointerRate`, or a request made during the cool-off after a refused prompt.

**What to do.** Slow down and retry after a pause. After a refusal the cool-off is 2 s and doubles with each further refusal, up to 60 s. A `stream.close` answered with `E_RATE` tells you that the hub had already closed that stream for going over its rate or its credit.

### E_BUSY

A capacity, a pending attach or consent prompt, a permission that changed while the request waited, or a peer that does not read: another attach by the same credential is in flight, a consent prompt is showing or queued on the page, the page already holds 32 grants, the hub is full (64 surfaces, 32 agents, 4 sessions per credential, 8 streams per agent), 16 handshakes are already pending, or the hub already keeps 3 tickets of this session on this surface or 16 in all, so a request that waited gets `E_BUSY` instead of a ticket.

**What to do.** Wait for the prompt to be answered, then retry. `chat.say` and `chat.status` answer `E_BUSY` while a prompt is up as well: nothing talks over a decision. An action that used to run without asking and now answers `E_BUSY` may ask when you send it again: the person tightened something meanwhile. If sessions are the problem, close the ones you do not use: a shell session ends with `stop`.

## The request

### E_UNKNOWN_METHOD

The method does not exist. An unknown method is answered before any parameter is checked.

**What to do.** Check the name against [Methods](../reference/methods.md). A method from a newer protocol version is unknown to an older peer.

### E_BAD_ARGS

Params fail validation: an unknown action, arguments that fail the action's schema (the message names the failing path), a property that was not declared, a target that takes no text, a label over 40 characters, params nested too deeply, or a `tk` that is not a ticket the hub keeps for this session, this surface and this request (unknown, used, lapsed, another agent's, or for another action: the message is the same for all of them).

**What to do.** Read the message, then the prompt card: it gives every action's signature. A model that gets `E_BAD_ARGS` can usually correct itself.

### E_NO_TARGET

The target is not a live, exposed, enabled element, or is read-only: an unknown handle, an element that left the page, one that is hidden or not exposed, a disabled control, or a read-only field.

**What to do.** Observe again and use a handle from the new tree. Prefer semantic ids (`#cart.checkout`) to handles. Under the kiosk profile only annotated elements exist.

### E_INTERNAL

An unexpected failure: an action handler threw, a result is not JSON, the audit log is unavailable, or a surface answered `E_WAITING` without a well-formed ticket and time, or on a method that cannot wait. The message never carries internals.

**What to do.** Look at the page's console and the hub's output. If audited requests and attach all fail with `E_INTERNAL` while reads work, the hub cannot write its audit log and is failing closed on purpose: fix the log. If you own the handler, throw a `ReinsError` for refusals that are the agent's to fix.

## Still stuck

Watch the frames. The [playground](../../playground.html) shows every frame of a working session, which is a good reference for what a request and its answer look like. For a suspected vulnerability, do not open a public issue: see [Reporting a vulnerability](../community/vulnerability-disclosure.md).
