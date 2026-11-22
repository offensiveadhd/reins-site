# The audit log

> What the hub records about every connection, grant and request, how the records are chained so that edits show, and why the hub refuses to act when it cannot record.

## What is recorded

The hub appends one record for each connection, attach, detach and grant end, for every refused request, and for every `act`, `ui.*`, `nav.*`, `show.view`, `show.toast`, `show.highlight`, `chat.say`, `stream.open` and `surface.attach` request.

`cursor.*`, `show.clear`, `chat.read`, `chat.status` and pointer frames are not audited.

## What the person did is on record too

The hub also appends records of kind `person`:

- one for each level, rule and scope report that changes what the hub holds for a grant: the agent, the surface, `method` (`level`, `rule` or `scopes`), the action name for a rule, `value` (the level; the rule's decision, or `none` for a rule removed; the scopes in force) and the outcome `ok`, `refused`, or `kept` for what a grant starts with because the person tightened it for that agent before;
- one for each message of the person that it relays to an agent: `method` `chat`, the agent, the surface, `chars` (the length of the text) and `args`, a digest of the text;
- one for a message of the person that it did not relay, with the reason as its outcome (`E_RATE`, `E_INTERNAL`, `E_TOO_LARGE`);
- one for what the person switched for one agent in the chat: `method` `relay` and `value` `on` or `off`.

A relay of an agent's words that the hub did not hand over is a record of kind `chat`: `method` `relay`, the outcome `dropped` (beyond the budget) or `refused` (the policy does not let the two hear each other), and the agent that spoke.

**The text of a chat message is never written to the audit log.** A message is on record by its length and its digest. Levels, scope lists and the names of actions with a rule are recorded in clear, like action names.

## A record

| Field | What it is |
|---|---|
| `seq` | The record's number, counting from 1. |
| `ts` | When, in epoch milliseconds. |
| `kind` | `connect`, `disconnect`, `attach`, `detach`, `grant.end`, `request`, `stream`, `audit`, `person` or `chat`. |
| `agent`, `surface` | The session ids involved. |
| `method`, `action` | The method, and for `act` the action name. |
| `outcome` | `ok`, an error code, `accepted`, `refused`, or for a grant end the reason it ended. |
| `value`, `chars` | On `person` records: what the person set, and the length of a chat message. |
| `args` | A digest of the request's parameters. Never the parameters themselves. |
| `ms` | The duration. |
| `ref` | On the outcome of an accepted request: the `seq` of its `accepted` record. |
| `prev`, `hash` | The chain: the hash of the record before, and this record's own. |

## Arguments are never logged in clear

`args` covers the request params without `s`: `b64url(HMAC-SHA256(auditKey, canonical JSON))` when the hub has an audit key, else `b64url(SHA-256(canonical JSON))`.

Without a key, a reader of the log can still test guesses of low-entropy arguments, a PIN or a quantity, against `args`. The same goes for short chat messages ("yes", "cancel my order"). Key the log where that matters.

## The chain

```text
hash = b64url(SHA-256(prev + "\n" + canonicalJson(record without hash)))
```

or, when the hub has an audit key, `b64url(HMAC-SHA256(auditKey, ...))` of the same input. `prev` is the `hash` of the record before, and the empty string for the first record.

What the chain shows depends on how it is set up:

- The **unkeyed** chain shows corruption and careless edits. Anyone who can write the file can rewrite it consistently.
- Only the **keyed** chain shows an edit by someone who can write the file.
- **Truncation** shows only against the **head**, `{seq, hash}` of the last record, which the hub writes next to the log and which should be kept somewhere the log's writer cannot change.

A hub refuses to continue a log whose chain or head does not verify.

## Recorded before it happens

For a request that is audited when it succeeds, an `accepted` record is written before the request is forwarded, and the outcome record that follows refers to it with `ref`. An action cannot have run without a trace of it having been let through.

## Fail closed

When the log cannot be written, or more than 1000 records are waiting, audited requests and attach fail with `E_INTERNAL`, no chat message is relayed, the person's or an agent's, and a reported change that lets an agent do or hear more ends its grant. Requests that are not audited are still served, and a change that tightens is taken.

So an agent cannot act while nothing is recorded, apart from the visual methods that are never audited.

## Turning it on

```bash
npx --no -- reins-hub --profile kiosk --allow-origin http://localhost:5173 \
  --audit .reins/audit.jsonl --audit-key-file .reins/audit-key
```

- `--audit <path>` writes one JSON record per line. The hub keeps the chain's head in `<path>.head`, replaced through a temporary file and a rename.
- `--audit-key-file <path>` keys the chain and the argument digests. A file that does not exist is created with a random key.

The audit log, like the token and key files, is restricted to the current user. An existing log is refused on POSIX if group or others have any permission on it, and restricted to the current user again on Windows. The hub reads an existing log first and refuses it when a line is longer than 1 MiB, the last line is incomplete, or the chain or the head does not verify.

On a kiosk, ship the log and its head off the machine, and verify the chain against the head on arrival.

## Verifying a log

```js
import { verifyAuditChain } from '@offensiveadhd/reins/broker';

const result = await verifyAuditChain(records, { key, head });
// { ok: true }, or { ok: false, badSeq } naming the first record that does not verify
```

A broker that runs in a page keeps its log wherever the page tells it to: `memoryAudit()` is a sink that keeps the records in memory. The [playground](../../playground.html) uses it, and its Audit tab shows the records as they are written.

## What the log does not protect

An audit log without a key or without an external head can be rewritten or cut by anyone who can write the file. Activity that is not audited still flows while the log cannot be written. Both are listed in [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against).

## For implementers

An unkeyed and a keyed chain to verify are in the test vectors: [`audit.json`](../implementers/vectors/audit.md).

## Further reading

- [Kiosk deployment](../guides/kiosk-deployment.md)
- [Specification, section 13](../reference/specification.md#13-hub-behaviour)
