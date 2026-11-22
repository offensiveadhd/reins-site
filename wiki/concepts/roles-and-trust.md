# Roles and trust

> The three roles of the protocol, surface, agent and hub, and who is trusted with what.

## Three roles

```
  agent harness                 hub (loopback)                  browser tab
 ┌──────────────┐   reins.v1   ┌──────────────┐   reins.v1   ┌────────────────┐
 │ agent SDK    │◄────────────►│ broker       │◄────────────►│ driver         │
 │ or MCP tools │  ws / port   │ auth, grants │  ws / port   │ app actions,   │
 └──────────────┘              │ policy, audit│              │ UI tree, cursor│
                               └──────────────┘              └────────────────┘
```

- **Surface**: a web page that embeds the driver. It dials out to the hub, because a tab cannot listen.
- **Agent**: an AI harness, or an assistant running in another tab or in the same page.
- **Hub**: the broker both connect to. It authenticates peers, issues grants, enforces the hub policy and rate limits, routes requests and keeps the audit log.

The broker is transport-agnostic: the hub process binds it to WebSocket, a page can bind it to in-memory links. That is why Reins runs in two shapes with one protocol: [with a hub](../start/drive-from-node.md), or [in the tab](../start/in-tab.md).

Every connection has a role, `agent` or `surface`, stated in the handshake. Agents and surfaces never talk to each other directly. An agent sends a request to the hub with `s`, the id of the surface it means; the hub checks it and forwards it.

## Who is trusted with what

| Party | Trusted to | Not trusted to |
|---|---|---|
| App (the page that embeds the driver) | define actions, risk and policy | |
| Hub | authenticate, route, enforce hub policy, keep the audit log | |
| Agent | act within its grant | exceed scopes, skip consent, see private fields, set its own permission level, speak as the person or as another agent |
| The person at the page | approve, pause, stop, and say how much each agent is asked, within what the app and the hub offer; ask an agent for things in the chat | approve or change anything by what they type in the chat: that takes the prompt and the panel |
| Page content (text, names, values) | nothing | it is data, and may be written by an attacker |
| Chat text (what the person or an agent wrote) | nothing | it is data too: the person's request to an agent about the page, or another agent's words, never an instruction of the agent's operator |
| Other web pages, other machines, other local processes | nothing | |

In words:

- **The hub is trusted by both sides.** It is the one place that knows every credential and every grant.
- **The agent is constrained twice**: by the hub policy and by the surface policy. It is trusted to act within its grant and nothing more.
- **The surface enforces its own policy even though the hub already checked**, because the app owner's guardrails belong to the app. They hold even behind a misconfigured hub.
- **Page content is untrusted data from the agent's point of view.** Names, values and visible text may be written by an attacker, so everything a surface reports is presented to a model as data, never as instructions.
- **The person at the page** approves, pauses, stops, and says how much each agent is asked, within what the app and the hub offer. They can ask an agent for things in the chat. What they type there approves nothing and changes no permission: that takes the prompt and the panel.
- **Chat text is data too**: the person's request to an agent about the page, or another agent's words, never an instruction of the agent's operator. The person at a page is a visitor of that page.

## Two enforcement points

The hub evaluates its own policy on every request and either refuses, forwards, or forwards with a mark (`c:1`) that says a human confirmation is required. The surface evaluates the app's policy and takes the stricter of its decision and that mark.

The work is divided:

| The hub's job | The surface's job |
|---|---|
| authentication, sealing | exposure: what the tree shows |
| grants, scopes, expiry | privacy: what is never read or written |
| rate limits, capacity, admission | consent prompts |
| routing, the audit log | human control: indicator, Pause, Stop |
| capping the levels a person may set, enforcing the scopes they switch | the panel: levels, rules and scope switches, on the person's input alone |
| relaying a chat message only to the grant it names | the chat room: who hears whom, and that only the person speaks as the person |
| | refusing to run inside a frame |

See [Policy profiles](./policy-profiles.md).

## What a session id is not

Session ids (`a1` for an agent, `s1` for a surface) are labels. Nothing is authorised by knowing one. They are assigned in sequence, so an id reveals how many sessions of its kind connected before it; this is accepted.

A surface is identified by its origin, and proves more only with a [surface key](../guides/surface-keys.md). `SurfaceInfo.verified` tells an agent which surfaces proved a key, or were linked by code that embeds the broker and vouches for them, as an Electron main process does for a window it registered. For any other surface, the app id is only a claim.

## What an agent can learn before it is let in

An agent hears about a surface only if its credential may attach to it. Without a live grant that includes `observe`, the listing it gets is reduced: `url` is the origin and `title` is the app's name. The full URL and title go only to agents holding such a grant. A surface id that does not exist, and one naming a surface the credential may not attach to, get exactly the same answer: `E_NO_SURFACE`.

## Further reading

- [Handshake, authentication and sealed sessions](./handshake.md)
- [The security model](../reference/security-model.md): the threats considered, and what Reins does not protect against.
- [Specification, section 2](../reference/specification.md#2-roles)
