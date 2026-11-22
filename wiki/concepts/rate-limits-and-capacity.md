# Rate limits and capacity

> The token buckets, capacities and admission rates that keep one agent, or a flood from either side, from exhausting the hub or freezing the page.

## Two answers: slow down, or no room

Limits answer with one of two codes.

- **`E_RATE`**: you are going too fast. A rate limit, an admission limit, or a cool-off after a refused prompt. Wait and try again.
- **`E_BUSY`**: there is no room right now. A capacity is reached, an attach or a consent prompt is pending, or a peer does not read.

## Requests

The hub keeps one token bucket per credential, surface and scope, sized by `policy.rates`, with a burst of one second. The bucket is shared by all of that credential's sessions, so opening more sessions does not buy more requests.

Requests per second by scope, per profile:

| scope | `open` | `guarded` | `kiosk` |
|---|---|---|---|
| `observe` | 30 | 20 | 20 |
| `act` | 30 | 20 | 10 |
| `ui` | 60 | 40 | 0 |
| `cursor` | 120 | 60 | 60 |
| `show` | 30 | 20 | 10 |
| `nav` | 2 | 1 | 0 |
| `chat` | 10 | 5 | 0 |

`hub.info` and `surfaces.list` share one bucket per credential: 10 a second, burst 20.

## Attaching

Each attach may put a prompt in front of a person, so:

- the hub forwards one attach at a time per credential and surface (`E_BUSY` for another);
- a credential gets a burst of 3 attaches per surface, then one every 2 s (`E_RATE`);
- a surface holds at most 32 grants at a time, and refuses an attach from a further agent with `E_BUSY` before it asks the person.

## Prompts

On the page: one pending prompt per agent and four in total (`E_BUSY`). After a refusal or a timeout, a cool-off of 2 s that doubles up to 60 s (`E_RATE`). See [Consent](./consent.md).

## Chat

`rates.chat` bounds `chat.say`, `chat.read` and `chat.status` together, per credential and page. At the hub each sender also has a budget of its own for each agent that listens, and none uses up another's: the person's messages 5 a second after a burst of 10, for each agent, and an agent's words no faster than its own `rates.chat`, after a burst of twice that. A message of the person that the hub does not relay is put on record, and the page shows it as not delivered. A message is at most 4000 characters, a status note 80, and the room keeps the last 200 messages. See [Chat](./chat.md).

## What the person sets

A page reports each level, rule and scope switch the person sets to the hub. A grant for which a surface reports more than 20 changes within one second is ended: no person makes them. So is a grant whose surface reports a change that lets the agent do more while the hub cannot write its audit log.

## Pointer streams

The points of all pointer streams one credential has open on one surface are capped at `policy.pointerRate` per second, a token bucket with a burst of one second. Every forwarded frame costs at least one point of rate. See [Cursor and the pointer stream](./cursor-and-pointer-stream.md).

## Capacity

By default a hub takes at most:

| What | Limit |
|---|---|
| surfaces | 64 |
| agents | 32 |
| sessions per credential | 4 |
| open streams per agent | 8 |

Beyond that: `E_BUSY`.

A peer whose send buffer at the hub holds more than max(8 MiB, 4 × `maxText`) after a send is not reading: it is sent `bye {code:"E_BUSY"}` and closed.

## Admission

Connections are admitted at a rate, too.

- **Surfaces** from an allowed origin are admitted by a token bucket per origin: 2 a second by default, with a burst of twice the surface capacity, so a full set of tabs can reconnect at once after a hub restart. All origins together get 5 times the rate and twice the burst. A full hub answers `E_BUSY` first; an attempt without a token is `E_RATE`.
- **Agent sessions** are admitted after a correct proof by a bucket per credential: 2 a second, burst 20, else `E_RATE`.

## Before authentication

A connection that has not authenticated gets very little:

- at most 16 handshakes may be pending or waiting out a delay; further connections are closed with `E_BUSY`;
- the hub holds at most 16 inbound messages and 64 KiB from it;
- a failed proof is answered after a delay that doubles, from 200 ms up to 3 s.

## On the page

The driver has a budget of its own: it runs queued commands at the start of each animation frame and stops when the frame has used 6 ms. Observations are size-bounded: names are cut to 120 characters and values to 200, and `read` returns at most 8000 characters.

## The audit log is bounded as well

At most 20 refusal records per second per connection and 20 failed-connection records per second overall are written, and 20 records per second per surface for reports of the person that change nothing. The excess is counted and written as one `suppressed` record. A change of what the person set is always recorded, and so is a message of the person that is relayed. See [The audit log](./audit-log.md).

## Changing the numbers

Rates and grant lifetimes are part of the policy: override them in the hub's policy. Capacities and admission rates are hub configuration (`maxSurfaces`, `maxAgents`, `maxStreams`, `surfaceAdmission`, `agentAdmission`, and `maxSessions` on a credential), given in the hub's configuration file. A hub refuses malformed configuration at start: a limit that is not a positive number stops it.

## Further reading

- [Limits](../reference/limits.md): every number, from the test vectors.
- [Specification, section 13](../reference/specification.md#13-hub-behaviour)
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T16 and T24.
