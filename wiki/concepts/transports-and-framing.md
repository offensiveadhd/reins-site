# Transports and framing

> The two transports, a loopback WebSocket and an in-page port, and the text and binary frames that both carry.

## One protocol, any transport

The same frames run over a loopback WebSocket and over an in-page message port. Every transport is wrapped as a `Link`: a bidirectional, ordered, reliable message pipe that sends strings and bytes. Every layer above it is transport-agnostic.

## Loopback WebSocket

The hub listens on `127.0.0.1`, by default on port 7346. Peers open `ws://127.0.0.1:7346/` with the subprotocol `reins.v1`. The hub MUST:

- bind loopback addresses only and refuse any other bind address;
- reject a socket whose remote address is not loopback;
- reject a request whose `Host` header is not `127.0.0.1`, `localhost` or `[::1]` with the hub's port (the defence against DNS rebinding);
- require the `reins.v1` subprotocol;
- disable per-message compression;
- answer plain HTTP requests with a bare status and no body.

Browsers treat loopback as a secure context, so an `https:` page may open `ws://127.0.0.1`. A browser may put loopback access behind a user permission. The driver treats a blocked connection as an ordinary connect failure and reports it. What browsers do today is in [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback).

## In-page port

A `MessagePort`, or the in-memory `linkPair()`, carries the same frames with strings for text frames and `Uint8Array` for binary frames. An assistant that runs inside the browser uses this to reach a surface with no network at all. See [The in-tab shape](../start/in-tab.md).

## Electron port

An Electron app hosts the broker in its main process and links a window to it over a `MessageChannelMain`. The frames are those of the in-page port. A port ends with its document, so a window that reloads or navigates connects again from the new one.

The main process is the embedding code: it takes the link's origin from the frame the port went to, as Electron reports it, and never from anything the page sent. It gives a port only to the top-level frame of a window the app registered, for the page it was registered for. Code that builds a link itself knows what is at the far end, and may vouch for it; the hub then lists that surface as `verified`.

A hub whose surfaces are all linked in-process may close its socket to surfaces (`surfaceSockets: false`, or `reins-hub --no-surface-sockets`). On such a socket a `hello` with role `surface` is answered `bye {code:"E_ORIGIN"}`, whatever `Origin` header came with it. See [Electron: build Reins into your app](../guides/electron.md).

## Links are bounded

A link queues inbound messages until a handler is assigned, at most 4096 messages and 16 MiB; past either bound it drops the queue and closes. Until a connection has authenticated, the hub holds much less from it: at most 16 messages and 64 KiB.

## Text frames

Text frames are JSON objects with a `t` field:

| `t` | Direction | What it is |
|---|---|---|
| `challenge` | hub to peer | The first frame on every connection: the versions the hub speaks and a nonce. |
| `hello` | peer to hub | The peer's version, role, name, nonce and proof. A surface adds its manifest. |
| `welcome` | hub to peer | The session id, the limits, and the hub's proof when the peer authenticated. |
| `req` | either | A request: `{id, m, p}`. |
| `res` | either | The one answer to a request: `{re, ok, r}` or `{re, ok:false, e:{code, msg}}`. |
| `evt` | surface to hub, hub to agent | An event: `{topic, d}`. |
| `flow` | stream receiver to sender | `{ch, credit}`: more units may be sent on a stream. |
| `ping`, `pong` | either | The heartbeat: `{ts}`, echoed back unchanged. |
| `bye` | either | Sent right before closing on purpose: `{code, msg?}`. |

A request and its answer, as they cross a link:

```json
{"t":"req","id":7,"m":"act","p":{"s":"s1","a":"cart.add","args":{"sku":"latte"}}}
```

```json
{"t":"res","re":7,"ok":true,"r":{"result":{"count":1,"total":4.5,"items":["1 latte"]},"rev":12}}
```

Ids count up from 1 per sender per connection. Within a version, receivers ignore unknown fields on frames.

## Binary frames

Binary frames start with a kind byte. The only kind in 0.1 is the pointer frame, `0x01`, which carries points of a live cursor trajectory. Its layout is in [Cursor and the pointer stream](./cursor-and-pointer-stream.md).

## Limits

The defaults, which the hub announces in `welcome`:

| Limit | Default | Meaning |
|---|---|---|
| `maxText` | 256 KiB | The UTF-8 bytes of one text frame |
| `maxBinary` | 16 KiB | The bytes of one binary frame |
| `heartbeatMs` | 15 000 | Idle time after which a side sends `ping` |
| `reqTimeoutMs` | 15 000 | How long a request waits for its answer |
| `consentTimeoutMs` | 60 000 | Extra time the hub allows a request that waits on a consent prompt |

A size limit applies to a frame after its seal is removed. A size in bytes counts the UTF-8 bytes of text.

## When a frame is wrong

A receiver MUST close with `E_TOO_LARGE` on an oversize frame, and with `E_BAD_FRAME` on a frame that is not valid JSON, has an unknown `t`, or lacks a required field. To close with a code is to send `bye {code}` and then close the transport.

A message too large for the transport to take at all is closed by the transport without a `bye`, with WebSocket close code 1009. The hub's WebSocket accepts the frame limit plus a seal MAC: 44 more characters of text, 32 more bytes of binary.

Decoding validates shape: field presence and primitive types.

## The heartbeat

Either side sends `ping {ts}` after `heartbeatMs` of silence. The answer is `pong {ts}` with the same value. A peer silent for 2.5 × `heartbeatMs` is dropped: 37.5 s with the default.

## Further reading

- [Handshake, authentication and sealed sessions](./handshake.md)
- [Limits](../reference/limits.md): every number in one place.
- [Specification, sections 3 and 4](../reference/specification.md#3-transports)
