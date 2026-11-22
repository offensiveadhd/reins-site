# Test vectors

> Language-neutral test vectors for the parts of the protocol that two implementations have to compute identically. Fixed inputs and expected outputs, browsable here and downloadable as JSON.

## What they are

The conformance suite includes language-neutral test vectors: fixed inputs and expected outputs for authentication proofs, sealed frames, the pointer frame layout, deltas, policy decisions and more. They were computed independently of the reference implementation, for anyone writing another one.

`conformance/tools/make-vectors.mjs` generates them from the formulas in the specification with `node:crypto` only. It imports nothing from the reference packages. The suite then checks that the reference implementation reproduces them.

## The files

There are 16 files. Each has a page here that shows its content, and each can be downloaded as it is in the repository.

| file | what it holds | covers |
|---|---|---|
| [`audit.json`](./vectors/audit.md) | Audit hash chain | SPEC.md section 13, "Audit" |
| [`auth.json`](./vectors/auth.md) | Handshake authentication proofs | SPEC.md section 5 |
| [`chat.json`](./vectors/chat.md) | Chat: texts, messages and who hears them | SPEC.md section 9 (chat.say, chat.read, chat.status), section 12 ("Chat") and section 13 ("Chat relay") |
| [`consent.json`](./vectors/consent.md) | Consent in protocol 0.2: requests that wait, offers at attach, a rule for a time, the rate cap | SPEC.md section 12 ("Requests that wait", "Offers at attach", "Levels and rules": a rule for a time and the rate cap) and the section 12 table |
| [`errors.json`](./vectors/errors.md) | Error codes | SPEC.md section 6 (the table of codes) and sections 4 to 16 |
| [`levels.json`](./vectors/levels.md) | Levels, rules and the decision for an act request | SPEC.md section 12, "Levels and rules" |
| [`limits.json`](./vectors/limits.md) | Default limits and fixed numbers | SPEC.md sections 3 to 13 |
| [`manifest.json`](./vectors/manifest.md) | Manifest digest and prompt card | SPEC.md section 7 |
| [`merge-patch.json`](./vectors/merge-patch.md) | JSON merge patch for state events | SPEC.md section 10 ("an RFC 7396 merge patch"); RFC 7396 section 2 and appendix A |
| [`methods.json`](./vectors/methods.md) | Agent methods, their scopes, and which take a surface id | SPEC.md section 9 table; section 6 (hub methods); section 8 (scope order) |
| [`origins.json`](./vectors/origins.md) | Origins: of a URL, in an allowlist, of hello.surface.url | SPEC.md section 5, "Origins" |
| [`pointer.json`](./vectors/pointer.md) | Binary pointer frames | SPEC.md section 11, "Pointer stream" (layout table and encoding of fractions) |
| [`policy.json`](./vectors/policy.md) | Policy profiles and action decisions | SPEC.md section 12 table and "Action decisions"; strictness allow < confirm < deny (section 12 "Two enforcement points": the stricter decision) |
| [`seal.json`](./vectors/seal.md) | Sealed-session keys and frame MACs | SPEC.md section 5, "Sealed sessions" |
| [`ui-delta.json`](./vectors/ui-delta.md) | UI-tree delta operations | SPEC.md section 10, "Applying a delta" and "Text rendering" |
| [`versions.json`](./vectors/versions.md) | Protocol versions and what a link on 0.1 leaves out | SPEC.md section 16 |

Each file is self-describing: `spec` names the section, `formula`, `layout` or `rule` restates the rule, and `note` explains the cases. Byte strings are hex, and base64url values are unpadded (RFC 4648 section 5).

## How to use them

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

Start with `auth.json` and `seal.json`. An implementation that reproduces those two has the proofs and the frame MACs right, which is what a handshake and a sealed session with the reference hub rest on.

## Regenerating

After a change to the specification:

```bash
node conformance/tools/make-vectors.mjs          # write vectors/*.json
node conformance/tools/make-vectors.mjs --check  # exit 1 if a file would change
```

The pages here are built from the files in the repository, so they always show what the suite checks.

## Further reading

- [Writing another implementation](./writing-an-implementation.md)
- [The conformance suite](./conformance-suite.md)
- [Requirements index](./requirements.md)
