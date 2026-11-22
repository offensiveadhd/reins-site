# Requests that wait

> A prompt nobody answered, or one the person put off with "Later", is not a refusal in protocol 0.2. The request waits in the panel for ten minutes, the agent gets E_WAITING with a ticket, and an approved request runs once when the agent asks again.

## The problem it solves

A person who is not looking at the page misses a prompt. In protocol 0.1 that was a refusal after `consent.timeoutMs`: the agent got `E_CONSENT`, and the person never knew what it had asked. In 0.2, where a request can wait, nobody's absence refuses anything.

## As the person sees it

A prompt for an action or for an attach has one more answer, **Later**, on the left with Deny. Above the buttons one line says what happens if nobody answers: "Goes to the waiting list in N s". Later, like Deny, is taken at once: it approves nothing. Either way the request joins the page's *waiting list*, and the card goes.

- **The indicator says how many wait** ("1 waiting"). With no agent attached and a request to connect in the list, the indicator is shown for that alone: it reads "An AI agent is waiting to connect", not that one is connected, and it opens the panel.
- **The panel lists them** above the agents, under "Waiting for your answer": for each the agent, the action's name and risk (or that the agent wants to connect), when it was asked and until when it waits. Never the arguments.
- **Review** opens the request's prompt again as it was asked: the same card with the same arguments, under every rule a prompt has (the arming delays, the rule for keys, scrolling to the end, nothing an agent drew beside it). Allow there approves that one request; Deny refuses it; Later, or no answer, leaves it in the list.
- **Discard** refuses a request without a card. Neither Discard nor a reviewed Deny counts toward the three refusals that revoke a grant.
- **After an approval** the list says that the agent is told and that the request goes ahead when the agent asks again, until when, with **Take back**, which withdraws the approval the agent has not used yet.

An entry lasts `consent.waitMs` from when it joined the list, ten minutes under `open` and `guarded`, judged by the clock; an approval lasts until then too. The `kiosk` profile has no list (`consent.waitMs: 0`): a kiosk visitor is not the owner, and a prompt nobody answers there is refused as before.

The activity list shows that a request waited and what the person did with it, with the action's name and never its arguments.

## As the agent sees it

The answer is the error `E_WAITING` with `data: {tk, ms}`: `tk` is a ticket, `ms` how long from now the request waits. Nothing ran. When the person answers, the agent is told with `evt user {kind:"answer", tk, answer, a?}`: `answer` is `allow`, `deny` or `expired`, and `a` the action's name for an `act` request. An approved request is not run by the page by itself: the agent repeats the same request with the ticket, `act {a, args, tk}` or `surface.attach {s, scopes, reason, tk}`, and it runs once, without a prompt. The approval is then used up and is not remembered.

The same request sent again while it waits (the same agent session, the same action with arguments equal as canonical JSON, or the same scopes for an attach) shows no new card and gets `E_WAITING` again, with the same ticket and the time left. A ticket that is unknown, used, lapsed or another agent's names nothing: such a request is put to the person like one without a ticket. An approval outranks nothing the person or a policy says: a policy `deny`, or a Block the person set meanwhile, refuses the request all the same.

What each way in does with it:

| You use | What happens on `E_WAITING` |
|---|---|
| the agent SDK | `handle.act()` and `client.attach()` wait for the answer by default, up to ten minutes or as long as the request stays in the list, and repeat the request with its ticket once it is allowed. A refusal or no answer in time is `E_CONSENT`. `wait: false` throws the `WaitingError` at once (`ticket`, `ms`, `action`, `code`, `data`); a number waits at most that long. `handle.waiting()` and `client.waiting()` list what waits, and `on('answer', ...)` gets each answer. The same call made again is the repeat. |
| the MCP adapter or the shell tools | The error is in the adapter's words: that the request waits in the person's window, that nothing ran, how long it stays, and that the same call with `wait` (milliseconds, at most 150 000) waits for the answer and runs the request once it is allowed. `reins_act` and `reins_attach` take `wait`. A `[reins]` notice tells the answer with the next result, and the surface listing shows `waiting=N` for a page where N requests of this agent wait. |
| the `reins` command | Waits for the answer unless told `--no-wait` or `--wait <ms>`, and says that its connection, and the request with it, end with the command. |

What to do with it, as an agent: tell the person, in the chat if you are in it, what you asked and that it waits in their window, and do not ask them for the approval there. A chat message approves nothing; the card does.

## When a request can wait

All of this has to hold: the page's policy has `consent.waitMs` above 0; the page has the panel and the indicator, where the person finds the list; the prompt is the driver's own (an app's own consent handler cannot be opened again); the hub speaks 0.2, and so does the agent's own link, which the hub tells the page with `v` in `attach`; and the list has room. An agent on 0.1 could never come back with a ticket, so its request never waits, and a 0.2 hub turns an `E_WAITING` toward such an agent into `E_CONSENT` ([Protocol versions](../reference/protocol-versions.md)).

## Bounds

- The list holds at most 3 requests of one agent and 12 in all. Where a request could not join, its prompt has no Later, and with no answer it ends as `E_CONSENT`.
- A prompt nobody answered and one put off with Later move the [cool-off](./consent.md#what-keeps-prompts-honest) as a timeout does, so an agent cannot throw one prompt after another by having them put off; they count as no refusal.
- An agent's entries end with its grant, however it ends: a `detach` for that agent, a new attach of its own that replaces the grant, Stop, the link to the hub closing. Where the agent can still be told, it is: `expired` for each entry, or `deny` after Stop.
- A request's time runs from when it reached the page, never longer than the hub's own wait, and is read from the clock when the person answers. No wait here relies on a timer firing: an entry past its time is gone the moment anything looks at it.

## At the hub

The hub relays an `E_WAITING` with `{tk, ms}` and nothing else of its data; one without a well-formed ticket and time, or on anything but `act` and `attach`, is a bad answer from the surface (`E_INTERNAL`). It keeps the ticket for that agent session and surface, with the request it was given for: at most 3 for one session on one surface and 16 in all, and over either the agent is answered `E_BUSY` instead of a ticket. A `tk` on `act` or `surface.attach` is forwarded only when it is a ticket the hub keeps for this session, this surface and this request; any other is `E_BAD_ARGS` before anything reaches the surface, in the same words whether it is unknown, another session's, used, lapsed or for another request. A ticket is used up the moment its check passes, so of two repeats at once one is forwarded. An `answer` is taken only for a ticket the hub keeps, recorded as a `person` record and relayed to that agent alone. When an agent whose attach waits leaves the hub, or the hub gives up on an attach the surface did not answer in time, the hub sends the surface `detach {why:"hub"}` for that agent, and the surface drops its prompt and its entries. The [audit log](./audit-log.md) carries the ticket on the request that waited, on the repeat and on the answer.

## What it does not protect against

From the security model: a request approved from the waiting list runs later than it was asked. The person approves what the card shows, as it was asked up to ten minutes earlier; the page may have changed since, and an action whose meaning depends on what is on the page acts on what is there when the agent asks again. An app whose actions are like that should give them arguments that say what is meant, or set `consent.waitMs` to 0. And a prompt on a page that did not run for longer than the hub's `reqTimeoutMs` gets its prompt after the hub told the agent `E_TIMEOUT`; the hub withdraws an attach it stopped waiting for, but cannot withdraw a single action. See [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against).

## Try it

In the [playground](../../playground.html), run the assistant and press **Later** when it asks to place the order. The indicator reads "1 waiting", the Script tab shows `E_WAITING` with the ticket, and the Wire tab the frame. Open the panel, press Review under "Waiting for your answer", and Allow: an `evt user` with `kind: "answer"` crosses the wire, the assistant repeats `act order.submit` with `tk`, and the order is placed. Discard instead, and the assistant gets `E_CONSENT`.

## For implementers

The requirements are the `WT-` entries (the surface), `WH-` (the hub) and `CT-` (a request's time) of the [requirements index](../implementers/requirements.md); the cases are in the test vectors [`consent.json`](../implementers/vectors/consent.md). The normative text is "Requests that wait" in [section 12 of the specification](../reference/specification.md#12-policy) and "Requests that wait" in [section 13](../reference/specification.md#13-hub-behaviour); the threats are T76 to T78 and T84 to T87 in [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them).
