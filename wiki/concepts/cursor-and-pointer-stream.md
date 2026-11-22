# Cursor and the pointer stream

> One message glides the agent's cursor at display rate. For live trajectories, a binary stream with credit-based flow control carries points.

## A cursor the person can follow

The agent's cursor is drawn by the driver in its overlay, with a label and a colour. It belongs to the `cursor` scope, and it is **visual only: it never dispatches input**. It exists so that the person can see where the agent's attention is.

`cursor.set` shows or hides the cursor and sets its label and colour. The label is at most 40 characters. While a consent prompt is up the label is hidden, and it comes back when the prompt has gone: nothing an agent drew stands beside a prompt. The colour is the only style value an agent may send, and it must be `#rgb` or `#rrggbb`.

## One-shot motion

`cursor.move` costs one message. The driver animates locally at display rate along a curved path with ease-in-out timing, whatever the network does.

Without `ms` the duration follows distance:

```text
clamp(120 + 110 * log2(1 + d / 40), 120, 900) milliseconds
```

So a short hop takes about an eighth of a second and the longest glide under a second. `cursor.move` answers when the motion ends, or at once with `wait: false`.

The target is an element, by handle or semantic id, or, when `policy.coordinates` is on, a point in viewport pixels. When the cursor is visible, `ui.click`, `ui.type` and `ui.select` glide it to their target first.

## The pointer stream

For live trajectories, circling a number or drawing attention along a path, an agent opens a channel with `stream.open` and sends binary pointer frames. Points are viewport fractions with a millisecond delta each. The stream is visual, like the rest of the `cursor` scope.

A stream draws at raw coordinates, so `stream.open` fails with `E_DENIED` when `policy.coordinates` is off, at the hub and at the surface. The kiosk profile has it off.

### The frame

Every integer is little-endian:

| offset | size | field |
|---|---|---|
| 0 | u8 | kind: `0x01` (`BIN_POINTER`) |
| 1 | u8 | flags: `0x01` `PTR_FLAG_DROPPABLE`, `0x02` `PTR_FLAG_END` |
| 2 | u16 | `ch`, the channel `stream.open` returned |
| 4 | u32 | `seq` of the first point; each later point adds 1 |
| 8 | u16 | `n`, the number of points |
| 10 | 6 × n | the points, each u16 `x`, u16 `y`, u16 `dt` |

A fraction f is sent as round(f × 65535) after clamping f to 0..1, and read back as u / 65535. `dt` is milliseconds since the previous point, clamped to 0..65535. A frame holds at most 2729 points, which is what fits in 16 KiB. A binary frame whose kind is not `0x01`, or whose length is not exactly 10 + 6 × n, is not a pointer frame and is dropped.

### Credit

The surface answers `stream.open` with an initial credit in points: 512. A sender MUST NOT have more unacknowledged points outstanding than its credit. As the surface plays points back it returns credit with `flow {ch, credit}`, batched: it sends a `flow` once at least a quarter of the window has been consumed. The hub relays `flow` to the agent and closes a stream that overruns its credit.

### What happens under pressure

- **The sender coalesces.** A sender that produces points faster than credit arrives keeps a bounded backlog. On overflow it drops every second interior point and folds the dropped `dt` into the next point, so the stroke keeps its shape and its total duration. The first and last points are never dropped.
- **The receiver catches up.** The driver queues points and plays them on animation frames, interpolating between points by `dt`. When the queue holds more than 120 ms of motion it plays faster, in proportion to the lag and up to 4×, so the cursor converges on the live position instead of falling behind.
- **The hub may drop.** Frames flagged droppable may be dropped by the hub when the surface's send buffer exceeds 256 KiB; the hub then returns their credit to the agent. A frame flagged as the end of a stroke is never dropped. `seq` lets the receiver notice a gap, which it bridges with a straight segment.

Pause and Stop stop the cursor where it is and discard the queued points, returning their credit.

### The rate

The hub caps the points of all pointer streams one credential has open on one surface, across all its sessions, at `policy.pointerRate` per second: 2000 under `guarded` and `kiosk`, 4000 under `open`.

A stream that goes beyond the rate, overruns its credit, or whose surface stops reading so that more than 1 MiB is waiting to be sent, is closed. The agent is not told at once: its `stream.close` for that channel answers `E_RATE`. An agent that gives up on a stream, for example because no credit arrived in time, MUST still send `stream.close` for it. An agent may have 8 streams open by default.

### With the SDK

```js
const pen = await kiosk.pointer();
for (const [x, y] of path) pen.push(x, y, 8);   // viewport fractions, and ms since the last point
await pen.end();
console.log(pen.stats);                          // { sent, dropped }
```

The SDK's stream keeps to the credit and coalesces for you. In the [playground](../../playground.html) console, "stream.open: circle the total" does this, and the Wire tab shows the binary frames and the `flow` frames that answer them.

## When the person switches the cursor off

The person can switch the `cursor` scope of one agent off in the panel. The hub then closes that agent's pointer streams on the page, and the page drops them and hides the cursor if that agent showed it last. Later `cursor.*` requests fail with `E_SCOPE` until the person switches the scope back on. See [Grants and scopes](./grants-and-scopes.md#scope-switches).

## Commands never block rendering

The driver runs queued commands at the start of each animation frame and stops when the frame has used 6 ms, so a burst of commands never blocks rendering. Cursor targets that arrive within the same frame collapse to the newest.

## For implementers

Frames, clamping and rounding are in the test vectors: [`pointer.json`](../implementers/vectors/pointer.md).

## Further reading

- [Rate limits and capacity](./rate-limits-and-capacity.md)
- [Specification, section 11](../reference/specification.md#11-cursor-and-the-pointer-stream)
