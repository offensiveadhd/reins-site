# Adopt an Electron app

> reins-electron loads the driver into an Electron app you did not build, through its debugging connection. What an attached agent can then do, how to narrow it, and what a debugging connection means.

## What adopting is

`reins-electron` loads the driver into an Electron app from the outside, through the app's debugging connection. Nothing in the app is changed on disk.

```bash
# in the project that has the package
npx --no -- reins-electron -- "C:\Path\To\TheApp.exe"
```

From then on the app is a surface like any other. In another terminal, or from an agent:

```bash
node "$HOME/.reins/reins.mjs" reins_attach '{"reason":"tidy my notes"}'   # the app's window asks you
node "$HOME/.reins/reins.mjs" reins_observe
node "$HOME/.reins/reins.mjs" reins_ui '{"op":"type","target":"#note.input","text":"Water the plants"}'
node "$HOME/.reins/reins.mjs" reins_read '{"target":"#notes.list"}'
```

## Read this first

> [!WARNING]
> **What an attached agent can do in an adopted app is everything a person can do with the mouse and the keyboard in that window.** The app declared no actions, so the agent works through the UI tree: it sees every control the page exposes and can press, fill and scroll any of them. One Allow at attach covers all of it. There is no second question for "Send", "Delete" or "Approve", because to Reins those are buttons like any other. If the app is itself an agent that asks its user before it runs a tool, the attached agent can press that approval too.

Adopt an app for an agent only when that is what you mean, and narrow it when it is not: `--scopes observe,chat` adopts an app to look at and talk about, not to operate.

> [!WARNING]
> **A debugging connection is total control.** The driver's guardrails stand between the agent and the app. They do not stand between the app and the program that loaded the driver, which can do everything a person at the keyboard can: press Allow, open the panel, raise a level, switch a scope on, type in the chat as the person. Adopt only apps you would let `reins-electron` control, and use the pipe: a debugging port extends that control to every program on the machine.

## What the command does

This is the output of a run against the example app started as a foreign app, with no Reins in it. Run (`adopt-pipe`):

```
reins-electron: started electron.exe with a debugging pipe (no port is open)
reins-electron: debugging connection open (Chrome/156.0.8078.100)
reins-electron: waiting for the app's first page, to learn its origin
reins-electron: levels the person may set in the panel: strict, ask (--levels offers auto and bypass)
reins-electron: page: origin app://notes
reins-electron: adopting; the app ends when this command ends
reins-electron: hub listening on ws://127.0.0.1:7346/ for agents (profile guarded)
reins-electron: adopting pages of: app://notes
reins-electron: the hub lists these pages as verified: this command alone holds the debugging pipe
reins-electron: token file: C:\...\.reins\token (agent kid "default", created)
reins-electron: agent launcher: node "C:\Users\you\.reins\reins.mjs" <tool>
reins-electron: page app://notes: ready
```

1. It starts the app with `--remote-debugging-pipe`. The DevTools protocol then runs over two inherited pipes. No port is opened, and no other program can connect.
2. It hosts a hub (`--port`, default 7346) whose socket takes agents only, creates the agent token, announces the hub in `~/.reins` and leaves the launcher there, exactly as `reins-hub` does.
3. For every page of the app, now and later, it runs the driver in each new document, in a JavaScript world of its own. A reload, a navigation and a new window are picked up as they happen. Run (`adopt-pipe`).
4. It carries the driver's frames between the page and the hosted hub over the debugging connection. The page opens no socket, so its Content Security Policy does not matter. Run (`adopt-pipe`) with `connect-src 'none'`.

The command prints the origin of each page it adopts or declines, never a URL: paths and queries are where tokens travel.

## What an agent has there

| Tool | In an adopted app |
|---|---|
| `reins_observe` | the controls of the page as a tree |
| `reins_read` | the text between them: a paragraph, a message, a whole region, or the page |
| `reins_ui` | clicks, typing, selection, scrolling and keys on every exposed element |
| `reins_cursor`, `reins_show` | the agent's cursor, toasts and highlights |
| `reins_chat` | the Chat tab, to talk with the person (section 5) |
| `reins_act` | nothing to call: the app declared no actions |

The person is asked in the app's own window before an agent attaches, sees the indicator while it is attached, and can pause or stop it, open the panel, switch single scopes off and talk to the agent.

With the hub that `reins-electron` hosts, the app's own scripts cannot reach the driver or stand in for it: the driver runs in an isolated world with built-ins of its own, and the page's script shares the document with it (elements, styles, timers) and none of its code or objects. Run (`adopt-pipe`). This does not hold when the pages join a hub elsewhere without a surface key: see below.

That isolated world is the one place where Reins has a boundary against script in the page itself. In a page that embeds the driver, such script can defeat the overlay ([What script in the page can do](../concepts/human-control.md#what-script-in-the-page-can-do)). In an adopted app it cannot answer a prompt or raise a level. What it can still do: style, cover, move or remove the overlay's host element, clear timers (no wait of the driver relies on one firing), and keep the person's clicks and keys from reaching the overlay at all, which takes Pause, Stop and Deny away for as long as the script does it.

## Verified, or not

A surface is listed as `verified` when the hub knows what is at the other end of its link, and a page shows no "Unverified hub" mark when it knows its hub. For an adopted page both depend on one thing: who else can use the debugging connection.

| The app is reached through | The hub that `reins-electron` hosts lists the page as | The page's prompt and indicator |
|---|---|---|
| the debugging pipe (the default) | verified | no mark |
| a debugging port (`--debug-port`, `--attach`) | **not** verified | say "Unverified hub" |

A pipe belongs to the command alone. Through a port, every program on the machine can type and press in the app and speak on the page's link, so the command vouches for nothing. `reins_surfaces` shows the difference, a consent prompt names it, and `chat-serve` refuses a page that is not verified unless it is started with `--allow-unverified`. Run (`adopt-pipe`: verified; `adopt-port`: not verified, and the prompt and the indicator say so). `--surface-key-file` is refused together with a debugging port: the key could be read out of the page through it.

## Options

| Option | Meaning |
|---|---|
| `-- <executable> [arguments]` | start this app, with `--remote-debugging-pipe` put before its arguments |
| `--debug-port <n>` | start it with `--remote-debugging-port=<n>` instead of the pipe. The app is then whatever browser answers on that port, also when the executable was only a starter; its pages are not verified |
| `--attach <port \| host:port \| ws url>` | adopt an app that is already running with a debugging port; loopback only |
| `--port <n>`, `--token-file <path>`, `--no-announce` | the hosted hub, as for `reins-hub` |
| `--allow-origin <origin>` | page origins to adopt, repeatable. Default: the origin the app's first pages share (below) |
| `--levels <a,b>` | permission levels the person may set in the panel beyond Strict and Ask: `auto`, `bypass`. Default none (section 4) |
| `--scopes <a,b,c>` | scopes an agent may be granted. Default all of the guarded profile |
| `--hub <ws url>` | do not host a hub; connect the pages to one that is running, on a loopback address |
| `--transport auto\|ws\|bridge` | with `--hub`: who opens the socket (below) |
| `--surface-key-file <path>` | with `--hub`: the key that hub holds for `--app-id`. Refused with a debugging port: the key could be read out of the page through it |
| `--app-id <id>`, `--app-name <name>` | how the surface names itself. Default: from the executable's name |
| `--match <origin \| url>` | adopt only documents of this origin (`http://127.0.0.1:9120`, `app://notes`), or whose URL is this one or lies under it (`file:///C:/app/`). Asked of every document: a tab that goes elsewhere is not adopted there |

**Which origin, when you name none.** Without `--allow-origin` the command takes the origin from the app's own pages, and only when there is no doubt. From the first page on it listens for a second; if every page that asked in that time has the same origin, that is the one. If they have more than one, it stops, lists what it saw, and asks for `--allow-origin`. Two origins are never taken from a page and always have to be named: `null`, and that of a web site that is not on this machine. This rule is covered by unit tests and was not seen in a real Electron.

**`--match` is an origin or a URL, not a piece of text.** `--match http://127.0.0.1:9120` adopts the documents of that origin, and `--match file:///C:/app/` that folder and what lies under it. Pattern and document are both read as URLs and compared by origin and path; query and fragment take no part, so a document elsewhere does not match because its address repeats the text. A pattern that is neither an origin nor a URL is refused at start.

```text
usage: reins-electron [options] -- <electron app executable> [its arguments...]
       reins-electron [options] --attach <port | host:port | ws url>

Loads the Reins driver into the pages of an Electron app that was not built for Reins,
through the app's debugging connection. An agent can then attach to it under the guarded
profile: the person is asked in the app's window first, and sees and can stop the agent.

Whoever holds a debugging connection controls the app completely. Use this with apps you
would let this program control, and read docs/ELECTRON.md before using --debug-port.

launch (the default): the app is started with --remote-debugging-pipe, so no port is
opened, nobody else can use the debugging connection, and the app ends when this
command ends, however it ends
  --debug-port <n>        start it with --remote-debugging-port=<n> instead: a loopback
                          port that any program on this machine can connect to. The
                          app is whatever browser answers on that port, also when the
                          executable was only a starter; this command closes it over
                          the port when it ends, and a small watcher process does when
                          the command is killed

attach
  --attach <where>        an app already started with --remote-debugging-port=<n>;
                          only a loopback address is accepted

With a debugging port (--debug-port, --attach) other programs can use the debugging
connection too, type and press in the app, and speak to its pages. Pages adopted that
way are therefore never listed as verified, and their prompts say "Unverified hub".

the hub (by default one is hosted here; the pages reach it through the debugging
connection, and its socket takes agents only)
  --port <n>              port of the hosted hub (default 7346)
  --token-file <path>     its agent token (default .reins/token)
  --allow-origin <origin> page origin to adopt, repeatable (default: the origin of the
                          first page the app shows, such as file://)
  --no-announce           do not announce the hub or leave the launcher in ~/.reins
  --hub <ws url>          use a hub that is already running instead, on a loopback
                          address; it has to admit the app's origin. Without
                          --surface-key-file the pages cannot tell that hub from
                          another program, and the app's own scripts can register
                          there under the same origin
  --transport <how>       with --hub: auto (default: the page opens the socket, and the
                          debugging connection carries the frames when it may not),
                          ws, or bridge
  --surface-key-file <p>  with --hub: the surface key that hub holds for --app-id.
                          Not with a debugging port: the key would be readable
                          through it

what an agent may be given (the pages run under the guarded profile)
  --levels <a,b>          permission levels the person may set in the panel beyond
                          Strict and Ask, which only tighten: auto, bypass (default
                          none; a level decides declared actions, and an adopted app
                          declares none)
  --scopes <a,b,c>        scopes an agent may be granted (default observe, act, ui, cursor, show, nav, chat)

the app
  --app-id <id>           id the surface gives itself (default: from the executable's name)
  --app-name <name>       name shown to agents and in the prompt card
  --match <origin|url>    adopt only documents of this origin (http://127.0.0.1:9120,
                          app://notes), or whose URL is this one or lies under it
                          (file:///C:/app/). Both sides are read as URLs; query and
                          fragment are left out. Not a substring: a document elsewhere
                          that repeats the text does not match
  --bundle <path>         the page bundle (default: reins-adopt.iife.js of this package)
```

## The panel in an adopted app

The adopted page has the same indicator and the same panel. **By default the panel of an adopted app offers Strict and Ask, and neither Auto nor Bypass.**

A level decides one thing: whether an action the app declared asks the person first. An adopted app declares no actions, so Auto or Bypass would let an agent do nothing it cannot do at Ask, and a red "Bypass" in the indicator would tell the person that something was unlocked when nothing was. The person who starts `reins-electron` decides: `--levels` lists what the panel offers beyond those two. Run (`adopt-levels`).

What the panel is for in an adopted app is the rest of it:

- **Scope switches.** Switch `ui` off and the agent can look, read and talk, and can no longer click or type. Run (`adopt-pipe`): with `ui` off, `reins_ui` answers `E_SCOPE`; switched back on, it works.
- **Disconnect** ends one agent's grant and leaves the others.
- **Activity** shows what each agent did, without arguments or page text.
- **Chat.** In an adopted app, chat is how the person steers: the app has no actions to name, so "add a note about milk" in the chat, carried out with `reins_observe`, `reins_ui` and `reins_read`, is the whole interface.

Both flags only ever narrow or label: the guarded profile, the consent prompt at attach, and Pause and Stop are not negotiable from the command line. See [Permission levels](../concepts/permission-levels.md).

## The app ends with the command, and the driver lives no longer than it

- **With the pipe**, an app that `reins-electron` started ends when the command ends, however it ends: Chromium exits when its debugging pipe closes. Run (`lifetime`).
- **With `--debug-port`** there is no such tie, and the process the command started need not be the app: it may be a starter that exits, and an app may start itself again. So the command goes by the port. When it ends, it closes the browser that answers there over the port, asks the port again, and says so in capitals and ends with 1 if something still answers. For a command that is killed, a small watcher process does the same. Neither ends a process by its id. Before it starts the app, the command checks that nothing answers on that port yet. Run (`lifetime`). Not covered: the watcher itself being killed in the seconds it needs, and an app that is asked to close and stays (the command then tells you). With the pipe neither can happen.
- **An app it attached to** (`--attach`) is left running, and the driver is taken out of it. On Ctrl+C the command tells every document to disconnect for good, whatever carries its frames. Run (`adopt-stop`): the surface is gone at once and does not come back.
- **A command that is killed** cannot say goodbye. Every document therefore holds a lease: the command renews it every 2 s, and a document that has not heard it for 10 s hands its driver no frame and sends none for it, asks the command once, and stops the driver for good when 5 s more pass without an answer. That is decided by the clock at the moment a frame arrives or is to leave, so it holds whether or not any timer fires: a script of the page can clear every timer of its document, the driver's world included. Run (`adopt-stop`): after a kill the page leaves the hub within the lease, also after a script in the page's own world cleared every timer id. What is not promised is the 15 s when a page keeps its own thread busy without pause.

## A debugging port

```bash
"C:\Path\To\TheApp.exe" --remote-debugging-port=9222      # started by you, or by its own launcher
npx --no -- reins-electron --attach 9222
```

Run (`adopt-port`). Use this when you cannot start the app yourself. Know what it is: for as long as the app runs, any program on the machine that can open `127.0.0.1:9222` controls the app completely. It can read every page, run any script, press the Allow button of a Reins prompt, raise a permission level in the panel and type in the chat as you, because input sent through that port is real input to the page. `reins-electron` refuses a debugging port that is not on a loopback address, but it cannot make a loopback port private. Prefer the pipe.

That is why a page adopted through a port, with `--attach` or with `--debug-port`, is never called verified: its prompts and its indicator say "Unverified hub", the hub lists it as unverified, and `chat-serve` will not serve its chat unless you pass `--allow-unverified` and so accept that "the person" there may be any local program.

## Joining a hub that is already running

```bash
npx --no -- reins-hub --profile guarded --allow-origin app://notes --surface-key notes-app=.reins/notes-app.key --require-key
npx --no -- reins-electron --hub ws://127.0.0.1:7346 --app-id notes-app --surface-key-file .reins/notes-app.key -- "C:\Path\To\TheApp.exe"
```

The pages then connect to that hub as ordinary surfaces, next to your browser tabs, and it has to admit their origin. The hub has to be on a loopback address; any other is refused before anything is dialled. The key goes with the pipe only: with `--attach` or `--debug-port` the command refuses `--surface-key-file`, and the pages stay unverified. Where the page's Content Security Policy forbids the connection, `reins-electron` opens the socket instead, states the page's origin itself, and carries the frames over the debugging connection. Run (`adopt-hub`, `adopt-hub-open`) both ways, without a surface key.

**Join a hub with a surface key, as above.** Without one, two things are true, and the command warns at start (run, `adopt-hub`):

- The page cannot tell that hub from another program on its port, so the prompt and the indicator say "Unverified hub".
- The hub admits by origin alone, and the app's own scripts have the same origin as the page. A script of the app, or anything injected into it, can open a socket to that hub and register as the same app, next to the real driver or in place of it.

Joining with a key was not run.

## Apps that refuse, and other trouble

An app that is already running usually keeps a single instance: quit it first, the tray icon included. Some installers leave a small starter that is not the app: with the pipe, name the real executable, because a starter does not pass the pipe on; with `--debug-port` a starter that passes its arguments on works, at the price of a port. No Electron fuse turns the debugging switches off, but an app can refuse in its own code. [Section 3 of the guide](../reference/electron-guide.md#apps-that-refuse) lists each case, and its [troubleshooting table](../reference/electron-guide.md#9-troubleshooting) says what each message of the command means.

Not tested: store builds that run in an OS sandbox, macOS, Linux.

## Further reading

- [The Electron guide, section 3](../reference/electron-guide.md#3-adopt-an-app-you-did-not-build) and its [security notes](../reference/electron-guide.md#8-security-notes).
- [Claude and Hermes](./claude-and-hermes.md): adopting an app that is itself an agent, and the plugin that avoids it.
- [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against): "Whoever holds an app's debugging connection" and "An agent with `ui` in an adopted app".
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T60 to T65, and T75 for the timers of an adopted page.
