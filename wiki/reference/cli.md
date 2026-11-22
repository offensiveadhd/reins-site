# CLI: reins-hub, reins, reins-mcp, reins-tools, reins-electron

> The commands the package installs, with the help text each prints. The hub, the agent command, the MCP adapter, the shell tools and the command that adopts an Electron app.

## Running them

The package installs 5 commands. Run them as `npx --no -- <command>` in the project that installed the package:

```bash
npx --no -- reins-hub --profile guarded --allow-origin http://localhost:5173
```

The package is not on the npm registry, and `reins-mcp` there is the name of an unrelated package: in a folder that does not have this one, a plain `npx reins-mcp` offers to install that package instead, and installs it without asking when there is no terminal. With `--no`, npx runs what is installed or stops. The `--` has to follow it: without it npx keeps the options written after the command name for itself.

The help texts below are printed by the commands themselves when this site is built.

## reins-hub

The loopback WebSocket hub.

```text
usage: reins-hub [--port 7346] [--profile open|guarded|kiosk] [--allow-origin <origin>]...
                 [--config hub.json] [--token-file <path>] [--audit <path>] [--audit-key-file <path>]
                 [--surface-key <appId>=<path>]... [--require-key] [--no-announce]
                 [--agent <kid>=<path>]... [--no-surface-sockets]

--agent adds a credential of its own for one agent, with its key in that file (created
when missing): the agent then starts with --kid <kid> --token-file <path>. The first
--agent replaces the default token file; --token-file, when given too, stays the
credential "default".
--no-surface-sockets makes the socket take agents only, for a hub whose pages are all
linked in-process (an Electron app's main process).

A running hub announces itself in the user's Reins folder (~/.reins, or REINS_HOME) and
leaves a launcher there, so an agent on this machine can reach it from a shell:
  node "$HOME/.reins/reins.mjs" reins_attach
--no-announce writes neither.
```

- **Profiles and origins.** `guarded` and `kiosk` need at least one `--allow-origin`. `open` admits `http://localhost:*` and `http://127.0.0.1:*` when none is given. An origin entry is an exact origin, `scheme://host:*` for any port, or `*`.
- **The token.** With no agent configured the hub creates one credential (`kid` `default`) and writes the secret to the token file, by default `.reins/token`. The hub prints file paths, never secrets.
- **Secret files.** A secret file that does not exist is created with a random key. An existing one is refused on POSIX if group or others have any permission on it, and restricted again at start on Windows. A failure to restrict stops the hub.
- **Surface keys.** `--surface-key <appId>=<path>` once per app; `--require-key` refuses every surface without one. See [Surface keys](../guides/surface-keys.md).
- **The audit log.** `--audit <path>` writes one JSON record per line and keeps the chain's head in `<path>.head`. `--audit-key-file` keys the chain. See [The audit log](../concepts/audit-log.md).
- **A credential each.** `--agent <kid>=<path>` adds a credential with that `kid` whose key is in that file, created like any secret file when it is missing. With it and without `--token-file` there is no credential `default`: an agent names its own with `--kid`.
- **`--no-surface-sockets`** makes the socket take agents only, for a hub whose pages are all linked in-process, as in an Electron app's main process.
- **Origins that many pages share.** The hub warns at start when its socket admits `file://` or `null` without requiring a surface key.
- **`--config hub.json`** holds what flags cannot say: agent credentials with caps, a whole policy object, limits and capacities. A malformed configuration stops the hub with "invalid configuration ...".
- **The Reins folder.** Once it listens, the hub announces itself in `~/.reins` and writes the launcher there. `--no-announce` writes neither.

It exits with code 2 on a bad command line or a configuration it refuses.

## reins

The agent command: one request per run.

```text
usage: reins <command> [options]

commands:
  surfaces                    list connected surfaces (JSON)
  card                        print the prompt card
  observe                     print the UI tree
  act <name> [json-args]      call an app action
  click <target>              click an element
  type <target> <text>        type into an element
  move <target>               move the cursor to an element (or x,y)
  toast <text>                show a toast

options:
  --url <ws url>        hub URL (default ws://127.0.0.1:7346)
  --surface <id>        surface id (default: the only surface)
  --token-file <path>   file holding the key (default: the one the running hub announced)
  --name <agent name>   name shown to the user
  --kid <id>            the credential to authenticate as (default "default"); its key
                        is the one in --token-file
```

Each run connects, attaches with the one scope the command needs, does its work and detaches. `surfaces` does not attach. `--kid` names the credential to authenticate as. The command prints text from a page or the hub with every control character other than tab and line feed escaped as `\xNN`, so page content cannot drive your terminal.

A target is a handle, a semantic id such as `#menu.latte`, or for `move` a point written `x,y`.

## reins-mcp

The stdio MCP adapter.

```text
usage: reins-mcp [options]

options:
  --url <ws url>        hub URL (default ws://127.0.0.1:7346)
  --token-file <path>   file holding the key (default: the one the running hub
                        announced); give the full path, because a harness starts
                        this command in the folder its session is in
  --name <agent name>   name shown to the user (default mcp-agent)
  --kid <id>            the credential to authenticate as (default "default"); its key
                        is the one in --token-file
  --scopes <a,b,c>      scopes to request (observe, act, ui, cursor, show, nav, chat)
  --data-dir <dir>      directory reins_show may read JSON files from
```

It is started by an agent harness, not by hand. See [Use it from Claude Code and other MCP harnesses](../start/mcp.md).

## reins-tools

The same 10 tools as commands, for an agent that has a shell and no MCP registration, and the commands that make a machine ready.

```text
usage: reins-tools <tool> [arguments] [options]
       reins-tools up --allow-origin <origin>... | status | stop | down | setup
       reins-tools chat-serve [options] --exec <command> [args...]

tools, the same ten the MCP adapter has (the reins_ prefix may be left out):
  reins_surfaces   list the pages connected to the hub
  reins_attach     call first: asks the person on the page, returns the app's prompt card
  reins_observe    the page as a compact tree, then only what changed
  reins_read       text the tree leaves out: of an element, a region or the page; app state
  reins_act        call an action the app exposes
  reins_ui         click, type, select, scroll, key
  reins_cursor     move, show or hide the agent cursor
  reins_show       toast, highlight, app view, clear
  reins_chat       talk with the person in the page's Chat tab: wait, read, say, status
  reins_batch      up to 20 steps in one call

arguments: the tool's arguments as one JSON object, given as
  '{"action":"cart.add"}'   one argument in single quotes (bash, zsh, PowerShell 7.3+)
  -                         read from standard input (any shell; in Windows PowerShell:
                            '{"action":"cart.add"}' | reins-tools reins_act -)
  @args.json                read from a file

commands:
  up       start a hub in the background unless one is running; --allow-origin names the
           page's origin, --profile open|guarded|kiosk (default guarded), --port
  status   what is running: the hub, this session, the launcher
  stop     end this session; the page shows the agent has left
  down     stop a hub that `up` started
  setup    write the launcher: node "$HOME/.reins/reins.mjs" <tool>
  mcp      be the stdio MCP adapter, for a harness that wants the tools registered:
           claude mcp add --scope user reins node "$HOME/.reins/reins.mjs" mcp
  chat-serve --exec <command> [args...]
           answer the person's chat messages with a program: each message goes to one
           run of the command on standard input, behind a line that says who wrote it,
           on lines starting "| ", and what the command prints is the reply. Whoever
           types in the page's Chat tab decides what the command is given, and the
           command runs here as you: read integrations/chat-serve/README.md first.
           The command is run without a shell, and everything after --exec is its own.
           A command named without a path is looked for in the folders of PATH, never
           in the working directory, and the runner says which file it runs.
           --timeout-ms <n> ends a run that takes longer, with what it started
           (default 120000); --surface <id> names the page; --once stops
           after one answer; --preface <file> puts that file's text in front of each
           message; --wait-ms <n> is how long one wait lasts (default 60000);
           --allow-unverified serves a page that did not prove its app key to the hub:
           any program on this computer can be such a page and write as the person

options:
  --url <ws url>        hub URL (default ws://127.0.0.1:7346)
  --session <id>        tell two agent sessions on one hub apart (default default)
  --name <agent name>   name shown to the person; taken when the session starts
  --token-file <path>   file holding the key (default: the one the running hub announced)
  --kid <id>            the credential the session authenticates as (default "default"),
                        with its key in --token-file; taken when the session starts
  --scopes <a,b,c>      scopes the session may request (observe, act, ui, cursor, show, nav, chat)
  --data-dir <dir>      directory reins_show may read JSON files from

--name, --kid, --token-file, --scopes and --data-dir are taken when a session starts.
On a session that already runs, another value is refused: stop it first.

Nothing is registered and no session needs a restart: a hub that is running has
announced itself in the user's Reins folder (~/.reins, or REINS_HOME).
```

The launcher in the Reins folder runs this command: `node "$HOME/.reins/reins.mjs" <tool>` is `reins-tools <tool>` of the installation that wrote the launcher. Exit code 0 with the tool's text on standard output; 1 with the error text on standard error; 2 for a command line that is not understood. See [Shell tools with nothing registered](../start/shell-tools.md).

`chat-serve` answers the person's chat messages with a program: one run of the command for each message, the message on standard input, no shell. Whoever types in the page's Chat tab decides what the command is given, and the command runs as you: read [Serve chat from any command-line agent](../guides/chat-serve.md) first.

## reins-electron

Loads the driver into the pages of an Electron app that was not built for Reins, through the app's debugging connection.

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

Whoever holds a debugging connection controls the app completely, and an agent that is allowed to attach to an adopted app can press anything in its window. See [Adopt an Electron app](../guides/adopting-an-electron-app.md).

## Environment

| Variable | Used by | Meaning |
|---|---|---|
| `REINS_TOKEN` | the agent SDK and everything built on it | The agent's key itself. |
| `REINS_TOKEN_FILE` | the same | A file that holds the key. |
| `REINS_HOME` | the hub, the SDK, the shell tools | The Reins folder, in place of `.reins` in the home folder. |

## In a checkout of the repository

The repository's `package.json` has scripts for the demo: `npm run demo:hub` (a hub with the open profile, a surface key for the demo app and a keyed audit log under `.reins/`), `npm run demo` (the demo page) and `npm run demo:agent` (the scripted agent). See the [Quickstart](../start/quickstart.md).
