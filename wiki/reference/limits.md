# Limits

> Every size, time and count the protocol fixes, in one place. Frame sizes, timeouts, capacities, rates and the bounds on prompts and observations.

## The announced limits

The hub announces these in `welcome`, and they can be configured:

| Limit | Default | Meaning |
|---|---|---|
| `maxText` | 262 144 (256 KiB) | The UTF-8 bytes of one text frame |
| `maxBinary` | 16 384 (16 KiB) | The bytes of one binary frame |
| `heartbeatMs` | 15 000 | Idle time after which a side sends `ping`. A peer silent for 2.5 times this is dropped. |
| `reqTimeoutMs` | 15 000 | How long a request waits for its `res` |
| `consentTimeoutMs` | 60 000 | Extra time the hub allows a request that waits on a consent prompt |

A size in bytes counts the UTF-8 bytes of text. A length in characters counts UTF-16 code units unless code points are named. A size limit applies to a frame after its seal is removed.

## By topic

**Connecting.** Default port 7346. Nonces and secrets are 32 random bytes. Keys shorter than 32 characters are rejected. A peer has 5 s to send `hello`, and 5 s for key confirmation. A failed proof is answered after 200 ms, doubling up to 3 s, counting failures in the last minute. At most 16 handshakes pending. Before authentication the hub holds at most 16 messages and 64 KiB from a connection.

**Links.** A link queues at most 4096 inbound messages and 16 MiB. A peer whose send buffer at the hub holds more than max(8 MiB, 4 × `maxText`) is closed.

**Manifest.** At most 64 KiB, 256 actions and 64 views. Names are at most 64 characters. Canonical JSON nests at most 100 levels deep.

**Results and observations.** An action result is at most 32 KiB. Names are cut to 120 characters and values to 200. `read` returns 2000 characters by default and 8000 at most. A cursor label is at most 40 characters, an agent's display name 64 code points. `evt ui` is sent at most once per 100 ms.

**Consent.** One pending prompt per agent, four in total. Arguments on a card: at most 40 keys and items in total, nesting of 4, 2000 code points. Allow arms after 500 ms. A key answers a prompt no sooner than 500 ms after the prompt appeared or moved, after the focus landed on the button and after any other key, and no sooner than 3 s after the last key that types. At most two combining marks in a row are shown as they are. A cool-off of 2 s doubling to 60 s after a refusal; three refusals in a row revoke the grant. A withdrawn prompt shows its notice for 1.5 s. A `ui.*` command gives up after the person has kept using the page for 5 s.

**Grants.** A burst of 3 attaches per credential and surface, then one every 2 s. A surface holds at most 32 grants. Lifetimes come from the policy: see [Policy fields](./policy-fields.md).

**What the person sets.** A confirm step arms after 500 ms. More than 20 changes of what the person set within one second end the grant. The activity list holds the last 50 commands.

**Chat.** A message is 1 to 4000 characters after trimming, a status note at most 80. A status reads `idle` again after 2 minutes. The room keeps the last 200 messages. `chat.read` returns 20 messages by default, 50 at most, 128 KiB at most. The hub relays the person's messages to one agent at 5 a second after a burst of 10. `reins_chat wait` lasts 90 s by default and 150 s at most; the adapter keeps 100 unread messages and hands over 20 at a time. `chat-serve` gives one run 120 s by default and reads 64 KiB of its output.

**Pointer streams.** An initial credit of 512 points. At most 2729 points in a frame. Credit comes back once a quarter of the window is consumed. Droppable frames may be dropped above 256 KiB of surface backlog, and a stream is closed above 1 MiB. Playback speeds up above 120 ms of lag, to 4 times at 600 ms. A glide takes between 120 and 900 ms.

**The hub.** 64 surfaces, 32 agents, 4 sessions per credential, 8 streams per agent. `hub.info` and `surfaces.list`: 10 a second, burst 20. Surface admission: 2 a second per origin. Agent admission: 2 a second per credential, burst 20.

**The audit log.** At most 1000 records waiting before the hub fails closed. At most 20 refusal records per second per connection.

**The page.** Commands run within a budget of 6 ms per animation frame.

**Shell sessions.** A session ends after 30 minutes without a call.

## Every number, from the test vectors

The conformance suite keeps every number the specification states in one file, `conformance/vectors/limits.json`, and checks the reference implementation against it. This table is that file, flattened:

| name | value |
|---|---|
| `defaultLimits.maxText` | `262144` |
| `defaultLimits.maxBinary` | `16384` |
| `defaultLimits.heartbeatMs` | `15000` |
| `defaultLimits.reqTimeoutMs` | `15000` |
| `defaultLimits.consentTimeoutMs` | `60000` |
| `pointerInitialCredit` | `512` |
| `pointerMaxPoints` | `2729` |
| `linkQueue.maxMessages` | `4096` |
| `linkQueue.maxBytes` | `16777216` |
| `preAuthQueue.maxMessages` | `16` |
| `preAuthQueue.maxBytes` | `65536` |
| `hubMethodBucket.rate` | `10` |
| `hubMethodBucket.burst` | `20` |
| `peerSendBufferBytes` | `max(8 MiB, 4 x maxText)` |
| `admission.surfaceRate` | `2` |
| `admission.surfaceBurst` | `2 x maxSurfaces` |
| `admission.allOriginsFactor.rate` | `5` |
| `admission.allOriginsFactor.burst` | `2` |
| `admission.agentRate` | `2` |
| `admission.agentBurst` | `20` |
| `canonicalMaxDepth` | `100` |
| `agentNameMaxCodePoints` | `64` |
| `coolOff.firstMs` | `2000` |
| `coolOff.maxMs` | `60000` |
| `coolOff.revokeAfterRefusals` | `3` |
| `withdrawnNoticeMs` | `1500` |
| `humanGiveUpMs` | `5000` |
| `stickyPrivacy.remembered` | `32` |
| `stickyPrivacy.sameParentMs` | `1000` |
| `defaultPort` | `7346` |
| `subprotocol` | `reins.v1` |
| `versions` | `["0.1"]` |
| `manifest.maxBytes` | `65536` |
| `manifest.maxActions` | `256` |
| `manifest.maxViews` | `64` |
| `maxResultBytes` | `32768` |
| `maxNameChars` | `120` |
| `maxValueChars` | `200` |
| `handshake.nonceBytes` | `32` |
| `handshake.secretBytes` | `32` |
| `handshake.minKeyChars` | `32` |
| `handshake.helloTimeoutMs` | `5000` |
| `handshake.failDelayMs` | `200` |
| `handshake.failDelayMaxMs` | `3000` |
| `handshake.failWindowMs` | `60000` |
| `handshake.maxPending` | `16` |
| `handshake.confirmTimeoutMs` | `5000` |
| `sealMacTextChars` | `43` |
| `sealMacBytes` | `32` |
| `sealKind.text` | `116` |
| `sealKind.binary` | `98` |
| `defaultSessionsPerCredential` | `4` |
| `attach.burst` | `3` |
| `attach.refillEveryMs` | `2000` |
| `capacity.surfaces` | `64` |
| `capacity.agents` | `32` |
| `capacity.sessionsPerCredential` | `4` |
| `capacity.streamsPerAgent` | `8` |
| `read.defaultMax` | `2000` |
| `read.capMax` | `8000` |
| `cursorLabelMaxChars` | `40` |
| `uiEventMinIntervalMs` | `100` |
| `heartbeatDropFactor` | `2.5` |
| `consent.maxEntries` | `40` |
| `consent.maxDepth` | `4` |
| `consent.maxCodePoints` | `2000` |
| `consent.perAgent` | `1` |
| `consent.total` | `4` |
| `consent.armMs` | `500` |
| `panel.confirmArmMs` | `500` |
| `panel.settleMs` | `500` |
| `panel.activityEntries` | `50` |
| `panel.maxSessions` | `32` |
| `chat.maxTextChars` | `4000` |
| `chat.maxNoteChars` | `80` |
| `chat.transcriptMessages` | `200` |
| `chat.readDefault` | `20` |
| `chat.readMax` | `50` |
| `chat.readBytes` | `131072` |
| `chat.statusTtlMs` | `120000` |
| `chat.personPerSecondPerAgent` | `5` |
| `chat.personBurstPerAgent` | `10` |
| `chat.undeliveredNoticesPerSecond` | `20` |
| `chat.mcpWaitDefaultMs` | `90000` |
| `chat.mcpWaitMaxMs` | `150000` |
| `chat.mcpKeepaliveMs` | `45000` |
| `pointer.dropBufferBytes` | `262144` |
| `pointer.stallBufferBytes` | `1048576` |
| `pointer.creditBatchFraction` | `0.25` |
| `playback` | `[{"queuedMs":0,"rate":1},{"queuedMs":120,"rate":1},{"queuedMs":360,"rate":2.5},{"queuedMs":600,"rate":4},{"queuedMs":5000,"rate":4}]` |
| `glide.formula` | `clamp(120 + 110 * log2(1 + d / 40), 120, 900)` |
| `glide.cases` | `[{"d":0,"ms":120},{"d":40,"ms":230},{"d":120,"ms":340},{"d":600,"ms":560},{"d":1000000,"ms":900}]` |
| `commandFrameBudgetMs` | `6` |
| `audit.maxBacklog` | `1000` |
| `audit.refusalsPerSecond` | `20` |
| `audit.personRecordsPerSecond` | `20` |
| `audit.personChangesPerSecond` | `20` |
| `audit.droppedRelayRecordsPerSecond` | `20` |

Times are in milliseconds and sizes in bytes unless the name says otherwise. See the [vector page for limits.json](../implementers/vectors/limits.md) for its notes.

## Further reading

- [Rate limits and capacity](../concepts/rate-limits-and-capacity.md)
- [Specification, section 4](./specification.md#4-framing) and [section 13](./specification.md#13-hub-behaviour)
