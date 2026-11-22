# Handshake, authentication and sealed sessions

> How a peer and the hub prove a shared secret to each other without sending it, and how every message after that carries a MAC bound to the handshake.

## Three frames

```text
hub  → peer   challenge { v:["0.2","0.1"], nonce, hub }
peer → hub    hello     { v, role, name, cnonce, auth?, surface? }
hub  → peer   welcome   { v, session, role, limits, proof? }      or   bye { code }
```

The hub speaks first. `challenge.v` lists the versions it speaks, newest first; the peer names the first one it speaks in `hello.v`, and the hub repeats it in `welcome.v`. No common version is `E_VERSION`. Each link has its own version, and a peer that knows only 0.1 is served as 0.1 ([Protocol versions](../reference/protocol-versions.md)). `nonce` and `cnonce` are 32 random bytes, base64url, fresh per connection.

A peer that sends anything but `hello` first, or takes longer than 5 s, is closed.

## The proof

A peer that holds a key proves it without sending it:

```text
auth.proof = b64url(HMAC-SHA256(key, "reins.v1.auth\n" + role + "\n" + kid + "\n" + nonce + "\n" + cnonce))
```

The key is the UTF-8 bytes of the shared secret and the message the UTF-8 bytes of the string. Secrets are 32 random bytes, base64url. A secret never appears in a URL or a log, and it never crosses the wire.

**The hub proves itself too.** When the peer authenticated, `welcome.proof` is the same HMAC with the context `reins.v1.hub`. A peer that holds a key MUST verify it and close on mismatch. This defeats a process squatting on the hub's port: without the secret it cannot answer.

## When a proof fails

- The hub compares proofs in constant time, answers a failed hello with `bye {code:"E_AUTH"}`, and closes.
- A failed proof is answered after a delay: 200 ms, doubling with each failure in the last minute, up to 3 s. Nothing more the peer sends is kept.
- A correct proof is never delayed and never refused because others failed.
- At most 16 handshakes may be pending or waiting out a delay; further connections are closed with `E_BUSY`.
- Keys shorter than 32 characters are rejected when the hub is configured.

## Sealed sessions

When a peer authenticated with a key, every message after `welcome` is sealed in both directions. A process relaying the connection cannot inject, alter or reorder a message or replay one, and cannot drop one unless it also withholds everything after it in that direction: the next message fails to verify.

Both sides derive one key per direction from the shared secret and the transcript of the handshake:

```text
th = b64url(SHA-256(L(c) || c || L(h) || h || L(w) || w))
k  = HMAC-SHA256(key, context + "\n" + nonce + "\n" + cnonce + "\n" + th)
```

Here c, h and w are the UTF-8 bytes of the `challenge`, `hello` and `welcome` frame texts exactly as sent, and L(x) is the byte length of x as an unsigned 32-bit big-endian integer. The context is `reins.v1.seal.peer` for what the peer sends and `reins.v1.seal.hub` for what the hub sends. The two ends agree on the keys only if both saw the same three frames.

Each direction counts its messages from 0, and the counter is never sent:

```text
mac = HMAC-SHA256(k, u64be(seq) || kind || payload)      kind: 0x74 for text, 0x62 for binary
```

On the wire:

- a sealed **text** message is the base64url MAC (43 characters), `.`, then the text;
- a sealed **binary** message is the bytes followed by the 32 MAC bytes.

A message that does not verify closes the connection and is not delivered. Text that is not well-formed Unicode (it holds a lone surrogate) is never sealed or opened.

The [playground](../../playground.html) shows this live: the assistant's frames are marked `sealed`, and opening one shows its MAC.

### Key confirmation

Right after `welcome` the peer sends a sealed `ping`. The hub answers with a sealed `pong` and only then registers the peer and acts on anything that was in `hello`. The peer treats the session as established only when that `pong` verifies. Either side gives up after 5 s.

### What sealing does not do

Sealing protects integrity, not secrecy. Frames are plain text on `127.0.0.1`: anyone able to capture loopback traffic or relay a connection can read commands and observations. And withholding the last messages of a direction is not detected; neither end notices until the heartbeat drops the silent peer.

## Agents

**Agents MUST authenticate.** Each agent credential has a `kid`, a key, and optional caps:

| Field | Meaning |
|---|---|
| `name` | The display name shown to the person. It overrides the name the agent declares. |
| `scopes` | A cap on the scopes this agent may hold. |
| `origins` | Browser origins this agent may connect from. Without it, browser-origin connections are refused. |
| `surfaces` | Surface origin patterns this agent may attach to, and hear about. Without it, any admitted surface. |
| `maxSessions` | Concurrent sessions for this credential. Default 4. |

If the connection carries an `Origin` header, the agent is a browser page, and that origin MUST be listed on the credential, else `E_ORIGIN`.

With one token, two agents are two sessions of one credential: they share its rate limits and its cap on sessions, and the log cannot tell them apart by credential. `reins-hub --agent <kid>=<file>` gives an agent a credential of its own, and the agent names it with `--kid`.

The name shown to users is the credential's `name` when the operator set one, otherwise the name the agent declared, with control characters and the bidirectional marks and overrides removed, cut to 64 code points.

## Surfaces

**Surfaces are identified by origin.** The hub takes the origin from the WebSocket `Origin` header, or from the embedding code for in-page links, and MUST find it in the configured allowlist, else `E_ORIGIN`. Entries are exact origins, `scheme://host:*` for any port, or `*`. `hello.surface.url` MUST have that origin.

### Origins

An origin is compared as text, in one of four forms:

- a **web origin**: `scheme://host`, with `:port` unless the port is the scheme's default;
- **`file://`**: the origin of every `file:` URL, whatever its host and path;
- an **app origin**: `scheme://host` with any other scheme, which is what a page has when an Electron app serves it from a scheme of its own (`app://notes`);
- **`null`**: an opaque origin, as a `data:` URL, a sandboxed frame, or a page on a scheme the browser gives no hosts has.

An implementation computes the origin of a URL by the rule of the specification (`urlOrigin`) and does not take what a URL library reports, which for a `file:` or app-scheme URL is `null` in some engines and not in others.

In an allowlist, an exact entry matches that origin. `scheme://host:*` matches a web or app origin of that scheme and host with any port or none. **`*` matches every web origin and nothing else**: `file://`, an app origin and `null` are admitted only by an entry that names them.

Two entries admit by an origin that countless pages share. `null` is the origin of every sandboxed frame on every website, and `file://` of every local file. The reference hub warns at start when its socket admits either without requiring a surface key. See [Electron: build Reins into your app](../guides/electron.md#what-origin-your-page-has).

A hub may also hold **surface keys** by app id. A surface whose manifest claims an app id the hub holds a key for MUST prove that key; without a proof it is refused with `E_AUTH`. `requireKey` also refuses every surface without a key. See [Surface keys](../guides/surface-keys.md).

A hub MAY pin an app id to a manifest digest and refuse a surface whose manifest differs (`E_DENIED`). Pinning catches a modified build of the app. It does not stop a forger, who can copy the manifest.

## An unverified hub

A surface that holds no key cannot check the hub's proof, so it cannot tell the hub from another process listening on the same port. Such a surface treats the hub as **unverified**: it never accepts an attach silently (the decision is at least `confirm`), and it tells the user so in the consent prompt and in the indicator.

The kiosk profile has nobody to ask, so a kiosk surface MUST hold a key. A link the app built itself, the in-page transport, counts as verified.

## Closing

Either side sends `bye` before closing on purpose. On shutdown the hub sends `bye {code:"OK"}` to every peer.

## For implementers

Fixed inputs and expected outputs for the proofs and for sealing are in the test vectors: [`auth.json`](../implementers/vectors/auth.md) and [`seal.json`](../implementers/vectors/seal.md). The origin of a URL and the allowlist matches are in [`origins.json`](../implementers/vectors/origins.md).

## Further reading

- [Specification, section 5](../reference/specification.md#5-handshake-and-authentication)
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T3 to T11 are about this page.
