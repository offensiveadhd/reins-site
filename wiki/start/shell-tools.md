# Shell tools with nothing registered

> An agent harness that has a shell reaches a page with one command line, with no registration, no restart and no path. The same tools as the MCP adapter.

## One line that works everywhere

An agent harness that has a shell needs no registration, no restart and no path. A hub leaves a launcher in your Reins folder when it starts, and the launcher runs the same 10 tools the MCP adapter has, by the same names, with the same arguments and the same answers:

```bash
node "$HOME/.reins/reins.mjs" reins_attach '{"reason":"order a coffee"}'
node "$HOME/.reins/reins.mjs" reins_act '{"action":"cart.add","args":{"sku":"latte"}}'
node "$HOME/.reins/reins.mjs" reins_observe
node "$HOME/.reins/reins.mjs" reins_read '{"target":"e7"}'
```

That line is the same in bash, zsh and PowerShell, on every system, from any folder. So a prompt can tell an agent how to reach a page without knowing anything about the machine, and the agent does the rest itself.

A tool is named in full or without `reins_`: `attach` and `reins_attach` are the same tool. The answer is the tool's text on standard output with exit code 0, or the error text on standard error with exit code 1. A command line that is not understood is exit code 2.

The person is still asked on the page before an agent may attach: this removes the setup, not the consent.

## The session

A grant lasts as long as the agent's connection to the hub, and a shell command ends when it has printed its answer. The first tool call therefore starts a small process in the background that holds the connection, and the grant the person approved, for the calls that follow.

- It ends on `stop`, or after 30 minutes without a call (`--idle-ms` changes that). The page then shows that the agent has left.
- `--session <id>` keeps two agents on one hub apart. The default session is called `default`.
- `--name` sets the agent name shown to the person. It is taken when the session starts.
- `--scopes` and `--data-dir` are those of [the MCP adapter](./mcp.md).
- `--kid <id>` names the credential the session authenticates as (default `default`), with its key in `--token-file`. Two agents on one hub can so hold a credential each, with a name, a scope cap and limits of its own.
- These options are taken when a session starts. On a command that finds its session running, `--scopes`, `--kid`, `--token-file`, `--data-dir` or `--name` with another value than the session has is refused with `E_BAD_ARGS`: the message says what the session has and that `stop` ends it, and the tool is not called. None is dropped without a word. `status` says which scopes the running session may request.
- A chat `wait` over the session hands messages over in two steps, because whoever asked may be gone by the time the answer is written: the answer shows the messages, and they are taken when the caller, with the answer in hand, says so. `reins-tools` does both steps itself. A caller that died in between took nothing, and the next `wait` finds the messages.

The session process listens on a free port of `127.0.0.1` and answers only a request that names that host and port, carries no `Origin` header, and sends a random bearer secret, which is kept in a file only your account can read.

## The arguments

The arguments are one JSON object, given as:

- one argument in single quotes: `'{"action":"cart.add"}'`
- `@file`, to read them from a file
- `-`, to read standard input

Windows PowerShell (5.1, and PowerShell before 7.3) removes the double quotes inside an argument, so pipe the JSON there:

```powershell
'{"action":"cart.add"}' | node "$HOME/.reins/reins.mjs" reins_act -
```

The command says so when it sees JSON without its quotes.

## No hub running

```bash
node "$HOME/.reins/reins.mjs" up --allow-origin http://localhost:5173
```

`up` starts a hub in the background and returns when it is listening. Run again with another origin, it restarts the hub it started so that both are admitted. It never touches a hub you started by hand: it then reports what that hub does not admit.

- `status` says what is running: the hub, the session and the launcher.
- `down` stops a hub that `up` started.
- `up` prints the hub's warnings itself, when it starts the hub and when it finds it running: one line for an allowlist entry that names no page (`null`, `file://`). The hub it starts writes to a log file, where nobody would read them.
- An announcement outlives a hub that was killed, and its process id is then anybody's. Before `down` or `up` ends the process an announcement names, what listens on the port has to prove that it is a hub with the key in the announced token file, and the process that holds the id has to be older than the announcement. Otherwise nothing is ended, and the command says why.

## No launcher yet

A hub writes the launcher when it starts, and so does `reins-tools setup`:

```bash
npx --no -- reins-tools setup
```

Run it in a project that has the package. A machine where neither has run has no launcher.

## What is left in the Reins folder

The Reins folder is `~/.reins`; the environment variable `REINS_HOME` names another folder. The hub creates it for the current user alone. In it:

| File | What it is |
|---|---|
| `reins.mjs` | The launcher. It runs the shell tools of the installation that wrote it. |
| `hub-<port>.json` | Where the hub is: its URL, port, process id, start time, profile, the origins it admits, and which file holds its token. Never the token. |
| `session-<port>-<id>.json` | While a shell session runs: its port and bearer secret. Only your account can read it. |

On an orderly shutdown the hub removes its announcement, and a reader ignores the announcement of a process that is no longer running. Start the hub with `--no-announce` to leave nothing there.

> [!WARNING]
> Whoever can write to the Reins folder can replace the launcher, which agents run with your rights, or point agents at another token file. The hub does not take a folder back that already exists with wider permissions. On a kiosk, start the hub with `--no-announce`: nobody there needs the launcher. See [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against).

## Answer the chat with a program

`chat-serve` runs a command once for each message the person types in the page's Chat tab, with the message on standard input and no shell in between, and posts what the command prints:

```bash
node "$HOME/.reins/reins.mjs" chat-serve --preface integrations/chat-serve/preface.md --exec hermes chat --query-file - -Q
```

> [!WARNING]
> Whoever can write in that page's Chat tab decides what the command is given, and the command runs on your machine as you. Read [Serve chat from any command-line agent](../guides/chat-serve.md) first: it says who can be on the other end, what the command can reach, why the runner refuses a page the hub did not verify, and what it ends when a run is over (and what it cannot).

## The commands

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

## Register it as an MCP server after all

`mcp` makes the launcher be the stdio adapter, so that a harness registration can name the launcher alone. See [Use it from Claude Code and other MCP harnesses](./mcp.md).

## Next

- [Methods](../reference/methods.md): what the tools send.
- [Troubleshooting](../guides/troubleshooting.md)
