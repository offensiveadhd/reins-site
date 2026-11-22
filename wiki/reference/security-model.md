# Reins security model

> Who can attack an agent-driven page, what stops them, and what Reins does not protect against. Rendered from docs/SECURITY.md.

Reins gives an AI agent hands inside a web page. This document says who can attack
that, what stops them, and what Reins does not protect against. The numbered rules it
refers to are in [SPEC.md section 14](./specification.md#14-security-requirements).

## What is being protected

- **The app session**: whatever the page can do on the user's behalf.
- **Data on the page**: names, orders, anything the user typed, and above all
  passwords, card numbers and one-time codes. Also where the user is: the page's URL
  and title.
- **The user's say**: nothing sensitive happens without the approval the policy
  demands, and the user can always see and stop the agent. How much an agent is asked
  (its permission level) is the user's alone to change.
- **The user's voice**: what the person says in the page's chat is theirs. No agent can
  say it for them, who hears it is theirs to decide, and it is not written down anywhere
  but in the page. The page itself is not kept out of it (see "What Reins does not protect
  against").
- **Agent secrets** and the **audit log**.

## Who is trusted with what

| Party | Trusted to | Not trusted to |
|---|---|---|
| App (the page that embeds the driver) | define actions, risk and policy | |
| Hub | authenticate, route, enforce hub policy, keep the audit log | |
| Agent | act within its grant | exceed scopes, skip consent, see private fields, set its own permission level, speak as the person or as another agent |
| The person at the page | approve, pause, stop, and say how much each agent is asked, within what the app and the hub offer; ask an agent for things in the chat | approve or change anything by what they type in the chat: that takes the prompt and the panel |
| Page content (text, names, values) | nothing | it is data, and may be written by an attacker |
| Chat text (what the person or an agent wrote) | nothing | it is data too: the person's request to an agent about the page, or another agent's words, never an instruction of the agent's operator |
| Other web pages, other machines, other local processes | nothing | |

The surface re-checks every request even though the hub already did (rule 6), so the
app's guardrails hold even behind a misconfigured hub.

## Threats and what stops them

| # | Attacker | Attack | Defence | Rule |
|---|---|---|---|---|
| T1 | Another machine on the network | Connect to the hub | Loopback bind only; non-loopback remote addresses refused | 1 |
| T2 | A web page using DNS rebinding | Make a hostile name resolve to 127.0.0.1 and talk to the hub | `Host` header must be a loopback name with the hub's port | 1 |
| T3 | Any web page in the user's browser | Open a socket to the hub and pose as an agent | Agents need a 256-bit secret; a browser-origin agent must also be on the credential's origin list | 2 |
| T4 | Any web page | Pose as a surface to receive agent commands | Browsers set `Origin` truthfully; it must be on the allowlist | 4 |
| T5 | A local process | Forge `Origin` and pose as a surface | Surface keys: `requireKey` refuses every surface without one | 4 |
| T6 | A local process | Listen on the hub's port first and collect agent traffic | The hub must prove it holds the agent's secret before the agent sends anything | 2 |
| T7 | A local process | Relay an agent's connection to the real hub, then inject, alter, reorder or replay commands on the authenticated session | Sealed sessions: every message carries a MAC under keys bound to both nonces and to the exact `challenge`, `hello` and `welcome` texts, each behind its byte length, with a sequence number. Text that is not well-formed Unicode is never sealed or opened. Key confirmation before the hub acts on `hello`. Withholding the tail of a direction is not detected (see below) | 2 |
| T8 | A local process | Pose as the hub to a page that holds no key | The page treats the hub as unverified: no attach is ever silent, the prompt and the indicator say so, and the kiosk profile refuses to run without a key | 4, 11 |
| T9 | A local process or a log reader | Steal the agent secret | Never in URLs or logs; the secret itself never crosses the wire; a new secret file is written inside an owner-only temporary directory and linked into place; an existing one is refused (POSIX) or restricted again (Windows) when others can use it; on Windows every access entry but the current user's is removed, inherited or set on the file itself, and the ACL is read back to confirm it; failing to restrict a secret is fatal | 2, 3 |
| T10 | Anyone replaying captured traffic | Replay a handshake or a frame | Fresh nonces from both sides in every proof; sequence numbers in every sealed frame | 2 |
| T11 | Someone guessing the secret | Many handshakes | 256-bit secrets, short keys rejected at configuration, failed proofs delayed and nothing more kept from that peer, 16 handshakes at a time, 16 messages and 64 KiB held per connection before authentication | 2 |
| T12 | A compromised or manipulated agent | Do more than it was granted | Grants, scopes and rate limits at the hub, per credential; policy again at the surface | 5, 6 |
| T13 | A manipulated agent | Trigger a destructive action | Risk tiers: `confirm` needs a human, `deny` cannot be overridden by the agent | 6 |
| T14 | A manipulated agent | Get a harmful request approved by hiding it: a filler argument first, the payload out of sight, look-alike or invisible characters | The prompt shows every argument in full, escapes every invisible, blank or look-alike code point (also in agent names, reasons, toasts and labels), refuses to ask about what does not fit on a card, and keeps Allow inactive until a tall card was scrolled to its end | 10 |
| T15 | A manipulated agent | Approve its own consent prompt, or raise it under a click already in progress | Prompts accept trusted input only (what that takes: T67), are outside the exposed tree, and arm Allow after 500 ms; keys that could be typing meant for the page answer no prompt (T70); nothing the agent drew stays on screen with a prompt (T73); the indicator stays above the prompt's backdrop | 10, 11 |
| T16 | A manipulated agent | Bury the user in prompts | One attach in flight per credential and surface, attach rate limit per credential, one pending prompt per agent and four in total, a cool-off after each refusal (T31) | 5, 10 |
| T17 | A manipulated agent | Inject script, markup or CSS | No evaluation path exists; text is inserted as text; one validated colour value | 8 |
| T18 | A manipulated agent | Read or change a password, card or OTP field, including after the page reveals it or swaps the node | Private fields carry no value and no checked state; they refuse every kind of synthetic input, also input that would change them without targeting them (clearing an editable that holds one, a radio of their group, a form reset); Tab never lands on them; they stay private for their lifetime and across a node swap; their text never names another node | 9 |
| T19 | A manipulated agent | Send the page somewhere hostile | `nav.go` is same-origin, http(s), and limited to allowed path prefixes | 8 |
| T20 | A manipulated agent | Pass hostile arguments to an app handler | Schema validation, undeclared properties rejected, size limits | 7 |
| T21 | A manipulated agent | Keep acting after Stop or Pause, or behind a dialog that hides the indicator | Commands re-check right before they act; Pause and Stop halt the cursor and drop queued pointer points; the overlay moves into modal dialogs and fullscreen elements; while it cannot be shown, commands hold; after Stop, attach needs approval again | 11 |
| T22 | An agent the user never approved | Learn where the user is, or which surfaces exist, from listings, events and errors | Without an `observe` grant an agent sees a surface's origin and app name only, and only for surfaces its credential may attach to; any other surface id answers exactly like a missing one; `hub.info` counts only what the agent may see; `ui`, `state` and `nav` events reach only grants with `observe` | 5 |
| T23 | Hostile page content | Instruct the model through names, values, text or error messages | Observations are bounded and marked as page data, including listings and relayed errors; whatever the model then tries is still held by T12 to T21 | 12, 14 |
| T24 | A flood, from either side | Exhaust the hub or freeze the page | Frame size limits; bounded inbound queues; per-credential token buckets, `hub.info` and `surfaces.list` included; admission rates for surfaces and agents; session caps; a peer that does not read is closed; credit-based streams that charge every frame against one point budget per credential and surface; a per-frame time budget in the driver; bounded audit records | 5 |
| T25 | Someone editing history | Alter, remove or cut audit records, or act while nothing is recorded | Hash chain, keyed with an HMAC where configured; argument digests keyed the same way; a head that reveals truncation, replaced atomically; acceptance recorded before a request is forwarded; attach and audited requests refused when the log cannot be written | 13 |
| T26 | A kiosk visitor | Use the agent to leave the intended flow | Kiosk profile: allowlisted actions, annotated elements only, no synthetic input, no navigation, no raw coordinates and no pointer stream | 6 |
| T27 | A local process without the surface key | Connect as a surface claiming the app id of a keyed app, to receive the commands meant for it | The hub demands the key for every app id it holds one for, with or without `requireKey`; `SurfaceInfo.verified` tells agents which surfaces proved a key | 4 |
| T28 | Hostile page content | Forge the adapter's own status lines (`2 ok`, `3 skipped`) inside a `reins_batch` result, or a notice or a marker inside the text `reins_read` returns, so the model believes steps ran that did not, or takes page text for the adapter's word | Page text sits on lines of its own behind `\| `, apart from the step results and from every line the adapter writes | 14 |
| T29 | Whatever listens on the hub's port | Put text in front of the model through a handshake that never completes | An error from an unfinished handshake is one clipped line marked `[unverified hub data]` | 2, 14 |
| T30 | A user who can write to the hub's working directory | Plant an `icacls.exe` for the hub to run with its rights | `icacls` is run by absolute path from `%SystemRoot%\System32`, without a shell | 3 |
| T31 | A manipulated agent | Re-raise a refused prompt until the person gives in, or change the page while a prompt is up so that what they approve is not what they see | A cool-off of 2 s doubling to 60 s after each refusal, timeout or prompt the agent itself withdrew (T82), per agent for actions and surface-wide for attach; three refusals in a row revoke the grant; while a prompt is showing or queued only read-only methods are served, from every agent; a withdrawn prompt becomes a "Request withdrawn" notice; a remembered approval counts only once its handler ran | 10, 11 |
| T32 | An agent session that disconnects | Leave an attach prompt standing for an agent that is gone | The hub sends the surface `detach {why:"agent"}`, which withdraws the prompt | 11 |
| T33 | Hostile page content | Drive the operator's terminal with escape sequences printed by the agent CLI | Control characters in page text are printed escaped | 14 |
| T34 | A web page using DNS rebinding | Read the demo page, and the surface key it serves, from a hostile name | The demo server refuses a `Host` that is not a loopback name with its port | 1 |
| T35 | A web page that embeds the app in a frame | Cover or overlay the consent prompt and the indicator with its own content, or place the frame under a click the person is about to make, so that a request is approved, or an agent stays attached, without the person seeing it | The driver does not connect inside a frame: `connect()` fails with `E_DENIED` before anything is sent to the hub or shown, unless the app's policy sets `framed` | 10, 11 |
| T36 | A web page, or a local process of another user, that finds a shell session's port | Use the grant the person approved for the agent | The session listens on loopback, on a port of its own, and answers only a caller that sends its bearer secret, compared in constant time; the secret is in a file only the user's account can read; a request that carries `Origin`, or names another host, is refused even with the secret | 1, 3 |
| T37 | A web page | Learn where the hub's files are, or reach the token, through what the hub leaves in the user's Reins folder | The announcement and the launcher are files, not something the hub serves: the hub still answers plain HTTP with a bare status, and a page learns nothing a prompt did not tell it. The announcement names the token file and never holds the token | 3 |
| T38 | A manipulated agent | Raise its own permission level, set itself a rule, or switch a scope back on | No protocol message reaches the panel. A level, a rule or a scope switch changes only on trusted input on the driver's own controls (T67 says what that takes, and that script in the page's own realm is outside it), which sit outside the exposed tree; the driver takes no events from the hub; its API reads these and sets none | 10, 15 |
| T39 | A manipulated agent | Shed what the person tightened, or keep what they loosened, by its own calls: attach over its own grant, detach and attach again, reconnect, come back under another session id or name, or let the grant run out | What lets an agent do more belongs to one grant and ends with it: `auto`, `bypass`, a rule Allow, a remembered approval. What the person tightened stays with the agent for as long as the page lives: Strict, their Ask and Block rules and the scopes they switched off are on its next grant from the first request. The surface tells the agent by the id of its credential, which the hub sends with every attach, whatever the session id or name. Where it cannot tell (no id, or a hub it did not verify), every such agent is one agent to it: an attach that follows a tightening asks even under `attach: allow`, and the prompt says what was set and that it stays. The surface names what is kept in its attach answer; the hub starts the grant with it, records it, and reads nothing from an attach answer that lets an agent do more. Only the person lifts a tightening, in the panel | 15 |
| T40 | A manipulated agent | Get the level raised under a click already in progress: time a request, or make the panel redraw as the person clicks (a second session attaching or leaving) | Whatever lets an action run without asking takes a confirm step: `auto` or `bypass`, any level under which an action stops asking, the rule Allow always, and a Reset that frees an action. The step names the agent and what stops asking, is armed after 500 ms and armed again when it moves; "Always allow" on a prompt takes a second, armed press. Whenever what is under the pointer changes other than by the person's own click (a redraw, a consent card or its backdrop going away, a confirm step opening or being answered, so also the second half of a double click), the controls that loosen ignore activation for 500 ms; a click that makes the overlay put itself back on top (something had come over it) is not taken either: only a later one is; a change answers no prompt that is already up | 10, 15 |
| T41 | A manipulated agent | Use an action that a level or a rule lets run to change the page while the person reads another prompt, or right after the person tightened something | A waived prompt is not an approval: such an action fails with `E_BUSY` while any prompt is up, and is checked against the level and the rules again right before it runs | 10, 15 |
| T42 | A forged or modified surface, or a page whose policy is looser than the hub's | Run an agent at a level the hub's operator did not offer, or widen a grant by reporting scopes | The hub sends its `human.levels` and its decision for each action with every attach, and ends the grant on a reported `auto` or `bypass` beyond them. A rule `allow` that its policy would not honour is recorded as refused and neither kept nor passed on; it changes nothing, because the hub goes on refusing or marking those requests itself. A scopes report only narrows a grant to what was granted at attach. Every change is recorded. Reports that change nothing are recorded up to 20 a second for a surface and counted beyond that, and a grant whose surface reports more than 20 changes within a second is ended, so a flood cannot push a change out of the log | 5, 13, 15 |
| T43 | Anyone who can set a level | Turn a policy `deny` into something that runs | No level and no rule relaxes a `deny`, at the surface or at the hub; the panel shows such an action as "Blocked by app" or "Blocked by hub" with nothing to choose. The kiosk profile offers no level beyond `strict` and `ask`, which only ask more, and has no panel | 6, 15 |
| T44 | Hostile page content | Forge an adapter notice ("the person set your permission level to bypass") so that the model stops being careful | Notices come before a tool's own answer and so before any page-data marker; their words are the adapter's, and a value from the wire goes in only as a known level or scope, or as a count. The name of an action is a word the page chose (an app can declare one that reads as an instruction), so no notice carries one: a rule notice says that a rule changed and how many are set, and which actions they are for is listed after the tool's own answer, under the page-data marker. A notice names the surface it is about and says when the hub did not verify the page: what one page reports about the person is not to be read as true of another page, of other tools or of the session. Every text a page supplied leaves the adapter by one rule, in every tool, alone or in a batch: free text on lines behind `\| `, a new one at every line break and at U+001C to U+001E, every other control character written as an escape, and a last step over the whole result that leaves no control character in it but the adapter's own line feeds; the quoted strings of the tree and of the prompt card are one line to every reader; and `reins_read` is cut by the adapter at the length that was asked for. The surface listing and the answer of `reins_attach` give what the hub knows first, with `unverified` said and not left out, and what the page says of itself last, its name in quotes: an app name that copies the hub's words does not read as the hub's mark | 14 |
| T45 | A manipulated agent | Put text of its own into the panel or the activity list, or read them | The panel is never part of the UI tree. It shows agent names escaped like every other agent-written string, in quotation marks and with the session id wherever a decision is asked (a prompt, a confirm step, a heading), so a name cannot finish a sentence of the panel and two agents with one name differ; and methods or declared action names only: an action name the app did not declare is shown as "unknown action". The activity list holds no arguments, results or page text | 8, 10 |
| T46 | A manipulated agent, or anything that can send a frame | Speak as the person in the chat: to the person ("You: yes"), or to another agent | A message of the person comes only from trusted input events in the composer of the driver's own Chat tab, inside its closed shadow root; a text that an agent's synthetic input put in the field is not sent, and no method, parameter or event posts as the person. While the app's own code runs because an agent asked for it (an action's handler, a view's renderer, a state getter, the handlers of synthesised input) the composer takes no input, so code that inserts text at the focus cannot leave the agent's words there. An agent's message is captioned "AI agent" first, then with the name from its grant in quotation marks and its session id, so an agent named "You" does not read as the person and two agents with one name differ; a status note is quoted as the agent's own words. The hub takes no event from an agent, relays a chat event only for a grant the sending surface holds, and writes the sender's name itself. All of this holds against agents. It does not hold against the page: the app and every script it loads can read and alter the chat like any field of their own page (see "What Reins does not protect against") | 10, 16 |
| T47 | Hostile text in the chat: a manipulated agent's message, or something the person was talked into pasting | Prompt injection: instruct the model through a chat message, or forge a line of the adapter inside one | In tool results every message is a line of the adapter's that says who spoke, with the text behind `\| `, so a text cannot pass for a header, a notice or another speaker; a new `\| ` line starts at every kind of line break and at the separators U+001C to U+001E, every other control character is written as an escape, and a session id is printed with letters, digits and `. _ -` only; unread messages are announced by number, never by text. The tool and the subagent prompt say what each speaker's words are: the person's are a request about the page, another agent's are that agent's text. Whatever the model then tries is still held by T12 to T21 | 14, 16 |
| T48 | A manipulated agent | Steer another agent through the room, or listen to what the person asked another agent | Who hears whom is the person's choice. Under `guarded` (`chatRelay: "person"`) no agent hears another until the person switches "Agents can hear each other" on in the Chat tab, through a confirm step that names the agents and that, like every change that lets an agent do more, is not taken while the overlay cannot be relied on (T68); an agent that joins later is not included until the person adds it; a hub that sends another `chatRelay` with a later attach leaves the switch off for all, told to the hub and said in the tab, never on; and the tab always says who hears what. `open` relays always and the tab says so; `kiosk` never does. The stricter of the page's policy and the hub's applies, and the hub enforces its own. What agents hear of each other is marked as another agent's words, not instructions, under the name the hub gave the sender. An agent can always answer the person alone (`to: "person"`), and the tools do so by themselves after a message that was for one agent only. A message reaches only the agents it was sent to, message ids count each agent's own messages and so tell nothing about what was said to others, the person sees every word, and each agent still acts under its own grant | 5, 16 |
| T49 | A manipulated agent | Talk over a consent decision, or get around it: put words next to the prompt (also by saying them just before it comes up), tell the person to press Allow, or have them type "yes" and treat that as approval | While a prompt is showing or queued the Chat tab shows nothing an agent wrote: no transcript, no status note and no agent's name, only the surface's own line that chat is hidden until the request is answered. `chat.say` and `chat.status` fail with `E_BUSY`, status notes set before the prompt are dropped, and nothing can be typed or sent, so no agent's words stand next to a prompt and the chat cannot be taken for the answer. The same goes for what an agent draws outside the chat: toasts, highlight labels and its cursor's label are taken down when a prompt comes up (T73). A message changes no level, rule or scope and answers no prompt: the action still asks, with every argument shown (T14), and the cool-off and the three-refusals rule still count (T31) | 10, 16 |
| T50 | A manipulated agent, or a forged surface | Flood the chat: bury the person's view or an agent's context, or use up the hub's relay so that the person's own message reaches nobody | `rates.chat` per credential and surface at the hub; a message is at most 4000 characters and a status note 80; the room keeps 200 messages. At the hub each sender has a budget of its own for each agent that listens: the person's messages 5 a second after a burst of 10, which nothing an agent sends uses up, and an agent's words no faster than its own `chat` rate. A message of the person that the hub does not relay is put on record and told to the page, which shows it as not delivered. The adapter keeps 100 unread messages, announces them as one notice that is replaced, not repeated, and `read` removes from them only what it showed | 5, 16 |
| T51 | Another agent, or an agent without the scope | Read the transcript | Who may read a message is fixed when it is posted: nothing from before a grant, nothing said while the person had the agent's `chat` switched off, nothing addressed to another, and nothing another agent said unless the policy or the person lets the two hear each other (T48). The transcript is outside the UI tree, so no `observe` or `read` returns it, and the hub relays a message to the one grant it names. This is about agents. The page is not kept out: the driver's API hands the app no text, but the app and every script it loads can read the tab like any part of their own page (see "What Reins does not protect against") | 5, 10, 16 |
| T52 | A manipulated agent | Take what the person types: focus a field of the page while the person is writing in the chat, so that their next words, and the Enter after them, land in the app | Trusted input in the composer counts as the person using the page, so `ui.*` commands wait until they pause; when a command or an action moves focus while the person's focus is in the composer, the driver gives it back as soon as the command's synchronous part has run. Synthetic keys are never trusted, so none sends a message | 11, 16 |
| T53 | A reader of the audit log | Learn what was said in the chat | The log holds the length of a message and a digest of it, keyed with the audit key where there is one, never the text; `chat.read` and `chat.status` leave no record of content at all. What a surface relays against the hub's policy is dropped and recorded as refused, within the bound that holds for dropped messages | 13, 16 |
| T54 | A hostile hub in front of a page that holds no key | Sit in the chat as a trusted voice ("Your bank"), or forge the person | The attach still needs the person's approval, with the warning (T8). The Chat tab repeats that the hub is unverified, every message of an agent is captioned "AI agent", and the driver takes no event from the hub, so nothing the hub sends becomes a message of the person | 4, 10, 16 |
| T55 | A local process that poses as the page (T5), or hostile script in it | Speak to the agent as "the person at the page": to turn page data into instructions, or to reach what the agent's operator can do | The adapter names a page that proved no key as "a page the hub did not verify" on the first line of every chat result, and says what a person's message is: a request about that page, to be carried out with the Reins tools within the grant, not the operator speaking. The shipped subagent has eight Reins tools and no others, cannot attach, and reports back counts and codes, never chat text, so that nothing a page's person wrote enters the operator's session. `chat-serve` refuses to serve an unverified page unless `--allow-unverified` is given, tells the command whether the page is verified, writes every message behind a header line of its own on lines starting `\| `, and ships a preface that says the person at the page is not the operator. None of that restricts what the `--exec` program is able to do (see "What Reins does not protect against"). Surface keys (T5, T27) are what makes "the person at the page" mean the app's own page | 4, 14, 16 |
| T56 | Whoever writes a chat message | Run a command through `chat-serve` by putting shell syntax in the message, or leave something running with the grant when a run is cut off | The runner writes the message to the command's standard input and nowhere else, starts the command from an argument array without a shell, and passes only ids and addresses in the environment. Which file the command is, it settles before it takes a message and prints: a bare name is looked for in the folders of `PATH` and never in the working directory. One message and one run at a time. When a run is over (the command exited, took too long, or the runner was stopped) what the command started is ended with it: on Windows everything in the job object the command was put into, which allows no breakaway and so holds every process started below it, whether or not its parent is still there; elsewhere the process group. What a command left running when it exited is ended and told to the operator, and the runner takes no further message until all of it is gone; when it cannot be ended, or the runner cannot find out whether anything is left, it stops. On a Windows machine where no job object can be made, no command is started. What stays out of reach is listed under "What Reins does not protect against" | 8, 16 |
| T57 | A local HTML file, or any other page loaded from `file://` | Pose as an Electron app's window to receive the commands meant for it: by connecting to a hub that admits `file://`, or by getting into the app's own window (a link, a dropped file, a redirect) and asking for that window's in-process link | Every file page has the one origin `file://`, so neither an allowlist nor a window can tell them apart by origin. `*` never admits it, and the hub warns at start when its socket admits `file://` without requiring a key. In-process, a window is registered for a URL (`allow(window, { url })`), checked against the URL Electron reports for the frame when the page asks; a window that shows a file is not linked without one. Such a hub closes its socket to surfaces (`surfaceSockets: false`). Where a socket has to be used: a surface key, or a scheme of the app's own in place of files | 4 |
| T58 | A page that is not on a web origin (a file, another app's scheme, an opaque origin), or a sandboxed frame on any website | Be admitted by a hub whose operator wrote `*` and meant web pages, or by an entry `null`, and then claim to be an app at a `file:` or app URL | `*` matches web origins only. `file://`, an app origin and `null` are admitted only by an entry that names them, and the origin of a URL is computed the same way in every engine, not taken from a URL library. `null` is the origin of every sandboxed frame: the hub warns at start when its socket admits it without requiring a key, `reins-electron` never takes it from a page as the origin to admit, and the documents say not to list it (see below) | 4 |
| T59 | A page inside an Electron app: a frame in the window, a fenced frame, a `<webview>` guest, another window, a window nobody sees | Obtain the window's link to the broker, pass a port of its own off as that link, cover the prompt of a guest it embeds, or be attached to where no person can see the prompt | The main process answers only the frame the window's contents report as their main frame (a frame without a parent that is not it, such as a fenced frame's root, is refused), of a window the app registered, under the origin Electron reports and never one the page states; a `<webview>` guest only if the app registered it as embedded; an offscreen or background page never; a window that is not shown only once it is shown, unless the app registered it to be driven unseen. The preload refuses to work without context isolation. The page takes a port only from a message its own window posted, for a token it made | 4, 10, 11 |
| T60 | A local process | Connect to the debugging port of an app that was started with one, take the app over, or press Allow on a prompt itself; or feed `reins-electron` more than it can hold through the debugging connection | `reins-electron` starts an app with a debugging pipe, which has no port. A port is used only when asked for, only on a loopback address, and the command says what it means; an app it started with a port is closed over that port when the command ends, by the command or, when it was killed, by a watcher process, so that the port does not outlive it: both know the app by its port, whichever process it has become (the executable may be a starter, the app may start itself again), and neither ends a process by its id. A page adopted through a port is never listed as verified and gets no surface key (T62). A message over the debugging connection is bounded (256 MiB), and nothing the app sends there throws. Against a process that does reach a debugging port there is no defence (see below) | 1 |
| T61 | The own scripts of a page in an adopted app (an XSS payload, a third-party script) | Reach the driver that was loaded into the page, write frames on its channel, read a surface key, or stand in for the driver at the hub | The driver runs in a world of its own, named afresh for each run: the page's scripts share the document with it and nothing else. The function that carries its frames exists in that world only, a call of it from any other context is ignored, and a surface key never enters the page's world. The hub that `reins-electron` hosts takes no surface over its socket, so the page's scripts cannot register there. At a hub elsewhere they can, unless that hub requires a surface key: the command warns when it joins one without (see below) | 8, 10 |
| T62 | The process that carries an adopted page's frames (`reins-electron`), or one that takes its place on the way to a hub | Alter the frames, state another origin for the page, or carry them to a hub somewhere else | To the hub it hosts, that process is the embedder: the link never leaves it, and it counts as verified because the person started it and it holds the debugging connection alone, which is true of a pipe. Through a debugging port any local program can speak on the same link and type and press in the page, so the command vouches for no page it adopted that way: the hub lists it as unverified, the page's prompt says "Unverified hub", and `chat-serve` does not serve it unless told to. To a hub elsewhere the page treats the hub as unverified unless it holds a surface key; with one, the session is sealed from the page's world to the hub, through the relay. The hub sees an `Origin` that a local process wrote either way, which `requireKey` is for (T5). The command dials a hub only on a loopback address | 2, 4 |
| T63 | An agent that was allowed to attach to an adopted app | Do through the app's own buttons what Reins would ask about, or what the app itself asks its user about: press Send, Delete, or the button with which the person approves a tool call of an app that is itself an agent | Nothing, by design: an adopted app declares no actions, and the `ui` scope is the mouse and the keyboard on every exposed control. The documents say so where the command is introduced; `--scopes` adopts an app without `ui`; and where an app can carry a plugin, the plugin exposes named actions and nothing of the page (the Hermes Desktop plugin: no `ui` scope, `exposure: none`; `prompt.send` and `prompt.draft` are dangerous actions, so each asks under Strict, Ask and Auto alike and shows the whole prompt or is refused, and only the person's Bypass, or their rule Allow for one of the two, lets a prompt through unasked) | 9, 12 |
| T64 | The driver that `reins-electron` loaded, after the command has gone | Stay in the app as a live surface: an agent that attached keeps driving, and new ones can ask, with nothing running that the person started | A command that stops tells every document to disconnect for good, whatever carries its frames, and takes its script out of documents to come. A command that is killed is missed: each document holds a lease that the command renews every 2 s. Once it has not heard the command for 10 s it hands its driver no frame and sends none, asks once, and stops the driver for good when the command stays silent (about 15 s after its last sign of life). That is decided by the clock when a frame arrives or is to leave, not by a timer: a script of the page can clear every timer of its document, the driver's world included | 11 |
| T65 | A tab that an adoption matched, after it navigated elsewhere | Be adopted where it went (`--match` names a web app; the tab is now on another site) | `--match` is asked of every document with its own URL, not once of the tab; a document that does not match is told to stop and gets no link. It is an origin or a URL prefix, compared as URLs: a document on another site does not match because its address repeats the text. What the command prints about pages is their origin, never a URL | 4 |
| T66 | A background conversation in an app that is an agent (the Hermes Desktop plugin), the end of an answer to the person's own message, or a second agent attached to the same window | Put its text into the reply another agent reads as the answer to its prompt; or read the reply to another agent's prompt | `reply.read` takes only events that name a session, and only the session the prompt went to; `prompt.send` is refused when the app does not say which conversation is in front, while a turn is under way there, and when the app gives no sign of whether one is. The reply is held to the agent whose prompt it answers: it is given by an action that knows its caller, not by a state, and forgotten when that agent's grant ends | 14 |
| T67 | Script in the page (a third-party tag, an injected payload) | Answer a prompt or raise a level in the person's place with an event it makes or borrows: replace `EventTarget.prototype.addEventListener` to collect the overlay's listeners and call them with an object that says `isTrusted: true`; hand a control's listener a real click the person made somewhere else; replace the clock and the timers to cut an arming delay short | That much is closed. The driver keeps, from the moment its script first runs, the functions it registers listeners, builds elements, attaches its shadow root, sets timers and reads the clock with, and every element of the overlay carries its own non-writable `addEventListener`. `isTrusted` is read only through the getter the browser defines on the event itself, and an event counts only while the browser is delivering it to the control the listener belongs to. **Nothing else about script in the page is closed, and the order in which it and the driver load does not matter.** The driver is ordinary script in the page's own JavaScript realm. The second review approved prompts with no input at all by replacing `Array.prototype.push`, set Bypass by replacing `Map.prototype.get`, and reached the closed shadow root through `Element.prototype.setAttribute` and then borrowed the person's click, each from a script injected after the driver had attached. Such script is outside what Reins defends against (below). A real boundary exists where the driver has a realm of its own: an app adopted by `reins-electron` (T61, T75) | 10 |
| T68 | The page's stylesheet alone: CSS the app loads from elsewhere, or an injected `<style>` | Change what the person reads in the indicator, the panel or a prompt, with no script: set or register (`@property`) the custom properties the overlay took its colours from; define a font under a name the overlay used; set `direction`; give the host element `::before` or `::after` boxes that lie over the prompt, also only while it holds the focus; shrink the overlay to a dot with `zoom` while the page looks as before; render nothing at all; put a filter, an opacity, a transform, a clip, a mask or a blend mode on `html`; or lay something over the overlay that clicks pass through | The overlay's stylesheet reads no custom property, names only generic font families, which no `@font-face` can redefine, and no system colour; the host resets every property, pins `direction` and `unicode-bidi`, and has no `::before`, `::after`, `::marker` or `::backdrop` that a page rule can bring back. Where the browser has the Popover API the host is in the top layer and is shown again whenever something enters it later, so that no effect on an ancestor and no `z-index` reaches it. `check()` fails when such an effect does reach the host, when a `zoom` reaches it (top layer or not), when nothing is rendered, when the host is not last in the top layer, when the indicator is not what a hit test finds, and, where the browser can tell (IntersectionObserver v2, in Chromium), when the indicator, the open panel or the prompt that is showing is painted over. While it fails, commands that change the page and attach are `E_PAUSED`, no click is taken on Allow or on anything else that lets an agent do more (the chat's switch among them), and the person is told afterwards why a click was not taken. A click that makes the check put the overlay back on top is itself not taken. `scripts/browser-check.mjs` runs each of these in Chromium and compares the overlay pixel by pixel. What is left where a browser lacks the Popover API or the visibility observer, and what the observer does not watch, is listed below | 10, 11 |
| T69 | A manipulated agent, behind a hub whose policy asks about more than the app's does | Have the hub's confirmation waived by one honest click: the panel knows only the app's policy, shows the action as running without asking, and takes Allow as a change that waives nothing; or have that click end the grant | The hub sends its decision for each action with every attach. The panel and the surface reason from the stricter of the two, and take a hub that says nothing as one that may confirm anything; the surface holds the hub to what it said. The rule Allow always takes the armed confirm step, which says that it answers the hub's prompt. Where no level on offer would waive what the hub asks, Allow is switched off and says why, and a rule the hub would not honour changes nothing there and ends nothing (T42) | 6, 15 |
| T70 | A manipulated agent | Time a request so that keys the person is typing for the page answer it. The prompt takes the focus: their Tab and Enter, a name and password typed without looking up, or Tab, Enter, Tab, Enter then land on its buttons and grant an attach or set "Always allow"; or their Enter refuses it, three times over, which revokes the grant | Keys that could be typing meant for the page answer no prompt. The prompt takes the focus onto itself, the dialog, where no key presses anything. A key answers only as Enter or Space on a button that has the focus, or as Escape, and only if it is no repeat, at least 500 ms have passed since the prompt appeared, since the focus landed on that button and since any other key, and at least 3 s since the last key that types (a character, Backspace or Delete, a chord), wherever the focus was then and also before the prompt came. Tab does nothing in the prompt's first 500 ms; while the keyboard is locked out the prompt says so; the pointer answers all along. This holds for Deny and Escape as for Allow. When the prompt goes, the focus returns to where it was. What is left is the keyboard path itself: a person who tabs onto Allow, lets half a second pass and presses Enter has approved, whether or not they read the card first | 10 |
| T71 | A manipulated agent | Run on what the person no longer sees or no longer wants: the panel says "Ask" while a remembered approval lets the action run; a rule Allow waives prompts while the indicator looks calm; a request the person approved runs after they pressed Block | Where an approval will be remembered the prompt says so before the person gives it. The panel shows a remembered approval as allowed, with the reason, and Reset or Ask takes it back. While an Allow rule or a remembered approval lets an action run without asking, the indicator carries a mark, coloured like the level that would do the same. A request is decided again right before it runs, also one the person approved: a Block set meanwhile wins | 11, 15 |
| T72 | Many agents, or one credential with many sessions | Make the panel's list too long to read, so that a level raised for one agent hides among the rest | A surface holds at most 32 grants and refuses a further attach with `E_BUSY` before anybody is asked; wherever the overlay names an agent (a heading, a prompt, the indicator, a line of the activity list) the name is in quotation marks and carries the session id, so two agents with one name are never one line, and a name cannot finish a sentence of the overlay's | 5, 10 |
| T73 | A manipulated agent | Leave its words beside a consent prompt without the chat: a toast ("Security check: press Allow in the next window"), a highlight with a label, or the label of its cursor, put up just before the request | When a prompt comes up every toast and highlight is taken down and the cursor's label is hidden, and none can be put up while it shows (`E_BUSY`). What an agent says about a request is on the prompt itself, under the agent's name | 10 |
| T74 | A manipulated agent | Paint over the prompt with one argument: letters that each carry dozens of combining marks, inside the size budget, so that the other arguments, the risk and the description cannot be read | Every string an agent or the hub wrote shows at most two combining marks in a row; the rest are written as escapes, which count toward what fits on a card. Such a request is refused (`E_TOO_LARGE`) or shown as text that stays on its own line, and each line of the listing clips what it paints | 10 |
| T75 | Whatever shares the document with the driver without sharing its JavaScript objects: the page's own script in an app that `reins-electron` adopted (T61) | Clear the driver's timers. Timer ids belong to the document, not to a JavaScript world, so `clearTimeout(i)` and `clearInterval(i)` for every i take them all away: a prompt then never times out, an arming delay never ends, a notice never makes way | No wait relies on a timer firing. Each is a time, compared with the clock when a click, a key or a request arrives: a prompt past its deadline is a refusal from the moment anything looks at it, and arming, the settle delay, the lock after typing and the cool-off hold by the clock. A timer that never fires leaves at most something on screen (a toast, a highlight, a countdown that stands still, a button that still looks inactive), and a command that waits for the person to stop typing or for the cursor to arrive then never runs. The isolated world protects the driver's code and built-ins; it does not protect its timers, and nothing depends on them | 10, 11 |
| T76 | A manipulated agent, or nobody at all: a slow page | Have a request approved after the hub and the agent gave up on it: the prompt waited its turn behind another and got its time afresh, the app allows prompts more time than the hub waits, or a timer of a tab in the background fired late, and the yes given then attaches an agent or runs an action nobody waits for | A request's time runs from when it reached the page, never longer than the hub's own wait (the shorter of `consent.timeoutMs` and the `consentTimeoutMs` of `welcome`), and is read from the clock when the person answers. A prompt whose time is up before its turn is not shown. `detach` withdraws the request that is pending for an agent, also one an app's own consent handler is still asking about. Where the request can wait it is not lost: it joins the waiting list, inside the hub's wait (T77). What is left is a request that reached a page that did not run for longer than `reqTimeoutMs`: listed below | 10 |
| T77 | A manipulated agent | Use the waiting list against the person: fill it until a real request has no room or cannot be found, throw one prompt after another by having each put off, or keep a request waiting for good | The list holds 3 requests of one agent and 12 in all, and an entry ends after `consent.waitMs` by the clock, with or without a timer. One request is one entry: the same agent sending the same action and arguments, or the same attach, again gets its ticket back and the person sees nothing new. A prompt nobody answered and one put off with "Later" move the cool-off as a timeout does (T31). At the cap a prompt has no "Later" and ends as a refusal. The list shows who asks, for which action and at which risk, never arguments or an agent's words: those are on the prompt that Review opens, under every rule of a prompt. An agent's entries end with its grant, a replacing attach of its own included, and it is told `expired`; Stop empties the list with `deny` | 10, 11 |
| T78 | A manipulated agent, or another agent on the same hub | Run a request on an approval that is not its own: guess a ticket, replay one that was used, use one that another agent was given, or use its own for another request (the person approved a transfer of 5 and it sends 5000, or approved one action and it sends another) | A ticket is 16 bytes from the browser's CSPRNG and is no credential by itself: it names an entry only for the agent session the entry belongs to (for an attach also the same credential, where the hub said which), and only for a request that is the same as the one the person saw: the same action and arguments that are equal as canonical JSON, or the same scopes. An approval is used once, is not remembered, ends with the entry, and outranks neither a policy `deny` nor a Block the person set meanwhile. Any other ticket names nothing, and the request is put to the person like one without a ticket. The ticket is not in the page's DOM | 10 |
| T79 | An app that offers too much, or a manipulated agent that talks the person into ticking | Turn the attach prompt into a way to get standing permissions: boxes ticked for the person, a long list nobody reads, a tick that takes effect unseen, or an offer of what the person could never allow in the panel | Offers are the app's (`human.offer`, at most 8 action names): an agent cannot add one or word one. No box is ever ticked for the person, ticking is taken like a press on Allow (not on a card that has only just appeared, not while the overlay cannot be relied on), and a tick alone changes nothing: with any box ticked Allow opens a second step that names the agent and exactly the ticked actions and says that they run without asking, with any arguments, and for how long; only its button, armed anew, grants. An action is offered only where the rule `allow` could be set in the panel, so never one a policy denies, never a dangerous one without `bypass` on offer on both sides, and nothing that what the person tightened before forbids (T39). A Block or an Ask the person sets wins over an offer at every moment, also one they ticked and approved in the waiting list before setting it: the ticketed attach sets no rule for that action, takes none away, and the activity list says so. The rules show on the indicator, are reported to the hub before any action runs under them, and are taken back in the panel | 10, 15 |
| T80 | A manipulated agent | Go on running an action unasked after the time the person gave it: the timer that ends a rule for a time never fires (T75), or the clock is read too late | A rule `allow` for a time carries its end as a time, compared with the clock before every decision that could rest on it and whenever a request arrives: past it the rule is gone, the action follows the level again, and the hub and the agent are told as for a rule the person removed. The indicator and the panel show when it ends. The time is the app's (`human.allowMs`), not something the confirm step lets anybody type | 15 |
| T81 | A manipulated agent, or a loop gone wrong | Run an action that a rule or a level lets pass far more often than the person had in mind when they set it: a hundred orders, a prompt to another AI every few seconds | `human.burst`: at most `max` runs of one action by one agent whose prompt was waived, within `perMs` (20 in 10 minutes under `guarded`); the next call asks, in the surface's own words, with the count and what let the action run, and only Allow on that prompt starts the count again. The count is per grant and action, kept by the surface, and an agent's words are not in the prompt. An action that needs no prompt at all is not counted: the hub's rates bound those (T16) | 10 |
| T82 | A manipulated agent | Use the app's own alerts to nag or to carry words: make the taskbar flash again and again, or get text of its own into a notification through `on('attention')` | The event holds two counts, prompts showing or queued and requests waiting, and nothing an agent wrote: no name, no action, no reason. It fires only when a count changes, and what moves the counts is bounded: one prompt per agent and four in all, the cool-off after every prompt that was not approved (a prompt the agent withdraws by leaving or attaching again counts as one), and the caps of the waiting list. The driver itself changes nothing of the page for it, not the title and not the icon; what an app shows on it is the app's | 10, 11 |
| T83 | A manipulated agent | Get something out of the moment after a refusal: a second prompt under the pointer that just pressed Deny, or a notice that takes the person's next click | The notice after a refusal is no prompt: it holds nothing back, takes no focus and has no text field, its two buttons only tighten (Block) or lead to the chat, ignore clicks for their first 500 ms, and it is taken down the moment a prompt comes up. The next prompt of that agent waits out the cool-off (T31) | 10 |
| T84 | A manipulated agent, or another agent on the same hub | Use a ticket at the hub that is not its own: one read in the audit log or heard in the chat, one given to another session of the same credential, a used or lapsed one, or its own for another action or for an attach | The hub keeps each ticket it relayed with the agent session, the surface and the request (the action, or the attach) it was given for, and refuses any other `tk` with `E_BAD_ARGS` before the request reaches the surface, in the same words whether the ticket is unknown, another's, used, lapsed or for another request. A ticket is used up the moment its check passes, before the hub awaits anything, so of several repeats with one ticket at once exactly one is forwarded, as the surface uses an approval once (T78). The hub keeps at most 3 tickets of one session on one surface and 16 in all, and over that answers `E_BUSY` instead of forgetting one. An agent on 0.1 is given no ticket, and no `tk` of its is one; a surface on 0.1 gives none. The audit log carries the ticket, which names nothing without the session it was given to | 6, 13 |
| T85 | A hostile or mistaken surface | Make the hub tell an agent something through a request that waits: an `E_WAITING` with a made-up ticket, extra fields or no time; an `answer` for a ticket it never gave, for another agent, for another request than the ticket's, or a flood of them; a waiting entry for an agent that can never come back | An `E_WAITING` is relayed with `{tk, ms}` and nothing else of its data, and one without a well-formed ticket and time, or on a method that cannot wait, is a bad answer (`E_INTERNAL`). An `answer` is taken only for a ticket the hub keeps for that agent and that request, recorded with it and relayed to that agent alone, built from the checked fields; any other is recorded as refused, within the bound on `person` records, and dropped. The hub sends `v`, the agent's protocol version, with every `attach`, and withdraws at once a waiting attach of an agent on 0.1 (T86) | 13, 16 |
| T86 | A request nobody waits for any more | Stay in the surface's list, or on its prompt, after the agent has gone or the hub has given up on it: approved later, it gives the page a session or runs an action for nobody, or for an agent that was told `E_TIMEOUT` or `E_CONSENT` | When an agent whose attach waits leaves the hub, and when the hub stops waiting for an attach the surface did not answer, the hub sends the surface `detach {why:"hub"}` for that agent (T32); the surface then drops its prompt and its entries. An agent on 0.1, which the surface should keep out of its list (`v`), has such an attach withdrawn the moment it is answered `E_WAITING`. The hub cannot withdraw a single action (below) | 8, 13 |
| T87 | A rule the person ticked on the attach card, reported right behind the attach answer | Arrive at the hub before the hub has taken the answer in, over a link that delivers both in one turn, and be dropped as a report for a grant that does not exist, so that the agent runs under a rule the hub never recorded | A report of a level, a rule, a scope switch or a relay switch for an attach the hub is waiting on is kept, up to 32 per attach, and handled once the grant is recorded, as if it had come after, as one change of the person's, so that the replay does not trip the bound on live changes and end the grant just approved; an attach that ends without a grant drops them | 13 |

## What Reins does not protect against

- **Script in the page's own JavaScript realm.** An XSS payload or a malicious
  third-party script runs with the app's authority and in the same realm as the driver.
  It can defeat the overlay, whatever the order in which it and the driver load, and
  wherever these documents and the specification say "trusted input only", such script
  is outside that claim. What the driver does about it (T67) closes one family of
  attacks, events that a script forges or borrows and hands to the overlay's listeners.
  It closes nothing else:
  - *The driver's own data.* The driver is ordinary script. It queues prompts in an
    array, keeps sessions in a map, and sets attributes and reads properties through
    methods any script can replace. The second review, from a script injected after the
    driver had attached, approved an attach and an action with no card on screen and no
    click (a replaced `Array.prototype.push` was handed each prompt), put a session at
    Bypass with nothing shown and nothing told to the hub (a replaced
    `Map.prototype.get` was handed the session), and reached the closed shadow root
    through `Element.prototype.setAttribute` and the `activeElement` getter, hid the
    card, and let the person's own click on the page land on the real Allow. Loading the
    driver first does not prevent any of this, and an earlier version of this document
    that advised it was wrong to suggest that it would.
  - *A copy.* Any script can draw its own indicator, panel or prompt in the page, or
    hide the page's own content, and a person cannot tell a copy from the real one by
    looking.
  - *The app's functions.* Script that can call the app's own code does not need the
    agent, the prompt or the panel at all.
  Keep a strict Content Security Policy: what must not happen is hostile script in the
  page. Where that cannot be ruled out and the app is an Electron app, adopt it with
  `reins-electron` instead of embedding the driver: there the driver runs in an isolated
  world, with built-ins of its own, and the page's script shares the document with it
  and none of its objects (T61). In that setting what the page's script can still do to
  the overlay is what the page's stylesheet can do (T68), plus three things: remove or
  move the host element, clear timers (T75), and keep the person's clicks and keys from
  reaching the overlay at all, since a capturing listener on the window sees every event
  before anything inside the overlay does. The first two stop commands or leave a prompt
  unanswered. The third takes Pause, Stop and Deny away from the person for as long as
  the script does it, while the indicator still shows; nothing in the page can tell. None
  of the three answers a prompt or raises a level. The chat has a paragraph of its own
  next.
- **A request approved from the waiting list runs later than it was asked.** The person
  approves what the card shows: the agent, the action and every argument, as they were
  asked up to `consent.waitMs` (10 minutes) earlier. The page may have changed since, and
  an action whose meaning depends on what is on the page ("submit the order" with no
  arguments) then acts on what is there when the agent asks again. An app whose actions
  are like that should give them arguments that say what is meant, or set
  `consent.waitMs` to 0.
- **A prompt on a page that did not run.** A request that reached the page more than
  `reqTimeoutMs` late, because the page did not run for that long, gets its prompt after
  the hub answered the agent `E_TIMEOUT`. The hub withdraws an attach it stopped waiting
  for; it cannot withdraw a single action, so an action approved on such a prompt still
  runs. The hub drops a page that is silent for 2.5 x `heartbeatMs`, which bounds this.
- **What an app offers.** `human.offer` is the app's choice. An app that offers a
  sensitive action at every attach makes it one tick and one confirm away from running
  unasked for the whole grant. The person sees exactly that on the second step, but an
  app should offer only what its users would set in the panel anyway.
- **A browser without the top layer or without the visibility observer.** Against the
  page's stylesheet (T68) the overlay relies on three things, and not every browser has
  all of them. Its own stylesheet (no custom properties, generic fonts, pinned
  direction) works everywhere. The top layer needs the Popover API (Chrome and Edge
  114, Safari 17, Firefox 125): without it the host is an ordinary fixed element, a
  filter, opacity, transform, clip, mask or blend mode on `html` or `body` does reach
  it, and `check()` is what is left. That check reads computed styles and does a hit
  test, so it stops commands and loosening clicks while such a style is in force; it
  does not undo the style, and the person sees a recoloured or missing indicator until
  the page takes it away. A page that puts `zoom` on an ancestor of the overlay, for
  whatever reason, fails the check for as long as it does: Reins does not drive such a
  page. Being told that something is painted over the overlay without taking clicks
  needs IntersectionObserver v2 (`trackVisibility`), which only Chromium has, and there
  it is asked about three things: the indicator, the open panel and the prompt that is
  showing. It is not a statement that nothing is painted over anything: a cover the
  observer is slow to report (it answers within a few hundred milliseconds), or one over
  another part of the overlay, is not noticed by it. Elsewhere a cover goes unnoticed
  when the document does not list it: a layer with `pointer-events: none` over a host
  outside the top layer, or a popover that a script opens inside a closed shadow root of
  its own after the driver's. The second takes script (above); the first is open to CSS
  alone in a browser that has neither API. What holds in every browser: a top-layer
  element the document lists is found by the check, and the click that finds it is not
  taken.
- **The page reads and alters the chat.** The chat lives in the app's own page. The app,
  and every script it loads (a third-party tag, an XSS payload), can read what the person
  types in the composer, read the whole transcript, and replace what the person sends. A
  listener on the window is given every key before the driver is; the browser's editing
  and selection commands (`execCommand`, `getSelection`, `window.find`) reach into the
  closed shadow root; and text such a command inserts arrives as trusted input. The
  independent review confirmed each of these in Chromium. The closed shadow root, the
  trusted-input checks and an API without the text keep agents out. They do not make the
  chat secret from the page, nothing inside one document can, and earlier versions of this
  document that said otherwise were wrong. Treat the chat as you treat any field of that
  page: what the person types there, the app can have. The driver stops the events of
  typing and editing at its tab, so that listeners a page registered in the ordinary way
  (hotkeys, analytics) do not record them; that is hygiene, not a wall.
  **The fix that was not taken** is the tab in a browsing context of its own: a frame
  from another origin, or a window that belongs to the browser or to an extension, which
  the page's script cannot enter. It needs a second origin to be served and trusted and a
  channel between that origin and the driver, and Reins does not have it.
- **A process running as the same OS user.** It can read the token file, the file of a
  running shell session and the browser's memory, and it can replace the launcher that
  agents run. On a kiosk, run the hub as a separate service account, and start it with
  `--no-announce`: nobody there needs the launcher.
- **A Reins folder that someone else can write.** The hub creates `~/.reins` for the
  current user alone, but it does not take a folder back that already exists with wider
  permissions. Whoever can write there can replace the launcher, which agents run with
  the user's rights, or point agents at another token file.
- **A surface key that the attacker can read.** A key served to a web page is readable
  by anyone who can fetch that page. It only authenticates the hub to the page, and
  the page to the hub, where the page's source is out of the attacker's reach: a
  packaged kiosk app, not a page any local process can download. The demo serves its
  key over loopback for convenience and says so.
- **A page that chose to run inside a frame.** With `policy.framed` the driver connects
  in a framed page, and it cannot see what the embedding page draws over the prompt or
  the indicator (T35). Set it only for a page whose embedders you control, and enforce
  that with a `Content-Security-Policy: frame-ancestors` header. A page that is never
  meant to be framed should send `frame-ancestors 'none'` in any case, as the demo does.
- **Whoever holds an app's debugging connection.** `reins-electron` adopts an app through
  the DevTools protocol, and that protocol is total: its holder reads every page, runs any
  script, and sends input that the page receives as trusted, so it can press Allow. The
  consent prompt protects the person from the agent. It does not protect the app from
  the program that loaded the driver, and nothing in a page could. The same input opens
  the panel, raises a permission level and types in the chat as the person. A debugging pipe keeps
  that power with `reins-electron` alone. A debugging port (`--remote-debugging-port`,
  `--debug-port`, `--attach`) hands it to every program of every user on the machine that
  can open a loopback socket, for as long as the app runs. Use the pipe; treat an app
  that was started with a port as controlled by all of them. Reins says so where it
  can: a page adopted through a port is never listed as verified, its prompt says
  "Unverified hub", and it is given no surface key. An app that the command started with
  a port is closed over that port when the command ends or is killed. What is left: an
  app that is asked to close and stays (the command reports it), and a watcher that is
  itself killed in the seconds it needs (nothing reports that). The pipe has neither.
- **Pages from `file://` on a socket.** A hub whose allowlist names `file://` admits
  every local HTML file: an attachment the person opened in a Chromium browser connects
  as a surface with the same origin as the app (T57). Reins makes this something you
  have to write down (`*` does not cover it) and offers the ways around it: the
  in-process port with `surfaceSockets: false`, a scheme of the app's own, or a surface key.
- **An agent with `ui` in an adopted app.** Adoption gives an agent the window, not a
  list of actions. After the one Allow at attach it presses whatever a person can press
  there, and Reins asks about none of it: "Send", "Delete", and, in an app that is itself
  an agent, the approval of that agent's tool calls. Adopt an app for an agent only when
  that is what you mean; otherwise adopt it without `ui` (`--scopes observe,chat`), or
  give the app a plugin that declares actions.
- **`null` in an allowlist.** Every sandboxed frame on every website sends
  `Origin: null`, and a connection with that origin may state any URL that has no web
  origin. A hub whose socket admits `null` without requiring surface keys admits any of
  them as any app. The hub warns at start; do not list it.
- **A hub joined without a surface key, from an adopted app.** With
  `reins-electron --hub` and no key, the hub admits the app's pages by origin, and the
  app's own scripts have that origin too. They can connect to that hub and register as
  the same app, beside the driver or in its place. The driver's own world does not help:
  the hub cannot tell them apart. Use the hub the command hosts, or a key with a hub that
  requires one.
- **A `<webview>` guest registered as `embedded`.** Like `policy.framed`: the page that
  embeds the guest can draw over its prompt and its indicator, and neither the guest nor
  its driver can tell (T59). Register a guest only when the embedding page is your own.
- **A page with no key, in front of a fake hub.** The page cannot tell. Reins makes
  the situation visible and never silent (T8), but the person still has to refuse
  the prompt.
- **Traffic confidentiality on loopback.** Frames are plain text on `127.0.0.1`.
  Sealing protects their integrity, not their secrecy: anyone able to capture
  loopback traffic or relay a connection can read commands and observations, and can
  cut the connection.
- **A relay that withholds the tail of one direction.** Injection, alteration,
  reordering, replay, and a drop followed by a later message are detected. Silently
  withholding the last messages of a direction is not: neither end notices until the
  heartbeat drops the silent peer (2.5 × `heartbeatMs`, 37.5 s by default), and a
  request waiting for an answer fails with `E_TIMEOUT` first.
- **Local denial of service.** A local process can hold the hub's 16 handshake slots
  or its port, or use up a surface origin's admission rate. Legitimate peers are then
  refused, never impersonated.
- **An audit log without a key or without an external head.** An unkeyed chain can be
  rewritten by anyone who can write the file. Truncation shows only against a head
  stored where that person cannot change it. Without a key, `args` is a plain SHA-256,
  so a reader of the log can confirm a guess of a low-entropy argument (a PIN, a
  quantity).
- **Activity that is not audited.** `cursor.*`, `show.clear` and pointer frames are not
  recorded, and so still flow while the log cannot be written. They are visual and
  change nothing in the app.
- **Remembered approvals.** With `remember: session` one approval covers the action
  name with any arguments for the rest of the grant. Only the `open` profile remembers
  by default.
- **A person who chose `bypass`.** Under `bypass` nothing waits for the person: the
  agent runs every action the policy does not deny, with any arguments, until the grant
  ends or the person lowers the level. `auto` is the same for everything the app did not
  mark `dangerous`. Reins makes the choice deliberate (a confirm step that lists what
  stops asking) and keeps it in sight (the indicator turns amber or red and names the
  level), and that is all it does. A deployment that must never run unasked leaves
  `auto` and `bypass` out of `human.levels`, in the app's policy or the hub's.
- **A standing rule covers any arguments.** The rule `allow` for `pay.send` allows every
  payment the agent sends for the rest of the grant, as a remembered approval does. The
  panel and the prompt say so when the rule is set.
- **`auto` trusts the app's risk labels.** It asks only about actions marked `dangerous`.
  An action that is destructive but marked `sensitive` or `safe` runs unasked.
- **A level set behind a fake hub.** With an unverified hub the panel and the confirm
  step repeat the warning, but as with attach (T8) the person decides. A level given to
  an agent that came through a fake hub is given to whoever runs that hub.
- **The hub hears of a level after the page applied it.** A page offers only what the
  hub's list allows, so only a forged or modified page reports more. The hub then ends
  the grant, but an action may have run in between; such a page is one the hub cannot
  hold to the app's policy in any case.
- **What the person set is in the audit log in clear.** Levels, scope lists and the names
  of actions with a rule are recorded as they are, like action names today.
- **Surface ids reveal a count.** Ids are sequential (`s1`, `s2`, ...), so an agent
  learns how many surfaces connected before the ones it sees. This is accepted.
- **Inherited permissions on Windows.** The hub restricts the files and directories it
  creates, but a parent directory that grants another user the right to change
  permissions, through inheritance, lets that user take the files back. Keep the hub's
  files under a directory only its account controls.
- **A model that is talked into a bad but permitted action.** Policy bounds what an
  agent can do. It cannot judge whether a permitted action was wise. Mark anything
  costly as `sensitive` or `dangerous`.
- **What the person tells an agent.** A chat message goes to the agent the person
  addressed, and so to whoever runs it and to the model behind it. The Chat tab says who
  is listening before the person types; it cannot say what that agent does with the
  words. Where agents hear each other (always under `open`; under `guarded` once the
  person switched it on) they hear what any of them says to all, and what the person
  says to all.
- **A surface speaks for its person.** The hub cannot tell what a person typed from what
  a page says they typed. A forged or modified page (T5, T27), and script inside the app
  (above), can send an agent messages "from the person". The agent is told when the page
  proved no key (T55), and a message is still only a request within the grant on that
  page; but a harness that gives the same model a shell or other tools has to keep a
  page's person apart from its own operator. The subagent in `integrations/` has no
  other tools for that reason, cannot attach, and reports nothing of the chat back.
- **`chat-serve` runs what you give it.** The `--exec` command runs as the operator's
  user, with their files, environment variables and network, and its input is a
  visitor's text. The preface asks a model to keep to the Reins tools; it restricts
  nothing. An agent with a shell behind `chat-serve` is a shell for whoever can write in
  that page's chat: the visitor, the page's own script, and with `--allow-unverified`
  any local program. Restrict the program, not the prompt: switch its other tools off, or
  run it under an account or in a sandbox that holds nothing of the operator's. The
  runner ends a run with what it started, and that is tidiness, not a wall. On Windows it
  is what the run's job object holds: every process started below the command from a few
  milliseconds after its start. Out of reach there: a process that a program outside the
  job starts on the command's behalf (a scheduled task, a service, WMI, an application
  that was running already), and one started in those first milliseconds by a child that
  had itself exited before the job took hold. Elsewhere it is the command's process group;
  a process that leaves the group on purpose (`setsid`, a daemon) is out of reach. And the
  helper that makes the job object is Windows PowerShell compiling a few lines of C#:
  where a policy forbids that, `chat-serve` starts no command at all.
- **Whoever can change the user's Reins folder, or the runner's environment.** The shell
  tools find the hub, the session and its bearer secret there, `REINS_CHAT_CONTEXT`
  tells a tool inside a run of `chat-serve` which session and page to use, and `PATH`
  decides which program a bare `--exec` name is. All of that is the operator's own
  account: a process that can write there is the operator already.
- **A model that takes a request in the chat too far.** The person's words are the
  person's request, also when they pasted something a page or a mail told them to paste.
  Policy and consent bound what follows from it, as for any request.
- **Short messages in an unkeyed audit log.** A chat message is recorded as a plain
  SHA-256 when the hub has no audit key. A reader of the log can then confirm a guess of
  a short message ("yes", "cancel my order"). Key the log (`--audit-key-file`).
- **Chat that is not on record.** `chat.status` notes are shown to the person and not
  audited, and the room's transcript is kept nowhere: when the page is closed, what was
  said is gone. An agent can also push old messages out of the room by writing 200 new
  ones, at the rate the hub allows.
- **Browser extensions** with access to the page.

## Browser access to loopback

A tab reaches the hub at `ws://127.0.0.1:7346`. What the browser allows depends on
where the page was loaded from. These notes were checked in November 2026 and browser
behaviour here is still changing, so test your target browser.

- **Page served from loopback** (`http://localhost:...`): no permission needed.
- **Page served from a public `https:` origin, Chrome and Edge**: `ws://` to an IP
  literal or `localhost` is exempt from mixed-content blocking, but Local Network
  Access applies. The user is asked to allow the site to reach apps on the device
  (permission `loopback-network`). Chrome announced WebSocket coverage for version
  147; expect the prompt. A cross-origin iframe also needs
  `allow="loopback-network"` from its embedder, and the driver connects inside a frame
  only with `policy.framed` (T35). Public pages on plain `http:` are
  refused without a prompt.
- **Firefox**: loopback counts as a secure origin for mixed content. WebSocket
  behaviour was not verified.
- **Safari**: has historically blocked `ws://127.0.0.1` from `https:` pages. Treat it
  as unsupported unless you have tested it. Serve the app from loopback, or use the
  in-page port transport.
- **Electron**: a page loaded from a file or from a scheme of the app reached
  `ws://127.0.0.1` without any prompt in Electron 44 and 45, and sent `file://` or its
  app origin as `Origin` (docs/ELECTRON.md has the measurements). The page's own
  Content Security Policy applies to that socket, also when the driver runs in a world
  of its own. A window that is linked over the app's port needs no network at all.
- **Managed devices and kiosks**: Edge documents the policies
  `LoopbackNetworkAllowedForUrls` and `LoopbackNetworkBlockedForUrls`, and the older
  `LocalNetworkAccessAllowedForUrls`. Chrome is reported to use the same names. Use
  them to pre-approve the kiosk app's origin so no prompt appears.

The driver reports a blocked or refused connection as `offline` and keeps retrying
with backoff. It never treats a failed connection as permission to skip policy.

## Relation to the Model Context Protocol

The MCP adapter follows the MCP security guidance for local servers:

- It speaks **stdio**, the transport the guidance recommends for local servers, so it
  opens no listening socket of its own.
- The shell tools give the same ten tools to an agent that has a shell and no
  registration. A grant ends with the agent's connection, so one process holds the
  connection between commands and listens on loopback for them (T36). It ends when
  asked, or after 30 minutes without a call, and the hub then ends the grant and tells
  the page.
- The hub, which does listen, binds loopback only, validates `Origin` and `Host`, and
  authenticates every connection.
- Session and surface ids are labels. Holding one authorises nothing.
- Tools carry annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`) so a
  host can ask its user before a call that changes the page.
- Only `reins_attach` attaches, so a tool marked read-only never raises a prompt on
  the page or obtains scopes.
- Text from a page or the hub in tool results is marked as data, by one rule for every
  tool (T44): what a page supplied sits on lines of its own behind `| `, alone or in a
  batch, with no control character left raw, and the shell tools print the same text
  character for character. The surface listing and the answer of `reins_attach` put the
  hub's own facts first and say `unverified` where a page proved no key. An error from an
  unfinished handshake is marked `[unverified hub data]`. The MCP
  specification asks hosts to keep a human able to refuse tool calls; Reins adds its
  own on-screen consent for sensitive actions, which holds even if the host does not
  ask.
- The scopes the adapter is started with are a ceiling. A model cannot ask for more
  in a tool call.
- What the person sets on the page (the level, a rule, the scopes) reaches the model as
  a notice: a line starting `[reins] ` at the start of the next tool result, before any
  page-data marker (T44). A notice holds no word the page chose: which actions the
  person's rules are for comes at the end of the result, as page data. It names the
  surface it is about, and says when the hub did not verify that page: a notice is true
  to what a surface reported, and a hostile page can report that the person lifted every
  prompt on it. What that changes is that page's own prompts, which were the page's to
  show or not in the first place; the hub's policy and the adapter's scopes do not move.
  No tool sets any of it.
- Chat reaches the model through one tool, `reins_chat`, as data: a line of the
  adapter's for each message that says who spoke, the text behind `| ` (T47), and the
  page named as not verified when it proved no key (T55). That messages wait is told by a
  notice with their number. A long-poll (`wait`) ends after 150 s at the latest, so a
  call never outlives the session or the harness that made it.
- `reins-tools chat-serve` hands a person's message to a program on standard input,
  without a shell (T56), marked as `reins_chat` marks it: a line of the runner's that
  says who wrote it, then the text behind `| `. It serves one page, refuses one the hub
  did not verify unless told otherwise (T55), takes one message and runs one command at a
  time, and ends a run with what it started as far as the operating system lets it be
  followed: a job object on Windows, the process group elsewhere, with the limits named
  under T56 and "What Reins does not protect against". What that program does with the text is its own business:
  if it is a model, it has to be told that the text is a request from a person at a page,
  who is not its operator. `integrations/chat-serve/preface.md` is such a text, and a
  text is all it is.
- A `reins_chat` `wait` whose caller has gone takes no message, `read` removes only what
  it showed, and while a `wait` is in flight the adapter keeps the grant in use, so that
  an agent that only listens neither loses messages nor its grant. Over the shell
  session a `wait` only shows the messages, and they are taken when the caller, with the
  answer in hand, says so: a caller that died in between took nothing.
- The shell tools end a hub (`down`, and `up` when it restarts its own) only when what
  listens on the port proves that it is a hub with the announced key and the process
  named in the announcement is older than the announcement: a stale announcement does
  not get another program ended. An option that a running session cannot take
  (`--scopes` among them) is refused, not dropped. And `up` prints the hub's warning
  about an allowlist that names no page (`null`, `file://`) itself, because the hub it
  starts writes to a log file.

The adapter is built on MCP TypeScript SDK 1.x, which negotiates protocol revisions
up to `2025-11-25`. The stateless revision `2026-07-28` needs a newer SDK.

## Kiosk deployment checklist

1. Run the hub with `--profile kiosk`, and create the driver with `policy: 'kiosk'`.
   The profile offers no permission level but `ask` and has no panel: a visitor cannot
   make the assistant ask less. Leave `human.levels` and `human.panel` as they are.
2. Give the app a surface key (`--surface-key <appId>=<file>`); the hub then demands it
   from any surface claiming that app id. Start the hub with `--require-key` as well,
   so that every surface without a key is refused. Ship the key inside the packaged
   app, not from a URL other processes can fetch. Check that the app is listed as
   `verified`.
3. Allow exactly one origin, the kiosk app's.
4. Give the agent credential a name, only the scopes it needs, and the origins it may
   attach to.
5. Annotate only the elements the assistant should see with `data-reins-id`.
6. Mark every action with the right risk. Add `actions` overrides for anything that
   must stay off whatever its risk tier says.
7. Run the hub under its own OS account, from a working directory and under parent
   directories that only that account controls. The hub restricts the token, key and
   audit files, and the directories it creates, to that account, and stops if it
   cannot. It refuses an existing secret file or audit log that others can use (POSIX) or
   restricts it again (Windows).
8. Pre-approve loopback access for the kiosk origin by browser policy.
9. Key the audit log (`--audit-key-file`), ship the log and its head off the machine,
   and verify the chain against the head on arrival.
10. Reset the app session whenever the assistant detaches.
11. A kiosk built with Electron links its window in-process (`reinsMain`) and starts its
    hub with `surfaceSockets: false`. Its allowlist then names the origin of its own
    window, an app scheme rather than `file://`, and nothing can pose as that window
    over the socket. Never ship it with a debugging port.

## Review

Version 0.1 had two adversarial reviews, by reviewers that did not write the code.

The first reported twenty findings, most with a proof against the running code.

The second was run on the fixes by four independent reviewers, one each for sealing
and the handshake; the driver; hub authorisation and limits; and the audit log, secret
files, the MCP adapter and the demo. They reported 35 findings, none high and six
medium, each with a proof against the running code.

Every finding of both reviews was fixed, except the limits listed under "What Reins
does not protect against". The fixes have regression tests; those of the second review
are named `R2-` and live mostly in `security.test.ts` in `packages/driver/test` and
`packages/hub/test`, in `seal.test.ts`, `link.test.ts` and `rpc.test.ts` in
`packages/core/test`, in `packages/mcp/test/mcp.test.ts`, in `packages/agent/test` and in
`examples/kiosk/test`. A few smaller gaps that turned up afterwards, while these
documents were brought in line with the code and when the tests first ran on hosted
Windows and Linux machines, were closed the same way.

Permission levels, per-action rules, scope switches and the panel (T38 to T45, rule 15;
now also T67 to T75)
were added after both reviews, and then had an adversarial review of their own, by a
reviewer that did not write the code: 23 proofs against the running code, and a page of
attacks in a real Chromium. It found that the panel could be defeated from the page and
that it did not always tell the person the truth:

- A script that loaded after the driver could collect the overlay's click listeners and
  call them with an object that said `isTrusted: true`, and so answer a prompt or raise a
  level (T67).
- The page's stylesheet alone could blank, recolour or cover the indicator, the panel and
  the prompts while the driver's own check passed (T68). The fix found one more way than
  the review had, `@property`, which defeats a custom property however it is set, so the
  overlay now reads none at all.
- The panel did not know what the hub confirms, so one honest click on Allow could waive
  the hub's prompt without a confirm step, and another could end the grant (T69, T42).
- A notice of the MCP adapter carried the name of an action, a word the page chose
  (T44).
- The panel showed "Ask" for an action that ran on a remembered approval, a Reset could
  loosen in one click, an approved request ran after the person had blocked the action,
  a click could fall through a card or a confirm step that went away onto a control that
  loosens, an Allow rule left the indicator unmarked, and an agent's name could pass for
  words of the panel (T40, T45, T71).
- At the hub, a flood of reports could keep a change of level out of the audit log, a
  value the hub's policy did not offer could be kept and relayed, and nothing bounded the
  number of agents a surface holds (T42, T72).

A review of the chat that ran alongside added that a prompt took the focus and did not
give it back, and that a key on its way to the page could answer it (T70).

All of these were fixed. The regression tests are in
`packages/driver/test/hardening.test.ts`, in the `review:` blocks of
`packages/driver/test/levels.test.ts`, in `packages/hub/test/levels.test.ts` and
`packages/mcp/test/notices.test.ts`, and in the conformance tests `LV-15` to `LV-26`; `scripts/browser-check.mjs` repeats the attacks on
the overlay in a real Chromium (`npm run test:browser`).

Those fixes then had a second independent review, by a reviewer that had written neither
the code nor the fixes: 31 tests against the running code, 19 of them proofs of a
finding, and a script of 25 attacks in a real Chromium, with real keys and clicks, of
which 18 worked. It broke three of the seven areas the fixes had changed, and showed
that this document claimed more than was true:

- Keys the person typed for the page still answered a prompt. Tab moved the focus to
  Allow, which restarted nothing; an arming time that started with the prompt had run out
  by the time a word and an Enter arrived; and Tab, Enter, Tab, Enter granted an attach
  and set "Always allow" (T70). No key now answers a prompt unless the person plainly
  means the prompt; the rule is in T70 and in section 12 of the specification.
- The page's stylesheet could still cover a prompt: `::before` and `::after` of the host
  element are boxes of the host, in the top layer with it, and a rule of the page gave
  them content. `zoom` on `html` shrank the overlay to a dot, and `html { display: none }`
  rendered nothing, while the check passed (T68). The host now has no generated box a
  page rule can bring back, the check fails under a zoom and when nothing is rendered,
  and the visibility observer watches the open panel and the prompt as well as the
  indicator.
- A click that made the check put the overlay back on top was itself taken. Such a click
  is now not taken; only a later one counts (T68).
- An agent shed Strict, a Block rule or a scope the person had switched off by attaching
  again. What the person tightened now stays with the agent for as long as the page
  lives, told by the id of its credential, and where the page cannot tell agents apart
  an attach that follows a tightening asks and says what stays (T39).
- An agent could leave a toast, a highlight or the label of its cursor beside a prompt
  (T73), paint over a prompt with combining marks (T74), and have the app's own code
  write into the chat composer through a view or a state getter (T46).
- Smaller ones: letting agents hear each other was taken while the overlay could not be
  relied on, and a hub that sent another `chatRelay` cleared the person's switch without
  a word (T48); the activity list named agents without the session id (T72); relays the
  hub refused left no audit record; the check on an app's theme stylesheet let through
  what it could not prove safe (T68); and a remembered approval showed no mark on the
  indicator (T71).
- This document said that script which loads after the driver cannot answer a prompt.
  The reviewer answered prompts with no input from the person at all, from a script
  injected after the driver had attached, by replacing `Array.prototype.push` and
  `Map.prototype.get`, and reached the closed shadow root through
  `Element.prototype.setAttribute`. That is not fixed and is not going to be inside one
  JavaScript realm: T67 and "What Reins does not protect against" now say exactly what
  is closed (forged and borrowed events through hooks on listener registration) and that
  nothing else about script in the page is, whichever loaded first.

The review of the Electron fixes added one finding that belongs here: timer ids belong
to the document, so in an adopted app the page's script can clear the driver's timers
although it shares none of its objects. No wait of the overlay or the driver now relies
on a timer firing (T75).

Everything but the last item of the list was fixed: of the 18 attacks that worked in
the browser, 16 no longer do, and the two that still do are the ones of that last item,
which replace built-ins the driver uses. The regression tests are the blocks
named `round 2` in `hardening.test.ts`, `levels.test.ts` and `chat.test.ts` in
`packages/driver/test`, `packages/driver/test/timers.test.ts`, the `round 2` block of
`packages/hub/test/levels.test.ts`, and the conformance tests `LV-27` to `LV-37` with
the rewritten `LV-6` and `LV-23`; `scripts/browser-check.mjs` now types real keys at a
prompt and runs the generated-box, zoom and `display: none` attacks in Chromium. What is
stated as a limit, in the rows named and under "What Reins does not protect against":
script in the page's own JavaScript realm, whatever the load order; the keyboard path
itself (a person who tabs to Allow, waits and presses Enter has approved, T70); pages
that set `zoom` on `html` or `body`, which Reins does not drive at all; that the
visibility observer exists in Chromium only and is asked about the indicator, the open
panel and the prompt, nothing else; and browsers without the Popover API. These second
fixes have not been reviewed by someone else. How the overlay is painted was checked in
Chromium on Windows only.

Protocol 0.2 then added, at the surface: requests that wait in the panel instead of
failing, offers on the attach prompt, a rule `allow` for a time, a rate cap on unasked
runs, a notice after a refusal, and the `attention` event (T76 to T83). It also took in
the surface's half of an earlier change that had not been merged: a prompt no longer
outlasts the request it stands for (T76). These have tests, in
`packages/driver/test/waiting.test.ts` and `timers.test.ts`, `packages/core/test/consent.test.ts`,
the conformance tests `CT-`, `WT-`, `OF-`, `RT-1`, `RC-1`, `AD-1` and `AT-1` with the
vectors in `consent.json`, and real-browser cases in `scripts/browser-check.mjs` for each
new control. They have not been reviewed by anyone but their author, and not run with a
model or with a person who did not know what to expect.

At the hub, the agent SDK and the tools, the same change added the ticket a waiting
request carries, its answer, and the request repeated with the ticket (T84 to T87), and
took in the hub's half of that earlier change: an attach the hub stopped waiting for is
withdrawn at the surface (T32, T86). The hub keeps every ticket it relays with the session
and the request it was given for, and refuses any other before the surface sees it; a
surface's `E_WAITING` and `answer` are relayed from their checked fields only; and a report
that arrives for a grant the hub has not yet recorded is kept until it has. These have
tests in `packages/hub/test/waiting.test.ts`, `packages/agent/test/waiting.test.ts`,
`packages/mcp/test/waiting.test.ts` and the `WH-` conformance tests, which run an agent on
0.2 and a played agent on 0.1 against the real hub and a played surface. They have not been
reviewed by anyone but their author, and not run with a model.

Chat (T46 to T56, rule 16) was added after that. It has tests, in `chat.test.ts` in
`packages/driver/test`, `packages/hub/test`, `packages/mcp/test` and `examples/kiosk/test`,
in `chat-serve.test.ts`, and in the `CH-` conformance tests. Its author attacked it once,
as the page, as a hostile agent and as a hostile hub; that found three things, which are
fixed and kept by the tests named "attacks" in `packages/driver/test/chat.test.ts` and
"whose request a chat message is" in `packages/mcp/test/chat.test.ts`: an agent could name
itself "You" and read as the person at a glance (T46), the Chat tab did not repeat the
warning about an unverified hub (T54), and a page that proved no key spoke to the model as
"the person at the page" without a mark (T55).

Chat then had one independent review, by a reviewer that did not write it, against the
running code and, for the Chat tab, a real Chromium. It reported eighteen findings, two of
them high, each with a proof. Both high ones were in `chat-serve`. As documented, it
handed whoever could speak as "the person" (with an unverified page: any local program) an
agent with a shell, with nothing that marked the text or said who was writing; it now
refuses an unverified page unless told otherwise, marks every message, and its documents
say what the `--exec` program can do (T55). And a run that timed out left what it had
started running with the grant, beside the next run; a run is now ended with its whole
tree, and no message is taken until that is gone (T56). The others, in short: the page
can read the composer and the transcript and replace what is sent, which this document
denied (it cannot be closed inside one document, and is now stated under "What Reins does
not protect against", with the fix that was not taken); one agent could use up the hub's
relay so that the person's message reached nobody while the tab showed it as sent (T50);
`reins_chat read` threw away unread messages it had not shown; `chat-serve` followed
whichever page attached last; an agent could put words next to a consent prompt by saying
them just before it (T49); a message for one agent went to all when that agent left
before Enter; agent names and status notes read in the tab's own voice, and two agents
with one name could not be told apart (T46); the subagent could attach and reported chat
text into its operator's session (T55); an abandoned `wait` lost the next message; an
agent that only listened lost its grant to the idle timer; the audit record of `chat.say`
need not match what was said; message ids told an agent that others were talking (T48);
`chat.read` returned the older part of "the latest"; a session id was printed outside the
quotes of the adapter's line (T47); and `chat-serve` gave up on `E_RATE`. One finding
belongs to the consent prompt (it takes the focus from the composer, and a stray Space
pressed Deny) and is dealt with there. The rest are fixed and kept by the tests whose
names start with `review` in `chat.test.ts` (`packages/core/test`, `packages/driver/test`,
`packages/hub/test`, `packages/mcp/test`, `examples/kiosk/test`) and `chat-serve.test.ts`,
and by the `CH-17` to `CH-27` conformance tests. The review also changed a default: under
`guarded` agents no longer hear each other until the person says so (T48).

The part of those fixes that a model reads and that a runner executes (the MCP adapter,
the shell tools and their session, `chat-serve`) then had a second independent review,
against the running code and with real processes on Windows. For that part it reported
nine findings, none high, each with a proof, and one suspicion. The largest was that
`chat-serve` on Windows still did not end everything a run started. It looked for what was
left only when the command's output stayed open, so a command that exited 0 and left a
background process was a clean answer; a process whose parent had exited was not found;
a tree that kept starting processes outran the one list that was taken; and a kill script
that could not run counted as done. The repository's own tests had not shown it, because
Node ends its own children with itself on Windows, and the tests used Node in between.
The fix is not a better search. A run is now put into a job object that allows no
breakaway, by a small helper (Windows PowerShell, started by its full path with an
environment of its own, compiling a few lines of C#), so that Windows itself keeps and
ends every process below the command; where that cannot be done nothing is run; and a
bare `--exec` name is no longer looked up in the working directory (T56). What a job
object does not hold is stated under "What Reins does not protect against". The others:
`reins_surfaces` printed the app's own name before the hub's fields and had no mark for
an unverified page, so a name could read as "verified"; line and control characters that
chat escaped passed raw through `reins_read`, `reins_observe`, `reins_act`, batches and
the prompt card, where a step line or a notice could be forged after one, and
`reins_read` had no bound of its own (T44); `reins-tools up` showed nothing of the hub's
warning about `null` and `file://`; the commands of the shipped preface reached session
`default` and not the runner's; `--scopes` on a later command was dropped without a word;
`down` and `up` ended whatever process held the id in a stale announcement; and three
small losses of chat messages (a caller that died after the answer was written, `--once`
on a batch, and a private question answered in the room after a `read` of an older
message). The suspicion was that a hostile page can make the adapter say, in its own
voice, that the person set the permission level to bypass: that is true to what the
surface reported, and a notice now names the surface and says when the hub did not verify
the page. All of it is fixed and kept by tests: the blocks named `review round 2` in
`chat-serve.test.ts` and `shell.test.ts`, `text.test.ts` and `chat-handover.test.ts` in
`packages/mcp/test`, and the conformance tests `MCP-8`, `MCP-9`, `CH-28` and `CH-29`.
The Windows tests put cmd.exe, PowerShell and Python between the command and what is left
running, not Node.

These fixes have not been reviewed by someone else. Chat was not run with a model, or
under a real harness. The job-object helper was run on one machine (Windows 11, Windows
PowerShell 5.1); the process-group path was not run for this change, and what Linux and
macOS report as a process's creation time (used before `down` ends a hub) was read from
their documentation, not run.

Electron support (T57 to T66; sections 3, 5 and 15 of the
specification; `docs/ELECTRON.md`) had one independent review, by a reviewer that did not
write it, against the running code and a real Electron. It reported fourteen findings,
one high, each with a proof. The high one was in the Hermes Desktop plugin: it granted
the `ui` scope over a page that is an agent's own interface, so that after one approved
attach an agent could send prompts unasked and press that agent's approval buttons. The
plugin now exposes nothing of the page and grants no `ui`, both of its writing actions
ask (since the second review as dangerous actions, which no level short of Bypass
waives), and the documents say what adopting such an app means. The others: a driver that
outlived a stopped or killed `reins-electron` when the page had its own socket to a hub;
any other local file in a registered `file://` window being linked as the app; the
adopted page's own scripts being able to register at a hub that was joined without a
surface key; an allowlist entry `null` admitting every sandboxed frame; an unbounded
reader on the debugging pipe; `nav` reports of `file://` and app-origin pages dropped
by the hub; app origins such as `app://-` that the grammar could not express; an adopted
document that could not reconnect after the broker closed its link; `--match` checked
per tab and not per document; `--hub` accepting any host; the plugin's reply not held
to one session; a preload that failed unclearly without context isolation and linked
windows nobody could see; and calls from unknown contexts being accepted, with page URLs
in the log. All fourteen are fixed, or, where the weakness is in what an origin can say
(`null`, `file://`, a hub joined without a key), warned about at start and written down
under "What Reins does not protect against". Three suspicions were followed up: a killed
command with `--debug-port` did leave the app and its port running, and a watcher
process now ends it; a frame without a parent that is not the page's top frame is now
refused, whether or not a fenced frame could have passed; and the driver's world, whose
fixed name another world could have taken, is now named afresh for each run. The fixes
have regression tests: the `OR-6` and `EL-9` to `EL-13` conformance tests,
`packages/electron/test`, and, in a real Electron, the scenarios `builtin-file`,
`adopt-stop`, `adopt-hub`, `windows` and `lifetime` of `npm run test:electron`. The
review also found statements in the Electron guide that said "tested" for things no
check covered; every such statement now names the check that backs it, or says that
there is none.

Those fixes then had a second independent review, again against the running code and a
real Electron. For Electron and the Hermes plugin it reported four findings, none high,
and followed up on smaller points. The lease of an adopted page was one `setInterval`
in the driver's world, and timer ids belong to the document: a script of the page could
clear it, and after a killed command the driver stayed a live surface that an agent
attached to and typed through. The lease is now judged by the clock at every frame, so
that no timer has to fire (T64). An app started with `--debug-port` through a starter
executable was left running with its port open, because the watcher watched the
starter's process: the command and its watcher now go by the port, close the browser
behind it over the port, and end no process by its id (T60). `--match` was a substring
of the whole URL and matched a document elsewhere that repeated the text: it is now an
origin or a URL prefix (T65). The Hermes plugin's two writing actions were sensitive, so
at Auto, which the plugin offered, neither asked, and a prompt too long for a consent
card went to Hermes unseen: both are now dangerous, ask under every level but Bypass,
and are refused when the card cannot show them whole (T63). The smaller points: the
plugin's reply was one object for the window, which a second agent with `observe` alone
could read, and is now held to the agent that sent the prompt; the rule that a window
which is not shown gets no link covered a registered window but not a view registered
by its contents, and now covers both; a hub hosted by `reins-electron` listed every
adopted page as verified, also behind a debugging port where any local program can type
as the person, and now does so over a pipe only (T62); the origin the hosted hub admits
was that of whichever window loaded first, and is now taken only when the first pages
agree, and never from a web site elsewhere; and without a sign from Hermes that a turn
is under way, the end of an answer to the person's own message could be read as the
reply to an agent's prompt, so `prompt.send` now refuses without that sign (T66). The
fixes have regression tests: the `EL-15` to `EL-18` conformance tests and the extended
`EL-10`, `packages/electron/test`, and, in a real Electron, the scenarios `adopt-stop`,
`lifetime`, `adopt-port`, `adopt-pipe` and `windows` of `npm run test:electron`. How
the origin is taken from the first pages is covered by unit tests and was not seen in a
real Electron. These second fixes have not been reviewed by someone else. Electron
support has not been run on macOS or Linux, against Hermes Desktop, or with a model.

## Reporting

Report a suspected vulnerability privately to the maintainers of this repository, not
in a public issue. Include what you did, what happened and what you expected.
