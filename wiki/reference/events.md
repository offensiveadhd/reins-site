# Events

> The event topics, what each carries, who receives it and which need a subscription.

## The frame

Events are `evt {topic, d}`. A surface addresses one agent with `ag`, or omits it to reach every attached agent. The hub adds `s`, the surface the event is about, when it relays.

```json
{"t":"evt","topic":"ui","s":"s1","d":{"rev":14}}
```

## Topics

| topic | payload `d` | sent when | needs |
|---|---|---|---|
| `ui` | `{rev}` | The UI tree changed. At most once per 100 ms. It carries only the new revision: call `observe` for the delta. | `sub`, and the `observe` scope |
| `state` | `{name, patch}` | An exposed piece of app state changed. `patch` is an RFC 7396 merge patch against the value this agent last received. | `sub`, and the `observe` scope |
| `nav` | `{url, title}` | The page navigated. | `sub`, and the `observe` scope |
| `user` | `{kind}`: `override`, `pause` or `resume` | The person used the page while an agent was driving it (`override`), or pressed Pause or Resume. | `sub` |
| `user` | `{kind:"level", level}`, `{kind:"rule", a, d, ms?}`, `{kind:"relay", on}` | The person set something for this one agent in the panel: the level of its grant, a rule for one action (`d` is null when the rule was removed or its time ran out; `ms` on a rule `allow` set for a time says how long it lasts), or whether it hears the other agents in the chat. | nothing |
| `grant` | `{kind}`: `revoked` or `expired` | The grant ended: the person pressed Stop or refused three prompts in a row, or the hub ended it (`revoked`), or the grant reached its expiry or went idle (`expired`). | nothing |
| `grant` | `{kind:"scopes", scopes}` | The person switched scopes of the grant off or back on. `scopes` are those now in force. The grant goes on. | nothing |
| `user` | `{kind:"answer", tk, answer, a?}` | (0.2) The person answered a request of this agent that waited: `answer` is `allow`, `deny` or `expired`, `tk` the ticket, `a` the action's name for an `act` request. Sent with `ag` to that agent alone; an agent on protocol 0.1 is told nothing. See [Requests that wait](../concepts/waiting-requests.md). | nothing |
| `surface` | `{kind, surface}`: `added`, `gone` or `changed` | A surface connected, disconnected, or changed its listing. | nothing |
| `chat` | a message: `{id, from, text, ts, to?}` | Someone said something in the page's chat room that this agent may hear: the person, or another agent where the room relays those. Never the agent's own. | the `chat` scope |

## Subscribing

Agents opt into `ui`, `state`, `user` and `nav` with `sub {topics}`, and out with `unsub`. Both answer with the topics now subscribed. `grant`, `surface` and `chat` events need no subscription, and neither do the `user` events `level`, `rule`, `relay` and `answer`.

```js
await handle.subscribe(['ui', 'state', 'user']);
handle.on('ui', ({ rev }) => {});
handle.on('grant', (e) => {});       // { kind: 'revoked' | 'expired' } or { kind: 'scopes', scopes }
handle.on('user', (e) => {});        // also { kind: 'level', level }, { kind: 'rule', a, d }, { kind: 'relay', on }
handle.on('answer', (e) => {});      // the person answered a request that waited: { tk, answer, a? }
handle.on('chat', (message) => {});  // needs no subscribe
client.on('surface', ({ kind, surface }) => {});
```

## Who gets what

The hub relays an event only to live grants with the scope its topic needs: `ui`, `state` and `nav` need `observe`, and `user` goes to every live grant.

`surface` events come from the hub alone:

- `added` and `gone` go to every agent that may attach to that surface;
- `changed` goes only to agents holding a grant on it.

An agent hears about a surface only if its credential may attach to it. Without a live grant that includes `observe`, the `SurfaceInfo` in the event is reduced: `url` is the origin and `title` is the app's name.

## What a surface may not send

A `grant` event from a surface is acted on by its kind and never relayed as it came: `revoked` ends grants, `scopes` changes the scopes of one grant, and any other kind is dropped. The `user` events `level`, `rule` and `answer` say what the person set, or answered, for one agent: the hub checks and records them, and then tells that agent alone. On a link that negotiated protocol 0.1 the hub sends none of the kinds 0.2 added, and drops those a 0.1 surface could not have sent ([Protocol versions](./protocol-versions.md)). A `surface` event sent by a surface is dropped, as is an event with an unknown topic.

A `chat` event is never broadcast. A surface sends it once for each agent that is to hear the message, and the hub relays it to that grant alone, while the grant holds `chat`, in an event built from the checked fields, with the sender's name as the hub gave it. The hub takes no event from an agent, so an agent cannot send one.

Within a version, receivers ignore unknown event topics.

## State patches

A merge patch cannot express a property whose value is null, so such a property reads as absent. A state that differs from the last one only in null properties, or not at all, produces no event.

## Further reading

- [Observation, handles and deltas](../concepts/observation.md)
- [Human control](../concepts/human-control.md)
- [Specification, section 6](./specification.md#6-requests-responses-events)
