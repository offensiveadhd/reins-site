# Writing another implementation

> What it takes to implement Reins in another language or runtime. What the contract is, what has to match exactly, and how the vectors and the conformance suite tell you that you got it right.

## The contract

Reins is a protocol first. The reference implementation is TypeScript, and nothing in the protocol depends on that.

Two files are the contract:

- **[The specification](../reference/specification.md)** describes the behaviour. The words MUST, SHOULD and MAY are normative.
- **[`protocol.ts`](https://github.com/offensiveadhd/reins/blob/main/packages/core/src/protocol.ts)** holds the wire types: every frame, method, error code and data shape, as types and constants with no logic. Its header says what to do when the two disagree: fix both in one change.

The specification is written to be sufficient. Every detail the test vectors depend on is written in it; no vector relies on the reference implementation for a rule the specification leaves open.

## What you might implement

You do not have to implement all three roles.

| Role | What it is | Notes |
|---|---|---|
| **Agent** | A client: handshake, sealing, requests, events, optionally the pointer stream. | The smallest of the three. An agent in another language talks to the reference hub and drives any page connected to it. |
| **Hub** | The broker: authentication, grants, policy, rate limits, routing, the audit log. | Most of the security requirements live here. The conformance suite tests a hub from the outside. |
| **Surface** | The in-page runtime: the UI tree, command execution, consent, the indicator, the panel and the chat room. | Tied to the browser: the DOM, trusted events, a closed shadow root. |

## A sensible order

1. **Frames.** Encode and decode the ten text frames, and close with `E_BAD_FRAME` and `E_TOO_LARGE` where the specification says. See [Transports and framing](../concepts/transports-and-framing.md).
2. **The handshake.** The proof is one HMAC. Check yours against [`auth.json`](./vectors/auth.md).
3. **Sealing.** Derive the two directional keys from the transcript, MAC every message, count per direction. Check against [`seal.json`](./vectors/seal.md), including the cases that must never be sealed or opened. Then key confirmation: a sealed `ping`, a sealed `pong`.
4. **Requests and events.** Ids, the one answer per request, timeouts, the heartbeat.
5. **For an agent**: attach, then the methods you need. Apply deltas exactly: [`ui-delta.json`](./vectors/ui-delta.md).
6. **For a hub**: grants and scopes, the policy decision, rate limits and capacity, then the audit chain: [`audit.json`](./vectors/audit.md).

## What has to match exactly

Most of the protocol tolerates differences in how you build it. A few things do not, because two parties compute the same value independently:

- **Proofs and seal MACs.** Byte for byte: the contexts, the line feeds between fields, UTF-8 for everything hashed, the 32-bit big-endian lengths in the transcript hash, the 64-bit big-endian sequence number in the MAC input.
- **Canonical JSON.** Key order by UTF-16 code units, and numbers as ECMAScript writes them. The manifest digest and the audit hashes depend on it. See [`manifest.json`](./vectors/manifest.md).
- **The pointer frame.** Little-endian, with fractions rounded halves up. See [`pointer.json`](./vectors/pointer.md).
- **Delta application.** `diffNodes` and `applyOps` implement the rule of section 10, and every implementation MUST use them, or match them exactly. A different but reasonable insertion rule gives a different tree.
- **The prompt card.** It is the same wherever it is produced. An agent that renders it itself has to match character for character.
- **Merge patches.** RFC 7396, with the rule that a null property reads as absent. See [`merge-patch.json`](./vectors/merge-patch.md).
- **The policy table and the decision order.** See [`policy.json`](./vectors/policy.md).
- **How an `act` request is decided under the person's level and rules.** `decideAct` implements the order of section 12, and every surface MUST use it or match it exactly. See [`levels.json`](./vectors/levels.md).
- **Who is sent a chat message.** `chatAudience` implements the order of section 12, with the same obligation. See [`chat.json`](./vectors/chat.md).
- **The origin of a URL, and what an allowlist entry matches.** Computed by the rule of section 5, not taken from a URL library. See [`origins.json`](./vectors/origins.md).

## Conventions that bite

From the first lines of the specification:

- A size in bytes counts the UTF-8 bytes of text.
- A length in characters counts UTF-16 code units unless code points are named.
- Strings that are hashed or MACed are taken as their UTF-8 bytes.
- base64url is RFC 4648 section 5 without padding.

An implementation in a language whose strings are not UTF-16 has to count characters the way JavaScript does where the specification counts characters: the cuts of names and values, the 43 characters of a text MAC.

## The security requirements are not optional

Section 14 of the specification has 16 numbered rules an implementation MUST meet: loopback only, authenticated and sealed sessions, secrets out of URLs and logs, admission by origin and key, every forwarded request checked, the surface re-checking, schema validation before any handler, no evaluation of anything, private fields, isolated consent, human control that works without the hub, errors without internals, an audit log that fails closed, page content presented as data, levels and rules that change only on the person's input, and chat that is data and grants nothing.

The [security model](../reference/security-model.md) explains which threat each rule answers. Read its list of what Reins does not protect against as well: your implementation inherits those limits.

## Proving it

- **The vectors** are the first check, and need nothing but your own code: see [Test vectors](./test-vectors.md).
- **The hub tests** are black-box at the wire level. To run them against another hub, replace `startTestHub` in `conformance/lib/hub.ts` with code that starts that hub on a free port with the same configuration (credentials, allowed origins, policy, limits) and exposes its audit records. Tests that configure the hub through `BrokerConfig` options or read `memoryAudit` records depend on the reference configuration shape.
- **The requirements index** maps every normative sentence to the tests that check it: see [Requirements index](./requirements.md).
- **What the suite does not check** is listed, with reasons, under "Coverage limits" in [The conformance suite](./conformance-suite.md#coverage-limits).

## Versions

`challenge.v` lists what the hub speaks. The peer picks one and states it in `hello.v`. No common version is `E_VERSION`. Within a version, receivers ignore unknown fields on frames and unknown event topics, and refuse unknown methods with `E_UNKNOWN_METHOD`. From 0.2 on, an event of a kind the receiver does not know, on a topic it knows, changes nothing; a 0.2 implementation keeps to 0.1 on a link that negotiated 0.1 ([Protocol versions](../reference/protocol-versions.md), with the cases in `versions.json`).

This is protocol 0.2, which also speaks 0.1: the wire format may change before 1.0. If you are building on it, it helps to say so in the repository's issues, so that a change can take you into account: see [How to propose a protocol change](../community/protocol-changes.md).

## See it on the wire

The [playground](../../playground.html) shows every frame of a real session, on both legs: the handshake, the sealed frames with their MACs, a request as the agent sends it and as the hub forwards it, pointer frames and the credit that answers them. It is the quickest way to see what your implementation has to produce.
