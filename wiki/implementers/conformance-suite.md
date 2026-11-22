# Reins protocol conformance suite

> What the conformance suite checks, how to run it and what it does not cover. Rendered from conformance/README.md.

This folder checks an implementation of Reins against `docs/SPEC.md` (protocol 0.1).
The existing tests under `packages/*/test` exercise the reference implementation's own
code paths; the tests here are written from the specification instead. Each test name
starts with the id of the requirement it checks, and `requirements.json` maps every
requirement to its spec section and its tests.

## What is here

| path | contents |
|---|---|
| `vectors/*.json` | Language-neutral test vectors: fixed inputs and expected outputs. |
| `tools/make-vectors.mjs` | Generates the vectors from the formulas in SPEC.md with `node:crypto` only. It imports nothing from `@reins/*`. |
| `vectors.test.ts` | Checks that `@reins/core` (and `verifyAuditChain` in `@reins/hub`) reproduce the vectors. |
| `hub-transport.test.ts`, `hub-handshake.test.ts`, `hub-session.test.ts`, `levels-hub.test.ts`, `chat-hub.test.ts` | Black-box hub tests. A hub is started in-process on port 0; agents and surfaces are raw `ws` sockets that build every frame, proof and seal MAC by hand (`lib/wire.ts`). `chat-hub.test.ts` covers the relay of a room's messages, their rate and their audit records (`CH-`). |
| `surface.test.ts`, `levels-surface.test.ts`, `timers-surface.test.ts`, `chat-surface.test.ts` | The reference driver in happy-dom, driven by a hub played with hand-built frames over an in-memory link (`lib/surface-hub.ts`). `levels-surface.test.ts` covers levels, rules, scope switches, the panel, and what a page's styles and scripts can and cannot do to the overlay (`LV-`); it reaches the panel through `shadowOf`, and plays the person with events it marks trusted. `timers-surface.test.ts` (`LV-34`) wraps the timer functions before the driver loads, clears every timer the surface set, and shows that nothing gets looser. `chat-surface.test.ts` covers the chat methods, the room and the Chat tab (`CH-`) the same way: what the person types is a value and an input event the test marks trusted. |
| `security-hub.test.ts`, `security-surface.test.ts` | One or more tests per rule of SPEC section 14, named `S14.N ...`. Rule 14 also has a test in `mcp.test.ts`; rule 15 has its tests in `levels-surface.test.ts` and `levels-hub.test.ts`, rule 16 in `chat-surface.test.ts` and `chat-hub.test.ts`. |
| `mcp.test.ts` | The MCP adapter, spoken to with raw JSON-RPC over the SDK's in-memory transport, `reins_read` (`MCP-6`) and `reins_chat` included (`CH-15`), the one rule for text a page supplied (`MCP-7`, `MCP-8`), the hand-over of chat messages over the shell session (`CH-28`), and the `chat-serve` runner with a command that echoes what it is given (`CH-16`) and with one that leaves a process running (`CH-29`). |
| `hub-transport.test.ts`, `hub-handshake.test.ts`, `hub-session.test.ts` | Black-box hub tests. A hub is started in-process on port 0; agents and surfaces are raw `ws` sockets that build every frame, proof and seal MAC by hand (`lib/wire.ts`). |
| `surface.test.ts` | The reference driver in happy-dom, driven by a hub played with hand-built frames over an in-memory link (`lib/surface-hub.ts`). |
| `security-hub.test.ts`, `security-surface.test.ts` | One or more tests per rule of SPEC section 14, named `S14.N ...`. Rule 14 also has a test in `mcp.test.ts`. |
| `mcp.test.ts` | The MCP adapter, spoken to with raw JSON-RPC over the SDK's in-memory transport. |
| `origins.test.ts` | Section 5, "Origins": the origin vectors against `@reins/core`, and surfaces and agents from `file://`, app origins and `null` on raw sockets. |
| `electron.test.ts` | The Electron port of section 3 and `reins-electron` of section 15. Electron is played by the stand-ins in `lib/electron.ts`: no Electron is installed or started. |
| `electron-page.test.ts` | How long the driver of an adopted page lives: the real page glue and driver in happy-dom, against the real injector and broker, with the browser between them played by `lib/electron.ts`. |
| `requirements.json` | `{ id, section, text, quotes?, tests }` per requirement. `quotes` are exact substrings of the MUST / MUST NOT / SHALL sentences an entry covers. |
| `requirements.test.ts` | Fails if a normative sentence or a section 14 rule has no entry, if a quote no longer occurs in the spec, or if an entry names a test that does not exist. |
| `lib/` | Helpers: the raw wire client, hub and surface harnesses, an independent canonical-JSON function, and the spec and test-name extractors used by the meta-test. |

## Running

```
npm run test:conformance
```

This runs `vitest run conformance`. No build step is needed: `vitest.config.ts` maps the
`@reins/*` imports to the package sources. Every hub listens on port 0 and every temporary
file goes under the OS temp directory, so the suite can run next to a hub on port 7346.
A full run takes about half a minute; three tests wait out the hub's 5 s timers on purpose
(HS-9, HS-17) or create 64 connections (CAP-2).

To regenerate the vectors after a spec change:

```
node conformance/tools/make-vectors.mjs          # write vectors/*.json
node conformance/tools/make-vectors.mjs --check  # exit 1 if a file would change
```

`node conformance/lib/spec-text.mjs` prints the normative sentences and section 14 rules
the meta-test reads from SPEC.md; `node conformance/lib/test-names.mjs` prints the test
titles it knows.

## Using the vectors from another implementation

Each file in `vectors/` is self-describing: `spec` names the section, `formula` or
`layout` restates the rule, and `note` explains the cases. Every detail the vectors depend
on is now written in SPEC.md; no vector relies on the reference implementation for a rule
the spec leaves open. Byte strings are hex, base64url values are unpadded (RFC 4648
section 5).

| file | how to use it |
|---|---|
| `auth.json` | For each case compute `HMAC-SHA256(key, peerInput)` and `HMAC-SHA256(key, hubInput)` over UTF-8 bytes, base64url; compare with `peerProof` and `hubProof`. The third case has a non-ASCII kid. |
| `seal.json` | Derive `th`, `kPeer` and `kHub` from `key`, `nonce`, `cnonce`, `challengeText`, `helloText`, `welcomeText`; seal the `peerToHub` messages in order from sequence 0 and compare with `wire` / `wireHex`; do the same with `hubToPeer`; open the wire messages and expect the payloads. `macOnly` gives MACs at large sequence numbers. `illFormed` must never be sealed or opened. |
| `pointer.json` | Encode `frame` and compare with `hex`; decode `hex` and compare with `frame`; `clamp` and `rounding` cases check the encoding of fractions and `dt`; `invalid` must be refused. |
| `merge-patch.json` | `apply`: RFC 7396 appendix A. `diff`: any patch P with apply(from, P) == to passes. `equal`: no patch at all; some cases differ only in null properties, which read as absent. |
| `ui-delta.json` | `apply`: apply `ops` to `nodes`, expect `expect`. `diff`: your diff, applied to `prev`, must give `next`, with every `del` first. `render`: the compact tree text and single node lines. `renderDelta`: delta text rendered against `prev`. |
| `methods.json` | Method to scope table, `HUB_METHODS`, `READ_ONLY_METHODS`, `CHAT_SPEAK_METHODS`, scope intersection. |
| `policy.json` | Profile table with its defaults (levels, panel and `chatRelay` included), override precedence, strictness order. |
| `levels.json` | `rows`: split each row on spaces into `columns`; from the policy decision, the action's risk, the level, the rule (`-` for none) and the levels on offer (joined by `+`), your decision for an `act` request must give `outcome`, and `by` and `remember` where they are not `-`. `c1`: a request with c:1 counts as the decision in `counts`. `offered`: the levels on offer from the two `human.levels` lists (`strict` and `ask` always). `hub`: the hub's decision for an action as a surface reads it from `decisions` in attach; anything missing or malformed is `confirm`. `allowRule`: where the rule allow may be set. |
| `chat.json` | `text.cases`: trim the text (`unit` and `times` stand for a repeated unit between `before` and `after`); with `ok` it is kept and has `length`, otherwise `chat.say` answers `E_BAD_ARGS`. `statusNote.cases`: the note as it is kept, or refused. `message`: take the `valid` messages, keeping only `fields`, and drop the `invalid` ones. `audience.rows`: split each row on spaces into `columns`; from the agents in the room, the agents among them that hear each other, who speaks and whom they address (`person` for the person alone), your decision must give `outcome` and `result`. `relay`: the three values of `chatRelay`, and for every pair the stricter one. `auditDigest`: the canonical JSON and the unkeyed digest a chat text is recorded with, whatever else was sent with it. `lines`: a chat text as the `| ` lines a model is handed, and a session id as it is printed. |
| `manifest.json` | Canonical JSON (with `canonicalCases` for key order and numbers) and digest of a manifest, and the prompt card of SPEC section 7. |
| `audit.json` | An unkeyed and a keyed audit chain to verify; `args` is SHA-256, or HMAC under the key, of `argsCanonical`. |
| `errors.json`, `limits.json` | The complete error code list of SPEC section 6, and numeric limits the spec states. |
| `origins.json` | `urlOrigin`: the origin of each `url` (JSON null: not a URL; the string `"null"`: opaque). `allowed`: whether `entries` admit `origin`. `surfaceUrl`: whether `url` may be `hello.surface.url` on a connection from `origin`. |

The hub tests in `hub-*.test.ts` are black-box at the wire level: to run them against
another hub, replace `startTestHub` in `lib/hub.ts` with code that starts that hub on a
free port with the same configuration (credentials, allowed origins, policy, limits) and
exposes its audit records. Tests that configure the hub through `BrokerConfig` options or
read `memoryAudit` records depend on the reference configuration shape.

## Coverage limits

These requirements are not checked, or only partly:

- TR-2 (refuse a non-loopback remote address): needs a second network interface; the test
  only shows loopback clients are served.
- S14.3, owner-only files: checked by POSIX mode only; on Windows the ACL is not inspected
  (the test is skipped there). The token file written by the CLI is not covered.
- Section 5: the inbound bound before authentication (16 messages, 64 KiB) and dropping
  what a peer sends after a failed proof race the hub's asynchronous proof check, so
  they are not tested at the wire; the link bound (4096 messages, 16 MiB) is not covered.
- Section 11 drop policy (droppable frames above 256 KiB of surface backlog, stall at
  1 MiB), receiver playback, coalescing on the sender, and Pause and Stop discarding
  queued points: need control of socket buffers or animation frames; only
  `playbackRate` and the credit batching are checked.
- Section 9 ordering, command batching per animation frame (6 ms), cursor glide timing,
  and "checks hold across waits": timing-dependent, not covered.
- Section 12: the 500 ms arming of Allow, Allow waiting for a tall card to be scrolled,
  the escaping of invisible code points on the card, the "Request withdrawn" notice, the
  indicator above the prompt's backdrop or inside a modal dialog or fullscreen element,
  and `human.yieldMs` after real input (happy-dom input is never trusted): not covered
  beyond what S14.10 and S14.11 check.
- Section 12, the panel: happy-dom has no layout and no trusted input. The `LV-` surface
  tests mark their own events as trusted to play the person, so they show that unmarked
  events do nothing, not that a browser marks events correctly. Where the panel sits (beside
  a consent card on a wide viewport, under its backdrop on a narrow one, inside a modal
  dialog or a fullscreen element), the "Always allow" step on a card and the colours of the
  indicator are not covered here; the driver's own tests
  (`packages/driver/test/levels.test.ts`) cover their logic.
- Section 12, the overlay and the page: happy-dom has no top layer, no painting, no native
  `isTrusted` and no IntersectionObserver. `LV-24` to `LV-26` check the stylesheet's text,
  the effects a style engine reports on an ancestor of the host, and that a late hook is
  handed no listener. `LV-29` plays keys as events it marks trusted and moves the focus
  itself, since happy-dom does not move it on Tab; `LV-32` reads `zoom` from a computed
  style it sets, and `LV-35` uses a stand-in for the Popover API. That page CSS leaves every pixel of the overlay as it was, that the
  host is last in the top layer (also above a page's own popover and inside a modal dialog),
  that a forged or borrowed event moves nothing where the browser's own getter is read,
  where a real key or click lands (Tab and Enter typed for the page, a word and Enter,
  Tab, Enter, Tab, Enter), that `::before`, `::after`, `::marker` and `::first-letter`
  rules of the page add no box to the host, and that `zoom` and `display: none` on `html`
  stop commands, is checked in a real Chromium by
  `node scripts/browser-check.mjs` (`npm run test:browser`; it skips when no Chromium is
  found unless `--require` is given). The driver's `packages/driver/test/hardening.test.ts`
  covers the logic of the top layer and of the visibility observer with stand-ins.
- Section 12, chat: happy-dom has no layout and no trusted input. The `CH-` surface tests
  set the composer's value and mark their own input, key and click events as trusted to
  play the person, so they show that unmarked events and a value set by script send
  nothing, not that a browser marks events correctly or that an input method behaves.
  How the tab looks (light and dark, a narrow viewport), the scroll position of the
  transcript, the lapse of a status after 2 minutes, what a screen reader says, and the
  focus that returns to the composer after a command are not covered here; the driver's
  own tests (`packages/driver/test/chat.test.ts`) cover the logic of the last two. That a
  page's own script can read the composer and the transcript and alter what is sent
  (`docs/SECURITY.md`, "What Reins does not protect against") is stated, not tested: the
  tests show what an agent cannot do, and that ordinary bubbling listeners see nothing.
  That the composer takes no input while an app action runs is tested with an action
  that writes into the field, not with a browser's `execCommand`.
- Section 13: fail-closed on more than 1000 queued records, `lost` summaries, a peer
  closed for not reading, refusing to continue a log whose chain or head does not
  verify (`fileAudit`), and the 32-agent cap.
- Sections 3 and 15, Electron: nothing here starts Electron. What Chromium sends as
  `Origin`, the port crossing `contextIsolation`, the debugging pipe, the driver in a world
  of its own under a page's Content Security Policy, and consent, the panel, a level and
  the chat in a real window with real input are checked by `npm run test:electron`, which
  is not part of this suite (see `docs/ELECTRON.md`).
- Section 15: CLI behaviour (token files, secret-file checks, flags, escaping of page
  text), the `[unverified hub data]` marking of the MCP adapter, and the agent SDK beyond
  its pointer credit are not covered. Of `reins_chat`, the 150 s cap of a wait is checked
  as a constant and with a mock clock in `packages/mcp/test/chat.test.ts`, not by waiting.
  The read of the room every 45 s while a wait is in flight is tested there too, and
  against a real hub whose clock is moved in `examples/kiosk/test/chat.test.ts`.
  Of `chat-serve`, the command line, the timeout and the failure notices are covered in
  `packages/mcp/test/chat-serve.test.ts`, not here. `CH-29` shows here, on the machine the
  tests run on, that a process a command left running when it exited is ended. What a
  Windows job object holds beyond that (a process whose parent has exited, a tree that
  goes on growing, one started by cmd.exe, PowerShell or Python, a request to leave the
  job refused) and that nothing is run where no job object can be made, is covered by the
  tests named `review round 2, F3` in that file, on Windows only; the process-group path
  is covered by the tests there that are not Windows-only, on the machine they run on.
  That `down` and `up` leave the process of a stale announcement alone, that `up` prints
  the hub's origin warnings, and that an option a running session cannot take is refused,
  are covered in `packages/mcp/test/shell.test.ts`; what a system reports as a process's
  creation time is asked for real only on the machine the tests run on. No test runs a model, and none runs a
  harness: the Claude Code subagent in `integrations/` was not run under Claude Code.

Tests marked `it.fails` are places where the implementation does not do what the spec
says; each carries a `// SPEC MISMATCH:` comment.

## Requirements

| id | section | what is checked | tests |
|---|---|---|---|
| TR-1 | 3 | The hub binds loopback addresses only and refuses any other bind address. | TR-1 |
| TR-2 | 3 | The hub rejects a socket whose remote address is not loopback. | TR-2 |
| TR-3 | 3 | The hub rejects a Host header other than 127.0.0.1, localhost or [::1] with its port. | S14.1 |
| TR-4 | 3 | The hub requires the reins.v1 subprotocol. | TR-4 |
| TR-5 | 3 | The hub disables per-message compression. | TR-5 |
| TR-6 | 3 | The hub answers plain HTTP with a bare status and no body. | TR-6 |
| FR-1 | 4 | A receiver closes with E_TOO_LARGE on an oversize frame and with E_BAD_FRAME on invalid JSON, an unknown t or a missing field; closing with a code is bye {code} then close, and a message the transport cannot take is closed with WebSocket code 1009. | FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, HS-8 |
| FR-2 | 4 | The hub announces its limits in welcome; defaults are 256 KiB text, 16 KiB binary, heartbeatMs 15000, reqTimeoutMs 15000, consentTimeoutMs 60000. | FR-4, VEC-LIMITS |
| HS-1 | 5 | The hub sends challenge {v, nonce, hub} first; nonces are 32 fresh random bytes, base64url. | HS-1 |
| HS-2 | 5 | Proofs are base64url HMAC-SHA256 over the UTF-8 bytes of the context, role, kid, nonce and cnonce joined by line feeds, keyed by the UTF-8 bytes of the secret, with the contexts reins.v1.auth and reins.v1.hub. | HS-2, VEC-AUTH |
| HS-3 | 5 | A failed hello is answered with bye E_AUTH and closed. | HS-3 |
| HS-4 | 5 | Agents must authenticate. | HS-4, S14.2 |
| HS-5 | 5 | A failed proof is answered after 200 ms, doubling per failure in the last minute, up to 3 s; a correct proof is never refused because others failed. | HS-5, HS-6 |
| HS-6 | 5 | At most 16 handshakes are pending; further connections get E_BUSY. | HS-7 |
| HS-7 | 5 | A peer that sends anything but hello first, or takes longer than 5 s, is closed. | HS-8, HS-9 |
| HS-8 | 5 | Keys shorter than 32 characters are rejected. | HS-10 |
| HS-9 | 5 | A peer that holds a key verifies welcome.proof and closes on mismatch. | HS-11 |
| HS-10 | 5 | Every message after welcome of a keyed session is sealed with directional keys bound to the challenge, hello and welcome texts. | HS-12, VEC-SEAL, S14.2 |
| HS-11 | 5 | A sealed message that does not verify (altered, replayed, reordered, clear text) closes the connection and is not delivered. | HS-13, HS-14, HS-15, VEC-SEAL |
| HS-12 | 5 | Key confirmation: sealed ping, sealed pong; the hub registers the peer only after it; 5 s limit. | HS-12, HS-16, HS-17 |
| HS-13 | 5 | An agent connecting with an Origin header is admitted only if the credential lists that origin, else E_ORIGIN. | HS-18 |
| HS-14 | 5 | The display name is the credential name, else the declared name without control characters, cut to 64. | HS-19 |
| HS-15 | 5 | A surface origin must be in the allowlist (exact, scheme://host:*, or *), else E_ORIGIN. | HS-20 |
| HS-16 | 5 | hello.surface.url has the connection origin. | HS-21 |
| HS-17 | 5 | requireKey refuses every surface without a key; a hub may pin an app id to a manifest digest (E_DENIED). | HS-22, HS-23 |
| HS-18 | 5 | A kiosk surface holds a key. | SF-ATT-5 |
| HS-19 | 5 | A surface without a key treats the hub as unverified and never attaches silently. | SF-ATT-3 |
| HS-20 | 5 | Session ids are labels; nothing is authorised by knowing one. | GR-14 |
| HS-21 | 5 | Either side sends bye before closing on purpose. | HS-25, RQ-10, SH-1 |
| HS-22 | 5 | Seal keys: th = b64url(SHA-256(L(c) \|\| c \|\| L(h) \|\| h \|\| L(w) \|\| w)) over the UTF-8 challenge, hello and welcome texts with u32 BE byte lengths; k = raw HMAC-SHA256(key, context + "\n" + nonce + "\n" + cnonce + "\n" + th); text payloads MACed as UTF-8. | VEC-SEAL, HS-12 |
| HS-23 | 5 | Text that is not well-formed Unicode is never sealed or opened; such a transcript text fails with E_AUTH. | VEC-SEAL |
| HS-24 | 5 | A surface claiming an app id the hub holds a key for must prove it, with or without requireKey (E_AUTH); SurfaceInfo.verified is true only for a surface that proved a key. | HS-26 |
| RQ-1 | 6 | A forwarded request reaches the surface without s, with ag, and c:1 when the hub policy demands confirmation; the answer is relayed unchanged. | RQ-3, RQ-4, RQ-5 |
| RQ-2 | 6 | Timeouts give E_TIMEOUT (act also waits consentTimeoutMs); a surface disconnect fails pending requests with E_GONE. | RQ-6, RQ-7 |
| RQ-3 | 6 | Events: ag targets one agent, otherwise every attached agent; the hub adds s; grant and surface events need no subscription. | RQ-8, RQ-9 |
| RQ-4 | 6 | ping {ts} is answered with pong {ts}; a peer silent for 2.5 x heartbeatMs is dropped. | RQ-1, RQ-2 |
| RQ-5 | 6 | The hub relays ui, state and nav events only to live grants with observe, user events to every live grant; grant events from a surface are acted on by kind and never relayed as they came, and surface events from a surface are dropped. | RQ-11 |
| RQ-6 | 6 | An unknown method is E_UNKNOWN_METHOD before any parameter check; a hidden surface answers exactly like a missing one (E_NO_SURFACE); params that cannot be canonicalised are E_BAD_ARGS and not forwarded. | VER-4, GR-18, RQ-12 |
| MAN-1 | 7 | A surface describes itself in hello.surface.manifest; the hub computes digest = b64url SHA-256 of canonical JSON (keys sorted by UTF-16 code units, no whitespace, ECMAScript number and string forms). | SF-MAN-1, HS-24, VEC-CARD |
| MAN-2 | 7 | A manifest is at most 64 KiB, 256 actions, 64 views; names match NAME_PATTERN. | VEC-CARD |
| MAN-3 | 7 | The prompt card is rendered by the section 7 rules and is the same wherever it is produced. | VEC-CARD |
| GR-1 | 8 | Attach scopes are intersected with the credential cap and the hub policy; empty is E_SCOPE; hub attach deny is E_DENIED. | GR-1, GR-2, VEC-SCOPE |
| GR-2 | 8 | The surface decides attach by its policy and answers {scopes, ttlMs}; a refusal is E_CONSENT or E_DENIED. | GR-3, SF-ATT-1, SF-ATT-2 |
| GR-3 | 8 | The grant expires at min(hub ttl, surface ttl) and the result is {grant, surface, manifest}. | GR-4 |
| GR-4 | 8 | One attach in flight per credential and surface across its sessions (E_BUSY); a burst of 3 attaches then one every 2 s (E_RATE); a disconnect withdraws a pending attach with detach {why:"agent"}. | GR-7, GR-8, GR-17 |
| GR-5 | 8 | The surface asks even under allow if the hub is unverified or after Stop. | SF-ATT-3, SF-ATT-4 |
| GR-6 | 8 | One grant per agent and surface; attaching again replaces it. | GR-9 |
| GR-7 | 8 | A grant ends on detach, disconnect, expiry, idleMs or revocation, and each side is told as the section 8 table says. | GR-5, GR-6, GR-10, GR-11, GR-12, SF-CTL-2 |
| GR-8 | 8 | Without a live grant: E_NOT_ATTACHED; outside the grant scopes: E_SCOPE. | GR-13, SF-SCOPE-1 |
| M-1 | 9 | Each method needs the scope in the section 9 table. | VEC-SCOPE |
| M-2 | 9 | act: unknown action and schema failures are E_BAD_ARGS; a request without args is validated as {}; deny is E_DENIED; confirm or c:1 prompts, a refusal is E_CONSENT. | SF-ACT-1, SF-ACT-2, SF-ACT-3, SF-ACT-9 |
| M-3 | 9 | An act result is JSON of at most 32 KiB, else E_TOO_LARGE; a value JSON cannot hold is E_INTERNAL; a throwing handler yields a generic E_INTERNAL unless it throws a ReinsError. | SF-ACT-4, SF-ACT-5, SF-ACT-7 |
| M-4 | 9 | ui.click, ui.type, ui.select and ui.key behave as described; disabled, unknown, unexposed or read-only targets are E_NO_TARGET; Tab never focuses a private field; ui.* never takes coordinates. | SF-UI-1, SF-UI-2, SF-UI-3, SF-UI-4, SF-UI-5, SF-UI-6 |
| M-5 | 9 | cursor.set label at most 40 characters, colour matches COLOR_PATTERN; raw coordinates and stream.open need policy.coordinates. | SF-CUR-1, SF-CUR-2, ST-6 |
| M-6 | 9 | show.view validates data against the view schema before rendering; a request without data is validated as {} when the schema is an object. | SF-SHOW-1, SF-SHOW-2 |
| M-7 | 9 | nav.go is same-origin http(s) under a policy.nav prefix, else E_DENIED. | SF-NAV-1, VEC-POLICY |
| M-8 | 9 | read returns visible text, at most max characters (default 2000, cap 8000), without private or ignored subtrees. | SF-OBS-10, SF-OBS-11 |
| M-9 | 9 | While paused every method outside READ_ONLY_METHODS fails with E_PAUSED, except chat.say and chat.status. | SF-CTL-1, VEC-SCOPE, CH-10 |
| M-10 | 9 | Input-synthesising commands on a private target, or that would change a private control they do not target, fail with E_DENIED unless policy.privateInput. | S14.9 |
| M-11 | 9 | While a consent prompt is showing or queued, every method outside READ_ONLY_METHODS from every agent fails with E_BUSY, chat.say and chat.status among them; read-only methods and detach still work. | SF-CON-5, CH-10 |
| OBS-1 | 10 | observe returns a full snapshot, or {base, ops} when since is the agent's last revision; handles are e + base36 and stable. | SF-OBS-1, SF-OBS-2, SF-OBS-3 |
| OBS-2 | 10 | Exposure under auto, annotated and none; hidden and ignored subtrees are never exposed. | SF-OBS-4, SF-OBS-5, SF-OBS-6 |
| OBS-3 | 10 | Private fields: state private, no val, only disabled/focused besides; privacy is sticky, also across a node swap; private text never names another node. | SF-OBS-7, SF-OBS-8, S14.9 |
| OBS-4 | 10 | Names follow the simplified accessible-name order; names cut to 120, values to 200. | SF-OBS-9 |
| OBS-5 | 10 | Deltas apply in order with the set/del placement rule (del of an absent handle does nothing); a sender emits only set and del, deletes first; diffNodes and applyOps implement it. | VEC-DELTA |
| OBS-6 | 10 | Compact text rendering: node lines as section 10 gives them, children indented; + ~ - for deltas, a move as one ~ line. | VEC-DELTA |
| OBS-7 | 10 | Subscribed agents get evt ui {rev}; state events carry an RFC 7396 merge patch; a null property reads as absent, so a state that changed only in null properties produces no event. | SF-OBS-12, SF-OBS-13, SF-OBS-14, VEC-MERGE |
| PTR-1 | 11 | Binary pointer frame layout of the section 11 table; fractions sent as round(f x 65535), halves up. | VEC-PTR |
| PTR-2 | 11 | stream.open answers with initial credit; a sender never has more points outstanding than its credit; flow returns credit. | ST-1, ST-2, ST-7, VEC-LIMITS |
| PTR-3 | 11 | The hub closes a stream that overruns its credit or the pointer rate, which is one budget per credential and surface across its sessions; the agent learns it from stream.close (E_RATE); empty frames without END are dropped. | ST-3, ST-4, ST-5, ST-8 |
| PTR-5 | 11 | An agent that gives up on a pointer stream still sends stream.close for it. | ST-9 |
| PTR-4 | 11 | Playback speeds up with lag up to 4x. | VEC-LIMITS |
| POL-1 | 12 | The three profiles match the section 12 table, defaults included. | VEC-POLICY |
| POL-2 | 12 | decideAction: exact override, then longest prefix, then risk tier; the stricter decision wins. | VEC-POLICY, S14.6 |
| POL-3 | 12 | Consent prompts: one per agent, four in total (E_BUSY); unanswered is a refusal; arguments over 40 entries, depth 4 or 2000 code points are E_TOO_LARGE; remember: session covers the action name with any arguments. | SF-CON-1, SF-CON-2, SF-CON-3, SF-CON-4, SF-ACT-6, SF-CON-7, SF-ACT-8 |
| POL-4 | 12 | Human control: indicator, Pause, Stop revokes the grant with evt grant revoked. | SF-CTL-1, SF-CTL-2, S14.11 |
| POL-5 | 12 | Cool-off: after a refusal or timeout the same agent is refused with E_RATE, 2 s doubling to 60 s; three refusals in a row revoke the grant; later attaches need approval. | SF-CON-6 |
| POL-6 | 12 | A driver in a page inside a frame does not connect to a hub: connect() fails with E_DENIED before anything is sent or shown, unless policy.framed; no profile sets it. | SF-FRAME-1, SF-FRAME-2, VEC-POLICY |
| LV-1 | 12 | A grant has a level, one of strict, ask, auto and bypass, and a grant starts at ask, or at strict where the person's strict for that agent was kept (LV-27). | LV-1, VEC-LEVELS |
| LV-2 | 12 | strict and ask are on offer for every grant; auto and bypass where the surface policy and the hub policy both list them; without a list from the hub only strict and ask; no level that is not on offer; the hub takes strict and ask whatever its policy lists. | LV-2, VEC-LEVELS |
| LV-3 | 12 | An act request is decided by the six steps of section 12 (decideAct): deny is final, strict asks every time, auto waives a prompt unless the action is dangerous, bypass waives every prompt, c:1 counts as a policy confirm. | VEC-LEVELS, LV-3 |
| LV-4 | 12 | The person's rule for one action: deny is E_CONSENT without a prompt or cool-off; a rule beats the level; allow can be set only where a level on offer would waive the same prompt, and where it cannot the panel shows Allow switched off and says why. | LV-4, VEC-LEVELS |
| LV-5 | 12 | A waived prompt is not an approval: the action does not run while a consent prompt is up (E_BUSY) and is not remembered. | LV-5 |
| LV-6 | 8, 12 | What lets an agent do more ends with the grant: auto and bypass, a rule allow, a remembered approval. A new grant, also a replacing one, has none of them, and at the hub every granted scope is on again unless the surface says otherwise (LV-27). | LV-6 |
| LV-7 | 12 | The panel opens and closes on trusted input alone; no protocol message reaches it; a level, a rule or a scope switch changes only on trusted input; without human.panel there is no panel. | LV-7 |
| LV-8 | 12 | Whatever lets an action run without asking takes a confirm step naming the agent and what stops asking, armed after 500 ms: auto or bypass above the current level, any level under which an action stops asking, the rule allow always, Reset where the action would then run unasked. What asks more applies at once; the indicator shows a level that is not ask. | LV-8 |
| LV-9 | 8 | Scope switches: a switched-off scope is E_SCOPE; the hub lets the grant carry only reported scopes that were granted at attach, closes pointer streams when cursor goes, and tells the agent. | LV-9 |
| LV-10 | 8, 13 | The hub sends its human.levels and, as decisions, what its policy decides for each action in attach, and ends a grant whose surface reports auto or bypass beyond what its policy offers: detach {why:"hub"}, evt grant revoked, both recorded. | LV-10 |
| LV-11 | 6, 13 | Level and rule reports are checked, recorded as person records and told to the named agent alone; malformed reports and grant events of an unknown kind are dropped; a rule allow the hub's policy would not let waive anything is recorded as refused, neither kept nor told, and the grant goes on. | LV-11 |
| LV-12 | 12 | The activity list holds times, agent names (in quotation marks, with the session id), method or declared action names and outcomes, never arguments, results or page text. | LV-12 |
| LV-13 | 12 | The surface reports each change with ag: evt user {kind:"level"}, evt user {kind:"rule"}, evt grant {kind:"scopes"}. | LV-13 |
| LV-14 | 15 | The MCP adapter tells what the person set as notices: lines starting "[reins] " at the start of the next tool result, before any page-data marker. The name of an action never appears in a notice: which actions the rules are for is listed last, as page data. | LV-14 |
| LV-15 | 8, 12 | The hub says in attach what its policy decides for each action (decisions); the surface reasons from the stricter of its own decision and the hub's, takes a missing or malformed decision as confirm, and holds the hub to what it said. | LV-15, VEC-LEVELS |
| LV-16 | 12 | A remembered approval is shown in the panel as allowed, because the person approved it earlier; Reset takes the rule and the approval away, Ask forgets the approval, and Reset takes the confirm step where the action would then run unasked. | LV-16 |
| LV-17 | 12 | When what is under the pointer changes other than by the person's click (the list changed, a consent card went away, a confirm step opened or was answered), controls that let an agent do more ignore activation for 500 ms. | LV-17 |
| LV-18 | 12 | While the overlay cannot be relied on, no click is taken on Allow or Always allow nor on a control that lets an agent do more; the person is told once it can be, and every arming delay starts over. | LV-18 |
| LV-19 | 12 | While a rule allow of the person waives a prompt, the indicator shows it: a chip that counts those rules, and the dot of the level that would waive the same. | LV-19 |
| LV-20 | 12 | Wherever the overlay names an agent in words of its own (a prompt, a confirm step, a heading, the indicator, the activity list), the name is in quotation marks, quotation marks in it escaped, followed by its session id. | LV-20, LV-12 |
| LV-21 | 8 | A surface holds at most 32 grants: an attach from a further agent is E_BUSY before anybody is asked; an agent that holds a grant can attach again. | LV-21 |
| LV-22 | 13 | A change of what the person set is always recorded; reports that change nothing are recorded at most 20 a second per surface and never told to the agent; a grant with more than 20 changes within one second is ended. | LV-22 |
| LV-23 | 12 | A consent prompt takes the focus onto itself, the dialog, where no key presses anything, and gives it back to where the person was; a pointer click on Deny is taken at once, a key only as LV-29 says. | LV-23 |
| LV-24 | 12 | The overlay's stylesheet reads no custom property and names only generic font families; the host resets every property and pins direction and unicode-bidi. | LV-24 |
| LV-25 | 12 | The overlay counts as not shown while its host, or outside the top layer an ancestor, has a filter, opacity, visibility, clip path, mask, transform, blend mode or content-visibility: hidden, while a zoom reaches it or nothing is rendered, while it is not last in the top layer, or while the indicator, the open panel or the prompt is covered: commands that change the page and attach fail with E_PAUSED. | LV-25, LV-32 |
| LV-26 | 12, 14 | The overlay acts on an event only when the browser made it for the person's input and delivers it to the control the listener was registered on; a script that replaces addEventListener after the driver loaded is handed no listener of the overlay. | LV-26, LV-7 |
| LV-27 | 8, 13 | What the person tightened stays with the agent for as long as the page lives: Strict, the rules confirm and deny and the scopes switched off are on every new grant of the same agent (the credential id the hub sends in attach), whatever its session id or name. The surface says so in its attach answer (kept); the hub starts the grant with it, records it, tells the agent, and reads nothing from it that lets an agent do more. | LV-27 (surface), LV-27 (hub) |
| LV-28 | 8 | Where the surface cannot tell which agent an attach is from (no credential id, or a hub it did not verify), an attach that would start with kept settings asks even where the policy allows attach, and the prompt says what was set and that it stays. | LV-28 |
| LV-29 | 12 | Keys that could be typing meant for the page answer no prompt: a key answers only as Enter or Space on a focused button of the prompt, or Escape, when it is no repeat, 500 ms after the prompt appeared, after the focus landed on the button and after any other key, and 3 s after the last key that types; Tab does nothing in the first 500 ms; the prompt says when the keyboard is locked out. | LV-29 |
| LV-30 | 12 | Nothing an agent drew stays on screen with a consent prompt: toasts and highlights are taken down, the cursor's label is hidden, and none can be put up while the prompt shows. | LV-30 |
| LV-31 | 12 | A string an agent or the hub wrote shows at most two combining marks in a row; the rest are escapes, which count toward what fits on a card, and each line of the argument listing is clipped to its own box. | LV-31 |
| LV-32 | 12 | The overlay's stylesheet takes the host's ::before, ::after and ::marker away and keeps its ::backdrop from showing; a zoom on the host or an ancestor, or a page that renders nothing, fails the check. | LV-32 |
| LV-33 | 13 | Fail closed: while the audit log cannot be written, a reported change that lets an agent do or hear more ends the grant, a change that only tightens is taken, and no chat message is relayed. | LV-33 |
| LV-34 | 12 | No timer has to fire: with every timer of the surface cleared, a prompt past its deadline is a refusal when the person clicks it and when the next request asks, arming delays and the cool-off hold by the clock. | LV-34 |
| LV-35 | 12 | A check that had to put the overlay back (show it again in the top layer, or move it) does not take the click that caused it as one that lets an agent do more; a later, separate click counts. | LV-35 |
| LV-36 | 12 | Letting agents hear each other is not taken while the overlay cannot be relied on, switch or confirm step; a hub that sends another chatRelay with a later attach does not clear the person's switch silently: the surface reports relay off for each agent and the Chat tab says so. | LV-36 |
| LV-37 | 12 | While the app's own code runs because an agent asked for it (an action's handler, a view's renderer, a state getter, the handlers of synthesised input), the chat composer takes no input. | LV-37 |
| CH-1 | 8, 12 | The chat scope: open and guarded grant it, kiosk does not; a surface without the panel grants none; without it every chat method is E_SCOPE. | CH-1, VEC-SCOPE, VEC-POLICY |
| CH-2 | 9 | chat.say: a text of 1 to 4000 characters after trimming, well-formed, else E_BAD_ARGS; answers the id the message has for the agent that said it; to names another agent of the room, or person. | CH-2, VEC-CHAT |
| CH-3 | 9 | chat.read: what the agent may read, oldest first, the latest max (20, at most 50) or what came after since; next to read on; at most 128 KiB, the latest being the newest that fit. | CH-3, CH-22, VEC-CHAT |
| CH-4 | 9 | chat.status: idle, thinking or working with a note of at most 80 characters; shown after the agent's name, the note quoted as its words, told to no other agent. | CH-4, VEC-CHAT |
| CH-5 | 6, 12 | Who is sent a message follows the four rules of section 12 (chatAudience); each is sent as evt chat with ag, never to its speaker. | CH-5, VEC-CHAT |
| CH-6 | 12 | An agent is given only what was posted while its grant was live and its chat scope on, and only what was sent to it. | CH-6 |
| CH-7 | 12, 15 | Only trusted input in the composer of the Chat tab makes a message of the person; the driver's API posts none and gives the app no text. | CH-7 |
| CH-8 | 12 | Agent text is inserted as text, escaped, under the name from the grant; no markup, no link. | CH-8 |
| CH-9 | 12 | A chat message grants nothing: no level, rule or scope changes, and no consent prompt is answered or waived. | CH-9 |
| CH-10 | 9, 12 | chat.say and chat.status are served while paused; while a consent prompt is up they are E_BUSY and nothing can be typed or sent. | CH-10, VEC-SCOPE |
| CH-11 | 12 | Unread messages are counted on the tab and in the indicator; the panel never opens by itself; an arriving message redraws nothing outside the Chat tab and moves no focus. | CH-11 |
| CH-12 | 6, 13 | The hub relays a chat event only to the grant its ag names, live and holding chat, built from the checked fields; an agent's message only where the hub's policy lets that agent hear its sender, under the hub's name for its sender; an agent cannot send one. | CH-12 |
| CH-13 | 12, 13 | rates.chat per credential and surface; chat.say checked at the hub; a relay budget for each sender and each listener, so that an agent's flood uses none of the person's. | CH-13, VEC-POLICY |
| CH-14 | 13 | chat.say is audited with the digest of {text} as said (with to) and its length, whatever else the agent sent; a relayed message of the person is a person record of the same shape; the text is never written. | CH-14, VEC-CHAT |
| CH-15 | 15 | reins_chat: say, status, read, wait (90 s by default, 150 s at most, early when the grant ends); who spoke on a line of the adapter, the text behind "\| ", under a first line naming the page, the surface and whether it is verified; unread chat as a notice with a count. | CH-15 |
| CH-16 | 15 | chat-serve: one run of the command for each message of the person, the message on standard input only, under a line of the runner's with its text behind \"\| \", the argument array started without a shell. | CH-16 |
| CH-17 | 12 | Under chatRelay person no agent hears another until the person switches it on: trusted input, a confirm step that names the agents, armed after 500 ms; a later agent is not included; off applies at once; each change is reported with ag. | CH-17 |
| CH-18 | 12 | The Chat tab always says which agents hear the person only and which hear each other, by name. | CH-18 |
| CH-19 | 12 | While a consent prompt is showing or queued the Chat tab shows nothing an agent wrote, and status notes are dropped. | CH-19, CH-10 |
| CH-20 | 12, 13 | chatRelay is off, person or on at the surface and at the hub; the stricter applies; the hub sends its value with attach and enforces it; none sent is off. | CH-20, VEC-CHAT, VEC-POLICY |
| CH-21 | 9, 12, 13 | to: "person" is for the person alone: always taken, sent and relayed to no agent, read back by its sender only. | CH-21, VEC-CHAT |
| CH-22 | 9, 12 | Message ids count each agent's own messages from 1; an event carries the id for the agent it goes to; the count goes on when a grant is replaced. | CH-22 |
| CH-23 | 12, 13 | An addressed message stays addressed when its agent leaves; Send waits 500 ms after the room changed; a message of the person the hub does not relay is recorded, told to the surface (chat.undelivered) and marked. | CH-23 |
| CH-24 | 13 | The person's switch for one agent (evt user relay with ag) is recorded as a person record and told to that agent alone; refused under a hub policy of off. | CH-24 |
| CH-25 | 15 | reins_chat: read removes only what it showed; a cancelled wait takes no message; a private question is answered to the person alone; no control character of a text reaches the model raw. | CH-25, VEC-CHAT |
| CH-26 | 15 | chat-serve refuses a page the hub did not verify unless --allow-unverified, serves one page and names it in every call, and answers the person alone what was asked of the agent alone. | CH-26, CH-16 |
| CH-27 | 12 | An agent is named as an agent, with its name in quotation marks and its session id, wherever the tab names it; a status note is quoted as its words. | CH-27 |
| CH-28 | 15 | Over the shell session a chat wait takes a message only for a caller that has the answer; wait hands over at most max; an answer stays for the person alone after a read that shows an older message. | CH-28 |
| CH-29 | 15 | chat-serve settles which file it runs before it takes a message, never from the working directory for a bare name, and says so; takes one message at a time; ends what a command left running before the run is over. | CH-29 |
| HUB-1 | 13 | One token bucket per credential, surface and scope, shared by its sessions; hub.info and surfaces.list share a bucket per credential (10/s, burst 20); over a limit E_RATE. | RL-1, RL-2, RL-3 |
| HUB-2 | 13 | Capacity: 64 surfaces, 32 agents, 4 sessions per credential, 8 streams per agent; beyond that E_BUSY. | CAP-1, CAP-2, CAP-3 |
| HUB-3 | 13 | Without a live observe grant the SurfaceInfo is reduced; changed events go only to grant holders; hub.info counts only what the agent may see. | GR-15, GR-16, GR-19 |
| HUB-4 | 13 | Audit: records for connections, attach, detach, grant end, refusals and audited requests (act, ui.*, nav.*, show.view, show.toast, show.highlight, stream.open, surface.attach); accepted before forwarding; args as a digest, an HMAC under the audit key. | AU-1, AU-2, AU-3, AU-6 |
| HUB-5 | 13 | Audit chain: hash over prev and canonical record, HMAC when keyed; verification fails on edits and truncation. | AU-4, VEC-AUDIT |
| HUB-6 | 13 | Audit refusals are bounded to 20 per second per connection, the excess summarised. | AU-5 |
| HUB-7 | 13 | On shutdown the hub sends bye OK to every peer. | SH-1 |
| HUB-8 | 13 | Admission: surfaces per origin and overall, agents per credential (E_RATE); a full hub answers E_BUSY first. | CAP-4 |
| HUB-9 | 13 | Malformed configuration is refused; a present but mistyped restriction never means any. | CFG-1 |
| MCP-1 | 15 | The MCP server negotiates a protocol version in initialize. | MCP-1, MCP-2 |
| MCP-2 | 15 | Ten tools with valid input schemas and annotations. | MCP-3 |
| MCP-3 | 15 | The scopes the server was started with are a ceiling. | MCP-4 |
| MCP-4 | 15 | Only reins_attach attaches; every other tool answers E_NOT_ATTACHED on a surface that is not attached. | MCP-5 |
| MCP-5 | 15 | In reins_batch page text sits on lines behind "\| ", apart from the step results. | MCP-6 |
| MCP-6 | 15 | reins_read returns the text of an element or of the page, or app state, as page data behind "\| "; a line the adapter adds comes after it. | MCP-7 |
| MCP-7 | 15 | A surface listing gives what the hub knows first (id, verified or unverified, origin, attached) and what the page says of itself last, the name quoted; reins_attach says in a line of its own which surface it is, whether the hub verified it and the scopes of the grant. | MCP-8 |
| MCP-8 | 15 | Text a page supplied reaches the model by one rule in every tool, alone and in a batch: behind "\| ", cut at every line break and separator, no control character raw; reins_read cuts at the length asked for and says so. | MCP-9 |
| VER-1 | 16 | No common version is E_VERSION. | VER-1 |
| VER-2 | 16 | Receivers ignore unknown fields and unknown event topics. | VER-2, VER-5 |
| VER-3 | 16 | Unknown methods are refused with E_UNKNOWN_METHOD. | VER-3, VER-4, SF-SCOPE-1 |
| ERR-1 | 4-16 | The error codes are exactly those of the section 6 table. | VEC-ERR |
| S14-1 | 14 | The hub listens on loopback only and validates Host, Origin and the remote address on every upgrade. | S14.1 |
| S14-2 | 14 | Agents authenticate with a 256-bit secret by HMAC challenge-response; the hub proves the secret; every message is sealed with a MAC bound to the handshake. | S14.2 |
| S14-3 | 14 | Secrets are never in URLs or logs and are stored in owner-only files. | S14.3 |
| S14-4 | 14 | Surfaces are admitted by origin allowlist, and by key where the deployment requires it or holds a key for the app id they claim. | S14.4, HS-26 |
| S14-5 | 14 | Every forwarded request is checked against a live grant, its scope and its rate. | S14.5 |
| S14-6 | 14 | The surface re-checks every request against the app policy. | S14.6 |
| S14-7 | 14 | Arguments are validated against a schema before any handler runs; undeclared properties are rejected. | S14.7 |
| S14-8 | 14 | No frame, argument or result can cause code, markup or style to be evaluated. | S14.8 |
| S14-9 | 14 | Private fields are never read and, by default, never written. | S14.9 |
| S14-10 | 14 | Consent, the indicator and its panel are isolated from the page's styles and from what its scripts can reach, and act only on input the browser made for the person and delivered to their own controls; script that runs in the page's own JavaScript realm is outside the rule, whatever the order in which it and the driver load. | S14.10, LV-7, LV-24, LV-26 |
| S14-11 | 14 | A human can always see that an agent is attached; Pause and Stop work without the hub. | S14.11 |
| S14-12 | 14 | Errors carry no internals; observations are size-bounded. | S14.12 |
| S14-13 | 14 | The audit log is append-only and hash-chained, keyed where needed, and the hub refuses attach and every audited request while it cannot record. | S14.13, AU-6 |
| S14-14 | 14 | Everything a surface reports is untrusted input presented to a model as data. | S14.14 |
| S14-15 | 14 | A grant's level, rules and scope switches change only on the person's trusted input, and what lets an action run without asking only through a confirm step; nothing the person sets relaxes a deny of the surface's policy or the hub's; the hub ends a grant whose surface reports a level beyond its policy and takes no rule that policy would not honour; what lets an agent do more ends with the grant, and what the person tightened stays with the agent. | S14.15, LV-6, LV-8, LV-11, LV-27 |
| S14-16 | 14 | Chat is data and grants nothing: the person's words come only from trusted input in the chat tab, agent text is shown as text under the grant's name, the hub relays a message only to the grant it names and records length and digest, and no message changes a level, a rule, a scope switch or a consent answer. | S14.16 |
| OR-1 | 5 | The origin of a URL: web origin, file://, app origin scheme://host[:port], or null; computed, not taken from a URL library. | OR-1, VEC-ORIGIN |
| OR-2 | 5 | The entry * admits web origins only, never file://, an app origin or null. | OR-2, VEC-ORIGIN |
| OR-3 | 5 | file://, an app origin and null are admitted by an entry that names them, exact or scheme://host:*. | OR-3, VEC-ORIGIN |
| OR-4 | 5 | hello.surface.url of a file: or app-scheme page has the connection origin; a null connection takes any URL without a web origin. | OR-4, VEC-ORIGIN |
| OR-5 | 5 | Credential origins and surfaces lists match file:// and app origins by the same rules. | OR-5 |
| EL-1 | 3 | The origin of an Electron window's link is the one Electron reports for the frame, never one the page sent. | EL-1 |
| EL-2 | 3 | A port goes only to the top-level frame of a registered window; one window is one surface. | EL-2 |
| EL-3 | 3 | A <webview> guest gets a port only when registered as embedded; an offscreen or background page gets none. | EL-3 |
| EL-4 | 3 | With surfaceSockets false a surface on the socket is answered E_ORIGIN and one linked in-process is admitted. | EL-4 |
| EL-5 | 15 | reins-electron refuses a debugging port that is not on a loopback address before connecting. | EL-5 |
| EL-6 | 15 | An adopted app's driver and its frame channel live in a world of their own, in every new document. | EL-6 |
| EL-7 | 15 | electronLink takes a port only from a message its own window posted for its own request; the link ends with the document. | EL-7 |
| EL-8 | 15 | An adopted page runs under guarded and offers no level that loosens unless whoever adopted it listed it. | EL-8 |
| OR-6 | 5 | The hub judges a nav report's URL by the origin of section 5: a file:// or app-origin page can say where it went. | OR-6 |
| EL-9 | 3 | A window is linked only while it shows the page it was registered for; a file:// or null page needs a registered URL. | EL-9 |
| EL-10 | 3 | A hidden window, or a view in one, gets its link when shown, a view in no window none; a parentless frame that is not the top frame gets none; no context isolation, no bridge. | EL-10 |
| EL-11 | 15 | A stopped command ends every driver it loaded for good; a document that no longer hears the command stops by itself. | EL-11 |
| EL-12 | 15 | The injector takes calls only from worlds it made (named afresh each run), asks --match of every document, replaces a closed link, prints origins. | EL-6, EL-12 |
| EL-13 | 15 | reins-electron dials a hub only on a loopback address. | EL-13 |
| EL-14 | 3 | A surface on a link the embedding code built and vouches for is listed as verified; nothing said on a socket makes one so. | EL-14 |
| EL-15 | 15 | The lease of an adopted document is judged by the clock at every frame: past it the driver gets and sends none, whether or not a timer fires. | EL-15 |
| EL-16 | 3 | reins-electron vouches for a page only over a debugging pipe: through a port the page is unverified both ways and gets no surface key. | EL-16 |
| EL-17 | 15 | With --debug-port the app is the browser behind the port: the command and its watcher close it over the port, and a starter's exit ends nothing. | EL-17 |
| EL-18 | 15 | --match is an origin or a URL prefix, compared as URLs, never a substring. | EL-18 |

The tests column lists test-name prefixes; `requirements.json` has the full names.
