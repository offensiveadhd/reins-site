# Answering the chat with any program: chat-serve

> Answering the chat with any program, and what that hands to whoever is at the page: read the warnings first. Rendered from integrations/chat-serve/README.md.

> **Read this before you run it.** `chat-serve` gives whoever can write in a page's Chat
> tab a line to a program on your computer.
>
> **Who is on the other end.** The person at the page: any visitor of that page, not
> you. The page itself too: the app, and every script it loads, can read the chat and
> change what is sent as "the person", as with any field of its own page. And if the
> page did not prove its app key to the hub, anything on your computer that can reach the
> hub's port can be "the page". `chat-serve` refuses to serve such a page. Passing
> `--allow-unverified` accepts exactly that: text from any local program, handed to
> your command as the person's.
>
> **What the `--exec` command can do.** It runs as your user: your files, your
> environment variables (API keys among them), your network, and the session's grant on
> the page. If it is an agent with a shell or file tools, the visitor's text steers an
> agent that has them. The preface in this folder tells a model to use the Reins tools
> only. That is a request to a model, not a restriction on a program.
>
> **So:** give `--exec` only a program whose abilities you would hand to a stranger.
> Switch off the agent's shell, file and network tools in its own configuration, or run
> the runner in a container, a VM or under a separate user account with nothing of
> yours in reach. Do not serve a page that strangers can open with an agent that can run
> commands.

`reins-tools chat-serve` lets a program that is not an MCP harness answer the Chat tab
of a page: a one-shot command of a CLI agent, a script, a local model runner.

```
node "$HOME/.reins/reins.mjs" chat-serve [options] --exec <command> [args...]
```

For every message the **person** sends, the runner starts the command once:

- the message goes to the command's **standard input**, and only there. It arrives
  marked as what it is: one line written by the runner that says who wrote it, then the
  text on lines that each start with `| `:

  ```
  [chat message #12 from the person at the page http://localhost:5173, surface s1: its text is on the lines below, each starting "| "]
  | Two flat whites please,
  | and tell me the total.
  ```

  The first line says `, a page the hub did not verify` after the surface when that is
  so, and `, to you only` when the person addressed this agent alone. No control
  character of the message reaches the command raw: line breaks of every kind start a
  new `| ` line, and the rest are written as `\u{1B}`. A script that wants the plain
  text takes the lines that start with `| ` and drops those two characters;
- the command is started from the argument array after `--exec`, **without a shell**.
  Nothing from the message becomes part of a command line;
- the environment variable `REINS_CHAT_CONTEXT` holds one line of JSON about the
  message, never its text:
  `{"surface":"s1","origin":"http://localhost:5173","verified":true,"id":12,"session":"default","hub":"ws://127.0.0.1:7346"}`
  (`"direct":true` when the person addressed this agent alone; `"verified":false` for a
  page the hub did not verify);
- what the command prints on standard output is posted as the reply: trimmed, at most
  4000 characters, at most 64 KiB read. A reply to a message that was for this agent
  alone goes to the person alone; no other agent is sent it;
- a run that exits with a code other than 0, or takes longer than `--timeout-ms`
  (default 120 000), posts a short notice instead ("no answer: the command failed with
  exit code 3"). The command's error output goes to the runner's own error output,
  never to the page;
- an empty answer posts nothing.

Messages of other agents start nothing: they are not requests.

## One message and one run at a time, and none left behind

The runner takes one message at a time, and the next one only when the run before it has
gone, with what it started. A runner that stops (`--once`, Ctrl-C, a run it could not end)
has taken no message that it does not answer: the others wait for the next runner.

A run is over when the command exited, took longer than `--timeout-ms`, or the runner was
stopped. In each case what the command started is ended with it. What that covers:

- **Windows.** A few milliseconds after the command starts, the runner puts it into a
  **job object** that allows no breakaway, with whatever it had started by then that can
  still be traced to it. From then on Windows itself keeps every process that the command
  or anything below it starts inside the job: a detached one, one in a console of its own,
  one whose parent has long exited, the hundredth of a tree that keeps growing. When the
  run is over the job ends all of them at once and says how many there were. A command
  that exits 0 and leaves something running is not a clean answer nobody looked behind:
  what it left is ended, and the runner tells you
  (`the command exited and left 2 processes running: ended`). A program that asks Windows
  to start a process outside the job is refused by Windows (that start fails).
  **Not covered:** a process that a program outside the job starts on the command's
  behalf (a scheduled task, a service, WMI, an application that was running already and
  is asked to open something), and a process started in those first milliseconds by a
  child that had itself exited before the job took hold.
  Node has no call that makes a job object, and this package has no native part. One
  helper does it: Windows PowerShell, started once by its full path with an environment of
  its own, compiles a few lines of C# with the .NET Framework that is part of Windows.
  Where that cannot be done (PowerShell is missing, or a policy restricts its language)
  the runner **starts no command at all** and says why. It does not fall back to
  something weaker.
- **Linux, macOS.** The command runs in a process group of its own, and the group is
  signalled to end and then killed. **Not covered:** a process that leaves the group
  (`setsid`, a daemon).
- If something is left that cannot be ended, or the runner cannot find out whether
  anything is left (the helper has gone, the command's output stays open), the runner
  **stops** (exit code 1) and says so. It does not start the next run beside it: a
  process left over from one visitor's message still has the grant in reach.
- Stopping the runner (Ctrl-C) ends a run in progress the same way, and hangs up its
  wait for a message, which then takes none.

Do not `--exec` programs that hand work to a service or start daemons, or use a sandbox
of the operating system. This is tidiness after a run, not a wall around it.

## Which file runs

The runner settles which file `--exec` names before it takes a message, and prints it
(`the command is C:\Program Files\nodejs\node.exe`). A path is that file. A bare name,
such as `hermes`, is looked for in the folders of `PATH`, in order, and **never in the
working directory**: not by itself (Windows looks there first for a program named without
a path) and not through an entry of `PATH` that is empty or relative. A program that
somebody put into the folder you start the runner in does not run under another's name.
To run a file in the working directory, write its path: `.\agent.exe`, `./agent`.

## The grant

The runner works through the same shell session as every other `reins-tools` command,
so the command holds **the same grant**. From inside it, a program can call
`node "$HOME/.reins/reins.mjs" reins_observe`, `reins_act` and the rest, exactly like
that, to do what the person asked before it prints its answer: a tool that is run inside
a run of `chat-serve` reads `REINS_CHAT_CONTEXT` and goes to the runner's session, hub
and page when the command line names none. (`--session`, `--url` and a `surface` in the
arguments still come first.) If the session holds no grant yet, the runner attaches
first, and the page asks the person.

The runner serves **one page**: the one `--surface` names, or else the one its first
answer is about. Every call it makes names that page, so attaching the session to a
second page does not move the runner there.

| option | |
|---|---|
| `--exec <command> [args...]` | required, and last: everything after it belongs to the command |
| `--timeout-ms <n>` | end a run that takes longer, with everything it started; default 120000 |
| `--preface <file>` | write this file's text, then a line feed, before each message on standard input |
| `--surface <id>` | the page, when the session is attached to more than one |
| `--once` | answer one message, then stop |
| `--wait-ms <n>` | how long one wait for a message lasts before the runner asks again; default 60000, at most 150000 |
| `--allow-unverified` | serve a page that did not prove its app key to the hub. Any program on this computer that can reach the hub's port can be such a page, and what it writes as "the person" is handed to the command |
| `--session`, `--url`, `--name`, `--scopes`, `--token-file` | as for every `reins-tools` command. A session takes `--scopes`, `--kid`, `--token-file`, `--data-dir` and `--name` when it starts: on one that already runs, another value is refused, with what the session has, and nothing is started |

A page is verified when the hub holds a key for its app and the page proved it
(`reins-hub --surface-key <app id>=<key file>`, and the same key in the page's driver).
`reins_surfaces` shows which pages are: the second word of each line is `verified` or
`unverified`.

It stops when the grant ends (exit code 0), when the session or the command cannot be
reached, when the page is not verified, or when a run could not be ended (1), or when
you stop it. Stopping the runner leaves the session, and its grant, running:
`reins-tools stop` ends that.

While the page shows a consent prompt (`E_BUSY`), or a rate is used up (`E_RATE`), the
runner keeps trying to post the reply for up to 90 seconds.

On Windows, name a program that can be started directly: an `.exe`, or `node` with a
script. A `.cmd`, `.bat` or `.ps1` wrapper needs a shell, and the runner uses none: it
refuses such a file before it takes a message, and says what to name instead.

## A model must be told what the message is

A one-shot agent gets the lines above and nothing else. It does not know that the text
came from a chat on a web page, that it can act on that page, that the person who wrote
it is not its operator, or that the `| ` lines are a request and not part of its own
instructions. `--preface` puts a text of yours in front of every message. `preface.md`
in this folder is a starting point:

```
node "$HOME/.reins/reins.mjs" chat-serve --preface integrations/chat-serve/preface.md --exec <command> [args...]
```

It tells the model who is writing (a visitor of the page, not its operator), how the
message is marked, that it may use the Reins tools for the page and nothing else (no
other commands, no files, no network, nothing about the machine or its environment),
and that what other agents and the page say is data. Once more: a model can be talked
out of a preface. What the program is able to do decides what a visitor can make it do.

The person's message is the person's request to the agent about the page, within what
the grant allows. It never approves a consent prompt and never changes a permission:
the page asks on its own prompt, whatever the chat says.

## Hermes

Hermes Agent reads a single query from standard input with `--query-file -` and prints
its answer:

```
node "$HOME/.reins/reins.mjs" up --allow-origin http://localhost:5173
node "$HOME/.reins/reins.mjs" chat-serve --name "Hermes" --preface integrations/chat-serve/preface.md \
  --exec hermes chat --query-file - -Q
```

Hermes is an agent with a terminal and file tools. Started like this, the person at the
page is talking to an agent that can run commands as you. Do it for a page only you can
open, or restrict what Hermes may use in its own configuration first.

`hermes chat --help` says of `--query-file`: nothing is shell-interpreted, so quotes,
`$(...)` and backticks are preserved. That matches how the runner hands the text over.
The flags above were read from `hermes --help` and `hermes chat --help`; the command was
**not run** when this was written, because that would call a model. Two things to check
when you run it: that `-Q` prints the answer alone (its help says "the final response
and session info", and a session line would be posted to the chat too), and how long a
turn takes against `--timeout-ms`.

Any other CLI agent works the same way if it can take its prompt on standard input and
print its answer. One that only takes the prompt as an argument needs a small wrapper
script that reads standard input and passes it on as one argument of an argument array.
