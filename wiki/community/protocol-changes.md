# How to propose a protocol change

> What a change to the wire format or to normative behaviour has to touch, and how versioning lets implementations survive it.

## Where the protocol stands

Protocol 0.2 is the current version and 0.1 the one before it: an implementation of 0.2 still speaks 0.1 with a peer that knows no other ([Protocol versions](../reference/protocol-versions.md)). The wire format may change before 1.0, and a version change is announced in the handshake. 0.2 was added that way, next to 0.1, and the side that stayed on 0.1 needed no change; [What's new in 0.2](./whats-new-0.2.md) says what it brought.

The repository does not define a formal process for changes: no proposal template and no review board. What it does have is a set of checks that every change to the protocol has to pass, and they describe what a complete proposal looks like. This page explains them.

## What counts as a protocol change

Anything another implementation would have to follow:

- a new or changed frame, method, event, error code or data shape;
- a change to a formula two parties compute independently: proofs, seal keys and MACs, canonical JSON, the pointer frame, delta application, the prompt card;
- a change to a normative sentence of the specification (MUST, SHOULD, MAY);
- a change to a limit or a default the specification states;
- a change to one of the 16 security requirements of section 14.

A change inside the reference implementation that no peer can observe is not a protocol change.

## What a change has to touch

In one pull request:

1. **`docs/SPEC.md`.** The behaviour, in normative words. Say what a receiver does with input it does not expect.
2. **`packages/core/src/protocol.ts`.** The wire types. The file's own rule: if the specification and the types ever disagree, fix both in one change.
3. **`conformance/requirements.json` and a test.** Each new normative sentence needs an entry that quotes it and names at least one test. The meta-test fails otherwise, and it also fails when a quote no longer occurs in the specification, so an edited sentence needs its entry updated.
4. **The vectors**, when a computed value changes. Edit the generator, `conformance/tools/make-vectors.mjs`, which computes from the specification's formulas with `node:crypto` only, then regenerate. Do not edit the JSON by hand.
5. **The reference implementation**, with its own tests.
6. **`docs/SECURITY.md`**, when the change moves what an attacker can do: a new row in the threat table, or a new entry under what Reins does not protect against.
7. **This wiki**, where a page explains what changed. Pages that include tables from the specification follow by themselves.

## Compatibility

Within a version:

- receivers ignore unknown fields on frames;
- receivers ignore unknown event topics;
- receivers refuse unknown methods with `E_UNKNOWN_METHOD`;
- a receiver reads an unknown error code in a response as `E_INTERNAL` and in a `bye` as `E_GONE`.

So a change that only adds an optional field, an event topic, a method or an error code can be made without breaking a peer that does not know it. A peer that does not know a new method refuses it; an agent has to cope with that.

A change that alters what existing frames mean, or what two parties compute, needs a new version. `challenge.v` lists the versions the hub speaks; the peer picks one and states it in `hello.v`; no common version is `E_VERSION`.

## Before you write the pull request

Open an issue in the repository and describe the problem first, before the solution. A protocol change is easier to accept when it is clear what cannot be done today. Useful things to include:

- what you are trying to build, and where 0.2 stops you;
- whether the change is additive or needs a version;
- which party enforces it, the hub or the surface, and what a hostile agent could do with it;
- what it costs in tokens: the protocol's economy is a goal, not an accident.

The security requirements set the bar for anything that gives an agent a new ability: it has to be covered by a scope, a rate, the policy, and where it matters the person's consent, and it must not evaluate anything an agent supplied.

## If you maintain another implementation

Say so in an issue. Nothing in the repository tracks other implementations yet, and a change is easier to judge when its cost to others is known.

## Further reading

- [Writing another implementation](../implementers/writing-an-implementation.md)
- [Requirements index](../implementers/requirements.md)
- [Specification, section 16](../reference/specification.md#16-versioning)
- [Contributing](./contributing.md)
