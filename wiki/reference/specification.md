# Reins Protocol 0.2

> Reins Protocol 0.2 in full, with what a link on 0.1 leaves out: the normative text, rendered from docs/SPEC.md.

Reins lets an AI agent drive a web app that is running in a browser tab: read what is
on screen, call the app's own actions, move a visible cursor, and put data in front of
the user. The app decides what an agent may do, the user can watch and stop it, and a
kiosk can lock it down to a fixed allowlist.

The wire types are in [`packages/core/src/protocol.ts`](https://github.com/offensiveadhd/reins/blob/main/packages/core/src/protocol.ts).
This document describes the behaviour behind them. The words MUST, SHOULD and MAY are
normative.

Conventions: a size in bytes counts the UTF-8 bytes of text. A length in characters counts
UTF-16 code units unless code points are named. Strings that are hashed or MACed are
taken as their UTF-8 bytes. base64url is RFC 4648 section 5 without padding.

## 1. Goals

1. **Live control.** Commands take effect within one animation frame of arriving. Cursor
   motion is smooth at display rate whatever the network does.
2. **Token economy.** An agent learns an app from a short prompt card, acts through the
   app's own semantic actions, and reads the screen as a compact tree with deltas. Bulk
   data goes to the screen without passing through the model.
3. **App-defined guardrails.** The app declares its actions and their risk. Policy
   decides allow, confirm or deny. There is no path to run agent-supplied code.
4. **Human in control.** The user sees when an agent is connected, approves what the
   policy says needs approval, and can pause or stop at any time. Real input wins over
   synthetic input.
5. **Kiosk grade.** An unattended station runs a fixed policy: allowlisted actions,
   annotated elements only, no synthetic input, no navigation, tamper-evident audit.
6. **One protocol, any transport.** The same frames run over a loopback WebSocket and
   over an in-page message port.

## 2. Roles

```
  agent harness                 hub (loopback)                  browser tab
 ┌──────────────┐   reins.v1   ┌──────────────┐   reins.v1   ┌────────────────┐
 │ agent SDK    │◄────────────►│ broker       │◄────────────►│ driver         │
 │ or MCP tools │  ws / port   │ auth, grants │  ws / port   │ app actions,   │
 └──────────────┘              │ policy, audit│              │ UI tree, cursor│
                               └──────────────┘              └────────────────┘
```

- **Surface**: a web page that embeds the driver. It dials out to the hub, because a tab
  cannot listen.
- **Agent**: an AI harness, or an assistant running in another tab or in the same page.
- **Hub**: the broker both connect to. It authenticates peers, issues grants, enforces
  the hub policy and rate limits, routes requests and keeps the audit log. The broker
  is transport-agnostic: the hub process binds it to WebSocket, a page can bind it to
  in-memory links.

Trust: the hub is trusted by both sides. The agent is constrained by the hub policy and
by the surface policy. The surface enforces its own policy even though the hub already
checked, because the app owner's guardrails belong to the app. Page content is
untrusted data from the agent's point of view.

## 3. Transports

**Loopback WebSocket.** The hub listens on `127.0.0.1` (default port 7346). Peers open
`ws://127.0.0.1:7346/` with subprotocol `reins.v1`. The hub MUST:

- bind loopback addresses only and refuse any other bind address;
- reject a socket whose remote address is not loopback;
- reject a request whose `Host` header is not `127.0.0.1`, `localhost` or `[::1]` with
  the hub's port (DNS rebinding defence);
- require the `reins.v1` subprotocol;
- disable per-message compression;
- answer plain HTTP requests with a bare status and no body.

Browsers treat loopback as a secure context, so an `https:` page may open
`ws://127.0.0.1`. A browser may put loopback access behind a user permission. The
driver treats a blocked connection as an ordinary connect failure and reports it.

**In-page port.** A `MessagePort`, or the in-memory `linkPair()`, carries the same
frames with strings for text frames and `Uint8Array` for binary frames. An assistant
that runs inside the browser uses this to reach a surface with no network at all.

**Electron port.** An Electron app hosts the broker in its main process and links a
window to it over a `MessageChannelMain`. The main process wraps its end as a `Link`
(`mainPortLink`); the page gets the other end as a `MessagePort` and wraps it with
`portLink`. The frames are those of the in-page port. A port ends with its document, so a
window that reloads or navigates connects again from the new one. The main process is
the embedding code of section 5: it MUST take the link's origin from the frame the port
went to, as Electron reports it, and never from anything the page sent. It MUST give a
port only to the top-level frame of a window the app registered, and MUST NOT give one to
a `<webview>` guest unless the app said that guest may be driven while embedded
(section 12, Frames). The top-level frame is the one the window's contents report as
their main frame: a frame without a parent that is not it, such as the root of a fenced
frame, is a frame inside the page.

A window is registered for a page: a URL, several, or a predicate. The main process MUST
compare it with the URL Electron reports for the frame at the time the page asks, the
`#fragment` aside, and MUST NOT link a window that shows a page of origin `file://` or
`null` unless it was registered with one. Such an origin does not say which page it is:
any other local file that got into the window has it too. A window that is not shown has
nobody to ask, so its page gets the link when the window is shown, unless the app
registered it to be driven unseen. The same is asked for a view that was registered by
its contents: the window is the one that holds the view when its page asks, and a view
that is in no window gets no link. The preload needs an isolated world to stand in: in a
window without context isolation it MUST NOT offer the page a way to ask, and it tells
the page why.

Code that embeds a broker and builds a link itself knows what is at the far end, as no
hub on a socket can. It MAY vouch for it (`accept(link, { origin, vouched: true })`), and
the hub then lists that surface as `verified` (section 5), as it lists one that proved a
key. The Electron main process does so for a window it registered, and `reins-electron`
for a page it adopted over a debugging pipe into the hub it hosts. A debugging port is
different: every program on the machine can use it, type and press in the page through
it, and speak on the page's link. `reins-electron` MUST NOT vouch for a page it adopted
through a debugging port, such a page treats its hub as unverified, and the command MUST
NOT give it a surface key, which could be read back through the port.

A hub whose surfaces are all linked in-process MAY close its socket to surfaces
(`surfaceSockets: false`). On a socket of such a hub a `hello` with role `surface` MUST
be answered `bye {code:"E_ORIGIN"}`, whatever `Origin` header came with it.

Every transport is wrapped as a `Link` (see `protocol.ts`). A link queues inbound
messages until a handler is assigned, at most 4096 messages and 16 MiB; past either bound
it drops the queue and closes.

## 4. Framing

**Text frames** are JSON objects with a `t` field: `challenge`, `hello`, `welcome`,
`req`, `res`, `evt`, `flow`, `ping`, `pong`, `bye`.

**Binary frames** start with a kind byte. The only kind is the pointer frame
(section 11).

Limits (`DEFAULT_LIMITS`): text frame 256 KiB (`maxText`), binary frame 16 KiB
(`maxBinary`), `heartbeatMs` 15 000, `reqTimeoutMs` 15 000, `consentTimeoutMs` 60 000. The
hub announces its limits in `welcome`. A size limit applies to a frame after its seal
(section 5) is removed. A receiver MUST close with `E_TOO_LARGE` on an oversize frame
and with `E_BAD_FRAME` on a frame that is not valid JSON, has an unknown `t`, or lacks
a required field. To close with a code is to send `bye {code}` and then close the
transport. A message too large for the transport to take at all (the hub's WebSocket
accepts the frame limit plus a seal MAC: 44 more characters of text, 32 more bytes of
binary) is closed by the transport without a `bye`, with WebSocket close code 1009.
Decoding validates shape: field presence and primitive types.

## 5. Handshake and authentication

```
hub  → peer   challenge { v:["0.2","0.1"], nonce, hub }
peer → hub    hello     { v, role, name, cnonce, auth?, surface? }
hub  → peer   welcome   { v, session, role, limits, proof? }      or   bye { code }
```

- `challenge.v` lists the versions the hub speaks, newest first. `hello.v` names the first
  of them that the peer speaks, and `welcome.v` repeats it: the version of this link
  (section 16).
- `nonce` and `cnonce` are 32 random bytes, base64url, fresh per connection.
- `auth.proof = b64url(HMAC-SHA256(key, "reins.v1.auth\n" + role + "\n" + kid + "\n" + nonce + "\n" + cnonce))`.
  The key is the UTF-8 bytes of the shared secret and the message the UTF-8 bytes of
  the string, so a non-ASCII `kid` is hashed as UTF-8. A field that contains a line feed,
  or that is not well-formed Unicode, makes the proof fail. Secrets are 32 random bytes, base64url. A secret never appears
  in a URL or a log.
- When the peer authenticated, `welcome.proof` is the same HMAC with the context
  `reins.v1.hub`. A peer that holds a key MUST verify it and close on mismatch. This
  defeats a process squatting on the hub's port.
- The hub compares proofs in constant time, answers a failed hello with
  `bye {code:"E_AUTH"}`, and closes. A peer that sends anything but `hello` first, or
  takes longer than 5 s, is closed. Until a connection has authenticated, the hub holds
  at most 16 inbound messages and 64 KiB from it, and closes it beyond that.
- A failed proof (a missing or wrong proof, an unknown `kid`) is answered after a delay:
  200 ms, doubling with each failure in the last minute, up to 3 s. Nothing more the
  peer sends is kept; only its handshake slot is held until the delayed `E_AUTH`. A
  correct proof is never delayed and never refused because others failed. At most 16
  handshakes may be pending or waiting out a delay; further connections are closed with
  `E_BUSY`.
- Keys shorter than 32 characters are rejected when the hub is configured.

**Sealed sessions.** When a peer authenticated with a key, every message after
`welcome` is sealed in both directions. A process relaying the connection cannot inject,
alter or reorder a message or replay one, and cannot drop one unless it also withholds
everything after it in that direction: the next message fails to verify. Withholding the
last messages of a direction is not detected; neither end notices until the heartbeat
(section 6) drops the silent peer.

- Both sides derive one key per direction from the shared secret and the transcript
  of the handshake:
  `th = b64url(SHA-256(L(c) || c || L(h) || h || L(w) || w))` and
  `k = HMAC-SHA256(key, context + "\n" + nonce + "\n" + cnonce + "\n" + th)`,
  where c, h and w are the UTF-8 bytes of the `challenge`, `hello` and `welcome` frame
  texts exactly as sent, and L(x) is the byte length of x as an unsigned 32-bit
  big-endian integer. The context is `reins.v1.seal.peer` for what the peer sends and
  `reins.v1.seal.hub` for what the hub sends, and `k` is the raw 32-byte HMAC output.
  Both ends MUST derive the keys exactly this way, so that they agree only if both saw
  the same three frames.
- Each direction counts its messages from 0. The MAC of a message is
  `HMAC-SHA256(k, u64be(seq) || kind || payload)`, with kind `0x74` for text and `0x62`
  for binary; the payload of a text message is its UTF-8 bytes. The counter is never
  sent.
- A sealed text message is the base64url MAC (43 characters), `.`, then the text. A
  sealed binary message is the bytes followed by the 32 MAC bytes.
- A message that does not verify closes the connection and is not delivered.
- Text that is not well-formed Unicode (it holds a lone surrogate) MUST NOT be sealed or
  opened: a sender refuses to seal it, a receiver treats it as a message that does not
  verify, and a transcript text that is not well-formed fails the session with `E_AUTH`.
- **Key confirmation.** Right after `welcome` the peer sends a sealed `ping`. The hub
  answers with a sealed `pong` and only then registers the peer and acts on anything
  that was in `hello`. The peer treats the session as established only when that
  `pong` verifies. Either side gives up after 5 s.

**Agents** MUST authenticate. Each agent credential has a `kid`, a key, and optional
caps: allowed scopes, allowed surface origins, a session limit (4 by default). If the
connection carries an `Origin` header (the agent is a browser page), that origin MUST
be listed on the credential (else `E_ORIGIN`). The name shown to users is the
credential's `name` when the operator set one, otherwise the name the agent declared,
with control characters (`\p{Cc}`) and the bidirectional marks and overrides (U+200E,
U+200F, U+202A to U+202E, U+2066 to U+2069) removed and cut to 64 code points.

**Surfaces** are identified by origin. The hub takes the origin from the WebSocket
`Origin` header, or from the embedding code for in-page links, and MUST find it in the
configured allowlist (else `E_ORIGIN`). Entries are exact origins, `scheme://host:*` for
any port, or `*`. `hello.surface.url` MUST have that origin. A hub MAY hold surface keys
by app id (`kid` = app id). A surface whose manifest claims an app id the hub holds a key
for MUST prove that key, whether or not the hub sets `requireKey`; without a proof it is
refused with `E_AUTH` ("surface key required"). `requireKey` also refuses every surface
without a key, and kiosk deployments SHOULD set it, because a local non-browser process
can forge an `Origin` header. `SurfaceInfo.verified` is true only for a surface that
proved a key, or whose link the embedding code built itself and vouches for (section 3).
A hub MAY pin an app id to a manifest digest and refuse a surface whose
manifest differs (`E_DENIED`). Pinning catches a modified build of the app. It does not
stop a forger, who can copy the manifest.

A surface that holds no key cannot check the hub's proof, so it cannot tell the hub
from another process listening on the same port. Such a surface treats the hub as
**unverified**: it never accepts an attach silently (the decision is at least
`confirm`), and it tells the user so in the consent prompt and in the indicator. The
kiosk profile has nobody to ask, so a kiosk surface MUST hold a key. A link the app
built itself (the in-page transport) counts as verified.

**Origins.** An origin is compared as text, in one of four forms:

- a *web origin*: the serialised origin of an `http:`, `https:`, `ws:`, `wss:` or `ftp:`
  URL, `scheme://host` with `:port` unless the port is the scheme's default;
- `file://`: the origin of every `file:` URL, whatever its host and path;
- an *app origin*: `scheme://host` or `scheme://host:port` with any other scheme, which is
  what a page has when an Electron app serves it from a scheme of its own (`app://notes`).
  Scheme and host are lower-case ASCII, the scheme `[a-z][a-z0-9+.-]*`, the host one or
  more of `a-z`, `0-9`, `.`, `_` and `-` (Chromium reports `app://-` and `app://.` as
  origins, and keeps a trailing dot), the port 1 to 65535 without leading zeros;
- `null`: an opaque origin, as a `data:` URL, a sandboxed frame, or a page on a scheme
  the browser gives no hosts has.

The origin of a URL is its web origin for those five schemes and `file://` for `file:`.
For `blob:` it is the web origin of the `http:` or `https:` URL that follows `blob:`,
else `null`. For any other scheme it is the app origin made of the scheme, the host
between `//` and the next `/`, `?` or `#` (credentials dropped, in lower case) and the
port, when those fit the form above, else `null`. An implementation MUST compute it this
way (`urlOrigin`) and not take the origin a URL library reports, which for a `file:` or
app-scheme URL is `null` in some engines and not in others.

Chromium, and so Electron, puts these in the `Origin` header of a WebSocket: `file://`
from a page loaded from a file, the app origin from a page on a scheme the app registered
as standard, and `null` from a page on a scheme it did not (measured, see
`docs/ELECTRON.md`).

Allowlist entries, in the surface allowlist and in a credential's `origins` and
`surfaces`, match as follows. An exact entry matches that origin: a web origin,
`file://`, an app origin or `null`. `scheme://host:*` matches a web or app origin of
that scheme and host with any port or none. `*` matches every web origin and MUST NOT
match `file://`, an app origin or `null`: each of those is admitted only by an entry that
names it. `hello.surface.url` has the connection's origin when the origin of the URL
equals it; a connection whose origin is `null` takes any URL that has no web origin. The
same holds for the URL of a `nav` report (section 6): the hub MUST judge it by the origin
this section gives it, so that a page on `file://` or an app origin can say where it went.

Two entries admit by an origin that countless pages share, and need more than a name when
surfaces come over a socket. `null` is the origin of every sandboxed frame on every
website and of every `data:` page, and a connection with it may state any URL that has no
web origin, an app's own included. `file://` is the origin of every local file. A hub
SHOULD warn when its socket admits either without requiring a surface key, and a
deployment SHOULD NOT list `null` unless every surface proves a key or none comes over
the socket. The reference hub warns at start, and `reins-tools up`, which starts one in
the background where its console is a log file, prints the same warning itself
(section 15).

Session ids (`a1`, `s1`) are labels. Nothing is authorised by knowing one. They are
assigned in sequence (`s1`, `s2`, ...), so an id reveals how many sessions of its kind
connected before it; this is accepted.

Either side sends `bye` before closing on purpose.

## 6. Requests, responses, events

`req {id, m, p}` is answered by exactly one `res {re, ok, r}` or
`res {re, ok:false, e:{code, msg, data?}}`. Ids count up from 1 per sender per connection.
An error may carry `data`: a JSON value that goes with its code.
Error messages are short and safe to show to a model. They never contain stack traces,
file paths or secrets. The codes (`ERROR_CODES`):

| code | meaning |
|---|---|
| `E_BAD_FRAME` | malformed frame, unknown frame type, a frame out of place |
| `E_VERSION` | no protocol version in common |
| `E_AUTH` | missing or wrong proof, surface key required, key confirmation failed |
| `E_ORIGIN` | the connection's origin, or `hello.surface.url`, is not allowed for the role; a surface on a socket that takes agents only |
| `E_TOO_LARGE` | a frame, request, manifest, result or set of consent arguments over its limit |
| `E_UNKNOWN_METHOD` | the method does not exist |
| `E_BAD_ARGS` | params fail validation |
| `E_NO_SURFACE` | no such surface id, or a surface the credential may not attach to |
| `E_NOT_ATTACHED` | no live grant for this surface |
| `E_SCOPE` | the grant lacks the method's scope, the person switched that scope off, or no requested scope is permitted |
| `E_DENIED` | policy says no |
| `E_CONSENT` | the person refused or blocked the action, or the prompt timed out |
| `E_WAITING` | 0.2: the request waits for the person's answer and nothing ran; `data` is `{tk, ms}`, the ticket of the request and how long it stays. An agent on 0.1 gets `E_CONSENT` (section 16) |
| `E_PAUSED` | control is paused, the indicator cannot be shown, or the person is using the page |
| `E_RATE` | a rate or admission limit, or a consent cool-off |
| `E_NO_TARGET` | the target is not a live, exposed, enabled element, or is read-only |
| `E_TIMEOUT` | the other side did not answer in time |
| `E_GONE` | the other side disconnected |
| `E_BUSY` | a capacity, a pending attach or consent prompt, a permission that changed while the request waited, or a peer that does not read |
| `E_INTERNAL` | an unexpected failure, the audit log unavailable, a result that is not JSON |

`bye` also takes `OK`. A receiver reads an unknown code in a `res` as `E_INTERNAL` and in
a `bye` as `E_GONE`.

An agent addresses a surface with `p.s`. The hub answers the methods in `HUB_METHODS`
itself: `hub.info`, `surfaces.list`, `surface.attach`, `surface.detach`, `stream.open`
and `stream.close`. Every other method is forwarded: the hub checks the grant, the scope
(`METHOD_SCOPE`) and the rate limit, strips `s`, and sends the request to the surface
with `ag` set to the agent's session id, and `c:1` when the hub policy demands a human
confirmation. The surface's answer is relayed back unchanged, an error with its `data`
(section 16 has the one exception, for an agent on 0.1). An unknown method is
answered `E_UNKNOWN_METHOD` before any parameter is checked. A surface id that does not
exist, and one naming a surface the credential may not attach to, get the same answer on
every method that takes `s`: `E_NO_SURFACE`, with the same message. Params that cannot be
put in canonical JSON (section 7), because they are nested more than 100 levels deep, are
refused with `E_BAD_ARGS` and not forwarded.

A request waits `reqTimeoutMs` for its answer. Where a consent prompt may be involved
the wait is longer: the hub gives the surface `consentTimeoutMs` more (`attach`,
`act`), and an agent gives the hub one `reqTimeoutMs` more than that (`surface.attach`,
`act`), which is 2 × `reqTimeoutMs` + `consentTimeoutMs`, 90 s with the default limits.
The agent so outwaits the hub, and how a slow prompt ended is the hub's answer, not
the agent's own timer. On timeout the asker gets `E_TIMEOUT`. When a surface
disconnects, its pending requests fail with `E_GONE`.

`E_TIMEOUT` on `surface.attach` or `act` says that the surface did not answer within
the hub's wait. A prompt nobody answers ends inside that wait, as `E_CONSENT` or, where
the request can wait, as `E_WAITING` (section 12): the surface counts a request's time
from when it arrived, takes the shorter of its policy's `consent.timeoutMs` and the hub's
`consentTimeoutMs`, and reads the clock when the person answers, so that neither a
prompt that waited its turn, nor an app that allows more time, nor a timer that fired
late keeps a prompt answerable after the hub gave up. What is left is a request that
reached the page more than `reqTimeoutMs` late, on a page that did not run for that
long: its prompt comes up after the hub's `E_TIMEOUT`. The hub then withdraws what it
can: it sends the surface `detach {why:"hub"}` for an attach it stopped waiting for
(section 8), and the prompt becomes a "Request withdrawn" notice. It cannot withdraw a
single action, so an action approved on such a late prompt still runs; the hub drops a
page that is silent for 2.5 × `heartbeatMs`, which bounds that case. An agent SHOULD
treat this `E_TIMEOUT` as a prompt nobody answered: ask the person to bring the page to
the front, then ask again. Before repeating an action that is not safe to run twice,
the agent SHOULD observe whether it ran.

Events are `evt {topic, d}`. A surface addresses one agent with `ag`, or omits it to
reach every attached agent. The hub adds `s` when it relays, and relays an event only to
live grants with the scope its topic needs: `ui`, `state` and `nav` need `observe`, and
`user` goes to every live grant. Two kinds of `user` event are not relayed as they
come: `level` and `rule` say what the person set for one agent (section 12) and are
always sent with `ag`. The hub checks and records them (section 13) and then tells that
agent alone. A `grant` event from a surface is acted on by its kind and never relayed as
it came: `revoked` ends grants and `scopes` changes the scopes of one grant (both in
section 8), and any other kind is dropped. `surface` events come from the hub alone; one
sent by a surface is dropped, as is an event with an unknown topic. Agents opt into `ui`,
`state`, `user` and `nav` with `sub`. `grant` and `surface` events need no subscription,
and neither do the `user` events `level` and `rule`.

A `chat` event is one message of a page's chat room (section 12). It is never broadcast: a
surface sends it with `ag`, once for each agent that is to hear the message, and the hub
relays it to that grant alone, while the grant holds `chat`, in an event built from the
checked fields (section 13). It needs no subscription, and neither does the `user` event
`relay` (section 12). The hub takes no event from an agent, so an agent cannot send one.

Either side sends `ping {ts}` after `heartbeatMs` of silence. The answer is
`pong {ts}` with the same value. A peer silent for 2.5 × `heartbeatMs` is dropped.

## 7. Manifest and prompt card

A surface describes itself in `hello.surface.manifest`:

- `app`: id, name, version, description;
- `actions`: name, description, `params` (schema-lite object), `risk`, `returns`;
- `views`: named renderers the app offers for showing data;
- `state`: named pieces of app state an agent may read;
- `exposure` and `profile`: what the UI tree exposes and which policy profile runs.

Names match `NAME_PATTERN`. A manifest is at most 64 KiB, 256 actions, 64 views. The
hub validates it and computes `digest`, the base64url SHA-256 of its canonical JSON.

**Canonical JSON** (also used by the audit log) is JSON without whitespace, with object
keys sorted by UTF-16 code units, strings and finite numbers written as ECMAScript
`JSON.stringify` writes them (the shortest form that reads back as the same number, so
`1e+21`, `0.1`, and `0` for -0), other numbers as `null`, and properties whose value is
undefined left out. For JSON input this is the serialisation of RFC 8785. A value nested
more than 100 levels deep has no canonical JSON.

The **prompt card** is the text an assistant is given so it can drive the app. It is
rendered from the manifest by `renderCard` and is the same wherever it is produced:

```
# Reins surface s1: Brew Kiosk 1.0.0 (brew-kiosk)
Self-service coffee ordering.
origin http://localhost:5173 | profile guarded | scopes observe act cursor show
Prefer actions over ui ops. [confirm] asks the user on screen. [deny] is blocked.

## actions
cart.add(sku: "latte"|"mocha"|"tea", qty?: int 1..9) -> cart totals. Add an item.
order.submit() [confirm]. Place the order.
admin.refund(order: str) [deny]. Refund an order.

## views
chart(title: str, series: [{label: str, value: num}]). Bar chart panel.

## state
cart: items and totals
```

Rendering, line by line: `# Reins surface`, then ` <s>` when the surface is known, then
`: <app.name>`, ` <app.version>` if there is one, and ` (<app.id>)`; the app description,
if any; `origin <origin>` (when the surface is known), `profile <profile>` and
`scopes <scopes>` (when the granted scopes are known, in canonical order), joined by
` | `; the fixed line shown above. Then, for each of actions, views and state that is
not empty, an empty line, the heading (`## actions`, `## views`, `## state`) and one
line per entry in manifest order. An action line is the name, its signature,
` -> <returns>` if any, ` [<decision>]` unless the decision is `allow`, and
`. <description>`. A view line is the name, its signature and `. <description>`. A state
line is `<name>: <description>`, or the name alone. Free text is put on one line first:
every run of whitespace and control characters becomes one space and the ends are
trimmed. The manifest behind the example is in `conformance/vectors/manifest.json`.

Signature syntax: the params of an object schema in declaration order inside
parentheses, `()` without params. Each is `name: type`, with `?` after the name when it
is not required. Types: enums as JSON strings joined by `|` (each one line to every
reader, section 10, "Text rendering"), `str`, `int` and `num` with
` a..b` when a range is given (either end may be missing), `bool`, `[T]` for arrays,
`{name: T, ...}` for objects. The decision tag is what policy says for that action.
`allow` has no tag.

A manifest names its profile but does not carry policy overrides, so a card rendered
on the agent side shows the profile's decision for each risk tier. Where an app
overrides single actions, or the hub's policy is stricter, the tag can be more
permissive than what happens: the refusal (`E_DENIED`, `E_CONSENT`) is the truth. The
level and the rules the person sets (section 12) are not on the card either: under `auto`
or `bypass` a `[confirm]` action may run unasked, and a rule may block an action that
has no tag.

## 8. Grants and scopes

Scopes, in canonical order:

| scope | lets the agent |
|---|---|
| `observe` | read the UI tree, visible text and exposed state; subscribe to events |
| `act` | call the app's declared actions |
| `ui` | synthesise clicks, typing, selection, scrolling and keys on exposed elements |
| `cursor` | show and move the virtual cursor. Visual only: it never dispatches input |
| `show` | toasts, highlights, and the app's data views |
| `nav` | open same-origin URLs the policy allows |
| `chat` | talk with the person in the page's chat room: say something, read what was said to it, show what it is doing |

`surface.attach {s, scopes, reason, tk?}`:

1. The hub intersects the requested scopes with the agent credential's cap and the
   hub policy's `scopes`. An empty result is `E_SCOPE`. Hub policy `attach: deny` is
   `E_DENIED`.
2. The hub sends `attach {agent, scopes, reason, levels, decisions, chatRelay, cred, v, tk?}` to the surface, with
   `c:1` when the hub policy says `confirm`. `levels` is the hub policy's `human.levels`,
   and `decisions` is what the hub's policy decides for each action in the surface's
   manifest, `{"<action>": "allow" | "confirm" | "deny"}` (section 12). `chatRelay` is the
   hub policy's `chatRelay` (`off`, `person` or `on`; section 12, "Chat"). `cred` is the id
   of the agent's credential (its `kid`, at most 64 characters): what stays the same when
   an agent comes back under another session id or another name ("What the person
   tightened stays", below). `v` (0.2) is the protocol version the agent's own link
   speaks, and a ticket (`tk`, 0.2) is forwarded as the agent sent it.
3. The surface intersects with its own policy, decides by its `attach` setting
   (`allow`, `confirm` with an on-screen prompt, `deny`), and answers
   `{scopes, ttlMs, kept?}`. A refusal is `E_CONSENT` or `E_DENIED`; a request that waits
   for the person instead is answered `E_WAITING` ("A request to connect can wait",
   below). `scopes` are the scopes granted. `kept`, when present, is what stays of the person's earlier settings
   for this agent: `{level?: "strict", rules?: {"<action>": "confirm" | "deny"}, off?: [scope]}`.
4. The hub records the grant with expiry `min(hub ttl, surface ttl)` and returns
   `{grant, surface, manifest, kept?}`. `grant.scopes` holds the scopes in force: those
   granted, without the ones `kept.off` names. `kept` in the result repeats the level and
   the rules, so that the agent knows from the first moment what it is held to. An answer
   that is malformed, or grants none of the scopes asked for, is `E_INTERNAL` or
   `E_SCOPE`, and the hub sends the surface `detach {why:"hub"}`.

Attach is bounded, because each one may put a prompt in front of a person. The hub
forwards one attach at a time per credential and surface, across all of the
credential's sessions (`E_BUSY` for another), and allows a credential a burst of 3
attaches per surface, then one every 2 s (`E_RATE`). When an agent session disconnects
while its attach is pending, the hub sends the surface `detach {why:"agent"}`, which
withdraws the prompt, and whatever waits for that agent (below). The surface asks even when its policy says `allow` if the hub is
unverified, or if the user has pressed Stop, or a revocation after refusals (section 12)
has happened, since the page loaded, or if the person has tightened something for an
agent that the surface cannot tell this one from ("What the person tightened stays").

A surface holds at most 32 grants at a time (`MAX_SURFACE_SESSIONS`), so that the list a
person has to read stays one they can read. A surface MUST refuse an attach from a
further agent with `E_BUSY`, before it asks the person. An agent that holds a grant can
still attach again.

One agent holds at most one grant per surface. Attaching again replaces it. A grant
ends, and the hub tells each side, as follows:

| the grant ends because | the surface gets | the agent gets |
|---|---|---|
| the agent sends `surface.detach` | `detach {why:"agent"}` | the answer `{}` |
| the agent disconnects | `detach {why:"agent"}` | |
| the surface disconnects | | `evt surface {kind:"gone"}`, like every agent that may attach to it |
| it reaches `exp`, or `idleMs` passes without a request | `detach {why:"expired"}` | `evt grant {kind:"expired"}` |
| the surface sends `evt grant {kind:"revoked"}` (Stop, or refusals, section 12), with `ag` for one agent, without for all | | `evt grant {kind:"revoked"}` |
| the surface reports a level that the hub's policy does not offer, more than 20 changes of what the person set within one second, or a change that lets the agent do more while the hub cannot write its audit log (section 13) | `detach {why:"hub"}` | `evt grant {kind:"revoked"}` |
| a new attach by the same agent replaces it | | the new attach result |

A request without a live grant fails with `E_NOT_ATTACHED`. A request whose scope the
grant lacks fails with `E_SCOPE`.

**A request to connect can wait.** (0.2) Where the surface keeps a waiting list (section
12, "Requests that wait"), an attach whose prompt nobody answered, or that the person put
off with "Later", is answered `E_WAITING` with a ticket. Nothing was granted, and the
surface holds no session for the agent. With nobody attached, the surface still shows the
person that an agent is waiting to connect, and the request in its panel. When the
person approves it there, the surface tells the agent (`evt user {kind:"answer"}`, with
`ag`, for an agent that holds no grant yet), and the agent's next `surface.attach` with
the same scopes and the ticket is granted without a prompt, once. The surface drops what
waits for an agent when the hub sends `detach` for it; the hub does so when that agent
leaves, and whenever it gives up on a request to the surface (section 13).

The attach prompt may also offer the person rules for the new grant (section 12, "Offers
at attach"). A grant that starts with such rules is reported like any other change of a
rule: `evt user {kind:"rule"}` right after the surface's answer to `attach`, so the hub
takes `rule` events for a grant it has only just recorded.

**Scope switches.** The person can switch single scopes of a live grant off and back on,
in the panel (section 12). The surface refuses a request whose scope is off with
`E_SCOPE`, and sends the hub `evt grant {kind:"scopes", scopes}` with `ag`, naming the
scopes now in force. The hub MUST then let the grant carry only those of the reported
scopes that were granted at attach: a report never widens a grant. The hub closes that
agent's pointer streams on the surface (`stream.close`) when `cursor` is no longer among
them, records the change (section 13) and tells the agent with
`evt grant {kind:"scopes", scopes}`. When `cursor` goes, the surface drops that agent's
pointer streams, and hides the cursor if that agent showed it last. A grant with every
scope switched off stays live: the person can switch them back on.

**What lets an agent do more ends with the grant.** The levels `auto` and `bypass`, a rule
`allow`, a remembered approval and what the person switched on in the chat (section 12)
belong to one grant and end with it, however it ends. A new grant, also one that replaces
another for the same agent, has none of them. A rule `allow` that was set for a time ends
sooner, when its time is up, and an agent's requests in the waiting list go with its grant
(section 12).

**What the person tightened stays.** The level `strict`, the rules `confirm` and `deny`
and the scopes the person switched off hold an agent back, and no sequence of the
agent's own calls takes them away: not attaching again, not a detach and a new attach,
not letting the grant run out, not coming back under another session id or name. A
surface MUST keep them for as long as the page lives and MUST put them on every new
grant of the same agent, where they are in force from the first request: the grant
starts at `strict` when that was kept, with the kept rules for the actions the surface
still declares, and with the kept scopes switched off (a scope that is not granted
this time is simply not there). What the person lifts themselves, in the panel, is no
longer kept. The surface says what is kept in its attach answer (`kept`, step 3), and the
hub starts the grant with it (section 13).

*The same agent* is told by the credential: a surface that got `cred` from a hub it
verified (section 5) keeps what was tightened under that id, and every grant that comes
with the same id is the same agent to it, whatever its session id or name. Two
credentials are two agents. Where the surface cannot tell (the hub sent no `cred`, or
the surface did not verify the hub), every agent is the same agent to it: what the
person tightened for one is put on every later grant. Such an attach is never silent. A
surface MUST ask the person about an attach that would start with kept settings when it
cannot tell which agent it is from, even where its policy says `allow`, and the prompt
says what was set and that it stays. A prompt for an attach by a known agent says the
same when the policy asks anyway.

## 9. Methods

Agent side. All but the first two and `stream.close` take `s`.

| method | params | result | scope |
|---|---|---|---|
| `hub.info` | | `HubInfo` | |
| `surfaces.list` | | `{surfaces}` | |
| `surface.attach` | `scopes, reason?, tk?` | `{grant, surface, manifest}` | |
| `surface.detach` | | `{}` | |
| `observe` | `since?, boxes?` | `Observation` | observe |
| `read` | `h?, max?` | `{text, truncated}` | observe |
| `state.get` | `name?` | `{state}` | observe |
| `sub` / `unsub` | `topics` | `{topics}` now subscribed | observe |
| `act` | `a, args?, tk?` | `{result?, rev}` | act |
| `ui.click` | `h` | `{rev}` | ui |
| `ui.type` | `h, text, clear?, enter?` | `{rev}` | ui |
| `ui.select` | `h, value` | `{rev}` | ui |
| `ui.scroll` | `h?, dx?, dy?, to?` | `{rev}` | ui |
| `ui.key` | `key, h?` | `{rev}` | ui |
| `cursor.move` | `to, ms?, wait?` | `{x, y}` | cursor |
| `cursor.set` | `visible?, label?, color?` | `{}` | cursor |
| `show.toast` | `text, kind?, ms?` | `{}` | show |
| `show.highlight` | `h, label?, ms?` | `{}` | show |
| `show.view` | `view, data?` | `{result?}` | show |
| `show.clear` | | `{}` | show |
| `nav.go` | `url` | `{}` | nav |
| `chat.say` | `text, to?` | `{id}` | chat |
| `chat.read` | `since?, max?` | `{messages, next}` | chat |
| `chat.status` | `state, note?` | `{}` | chat |
| `stream.open` | `kind:"pointer"` | `{ch, credit}` | cursor |
| `stream.close` | `ch` | `{}` | |

Surface behaviour:

- **act.** Unknown action: `E_BAD_ARGS`. Args are validated against the action's
  schema (`E_BAD_ARGS` with the failing path). A request without `args` carries no
  arguments: it is validated as `{}`, which is also what the handler is given, so an
  action that requires no property runs and a missing required property is reported
  by its path. Policy decides by the action's risk and
  overrides: `deny` is `E_DENIED`; `confirm`, or a request carrying `c:1`, shows a
  consent prompt and a refusal is `E_CONSENT`. The level and the rules the person set
  for the agent can add a prompt, waive one, or block the action (section 12, "Levels
  and rules"). Then the handler runs. Its result MUST
  be JSON and at most 32 KiB: a larger one is `E_TOO_LARGE`, a value JSON cannot hold
  (a cycle, a BigInt) is `E_INTERNAL` ("result is not JSON"), and parts that
  `JSON.stringify` drops (undefined, functions) are left out. A handler that throws
  yields `E_INTERNAL` with a generic message, unless it throws a `ReinsError`.
- **ui.click.** Resolves the handle, scrolls it into view, dispatches pointer and mouse
  events and the click. Disabled elements fail with `E_NO_TARGET`.
- **ui.type.** Focuses the element, optionally clears it, sets the value through the
  native setter and dispatches `input` and `change`. `enter` then sends Enter and
  submits the enclosing form. A private field fails with `E_DENIED` unless
  `policy.privateInput`. A target that takes no text is `E_BAD_ARGS`; a read-only
  (`readonly`, `aria-readonly="true"`) or disabled one is `E_NO_TARGET`.
- **ui.select.** Chooses an option of a `<select>` by value or label.
- **ui.scroll.** Scrolls the element or the page by `dx, dy`, to `top` or `bottom`, or
  brings `h` into `view`.
- **ui.key.** Dispatches one key from `UI_KEYS` on `h` or the focused element.
  Backspace, Delete and Space on a read-only or disabled target fail as `ui.type` does
  (`E_NO_TARGET`). Tab moves focus as the browser would among exposed elements, and
  never to a private one unless `policy.privateInput`.
- **cursor.move.** Animates the virtual cursor to a target or, when
  `policy.coordinates`, to a point. Answers when the motion ends, or at once with
  `wait:false`. When the cursor is visible, `ui.click`, `ui.type` and `ui.select` glide
  it to their target first.
- **cursor.set.** Shows or hides the cursor, sets its label and colour
  (`COLOR_PATTERN`). A label longer than 40 characters is `E_BAD_ARGS`.
- **show.toast / show.highlight / show.clear.** Driver-rendered overlays. Text is
  always inserted as text.
- **show.view.** Validates `data` against the view's schema and calls the app's
  renderer. A request without `data`, for a view whose schema is an object, is
  validated as `{}` and the renderer is given `{}`. This is how data reaches the
  screen without passing through a model.
- **nav.go.** Resolves `url` against the page. It MUST be same-origin, `http:` or
  `https:`, with a path under one of `policy.nav`. Otherwise `E_DENIED`. A navigation
  that reloads the page ends the surface session, and the agent attaches again.
- **read.** Visible text of an element or of the page, at most `max` characters
  (default 2000, cap 8000). Private and ignored subtrees are left out. Under
  `annotated` exposure only annotated regions are readable.
- **chat.say.** Posts a message in the page's chat room (section 12). `text` is trimmed of
  white space at both ends, as ECMAScript `trim` does, and is then 1 to 4000 characters of
  well-formed Unicode; anything else is `E_BAD_ARGS`. Nothing inside the text is changed.
  `to` is `person`, for the person alone, or names one other agent of the room by its
  session id, as `from.id` of its messages gives it. `to: "person"` is always taken, and no
  agent is sent that message. Any other `to` is `E_DENIED`, at the surface and at the hub,
  when no other agent hears the speaker (`chatRelay`, section 12), whoever it names, and
  `E_BAD_ARGS` when it names no other agent that hears the speaker. The hub forwards the
  trimmed `text` and `to`, and no other param. The answer is the `id` the message has for
  the agent that said it.
- **chat.read.** Returns the messages this agent may read (section 12), its own among them,
  oldest first: without `since` the latest `max` of them, with `since` the first `max`
  whose `id` is greater. `max` is 20 by default and 50 at most. An answer holds at most
  128 KiB of JSON, and at least one message when there is one. Where that cuts an answer
  short, the latest are cut at their older end, so that what is returned is the newest
  that fits, and an answer with `since` stops early. `next` is the `id` of the last message
  returned, or `since` (0 without it) when there is none; passed as `since` it reads on
  from there.
- **chat.status.** Says what the agent is doing. `state` is `idle`, `thinking` or
  `working`. `note` is at most 80 characters once every run of white space and control
  characters has become one space. Anything else is `E_BAD_ARGS`. The Chat tab shows state
  and note after the agent's name, the note quoted as that agent's words (section 12). They
  are told to no other agent, a note is dropped with `idle`, a state that was not renewed
  for 2 minutes reads `idle` again, and every state is dropped when a consent prompt comes
  up.
- **Targets.** `e12` is a handle from the tree. `#cart.checkout` is a
  `data-reins-id`. An unknown, detached or unexposed target is `E_NO_TARGET`. `ui.*`
  never accepts coordinates.
- **Ordering.** A surface runs commands that change the page one at a time, in arrival
  order. `observe`, `read`, `state.get` and the three `chat` methods are answered
  immediately: chat changes the Chat tab and nothing on the page.
- **Pause.** While the user has paused control, every method outside
  `READ_ONLY_METHODS` (`observe`, `read`, `state.get`, `sub`, `unsub`, `chat.read`) fails
  with `E_PAUSED`, except `chat.say` and `chat.status` (`CHAT_SPEAK_METHODS`): a paused
  agent can still answer the person.
- **Prompt up.** While a consent prompt is showing or queued, every method outside
  `READ_ONLY_METHODS`, from every agent, fails with `E_BUSY`, `chat.say` and `chat.status`
  among them, and pointer frames are dropped (their credit is returned). `attach`, `detach`
  and `stream.close` still work.
  The page cannot change between the person reading a prompt and answering it. An
  action whose prompt a level or a rule waived is no exception (section 12).
- **Waiting.** (0.2) `act` and `surface.attach` may fail with `E_WAITING` and `data: {tk,
  ms}`: the request waits for the person in the surface's panel for `ms` more, and
  nothing ran. `tk` is the ticket; sent back with the same request (`tk` in the params),
  it lets the request go ahead once after the person approved it. The surface tells the
  agent how the request was answered with `evt user {kind:"answer", tk, answer, a?}`
  (section 12, "Requests that wait"). The same request sent again meanwhile is answered
  `E_WAITING` with the same ticket and shows the person nothing new. The hub checks the
  ticket before it forwards anything (section 13, "Requests that wait"): a `tk` that is not
  a ticket, or not one the surface gave this agent session for this surface and this
  request, is `E_BAD_ARGS`, in the same words for each.
- **Checks hold across waits.** A command that waited (for a cursor glide, a consent
  prompt, or the person to stop typing) checks again, right before it acts, that the
  grant is live, its scope is still on, control is not paused, no consent prompt is up
  (except for the action just approved) and the indicator is usable. Stop or Pause
  pressed during a glide means the click never happens. An action that no prompt was
  shown for runs only if the person's level and rules still let it run without asking:
  otherwise it fails with `E_CONSENT` (the person blocked it meanwhile) or `E_BUSY` (it
  would now ask; the agent sends it again). An action the person approved does not run
  either once they have blocked it (the rule `deny`): the later word counts, and it
  fails with `E_CONSENT`.
- **Private targets.** Every command that synthesises input (`ui.click`, `ui.type`,
  `ui.select`, `ui.key` on any key, `ui.scroll` aimed at an element), and a click on
  the label of a private control, fails with `E_DENIED` on a private target unless
  `policy.privateInput`. So does a command that would change a private control it does
  not target: `ui.type` with `clear` on an editable element that contains private
  elements, a radio whose group has a private member, and a reset control whose form
  holds a private field.
- **Pointer stream.** `stream.open` fails with `E_DENIED` when `policy.coordinates` is
  off, at the hub and at the surface.

## 10. Observation

The UI tree is a flat list of `UiNode` in document order. `p` points at the nearest
exposed ancestor.

**What is exposed.** Under `auto`: interactive elements (buttons, links, inputs,
selects, textareas, elements with an interactive ARIA role or a `tabindex`), headings,
images with alt text, dialogs, live regions (`status`, `alert`), named landmarks and
forms, and every annotated element. Under `annotated`: only elements carrying
`data-reins-id` or `data-reins="expose"`. Under `none`: nothing.

**Never exposed.** The driver's own overlay; anything hidden (`hidden`, `inert`,
`aria-hidden="true"`, `display:none`, `visibility:hidden`); any subtree marked
`data-reins="ignore"`.

**Private.** `input[type=password]`, fields whose `autocomplete` is `cc-number`,
`cc-csc`, `cc-exp`, `cc-exp-month`, `cc-exp-year`, `one-time-code`, `current-password`
or `new-password`, and any subtree marked `data-reins="private"`. A private node
appears with state `private` and never carries `val`. Besides `private` it reports
only `disabled` and `focused`, never `checked` or `selected`. Its text is never
returned by `read`. Privacy is sticky: an element that was ever private stays private
for its lifetime, so a "show password" toggle that changes the input's type exposes
nothing. It also survives a node swap. A text field (a `textarea`, an `input` of type
text, search, email, tel, url, password or number, or a `contenteditable` element) is
private for its lifetime when it has the same non-empty `id`, `name` or `data-reins-id`
as one of the last 32 private text fields that left the document, or when it is
inserted under the same parent as one of them within one second of its removal.

**Hidden text.** Text of an element with `visibility: hidden` or `collapse` is left
out of `read` and out of names, while its visible descendants are still read.

**Fields.** `role` is the ARIA role, explicit or implied by the tag. `name` follows a
simplified accessible-name order: `data-reins-label`, `aria-label`, `aria-labelledby`,
`<label>`, `placeholder`, `alt`, `title`, text content. A `<label>` or an
`aria-labelledby` reference counts only when it is inside the root and neither it nor an
ancestor is private, ignored, hidden or inert. A node inside a private subtree, or itself
marked `data-reins="private"`, is named only by `data-reins-label`. A field that is
private for another reason (its type, its `autocomplete`, a swap) is named by its
attributes and labels, never by `alt`, its value or its content. `val` is the current
value of a form control. Names are cut to 120 characters and values to 200, never inside
a surrogate pair.

**Handles** are `e` plus a base36 counter, assigned when an element is first seen and
kept for its lifetime.

**Revisions and deltas.** The surface keeps one revision counter for its tree and
remembers, per agent, the tree that agent last received. `observe` without `since`
returns a full snapshot. `observe {since}` where `since` equals the agent's last
revision returns `{base, ops}` with `set` and `del` operations. Any other `since`
returns a full snapshot. A subscribed agent gets `evt ui {rev}` when the tree changes,
at most once per 100 ms, and asks for the delta when it wants it.

**Applying a delta.** Ops apply in order. A `set` whose handle is already in the tree
replaces that node in place. A `set` with a new handle is inserted right after the
node of the preceding op when that op was a `set`, and at the front of the list
otherwise. A `del` removes the node with its handle, and does nothing when there is
none; either way a new handle right after it goes to the front. To place a new node, a
delta may therefore repeat an unchanged neighbour as an anchor. A sender emits only
`set` and `del`: `diffNodes` first deletes every handle that is gone or has moved (is
not on a longest run of surviving nodes that keep their old order), then
walks the new tree in order, sending every node that changed, moved or is new, each moved
or new node right after a `set` of its predecessor (the first node of the tree right
after the deletes). `diffNodes` and `applyOps` implement this
rule and every implementation MUST use them, or match them exactly.

**Text rendering.** `renderTree` and `renderOps` turn observations into the compact
form a model reads, one node per line, children indented one space under `p`:

```
e1 heading "Brew Kiosk"
e2 button "Latte 4.50" #menu.latte
e3 textbox "Name" = "Tiko" [focused]
 e4 checkbox "Extra shot" [checked]
```

A node line is the handle and the role, then ` "<name>"` when the name is not empty,
` #<id>`, ` = "<val>"`, ` [<states>]` (space-separated) and ` @x,y,w,h`, each only when
present. Names and values are JSON strings. The handle, role, id and states are printed
bare when they match `[A-Za-z0-9_][A-Za-z0-9_.:-]*`, and as JSON strings otherwise. A JSON
string here is one line to every reader: besides what JSON escapes itself, U+007F to
U+009F, U+2028 and U+2029 are written as `\uXXXX` (`jsonLine`), which is JSON for the same
string. Some readers end a line at U+0085, U+2028 or U+2029, and a page chooses its
names: without this a name could start a line of its own choosing in the tree. The title
in the header line and the enum values on the prompt card (section 7) are written the
same way.
Delta lines are `+ <node line>` for a new node, `~ <node line>` for a replaced one and
`- <h>` for a removed handle. A handle deleted and set again in the same delta (a move)
shows only its `~` line. Rendered against the tree the delta applies to, an anchor that
changes nothing shows no line.

**State.** An app exposes named state with a getter. `state.get` returns current
values. A subscribed agent gets `evt state {name, patch}`, an RFC 7396 merge patch
against the value that agent last received. A merge patch cannot express a property
whose value is null, so such a property reads as absent, in the value last sent as in
the new one: a state that differs from the last one only in null properties, or not at
all, produces no event.

## 11. Cursor and the pointer stream

**One-shot motion.** `cursor.move` costs one message. The driver animates locally at
display rate along a curved path with ease-in-out timing. Without `ms` the duration
follows distance: `clamp(120 + 110 * log2(1 + d / 40), 120, 900)` milliseconds.

**Pointer stream.** For live trajectories an agent opens a channel with `stream.open`
and sends binary pointer frames. Points are viewport fractions with a millisecond delta
each. The stream is visual, like the rest of the `cursor` scope. The frame layout, with
every integer little-endian:

| offset | size | field |
|---|---|---|
| 0 | u8 | kind: `0x01` (`BIN_POINTER`) |
| 1 | u8 | flags: `0x01` `PTR_FLAG_DROPPABLE`, `0x02` `PTR_FLAG_END` |
| 2 | u16 | `ch`, the channel `stream.open` returned |
| 4 | u32 | `seq` of the first point; each later point adds 1 |
| 8 | u16 | `n`, the number of points |
| 10 | 6 × n | the points, each u16 `x`, u16 `y`, u16 `dt` |

A fraction f is sent as round(f × 65535) after clamping f to 0..1 (a non-finite f as 0),
rounding halves up, and read back as u / 65535. `dt` is milliseconds since the previous
point, rounded and clamped to 0..65535. A frame holds at most 2729 points (16 KiB). A
binary frame whose kind is not `0x01`, or whose length is not exactly 10 + 6 × n, is
not a pointer frame and is dropped.

*Credit.* The surface answers `stream.open` with an initial credit in points
(`PTR_INITIAL_CREDIT`, 512). A sender MUST NOT have more unacknowledged points
outstanding than its credit. As the surface plays points back it returns credit with
`flow {ch, credit}`, batched: it sends a `flow` once at least a quarter of the window
has been consumed. The hub relays `flow` to the agent and closes a stream that
overruns its credit.

*Sender coalescing.* A sender that produces points faster than credit arrives keeps a
bounded backlog. On overflow it drops every second interior point and folds the
dropped `dt` into the next point, so the stroke keeps its shape and its total
duration. The first and last points are never dropped.

*Receiver playback.* The driver queues points and plays them on animation frames,
interpolating between points by `dt`. When the queue holds more than 120 ms of motion
it plays faster, in proportion to the lag and up to 4×, so the cursor converges on the
live position instead of falling behind. Pause and Stop stop the cursor where it is and
discard the queued points, returning their credit.

*Drop policy.* Frames flagged `PTR_FLAG_DROPPABLE` MAY be dropped by the hub when the
surface's send buffer exceeds 256 KiB; the hub then returns their credit to the agent.
A frame flagged `PTR_FLAG_END` is never dropped. `seq` lets the receiver notice a gap,
which it bridges with a straight segment.

*Rate.* The hub caps the points of all pointer streams one credential has open on one
surface, across all its sessions, at `policy.pointerRate` per second (a token bucket
with a burst of one second). Every forwarded frame costs at least one point of rate. A
frame with no points is dropped unless it carries `PTR_FLAG_END`. A stream that goes
beyond the rate, overruns its credit, or whose surface stops reading so that more than
1 MiB is waiting to be sent, is closed: the hub sends the surface `stream.close`, drops
later frames on the channel and relays no more credit. The agent is not told at once:
its `stream.close` for that channel answers `E_RATE`, and until it sends that the stream
counts toward its open streams. An agent that gives up on a stream, for example because
no credit arrived in time, MUST still send `stream.close` for it.

**Command batching.** The driver runs queued commands at the start of each animation
frame and stops when the frame has used 6 ms, so a burst of commands never blocks
rendering. Cursor targets that arrive within the same frame collapse to the newest.

## 12. Policy

A `Policy` (see `protocol.ts`) is a profile plus overrides. Three profiles exist:

| | `open` | `guarded` | `kiosk` |
|---|---|---|---|
| intended for | local development | a person's own browser | unattended stations |
| attach | allow | confirm | allow, with a provisioned agent |
| safe / sensitive / dangerous | allow / confirm / confirm | allow / confirm / deny | allow / deny / deny |
| scopes | all | all | observe, act, cursor, show |
| exposure | auto | auto | annotated |
| raw coordinates | yes | yes | no |
| a page inside a frame (`framed`) | refused | refused | refused |
| navigation | same origin | same origin | off |
| user controls | pause, stop | pause, stop | pause |
| levels the person may set (`human.levels`; strict and ask are always on offer) | strict, ask, auto, bypass | strict, ask, auto, bypass | strict, ask |
| the indicator opens the panel (`human.panel`) | yes | yes | no |
| agents hear each other in the chat (`chatRelay`) | `on`: always | `person`: once the person switches it on | `off`: never |
| remember approvals (`consent.remember`) | session | never | never |
| `consent.timeoutMs` | 60 s | 60 s | 30 s |
| a request nobody answered waits (`consent.waitMs`, 0.2) | 10 min | 10 min | no |
| a rule `allow` for a time (`human.allowMs`, 0.2) | 15 min | 15 min | 15 min |
| unasked runs of one action before it asks again (`human.burst`, 0.2) | 60 in 10 min | 20 in 10 min | no cap |
| actions offered at attach (`human.offer`, 0.2) | none | none | none |
| `human.yieldMs` | 600 ms | 800 ms | 400 ms |
| grant `ttlMs` / `idleMs` | 8 h / 30 min | 2 h / 15 min | 8 h / 5 min |
| `rates` per second: observe, act, ui, cursor, show, nav, chat | 30, 30, 60, 120, 30, 2, 10 | 20, 20, 40, 60, 20, 1, 5 | 20, 10, 0, 60, 10, 0, 0 |
| `pointerRate` per second | 4000 | 2000 | 2000 |

**Action decisions.** `decideAction` looks for an override in `policy.actions`: exact
name first, then the longest matching `prefix.*`. Without one it uses
`policy.risk[action.risk]`.

**Two enforcement points.** The hub evaluates its own policy on every request and
either refuses, forwards, or forwards with `c:1`. The surface evaluates the app's
policy and takes the stricter of its decision, of what the hub said in `attach` that it
decides for the action, and of `c:1`. Rate limits and grant expiry
are the hub's job. Exposure, privacy, frames, consent and human control are the
surface's. The person sets levels, rules and scope switches on the surface; the hub caps
the levels by its own policy and enforces the scopes.

**Frames.** A page inside a frame is not in charge of what the person sees of it. The
page around the frame can cover or overlay any part of it, the consent prompt and the
indicator included, and the framed page cannot tell. A driver whose document is not the
top-level document of its tab (`window.top !== window.self`) MUST NOT connect to a hub
unless the app's policy sets `framed: true`. Its `connect()` fails with `E_DENIED`
before anything is sent to the hub or added to the page. No profile sets `framed`. An
app that sets it SHOULD also say which pages may embed it, with a
`Content-Security-Policy: frame-ancestors` header. An Electron `<webview>` guest is in
the same position, and its driver cannot tell: the guest is the top-level document of
its own frame tree, while the page that embeds it can draw over it. That check is the
main process's (section 3).

**Consent.** A prompt names the agent, the scopes or the action, and shows the
arguments as text. It lives in a closed shadow root owned by the driver and accepts
only trusted input events, so an agent cannot approve its own request ("The overlay and
the page", below, says what that takes and where it ends). A prompt nobody answers
ends after `consent.timeoutMs`: as a refusal, or, where the surface keeps a waiting list,
by joining it ("Requests that wait", below). With `remember: session` an approved
action is remembered once its handler has run, and is not asked again under the same
grant unless the hub confirms the request (`c:1`, or an action the hub said in `attach`
that it confirms); an approval of such a request is not remembered. The approval then
covers that action name with any arguments, which is why only the `open` profile
remembers by default. Where an approval will be remembered, the prompt says so before
the person gives it. The panel shows a remembered approval where it shows the person's
rules, the indicator carries a mark for it, and the person takes it back in the panel
("The panel", below). An app MAY
supply its own consent handler, for example an attendant PIN on a kiosk; it gets the
request as data, and the display rules below are those of the driver's own prompt.

- *What is approved is what runs.* The prompt lists every argument in full and
  shortens nothing: indented JSON, two spaces per level, `"key": value` in objects.
  Every code point in `\p{C}`, in `\p{Z}` other than U+0020, in
  `\p{Default_Ignorable_Code_Point}`, and U+2800 is shown as a `\u{XXXX}` escape
  (hexadecimal, upper case), in the arguments and in every other string an agent or
  the hub wrote that the overlay shows: agent names, the attach reason, toasts and their
  captions, cursor and highlight labels, chat. Combining marks stack, and a letter that
  carries sixty of them is painted over the lines above and below it: in the same
  strings a surface MUST show every combining mark (`\p{M}`) beyond the second in a row
  as such an escape, and each line of the argument listing is a box of its own that
  clips what it paints. Arguments that cannot be shown in full are not
  put to the person at all: more than 40 object keys and array items in total,
  containers nested deeper than 4, a rendered listing of more than 2000 code points
  (escapes and indentation included), or a value that is not JSON. The request fails
  with `E_TOO_LARGE`. A card taller than the screen scrolls, and Allow stays inactive
  until the person has scrolled to its end.
- *Bounded.* One pending prompt per agent and four in total. More fail with `E_BUSY`.
- *A request's time runs from when it arrived.* The time a request has for an answer is
  counted from when it reached the surface, not from when its prompt is shown: a prompt
  that waited its turn behind another shows for what is left, and one whose time is up
  before its turn is not shown at all. A surface MUST NOT let a prompt wait longer than
  the hub waits for it: the time is the shorter of `consent.timeoutMs` and the
  `consentTimeoutMs` the hub announced in `welcome` (a limit that is not a positive
  number counts as the default, 60 s). So a request is answered inside the hub's wait
  (section 6), whatever an app's policy says. `detach` for an agent withdraws the
  request that is pending for it, also one that the app's own consent handler is still
  asking about: an answer given afterwards attaches nobody and runs nothing.
- *Cool-off.* After a refusal, a timeout, a "Later", or a prompt the agent itself withdrew
  (its session left the hub, or it attached again while its prompt was up), that agent's
  action prompts, and attach prompts from any agent, are refused with `E_RATE` for 2 s,
  doubling with each further one up to 60 s. An approval resets it. Three explicit
  refusals in a row of one agent's action prompts revoke its grant as Stop does, and the
  third request fails with `E_CONSENT`; a timeout, a "Later" and a withdrawn prompt do not
  count toward the three.
- *No accidental approval.* Allow ignores clicks for the first 500 ms after the prompt
  appears or moves, and shows that it is not yet active. A pointer click on Deny, or on
  "Later", is taken at once: neither approves anything.
- *Clear at a glance.* What refuses or puts off stands on the left of a prompt's foot
  (Deny, then "Later"), what approves on the right ("Always allow", then Allow, the one
  filled button), and above them one line says what happens if nobody answers. On a
  narrow screen the two groups wrap, each staying together.
- *Keys meant for the page answer nothing.* A prompt takes the focus, and the person may
  be typing, tabbing through a form or about to press Enter. A surface MUST NOT take a
  key as the answer to a prompt unless it is Enter or Space on a button of the prompt
  that has the focus, or Escape (which denies), and unless all of this holds: the key
  is not a repeat of one held down; at least 500 ms have passed since the prompt
  appeared or moved, since the focus landed on that button, and since any other key was
  pressed; and at least 3 s (`KEY_LOCK_MS`) have passed since the last key that types,
  wherever the focus was then, also before the prompt came up. A key that types is one
  that gives a character, Backspace or Delete, or any key pressed with Ctrl, Alt or
  Meta. The rest follows from it. The prompt puts the focus on itself, the dialog, where
  no key presses anything, not on a button. Tab does nothing during the prompt's first
  500 ms. Every key that is not itself an answer starts the 500 ms over. While the 3 s
  run the prompt says that keys do not answer it and that the pointer does. A person
  who means it still answers by the keyboard alone: Tab to the button, let the focus
  rest there, Enter. This goes for Deny as for Allow: a key meant for the page neither
  approves nor refuses.
- *Nothing an agent drew stands beside a prompt.* When a prompt comes up, a surface MUST
  take down every toast and highlight and hide the cursor's label, and none can be put
  up while it shows ("Prompt up", section 9). What an agent says is on the prompt
  itself, under the agent's name; the cursor's label comes back when the prompt has
  gone, toasts and highlights do not.
- *No timer has to fire.* Every wait named here is a time, compared with the clock when
  a click, a key or a request arrives: the arming delays, the 3 s after typing, the
  cool-off, the deadline of a prompt. A surface MUST NOT rely on a timer callback for
  any of them, because timer ids belong to the document and anything that shares the
  document can clear them ("The overlay and the page"). A prompt past
  its time is no longer answerable from the moment anything looks at it (a click on it,
  the next request, the next prompt), whether or not its timer fired, and a "Request
  withdrawn" notice makes way the same way. So do a request in the waiting list that is
  past its time, a rule `allow` that was set for a time, and the notice after a refusal. A timer that never fires may leave something
  on screen (a toast, a highlight, a countdown that stands still, a button that still
  looks inactive); it never leaves anything answerable or running that would not be so
  otherwise. A command that waits for a glide or for the person to stop typing waits on
  a timer, and without it never runs.
- *The focus comes back.* When a prompt goes away, the surface gives the focus back to
  where it was when the prompt appeared: the element of the page, or the control of the
  overlay.
- *No silent swap.* A prompt withdrawn while it is showing (its agent detached or
  disconnected) becomes a "Request withdrawn" notice with no Allow button for 1.5 s
  before any next prompt.
- *Honest about the hub.* When the hub is unverified the prompt says so.

**Requests that wait.** (0.2) A person who is not looking at the page misses a prompt.
Where a request can wait, its prompt has a third answer, "Later", and a prompt nobody
answered in time is not a refusal either: the request joins the surface's *waiting
list*, and its answer is the error `E_WAITING` with `data: {tk, ms}`. `tk` is a ticket,
1 to 32 characters of `[A-Za-z0-9_-]` that carry at least 96 bits from a CSPRNG (the
reference driver sends 16 random bytes as 22 characters of base64url). `ms` is how long
from now the request waits. Nothing ran. A request can wait when all of this holds: the
surface's policy has `consent.waitMs` above 0; the surface has the panel and the
indicator, where the person finds the list; the prompt is the driver's own, since an
app's consent handler cannot be opened again; the hub speaks 0.2, and so does the agent's
own link (the hub says which version that is with `v` in `attach`, section 8: an agent
on 0.1 could never come back with a ticket, and the person would approve what can never
run); and the list has room.

- *One entry for one request.* A request is the same as one in the list when it comes
  from the same agent session and asks for the same thing: for `act`, the same action
  with arguments that are equal as canonical JSON (section 7), no `args` being `{}`; for
  `attach`, the same scopes after the surface's policy capped them. A surface MUST NOT
  show a prompt for such a request, and adds nothing to the list: the request is answered
  `E_WAITING` again, with the same ticket and the time that is left.
- *Bounded.* An entry lasts `consent.waitMs` from when it joined the list, judged by the
  clock, and an approval lasts until then too. The list holds at most 3 requests of one
  agent and 12 in all. Where a request could not join, its prompt has no "Later", and
  with no answer it ends as `E_CONSENT`, as on a surface without a list. An agent's
  entries end with its grant, however it ends: when the hub sends `detach` for that agent,
  when a new attach of the same agent replaces the grant, when the person presses Stop,
  and when the link to the hub closes. An approval belongs to one grant, like everything
  that lets an agent do more (section 8). Where the agent can still be told, it is:
  `expired` for each entry, or `deny` after Stop.
- *Not answered is not refused.* A prompt nobody answered and one the person put off
  move the cool-off as a timeout does ("Cool-off", above), so that an agent cannot
  throw one prompt after another by having them put off, and count as no refusal.
- *Told to the person.* The indicator says how many requests wait. With no agent
  attached and a request to connect in the list, the indicator is shown for that alone:
  it says that an agent is waiting to connect, not that one is connected, and it opens
  the panel. The panel lists the requests ("The panel", below).
- *Review.* "Review" in the list opens the request's prompt again as it was asked: the
  same card with the same arguments, under every rule of a prompt (the arming delays,
  the rule for keys, scrolling to the end, nothing an agent drew beside it). Allow there
  approves the request and Deny refuses it; "Later", or no answer, leaves it in the list
  and moves no cool-off, since the agent asked nothing new. "Discard" in the list refuses
  a request without a prompt, and "Take back" does the same to an approval the agent
  has not used; neither counts toward the three refusals that revoke a grant.
- *Told to the agent.* The surface sends `evt user {kind:"answer", tk, answer, a?}` with
  `ag` set to the session that asked: `answer` is `allow`, `deny` or `expired`, and `a`
  is the action's name for an `act` request (never its arguments). After an approval the
  surface tells the person, in its own words, that the agent is told and that the
  request goes ahead when the agent asks again, before the time the entry ends.
- *Approved means one use.* The agent repeats the same request with the ticket: `act
  {a, args, tk}` or `attach {..., tk}`. A surface MUST let a request go ahead on a ticket
  only when the ticket names an approved entry, the request comes from the agent session
  the entry belongs to (for `attach` also with the same `cred`, where the hub sent one
  with the request that waits), and it asks for the same thing as the entry, as defined
  above. The approval is then used up, and is not remembered (`consent.remember`). A
  ticket that is unknown, used, expired or another agent's names nothing: a surface MUST
  handle such a request as if it carried no ticket. An approved request that comes
  without its ticket is answered `E_WAITING` once more. An approval outranks nothing the
  person or a policy says: a `deny` of the policy, and a Block the person set meanwhile,
  refuse the request all the same.
- *On record.* The activity list shows that a request waits, and what the person did
  with it, with the action's name and never its arguments.

**Offers at attach.** (0.2) An app can name, in `human.offer`, up to 8 of its actions that
an attach prompt may offer to allow without asking each time. The prompt lists them
under "Without asking each time", each with a box. A surface MUST NOT show a box ticked
that the person did not tick. An action is offered only where the person could set the
rule `allow` for it in the panel and the rule would change something (`offeredActions`):
the app declares it; a request for it asks (the stricter of the app's decision and the
hub's is `confirm`; an action that runs anyway needs no rule, and none runs a denied
one); and a level on offer would waive that prompt ("Levels and rules"). What the person
tightened before for the agent wins (section 8): nothing is offered for a grant that
stays at `strict`, and an action that keeps their `confirm` or `deny` rule is left out;
the prompt names what was left out. Nothing is offered where there is no attach prompt
(`attach: allow`), with an app's own consent handler, or without the panel.

A tick alone changes nothing. When any box is ticked, Allow does not grant: it opens a
second step that names the agent and exactly the ticked actions, says that they will
run without asking, with any arguments, and for how long, and whose button is armed
anew. Only that button grants. The grant then starts with the rule `allow` for each
ticked action, set as if the person had set it in the panel: under the same conditions,
shown on the indicator and in the panel, where it is taken back, and reported to the hub
with `evt user {kind:"rule"}` (section 13). The report goes out once the hub has the
answer to `attach`, and a surface MUST NOT let an action run under such a rule before it
has sent the report. What the person tightened wins over an offer at every moment: a
surface MUST NOT set a rule `allow` from an offer for an action the person has set to
`confirm` or `deny`, on the grant or kept for the agent (section 8), and MUST NOT take
such a rule away for it. That holds also for an offer ticked on a reviewed attach prompt
and approved in the waiting list before the person set the rule: the ticketed attach
leaves the rule as it is, and the activity list says that the offer did not apply.

The second step, and the choice of how long under it, are drawn inside the scrollable
part of the prompt, under what the person has read, so that on a short screen the
prompt's buttons stay where they are. What was read stays read: the step is brought into
view, and the person has to scroll only to what is new, where the step itself is taller
than the view.

**After a refusal.** (0.2) When the person refused an action prompt, the surface shows a
short notice of its own for 8 s: that the action did not run, and up to two things they
may do about it with one click. One sets the rule `deny` for that action and that agent
(it makes the agent ask less of them, so it takes no second step). The other, where the
agent holds the `chat` scope, opens the panel's Chat tab with that agent addressed, for
the person to say why. The notice asks nothing and holds nothing back: it is no dialog,
takes no focus and has no text field, its buttons ignore clicks for their first 500 ms,
it goes by itself, judged by the clock, and it is taken down when a prompt comes up.
There is none after a refused attach, nor when the refusal ended the grant.

**Attention.** (0.2) A driver tells its app how many consent prompts are showing or
queued and how many requests wait for the person's answer, whenever either number
changes (`on('attention')`, section 15), so that an app whose window is not in front
can flash its taskbar entry or raise a notification of its own. The event holds the two
counts and nothing else. A surface MUST NOT put anything an agent wrote into it, and
changes nothing of the page for it: not the title, not the icon.

**Human control.** While an agent is attached the driver shows an indicator naming
it, with Pause and Stop when the policy enables them. Pause holds every command that
changes the page. Stop revokes the grant: the surface sends `evt grant {kind:"revoked"}`
and the hub ends the grant. After Stop, or a revocation after refusals, every later
attach on that page needs the person's approval until the page is reloaded. Trusted
pointer, key, wheel and touch input (a pointer move only with a button down) holds
input-synthesising commands: every `ui.*` command waits until there has been no such
input for `human.yieldMs`, then runs, and fails with `E_PAUSED` if the person keeps
using the page for 5 s. The first such input after a quiet period of `human.yieldMs`
emits `evt user {kind:"override"}`.

The indicator has to stay visible and usable. A modal dialog or a fullscreen element
covers the rest of the page and makes it inert, so while one is open the driver moves
its overlay inside it. The indicator also stays above a consent prompt's backdrop, so
Pause and Stop work while a prompt is up. Whenever the overlay cannot be shown where
the person can see and use it, every method outside `READ_ONLY_METHODS`, and attach,
fails with `E_PAUSED`.

**The overlay and the page.** The indicator, the panel and the prompts are the overlay.
It shares a document with the page's own stylesheets and scripts. What follows keeps the
page's stylesheets from changing what the person reads in it, and keeps an agent, and
events a script makes or borrows, from answering in the person's place. It does not
keep out script that runs in the page itself; the last item says where that ends.

- *Its own style.* The overlay's stylesheet MUST NOT read a custom property and MUST NOT
  name a font family other than the generic `system-ui`, `sans-serif`, `serif` and
  `monospace`. A page can set a custom property for the whole document, register one so
  that it takes no value from outside (`@property`), and define a font under any other
  name (`@font-face`). The host element resets every property (`all: initial`) and pins
  `direction` and `unicode-bidi`, which `all` leaves alone. Both colour schemes are
  written out in the stylesheet and chosen by `prefers-color-scheme`. The stylesheet
  names no system colour and fetches nothing, and what is not written in the plain subset
  the driver checks it against (no escapes, no comments, a fixed list of functions and
  at-rules) is refused rather than read.
- *No box of the page's on the host.* The host is an element of the page's document, so
  a page selector can name it and give it boxes of its own: `::before` and `::after`,
  which lie over everything inside it, top layer or not, and with `:focus-within` only
  while a prompt holds the focus. The overlay's stylesheet MUST take the host's
  `::before`, `::after` and `::marker` away and keep its `::backdrop` from showing, with
  declarations a page rule cannot override, and it sets the colours of selected and
  highlighted text inside the overlay itself (`::selection`, `::target-text`), so that
  none of them is the page's to choose.
- *The top layer.* Where the browser has the Popover API, the host is a
  `popover="manual"` element. The surface shows it, and shows it again when another
  element has entered the top layer after it, so that it is painted last. There a
  filter, an opacity, a transform, a clip path, a mask or a blend mode on an ancestor
  does not reach it, and no `z-index` of the page lies above it. Inside a modal dialog
  or a fullscreen element the host still moves in, as above. Where the Popover API is
  missing the host is a fixed element at the highest `z-index`, an effect on an ancestor
  does reach it, and the check below is all that stands between such a style and the
  person.
- *Checked.* A surface MUST treat the overlay as one that cannot be shown where the
  person can see and use it (above) while any of this holds: the host is not in the
  document, is inert, or does not cover the viewport; where the Popover API exists, the
  host is not in the top layer or is not the last element in it; the host is not drawn
  at its own size, because `zoom` on it or on an ancestor multiplies down to it, top
  layer or not; the host has `content-visibility: hidden`, an `opacity` below 1, a
  `visibility` other than `visible`, a `filter`, a `backdrop-filter`, a `clip-path`, a
  `mask-image`, a `transform` (also as `translate`, `rotate` or `scale`) or a
  `mix-blend-mode`; the host or an ancestor has `display: none` or
  `content-visibility: hidden`, or an ancestor has any other of those while the host is
  not in the top layer; the indicator has no box, or is not what a hit test finds at its
  own centre; or the browser reports the indicator, the open panel or the prompt that is
  showing as not visible, where it can (IntersectionObserver with `trackVisibility`).
  Whether there is a layout to check at all is asked of the window (it has a visual
  viewport with a size), not of the overlay's boxes: a page that renders nothing leaves
  every box empty, and that is a failed check, not a missing layout engine. The three
  things the observer watches are not animated in and keep clear of each other's
  shadows, so that what it reports is the page's doing.
- *Nothing loosens meanwhile.* While the overlay cannot be relied on in that sense, a
  surface MUST NOT take a click on Allow or "Always allow" of a prompt, nor on a control
  of the panel that lets an agent do more ("The panel", below). The prompt stays up and
  its time runs on; Deny, and what makes an agent do less, are still taken. Once the
  overlay can be relied on again, the card and the open panel say that a click was not
  taken and why, and every arming delay starts again. A check that had to put the
  overlay back (show it again in the top layer because something had come over it, or
  move it) found it covered or out of place: the click that caused that check was made
  on what the person saw then. A surface MUST NOT take that click as one that lets an
  agent do more; only a later, separate one counts. Commands go on once the overlay is
  back.
- *Only the person's input.* A surface MUST NOT act on an event unless the browser made
  it for input of the person (`isTrusted`) and is delivering it to the control the
  listener was registered on. The reference driver reads `isTrusted` through the getter
  the browser defines for it, and keeps that getter and the functions it registers
  listeners, builds elements, sets timers and reads the clock with from the moment its
  script first runs. So an object that says it is trusted, an event a script dispatched,
  and a real click of the person on something else that a script hands to a control's
  listener all do nothing, and a script that replaces `addEventListener` afterwards is
  handed no listener of the overlay to call. The watch for the person's own input
  ("Human control") reads the same getter. That is all this item closes: forged events,
  and borrowed ones, through hooks on the functions that register listeners.
- *Where it ends.* Script that runs in the page's own JavaScript realm can defeat the
  overlay, whatever the order in which it and the driver load. The driver is ordinary
  script in that realm: it keeps its prompts in an array and its sessions in a map, sets
  attributes and reads properties through methods every script can replace, and a script
  that replaces `Array.prototype.push`, `Map.prototype.get` or
  `Element.prototype.setAttribute` after the driver has attached is handed prompts to
  answer, sessions to change and the closed shadow root itself, with no input from the
  person at all. Such script can also draw its own copy of an indicator or a prompt, or
  simply call the app's functions. It is outside what "trusted input only" defends
  against, here and in section 14 (`docs/SECURITY.md`), and no load order changes that.
  There is a boundary where the driver does not share a realm with the page: in an app
  adopted by `reins-electron` (section 15) the driver runs in an isolated world with
  built-ins of its own, and the page's script reaches the document it shares with the
  driver (elements, styles, timers) and nothing of the driver's code or objects. What
  it can still do there is what this section handles as the page's doing: style the
  host, cover it, remove it, and clear timers ("No timer has to fire", above). A
  browser without the Popover API leaves the overlay outside the top layer, and one
  without `trackVisibility` (every engine but Chromium) cannot tell the surface that
  something the document does not list is painted over it: there a click that finds
  the overlay covered is not taken, and a cover that takes no clicks and that the
  document does not list is not noticed.

**Levels and rules.** How much the person is asked about one agent's actions is theirs
to set, for each grant. A grant has a level, one of `LEVELS`:

| level | what an `act` request does |
|---|---|
| `strict` | asks every time, also for an action the policy allows |
| `ask` | asks when the policy says `confirm` or the hub sent `c:1` |
| `auto` | runs without asking, unless the action's risk is `dangerous` |
| `bypass` | runs without asking |

A grant starts at `ask`, or at `strict` where the person set that for the same agent
before and the surface kept it (section 8). `strict` and `ask` are on offer for every grant, whatever
a policy lists: neither lets an agent do more. `auto` and `bypass` are on offer where
both the surface's policy and the hub's policy list them in `human.levels`. The hub
sends its list in `attach` (section 8), and a surface that got no list offers `strict`
and `ask` alone. A surface MUST NOT put a grant at a level that is not on offer for it.

*What the hub decides.* The hub's policy decides each action as the surface's does, and
may be stricter. The hub says so in `attach`: `decisions` holds its decision for each
action in the surface's manifest (section 8). Wherever this section speaks of what the
policy decides for an action, a surface MUST take the stricter of its own policy's
decision and the hub's (`stricter`, with `deny` before `confirm` before `allow`), and MUST
take the hub's as `confirm` for an action that `decisions` does not name, for a value
that is not a decision, and when the hub sent no `decisions` at all: such a hub may
confirm anything. `hubDecision` reads it that way. The surface also holds the hub to its
word. A request for an action the hub said it confirms is treated as carrying `c:1`
whether it does or not, a request for one the hub said it denies is refused with
`E_DENIED`, and a request that carries `c:1` for an action the hub said it allows asks
all the same. What the panel shows as asking therefore does ask, and no step in the
panel waives without saying so a prompt that only the hub wants.

The person can also set a rule for one action of one agent: `allow`, `confirm` or `deny`.
A rule covers the action name with any arguments, and the panel and the prompt say so
where a rule is set. `confirm` and `deny` only tighten and can always be set. `allow` for
an action the policy asks about can be set only where a level on offer would waive the
same prompt: `auto` or `bypass` for an action that is not dangerous, `bypass` for a
dangerous one. Where it cannot be set, the panel shows Allow switched off and says why,
so that no honest click sets a rule the hub would refuse (section 13). No rule can be
set for an action the policy denies.

An `act` request is decided in the order below. `decideAct` implements it, and every
surface MUST use it or match it exactly; `conformance/vectors/levels.json` lists the cases.

1. The policy's decision for the action (`decideAction`), made `confirm` at least when
   the request carries `c:1` or the hub said that it confirms the action. `deny` is
   `E_DENIED`: nothing the person sets relaxes a `deny`.
2. The rule `deny` is `E_CONSENT` ("the user blocked this action"). No prompt is shown and
   nothing counts toward the cool-off.
3. A prompt is needed when the decision is `confirm`, or the level is `strict`, or the
   rule is `confirm`.
4. A needed prompt is waived by the rule `allow`, by the level `bypass`, and by the level
   `auto` unless the action's risk is `dangerous`. A rule beats the level: under `bypass`
   the rule `confirm` still asks, and under `strict` the rule `allow` still runs.
5. The rule `allow` waives a prompt that step 1 demands only where it could be set (see
   above). A level of `auto` or `bypass` that is not on offer counts as `ask`.
6. A prompt that is still needed is shown, unless a remembered approval answers it
   (`remember: session`). Nothing is remembered, or answered from memory, under `strict`,
   under the rule `confirm`, or for a request the hub confirms (step 1).

*A rule for a time.* (0.2) Where the policy has `human.allowMs` above 0, every confirm
step that sets the rule `allow` lets the person choose how long it holds: until the agent
disconnects, which is preselected, or for `human.allowMs`. That goes for the panel, for
"Always allow" on a prompt, and for the offers on an attach prompt. Choosing the longer
of the two is a click that lets an agent do more, and the step's button is armed anew
after either choice. A rule for a time ends by the clock: a surface MUST NOT let an
action run on a rule `allow` whose time is up, whether or not a timer fired. The action
then follows the level again. The surface reports such a rule as `evt user {kind:"rule",
a, d:"allow", ms}`, `ms` being how long it lasts from now, and its end as `evt user
{kind:"rule", a, d:null}`, like a rule the person removed. The panel shows when the rule
ends, and so does the indicator's mark for rules. A rule for a time can be set again,
for the time or for good.

*Rate cap.* (0.2) A level or a rule lets an action run without asking however often it
is called. `human.burst` `{max, perMs}` bounds that: the surface counts, for each grant
and action, the runs whose prompt was waived, by the person's rule `allow`, by the level,
or by an approval it remembers. At most `max` such runs within `perMs` go unasked
(`burstStep`; `conformance/vectors/consent.json` lists the cases); a run no longer
counts `perMs` after it happened. A further call within that time asks: its prompt says,
in the surface's own words, how often the action ran unasked in that time and what let
it, and offers no "Always allow". Allow runs that call and starts the count again; the
rule or the level stays as it is. Deny, "Later" and no answer are what they are on every
prompt. An action that needs no prompt at all (the policy allows it and the level is not
`strict`) is not counted. `human.burst: false` switches the cap off.

A waived prompt is not an approval. An action that runs because a level or a rule waived
its prompt MUST NOT run while a consent prompt is showing or queued: it fails with
`E_BUSY`, like any other command, and it is not remembered as approved. Changing a level
or a rule answers no prompt: one that is showing or queued stays until the person answers
it or it times out. Levels and rules decide `act` requests only; the other scopes are
switched off as a whole (section 8).

**The panel.** With `human.panel` the indicator's text is a button that opens a panel in
the same closed shadow root. Its Permissions tab shows, for each attached agent: the
agent's name, a mark when the hub is unverified, the level with one plain line for each
level on offer, every action of the app with its risk and what happens now when that
agent calls it (Allow, Ask or Block; "Blocked by app" or "Blocked by hub" where a policy
denies), the scopes of the grant as switches, and, where the policy has Stop, a control
that ends that one grant as Stop does. Under each action it says why it stands as it
does: the person's rule, an approval the surface remembers, or the level, and that the
hub asks about it where only the hub does. Above the agents it lists the requests that
wait ("Requests that wait"): for each the agent, the action's name and risk or that the
agent wants to connect, when it was asked and until when it waits, with Review and
Discard; and for one the person approved, that the agent is told and until when it may
use the approval, with Take back. The list holds no arguments. Its Activity tab lists the last 50 commands: the time, the agent, the method or the
name of a declared action, the outcome, and whether the person, a level, a rule or a
remembered approval let an action run. The same command of the same agent several times
in a row is one line with a count; two agents with one name are two agents there too. The activity list MUST NOT hold arguments, results or page text. Its
Chat tab is the page's chat room ("Chat", below).

- *Only the person.* The panel opens and closes on the person's trusted input alone
  (as "The overlay and the page" defines it, with the limit stated there), and
  Escape closes it. No protocol message opens it, closes it or reaches anything in it. A
  surface MUST NOT change a grant's level, a rule or a scope switch except on trusted
  input from the person on its own controls.
- *Loosening takes two steps.* A surface MUST show a confirm step, and apply the change
  only when the person confirms it there, before each of these: a level of `auto` or
  `bypass` above the current one; any level under which an action that asks now would
  stop asking (`ask` after `strict`); the rule `allow`, always, whatever it waives at
  that moment; and Reset where the action would then run without asking. The step names
  the agent, lists the actions that would stop asking, among them those that only the
  hub asks about, repeats the warning about an unverified hub when that applies, and its
  confirm button ignores activation for the first 500 ms after the step appears or
  moves. A step that opens below the visible part of the panel is scrolled into view.
  "Always allow" on a prompt sets the rule `allow` the same way: a second press, armed
  again, after the card has said what the rule covers. What makes an agent ask more or
  do less applies at once: a level under which nothing stops asking, the rules `confirm`
  and `deny`, a scope switched off, a reset after which the action asks. Lifting the
  person's own Block to Ask, and switching a scope back on, give back a prompt or what
  the person granted at attach: they take one click, on a list that has settled (below).
- *Reset, and what is remembered.* The panel MUST NOT show an action as asking while an
  approval the surface remembers would let it run: it shows it as allowed and says that
  the person approved it earlier. Reset takes the person's rule for the action away and
  that approval with it, and choosing Ask forgets the approval as well.
- *Always in sight.* While an attached agent's level is not `ask`, the indicator MUST
  show that level: a chip with its name, and a dot that is amber for `auto` and red for
  `bypass`. While a rule `allow` of the person waives a prompt that would otherwise be
  shown, the indicator MUST show that too: a chip that counts those rules, and the dot of
  the level that would waive the same, amber, or red when one of the actions is
  dangerous. An approval the surface remembers does what such a rule does, and is counted
  on the same chip while it lets an action run without asking. The indicator's colours
  and marks are part of the overlay's own stylesheet
  ("The overlay and the page"), not values a page can set. Pause and Stop stay where
  they are and stay usable while the panel is open, also inside a modal dialog or a
  fullscreen element.
- *Named apart.* Wherever the overlay names an agent in words of its own (a prompt, a
  confirm step, a heading of the panel, the indicator, a line of the activity list), the
  agent's name MUST be shown inside quotation marks, with quotation marks inside the name
  shown as escapes, and followed by its session id, so that a name cannot pass for words
  of the surface or finish one of its sentences, and two agents with
  one name are told apart.
- *No silent redraw.* When what is under the pointer changes other than by the click the
  person is making, the controls that let an agent do more ignore activation for 500 ms.
  That is so when the list changes (an agent attached or left), when a consent card or
  its backdrop goes away, when a confirm step opens, and after the person's own click on
  a confirm step's button, whose second half as a double click lands on what comes up
  under it. While a consent prompt is up, a wide viewport shows the card beside the
  panel; on a narrow one the panel stays under the prompt's backdrop until the prompt is
  answered. With focus in the panel, Escape closes the panel and denies nothing.
- *Told, and recorded.* The surface reports each change to the hub with `ag`:
  `evt user {kind:"level", level}`, `evt user {kind:"rule", a, d, ms?}` (`d` is null when
  the rule was removed or its time ran out; `ms` is there for a rule `allow` that ends by
  itself) and `evt grant {kind:"scopes", scopes}`. The hub records them and tells the
  agent (sections 8 and 13).
- *One grant for what loosens.* A surface MUST NOT carry the level `auto` or `bypass`, a
  rule `allow` or a remembered approval from one grant over to another. What the person
  tightened it carries (section 8).

**Chat.** A page has one chat room: the person at the page, and every attached agent whose
grant holds `chat` with the scope switched on. The room is the Chat tab of the panel, the
third after Permissions and Activity, so a surface that has no panel to open (`human.panel`
off, or no indicator) grants no `chat` scope. The person reads and writes in the tab. An
agent speaks with `chat.say`, reads with `chat.read`, says what it is doing with
`chat.status` (section 9), and hears the room as `evt chat` (section 6).

A message is `{id, from, text, ts, to?}`. `id` is a label for `chat.read`. For each agent
it counts up from 1 on each page load over the messages that agent may read, its own among
them, and it goes on counting when the agent's grant is replaced. One message so has a
different `id` for each agent it reaches, and an agent's ids say nothing about what was
said to others. `from` is `{kind:"person"}` or `{kind:"agent", id, name}`, with the agent's
session id and the display name its grant carries. `text` is 1 to 4000 characters. `ts` is
the surface's clock in epoch milliseconds. `to` is the session id of the one agent a
message was addressed to, or `person` on an agent's message for the person alone; no hub
hands out `person` as a session id. The room keeps the last 200 messages, in memory and
nowhere else: the transcript ends with the page.

*Who hears whom.* Every agent in the room hears the person. Whether agents hear each other
is `chatRelay`, a field of the surface's policy and of the hub's: `off` (never), `person`
(once the person switches it on in the Chat tab) or `on` (always). The stricter of the two
applies, `off` before `person` before `on`. The hub sends its value with every `attach`
(`chatRelay` in the params), and a surface that is sent none takes it as `off`. In a
policy file `true` reads as `on` and `false` as `off`. *The agents that hear each other*
are, under `on`, every agent in the room; under `off`, none; and under `person`, the
agents the person switched on ("Who hears whom is the person's choice", below).

The person sees every message in the Chat tab, also what one agent says to another, each
under who said it and, when it was addressed, to whom. Which agents are sent a message is
decided in the order below. `chatAudience` implements it, and every surface MUST use it or
match it exactly; `conformance/vectors/chat.json` lists the cases.

1. A message of the person goes to the agent `to` names when that agent is in the room, and
   without `to` to every agent in the room. A message that no agent would hear is not kept:
   one addressed to an agent that has left is not sent to the others instead.
2. An agent's message with `to: "person"` is kept and is sent to no agent, whatever the
   room relays.
3. An agent's message with any other `to` is refused with `E_DENIED` when the speaker is
   not among the agents that hear each other, whoever `to` names, so that the answer says
   nothing about who else is attached. Otherwise it is refused with `E_BAD_ARGS` when `to`
   names no other agent among them, and else it goes to that agent alone.
4. An agent's message without `to` goes to every other agent that hears the speaker, and
   to no agent when the speaker is not among the agents that hear each other. A speaker is
   never sent its own message.

- *Who hears whom is the person's choice.* Under `person` no agent hears another until the
  person switches "Agents can hear each other" on in the Chat tab. That lets agents receive
  more, so it is made like raising a level: on trusted input, through a confirm step that
  names every agent that will then hear the others, and whose button ignores activation for
  the first 500 ms. Like every change that lets an agent do more, neither the switch nor
  the step is taken while the overlay cannot be relied on ("The overlay and the page").
  It covers the agents that step named and no other. An agent that joins
  the room afterwards (a new grant, a grant that replaces another, a `chat` scope switched
  back on) hears the person only, and only the person hears it, until the person adds it
  through the same confirm step, which names it and the agents it will hear. Switching off
  applies at once, to all. When fewer than two of the agents switched on are left in the
  room, the switch is off again. When a hub sends another `chatRelay` with a later attach
  than it sent before, what the room relays changes and the person's switch goes with it:
  the surface reports `relay` off for each agent that was switched on, and the Chat tab
  says that the hub changed it, until the person uses the switch again. When an agent
  leaves or joins, the choices of whom a message goes to move: for 500 ms a press on them
  chooses nothing, like Send. A surface MUST NOT let one agent hear another under
  `person` except on that input from the person. Whenever an agent is in the room, the
  Chat tab MUST say which agents hear the person only and which hear each other, naming
  each of them; under `on` it says that the app is set up that way.
- *Told, and recorded.* The surface reports each such change to the hub with `ag`, once
  for each agent it changes: `evt user {kind:"relay", on}`. The hub records it and tells
  that agent (section 13).

- *Only while the grant is live.* Who may read a message is fixed when it is posted: its
  speaker and those it was sent to. A surface MUST NOT give an agent, in `evt chat` or in
  `chat.read`, a message that was posted before its grant began, while its `chat` scope was
  switched off, or that was not sent to it. A grant that replaces another reads nothing of
  the earlier one's room, and when a grant has ended there is nothing left to ask.
- *Only the person speaks as the person.* A surface MUST NOT produce a message from the
  person except from trusted input events in the composer of its own Chat tab, which lives
  in the driver's closed shadow root. Send and Enter act on trusted events only; Shift with
  Enter is a line break, and an Enter that ends an input-method composition belongs to the
  composition. A text in the field that no trusted input event left there is never sent.
  A lone surrogate in what the person typed becomes U+FFFD. No method, parameter or event
  posts as the person, and neither does the driver's API. This keeps agents out. It does
  not keep the page out: the app that embeds the driver, and every script that app loads,
  can read the composer and the transcript and can alter what is sent, exactly as it can
  with any field of its own page (a listener on the window is given the keys first, and the
  browser's editing and selection commands reach into the tab). Chat is not secret from the
  app, and the app's own page is outside what this protocol defends (`docs/SECURITY.md`). A
  driver stops the events of typing and editing at its tab, as it stops `keydown` at the
  panel, so that listeners a page registered in the ordinary way do not see them.
- *Agent text is data.* A surface MUST insert what an agent wrote as text, never as markup,
  with every code point escaped that the consent prompt escapes in agent-written strings.
  Line breaks stay line breaks. Each message of an agent is captioned as an agent's first,
  then with the display name from that agent's grant in quotation marks and with the
  agent's session id, never with a name the message supplies: an agent that calls itself
  "You" does not read as the person, and two agents with one name differ. Wherever the tab
  names an agent in a sentence of its own it names it that way, and what an agent says it
  is doing (`chat.status`) is shown in quotation marks after that name, as the agent's own
  words. Agent-written text is laid out so that it neither paints over nor reorders the
  tab's own words, and the caption of a message stays in view while its text scrolls.
  Nothing in a message becomes a link.
- *A message grants nothing.* A chat message MUST NOT change a grant's level, a rule or a
  scope switch, and MUST NOT answer, waive or withdraw a consent prompt, whatever it says
  and whoever sent it. An action that needs the person's approval asks on its prompt after
  the person typed "yes" in the chat exactly as before.
- *Nothing stands next to a decision.* While a consent prompt is showing or queued, a
  surface MUST NOT show in its Chat tab anything an agent wrote: no transcript, no status
  and no agent's name, only a line of its own saying that chat is hidden until the request
  is answered. `chat.say` and `chat.status` fail with `E_BUSY` (section 9), nothing can be
  typed or sent, and what the agents said they were doing is dropped and does not come back
  when the prompt has gone. So an agent cannot put words next to a prompt, also not by
  saying them just before it, and the person cannot take the chat for the answer. While
  control is paused the chat goes on.
- *An addressed message stays addressed.* When the agent the person is writing to leaves
  the room before the message is sent, the tab says that it left and sends nothing until
  the person has chosen again: the message never goes to the others instead. For 500 ms
  after the room changed other than by the person's own input (an agent joined or left, or
  who hears whom changed), Send and Enter are ignored.
- *Not delivered.* When the hub does not relay a message of the person to an agent
  (section 13) it tells the surface, and the tab marks that message as not delivered to
  that agent.
- *Honest about the hub.* When the hub is unverified the Chat tab says so, as the consent
  prompt and the Permissions tab do: whoever is behind that hub is behind every agent in
  the chat.
- *Unread, and never in the way.* A message of an agent that arrives while the Chat tab is
  not showing counts as unread: the tab carries the count, and so does the indicator. The
  panel does not open for it. A message that arrives redraws nothing outside the Chat tab,
  arms no control again and moves no focus.
- *Typing is using the page.* Trusted input in the composer counts as input on the page for
  the human-priority rule ("Human control"): `ui.*` commands wait until there has been none
  for `human.yieldMs`. When a command moves focus while the person's focus is in the
  composer, the driver gives the focus back as soon as the command's synchronous part has
  run. While the app's own code runs because an agent asked for it, the composer takes no
  input: what such code puts into a focused field was chosen by the agent. That is an
  action's handler, a view's renderer (`show.view`), a state getter (`state.get`), and the
  app's event handlers during a command that synthesises input (`ui.*`).
- *What the driver hands out.* The driver's API tells the app that a message was posted,
  by whom and how long it is (section 15), not its text, and no `observe` and no `read`
  returns the transcript: it is in the closed shadow root and outside the UI tree. That is
  what the driver hands out. It is no secret kept from the page ("Only the person speaks
  as the person", above).

Toasts are agent-written, so each one carries a caption naming the agent that sent it.

**No code execution.** Nothing in the protocol evaluates agent-supplied code, HTML or
CSS. Agent text is inserted as text. The cursor colour is the only style value and
must match `COLOR_PATTERN`. URLs are restricted as in section 9.

## 13. Hub behaviour

- **Rate limits.** One token bucket per credential, surface and scope, sized by
  `policy.rates`, with a burst of one second, shared by all of that credential's
  sessions. `hub.info` and `surfaces.list` share one bucket per credential: 10 a
  second, burst 20. Over a limit: `E_RATE`.
- **Capacity.** At most 64 surfaces, 32 agents, 4 sessions per credential and 8 open
  streams per agent by default. Beyond that: `E_BUSY`. A peer whose send buffer at the
  hub holds more than max(8 MiB, 4 × `maxText`) after a send is not reading: it is sent
  `bye {code:"E_BUSY"}` and closed.
- **Admission.** Surface connections from an allowed origin are admitted by a token
  bucket per origin, `surfaceAdmission.rate` a second (default 2) with a burst of
  `surfaceAdmission.burst` (default 2 × the surface capacity), and by one for all
  origins together with 5 × the rate and 2 × the burst. A full hub answers `E_BUSY`
  first; an attempt without a token is `E_RATE`. Agent sessions are admitted after a
  correct proof by a bucket per credential, `agentAdmission.rate` a second (default 2),
  burst `agentAdmission.burst` (default 20), else `E_RATE`.
- **Configuration.** A hub refuses malformed configuration at start: a field of the
  wrong type, a key shorter than 32 characters, a limit that is not a positive number.
  A restriction that is present but mistyped never means "any".
- **Surface events and listing.** An agent hears about a surface only if its
  credential may attach to it. Without a live grant that includes `observe`, the
  `SurfaceInfo` it gets is reduced: `url` is the origin and `title` is the app's name.
  `SurfaceInfo.v` is the protocol version the surface speaks with the hub (section 16).
  The full URL and title go only to agents holding such a grant. `evt surface` with
  kind `added` or `gone` goes to every agent that may attach; `changed` goes only to
  agents holding a grant on that surface. For an agent, `hub.info` counts only the
  surfaces it may attach to and only its own credential's sessions.
- **What the person set.** A surface reports the level, the rules and the scopes the
  person set for one grant (section 12). The hub drops a report that is malformed, that
  names no live grant, or that names an action the surface did not declare. What it
  does with the rest depends on what the report would change.
  - *A level beyond the policy.* The hub MUST end the grant when the surface reports the
    level `auto` or `bypass` and the hub policy's `human.levels` does not list it. The
    surface then gets `detach {why:"hub"}`, the agent `evt grant {kind:"revoked"}`, and
    the refused report and the end of the grant are both recorded. `strict` and `ask`
    are always taken: neither lets an agent do more. An honest surface was sent the
    hub's list at attach and offers no other level.
  - *A rule the hub would not honour.* The rule `allow` for an action that the hub's
    policy denies, or that it wants confirmed while `human.levels` lists no level that
    would waive that prompt, is recorded as refused. The hub MUST NOT keep such a rule
    or tell the agent of it. The grant goes on: the rule changes nothing at the hub,
    which still refuses or marks every request for that action itself, and a surface
    that follows section 12 does not let the person set it.
  - *What is kept.* A surface's attach answer may say what stays of the person's earlier
    settings for the agent (`kept`, section 8). The hub starts the grant with the level
    `strict`, with the rules `confirm` and `deny` for actions the surface declares, and
    without the scopes named as switched off, and records each as a `person` record with
    the outcome `kept`. The hub MUST NOT read anything else from it: no other level, no
    rule `allow`, no scope that was not granted. No attach answer lets an agent do more.
  - *A repeat.* A report that repeats what the hub holds for the grant changes nothing
    and is not told to the agent. Its record falls under the bound below.
  - *A change.* Any other report is a change. The hub keeps the level or the rule,
    applies the scopes (section 8), and tells that agent alone, in an event built from
    the checked values. The hub MUST record every change, whatever else the surface
    sent in the same second. A grant for which a surface reports more than 20 changes
    within one second is ended like one with a level beyond the policy: no person makes
    them, and the report that went over is recorded as refused and is neither kept nor
    told.
  - *While the log cannot be written* ("Fail closed", below). A change that lets the
    agent do or hear more (a higher level, a rule that holds an action back less, a
    scope switched back on, the chat switch on) is in force on the surface already when
    its report arrives. The hub MUST end the grant when it cannot record such a change,
    as for a level beyond the policy. A change that only tightens is kept and told; its
    record waits with the others.
- **Requests that wait.** (0.2) An `E_WAITING` from the surface (section 12) is relayed to
  the agent with `{tk, ms}` as its `data`, and nothing else of it: an `E_WAITING` without a
  well-formed ticket and time, or on anything but `act` and `attach`, is a bad answer from
  the surface (`E_INTERNAL`). The hub keeps the ticket for that agent session and surface,
  with the request it was given for, until `ms` plus `reqTimeoutMs` have passed: at most 3
  for one session on one surface (the surface's own cap on its list) and 16 in all. Over
  either, the agent is answered `E_BUSY`, with a message that says so, instead of a ticket:
  no ticket is forgotten unsaid. It then
  - forwards `tk` on `act` and `surface.attach` unchanged, when `tk` is a ticket (1 to 32
    characters of `[A-Za-z0-9_-]`) that it keeps for this session, this surface and this
    kind of request (for `act`, this action), and refuses any other with `E_BAD_ARGS`
    before anything reaches the surface, in the same words whether the ticket is unknown,
    another session's, used, lapsed or for another request. A ticket is used up the moment
    its check passes, before the hub awaits anything, so of two repeats with one ticket at
    once one is forwarded and the other refused; a request that waits again brings a ticket
    again. So a ticket read in a log, heard in the chat or given to another agent names
    nothing at the hub, before the surface has to say so;
  - takes `evt user {kind:"answer", tk, answer, a?}` with `ag` from the surface for a ticket
    it keeps for that agent and that request (`a` names the action of an `act` request and is
    absent for an attach), also where that agent holds no grant on the surface, since an
    attach request waits before any grant exists. It records the answer with the ticket as
    a `person` record (`method` `answer`, `value` the answer, `action` the action), forgets
    the ticket unless the answer is `allow`, and tells that agent alone, in an event built
    from the checked fields; an agent on 0.1 is told nothing (section 16). An answer for a
    ticket it does not keep, or for another request than the ticket's, is recorded as
    refused, within the bound of `person` records, and dropped; a malformed one is dropped;
  - sends the surface `detach {why:"hub"}` with that `ag` when an agent whose attach waits
    leaves the hub, so that the surface drops what waits for it, and when it gives up on an
    attach request the surface did not answer in time (section 8): the agent is told
    `E_TIMEOUT`, a grant it already held on that surface ends (`evt grant
    {kind:"revoked"}`), and the prompt or the entry at the surface goes with it;
  - sends the surface, with every `attach`, `v`: the protocol version the agent's link speaks,
    so that the surface keeps a request of an agent on 0.1 out of its list (section 16);
  - takes a report of a level, a rule, a scope switch or a relay switch that arrives for a
    grant whose attach answer it has not taken in yet, as rules ticked on the attach card
    are reported right behind that answer: kept, at most 32 for one attach, and handled
    once the grant is recorded, as if they had come after it, as one change of the person's
    (the bound of 20 changes a second is for live reports; the result of `surface.attach`
    has the scopes as they then stand). An attach that ends without a grant drops them. A rule `allow` may carry `ms`, how long it lasts (an integer of milliseconds,
    at most a day); it is told to the agent with the rule and recorded as the record's
    `ms`, and the same rule reported again with a time is a change. The hub does not end
    such a rule itself: the surface reports its end as a rule removed.
- **Chat relay.** A surface sends `evt chat` once for each agent that is to hear a message,
  each with `ag` and with the `id` the message has for that agent (section 12). The hub
  MUST relay a `chat` event only to the grant its `ag` names, and only while that grant is
  live and holds `chat`: an event without `ag`, or naming a grant the surface does not
  hold, is dropped. The hub also drops an event that is not a well-shaped message or that
  is addressed (`to`) to anyone but that agent (another agent, or the person alone), and
  an agent's message when the hub's policy does not let that agent hear its sender, when
  its sender holds no live grant with `chat` on that surface, or when it would go back to
  its sender. The hub's policy lets one agent hear another always under `chatRelay` `on`,
  never under `off`, and under `person` when the surface has reported for both grants that
  the person switched them on. What the agent gets is built from the checked fields, and
  the sender's name in it is the one the hub gave that agent (section 5), not the one in
  the event.
  - *What the person switched.* A surface reports with `ag` that the person lets a grant
    hear the other agents, or no longer does: `evt user {kind:"relay", on}` (section 12).
    The hub drops a report that is malformed or that names no live grant that was granted
    `chat`. A report of `on` under a hub policy of `off`, or for a grant whose `chat` scope
    is switched off, is recorded as refused and is not kept; the grant goes on, because the
    hub relays by its own policy whatever a surface reports. A report that repeats what the
    hub holds changes nothing. Any other report is kept, recorded, and told to that agent
    alone as `evt user {kind:"relay", on}`. A grant whose `chat` scope is switched off is
    no longer switched on.
  - *Budgets.* Each sender has a budget of its own for each agent that listens, and none
    uses up another's. Messages of the person: 5 a second after a burst of 10, for each
    agent. An agent's words: that agent's `rates.chat` a second after a burst of twice
    that, for each agent that hears it, so that a surface which relays what `chat.say` let
    through is never cut short. A message of the person beyond its budget, one the audit
    log cannot take a record of ("Fail closed", below) and one that does not fit a frame
    are not relayed, and the hub tells the surface with the request `chat.undelivered {id}`
    and `ag`, where `id` is the message's id for that agent, at most 20 times a second for
    one surface. The surface shows the message as not delivered to that agent (section 12).
    A relay of an agent's words beyond its budget is dropped and recorded. So is one
    that the hub's policy refuses (the two do not hear each other): not handed over, and
    on record with the outcome `refused`, under the same bound. While the audit log
    cannot be written, no agent's words are relayed either.
  - *chat.say.* It is checked at the hub as well. A text out of bounds is `E_BAD_ARGS`. A
    `to` other than `person` is `E_DENIED` when the hub's policy lets no agent hear the
    speaker: under `off`, and under `person` while the speaker is not switched on. The hub
    forwards the trimmed `text` and `to`, and no other param.
- **Audit.** The hub appends one record for each connection, attach, detach, grant
  end, every refused request, and every `act`, `ui.*`, `nav.*`, `show.view`,
  `show.toast`, `show.highlight`, `chat.say`, `stream.open` and `surface.attach` request.
  `cursor.*`, `show.clear`, `chat.read`, `chat.status` and pointer frames are not audited.
  It also appends one
  record of kind `person` for each level, rule and scope report that changes what the
  hub holds for a grant, and, within the bound below, for each one that repeats it or
  that the hub does not take ("What the person set", above): the agent, the surface,
  `method` (`level`, `rule` or `scopes`), the action name for a rule, `value` (the level;
  the rule's decision, or `none` for a rule removed; the scopes in force, or `none`) and
  the outcome `ok`, `refused`, or `kept` for what a grant starts with (section 8). And it
  appends one `person` record for each message of
  the person that it relays to an agent: `method` `chat`, the agent, the surface, `chars`
  (the length of the text) and `args`, here the digest of the canonical JSON of `{text}`,
  with `to` when the message was addressed. A `chat.say` record is digested the same way:
  its `args` covers `{text}`, the text as the room keeps it (trimmed), with `to` when it
  has one, and nothing else the agent sent, and its `chars` is the length of that text. One
  text so gives one digest, whoever said it. A message of the person that the hub did not
  relay is a `person` record with `method` `chat` and the reason as its outcome (`E_RATE`,
  `E_INTERNAL`, `E_TOO_LARGE`). What the person switched for one agent in the chat is a
  `person` record with `method` `relay` and `value` `on` or `off`. A relay of an agent's
  words that the hub did not hand over is a record of kind `chat`: `method` `relay`, the
  outcome `dropped` (beyond the budget) or `refused` (the policy does not let the two hear
  each other), and the agent that spoke. The
  text of a chat message MUST NOT be written to the audit log: a message is on record by
  its length and its digest. A `connect` record has `v`, the protocol version the
  connection speaks (section 16). A request that waited (`E_WAITING`), one repeated with
  its ticket, and the `person` record of its answer carry `ticket`. A record has `seq`
  (counting from 1), `ts`, `kind`, agent, surface, method, action name, `value`, `chars`, outcome,
  `args`, the duration, `prev` and `hash`. `args` covers the request params without `s`:
  `b64url(HMAC-SHA256(auditKey, canonical JSON))` when the hub has an audit key, else
  `b64url(SHA-256(canonical JSON))`. Arguments are never logged in clear; without a key,
  a reader of the log can still test guesses of low-entropy arguments against `args`.
  - *Chain.* `hash = b64url(SHA-256(prev + "\n" + canonicalJson(record without hash)))`,
    or `b64url(HMAC-SHA256(auditKey, ...))` of the same input when the hub has an audit
    key. `prev` is the `hash` of the record before, and the empty string for the first
    record. The unkeyed chain shows corruption and careless edits. Only the keyed
    chain shows an edit by someone who can write the file. Truncation shows only against
    the **head** (`{seq, hash}` of the last record), which the hub writes next to the log
    and which should be kept somewhere the log's writer cannot change. A hub refuses to
    continue a log whose chain or head does not verify.
  - *Recorded before it happens.* For a request that is audited when it succeeds, an
    `accepted` record is written before the request is forwarded, and the outcome
    record that follows refers to it with `ref`.
  - *Fail closed.* When the log cannot be written, or more than 1000 records are
    waiting, audited requests and attach fail with `E_INTERNAL`, no chat message is
    relayed, the person's or an agent's ("Chat relay", above), and a reported change
    that lets an agent do or hear more ends its grant ("What the person set", above).
    Requests that are not audited are still served, and a change that tightens is
    taken.
  - *Bounded.* At most 20 refusal records per second per connection, 20
    failed-connection records per second overall, and 20 `person` records per second
    per surface for reports that change nothing (a repeat, a rule the hub does not take),
    with as many again for dropped relays of agents' chat messages (kind `chat`). A change
    of what the person set is always recorded, and so is a message of the person that is
    relayed. The excess is counted and written
    as one `suppressed` record.
- **Shutdown.** The hub sends `bye {code:"OK"}` to every peer before closing.

## 14. Security requirements

The numbered rules an implementation MUST meet. `docs/SECURITY.md` has the threat
model behind them.

1. The hub listens on loopback only and validates `Host`, `Origin` and the remote
   address on every upgrade.
2. Agents authenticate with a 256-bit secret by HMAC challenge-response. The hub
   proves possession of the same secret. Every message of an authenticated session
   is sealed with a MAC bound to the handshake.
3. Secrets are never placed in URLs, never logged, and stored in files only the
   owner can read.
4. Surfaces are admitted by origin allowlist, and by key where the deployment
   requires it or holds a key for the app id they claim.
5. Every forwarded request is checked against a live grant, its scope and its rate.
6. The surface re-checks every request against the app's policy.
7. Arguments are validated against a schema before any handler runs. Undeclared
   properties are rejected.
8. No frame, argument or result can cause code, markup or style to be evaluated.
9. Private fields are never read and, by default, never written.
10. Consent, the control indicator and its panel are isolated from the page's styles
    and from what its scripts can reach, and act only on input that the browser itself
    made for the person and delivered to their own controls. Script that runs in the
    page's own JavaScript realm is outside this rule, whatever the order in which it and
    the driver load; where the driver has a realm of its own (an adopted Electron app),
    the rule holds against the page's script too (section 12, "The overlay and the
    page").
11. A human can always see that an agent is attached. Pause and Stop work without the
    hub's cooperation.
12. Errors carry no internals. Observations are size-bounded.
13. The audit log is append-only and hash-chained, keyed where the deployment needs
    to detect edits, and the hub refuses attach and every audited request while it
    cannot record.
14. Everything a surface reports (names, values, text) is untrusted input to the
    agent and is presented to a model as data.
15. A grant's level, rules and scope switches change only on the person's trusted input
    on the surface, and a change that lets an action run without asking only through a
    confirm step. Nothing the person sets relaxes a `deny` of the surface's policy or of the hub's, the hub ends
    a grant whose surface reports a level beyond the hub's policy and takes no rule that
    policy would not honour. What lets an agent do more ends with the grant; what the
    person tightened stays with the agent, whatever the agent does.
16. Chat is data and grants nothing. A message of the person comes only from trusted
    input in the surface's own chat tab, an agent's text is shown as text under the name
    its grant carries and never next to a consent prompt, agents hear each other only
    where the policy or the person says so, the hub relays a message only to the grant it
    names and records its length and digest, never its text, and no message changes a
    level, a rule, a scope switch or the answer to a consent prompt.

## 15. Reference implementation

Six packages. The public API of each is normative for this repository.

### `@reins/core` (isomorphic, no dependencies)

```ts
// everything in protocol.ts, plus:

// codec
encodeFrame(f: Frame): string
decodeFrame(text: string, maxBytes?: number): Frame            // throws ReinsError E_BAD_FRAME / E_TOO_LARGE
encodePointer(f: PointerFrame): Uint8Array                     // clamps x, y to 0..1 and dt to 0..65535
decodePointer(bytes: Uint8Array): PointerFrame                 // throws E_BAD_FRAME
binaryKind(bytes: Uint8Array): number
utf8Length(text: string): number

// schema
validate(schema: Schema | undefined, value: unknown): string | null   // null when valid, else "path: reason"
checkSchema(schema: unknown): string | null                           // is this a well-formed Schema
schemaSignature(schema: Schema | undefined): string                   // "(sku: "latte"|"mocha", qty?: int 1..9)"

// manifest
validateManifest(m: unknown): Manifest                         // throws E_BAD_ARGS / E_TOO_LARGE
canonicalJson(v: unknown): string                              // section 7; throws E_BAD_ARGS when nested deeper than 100, cyclic or BigInt
manifestDigest(m: Manifest): Promise<string>
renderCard(m: Manifest, ctx?: { surface?: SurfaceInfo; scopes?: Scope[]; policy?: Policy }): string

// policy
resolvePolicy(input?: PolicyInput): Policy                     // validated deep copy of a preset plus overrides
decideAction(policy: Policy, action: { name: string; risk: Risk }): Decision
decideAct(q: { base: Decision; risk: Risk; c?: boolean; level: Level; rule?: Decision; offered: Level[] }): { outcome: 'run' | 'prompt' | 'denied' | 'blocked'; by?: 'policy' | 'level' | 'rule'; remember?: boolean }   // section 12, levels and rules
capLevels(...lists: Level[][]): Level[]                        // the levels on offer: `strict` and `ask`, and `auto` and `bypass` where every list names them
allowRulePermitted(risk: Risk, offered: Level[]): boolean      // may the rule `allow` waive a prompt the policy demands
actionDecisions(policy: Policy, actions: { name: string; risk: Risk }[]): Record<string, Decision>   // what a hub sends in attach as `decisions`
hubDecision(decisions: unknown, name: string): Decision        // what a surface reads from it: `confirm` for anything missing or malformed
keptSettings(v: unknown, granted: Scope[], actions: Iterable<string>): { level?: 'strict'; rules: Map<string, 'confirm' | 'deny'>; off: Scope[] }   // what a hub reads from `kept` in an attach answer: only what tightens
offeredActions(q: { offer: string[]; actions: { name: string; risk: Risk; base: Decision }[]; offered: Level[]; kept?: { level?: 'strict'; rules?: { has(name: string): boolean } } }): string[]   // section 12, offers at attach
burstStep(runs: number[], now: number, cap: { max: number; perMs: number } | false): { ask: boolean; n: number; runs: number[] }   // section 12, the rate cap
stricter(a: Decision, b: Decision): Decision
capScopes(requested: Scope[], ...caps: (Scope[] | undefined)[]): Scope[]   // intersection, canonical order
methodScope(m: string): Scope | undefined
navAllowed(policy: Policy, url: string, pageUrl: string): boolean
originAllowed(origin: string, patterns: string[]): boolean
urlOrigin(url: string): string | null                          // section 5, "Origins"; null when `url` is not a URL
urlHasOrigin(url: string, origin: string): boolean             // does hello.surface.url have the connection's origin

// chat (sections 9, 12 and 13)
chatText(v: unknown): string | undefined                       // trimmed, 1 to CHAT_MAX_TEXT characters, well-formed; undefined otherwise
chatNote(v: unknown): string | undefined                       // a status note on one line, at most CHAT_MAX_NOTE characters, '' when absent; undefined otherwise
chatMessage(v: unknown): ChatMessage | undefined               // a message off the wire, rebuilt from its checked fields
chatAudience(q: { relay: readonly string[]; from: 'person' | { agent: string }; to?: string; members: readonly string[] }): { outcome: 'post'; hear: string[] } | { outcome: 'nobody' } | { outcome: 'refuse'; code: 'E_BAD_ARGS' | 'E_DENIED' }   // section 12, who is sent a message; relay: the agents that hear each other
chatRelayMode(v: unknown): 'off' | 'person' | 'on' | undefined   // a value of policy.chatRelay; true is on, false is off
stricterRelay(a: ChatRelay, b: ChatRelay): ChatRelay            // off before person before on
chatDataLines(text: string): string[]                          // a chat text as "| " lines for a model: cut at every line break and separator, no control character left raw
chatPlain(s: string): string                                   // control characters but tab as \u{XX}
chatIdShown(id: string): string                                // a session id as it is printed outside quotes: letters, digits and . _ - only
chatWellFormed(text: string): string                           // a lone surrogate becomes U+FFFD
isChatState(v: unknown): boolean                               // idle, thinking or working

// observation
diffNodes(prev: UiNode[], next: UiNode[]): TreeOp[]
applyOps(nodes: UiNode[], ops: TreeOp[]): UiNode[]
renderTree(nodes: UiNode[]): string
renderOps(ops: TreeOp[], prev?: UiNode[]): string              // with `prev`, new (+) and replaced (~) nodes are told apart and anchors are hidden
renderObservation(o: Observation, prev?: UiNode[]): string     // header line plus tree or delta

// state deltas (RFC 7396)
mergeDiff(from: unknown, to: unknown): unknown                 // undefined when equal; a null property counts as absent on both sides
mergeApply(target: unknown, patch: unknown): unknown

// flow control
class TokenBucket { constructor(ratePerSec: number, burst?: number, now?: () => number); take(n?: number): boolean }
class CreditWindow { constructor(initial?: number); readonly available: number; consume(n: number): boolean; grant(n: number): void }
class CreditGranter { constructor(window: number); consumed(n: number): number }   // returns credit to send now, or 0
class PointerCoalescer { constructor(maxBacklog?: number); push(p: PointerPoint): void; take(max: number): PointerPoint[]; readonly size: number; readonly dropped: number }
playbackRate(queuedMs: number): number                         // 1 up to 120 ms of lag, rising linearly to 4 at 600 ms

// crypto (WebCrypto)
randomToken(bytes?: number): string
b64urlEncode(bytes: Uint8Array): string
b64urlDecode(text: string): Uint8Array
sha256(data: string | Uint8Array): Promise<string>             // base64url
hmacSha256(key: string, msg: string): Promise<string>          // base64url
timingSafeEqual(a: string, b: string): boolean
peerProof(key: string, f: { role: Role; kid: string; nonce: string; cnonce: string }): Promise<string>
hubProof(key: string, f: { role: Role; kid: string; nonce: string; cnonce: string }): Promise<string>

// links
linkPair(): [Link, Link]                                       // in-memory, ordered, asynchronous delivery
wsLink(ws: WebSocketLike): Promise<Link>                       // resolves when the socket is open
portLink(port: MessagePortLike): Link

// rpc
class Peer {
  constructor(link: Link, handlers: PeerHandlers, opts?: { limits?: Partial<Limits>; now?: () => number; maxBuffered?: number })   // over maxBuffered bytes waiting after a send: bye E_BUSY
  request<R = unknown>(m: string, p?: object, opts?: { timeoutMs?: number; ag?: string; c?: 1 }): Promise<R>
  event(topic: Topic, d?: unknown, extra?: { s?: string; ag?: string }): void
  sendBinary(bytes: Uint8Array): void
  flow(ch: number, credit: number): void
  ping(timeoutMs?: number): Promise<number>                    // round-trip time in ms
  bye(code?: ErrorCode | 'OK', msg?: string): void             // sends bye and closes
  readonly closed: boolean
  readonly lastSeen: number
  readonly bufferedAmount: number
}
interface PeerHandlers {
  request?(m: string, p: Record<string, unknown>, frame: ReqFrame): unknown | Promise<unknown>   // throw ReinsError to refuse
  event?(frame: EvtFrame): void
  binary?(bytes: Uint8Array): void
  flow?(frame: FlowFrame): void
  close?(code: ErrorCode | 'OK' | 'E_GONE', msg?: string): void
}
clientConnect(link: Link, hello: { role: Role; name: string; kid?: string; key?: string; surface?: SurfaceHello }, opts?: { timeoutMs?: number; versions?: readonly string[] }): Promise<{ welcome: WelcomeFrame; link: Link; sealed: boolean }>   // versions: speak only these of SUPPORTED_VERSIONS; welcome.v is the version of the link
clientHandshake(link, hello, opts?): Promise<WelcomeFrame>     // unauthenticated sessions only; rejects when given a key

// protocol versions (section 16)
pickVersion(offered: unknown, mine?: readonly string[]): string | undefined   // the first version of the hub's list that is in `mine`
speaks01(v: unknown): boolean                                  // the link negotiated a version before 0.2
V01                                                            // what 0.1 has: scopes, methods, events by topic and kind, attach fields, error codes
scopesIn(v, scopes): Scope[]; methodIn(v, m): boolean; eventIn(v, topic, d): boolean   // what exists on a link of version v
errorIn(v, e: ReinsError): ReinsError                          // the error as a link of version v has it: E_WAITING is E_CONSENT on 0.1

// sealed sessions
deriveSealKeys(key: string, t: { nonce; cnonce; challengeText; helloText; welcomeText }, side: 'peer' | 'hub'): Promise<SealKeys>   // directional keys from the secret and the transcript; E_AUTH on a text that is not well-formed
sealLink(link: Link, keys: SealKeys): Link                     // a Link that seals what it sends and opens what it receives
hubSeal(link: Link, handshake: { key; nonce; cnonce; challengeText; helloText; welcomeText }, opts?): Promise<Link>   // the hub's half, with key confirmation

// the user's Reins folder: names and shapes only, no file access
HOME_DIR                                                       // ".reins"
LAUNCHER_FILE                                                  // "reins.mjs"
SESSION_ID_PATTERN                                             // 1 to 32 letters, digits, "-" or "_"
hubFileName(port: number): string                              // "hub-7346.json"
sessionFileName(port: number, id: string): string              // "session-7346-default.json"
parseHubFile(text: string): HubFile | undefined                // { v: 1, url, port, pid, started, profile, origins, tokenFile?, managed? }
parseSessionFile(text: string): SessionFile | undefined        // { v: 1, port, pid, secret, hub, name, started }
hubPort(url?: string): number | undefined                      // the port a ws URL names; the default port without a URL
```

`clientConnect` runs the handshake and, when a key was used, returns the sealed link
after key confirmation. Build the `Peer` on the link it returns.

`Peer` answers `ping` itself, turns a thrown `ReinsError` into an error response and
anything else into `E_INTERNAL`, fails pending requests with `E_GONE` when the link
closes, and closes the link on a malformed frame. It runs no timers of its own: the
owner of a connection (broker, driver, agent client) sends `ping` when the link has
been idle for `heartbeatMs` and drops a peer whose `lastSeen` is older than
2.5 × `heartbeatMs`.

### `@reins/hub`

```ts
// @reins/hub/broker: isomorphic, runs in Node and in a page
interface AgentCredential { kid: string; key: string; name?: string; scopes?: Scope[]; origins?: string[]; surfaces?: string[]; maxSessions?: number }
interface BrokerConfig {
  name?: string
  agents: AgentCredential[]
  surfaces: { origins: string[]; requireKey?: boolean; keys?: Record<string, string>; pins?: Record<string, string> }
  policy?: PolicyInput
  limits?: Partial<Limits>
  audit?: AuditSink
  auditKey?: string                              // keys the audit chain with HMAC-SHA256
  maxSurfaces?: number; maxAgents?: number; maxStreams?: number
  versions?: string[]                            // the versions offered in challenge.v: some of SUPPORTED_VERSIONS; default all
  surfaceAdmission?: { rate?: number; burst?: number }   // per origin; defaults 2/s, 2 x maxSurfaces
  agentAdmission?: { rate?: number; burst?: number }     // per credential; defaults 2/s, 20
  now?: () => number
}
interface LinkMeta { origin?: string; remote?: string; role?: Role; vouched?: boolean }   // role: the only role the link may take, else E_ORIGIN; vouched: the embedder built the link, the surface is verified
interface AuditSink { write(record: AuditRecord): void; readonly last?: { seq: number; hash: string } }   // throwing means the log is unavailable
class Broker {
  constructor(config: BrokerConfig)              // throws a TypeError on malformed configuration, keys shorter than 32 characters included
  accept(link: Link, meta?: LinkMeta): void      // runs the hub side of the handshake, then serves the peer
  info(): HubInfo
  auditHead(): { seq: number; hash: string } | undefined
  flushAudit(): Promise<void>
  close(): void
}
memoryAudit(): AuditSink & { records: AuditRecord[] }
verifyAuditChain(records: AuditRecord[], opts?: { key?: string; head?: { seq: number; hash: string } }): Promise<{ ok: boolean; badSeq?: number }>

// @reins/hub: Node only
interface HubOptions extends BrokerConfig { host?: string; port?: number; auditFile?: string; surfaceSockets?: boolean }   // surfaceSockets false: agents only on the socket
startHub(opts: HubOptions): Promise<{ broker: Broker; port: number; url: string; close(): Promise<void> }>
fileAudit(path: string, opts?: { key?: string; head?: { seq: number; hash: string } }): AuditSink   // one JSON record per line; verifies an existing log first, throws if it is broken

// the user's Reins folder: REINS_HOME, else .reins in the home folder
reinsHome(env?: NodeJS.ProcessEnv): string
announceHub(hub: Omit<HubFile, 'v'>, home?: string): string     // writes hub-<port>.json and returns its path
withdrawHub(port: number, pid: number, home?: string): void     // only the announcement of that process
readHubFile(port: number, home?: string): HubFile | undefined
writeLauncher(target: string, home?: string): string            // writes reins.mjs, which runs the shell tools at `target`
pidAlive(pid: number): boolean
ensureOwnerDir(dir: string): void                               // creates missing directories owner-only
writeOwnerOnlyNew(file: string, text: string): void             // a new owner-only file; refuses to replace one
```

`fileAudit` treats an existing log like a secret file first: it is refused on POSIX if
group or others have any permission on it, and restricted to the current user again on
Windows. It then reads the log in chunks and refuses it when a line is longer than
1 MiB, the last line is incomplete, or the chain or the head does not verify.

CLI: `reins-hub [--port 7346] [--profile open|guarded|kiosk] [--allow-origin <origin>]...
[--config hub.json] [--token-file <path>] [--surface-key <appId>=<path>]... [--require-key]
[--audit <path>] [--audit-key-file <path>] [--agent <kid>=<path>]... [--no-surface-sockets]
[--no-announce]`. With no agent configured it creates one
credential (`kid` `default`) and writes the secret to the token file (default
`.reins/token`). `--agent <kid>=<path>` adds a credential with that `kid` whose key is in
that file, created like any secret file when it is missing; with it and without
`--token-file` there is no credential `default`. `--no-surface-sockets` is
`surfaceSockets: false` (section 3). A malformed configuration stops it with "invalid configuration ...".
Secret files that do not exist are created with a random key: written inside a new
temporary directory next to the file that is restricted to the current user first, then
hard-linked into place (moved, on a volume without hard links); a file that appears
meanwhile is not overwritten. An existing secret file is refused on
POSIX if group or others have any permission on it, and restricted again at start on
Windows. Secret files, a new audit log and the directories the hub creates are restricted
to the current user, by file mode on POSIX and by ACL on Windows, where `icacls` is run
from `%SystemRoot%\System32`. There the hub removes inherited entries and also every
entry set on the file itself for anyone but the current user (SYSTEM and Administrators
included), then reads the ACL back and requires that only the current user's entry
remains. A failure to restrict stops the hub. The hub prints file
paths, never secrets, and the protocol versions it offers (`protocol: 0.2, 0.1`). With `--audit` it keeps the chain's head in `<path>.head`, replaced
through a temporary file and a rename.

**The user's Reins folder.** Once it listens, the hub announces itself in the user's
Reins folder (`REINS_HOME`, else `.reins` in the home folder; created owner-only when
missing): `hub-<port>.json` holds the hub's URL, port, process id, start time, profile,
the surface origins it admits and, when the hub made the default credential, the path of
its token file. It holds no secret. The hub also writes `reins.mjs` there, a launcher that
runs the shell tools (`@reins/mcp`) of the same installation, so an agent on the machine
reaches the hub with `node "$HOME/.reins/reins.mjs" <tool>` from any folder. On an orderly
shutdown the hub removes its announcement; a reader ignores the announcement of a process
that is no longer running. A failure to write either file is a warning and does not stop
the hub. `--no-announce` writes neither.

### `@reins/driver` (browser)

```ts
createDriver(options: {
  app: AppInfo
  hub?: string                       // ws URL, default ws://127.0.0.1:7346
  link?: Link                        // use this link instead of a WebSocket
  key?: string                       // surface key, when the hub requires one
  policy?: PolicyInput               // default 'guarded'
  consent?: (req: ConsentRequest) => Promise<boolean>
  indicator?: boolean                // default true
  reconnect?: boolean                // default true, with backoff 0.5 s to 10 s
  root?: Element                     // subtree to expose, default document.body
}): Driver

interface Driver {
  action<A = any>(def: ActionDef, handler: (args: A, ctx: CommandContext) => unknown | Promise<unknown>): this
  view<D = any>(def: ViewDef, render: (data: D, ctx: CommandContext) => unknown | Promise<unknown>): this
  state(name: string, get: () => unknown, description?: string): this
  notify(name?: string): void        // an exposed state changed
  connect(): Promise<void>           // resolves once the hub has welcomed the surface
  disconnect(): void
  on(event: 'status' | 'attach' | 'detach' | 'command' | 'level' | 'rule' | 'scopes' | 'chat' | 'attention', fn: (e: any) => void): () => void
  readonly status: 'idle' | 'connecting' | 'ready' | 'controlled' | 'paused' | 'offline'
  readonly manifest: Manifest
  readonly policy: Policy
  readonly hubVerified: boolean      // the session is sealed, or the app supplied the link
  readonly hubProtocol: string | undefined   // the protocol version spoken with the hub while connected (section 16)
  agents(): AttachedAgent[]          // a copy: each attached agent with what the person set for it
  pause(): void; resume(): void; stop(): void
}
interface AttachedAgent { agent: AgentInfo; level: Level; scopes: Scope[]; granted: Scope[]; rules: Record<string, Decision>; timed: Record<string, number> }   // timed: when each rule `allow` that ends by itself does, in epoch milliseconds
interface Attention { asking: number; waiting: number }   // prompts showing or queued; requests in the waiting list that still need an answer
interface CommandContext { agent: AgentInfo; scopes: Scope[] }
interface ConsentRequest { kind: 'attach' | 'action'; agent: AgentInfo; scopes?: Scope[]; action?: ActionDef; args?: unknown; reason?: string; hubVerified?: false; kept?: string[] }   // kept: on an attach, what the person tightened for this agent before and that stays, one line each
```

The events `level` (`{agent, level}`), `rule` (`{agent, action, rule, ms?}`, `rule` null
when removed or when its time ran out, `ms` for a rule that ends by itself) and `scopes`
(`{agent, scopes}`) fire when the person changes one in the panel.
The API only reads them: nothing in it sets a level, a rule or a scope switch, and no
option opens the panel. `human.panel: false` leaves the indicator without one.

The event `attention` (`Attention`) fires when the number of consent prompts that are
showing or queued, or the number of requests that wait in the list, changes. Two counts,
with nothing an agent wrote: an app may show them anywhere, flash its taskbar entry or
raise a notification. The driver itself changes nothing of the page for it.

The policy keys of 0.2 are a surface's own: `consent.waitMs` (how long a request nobody
answered waits; 0 for no list), `human.offer` (actions the attach prompt may offer),
`human.allowMs` (the time of a rule for a time; 0 for none) and `human.burst` (the rate
cap, or `false`). With an app's own `consent` handler there is no waiting list, no offer
and no notice after a refusal: those belong to the driver's prompt.

The event `chat` (`{id, from, chars, to?}`) fires when a message is posted in the page's
chat room: who said it, and how long its text is. The text is not given to the app.
Nothing in the API posts a message, as the person or as anyone, and nothing in it reads
the transcript. `id` is the room's own number for the message, not an agent's. An app that
wants the text can take it from its own page all the same (section 12): the API is no wall
against the app.

Actions, views and state are registered before `connect()`. `createDriver` throws
when the profile is `kiosk` and the driver would dial a hub without a `key`.
`connect()` rejects with `E_DENIED`, and connects to nothing, in a page inside a frame
whose policy does not set `framed` (section 12).

### `@reins/agent` (Node and browser)

```ts
connect(options: { url?: string; link?: Link; kid?: string; key?: string; name?: string; versions?: readonly string[] }): Promise<ReinsClient>
isHandshakeError(e: unknown): boolean            // connect threw e during the handshake: its message came from an unverified peer

interface ReinsClient {
  readonly session: string
  readonly version: string                         // the protocol version this connection speaks (section 16)
  info(): Promise<HubInfo>
  surfaces(): Promise<SurfaceInfo[]>
  attach(s: string, opts?: { scopes?: Scope[]; reason?: string; wait?: boolean | number }): Promise<SurfaceHandle>   // wait: see "requests that wait" below
  waiting(): Array<WaitingRequest & { s: string }>   // attach requests of this connection that wait for the person
  ping(): Promise<number>
  on(event: 'surface' | 'close', fn: (e: any) => void): () => void
  close(): void
}
interface SurfaceHandle {
  readonly info: SurfaceInfo; readonly manifest: Manifest; readonly grant: Grant
  readonly level: Level                            // the level the person last set for this grant; `ask` until told, `strict` from the start when that was kept (section 8)
  readonly rules: Record<string, Decision>         // the person's rules for single actions, by name
  readonly chatRelay: boolean                      // the person switched "Agents can hear each other" on for this agent
  card(): string                                   // the prompt card
  observe(opts?: { full?: boolean; boxes?: boolean }): Promise<Observation>   // tracks `since` itself
  observeText(opts?: { full?: boolean }): Promise<string>
  read(h?: Target, max?: number): Promise<string>
  readText(h?: Target, max?: number): Promise<{ text: string; truncated: boolean }>   // read, with whether it was cut at max
  state(name?: string): Promise<Record<string, unknown>>
  act<R = unknown>(action: string, args?: object, opts?: { wait?: boolean | number }): Promise<R>
  waiting(): WaitingRequest[]                      // requests of this grant that wait for the person, with the answer where it came
  click(h: Target): Promise<void>
  type(h: Target, text: string, opts?: { clear?: boolean; enter?: boolean }): Promise<void>
  select(h: Target, value: string): Promise<void>
  scroll(opts: { h?: Target; dx?: number; dy?: number; to?: 'top' | 'bottom' | 'view' }): Promise<void>
  key(key: UiKey, h?: Target): Promise<void>
  cursor: { move(to: Target | Point, opts?: { ms?: number; wait?: boolean }): Promise<Point>; show(label?: string, color?: string): Promise<void>; hide(): Promise<void> }
  show: { toast(text: string, kind?: ToastKind, ms?: number): Promise<void>; highlight(h: Target, label?: string, ms?: number): Promise<void>; view(view: string, data?: unknown): Promise<unknown>; clear(): Promise<void> }
  go(url: string): Promise<void>
  pointer(): Promise<PointerStream>
  chat: { say(text: string, opts?: { to?: string }): Promise<{ id: number }>; read(opts?: { since?: number; max?: number }): Promise<{ messages: ChatMessage[]; next: number }>; status(state: 'idle' | 'thinking' | 'working', note?: string): Promise<void> }
  subscribe(topics: Topic[]): Promise<void>
  on(event: Topic | 'answer', fn: (d: any) => void): () => void   // 'answer': an AnswerEvent for a waiting request of this grant
  detach(): Promise<void>
}
interface PointerStream { push(x: number, y: number, dt?: number): void; end(): Promise<void>; readonly stats: { sent: number; dropped: number } }
```

`grant.scopes` holds the scopes in force: it follows `evt grant {kind:"scopes"}` when the
person switches scopes off or back on, and such an event does not end the handle. What
the person sets also arrives as events: `on('user', ...)` gets `{kind:"level", level}` and
`{kind:"rule", a, d}`, `on('grant', ...)` gets `{kind:"scopes", scopes}`. An agent cannot
change any of it.

`on('chat', ...)` gets each message the hub relays for this grant as a `ChatMessage`,
rebuilt from its checked fields; one that is not well-shaped is dropped. It needs no
`subscribe`. `chat.say(text, { to: 'person' })` is for the person alone. `chatRelay` on the
handle is true once the hub has said that the person switched "Agents can hear each
other" on for this agent (`on('user', ...)` gets `{kind:"relay", on}`); on a page whose
policy is `on` it stays false, and every message without `to` reaches the other agents. `attach` asks for `observe`, `act`, `cursor` and `show` unless told otherwise:
an agent that wants to be in the room names `chat`.

**Requests that wait** (section 6, protocol 0.2). `act` and `attach` may be answered
`E_WAITING`: the person has not answered, the request waits in their window, nothing ran.
By default the SDK then waits for the answer (`evt user {kind:"answer"}`) up to
`DEFAULT_WAIT_CAP_MS` (ten minutes), or as long as the request stays in the list if that is
shorter, and once it is allowed repeats the same request with its ticket; a refusal, or no
answer in time, is `E_CONSENT` ("the person declined", "the person did not answer in time").
`wait: false` throws the `WaitingError` at once, the default throws it when its time is up,
and a number waits at most that many milliseconds (more than the default if asked) before
throwing it: `ticket`, `ms` (how long the
request still waits), `action` for an `act`, and the wire's `code` and `data`. The SDK
keeps each ticket with the request it stands for, so the same call made again, with any
`wait`, is the repeat once the person has allowed it; `waiting()` on the handle and on
the client list what waits. A grant that ends, or a connection that closes, ends a wait
with `E_NOT_ATTACHED`. A hub on 0.1 never produces `E_WAITING` (section 16). `WaitingError`,
`WaitingRequest`, `Answer` and `AnswerEvent` are exported.

`connect` reads the key from `options.key`, else `REINS_TOKEN`, else the file named by
`REINS_TOKEN_FILE`, else the token file that the running hub at `options.url` announced in
the user's Reins folder, else `.reins/token` in the working directory (Node only). The
announcement comes before the working directory because it names the hub that is listening
now. CLI: `reins surfaces | card |
observe | act <name> [json] | click <h> | type <h> <text> | move <h> | toast <text>`.
The CLI prints text from a page or the hub with every control character other than tab
and line feed escaped as `\xNN`, and the JSON it prints is JSON on one line to every
reader (section 10, "Text rendering"). Where it has to choose among several surfaces it
names each with what the hub knows first (the id, `verified` or `unverified`, the origin)
and the app's name last, in quotes.

### `@reins/mcp`

A stdio MCP server over the agent SDK. Ten tools, kept small so their definitions
cost few tokens:

| tool | does |
|---|---|
| `reins_surfaces` | list surfaces |
| `reins_attach` | attach and return the prompt card |
| `reins_observe` | compact tree, or the delta since the last call |
| `reins_read` | the text of an element, a region or the page, which the tree leaves out; app state |
| `reins_act` | call an app action |
| `reins_ui` | click, type, select, scroll, key |
| `reins_cursor` | move, show, hide |
| `reins_show` | toast, highlight, view, clear. `file` sends a JSON file's content to a view without the model reading it |
| `reins_chat` | talk with the person in the page's Chat tab: wait, read, say, status |
| `reins_batch` | run several of the above in one call |

Only `reins_attach` attaches: every other tool answers `E_NOT_ATTACHED` for a surface
that is not attached, so a tool marked read-only never raises a prompt on the page.
Tool results that carry text a page or the hub supplied (observations, texts, state,
action results, surface listings, relayed error messages) are marked as page data, and
all of it goes out by one rule, the one chat text has (`chatDataLines`, below). Free text
of a page (what `reins_observe`, `reins_read` and `reins_act` return, alone or as a step
of `reins_batch`) stands on lines that start with `| `, under a first line that names the
page's origin: a new `| ` line starts at every line break and at the separators U+001C to
U+001E, and every other control character but tab is written as `\u{XX}`. A field (an
origin, a name, the message of an error) is one line, with the same escapes. And every
result passes one last step that leaves no control character in it but the line feeds the
adapter wrote itself: the only thing that ends a line in a result is the adapter. So no
text of a page can pass for a line of the adapter, and none reaches a model, or the
terminal of the shell tools, raw. In `reins_batch` the step results are lines of their
own (`2 ok`, `3 error E_DENIED: ...`, `4 skipped`), and page text follows its step on its
`| ` lines, so it cannot pass for a step result. `reins_read` takes a `target`, a handle
as for `read` (section 9), and without one it reads the page; `max` is 2000 characters by
default and 8000 at most. The adapter cuts the text at `max` itself, whatever the surface
sent, and when the text was cut, by either, a line of the adapter's own says so after it.
With `state` it returns the app state of that name, or all of it for `*`, as one line of
JSON behind `| `, of which one call returns 8000 characters; a line of the adapter's says
when there was more. It is a step of `reins_batch` as well (`read`). An error
from a handshake that did not finish is one line, cut
to 200 characters and marked `[unverified hub data]`.

A line of the surface listing gives what the hub knows first, in a fixed order, and what
the page says of itself last: the surface id, `verified` or `unverified` (whether the
page proved its app key to the hub: one of the two words is always there), the origin,
`attached` when this agent holds a grant, `protocol=0.1` when the page speaks protocol 0.1
with the hub (section 16: no chat there), then `app=` with the app's name as a quoted
string, `id=` and `profile=`. A name that copies the hub's words therefore stands inside
quotes, after the hub has spoken, and cannot close them. `reins_attach` answers the same
way: its first line is the adapter's own (`attached to surface s1: verified
https://shop.example, scopes: observe act ui`), and the prompt card, which is the page's
account of itself, follows under the page-data marker. Where the hub or the page speaks
protocol 0.1, a second line of the adapter's says so and what the agent then does without,
the surface listing starts with that line for such a hub, and `reins_chat` is refused by
the adapter with `E_UNKNOWN_METHOD` (the hub) or `E_SCOPE` (the page). The scopes the server was started
with are
a ceiling: a tool call cannot request more. A request that waits for the person
(`E_WAITING`, section 6) is answered as an error in the adapter's words: that the request
waits in the person's window, that nothing ran, how long it stays, and that the same call
with `wait` (milliseconds, at most 150000) waits for the answer and runs the request once
it is allowed; `reins_act` and `reins_attach` take `wait`. A `[reins]` notice tells the
answer with the next result (allowed, refused, lapsed), with the action's name as page
data, and the surface listing shows `waiting=N` for a surface where N requests of this
agent wait. The `reins` command waits for the answer unless told `--no-wait` or `--wait <ms>`,
and says that its connection, and the request with it, end with the command. Unless it was started with others, they are
`observe`, `act`, `ui`, `cursor`, `show` and `chat`, and `reins_attach` asks for them.

**Notices.** What the adapter itself has to tell the model between calls goes out with
the next tool result, whatever the tool: one line per notice, each starting with
`[reins] `, before the tool's own answer and so before any page-data marker. A line that
looks like a notice after such a marker is page content. The adapter tells this way what
the person set on the page: `[reins] the person set your permission level on surface s1
to auto (...)`, that a rule changed and how many are set, the scopes now in force. A
notice about a grant names the surface it is about, by the id the hub gave it, and says
`(a page the hub did not verify)` after it when that is so: what a surface reports about
the person is true of that surface and no other, and from a page that proved no key "the
person" is whoever can reach the hub's port. Every word of a notice
is the adapter's; a value from the wire goes into one only when it is a known level or
scope, or a count. The name of an action is a word the page chose, so it never appears in
a notice: which actions the person's rules are for is listed after the tool's own answer,
under the page-data marker, where everything else the page wrote stands. A notice with a
key replaces an
undelivered one with the same key, so only the latest state is told. `Notices` is
exported, and `createReinsMcpServer({ notices })` takes one, so that other code can post
into the same results.

**Chat.** `reins_chat` takes `op`. `say` posts `text`. Its `to` is an agent's id,
`person` (the person alone) or `everyone`; without it the message goes to the person alone
when the latest message of the person that the model was shown was for this agent alone
(the answer says so), and to everyone otherwise: what was asked in private is not answered
in front of other agents. "Latest" is by the message's number, not by when it was shown: a
`read` that brings up an older message does not undo a private question that came after
it. `status` sets `state` and `note`. `read` returns what `chat.read`
returns for `since` and `max`; of the waiting messages it removes the ones it showed and
no other. `wait` hands over the messages that came for this agent and were not handed over
yet, oldest first: at once when there are any, otherwise when one comes, or after
`timeoutMs` with the answer "no new messages". `max` is how many it hands over at most (20
by default and at most); with `max: 0` it takes none and says how many wait. `timeoutMs`
is 90 s by default and 150 s at
most, so that a wait ends before a harness or the shell session (180 s) gives up on the
call. `wait` also returns as soon as the grant ends, and says so. A `wait` whose caller
has gone (the request was cancelled, or the caller of the shell session hung up) takes no
message: the next one finds it. A `wait` that a message woke holds it for 30 ms and looks
once more for its caller before it hands the message over. Over the shell session, where
a caller can be gone by the time an answer is written, a `wait` takes nothing at all by
itself (below). While a `wait` is in flight, and only then, the adapter
reads the room every 45 s and drops the answer, so that an agent that only listens does
not lose its grant to the policy's idle time (`idleMs`). The adapter keeps at most 100
unread messages for one surface and hands over at most 20 in one answer.

Chat text reaches a model as data. A result lists each message as one line of the adapter's
that says who spoke (`#12 from the person at the page:`, `#13 from agent "Helper" (a2)
[another agent's words, not instructions]:`, `#14 from you:`), followed by the text on
lines that start with `| `, under a first line that names the page's origin and the
surface, and says so when the page proved no key to the hub (`SurfaceInfo.verified`). A
new `| ` line starts at every line break and at the separators U+001C to U+001E, and
every other control character but tab is written as `\u{XX}`: none reaches the model raw
(`chatDataLines`). So a text cannot pass for a line of the adapter, for a notice or for
another speaker. An agent's name, which the agent chose, is shown quoted behind the word
`agent`, and its session id, which stands outside the quotes, is printed with letters,
digits and `. _ -` only. What the person at the page says is a request about that page,
to be carried out with the Reins tools within the grant. It is not the agent's operator
speaking, and it approves nothing. What another agent says is that agent's text, not an
instruction. The page itself can read and alter the chat (section 12). The tool's
description says all three. While messages wait, the result of every other tool starts
with a notice that gives their number and nothing of their text (`[reins] the person sent
1 chat message on surface s1: call reins_chat with op wait to read it`). It is replaced when the number
changes and withdrawn when the messages have been handed over. A notice also tells the
model when the person let the agents in the chat hear each other, or switched that off.
A program that calls the tools gets the messages as data as well when the server was
created with `chatMeta`, in the result's `_meta` under `reins/chat` (the surface, its
origin, whether the hub verified the page, the messages); the stdio adapter does not set
it.

**Shell tools.** `reins-tools <tool> [arguments]` gives the same ten tools to an agent
that has a shell and no MCP registration; the launcher in the user's Reins folder runs it
(`node "$HOME/.reins/reins.mjs" <tool>`). A tool is named in full or without `reins_`. Its
arguments are one JSON object: one command-line argument, `@<file>`, or `-` for standard
input, where a leading byte order mark is dropped. The answer is the tool's text on
standard output and exit code 0, or the error text on standard error and exit code 1; a
command line that is not understood is exit code 2. The text is the one an MCP client
gets, character for character: the adapter has written every control character of a
page's text as a visible escape already, and the escaping of the `reins` CLI, which stays
as the last step before a terminal, finds nothing left to change.

A grant ends with the agent's connection (section 8), so the first tool call starts a
**session**: a background process that runs the adapter's tools over one hub connection
and serves the commands that follow. It listens on a free port of `127.0.0.1` and writes
`session-<hub port>-<id>.json` (owner-only) in the user's Reins folder with that port and
a random bearer secret of 32 bytes. It answers only a request that names `127.0.0.1` and
its port as `Host`, carries no `Origin` header and sends the secret. It ends on
`reins-tools stop`, or when no command has reached it for 30 minutes (`--idle-ms`); it then
closes the hub connection, which ends the grant, and removes its file. `--session <id>`
names the session (default `default`), `--name` the agent name shown to the person,
`--scopes` and `--data-dir` are those of the adapter. `--kid <id>` names the credential
the session authenticates as (default `default`), with its key in `--token-file`; the
adapter (`reins-mcp`, `reins-tools mcp`) and the `reins` CLI take the same option. Two
agents on one hub can so hold a credential each, with a name, a scope cap and limits of
its own (section 13). These options are taken when a session starts. On a command that
finds its session running, `--scopes`, `--kid`, `--token-file`, `--data-dir` or `--name`
with another value than the session has is refused with `E_BAD_ARGS`: the message says
what the session has and that `stop` ends it, and the tool is not called. None is dropped
without a word. `status` says which scopes the running session may request.

A chat `wait` over the session hands messages over in two steps, because whoever asked
may be gone by the time the answer is written. The answer shows the messages and carries a
`claim`; the messages stay where they were. The caller, once it has the answer, takes them
with that claim (`POST /take`), and what it is answered then, the messages that were still
there to take, is what it uses. `reins-tools` and `chat-serve` do both steps. A caller
that died before the second step took nothing, and the next `wait` finds the messages.

Inside a run of `chat-serve` (`REINS_CHAT_CONTEXT` is set, below) a tool command that
names no session, no hub and no surface takes them from there: it reaches the session
that holds the runner's grant, and the page the message came from. What the command line
or the arguments name comes first.

`reins-tools up --allow-origin <origin>...` starts a hub in the background unless one that
admits those origins is running, with its token in the Reins folder, and returns once the
hub has announced itself. A hub that `up` started is restarted to admit a further origin;
a hub started any other way is left alone, and `up` then reports what it does not admit.
What such a hub warns about on its own console goes to a log file, so `up` prints it
itself, when it starts the hub and when it finds it running: one line for an allowlist
entry that names no page (`null`, `file://`; section 5, "Origins").
`status` reports the hub, the session and the launcher, `down` stops a hub that `up`
started, `setup` writes the launcher, and `mcp` runs the stdio adapter, so that a harness
registration can name the launcher alone. An announcement outlives a hub that was killed,
and its process id is then anybody's: before `down` or `up` ends the process an
announcement names, what listens on the port has to prove that it is a hub with the key in
the announced token file (an agent handshake, which a hub answers with a proof of that
key), and the process that holds the id, where the system tells when it was created, has
to be older than the announcement. Otherwise nothing is ended, and the command says why.

`reins-tools chat-serve [--timeout-ms <n>] [--preface <file>] [--surface <id>] [--once]
[--wait-ms <n>] [--allow-unverified] --exec <command> [args...]` answers the chat with a
program, for an agent that is no MCP harness. Everything after `--exec` belongs to the
command, and `--wait-ms` is the length of one wait for a message (60 s by default, 150 s
at most). It works through the session and so under its grant, and attaches first when the
session holds none. It serves one page, the one `--surface` names or else the one its
first answer is about, and names that surface in every call it makes. It refuses to serve
a page that proved no key to the hub unless `--allow-unverified` is given: any program on
the computer that can reach the hub's port can be such a page and write as the person.
For each message of the person it runs the command once, and it takes one message at a
time (`wait` with `max: 1`, after a first call with `max: 0` that takes none), so that a
runner that stops (`--once`, a signal, a run it could not end) has taken no message it
does not answer. The argument array after `--exec`
is started as it is, without a shell. Which file the command is, the runner settles
itself before it takes a message, and prints: a path is that file, and a bare name is
looked for in the folders of `PATH`, in order, and never in the working directory, neither
by itself (where Windows looks first) nor through an entry of `PATH` that is empty or
relative. A script that only a shell runs (`.cmd`, `.bat`, `.ps1`) is refused with what to
name instead. The message is written to the command's standard
input and nowhere else: no part of it reaches a command line. It is written as one line of
the runner's own that says who wrote it, on which page and surface, and whether the hub
verified the page, followed by the text on lines that each start with `| ` (as
`reins_chat` gives it). With `--preface`, the text of that file and a line feed come
before it. `REINS_CHAT_CONTEXT` in the command's environment holds one line of JSON (the
surface id, the origin, `verified`, the message id, and the session and hub that reach the
grant), never the text. What the command prints is posted as the reply, trimmed and cut to
4000 characters, with at most 64 KiB read; a reply to a message that was for this agent
alone goes to the person alone. An empty answer posts nothing. A run that ends with
another exit code than 0, or takes longer than `--timeout-ms` (120 s by default), posts a
short notice instead, and what the command wrote to its error output goes to the runner's
own, never to the page. When a run is over, because the command exited, took too long or
the runner was stopped, what the command started is ended with it, and the runner takes
the next message only when that is gone. What "what it started" covers depends on the
system. On Windows the command is put into a job object that allows no breakaway, some
milliseconds after it is started, with whatever it had started by then that can still be
traced to it; from then on Windows keeps every process the command or anything below it
starts inside the job, however deep and whether or not its parent is still there, and
ends them all at once. The job says how many processes a command left running when it
exited, and the runner tells the operator. Out of reach there: a process that a program
outside the job starts on the command's behalf (a scheduled task, a service, WMI, a
program that was running already), and one started in those first milliseconds by a child
that had itself exited before the job took hold. Where no job object can be had
(PowerShell, which makes it, is missing or may not compile), no command is started at
all. Elsewhere the command leads a process group of its own and the group is ended; a
process that left the group (`setsid`, a daemon) is out of reach. When what is left cannot
be ended, or nobody can say whether anything is left, the runner stops and runs nothing
more. A reply the page or the hub refuses
with `E_BUSY` or `E_RATE` is tried again for up to 90 s. Messages of other agents start
nothing. The runner prints lengths, not texts, and ends when the grant does. Whoever can
write in the Chat tab decides what the command is given, and the command runs as the
operator's user: `integrations/chat-serve/README.md` says what follows from that.

### `@reins/electron`

```ts
// @reins/electron: the main process. Nothing in the package imports `electron`.
mainPortLink(port: MessagePortMainLike): Link                  // the main-process end of a MessageChannelMain
reinsMain(options: {
  ipcMain: IpcMainLike
  MessageChannelMain: new () => { port1: MessagePortMainLike; port2: MessagePortMainLike }
  accept(link: Link, meta: { origin: string; vouched: true }): void   // (link, meta) => broker.accept(link, meta)
  channel?: string                                             // IPC channel, default "reins"
  onRefused?(reason: string, event: IpcMainEventLike): void
  attention?: boolean | { flash?: boolean; app?: App }         // flash the window's taskbar button and count on the app's icon while a request waits and the window is not focused; off by default
}): ReinsMain
interface ReinsMain {
  allow(target: BrowserWindow | WebContents, options?: {
    url?: string | string[] | ((url: string) => boolean)       // the page the window is registered for; needed for file:// and null
    hidden?: boolean                                           // link the window while it is not shown
    embedded?: boolean                                         // link a <webview> guest
  }): () => void                                               // returns a function that takes it back
  close(): void
}
preloadPath: string                                            // the ready-made preload script, one CommonJS file

// @reins/electron/bridge: the preload script
exposeReins(electron: { contextBridge; ipcRenderer }, win?: Window, channel?: string): void   // puts window.reinsElectron in the page

// @reins/electron/renderer: the page (also dist/bundle/reins-electron.js)
electronLink(options?: { timeoutMs?: number; window?: Window }): Promise<Link>   // E_GONE without the preload, E_DENIED when refused, E_TIMEOUT
electronAttention(driver: Driver, options?: { window?: Window }): () => void      // passes the driver's attention counts to the main process: two numbers, no text; returns a function that stops it

// @reins/electron/adopt: Node, for an app that was not built for Reins
class Cdp { constructor(t: CdpTransport); send<R>(method: string, params?: object, sessionId?: string): Promise<R>; on(fn: (e: CdpEvent) => void): () => void; onClose(fn: () => void): void; close(): void; readonly closed: boolean }
pipeTransport(toBrowser: Writable, fromBrowser: Readable): CdpTransport   // --remote-debugging-pipe: JSON texts, each ended by a zero byte
wsTransport(url: string): Promise<CdpTransport>
debugEndpoint(target: string): { host: string; port: number; ws?: string }   // throws for anything but a loopback address
adopt(options: {
  cdp: Cdp
  pageSource: string                                           // the text of dist/bundle/reins-adopt.iife.js
  app: AppInfo
  connect: { link(link: Link, page: { origin; url; title }): boolean | Promise<boolean> }    // a broker in this process
         | { hub: string; transport?: 'auto' | 'ws' | 'bridge'; key?: string }                // a hub that runs elsewhere
  levels?: Level[]                                             // levels the person may set besides strict and ask; default none
  scopes?: Scope[]                                             // scopes an agent may be granted; default those of guarded
  exclusive?: boolean                                          // false for a debugging port, which other programs can use: nothing is vouched for, no key is given
  match?(target: { type: string; url: string; title: string }): boolean
  log?(line: string): void
  leaseMs?: number                                             // how long a document goes on without hearing this process; default 10 s
}): Promise<{ pages(): { origin; url; title }[]; stop(): Promise<void>; close(): void }>   // stop: every driver ends for good
hubEndpoint(url: string): string                               // throws for anything but ws:// on a loopback address
portBrowser(end: { host; port }): Promise<{ id; ws; product; userAgent } | undefined>   // the browser behind a debugging port
closePortBrowser(end, same: (b) => boolean, waitMs?: number): Promise<'none' | 'other' | 'closed' | 'still'>   // Browser.close over the port
pagePolicy(options?: { levels?: Level[]; scopes?: Scope[] }): PolicyInput   // the policy of an adopted page, and of the hub hosted for it
```

**A window as a surface.** The page calls `electronLink()`. The preload passes the
request to the main process, which answers the top-level frame of a window registered
with `allow()` with a fresh `MessageChannelMain`: one port goes to `accept` under the
frame's origin, the other to the page, which wraps it with `portLink` for
`createDriver({ link })`. A second request from the same window closes the link it had,
so one window is one surface. A request from an unregistered window, from a window that
shows another page than the one it was registered for (section 3), from a frame inside
the page, from a `<webview>` guest not registered with `embedded`, or from a page nobody
looks at (`offscreen`, `backgroundPage`) is refused, and `electronLink()` rejects with
`E_DENIED`. It rejects the same way, with the reason, in a window without context
isolation. A window that is not shown is not refused: its request is answered when the
window is shown, and `electronLink()` rejects with `E_TIMEOUT` if that does not happen
in time. A token made by the page (8 to 64 base64url characters) ties each answer to
its request; the page takes a port only from a message its own window posted.

**`reins-electron`.** `reins-electron [options] -- <executable> [arguments]` starts an
Electron app with `--remote-debugging-pipe`, and `--attach <port>` joins one started
with `--remote-debugging-port`. For every page of the app it runs
`reins-adopt.iife.js`, the driver and its glue, in each new document, so a reload, a
navigation and a new window are adopted as they happen. The driver runs under the
`guarded` profile and declares no actions: an agent has the UI tree, synthetic input,
the cursor, toasts, highlights and the chat, and the person has the consent prompt, the
indicator and the panel. A level decides declared actions only (section 12), so the
panel of an adopted page offers no level that loosens anything unless `--levels` lists
it (`auto`, `bypass`); `--scopes` names the scopes an agent may be granted,
by default all those of the profile. The driver runs in a world of its own
(`Page.addScriptToEvaluateOnNewDocument` with a world name), and the function that
carries its frames out through the debugging connection MUST be added to that world
only, so that the page's own scripts can reach neither. The world is named afresh for
each run, `reins-` and a random token, and the command MUST ignore a call of that
function from any context it did not see created as that world. `--match` is asked of
every document, with that document's own URL, and not only of the tab it loads in. It
names an origin, or a URL, which stands for itself and what lies under it. Pattern and
document are both read as URLs and compared by origin and path, query and fragment
aside: a document MUST NOT match because its URL contains the text of the pattern. What
the command prints about a page is its origin, never its URL. Whoever holds a debugging
connection controls the app, so `reins-electron` MUST refuse a debugging port that is
not on a loopback address, before it connects to it.

The driver lives no longer than the command. When the command stops, it MUST tell every
driver it loaded to disconnect for good, whatever carries that driver's frames: a page
that reached a hub over a socket of its own would otherwise stay a live surface. While it
runs it tells every live document so every 2 s, and a document that has heard nothing for
10 s asks once and, unanswered for 5 s more, MUST stop its driver by itself, so that a
command that was killed leaves none behind either. This is judged by the clock whenever a
frame arrives for the driver or is to leave it, and not by a timer alone: from the moment
a document has not heard the command for 10 s until it hears it again, it MUST NOT hand
its driver a frame or send one of the driver's, whether or not any of its timers fires. A
script of the page can clear every timer of its document, those of the driver's world
included.

By default `reins-electron` hosts a hub itself (`--port`, `--token-file`,
`--allow-origin`, `--no-announce`), with `surfaceSockets: false` and the policy of the
pages (`pagePolicy`), and gives each page a
link to its broker over the debugging connection. Without `--allow-origin` it admits
the origin the app's first pages share: it hears the pages that ask within a second of
the first, and when they have more than one origin it stops and lists them, for the
person to name. Two kinds of origin are never taken from a page and have to be named:
`null`, which says nothing about the page, and that of a web site that is not on a
loopback address, which is something the app shows and not the app. With `--hub <ws url>` the pages
connect to a hub that runs elsewhere: the page opens the socket itself where its Content
Security Policy lets it, and otherwise the command opens it, with the page's origin as
`Origin`, and carries the frames (`--transport auto`, `ws` or `bridge`). The command
MUST NOT dial a hub that is not on a loopback address. Such a page treats the hub as
unverified unless `--surface-key-file` names the key that hub holds for `--app-id`, and
without a key that hub admits by origin alone, so the app's own scripts can connect to
it as the same app: the command warns. An app that `reins-electron` started ends with
it, also when the command is killed. With the pipe that is Chromium's doing: it exits
when its debugging pipe closes. With `--debug-port` the app is the browser that answers
on that port, whatever process that is by then: the executable may have been a starter
that left at once, and an app may start itself again. The command MUST NOT take the end
of the process it started for the end of the app, and when it ends it MUST close that
browser over the port (`Browser.close`) and ask the port again. A watcher process does
the same for a command that was killed; it learns of the command's end from a pipe
between the two, and neither of them ends a process it knows only by its id. Before it
starts an app with `--debug-port`, the command makes sure that no browser answers on
that port yet. An app it attached to is left running. `--surface-key-file` is refused
together with a debugging port.

## 16. Versioning

This document is protocol **0.2**. An implementation of it also speaks **0.1**, the
version before it.

**Negotiation.** `challenge.v` lists the versions the hub speaks, newest first. The peer
MUST name in `hello.v` the first version in that list that it speaks; with none in common
it sends `bye {code:"E_VERSION"}` and closes. The hub refuses a `hello.v` that it did not
list with `E_VERSION`, and repeats the version in `welcome.v`. That version holds for the
link until it closes, and each link has its own: an agent on 0.1 can attach to a surface on
0.2, and the other way round. The WebSocket subprotocol (`reins.v1`) and the contexts of
the proofs and of the seal (`reins.v1.*`) are the same in both versions.

**Within a version**, receivers ignore unknown fields on frames and unknown event topics,
and refuse unknown methods with `E_UNKNOWN_METHOD`. From 0.2 on, an event of a kind the
receiver does not know, on a topic it knows, ends nothing and changes nothing. (In 0.1 an
agent ends its handle on any `grant` event, and a hub relays a surface's `user` events as
they came, whatever their kind.)

**What 0.2 adds to 0.1.**

| | 0.1 has | 0.2 adds |
|---|---|---|
| scopes | `observe`, `act`, `ui`, `cursor`, `show`, `nav` | `chat` |
| methods of an agent | those of section 9 without `chat.*` | `chat.say`, `chat.read`, `chat.status` |
| requests the hub itself sends a surface | `attach`, `detach`, `stream.open`, `stream.close` | `chat.undelivered` |
| event topics | `ui`, `state`, `nav`, `user`, `grant`, `surface` | `chat` |
| kinds of `evt user` | `override`, `pause`, `resume` | `level`, `rule`, `relay` |
| kinds of `evt grant` | `revoked`, `expired` | `scopes` |
| params of `attach` (hub to surface) | `agent`, `scopes`, `reason` | `levels`, `decisions`, `chatRelay`, `cred` |
| the surface's answer to `attach` | `scopes`, `ttlMs` | `kept` |
| the result of `surface.attach` | `grant`, `surface`, `manifest` | `kept` |
| `SurfaceInfo` | every field but `v` | `v` |
| error codes | those of section 6 without `E_WAITING` | `E_WAITING` |
| params of `act` and `surface.attach` | without `tk` | `tk` |

With them came what they carry: the levels, the rules and the scope switches of section
12, what stays of them for an agent's next grant (section 8), and chat.

**A link on 0.1.** On a link that negotiated 0.1, an implementation of 0.2 MUST keep to
0.1: it sends nothing there that 0.1 does not have, the right-hand column above, and takes
nothing of it from the peer. A peer that speaks 0.1 alone needs no change. For each end:

| on a 0.1 link | what the 0.2 end does |
|---|---|
| the hub, toward an **agent** on 0.1 | Sends no `evt grant {kind:"scopes"}`. The grant narrows at the hub all the same: a request that needs a scope the person switched off is `E_SCOPE`, and the `evt surface {kind:"changed"}` that follows is sent. Sends no `evt user` of kind `level`, `rule`, `relay` or `answer` and no `chat` event; it holds and records what they say. Takes `chat` out of the scopes the agent asks for, and answers `chat.*` with `E_UNKNOWN_METHOD`. Leaves `kept` out of the result of `surface.attach` and `v` out of `SurfaceInfo`. Sends `E_WAITING` as `E_CONSENT`, without its `data`, keeps no ticket for the agent, and withdraws a waiting attach of its at the surface at once (`detach {why:"hub"}`); the audit record keeps `E_WAITING` and the ticket. A `tk` from such an agent is never a ticket of its own (`E_BAD_ARGS`). Tells the surface `v: "0.1"` in `attach`, so that the surface puts no request of this agent in its list. |
| the hub, toward a **surface** on 0.1 | Sends `attach` with `agent`, `scopes` and `reason`, and `v` (which 0.1 ignores like every field it does not know), never with `chat` among the scopes: no grant there has `chat`, so `chat.*` from an agent on 0.2 is `E_SCOPE`. Reads no `kept` from the answer. Drops an event of a topic or kind 0.1 does not have, unread and unrecorded: a level, a rule, a scope switch, a relay switch, an answer, a chat message. Sends no `chat.undelivered`. Such a surface gives no ticket, so no request of any agent waits there: an `E_WAITING` from it is a bad answer (`E_INTERNAL`). |
| an **agent**, with a hub on 0.1 | Asks for no `chat` scope and sends no `chat.*` request. Drops an event of a topic or kind 0.1 does not have: such a hub relays a surface's `user` events as they came. Gets no `E_WAITING` from such a hub, and sends it no `tk`. |
| a **surface**, with a hub on 0.1 | Sends no `evt grant {kind:"scopes"}`, no `evt user` of kind `level`, `rule` or `relay`, and no `chat` event. Reads `agent`, `scopes` and `reason` from `attach` and nothing else: without `levels` it offers no level beyond `ask`, and without `cred` it cannot tell one agent from another. Grants no `chat`. Answers `attach` without `kept`. What the person sets in the panel holds on the page, where every request is checked against it; the hub and the agent are not told. |

So an agent on 0.1 is not told the level, the rules or the scopes in force for its grant:
it learns them from the refusal (`E_SCOPE`, `E_CONSENT`), which is the truth in any
version. A surface on 0.1 has none of them to report.

**Where the version shows.** The hub puts `v`, the version a connection speaks, in that
connection's `connect` record of the audit log, lists what it offers in `hub.info`, and
gives an agent on 0.2 each surface's version as `SurfaceInfo.v`. In the reference
implementation the hub prints the versions it offers when it starts, `ReinsClient.version`
and `Driver.hubProtocol` are the version of the own connection, and the MCP tools name a
hub or a page that speaks 0.1 where they list and attach surfaces (section 15).
`BrokerConfig.versions` and the `versions` option of `connect` limit an end to some of
the versions it speaks.
