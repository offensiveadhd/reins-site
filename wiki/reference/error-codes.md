# Error codes

> The complete list of error codes in protocol 0.1, what each means and where the specification uses it.

## The codes

A request that fails is answered `res {re, ok:false, e:{code, msg}}`. Error messages are short and safe to show to a model. They never contain stack traces, file paths or secrets.

There are 19 codes, and the list is closed:

| code | meaning |
|---|---|
| `E_BAD_FRAME` | malformed frame, unknown frame type, a frame out of place |
| `E_VERSION` | no protocol version in common |
| `E_AUTH` | missing or wrong proof, surface key required, key confirmation failed |
| `E_ORIGIN` | the connection's origin, or `hello.surface.url`, is not allowed for the role; a surface on a socket that takes agents only |
| `E_TOO_LARGE` | a frame, request, manifest, result or set of consent arguments over its limit |
| `E_UNKNOWN_METHOD` | the method does not exist |
| `E_BAD_ARGS` | params fail validation |
| `E_NO_SURFACE` | no such surface id, or a surface the credential may not attach to |
| `E_NOT_ATTACHED` | no live grant for this surface |
| `E_SCOPE` | the grant lacks the method's scope, the person switched that scope off, or no requested scope is permitted |
| `E_DENIED` | policy says no |
| `E_CONSENT` | the person refused or blocked the action, or the prompt timed out |
| `E_PAUSED` | control is paused, the indicator cannot be shown, or the person is using the page |
| `E_RATE` | a rate or admission limit, or a consent cool-off |
| `E_NO_TARGET` | the target is not a live, exposed, enabled element, or is read-only |
| `E_TIMEOUT` | the other side did not answer in time |
| `E_GONE` | the other side disconnected |
| `E_BUSY` | a capacity, a pending attach or consent prompt, a permission that changed while the request waited, or a peer that does not read |
| `E_INTERNAL` | an unexpected failure, the audit log unavailable, a result that is not JSON |

`bye` also takes `OK`. A receiver reads an unknown code in a `res` as `E_INTERNAL` and in a `bye` as `E_GONE`.

## Where each is used

From the conformance vectors, with the section of the specification first:

| code | where the specification uses it |
|---|---|
| `E_BAD_FRAME` | 4: invalid JSON, unknown t, missing field |
| `E_VERSION` | 16 no common version |
| `E_AUTH` | 5 failed hello, surface key required, key confirmation failed, transcript not well-formed |
| `E_ORIGIN` | 5 origin not allowed for an agent credential or on the surface allowlist; surface url of another origin; 3 a surface on a socket that takes agents only |
| `E_TOO_LARGE` | 4 oversize frame; 9 act result over 32 KiB; 12 consent arguments too large |
| `E_UNKNOWN_METHOD` | 6 and 16 unknown method |
| `E_BAD_ARGS` | 6 params nested too deeply; 9 unknown action, args fail the schema, a chat text or note out of bounds; 12 a chat `to` that names no other agent that hears the speaker |
| `E_NO_SURFACE` | 6 unknown surface id, or one the credential may not attach to |
| `E_NOT_ATTACHED` | 8 no live grant |
| `E_SCOPE` | 8 empty scope intersection, grant lacks scope, scope switched off by the person |
| `E_DENIED` | 5 manifest pin; 8 attach deny; 9 act deny, private target, nav, stream.open without coordinates; 12 a chat `to` from an agent that no other agent hears |
| `E_CONSENT` | 8 attach refused; 9 act refused; 12 third refusal revokes, the person's rule deny |
| `E_PAUSED` | 9 pause; 12 indicator not usable, the person keeps using the page |
| `E_RATE` | 8 attach burst; 11 pointer rate; 12 cool-off; 13 token buckets and admission |
| `E_NO_TARGET` | 9 disabled, unknown, detached, unexposed or read-only target |
| `E_TIMEOUT` | 6 request timeout |
| `E_GONE` | 6 surface disconnected with requests pending |
| `E_BUSY` | 5 more than 16 pending handshakes; 8 attach in flight, more than 32 grants on a surface; 9 prompt up (chat.say and chat.status included), a permission that changed while the request waited; 12 prompts; 13 capacity, a peer that does not read |
| `E_INTERNAL` | 9 handler threw, result not JSON; 13 audit unavailable |

## Reading them

A few distinctions save time:

- **`E_DENIED` or `E_CONSENT`.** Policy said no, or a person did: on a prompt, or by blocking the action in the panel. `E_DENIED` will not change if you ask again. `E_CONSENT` might, later, and asking again at once after a refused prompt is answered `E_RATE`.
- **`E_RATE` or `E_BUSY`.** Too fast, or no room. Both pass. `E_BUSY` is also the answer while a consent prompt is up, to chat as to everything else, and when a permission changed while the request waited: send it again.
- **`E_NO_SURFACE` or `E_NOT_ATTACHED`.** The surface is not there for you, or it is and you hold no grant on it.
- **`E_SCOPE` or `E_DENIED`.** Your grant does not cover this kind of thing, or the person switched that scope off, or it does and this particular thing is refused.
- **`E_PAUSED`.** Not a refusal of the request: the person holds the reins right now.

[Troubleshooting](../guides/troubleshooting.md) says, for every code, what usually causes it and what to do.

## In the SDK

Every refusal rejects with a `ReinsError`:

```js
import { ReinsError } from '@offensiveadhd/reins';

try {
  await handle.act('order.submit');
} catch (err) {
  if (err instanceof ReinsError) console.log(err.code, err.message);
}
```

An action handler in the app refuses the same way: `throw new ReinsError('E_BAD_ARGS', 'that drink is not in the order')`. Anything else a handler throws reaches the agent as `E_INTERNAL` with a generic message.

## In tool results

The MCP adapter and the shell tools print an error as `error <code>: <message>`. When the message was relayed from a page it is marked `[page data]`, and when it came from a handshake that did not finish, `[unverified hub data]`.

## For implementers

The list is in the test vectors: [`errors.json`](../implementers/vectors/errors.md).
