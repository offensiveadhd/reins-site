# Requirements index

> Every requirement the conformance suite checks, grouped by section of the specification, with the normative sentences it covers and the tests that check it. Generated from conformance/requirements.json.

## How to read this

The conformance suite is traceable to the specification. `conformance/requirements.json` maps every requirement to its section and its tests, and each test name starts with the id of the requirement it checks.

A meta-test keeps the map honest. It fails if a normative sentence (MUST, MUST NOT, SHALL) or a rule of section 14 has no entry, if a quote no longer occurs in the specification, or if an entry names a test that does not exist. So the specification cannot gain a requirement without gaining a test.

Ids are grouped by prefix: `TR` transports, `FR` framing, `HS` handshake, `RQ` requests and events, `MAN` manifest, `GR` grants, `M` methods, `OBS` observation, `PTR` the pointer stream, `POL` policy, `HUB` hub behaviour, `LV` levels, rules and the panel, `CH` chat, `OR` origins, `EL` Electron, `MCP` the adapter, `VER` versioning, `WT` requests that wait at the surface, `WH` their tickets and answers at the hub, `CT` a request's time, `OF` offers at attach, `RT` a rule for a time, `RC` the rate cap on unasked runs, `AD` the notice after a refusal, `AT` the attention event, `ERR` error codes, and `S14` the security requirements. Test names that start with `VEC` check the [test vectors](./test-vectors.md).

What the suite does not check, or only partly, is listed under "Coverage limits" in [The conformance suite](./conformance-suite.md#coverage-limits).

241 requirements, checked by 487 test references. Each entry gives the requirement, the sentences of the specification it covers, word for word, and the tests that check it. The section headings link to the specification.

## Section 3: Transports

[Read section 3 of the specification](../reference/specification.md#3-transports).

#### TR-1

The hub binds loopback addresses only and refuses any other bind address.

> The hub MUST:
>
> bind loopback addresses only and refuse any other bind address;

Tests: `TR-1 the hub refuses to bind a non-loopback address`, `TR-1 the hub binds 127.0.0.1 by default and listens on the port it reports`

#### TR-2

The hub rejects a socket whose remote address is not loopback.

> reject a socket whose remote address is not loopback;

Tests: `TR-2 the hub serves loopback clients (the non-loopback refusal itself needs a second interface; see README)`

#### TR-3

The hub rejects a Host header other than 127.0.0.1, localhost or [::1] with its port.

> reject a request whose `Host` header is not

Tests: `S14.1 an upgrade with a Host header other than loopback with the hub port is refused (DNS rebinding)`

#### TR-4

The hub requires the reins.v1 subprotocol.

> require the `reins.v1` subprotocol;

Tests: `TR-4 the hub requires the reins.v1 subprotocol`

#### TR-5

The hub disables per-message compression.

> disable per-message compression;

Tests: `TR-5 the hub disables per-message compression`

#### TR-6

The hub answers plain HTTP with a bare status and no body.

> answer plain HTTP requests with a bare status and no body.

Tests: `TR-6 a plain HTTP request gets a bare status and no body`

#### EL-1

In an Electron app the origin of a window's link is the one Electron reports for the frame the port went to, never one the page sent.

> it MUST take the link's origin from the frame the port went to

Tests: `EL-1 the link's origin is the one Electron reports for the frame, whatever the page sends`

#### EL-2

The main process gives a port only to the top-level frame of a window the app registered; a second request from a window closes the link it had.

> It MUST give a port only to the top-level frame of a window the app registered

Tests: `EL-2 a port goes only to the top-level frame of a window the app registered`

#### EL-3

A <webview> guest gets a port only when the app registered it as embedded; an offscreen or background page gets none.

> MUST NOT give one to a `<webview>` guest unless the app said that guest may be driven while embedded

Tests: `EL-3 a <webview> guest gets a port only when the app registered it as embedded, and a page nobody sees gets none`

#### EL-4

A hub with surfaceSockets false answers a hello with role surface on its socket with bye E_ORIGIN, and still admits surfaces linked in-process.

> a `hello` with role `surface` MUST be answered `bye {code:"E_ORIGIN"}`

Tests: `EL-4 with surfaceSockets false a surface is refused on the socket with E_ORIGIN and admitted in-process`

#### EL-9

A window is linked only while it shows the page it was registered for, by the URL Electron reports for the frame; a window that shows a page of origin file:// or null is not linked without one.

> MUST compare it with the URL Electron reports for the frame at the time the page asks
>
> MUST NOT link a window that shows a page of origin `file://` or `null` unless it was registered with one

Tests: `EL-9 a window is linked only while it shows the page it was registered for, and a window that shows a file has to be registered with its URL`

#### EL-10

A window that is not shown gets its link when it is shown, and so does a view registered by its contents, which gets none while it is in no window; a frame without a parent that is not the page's top frame gets none; in a window without context isolation the preload offers no way to ask and the page is told why.

> in a window without context isolation it MUST NOT offer the page a way to ask

Tests: `EL-10 a window that is not shown gets its link when it is shown; a frame without a parent that is not the page's top frame gets none; without context isolation the preload refuses and the page is told why`

#### EL-14

A surface whose link the embedding code built and vouches for is listed as verified; nothing a surface says on a socket makes it so.

Tests: `EL-14 a surface whose link the embedding code built and vouches for is listed as verified; one linked without that, or over a socket, is not`, `EL-14 nothing a surface writes on a socket makes it verified: only a key does`

#### EL-16

reins-electron vouches for a page only when it holds the debugging connection alone (a pipe): a page adopted through a debugging port is not listed as verified, treats its hub as unverified, and is given no surface key.

> MUST NOT vouch for a page it adopted through a debugging port

Tests: `EL-16 over a debugging pipe the hub lists an adopted page as verified, and the page takes its hub as verified`, `EL-16 through a debugging port neither does: the hub lists the page as unverified, and its prompt says "Unverified hub"`, `EL-16 a page adopted through a debugging port gets no surface key, and its configuration says that its hub is not to be taken as verified`

## Section 4: Framing

[Read section 4 of the specification](../reference/specification.md#4-framing).

#### FR-1

A receiver closes with E_TOO_LARGE on an oversize frame and with E_BAD_FRAME on invalid JSON, an unknown t or a missing field; closing with a code is bye {code} then close, and a message the transport cannot take is closed with WebSocket code 1009.

> A receiver MUST close with `E_TOO_LARGE`

Tests: `FR-1 an unknown frame type closes the connection with E_BAD_FRAME`, `FR-2 a frame that is not valid JSON closes the connection with E_BAD_FRAME`, `FR-3 a frame that lacks a required field closes the connection with E_BAD_FRAME`, `FR-4 the hub announces its limits in welcome and closes an oversize text frame with E_TOO_LARGE`, `FR-5 an oversize binary frame closes the connection with E_TOO_LARGE`, `FR-6 a sealed text frame far over the limit closes the connection (bye E_TOO_LARGE or WebSocket close 1009)`, `HS-8 a peer that sends anything but hello first is closed`

#### FR-2

The hub announces its limits in welcome; defaults are 256 KiB text, 16 KiB binary, heartbeatMs 15000, reqTimeoutMs 15000, consentTimeoutMs 60000.

Tests: `FR-4 the hub announces its limits in welcome and closes an oversize text frame with E_TOO_LARGE`, `VEC-LIMITS the default limits and fixed sizes match the spec`, `VEC-LIMITS heartbeatMs, reqTimeoutMs, consentTimeoutMs and the initial pointer credit have the stated defaults`

## Section 5: Handshake and authentication

[Read section 5 of the specification](../reference/specification.md#5-handshake-and-authentication).

#### HS-1

The hub sends challenge {v, nonce, hub} first; nonces are 32 fresh random bytes, base64url.

Tests: `HS-1 the hub speaks first with challenge {v, nonce, hub}; the nonce is 32 fresh bytes`

#### HS-2

Proofs are base64url HMAC-SHA256 over the UTF-8 bytes of the context, role, kid, nonce and cnonce joined by line feeds, keyed by the UTF-8 bytes of the secret, with the contexts reins.v1.auth and reins.v1.hub.

Tests: `HS-2 a correct agent proof is answered with welcome {v, session, role, limits, proof} and the hub proof verifies`, `VEC-AUTH peerProof reproduces every hello.auth.proof vector`, `VEC-AUTH hubProof reproduces every welcome.proof vector`

#### HS-3

A failed hello is answered with bye E_AUTH and closed.

Tests: `HS-3 a wrong proof is answered with bye E_AUTH and the connection is closed`, `HS-3 an unknown kid is answered with bye E_AUTH`

#### HS-4

Agents must authenticate.

> **Agents** MUST authenticate.

Tests: `HS-4 agents must authenticate: an agent hello without auth is refused with E_AUTH`, `S14.2 agents prove a 256-bit secret by HMAC and the hub proves it back; a wrong secret is refused`

#### HS-5

A failed proof is answered after 200 ms, doubling per failure in the last minute, up to 3 s; a correct proof is never refused because others failed.

Tests: `HS-5 a failed proof is answered after a delay of at least 200 ms that doubles with each failure`, `HS-6 a correct proof is not refused because other proofs failed`

#### HS-6

At most 16 handshakes are pending; further connections get E_BUSY.

Tests: `HS-7 more than 16 pending handshakes: further connections are closed with E_BUSY`

#### HS-7

A peer that sends anything but hello first, or takes longer than 5 s, is closed.

Tests: `HS-8 a peer that sends anything but hello first is closed`, `HS-9 a peer that sends no hello within 5 s is closed`

#### HS-8

Keys shorter than 32 characters are rejected.

Tests: `HS-10 keys shorter than 32 characters are rejected when the hub is configured`

#### HS-9

A peer that holds a key verifies welcome.proof and closes on mismatch.

> A peer that holds a key MUST verify it and close on mismatch.

Tests: `HS-11 a peer holding a key verifies welcome.proof and closes on mismatch`

#### HS-10

Every message after welcome of a keyed session is sealed with directional keys bound to the challenge, hello and welcome texts.

Tests: `HS-12 after welcome the hub answers the sealed ping with a sealed pong, and every later hub message is sealed`, `VEC-SEAL a peer-side sealed link emits exactly the vector wire messages, counting from 0`, `VEC-SEAL a hub-side sealed link emits exactly the vector wire messages`, `VEC-SEAL the hub side opens the vector messages and delivers the payloads in order`, `VEC-SEAL keys depend on every byte of hello and welcome`, `S14.2 seal MACs are bound to the handshake: a message sealed for another session is rejected`, `VEC-SEAL keys depend on every byte of the challenge and on where each transcript text ends`

#### HS-11

A sealed message that does not verify (altered, replayed, reordered, clear text) closes the connection and is not delivered.

Tests: `HS-13 a sealed message that does not verify closes the connection and is not delivered`, `HS-14 a replayed sealed message closes the connection`, `HS-15 a clear-text frame inside a sealed session closes the connection`, `VEC-SEAL a message replayed, reordered or altered closes the link and is not delivered`

#### HS-12

Key confirmation: sealed ping, sealed pong; the hub registers the peer only after it; 5 s limit.

Tests: `HS-12 after welcome the hub answers the sealed ping with a sealed pong, and every later hub message is sealed`, `HS-16 the hub registers a keyed peer only after key confirmation`, `HS-17 a keyed peer that never confirms is closed after about 5 s`

#### HS-13

An agent connecting with an Origin header is admitted only if the credential lists that origin, else E_ORIGIN.

> that origin MUST be listed on the credential

Tests: `HS-18 an agent connecting with an Origin header is admitted only if the credential lists that origin`

#### HS-14

The display name is the credential name, else the declared name without control characters, cut to 64.

Tests: `HS-19 the name shown to users is the credential name, else the declared name without control characters, cut to 64`

#### HS-15

A surface origin must be in the allowlist (exact, scheme://host:*, or *), else E_ORIGIN.

> MUST find it in the configured allowlist

Tests: `HS-20 a surface is admitted only from an allowlisted origin, exact or scheme://host:*`

#### HS-16

hello.surface.url has the connection origin.

> `hello.surface.url` MUST have that origin.

Tests: `HS-21 hello.surface.url must have the connection origin`

#### HS-17

requireKey refuses every surface without a key; a hub may pin an app id to a manifest digest (E_DENIED).

Tests: `HS-22 with requireKey a surface without a key is refused with E_AUTH and one with the key is sealed`, `HS-23 a hub that pins an app id to a manifest digest refuses a different manifest`

#### HS-18

A kiosk surface holds a key.

> a kiosk surface MUST hold a key.

Tests: `SF-ATT-5 a kiosk driver refuses to dial a hub without a surface key`

#### HS-19

A surface without a key treats the hub as unverified and never attaches silently.

Tests: `SF-ATT-3 against an unverified hub the surface never attaches silently and says so in the consent request`

#### HS-20

Session ids are labels; nothing is authorised by knowing one.

Tests: `GR-14 session ids are labels: another agent cannot use a grant by naming its session`

#### HS-21

Either side sends bye before closing on purpose.

Tests: `HS-25 a hub refusal sends bye before closing`, `RQ-10 a peer that sends bye is closed; the hub tells agents the surface is gone`, `SH-1 on shutdown the hub sends bye {code:"OK"} to every peer`

#### HS-22

Seal keys: th = b64url(SHA-256(L(c) || c || L(h) || h || L(w) || w)) over the UTF-8 challenge, hello and welcome texts with u32 BE byte lengths; k = raw HMAC-SHA256(key, context + "\n" + nonce + "\n" + cnonce + "\n" + th); text payloads MACed as UTF-8.

> Both ends MUST derive the keys exactly this way

Tests: `VEC-SEAL a peer-side sealed link emits exactly the vector wire messages, counting from 0`, `VEC-SEAL a hub-side sealed link emits exactly the vector wire messages`, `VEC-SEAL keys depend on every byte of the challenge and on where each transcript text ends`, `HS-12 after welcome the hub answers the sealed ping with a sealed pong, and every later hub message is sealed`

#### HS-23

Text that is not well-formed Unicode is never sealed or opened; such a transcript text fails with E_AUTH.

> Text that is not well-formed Unicode (it holds a lone surrogate) MUST NOT be sealed or opened

Tests: `VEC-SEAL text that is not well-formed Unicode is never sealed or opened, and such a transcript fails with E_AUTH`

#### HS-24

A surface claiming an app id the hub holds a key for must prove it, with or without requireKey (E_AUTH); SurfaceInfo.verified is true only for a surface that proved a key.

> A surface whose manifest claims an app id the hub holds a key for MUST prove that key

Tests: `HS-26 a surface claiming an app id the hub holds a key for must prove it, even without requireKey; SurfaceInfo.verified tells them apart`

#### OR-1

The origin of a URL is the web origin for http, https, ws, wss and ftp, file:// for every file: URL, the app origin scheme://host[:port] for a URL of another scheme that has a host, and null otherwise; it is computed, not taken from a URL library.

> An implementation MUST compute it this way (`urlOrigin`)

Tests: `OR-1 the origin of a file: or app-scheme URL is computed, not taken from the URL parser of the engine`, `VEC-ORIGIN urlOrigin gives every URL the origin section 5 defines`

#### OR-2

The entry * admits web origins only: file://, an app origin and null are not admitted by it.

> `*` matches every web origin and MUST NOT match `file://`, an app origin or `null`

Tests: `OR-2 the entry * admits web origins only: file://, an app origin and null are refused under it`, `VEC-ORIGIN originAllowed admits an origin by the entries of section 5`

#### OR-3

file://, an app origin and null are admitted by an entry that names them; scheme://host:* admits an app origin of that scheme and host with any port or none.

Tests: `OR-3 file://, an app origin and null are admitted by an entry that names them, exact or scheme://host:*`, `VEC-ORIGIN originAllowed admits an origin by the entries of section 5`

#### OR-4

hello.surface.url has the connection origin when the origin of the URL equals it; a connection whose origin is null takes any URL that has no web origin.

Tests: `OR-4 hello.surface.url of a file: or app-scheme page must have the connection origin`, `VEC-ORIGIN urlHasOrigin says whether hello.surface.url has the connection origin`

#### OR-5

A credential's origins and surfaces lists match file:// and app origins by the same rules, and * on them is web origins only.

Tests: `OR-5 a credential names file:// and app origins like any other: where an agent page may connect from, and which surfaces it may see`

#### OR-6

The hub judges the URL of a surface's nav report by the origin section 5 gives it: a report of a file:// or app-origin page reaches the agents, one of another origin is dropped.

> the hub MUST judge it by the origin this section gives it

Tests: `OR-6 a nav report of a page on file:// or an app origin reaches the agents and the listing, as one of a web page does; one of another origin is dropped`

## Section 6: Requests, responses, events

[Read section 6 of the specification](../reference/specification.md#6-requests-responses-events).

#### RQ-1

A forwarded request reaches the surface without s, with ag, and c:1 when the hub policy demands confirmation; the answer is relayed unchanged.

Tests: `RQ-3 a forwarded request reaches the surface without s, with ag set to the agent session, ids counting from 1`, `RQ-4 the surface's answer is relayed back unchanged, errors included`, `RQ-5 the hub sets c:1 when its policy demands a human confirmation`

#### RQ-2

Timeouts give E_TIMEOUT (act also waits consentTimeoutMs); a surface disconnect fails pending requests with E_GONE.

Tests: `RQ-6 a request the surface never answers fails with E_TIMEOUT; act waits reqTimeoutMs plus consentTimeoutMs`, `RQ-7 when a surface disconnects, its pending requests fail with E_GONE`

#### RQ-3

Events: ag targets one agent, otherwise every attached agent; the hub adds s; grant and surface events need no subscription.

Tests: `RQ-8 a surface event without ag reaches every attached agent with s added; with ag only that agent`, `RQ-9 grant and surface events need no subscription`

#### RQ-4

ping {ts} is answered with pong {ts}; a peer silent for 2.5 x heartbeatMs is dropped.

Tests: `RQ-1 ping {ts} is answered with pong carrying the same ts`, `RQ-2 the hub pings after heartbeatMs of silence and drops a peer silent for 2.5 x heartbeatMs`

#### RQ-5

The hub relays ui, state and nav events only to live grants with observe, user events to every live grant; grant events from a surface are acted on by kind and never relayed as they came, and surface events from a surface are dropped.

Tests: `RQ-11 events reach only grants with the scope their topic needs; grant and surface events from a surface are not relayed`

#### RQ-6

An unknown method is E_UNKNOWN_METHOD before any parameter check; a hidden surface answers exactly like a missing one (E_NO_SURFACE); params that cannot be canonicalised are E_BAD_ARGS and not forwarded.

Tests: `VER-4 an unknown method without a surface id is refused with E_UNKNOWN_METHOD`, `GR-18 a surface the credential may not attach to answers exactly like a missing one: E_NO_SURFACE on every method that takes s`, `RQ-12 params nested too deeply to canonicalise are refused with E_BAD_ARGS and not forwarded; an unknown method is still E_UNKNOWN_METHOD`

## Section 7: Manifest and prompt card

[Read section 7 of the specification](../reference/specification.md#7-manifest-and-prompt-card).

#### MAN-1

A surface describes itself in hello.surface.manifest; the hub computes digest = b64url SHA-256 of canonical JSON (keys sorted by UTF-16 code units, no whitespace, ECMAScript number and string forms).

Tests: `SF-MAN-1 hello carries the manifest: reins, app, actions, views, state, exposure, profile`, `HS-24 the hub computes the manifest digest as base64url SHA-256 of the canonical JSON`, `VEC-CARD canonicalJson sorts keys and drops whitespace`, `VEC-CARD manifestDigest is the base64url SHA-256 of the canonical JSON`, `VEC-CARD canonicalJson sorts keys by UTF-16 code units and writes strings and numbers as ECMAScript does`

#### MAN-2

A manifest is at most 64 KiB, 256 actions, 64 views; names match NAME_PATTERN.

Tests: `VEC-CARD validateManifest enforces 64 KiB, 256 actions and 64 views`

#### MAN-3

The prompt card is rendered by the section 7 rules and is the same wherever it is produced.

Tests: `VEC-CARD renderCard reproduces the section 7 prompt card`

## Section 8: Grants and scopes

[Read section 8 of the specification](../reference/specification.md#8-grants-and-scopes).

#### GR-1

Attach scopes are intersected with the credential cap and the hub policy; empty is E_SCOPE; hub attach deny is E_DENIED.

Tests: `GR-1 the hub intersects requested scopes with the credential cap and the hub policy`, `GR-2 hub policy attach: deny refuses with E_DENIED`, `VEC-SCOPE capScopes intersects in canonical order`

#### GR-2

The surface decides attach by its policy and answers {scopes, ttlMs}; a refusal is E_CONSENT or E_DENIED.

Tests: `GR-3 a surface refusal (E_CONSENT, E_DENIED) reaches the agent`, `SF-ATT-1 attach is decided by the surface policy: open allows, guarded asks, and the surface caps scopes by its own policy`, `SF-ATT-2 a refused attach is E_CONSENT; policy attach: deny is E_DENIED`

#### GR-3

The grant expires at min(hub ttl, surface ttl) and the result is {grant, surface, manifest}.

Tests: `GR-4 the attach result is {grant, surface, manifest} and the grant expires at min(hub ttl, surface ttl)`

#### GR-4

One attach in flight per credential and surface across its sessions (E_BUSY); a burst of 3 attaches then one every 2 s (E_RATE); a disconnect withdraws a pending attach with detach {why:"agent"}.

Tests: `GR-7 one attach at a time per agent and surface: a second concurrent attach is E_BUSY`, `GR-8 attach is rate limited per credential and surface: a burst of 3, then E_RATE`, `GR-17 one attach in flight per credential and surface across its sessions; a disconnect withdraws a pending attach with detach {why:"agent"}`

#### GR-5

The surface asks even under allow if the hub is unverified or after Stop.

Tests: `SF-ATT-3 against an unverified hub the surface never attaches silently and says so in the consent request`, `SF-ATT-4 after Stop every later attach on the page needs approval`

#### GR-6

One grant per agent and surface; attaching again replaces it.

Tests: `GR-9 attaching again replaces the grant: one grant per agent and surface`

#### GR-7

A grant ends on detach, disconnect, expiry, idleMs or revocation, and each side is told as the section 8 table says.

Tests: `GR-5 at expiry the grant ends: the surface gets detach, the agent a grant event, requests fail E_NOT_ATTACHED`, `GR-6 a grant without a request for idleMs ends`, `GR-10 detach ends the grant and tells the surface; later requests are E_NOT_ATTACHED`, `GR-11 when the agent disconnects the surface is told with detach`, `GR-12 Stop on the surface (evt grant revoked) ends the grant and the agent gets a grant event`, `SF-CTL-2 Stop revokes the grant: the surface sends evt grant {kind:"revoked"} and later requests are E_NOT_ATTACHED`

#### GR-8

Without a live grant: E_NOT_ATTACHED; outside the grant scopes: E_SCOPE.

Tests: `GR-13 a request without a grant is E_NOT_ATTACHED and one outside the grant scopes is E_SCOPE; neither reaches the surface`, `SF-SCOPE-1 the surface checks the grant and its scopes itself: E_NOT_ATTACHED, E_SCOPE, E_UNKNOWN_METHOD`

#### LV-9

Scope switches: the surface refuses a switched-off scope with E_SCOPE; the hub lets the grant carry only the reported scopes that were granted at attach, closes pointer streams when cursor goes, and tells the agent.

> The hub MUST then let the grant carry only those of the reported scopes that were granted at attach

Tests: `LV-9 a scope the person switched off is refused with E_SCOPE; it comes back when switched on, never beyond the grant`, `LV-9 the hub lets a grant carry only the reported scopes that were granted at attach, and refuses the rest with E_SCOPE`, `LV-9 when cursor is switched off the hub closes that agent's pointer streams on the surface`

#### LV-21

A surface holds at most 32 grants (MAX_SURFACE_SESSIONS): an attach from a further agent is E_BUSY before anybody is asked, and an agent that holds a grant can still attach again.

> A surface MUST refuse an attach from a further agent with `E_BUSY`

Tests: `LV-21 a surface holds at most 32 grants: a further attach is E_BUSY before anybody is asked`

#### LV-28

Where the surface cannot tell which agent an attach is from (no credential id, or a hub it did not verify), every agent is the same agent to it: an attach that would start with kept settings asks even where the policy allows attach, and the prompt says what was set and that it stays.

> surface MUST ask the person about an attach that would start with kept settings

Tests: `LV-28 where the hub does not say which credential an agent holds, an attach that follows a tightening asks even where the policy allows attach, the prompt says what stays, and it stays`

## Section 9: Methods

[Read section 9 of the specification](../reference/specification.md#9-methods).

#### M-1

Each method needs the scope in the section 9 table.

Tests: `VEC-SCOPE every method maps to the scope in the section 9 table`, `VEC-SCOPE scopes are in canonical order`, `VEC-SCOPE the hub answers hub.info, surfaces.list, attach, detach and the stream methods itself`

#### M-2

act: unknown action and schema failures are E_BAD_ARGS; a request without args is validated as {}; deny is E_DENIED; confirm or c:1 prompts, a refusal is E_CONSENT.

Tests: `SF-ACT-1 an unknown action, args failing the schema and undeclared properties are E_BAD_ARGS; the handler does not run`, `SF-ACT-2 decisions follow the risk tier of each profile: allow runs, confirm asks, deny is E_DENIED`, `SF-ACT-3 a request carrying c:1 shows a consent prompt even for an allowed action; a refusal is E_CONSENT`, `SF-ACT-9 act without args is validated as {}: an action that requires nothing runs with {}, a missing required property is E_BAD_ARGS with its path`

#### M-3

An act result is JSON of at most 32 KiB, else E_TOO_LARGE; a value JSON cannot hold is E_INTERNAL; a throwing handler yields a generic E_INTERNAL unless it throws a ReinsError.

> Its result MUST be JSON and at most 32 KiB

Tests: `SF-ACT-4 a result over 32 KiB is E_TOO_LARGE`, `SF-ACT-5 a handler that throws yields E_INTERNAL with a generic message, unless it throws a ReinsError`, `SF-ACT-7 a result JSON cannot hold is E_INTERNAL ("result is not JSON")`

#### M-4

ui.click, ui.type, ui.select and ui.key behave as described; disabled, unknown, unexposed or read-only targets are E_NO_TARGET; Tab never focuses a private field; ui.* never takes coordinates.

Tests: `SF-UI-1 disabled, unknown and unexposed targets are E_NO_TARGET; ui.* never accepts coordinates`, `SF-UI-2 ui.click dispatches pointer, mouse and click events`, `SF-UI-3 ui.type sets the value and dispatches input and change`, `SF-UI-4 ui.select chooses an option by value or by label`, `SF-UI-5 ui.key accepts only keys from UI_KEYS`, `SF-UI-6 Backspace, Delete and Space on a read-only or disabled target fail as ui.type does; Tab never moves focus to a private field`

#### M-5

cursor.set label at most 40 characters, colour matches COLOR_PATTERN; raw coordinates and stream.open need policy.coordinates.

Tests: `SF-CUR-1 cursor.set takes a label of at most 40 characters and a colour matching COLOR_PATTERN`, `SF-CUR-2 cursor.move to raw coordinates and stream.open fail with E_DENIED when policy.coordinates is off`, `ST-6 stream.open fails with E_DENIED at the hub when its policy turns raw coordinates off`

#### M-6

show.view validates data against the view schema before rendering; a request without data is validated as {} when the schema is an object.

Tests: `SF-SHOW-1 show.view validates data against the view schema before calling the renderer`, `SF-SHOW-2 show.view without data is validated as {} when the view schema is an object, and the renderer gets {}`

#### M-7

nav.go is same-origin http(s) under a policy.nav prefix, else E_DENIED.

> It MUST be same-origin, `http:` or `https:`

Tests: `SF-NAV-1 nav.go must be same-origin http(s) under a policy.nav prefix, else E_DENIED`, `VEC-POLICY each profile matches the section 12 table`

#### M-8

read returns visible text, at most max characters (default 2000, cap 8000), without private or ignored subtrees.

Tests: `SF-OBS-10 read returns visible text, at most max characters (default 2000, cap 8000)`, `SF-OBS-11 read leaves out private, ignored and visibility:hidden text but keeps visible descendants`

#### M-9

While paused every method outside READ_ONLY_METHODS fails with E_PAUSED, except chat.say and chat.status.

Tests: `SF-CTL-1 while paused every method outside the read-only set fails with E_PAUSED`, `VEC-SCOPE the read-only methods, and the chat methods served while paused, are those of section 9`, `CH-10 chat.say and chat.status work while control is paused; while a consent prompt is up they are E_BUSY, nothing can be typed or sent and chat.read still answers`

#### M-10

Input-synthesising commands on a private target, or that would change a private control they do not target, fail with E_DENIED unless policy.privateInput.

Tests: `S14.9 private fields are never read and, by default, never written`, `S14.9 commands that would change a private control they do not target are refused: clear on an editable holding one, a radio of its group, a form reset`

#### M-11

While a consent prompt is showing or queued, every method outside READ_ONLY_METHODS from every agent fails with E_BUSY, chat.say and chat.status among them; read-only methods and detach still work.

Tests: `SF-CON-5 while a consent prompt is up, every method outside READ_ONLY_METHODS from every agent fails with E_BUSY; read-only methods and detach still work`, `CH-10 chat.say and chat.status work while control is paused; while a consent prompt is up they are E_BUSY, nothing can be typed or sent and chat.read still answers`

#### CH-2

chat.say: the text is trimmed and is then 1 to 4000 characters of well-formed Unicode, otherwise E_BAD_ARGS; the answer is the id the message has for the agent that said it; to names another agent of the room, or person for the person alone.

Tests: `CH-2 chat.say takes a text of 1 to 4000 characters after trimming and answers its id; anything else is E_BAD_ARGS, and to names another agent of the room`, `VEC-CHAT a chat text is trimmed, 1 to 4000 characters and well-formed, or it is refused`

#### CH-3

chat.read returns what the agent may read, oldest first: the latest max (20 by default, 50 at most), or with since what came after it, and next to read on from; an answer holds at most 128 KiB, and the latest are then the newest that fit.

Tests: `CH-3 chat.read returns what the agent may read, oldest first: the latest max, or with since what came after, and next to go on from`, `VEC-CHAT the limits and the states are those the spec states`, `CH-22 message ids count each agent's own messages from 1, an event carries the id the message has for the agent it goes to, and the count goes on when a grant is replaced`

#### CH-4

chat.status: idle, thinking or working, with a note of at most 80 characters on one line; shown after the agent's name, the note quoted as that agent's words, and told to no other agent.

Tests: `CH-4 chat.status shows idle, thinking or working with a note of at most 80 characters next to the agent's name, and tells no other agent`, `VEC-CHAT a status note is one line of at most 80 characters, or it is refused`

## Section 10: Observation

[Read section 10 of the specification](../reference/specification.md#10-observation).

#### OBS-1

observe returns a full snapshot, or {base, ops} when since is the agent's last revision; handles are e + base36 and stable.

Tests: `SF-OBS-1 observe without since returns a full snapshot {rev, nodes, url, title, vp} with e+base36 handles`, `SF-OBS-2 observe {since} at the last revision returns {base, ops} that bring the previous tree to the new one; other since values get a snapshot`, `SF-OBS-3 handles stay the same for the lifetime of an element`

#### OBS-2

Exposure under auto, annotated and none; hidden and ignored subtrees are never exposed.

Tests: `SF-OBS-4 auto exposure: interactive elements, headings, images with alt, live regions, named landmarks and forms`, `SF-OBS-5 annotated exposure exposes only data-reins-id and data-reins="expose" elements; none exposes nothing`, `SF-OBS-6 hidden, inert, aria-hidden, display:none, visibility:hidden and data-reins="ignore" subtrees are never exposed`

#### OBS-3

Private fields: state private, no val, only disabled/focused besides; privacy is sticky, also across a node swap; private text never names another node.

Tests: `SF-OBS-7 private fields appear with state private, no val, and only disabled/focused besides`, `SF-OBS-8 privacy is sticky: a password field switched to type=text stays private`, `S14.9 a text field swapped in for a private one stays private`, `S14.9 private text never names another node, and a node in a private subtree is named only by data-reins-label`

#### OBS-4

Names follow the simplified accessible-name order; names cut to 120, values to 200.

Tests: `SF-OBS-9 names follow data-reins-label, aria-label, label, placeholder, alt, title, text; names cut to 120 and values to 200`

#### OBS-5

Deltas apply in order with the set/del placement rule (del of an absent handle does nothing); a sender emits only set and del, deletes first; diffNodes and applyOps implement it.

> every implementation MUST use them, or match them exactly.

Tests: `VEC-DELTA applyOps follows the ordering rule`, `VEC-DELTA applyOps(prev, diffNodes(prev, next)) equals next`, `VEC-DELTA diffNodes uses only set and del ops and nothing when the trees are equal`, `VEC-DELTA diffNodes emits every del before the first set`

#### OBS-6

Compact text rendering: node lines as section 10 gives them, children indented; + ~ - for deltas, a move as one ~ line.

Tests: `VEC-DELTA renderTree prints the section 10 example exactly`, `VEC-DELTA renderOps marks new nodes +, replaced nodes ~ and removed handles -`, `VEC-DELTA node lines and delta lines have the exact section 10 text form`

#### OBS-7

Subscribed agents get evt ui {rev}; state events carry an RFC 7396 merge patch; a null property reads as absent, so a state that changed only in null properties produces no event.

Tests: `SF-OBS-12 a subscribed agent gets evt ui {rev} when the tree changes`, `SF-OBS-13 state.get returns values and a subscribed agent gets evt state with an RFC 7396 patch`, `SF-OBS-14 a state that differs from the last one sent only in null properties, or not at all, produces no state event`, `VEC-MERGE mergeApply reproduces the RFC 7396 examples`, `VEC-MERGE mergeDiff yields a patch that turns from into to`, `VEC-MERGE mergeDiff of equal values is undefined`

## Section 11: Cursor and the pointer stream

[Read section 11 of the specification](../reference/specification.md#11-cursor-and-the-pointer-stream).

#### PTR-1

Binary pointer frame layout of the section 11 table; fractions sent as round(f x 65535), halves up.

Tests: `VEC-PTR encodePointer produces the vector bytes`, `VEC-PTR decodePointer reads the vector bytes back`, `VEC-PTR encodePointer clamps x, y to 0..1 and dt to 0..65535`, `VEC-PTR decodePointer refuses malformed frames with E_BAD_FRAME`, `VEC-PTR a fraction is sent as round(f x 65535), halves up, and dt is rounded`

#### PTR-2

stream.open answers with initial credit; a sender never has more points outstanding than its credit; flow returns credit.

> A sender MUST NOT have more unacknowledged points outstanding than its credit.

Tests: `ST-1 stream.open needs the cursor scope and answers {ch, credit} with the credit the surface offered`, `ST-2 pointer frames within credit reach the surface byte for byte; flow is relayed to the agent`, `ST-7 a sender (the agent SDK) never has more points outstanding than its credit`, `VEC-LIMITS credit is returned in batches of at least a quarter of the window`

#### PTR-3

The hub closes a stream that overruns its credit or the pointer rate, which is one budget per credential and surface across its sessions; the agent learns it from stream.close (E_RATE); empty frames without END are dropped.

Tests: `ST-3 a frame that overruns the credit is not forwarded and the hub closes the stream`, `ST-4 the hub caps points per second at policy.pointerRate and closes the stream with E_RATE`, `ST-5 a frame with no points is dropped unless it carries PTR_FLAG_END`, `ST-8 the pointer rate is one budget for all streams of a credential on a surface, across its sessions`

#### PTR-5

An agent that gives up on a pointer stream, for example because no credit arrived in time, still sends stream.close for it.

> MUST still send `stream.close` for it

Tests: `ST-9 a sender (the agent SDK) that gives up on a stream for lack of credit still sends stream.close`

#### PTR-4

Playback speeds up with lag up to 4x.

Tests: `VEC-LIMITS playbackRate follows the catch-up curve`

## Section 12: Policy

[Read section 12 of the specification](../reference/specification.md#12-policy).

#### POL-1

The three profiles match the section 12 table, defaults included.

Tests: `VEC-POLICY each profile matches the section 12 table`, `VEC-POLICY decideAction uses the risk tier of each profile`, `VEC-POLICY each profile has the remembered approvals, timeouts, rates and pointer rate of the section 12 table`, `VEC-POLICY each profile offers the levels and the panel of the section 12 table`

#### POL-2

decideAction: exact override, then longest prefix, then risk tier; the stricter decision wins.

Tests: `VEC-POLICY overrides: exact name, then longest prefix, then risk`, `VEC-POLICY stricter orders allow < confirm < deny`, `S14.6 the surface applies its own policy even when the hub forwards without c:1`

#### POL-3

Consent prompts: one per agent, four in total (E_BUSY); unanswered is a refusal; arguments over 40 entries, depth 4 or 2000 code points are E_TOO_LARGE; remember: session covers the action name with any arguments.

Tests: `SF-CON-1 one pending prompt per agent: a second prompt for the same agent is E_BUSY`, `SF-CON-2 at most four prompts in total: a fifth agent is E_BUSY`, `SF-CON-3 an unanswered prompt is a refusal after consent.timeoutMs`, `SF-CON-4 arguments that cannot be shown in full (more than 40 entries) are not put to the person: E_TOO_LARGE`, `SF-ACT-6 with remember: session an approved action is not asked again under the same grant, unless c:1`, `SF-CON-7 the prompt shows arguments in full: a listing over 2000 code points or nesting deeper than 4 is E_TOO_LARGE`, `SF-ACT-8 with remember: session one approval covers the action name with any arguments`

#### POL-4

Human control: indicator, Pause, Stop revokes the grant with evt grant revoked.

Tests: `SF-CTL-1 while paused every method outside the read-only set fails with E_PAUSED`, `SF-CTL-2 Stop revokes the grant: the surface sends evt grant {kind:"revoked"} and later requests are E_NOT_ATTACHED`, `S14.11 while an agent is attached an indicator names it, and Stop works without the hub`

#### POL-5

Cool-off: after a refusal or timeout the same agent is refused with E_RATE, 2 s doubling to 60 s; three refusals in a row revoke the grant; later attaches need approval.

Tests: `SF-CON-6 after a refusal the same agent is refused with E_RATE for a cool-off; three refusals in a row revoke its grant, and later attaches need approval`

#### POL-6

A driver in a page inside a frame does not connect to a hub: connect() fails with E_DENIED before anything is sent or shown, unless policy.framed; no profile sets it.

> MUST NOT connect to a hub unless the app's policy sets `framed: true`

Tests: `SF-FRAME-1 a driver inside a frame does not connect: connect() is E_DENIED, no hello is sent and nothing is added to the page`, `SF-FRAME-2 with policy.framed a driver inside a frame connects and serves an agent`, `VEC-POLICY each profile matches the section 12 table`

#### LV-1

A grant has a level, one of strict, ask, auto and bypass, and a grant starts at ask, or at strict where the person's strict for that agent was kept (LV-27).

Tests: `LV-1 a grant starts at the level ask: a sensitive action asks, a safe one runs, and the indicator shows no level`, `VEC-LEVELS the levels are strict, ask, auto and bypass, least permissive first, and a grant starts at ask`

#### LV-2

strict and ask are on offer for every grant; auto and bypass where the surface policy and the hub policy both list them. A surface that got no list offers strict and ask alone, never puts a grant at a level that is not on offer, and the hub takes strict and ask whatever its policy lists.

> A surface MUST NOT put a grant at a level that is not on offer for it.

Tests: `LV-2 strict and ask are always on offer; auto and bypass only where the policy and the hub's attach list both name them`, `LV-2 the hub takes strict and ask whatever its policy lists: neither lets an agent do more`, `VEC-LEVELS the levels on offer are strict and ask, and auto and bypass where both lists name them`

#### LV-3

An act request is decided by the six steps of section 12 (decideAct): deny is final, strict asks every time, auto waives a prompt unless the action is dangerous, bypass waives every prompt, and c:1 counts as a policy confirm.

> surface MUST use it or match it exactly

Tests: `VEC-LEVELS decideAct reproduces every row of the decision table`, `VEC-LEVELS c:1 makes the policy decision confirm at least, and deny stays deny`, `LV-3 the level decides an act request: strict asks every time, auto asks only for a dangerous action, bypass never asks, and deny stays E_DENIED`, `LV-3 a request carrying c:1 asks under strict and ask, and auto and bypass waive it as they waive a policy confirm`

#### LV-4

The person's rule for one action: deny is E_CONSENT without a prompt or cool-off, a rule beats the level, and allow for an action the policy asks about can be set only where a level on offer would waive the same prompt; where it cannot, the panel shows Allow switched off and says why.

Tests: `LV-4 the person's rules: deny is E_CONSENT without a prompt, confirm asks under bypass, allow runs under strict, and allow cannot be set where no level on offer would waive the prompt`, `VEC-LEVELS the rule allow may waive a policy prompt only where a level on offer would`

#### LV-5

A waived prompt is not an approval: the action does not run while a consent prompt is showing or queued (E_BUSY) and is not remembered.

> MUST NOT run while a consent prompt is showing or queued

Tests: `LV-5 an action a level let through does not run while a consent prompt is showing or queued (E_BUSY), and is not remembered as approved`

#### LV-7

The panel opens and closes on trusted input alone; no protocol message reaches it, and a level, a rule or a scope switch changes only on trusted input from the person. Without human.panel there is no panel.

> A surface MUST NOT change a grant's level, a rule or a scope switch except on trusted input from the person on its own controls.

Tests: `LV-7 no method, event or untrusted input opens the panel or changes a level, a rule or a scope switch`, `LV-7 a policy without human.panel has no panel: the indicator holds no opening button`

#### LV-8

Whatever lets an action run without asking takes a confirm step that names the agent and what stops asking, armed after 500 ms: auto or bypass above the current level, any level under which an action stops asking, the rule allow always, and Reset where the action would then run unasked. What asks more applies at once; the indicator shows a level that is not ask.

> the indicator MUST show that level
>
> A surface MUST show a confirm step, and apply the change only when the person confirms it there

Tests: `LV-8 whatever lets an action run without asking takes a confirm step that names the agent and what stops asking, armed after 500 ms; what asks more applies at once`, `LV-8 the indicator shows a level that is not ask: a chip with its name and the dot class for auto and bypass`

#### LV-12

The activity list holds times, agent names, method or declared action names and outcomes, never arguments, results or page text.

> The activity list MUST NOT hold arguments, results or page text.

Tests: `LV-12 the activity list holds method and action names and outcomes, never arguments, results or page text`

#### LV-13

The surface reports each change to the hub with ag: evt user {kind:"level"}, evt user {kind:"rule"} and evt grant {kind:"scopes"}.

Tests: `LV-13 the surface reports each change with ag: evt user {kind:"level"}, evt user {kind:"rule"} and evt grant {kind:"scopes"}`

#### LV-16

A remembered approval is shown in the panel as what it is: the action is allowed, because the person approved it earlier. Reset takes the person's rule and the approval away, choosing Ask forgets the approval, and Reset takes the confirm step where the action would then run without asking.

> The panel MUST NOT show an action as asking while an approval the surface remembers would let it run

Tests: `LV-16 Reset takes away the person's rule and a remembered approval, and takes the confirm step where the action would then run without asking`

#### LV-17

When what is under the pointer changes other than by the click the person is making (the list changed, a consent card or its backdrop went away, a confirm step opened or was answered), controls that let an agent do more ignore activation for 500 ms.

Tests: `LV-17 when a consent card goes away or a confirm step is answered, controls that let an agent do more take no click for 500 ms`

#### LV-18

While the overlay cannot be relied on, no click is taken on Allow or Always allow of a prompt nor on a control of the panel that lets an agent do more; the person is told once it can be relied on again, and every arming delay starts over.

> a surface MUST NOT take a click on Allow or "Always allow" of a prompt

Tests: `LV-18 while the overlay cannot be relied on nothing that lets an agent do more takes a click and no prompt is answered with Allow; the person is told once it can`

#### LV-19

While a rule allow of the person waives a prompt, the indicator shows it: a chip that counts those rules and the dot of the level that would waive the same.

> the indicator MUST show that too

Tests: `LV-19 the indicator shows the person's Allow rules that waive a prompt like the level that would do the same`

#### LV-20

Wherever the overlay names an agent in words of its own (a prompt, a confirm step, a heading, the indicator, the activity list), the name is shown inside quotation marks, with quotation marks in the name escaped, followed by its session id.

> agent's name MUST be shown inside quotation marks

Tests: `LV-20 an agent is named in quotation marks with its session id wherever a decision is asked`, `LV-12 the activity list holds method and action names and outcomes, never arguments, results or page text`

#### LV-23

A consent prompt takes the focus onto itself, the dialog, where no key presses anything, and gives it back to where the person was, in the page or in the overlay; a pointer click on Deny is taken at once.

Tests: `LV-23 a consent prompt takes the focus onto the card itself and gives it back to where the person was; a pointer click on Deny is taken at once, a key only as LV-29 says`

#### LV-24

The overlay's stylesheet reads no custom property and names only generic font families; the host resets every property and pins direction and unicode-bidi.

> The overlay's stylesheet MUST NOT read a custom property

Tests: `LV-24 the overlay's stylesheet reads no custom property and names only generic font families, and the host pins what 'all' leaves alone`

#### LV-25

The overlay counts as not shown where the person can see and use it while its host, or outside the top layer an ancestor, has a filter, an opacity, a visibility, a clip path, a mask, a transform, a blend mode or content-visibility: hidden, while a zoom reaches it or nothing is rendered at all, while it is not last in the top layer, or while the indicator, the open panel or the prompt is covered; commands that change the page and attach then fail with E_PAUSED.

> A surface MUST treat the overlay as one that cannot be shown where the person can see and use it

Tests: `LV-25 while the page puts a filter, an opacity, a transform, a clip path, a blend mode, visibility or content-visibility on the overlay, every command that changes the page fails with E_PAUSED`, `LV-32 the host has no generated boxes and no zoom: the stylesheet takes ::before, ::after and ::marker away, and a zoom on the host or an ancestor, or a page that renders nothing, fails the check`

#### LV-29

Keys that could be typing meant for the page never answer a prompt. A key answers only as Enter or Space on a focused button of the prompt, or Escape, and only when it is no repeat, 500 ms have passed since the prompt appeared, since the focus landed on the button and since any other key, and 3 s since the last key that types. The prompt takes the focus itself, Tab does nothing in its first 500 ms, and while the keyboard is locked out the prompt says so.

> A surface MUST NOT take a key as the answer to a prompt unless it is Enter or Space on a button of the prompt that has the focus

Tests: `LV-29 keys that could be typing meant for the page never answer a prompt: Tab does nothing on a card that has only just appeared, a button answers a key only once the focus has rested on it for 500 ms with no other key, and a key that types locks the keyboard out for 3 s and the card says so`

#### LV-30

Nothing an agent drew stays on screen with a consent prompt: toasts and highlights are taken down, the cursor's label is hidden, and none can be put up while the prompt shows.

> a surface MUST take down every toast and highlight and hide the cursor's label

Tests: `LV-30 nothing an agent drew stays on screen with a consent card: toasts and highlights are taken down, the cursor label is hidden, and none can be put up while the card is there`

#### LV-31

A string an agent or the hub wrote shows at most two combining marks in a row; the rest are escapes, which count toward what fits on a card, and each line of the argument listing is clipped to its own box.

> a surface MUST show every combining mark

Tests: `LV-31 a string an agent wrote shows at most two combining marks in a row: the rest are escapes, so no argument paints over another, and each line of the listing is clipped to its own box`

#### LV-32

The overlay's stylesheet takes the host's ::before, ::after and ::marker away and keeps its ::backdrop from showing, so that the page can put no box of its own on the host.

> The overlay's stylesheet MUST take the host's `::before`, `::after` and `::marker` away

Tests: `LV-32 the host has no generated boxes and no zoom: the stylesheet takes ::before, ::after and ::marker away, and a zoom on the host or an ancestor, or a page that renders nothing, fails the check`

#### LV-34

No timer has to fire: every wait of the surface is a time, checked by the clock when something looks. A prompt past its deadline is a refusal whether or not its timer fired, arming delays and the cool-off hold by the clock, and a timer that never fires leaves at most something on screen.

> A surface MUST NOT rely on a timer callback for any of them

Tests: `LV-34 with every timer of the surface cleared, a prompt past its deadline is a refusal when the person clicks it and when the next request asks, Allow and a confirm step arm by the clock and no earlier, and the cool-off still holds`

#### LV-35

A check that had to put the overlay back (show it again in the top layer, or move it) found it covered or out of place: the click that caused it is not taken as one that lets an agent do more; a later, separate click counts.

> A surface MUST NOT take that click as one that lets an agent do more

Tests: `LV-35 the click that finds the overlay under a top-layer element of the page is not taken, on a prompt or in the panel: the overlay goes back on top, says so, arms again, and a later click counts`

#### LV-36

Letting agents hear each other is a change that lets agents do more: neither the switch nor its confirm step is taken while the overlay cannot be relied on. A hub that sends another chatRelay with a later attach does not clear the person's switch silently: the surface reports relay off for each agent and the Chat tab says so.

Tests: `LV-36 letting agents hear each other is not taken while the overlay cannot be relied on, and a hub that sends another chatRelay does not clear the person's switch silently`

#### LV-37

While the app's own code runs because an agent asked for it (an action's handler, a view's renderer, a state getter, the handlers of synthesised input), the chat composer takes no input.

Tests: `LV-37 while the app's own code runs because an agent asked for it, the chat composer takes no input: a view, a state getter and the handlers of synthesised input, as an action`

#### CH-6

An agent is given only messages posted while its grant was live and its chat scope on, and only those sent to it; a grant that replaces another reads nothing of the earlier one.

> A surface MUST NOT give an agent, in `evt chat` or in `chat.read`, a message that was posted before its grant began

Tests: `CH-6 an agent is given only what was posted while its grant was live and its chat scope on, and only what was sent to it; a grant that replaces another reads nothing of the old one`

#### CH-8

Agent text is data: inserted as text, escaped like agent-written strings on the consent prompt, captioned with the name from the grant, never made into markup or a link.

> A surface MUST insert what an agent wrote as text, never as markup

Tests: `CH-8 what an agent wrote is inserted as text under the name from its grant: no markup, no link, and what does not show is escaped`

#### CH-9

A chat message grants nothing: it changes no level, rule or scope switch and answers no consent prompt; an action that needs approval still asks after the person typed yes.

> A chat message MUST NOT change a grant's level, a rule or a scope switch, and MUST NOT answer, waive or withdraw a consent prompt

Tests: `CH-9 a chat message grants nothing: after the person typed "yes, go ahead" an action that needs approval still asks, and level, rules and scopes are what they were`

#### CH-11

Unread messages of agents are counted on the Chat tab and in the indicator; the panel never opens by itself; a message that arrives redraws nothing outside the Chat tab, arms no control again and moves no focus.

Tests: `CH-11 unread messages are counted on the Chat tab and in the indicator; the panel never opens by itself, and a message that arrives redraws nothing in the Permissions tab and moves no focus`

#### CH-17

Under chatRelay person no agent hears another until the person switches "Agents can hear each other" on in the Chat tab: on trusted input, through a confirm step that names the agents and is armed after 500 ms. An agent that joins later is not included until the person adds it, switching off applies at once, and the surface reports each change with ag as evt user {kind:"relay", on}.

> A surface MUST NOT let one agent hear another under `person` except on that input from the person

Tests: `CH-17 under chatRelay person no agent hears another until the person switches it on: by trusted input, through a confirm step that names the agents and is armed after 500 ms; one that joins later is not included, and switching off applies at once`

#### CH-18

The Chat tab always says who hears what: which agents hear the person only and which hear each other, each by name, and under on that the app is set up that way.

> the Chat tab MUST say which agents hear the person only and which hear each other

Tests: `CH-18 the Chat tab says which agents hear the person only and which hear each other, naming each, and under on that the app is set up that way`

#### CH-19

While a consent prompt is showing or queued the Chat tab shows nothing an agent wrote: no transcript, no status, no agent's name, only a line of the surface's own; what the agents said they were doing is dropped.

> a surface MUST NOT show in its Chat tab anything an agent wrote

Tests: `CH-19 while a consent prompt is showing or queued the Chat tab shows nothing an agent wrote: no transcript, no status, no name; what the agents said they were doing does not come back`, `CH-10 chat.say and chat.status work while control is paused; while a consent prompt is up they are E_BUSY, nothing can be typed or sent and chat.read still answers`

#### CH-27

Wherever the Chat tab names an agent it names it as what it is, with its name in quotation marks and its session id, so that no name reads as the person or as the tab's own words and two agents with one name differ; what an agent says it is doing is quoted as that agent's words.

Tests: `CH-27 an agent is named as what it is, with its name in quotation marks and its session id, wherever the tab names it; what it says it is doing is quoted as its words`

#### WT-2

One entry for one request: the same agent session asking for the same action with arguments equal as canonical JSON (or the same attach) is shown no prompt and gets E_WAITING again with the same ticket and the time left.

> A surface MUST NOT show a prompt for such a request

Tests: `WT-2 the same request from the same agent shows no second prompt and gets the same ticket and the time left; other arguments are another request`, `VEC-CONSENT two act requests are the same request when the action is the same and the arguments are equal as canonical JSON`

#### WT-3

The list is bounded: an entry lasts consent.waitMs by the clock and its end is told as expired; at most 3 requests of one agent and 12 in all; a request that cannot wait (the list is full, or the agent's own link speaks 0.1) has no Later on its prompt and ends as E_CONSENT.

Tests: `WT-3 the list is bounded: an entry ends by the clock with the answer expired, and where a request cannot wait its prompt has no Later and ends as E_CONSENT`

#### WT-4

The person answers in the panel: Review opens the prompt again as it was asked, under every rule of a prompt; Allow approves, Deny and Discard refuse; the agent is told with evt user {kind:'answer', tk, answer, a?}, and after an approval the person is told that the agent is told and when the request goes ahead.

Tests: `WT-4 Review opens the prompt again as it was asked; Allow tells the agent with evt user answer allow and the person that the agent is told; Deny and Discard tell it deny`

#### WT-6

A ticket that is unknown, used, expired or another agent's names nothing: the request is handled as if it carried none.

> a surface MUST handle such a request as if it carried no ticket

Tests: `WT-6 a ticket that is unknown, another agent's, or for other arguments names nothing: the request is handled as if it carried none`

#### WT-8

Not answered is not refused: a prompt nobody answered and one put off move the cool-off as a timeout does and never count toward the three refusals. There is no list on a hub that speaks 0.1, with an app's own consent handler, without the panel, or with consent.waitMs 0.

Tests: `WT-8 not answered is not refused: Later moves the cool-off as a timeout does and revokes nothing; and there is no list on a hub that speaks 0.1, with an app's own consent handler, without the panel or with consent.waitMs 0`

#### OF-1

Offers at attach: the attach prompt lists the actions human.offer names, each with a box that is not ticked, and only where the person could set the rule allow in the panel (offeredActions); what the person tightened before is left out, and the prompt says so.

> A surface MUST NOT show a box ticked

Tests: `OF-1 the attach prompt offers the actions the policy names, each unticked, only where the rule allow could be set in the panel; what the person tightened before is left out and the prompt says so`, `VEC-CONSENT offeredActions offers what the rule allow could be set for, and nothing the person tightened before`

#### OF-2

A tick alone changes nothing: with a box ticked Allow opens a second step that names the agent and exactly the ticked actions, and only its button, armed anew, grants.

Tests: `OF-2 a tick alone changes nothing: with a box ticked Allow opens a second step that names exactly the ticked actions, and only its button, armed anew, grants`

#### RT-1

A rule allow for a time (human.allowMs): the confirm step offers until the agent disconnects (preselected) or the time; the rule is reported with ms, shown with when it ends, and ends by the clock, reported as d null.

> a surface MUST NOT let an action run on a rule `allow` whose time is up

Tests: `RT-1 a rule allow for a time is reported with ms, shown with when it ends, and ends by the clock: past its time the action asks again and the hub is told d null`

#### RC-1

The rate cap (human.burst): at most max runs of one action by one agent whose prompt was waived, within perMs (burstStep); a further call asks, saying how often and why in the surface's own words, with no Always allow, and Allow starts the count again.

Tests: `RC-1 at most max runs whose prompt was waived go unasked within perMs; the next call asks with the count in the surface's own words and no Always allow, and Allow starts the count again`, `VEC-CONSENT burstStep reproduces every row of the rate cap`

#### AD-1

After a refused action the surface shows a notice of its own with one click to block the action for that agent and, where the agent may chat, a way into the Chat tab; it is no dialog, has no text field, goes by itself and is taken down when a prompt comes up.

Tests: `AD-1 after a refused action a notice offers one click to block it for that agent and, where the agent may chat, a way into the Chat tab; it asks nothing, has no text field, and a prompt that comes up takes it down`

#### OF-4

What the person tightened wins over an offer at every moment: a rule allow from an offer is never set for an action the person set to confirm or deny, on the grant or kept for the agent, and never takes such a rule away; an offer approved in the waiting list before the person set the rule leaves the rule as it is, and the activity list says so.

> a surface MUST NOT set a rule `allow` from an offer for an action the person has set to `confirm` or `deny`

Tests: `OF-4 an offer the person ticked and approved in the waiting list sets no rule allow for an action they set to Block or Ask before the ticket was used: the Block stays, is kept, and the activity list says why`

#### WT-9

A prompt the agent withdraws itself (its session left, or it attached again) moves the cool-off like a timeout and counts as no refusal; an agent's entries in the waiting list end with its grant, a replacing attach included, and the agent is told expired for each.

Tests: `WT-9 a prompt the agent withdraws moves the cool-off like a timeout; an agent's entries end with its grant, a replacing attach included, and the agent is told expired`

## Sections 8, 12

This requirement spans several sections of [the specification](../reference/specification.md).

#### LV-6

What lets an agent do more ends with the grant: the levels auto and bypass, a rule allow and a remembered approval. A new grant, also one that replaces another, has none of them. (What the person tightened stays: LV-27.)

> A surface MUST NOT carry the level `auto` or `bypass`, a rule `allow` or a remembered approval from one grant over to another.

Tests: `LV-6 what lets an agent do more ends with the grant: after a replacing attach, a detach and Stop the level is ask again, no rule allows and no approval is remembered`, `LV-6 a grant that replaces another starts clean at the hub: every granted scope is on again`

#### LV-15

The hub says in attach what its policy decides for each action (decisions). The surface reasons from the stricter of its own decision and the hub's, takes a missing or malformed decision as confirm, and holds the hub to what it said.

> a surface MUST take the stricter of its own policy's decision and the hub's

Tests: `LV-15 the surface reasons from the stricter of its own decision and the hub's, sent in attach as decisions; a hub that sends none may confirm anything`, `VEC-LEVELS the hub's decision for an action is read from 'decisions'; anything missing or malformed is confirm`

#### CH-1

The chat scope: open and guarded grant it, kiosk does not; a surface without the panel grants none; without the scope every chat method is E_SCOPE, at the surface and at the hub.

Tests: `CH-1 a grant holds chat only where the policy grants it and the page has a panel: open and guarded do, kiosk and a surface without the panel do not, and without the scope every chat method is E_SCOPE`, `CH-1 the hub grants the chat scope under open and guarded and not under kiosk; without it the chat methods are E_SCOPE and nothing is forwarded`, `VEC-SCOPE scopes are in canonical order`, `VEC-SCOPE every method maps to the scope in the section 9 table`, `VEC-POLICY each profile matches the section 12 table`

#### CT-3

detach for an agent withdraws its pending request, also one the app's own consent handler is still asking about: an answer given afterwards attaches nobody and runs nothing.

Tests: `CT-3 detach withdraws a request the app's own consent handler is still asking about: a yes afterwards attaches nobody`

#### WT-7

A request to connect can wait: nothing is granted, the indicator is shown for it alone and says that an agent is waiting to connect, and after the person approved it the agent's next attach with the same scopes, the same credential and the ticket is granted without a prompt, once. detach from the hub drops what waits for an agent.

Tests: `WT-7 a request to connect waits too: with nobody attached the indicator says that an agent is waiting to connect, and the approved ticket attaches the same credential without a prompt`

#### OF-3

The grant starts with the rule allow for each ticked action, set as if in the panel and reported with evt user {kind:'rule'} once the hub has the attach answer; no action runs under such a rule before the report was sent.

> a surface MUST NOT let an action run under such a rule before

Tests: `OF-3 the grant starts with the rule allow for each ticked action, reported with a rule event after the attach answer and before any action runs under it`

## Sections 8, 13

This requirement spans several sections of [the specification](../reference/specification.md).

#### LV-10

The hub sends its policy's human.levels and, as decisions, what its policy decides for each action of the surface in attach, and ends a grant whose surface reports auto or bypass beyond what that policy offers: detach {why:"hub"}, evt grant revoked, both recorded.

> The hub MUST end the grant when the surface reports the level `auto` or `bypass`

Tests: `LV-10 the hub sends its policy's human.levels to the surface in attach`, `LV-10 the hub sends what its policy decides for each action of the surface in attach, and acts as it said`, `LV-10 the hub ends the grant when the surface reports auto or bypass that its policy does not offer: detach {why:"hub"}, evt grant revoked, both recorded`

#### LV-27

What the person tightened stays with the agent for as long as the page lives: the level strict, the rules confirm and deny, the scopes switched off are put on every new grant of the same agent (the same credential id), whatever its session id or name, and no call of the agent takes them away. The surface says so in its attach answer (kept), and the hub starts the grant with it and reads nothing from it that lets an agent do more.

> A surface MUST keep them for as long as the page lives
>
> The hub MUST NOT read anything else from it

Tests: `LV-27 what the person tightened stays for the next grant of the same agent, under whatever session id and name: Strict, the rules confirm and deny, the scopes switched off; the attach answer says so; what they lift themselves does not stay`, `LV-27 the hub sends the id of the agent's credential in attach, and starts a grant with what the surface answers as kept: Strict, the rules confirm and deny, scopes switched off; never with anything that lets the agent do more`

## Sections 6, 13

This requirement spans several sections of [the specification](../reference/specification.md).

#### LV-11

Level and rule reports are checked, recorded as person records and told to the named agent alone, built from the checked values; malformed reports and grant events of an unknown kind are dropped. A rule allow that the hub's policy would not let waive anything is recorded as refused and neither kept nor told to the agent, and the grant goes on.

> The hub MUST NOT keep such a rule or tell the agent of it.

Tests: `LV-11 a rule allow the hub's policy would not let waive anything is recorded as refused and neither kept nor relayed; the grant goes on`, `LV-11 level and rule reports reach the named agent alone, built from the checked values, and are recorded`, `LV-11 malformed reports, reports without ag and grant events of an unknown kind are dropped and not relayed`

#### CH-12

The hub relays a chat event only to the grant its ag names, while that grant is live and holds chat, built from the checked fields; an agent's message only where the hub's policy lets that agent hear its sender, under the name the hub gave its sender, never back to it; an agent cannot send one.

> The hub MUST relay a `chat` event only to the grant its `ag` names

Tests: `CH-12 the hub relays a chat event only to the grant its ag names, with s, built from the checked fields; without ag, or naming a grant the surface does not hold, it is dropped`, `CH-12 a chat event reaches only a live grant that holds chat: not one attached without the scope, with the scope switched off, or ended`, `CH-12 an agent's message is relayed with the name the hub gave its sender, never back to the sender, and not at all when the hub policy's chatRelay is off`, `CH-12 an agent cannot send a chat event, and a malformed message or one addressed to another agent is dropped`

## Section 15: Reference implementation

[Read section 15 of the specification](../reference/specification.md#15-reference-implementation).

#### LV-14

The MCP adapter tells what the person set as notices: lines starting "[reins] " at the start of the next tool result, before any page-data marker, in the adapter's own words. The name of an action is a word the page chose and never appears in a notice: which actions the rules are for is listed last, as page data.

Tests: `LV-14 what the person set reaches the model as a notice at the start of the next tool result, before the page-data marker`, `LV-14 the name of an action never appears in a notice: which action a rule is for comes last, as page data`

#### CH-15

The MCP adapter's reins_chat: say, status, read and wait (90 s by default, 150 s at most, early when the grant ends); each message under a line of the adapter that says who spoke, its text behind "| ", under a first line that names the page, the surface and whether the hub verified the page; unread chat announced as a notice with a count and no text.

Tests: `CH-15 reins_chat is the ninth tool: say, status and read reach the page, and wait hands over what is unread, each message under a line that says who spoke with its text behind "| "`, `CH-15 reins_chat wait answers "no new messages" after its timeout, 90 s by default and 150 s at most, returns as soon as a message comes, and returns early when the grant ends`, `CH-15 unread chat is announced as a notice ahead of the page data: a count in the adapter's words, never the text`

#### CH-16

reins-tools chat-serve runs a command once for each message of the person: the message on standard input and nowhere else, under a line of the runner's with its text behind "| ", the argument array started without a shell, the output posted as the reply.

Tests: `CH-16 chat-serve gives each message of the person to the command on standard input, started from its argument array without a shell, and posts what it prints`

#### CH-25

reins_chat loses nothing and leaks nothing: read takes off the waiting list only what it showed, a wait whose request was cancelled takes no message, an answer to a message that was for this agent alone goes to the person alone unless the model names someone, and a chat text reaches the model on "| " lines cut at every line break and separator with no control character left raw.

Tests: `CH-25 reins_chat read takes off the waiting list only what it showed, a wait whose request was cancelled takes no message, what was asked in private is answered to the person alone, and no control character of a text reaches the model raw`, `VEC-CHAT chat text handed to a model is cut into "| " lines at every line break and separator, with no control character left raw`

#### CH-26

reins-tools chat-serve refuses to serve a page that proved no key to the hub unless --allow-unverified is given, serves the one page its first answer is about and names that surface in every call, and answers the person alone what was asked of the agent alone.

Tests: `CH-26 chat-serve refuses a page the hub did not verify unless told otherwise, serves the one page its first answer is about and names it in every call, and answers the person alone what was asked of it alone`, `CH-16 chat-serve gives each message of the person to the command on standard input, started from its argument array without a shell, and posts what it prints`

#### CH-28

Over the shell session a chat wait takes a message only for a caller that has the answer: what a caller that went away was shown is still there for the next. A wait hands over at most max messages, none for 0. An answer stays for the person alone when a read shows an older message after the person asked in private.

Tests: `CH-28 over the shell session a chat wait takes a message only for a caller that has the answer; wait hands over as many as were asked for; and a read that shows an older message leaves a private question private`

#### CH-29

chat-serve settles which file it runs before it takes a message, looks for a bare name in the folders of PATH and never in the working directory, and says which file it is; it takes one message at a time; a run is over only when what the command started has gone, also when the command exited by itself.

Tests: `CH-29 chat-serve settles which file it runs before it takes a message and says so, takes one message at a time, and a run is over only when what the command started has gone`

#### MCP-1

The MCP server negotiates a protocol version in initialize.

Tests: `MCP-1 initialize answers with the protocol version the client asked for when it supports it`, `MCP-2 initialize with an unknown protocol version answers with a version the server speaks`

#### MCP-2

Ten tools with valid input schemas and annotations.

Tests: `MCP-3 tools/list returns exactly the ten tools with object input schemas and annotations`

#### MCP-3

The scopes the server was started with are a ceiling.

Tests: `MCP-4 the scopes the server was started with are a ceiling for reins_attach`

#### MCP-4

Only reins_attach attaches; every other tool answers E_NOT_ATTACHED on a surface that is not attached.

Tests: `MCP-5 only reins_attach attaches: other tools answer E_NOT_ATTACHED on a surface that is not attached`

#### MCP-5

In reins_batch page text sits on lines behind "| ", apart from the step results.

Tests: `MCP-6 in reins_batch page text sits on lines behind "| ", apart from the step results; the listing marks verified surfaces`

#### MCP-6

reins_read returns the text of an element or of the page, or app state, as page data: every line of it behind "| ", and a line the adapter adds (the text was cut) after them.

Tests: `MCP-7 reins_read returns the text of an element or of the page, and app state, as page data on lines behind "| "; a line the adapter adds comes after them`

#### MCP-7

A line of the surface listing gives what the hub knows first, in a fixed order (the surface id, verified or unverified, the origin, attached), and what the page says of itself last, with the app's name in quotes; reins_attach says in a line of its own, before the page-data marker, which surface it is, whether the hub verified the page and which scopes the grant has.

Tests: `MCP-8 a surface listing gives what the hub knows first and says unverified where that is so, and what the page says of itself last with its name in quotes; reins_attach says in a line of its own which surface it is`

#### MCP-8

Text a page supplied reaches the model by one rule in every tool, alone and in a batch: on lines behind "| ", a new line at every line break and at U+001C to U+001E, every other control character but tab written as an escape; reins_read cuts at the length that was asked for, whatever the surface sent, and says so.

Tests: `MCP-9 every text a page supplied reaches the model by one rule: on lines behind "| " cut at every line break and separator, with no control character left raw, in every tool alone and in a batch, and cut by the adapter at the length that was asked for`

#### EL-5

reins-electron refuses a debugging port that is not on a loopback address, before it connects.

> `reins-electron` MUST refuse a debugging port that is not on a loopback address

Tests: `EL-5 a debugging port that is not on a loopback address is refused before any connection`

#### EL-6

An adopted app's driver runs in a world of its own in every new document, and the function that carries its frames is added to that world only.

> MUST be added to that world only

Tests: `EL-6 the driver's script and the function that carries its frames are put in a world of their own, in every new document`

#### EL-7

electronLink takes a port only from a message its own window posted for its own request; frames cross the port unchanged and the link ends with the document.

Tests: `EL-7 the page takes a port only from a message its own window posted for its own request, and the link ends with the document`

#### EL-8

An adopted page runs under the guarded profile and offers the person no level that loosens (auto, bypass) unless whoever adopted it listed it, and then only where the hub offers it too.

Tests: `EL-8 an adopted page runs under the guarded profile and offers the person no level that loosens, unless whoever adopted it listed levels`

#### EL-11

When the command stops, every driver it loaded is told to disconnect for good, whatever carries its frames; a document that no longer hears the command stops its driver by itself.

> it MUST tell every driver it loaded to disconnect for good
>
> MUST stop its driver by itself

Tests: `EL-11 when the command stops, every driver it loaded is told to stop for good, also one that has a socket of its own; the script is taken out of documents to come`, `EL-11 a document that is told to stop ends its driver for good and connects no more`, `EL-11 a document that no longer hears the command asks once, and then stops by itself`

#### EL-12

The injector takes calls only from the worlds it made, which are named afresh for each run; it asks --match of every document, gives a document another link after the broker closed one, and prints origins, not URLs.

> the command MUST ignore a call of that function from any context it did not see created as that world

Tests: `EL-6 the driver's script and the function that carries its frames are put in a world of their own, in every new document`, `EL-12 the injector goes by the document, not the tab: --match is asked for every document, a closed link is replaced, and what it logs is an origin`

#### EL-13

reins-electron dials a hub only on a loopback address.

> MUST NOT dial a hub that is not on a loopback address

Tests: `EL-13 a hub the pages are to join is on a loopback address, or it is not dialled`

#### EL-15

The lease of an adopted document is judged by the clock when a frame arrives or is to leave: while the command has not been heard for 10 s the driver gets no frame and sends none, whether or not any timer of the document fires.

> it MUST NOT hand its driver a frame or send one of the driver's

Tests: `EL-15 no timer has to fire: with every timer of the lease dead, a frame that arrives after the lease ran out is not handed to the driver, and the next one after the command stayed silent stops the driver for good`, `EL-15 a command that answers in time loses nothing: frames that waited while it was asked are handed on, in order`

#### EL-17

With --debug-port the app is the browser behind the port: the end of the process the command started is not the end of the app, and the command, or its watcher when it was killed, closes that browser over the port and asks the port again.

> MUST NOT take the end of the process it started for the end of the app

Tests: `EL-17 with --debug-port the app is the browser behind the port: a starter that leaves does not end the command, and the command closes that browser over the port when it stops`, `EL-17 an app that does not close when asked over its port is said to be still there, and the command ends with 1; a port that already answers is refused, and the browser behind it is left alone`, `EL-17 the watcher learns that the command is gone from its input, not from a process id: it then closes the browser behind the port, and an instance of the same app that comes up after it, and leaves another browser alone`, `EL-17 a watcher whose app does not close says so, and a watcher that was never told which browser it is closes the one on the port it was given`

#### EL-18

--match names an origin, or a URL and what lies under it, compared as URLs: a document does not match because its URL contains the text.

> a document MUST NOT match because its URL contains the text of the pattern

Tests: `EL-18 --match names an origin, or a URL and what lies under it: a document does not match because its URL contains the text`

## Section 13: Hub behaviour

[Read section 13 of the specification](../reference/specification.md#13-hub-behaviour).

#### LV-22

A change of what the person set is always recorded. Reports that change nothing are recorded at most 20 a second per surface and never told to the agent, and a grant whose surface reports more than 20 changes within one second is ended.

> The hub MUST record every change, whatever else the surface sent in the same second.

Tests: `LV-22 a change of what the person set is always recorded; repeats are recorded at most 20 a second per surface and never relayed; a grant that reports more than 20 changes in a second is ended`

#### LV-33

Fail closed: while the audit log cannot be written, a reported change that lets an agent do or hear more ends the grant, a change that only tightens is taken, and no chat message is relayed.

> The hub MUST end the grant when it cannot record such a change

Tests: `LV-33 while the audit log cannot be written, a report that lets an agent do more ends the grant, and one that only tightens is taken`

#### CH-14

Chat in the audit log: chat.say is an audited request recorded with the digest of {text} as the room keeps it (with to when it has one) and its length, whatever else the agent sent; a message of the person is a person record for each agent it is relayed to, with a digest of the same shape; the text is never written.

> The text of a chat message MUST NOT be written to the audit log

Tests: `CH-14 chat.say is audited with a digest and the length, accepted before it is forwarded; a relayed message of the person is a person record; the text is never in the log`, `VEC-CHAT the audit digest of a chat text covers the canonical JSON of {text}, with to when it has one, and nothing else an agent sent`

#### CH-24

What the person switched for one agent in the chat reaches the hub as evt user {kind:"relay", on} with ag: recorded as a person record (method relay, value on or off) and told to that agent alone; a malformed or repeated report changes nothing, and under a hub policy of off a report of on is recorded as refused and nothing is relayed.

Tests: `CH-24 what the person switched for one agent is recorded as a person record and told to that agent alone; a malformed or repeated report changes nothing, and under off a report of on is recorded as refused`

#### HUB-1

One token bucket per credential, surface and scope, shared by its sessions; hub.info and surfaces.list share a bucket per credential (10/s, burst 20); over a limit E_RATE.

Tests: `RL-1 requests over policy.rates for a scope fail with E_RATE and do not reach the surface`, `RL-2 the rate bucket is shared by all of a credential's sessions`, `RL-3 hub.info and surfaces.list share one bucket per credential: 10 a second, burst 20`

#### HUB-2

Capacity: 64 surfaces, 32 agents, 4 sessions per credential, 8 streams per agent; beyond that E_BUSY.

Tests: `CAP-1 a credential holds at most 4 sessions by default; the fifth is refused with E_BUSY`, `CAP-2 the hub holds at most 64 surfaces by default; the next is refused with E_BUSY`, `CAP-3 an agent may hold 8 open streams; the next is E_BUSY`

#### HUB-3

Without a live observe grant the SurfaceInfo is reduced; changed events go only to grant holders; hub.info counts only what the agent may see.

Tests: `GR-15 without a live observe grant an agent sees the origin as url and the app name as title`, `GR-16 evt surface changed goes only to agents holding a grant on that surface`, `GR-19 hub.info counts only the surfaces an agent may attach to and only its own credential's sessions`

#### HUB-4

Audit: records for connections, attach, detach, grant end, refusals and audited requests (act, ui.*, nav.*, show.view, show.toast, show.highlight, stream.open, surface.attach); accepted before forwarding; args as a digest, an HMAC under the audit key.

Tests: `AU-1 an audited request is recorded as accepted before it is forwarded, and its outcome refers to that record`, `AU-2 arguments are logged as the SHA-256 of their canonical JSON, never in clear`, `AU-3 the audit records connections, attach, detach, grant end and refused requests`, `AU-6 with an audit key args is HMAC-SHA256(auditKey, canonical JSON); show.toast, show.highlight and stream.open are audited, cursor.* and show.clear are not`

#### HUB-5

Audit chain: hash over prev and canonical record, HMAC when keyed; verification fails on edits and truncation.

Tests: `AU-4 the chain verifies independently: hash = HMAC-SHA256(auditKey, prev + "\n" + canonical record without hash)`, `VEC-AUDIT verifyAuditChain accepts the unkeyed and the keyed vector chains`, `VEC-AUDIT an edited record, a wrong key or a truncated log fails verification`

#### HUB-6

Audit refusals are bounded to 20 per second per connection, the excess summarised.

Tests: `AU-5 refusal records are bounded to 20 per second per connection; the excess becomes one suppressed record`

#### HUB-7

On shutdown the hub sends bye OK to every peer.

Tests: `SH-1 on shutdown the hub sends bye {code:"OK"} to every peer`

#### HUB-8

Admission: surfaces per origin and overall, agents per credential (E_RATE); a full hub answers E_BUSY first.

Tests: `CAP-4 admissions are rate limited: surfaces per origin, agents per credential (E_RATE); a full hub answers E_BUSY first`

#### HUB-9

Malformed configuration is refused; a present but mistyped restriction never means any.

Tests: `CFG-1 malformed configuration is refused; a mistyped restriction never means "any"`

#### WH-1

The hub relays E_WAITING with {tk, ms} and nothing else of its data, keeps the ticket for that agent session and surface, forwards tk on act and surface.attach unchanged, and records the wait, the answer and the repeated request with the ticket.

Tests: `WH-1 an agent on 0.2 gets E_WAITING with {tk, ms}; the person allows it; the agent is told, repeats with the ticket, and the request runs: all of it on record`, `WH-3 an attach request waits before any grant exists: the answer reaches the agent that holds none, and the repeated attach with the ticket is granted; the surface is told v with every attach`

#### WH-2

The SDK carries a request that waits to its result or a clear error: it waits for the answer no longer than the request stays in the list (or as long as told), repeats an allowed request once with its ticket, ends a refused or lapsed one with E_CONSENT, and reports what waits.

Tests: `WH-1 an agent on 0.2 gets E_WAITING with {tk, ms}; the person allows it; the agent is told, repeats with the ticket, and the request runs: all of it on record`, `WH-2 refused, or lapsed, the waiting call ends with E_CONSENT and says which; a wait given in ms ends with the time the request has left`, `WH-3 an attach request waits before any grant exists: the answer reaches the agent that holds none, and the repeated attach with the ticket is granted; the surface is told v with every attach`

#### WH-3

A tk that is not a ticket, or not one the surface gave this agent session for this surface and this request, is E_BAD_ARGS before anything reaches the surface, in the same words for each; a ticket is forwarded once and then forgotten.

Tests: `WH-4 a ticket that is not the agent's own is refused at the hub, before anything reaches the surface: another agent's, another request's, a used, lapsed or malformed one`, `WH-6 an agent on 0.1 gets E_CONSENT for a request that waits, is given no ticket, and the surface is told v: "0.1"; a waiting attach of its is withdrawn at once; its tk is never a ticket`

#### WH-4

The hub takes an answer only for a ticket it keeps for that agent and that request, also before any grant exists, records it with the ticket, forgets the ticket unless allowed, and tells that agent alone from the checked fields; any other answer is recorded as refused or dropped.

Tests: `WH-3 an attach request waits before any grant exists: the answer reaches the agent that holds none, and the repeated attach with the ticket is granted; the surface is told v with every attach`, `WH-5 an answer is relayed to the agent the ticket was given to, from its checked fields, and recorded with the ticket; one for a ticket the hub did not give that agent, or malformed, is refused or dropped`

#### WH-5

The hub sends v, the protocol version of the agent's link, with every attach; an agent on 0.1 gets E_CONSENT for a request that waits, is given no ticket, and has a waiting attach withdrawn at once.

Tests: `WH-3 an attach request waits before any grant exists: the answer reaches the agent that holds none, and the repeated attach with the ticket is granted; the surface is told v with every attach`, `WH-6 an agent on 0.1 gets E_CONSENT for a request that waits, is given no ticket, and the surface is told v: "0.1"; a waiting attach of its is withdrawn at once; its tk is never a ticket`

#### WH-6

When an agent whose attach waits leaves the hub, and when the hub stops waiting for an attach the surface did not answer, the hub sends the surface detach {why:"hub"} for that agent; a grant the agent held there ends with evt grant revoked.

Tests: `WH-7 when an agent whose attach waits leaves, the surface is told detach {why:"hub"} for it; a grant's own end says detach {why:"agent"} instead`, `WH-8 an attach the surface does not answer within the hub wait is E_TIMEOUT, and the hub sends the surface detach {why:"hub"}; a grant the agent held there ends and the agent is told`

#### WH-7

A report of what the person set that arrives for an attach the hub is waiting on is kept and handled once the grant is recorded; a rule allow may carry ms, told and recorded with it.

Tests: `WH-9 a rule reported right behind the attach answer, with or without a time, is kept for the grant and told; a rule allow with ms is told with it`

## Sections 12, 14

This requirement spans several sections of [the specification](../reference/specification.md).

#### LV-26

The overlay acts on an event only when the browser made it for input of the person and is delivering it to the control the listener was registered on; a script that replaces addEventListener after the driver loaded is handed no listener of the overlay.

> A surface MUST NOT act on an event unless the browser made it for input of the person

Tests: `LV-26 a script that replaces addEventListener after the driver loaded finds no listener of the overlay or of the watch for the person's input: it has nothing to call, and what it dispatches moves nothing`, `LV-7 no method, event or untrusted input opens the panel or changes a level, a rule or a scope switch`

## Sections 6, 12

This requirement spans several sections of [the specification](../reference/specification.md).

#### CH-5

Who is sent a message is decided by the four rules of section 12 (chatAudience): the person to all or to one; an agent to the person alone with to person, else to the other agents that hear it; never to the speaker; each is sent as evt chat with ag.

> `chatAudience` implements it, and every surface MUST use it or match it exactly

Tests: `CH-5 a message is sent as evt chat with ag to each agent that is to hear it, never to its speaker: the person to all or to one, an agent to the others where the room relays and to nobody where it does not`, `VEC-CHAT chatAudience reproduces every row of who hears a message`, `VEC-CHAT a message off the wire is rebuilt from its checked fields, or dropped`

#### CT-1

A request's time for an answer runs from when it reached the surface, not from when its prompt is shown: a prompt that waited its turn shows for what is left, and one whose time is up before its turn is not shown.

Tests: `CT-1 a request's time runs from when it reached the surface: a prompt that waits its turn ends with the one before it and is never shown`

#### CT-2

A prompt waits no longer than the hub does: the shorter of consent.timeoutMs and the consentTimeoutMs of welcome.

> A surface MUST NOT let a prompt wait longer than

Tests: `CT-2 a prompt waits no longer than the hub: the shorter of consent.timeoutMs and the consentTimeoutMs of welcome`

## Sections 12, 15

This requirement spans several sections of [the specification](../reference/specification.md).

#### CH-7

Only the person speaks as the person: a message of the person comes from trusted input events in the composer of the Chat tab alone. No method, parameter or event posts as the person; the driver's API posts nothing and gives the app no text.

> A surface MUST NOT produce a message from the person except from trusted input events in the composer of its own Chat tab

Tests: `CH-7 only trusted input in the composer of the Chat tab makes a message of the person: no method, parameter, event or untrusted input does`, `CH-7 the driver's API tells the app that a message was posted and how long it is, never its text, and posts none; no observation returns the transcript`

#### AT-1

on('attention') reports how many prompts are showing or queued and how many requests wait, whenever either changes: two counts, nothing an agent wrote, and the driver changes nothing of the page for it.

> A surface MUST NOT put anything an agent wrote into it

Tests: `AT-1 attention reports how many prompts are up and how many requests wait, and nothing an agent wrote; the driver leaves the page title alone`

## Sections 9, 12

This requirement spans several sections of [the specification](../reference/specification.md).

#### CH-10

chat.say and chat.status are served while control is paused; while a consent prompt is showing or queued they fail with E_BUSY, nothing can be typed or sent in the Chat tab, and chat.read still answers.

Tests: `CH-10 chat.say and chat.status work while control is paused; while a consent prompt is up they are E_BUSY, nothing can be typed or sent and chat.read still answers`, `VEC-SCOPE the read-only methods, and the chat methods served while paused, are those of section 9`

#### CH-22

A message id counts, for each agent, the messages that agent may read, from 1 on each page load: an agent's ids say nothing about what was said to others, an event carries the id the message has for the agent it goes to, and the count goes on when the agent's grant is replaced.

Tests: `CH-22 message ids count each agent's own messages from 1, an event carries the id the message has for the agent it goes to, and the count goes on when a grant is replaced`

#### WT-1

Where a request can wait (0.2), a prompt nobody answered in time and one the person put off with Later join the waiting list: the answer is E_WAITING with data {tk, ms}, a ticket of at least 96 random bits and the time the request waits. Nothing ran. The indicator and the panel say that it waits, without arguments.

Tests: `WT-1 a prompt the person put off with Later, and one nobody answered, join the waiting list: E_WAITING with a ticket and the time it waits in data, nothing ran, and the indicator and the panel say that it waits without its arguments`, `VEC-CONSENT each profile has the waiting time, the time limit of a rule, the rate cap and the (empty) offers of the section 12 table`, `VEC-CONSENT a ticket is 1 to 32 characters of the base64url alphabet, and the answers are allow, deny and expired`

#### WT-5

Approved means one use: a request goes ahead on a ticket only when the ticket names an approved entry of the same agent session and the request asks for the same thing; the approval is then used up, and a Block set meanwhile or a policy deny refuses all the same.

> A surface MUST let a request go ahead on a ticket

Tests: `WT-5 an approved request goes ahead on its ticket once: the same agent session, the same action and arguments; the approval is then used up, and a Block set meanwhile wins`

## Sections 12, 13

This requirement spans several sections of [the specification](../reference/specification.md).

#### CH-13

Chat is bounded: rates.chat per credential and surface (10, 5 and 0 a second), chat.say checked at the hub, and at the hub a relay budget for each sender and each agent that listens, so that an agent's flood uses none of the person's; a dropped relay of an agent's words is a record of kind chat.

Tests: `CH-13 chat.say draws on rates.chat per credential and surface (E_RATE) and is checked at the hub; each sender has a relay budget of its own for each agent, so an agent's flood uses none of the person's`, `VEC-POLICY each profile has the remembered approvals, timeouts, rates and pointer rate of the section 12 table`

#### CH-20

chatRelay is off, person or on, in the surface's policy and in the hub's, and the stricter of the two applies: the hub sends its value with every attach and enforces it itself, a surface that is sent none takes it as off, and true and false read as on and off.

Tests: `CH-20 the stricter of the surface's chatRelay and the hub's applies, a surface that is sent none takes it as off, and true and false read as on and off`, `CH-20 the hub sends its chatRelay with every attach and enforces it itself: under on every agent hears the others, under off none, under person only agents the surface reported as switched on by the person`, `VEC-CHAT chatRelay has three values, the stricter of two applies, and the two old values read as on and off`, `VEC-POLICY each profile matches the section 12 table`

#### CH-23

An addressed message stays addressed: when the agent it is for leaves before it is sent, nothing is sent until the person has chosen again, and for 500 ms after the room changed Send and Enter are ignored. A message of the person the hub does not relay (beyond 5 a second after a burst of 10 for one agent, or while the audit log cannot record it) is recorded, told to the surface as chat.undelivered, and marked in the tab.

Tests: `CH-23 an addressed message stays addressed: when the agent it is for leaves before it is sent, nothing is sent until the person has chosen again; and a message the hub says it did not deliver is marked`, `CH-23 a message of the person beyond its budget for one agent (5 a second after a burst of 10) is not relayed, is recorded, and the surface is told which one with chat.undelivered`

## Sections 9, 12, 13

This requirement spans several sections of [the specification](../reference/specification.md).

#### CH-21

to: "person" on chat.say is for the person alone: always taken, at the surface and at the hub, sent and relayed to no agent whatever the room relays, and read back by its sender only.

Tests: `CH-21 to: "person" is for the person alone: always taken, sent to no agent whatever the room relays, read back by its sender only`, `CH-21 to: "person" passes the hub under every chatRelay, with the trimmed text and to and no other param forwarded; an agent's message for the person alone is never relayed to an agent`, `VEC-CHAT chatAudience reproduces every row of who hears a message`

## Section 16: Versioning

[Read section 16 of the specification](../reference/specification.md#16-versioning).

#### VER-1

No common version is E_VERSION.

Tests: `VER-1 a hello with no version in common is refused with E_VERSION`

#### VER-2

Receivers ignore unknown fields and unknown event topics.

Tests: `VER-2 unknown fields on frames are ignored`, `VER-5 an event with an unknown topic is ignored, not fatal`

#### VER-3

Unknown methods are refused with E_UNKNOWN_METHOD.

Tests: `VER-3 an unknown method is refused with E_UNKNOWN_METHOD on an attached surface`, `VER-4 an unknown method without a surface id is refused with E_UNKNOWN_METHOD`, `SF-SCOPE-1 the surface checks the grant and its scopes itself: E_NOT_ATTACHED, E_SCOPE, E_UNKNOWN_METHOD`

#### VER-6

challenge.v lists the versions the hub speaks, newest first; a peer names in hello.v the first one in that list that it speaks, the hub refuses one it did not list, and welcome.v repeats it.

> The peer MUST name in `hello.v` the first version in that list that it speaks

Tests: `VER-6 the hub lists 0.2 and 0.1 in challenge.v, newest first, and welcomes each peer in the version its hello names`, `VER-6 a hub that speaks 0.1 alone lists it alone, and refuses a hello that names another version`, `VER-6 the surface names in hello the first version of the hub's list that it speaks, and says which it speaks while connected`, `VER-11 on a hub that lists both, the SDK speaks 0.2, and 0.1 when told to speak 0.1 alone`, `VEC-VERSIONS the versions are 0.2 and 0.1, newest first, and a peer picks the first one in the hub's list that it speaks`

#### VER-7

The hub records the version of each connection in its connect record, and gives an agent on 0.2 each surface's version as SurfaceInfo.v; an agent on 0.1 gets the SurfaceInfo of 0.1.

Tests: `VER-7 the hub records the version of each connection, and tells an agent on 0.2 which version each surface speaks`

#### VER-8

Toward an agent on 0.1 the hub sends no event that 0.1 does not have: no grant event of kind scopes (the grant narrows all the same, the request is E_SCOPE, the surface changed event is sent), no user event of kind level, rule or relay, no chat event; it holds and records what they say.

> an implementation of 0.2 MUST keep to 0.1

Tests: `VER-8 an agent on 0.1 is sent no grant event for a scope switch: its grant narrows all the same, the request is E_SCOPE, and the surface event that follows is sent`, `VER-8 an agent on 0.1 is sent no level, rule or relay switch and no chat message; the hub holds and records what the person set`

#### VER-9

Toward an agent on 0.1 the hub asks no chat scope for it and answers chat.* with E_UNKNOWN_METHOD, leaves kept out of the attach result, and sends E_WAITING as E_CONSENT without its data; a surface's error otherwise reaches the agent with its data unchanged.

Tests: `VER-9 an agent on 0.1 has no chat: the scope is not asked of the surface for it, and the chat methods are E_UNKNOWN_METHOD whatever their params`, `VER-9 an agent on 0.1 is not sent kept in the attach result; what stays of the person's settings holds for its grant`, `VER-9 a surface's error reaches an agent on 0.2 with its data unchanged; an agent on 0.1 gets E_CONSENT, without the data, for a request that waits`

#### VER-10

Toward a surface on 0.1 the hub sends attach with agent, scopes and reason, and v (the agent's protocol version, which 0.1 ignores), never with chat, grants no chat there, reads no kept from the answer, and drops an event of a topic or kind 0.1 does not have, unread and unrecorded.

> an implementation of 0.2 MUST keep to 0.1

Tests: `VER-10 a surface on 0.1 is asked as 0.1 asks: the agent, the scopes without chat, the reason; chat on it is E_SCOPE and it is never asked`, `VER-10 a surface on 0.1 that answers attach with chat and with kept gets neither: no chat scope is granted, and no setting is read`, `VER-10 from a surface on 0.1 the hub takes what 0.1 has and drops the rest: no level, rule, scope switch, relay switch or chat message`

#### VER-11

An agent with a hub on 0.1 asks for no chat scope and sends no chat.* request; the reference SDK says which version it speaks and refuses a chat call itself with E_UNKNOWN_METHOD.

Tests: `VER-11 on a hub that lists 0.1 alone the SDK speaks 0.1: it says so, asks for no chat scope, and refuses a chat call itself without a request`

#### VER-12

A surface with a hub on 0.1 sends no grant event of kind scopes, no user event of kind level, rule or relay and no chat event, reads only agent, scopes and reason from attach, grants no chat and answers without kept; what the person sets holds on the page.

Tests: `VER-12 on a hub that lists 0.1 alone the surface grants no chat and reads only the agent, the scopes and the reason of attach: no level beyond ask is offered`, `VER-12 on a hub that lists 0.1 alone the surface reports no level and no scope switch, which hold on the page all the same; pause, resume and Stop are sent as in 0.1`, `VER-12 on a hub that lists 0.1 alone the attach answer has no kept; what stays of the person's settings stays on the page`, `VER-12 the same on a hub that speaks 0.2 is told: the level, the scopes in force, and kept in the attach answer`

#### VER-13

From 0.2 on, an event of a kind the receiver does not know, on a topic it knows, ends nothing and changes nothing.

Tests: `VER-13 an event of a kind the receiver does not know, on a topic it knows, ends nothing: the hub drops such a grant event, and the SDK keeps its handle`

#### VER-14

What 0.1 has and what 0.2 adds to it are the tables of section 16; on a link that negotiated 0.1 only the events, methods, scopes and error codes of 0.1 exist.

Tests: `VEC-VERSIONS what 0.1 has and what 0.2 added to it are the tables of section 16`, `VEC-VERSIONS on a link that negotiated 0.1 only the events, methods, scopes and error codes of 0.1 exist`

## Sections 4 to 16

This requirement spans several sections of [the specification](../reference/specification.md).

#### ERR-1

The error codes are exactly those of the section 6 table.

Tests: `VEC-ERR every error code the spec names exists`, `VEC-ERR the error codes are exactly those of the section 6 table`

## Section 14: Security requirements

[Read section 14 of the specification](../reference/specification.md#14-security-requirements).

#### S14-1

The hub listens on loopback only and validates Host, Origin and the remote address on every upgrade.

Tests: `S14.1 an upgrade with a Host header other than loopback with the hub port is refused (DNS rebinding)`, `S14.1 an upgrade whose Origin no configured role accepts is refused`, `S14.1 every upgrade is checked: wrong Host and wrong Origin are refused before any frame`

#### S14-2

Agents authenticate with a 256-bit secret by HMAC challenge-response; the hub proves the secret; every message is sealed with a MAC bound to the handshake.

Tests: `S14.2 agents prove a 256-bit secret by HMAC and the hub proves it back; a wrong secret is refused`, `S14.2 seal MACs are bound to the handshake: a message sealed for another session is rejected`

#### S14-3

Secrets are never in URLs or logs and are stored in owner-only files.

Tests: `S14.3 secrets never appear in frames, refusals, audit records or console output`, `S14.3 the audit file the hub creates is readable by its owner only (POSIX mode)`

#### S14-4

Surfaces are admitted by origin allowlist, and by key where the deployment requires it or holds a key for the app id they claim.

Tests: `S14.4 surfaces are admitted by origin allowlist, and by key where required`, `HS-26 a surface claiming an app id the hub holds a key for must prove it, even without requireKey; SurfaceInfo.verified tells them apart`

#### S14-5

Every forwarded request is checked against a live grant, its scope and its rate.

Tests: `S14.5 every forwarded request is checked against a live grant, its scope and its rate`

#### S14-6

The surface re-checks every request against the app policy.

Tests: `S14.6 the surface applies its own policy even when the hub forwards without c:1`

#### S14-7

Arguments are validated against a schema before any handler runs; undeclared properties are rejected.

Tests: `S14.7 arguments are validated against the schema before the handler runs; undeclared properties are rejected`

#### S14-8

No frame, argument or result can cause code, markup or style to be evaluated.

Tests: `S14.8 agent text, toasts and colours never become markup, code or style`

#### S14-9

Private fields are never read and, by default, never written.

Tests: `S14.9 private fields are never read and, by default, never written`, `S14.9 commands that would change a private control they do not target are refused: clear on an editable holding one, a radio of its group, a form reset`, `S14.9 a text field swapped in for a private one stays private`, `S14.9 private text never names another node, and a node in a private subtree is named only by data-reins-label`

#### S14-10

Consent, the indicator and its panel are isolated from the page's styles and from what its scripts can reach, and act only on input the browser made for the person and delivered to their own controls. Script that runs in the page's own JavaScript realm is outside the rule, whatever the order in which it and the driver load.

Tests: `S14.10 the consent card sits in a closed shadow root and ignores untrusted clicks`, `LV-7 no method, event or untrusted input opens the panel or changes a level, a rule or a scope switch`, `LV-24 the overlay's stylesheet reads no custom property and names only generic font families, and the host pins what 'all' leaves alone`, `LV-26 a script that replaces addEventListener after the driver loaded finds no listener of the overlay or of the watch for the person's input: it has nothing to call, and what it dispatches moves nothing`

#### S14-11

A human can always see that an agent is attached; Pause and Stop work without the hub.

Tests: `S14.11 while an agent is attached an indicator names it, and Stop works without the hub`, `S14.11 Pause holds page-changing commands without the hub`

#### S14-12

Errors carry no internals; observations are size-bounded.

Tests: `S14.12 hub errors are short and carry no stack traces, file paths or secrets`, `S14.12 handler failures carry no internals and observations are size-bounded`

#### S14-13

The audit log is append-only and hash-chained, keyed where needed, and the hub refuses attach and every audited request while it cannot record.

Tests: `S14.13 when the audit log cannot be written, the hub refuses attach and audited requests with E_INTERNAL`, `S14.13 the audit chain is keyed when the hub has an audit key: the plain SHA-256 chain does not verify it`, `AU-6 with an audit key args is HMAC-SHA256(auditKey, canonical JSON); show.toast, show.highlight and stream.open are audited, cursor.* and show.clear are not`

#### S14-14

Everything a surface reports is untrusted input presented to a model as data.

Tests: `S14.14 text a page supplied reaches the model marked as page data`, `S14.14 page-supplied names cannot break the compact tree format a model reads`

#### S14-15

A grant's level, rules and scope switches change only on the person's trusted input on the surface, and a change that lets an action run without asking only through a confirm step; nothing the person sets relaxes a deny of the surface's policy or the hub's; the hub ends a grant whose surface reports a level beyond the hub's policy and takes no rule that policy would not honour. What lets an agent do more ends with the grant; what the person tightened stays with the agent, whatever the agent does.

Tests: `S14.15 only the person's trusted input changes a grant's level; nothing they set relaxes a deny; and it ends with the grant`, `S14.15 the hub ends a grant whose surface reports a level beyond the hub's policy, and never widens a grant on a surface's word`, `LV-8 whatever lets an action run without asking takes a confirm step that names the agent and what stops asking, armed after 500 ms; what asks more applies at once`, `LV-11 a rule allow the hub's policy would not let waive anything is recorded as refused and neither kept nor relayed; the grant goes on`, `LV-6 what lets an agent do more ends with the grant: after a replacing attach, a detach and Stop the level is ask again, no rule allows and no approval is remembered`, `LV-27 what the person tightened stays for the next grant of the same agent, under whatever session id and name: Strict, the rules confirm and deny, the scopes switched off; the attach answer says so; what they lift themselves does not stay`

#### S14-16

Chat is data and grants nothing: the person's words come only from trusted input in the surface's chat tab, agent text is shown as text under the grant's name and never next to a consent prompt, agents hear each other only where the policy or the person says so, the hub relays a message only to the grant it names and records length and digest, and no message changes a level, a rule, a scope switch or a consent answer.

Tests: `S14.16 the person's words come only from trusted input in the Chat tab, an agent's text is shown as text under its grant's name, and no message changes a level, a rule, a scope or a consent answer`, `S14.16 the hub relays a chat message only to the grant it names and records its length and digest, never its text`
