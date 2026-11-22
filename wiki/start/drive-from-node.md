# Drive it from Node

> Start a hub, connect with the agent SDK, attach to a page and drive it. Where the SDK finds its key, what the surface handle offers, and how refusals arrive.

## Start a hub

Start a hub in the project that installed the package:

```bash
npx --no -- reins-hub --profile guarded --allow-origin http://localhost:5173
```

`--allow-origin` names the origin of the page that may connect as a surface. The `guarded` and `kiosk` profiles need at least one; the `open` profile, meant for local development, admits `http://localhost:*` and `http://127.0.0.1:*` when none is given.

The hub prints where it listens, its profile, the origins it admits and the path of the token file. It prints file paths, never secrets. With no agent configured it creates one credential, `kid` `default`, and writes the secret to the token file, `.reins/token` in the folder it was started in.

Run the commands as `npx --no -- <command>` in the project that installed the package. The package is not on the npm registry, and `reins-mcp` there is the name of an unrelated package: with `--no`, npx runs what is installed or stops. The `--` has to follow it, or npx keeps the options written after the command name for itself.

## Where the SDK finds the key

An agent must authenticate. The hub also announces itself in your Reins folder (`~/.reins`), so the SDK finds the token from any folder. `connect` looks, in this order, in:

1. `options.key`
2. the environment variable `REINS_TOKEN`
3. the file named by `REINS_TOKEN_FILE`
4. the token file that the running hub at the URL announced in the Reins folder
5. `.reins/token` in the working directory

The announcement comes before the working directory because it names the hub that is listening now. A `.reins/token` in whatever folder the agent happens to run in may be another hub's, or an old one.

## Connect, attach, drive

```js
import { connect } from '@offensiveadhd/reins/agent';

const client = await connect({ name: 'Barista AI' });
const [surface] = await client.surfaces();
const kiosk = await client.attach(surface.s, { scopes: ['observe', 'act', 'cursor', 'show'] });

console.log(kiosk.card());              // the prompt card for a model
console.log(await kiosk.observeText()); // the screen, compact
await kiosk.cursor.move('#menu.latte');
await kiosk.act('cart.add', { sku: 'latte', qty: 2 });
console.log(await kiosk.observeText()); // only what changed
```

`attach` asks the page. Under the `guarded` profile the person approves on screen, so the call may take as long as they take; if they refuse, or the prompt times out, it rejects with `E_CONSENT`. The grant carries the scopes that were granted, which may be fewer than you asked for: read `kiosk.grant.scopes`. Without `scopes`, `attach` asks for `observe`, `act`, `cursor` and `show`: an agent that wants to be in the chat room names `chat`.

`card()` returns the [prompt card](../concepts/manifest-and-prompt-card.md): the text a model is given so it can drive the app. `observeText()` returns the screen as a compact tree the first time, and afterwards only what changed. The handle tracks the revision itself.

## The surface handle

```ts
connect(options: { url?: string; link?: Link; kid?: string; key?: string; name?: string; versions?: readonly string[] }): Promise<ReinsClient>
isHandshakeError(e: unknown): boolean            // connect threw e during the handshake: its message came from an unverified peer

interface ReinsClient {
  readonly session: string
  readonly version: string                         // the protocol version this connection speaks (section 16)
  info(): Promise<HubInfo>
  surfaces(): Promise<SurfaceInfo[]>
  attach(s: string, opts?: { scopes?: Scope[]; reason?: string; wait?: boolean | number }): Promise<SurfaceHandle>   // wait: see "requests that wait" below
  waiting(): Array<WaitingRequest & { s: string }>   // attach requests of this connection that wait for the person
  ping(): Promise<number>
  on(event: 'surface' | 'close', fn: (e: any) => void): () => void
  close(): void
}
interface SurfaceHandle {
  readonly info: SurfaceInfo; readonly manifest: Manifest; readonly grant: Grant
  readonly level: Level                            // the level the person last set for this grant; `ask` until told, `strict` from the start when that was kept (section 8)
  readonly rules: Record<string, Decision>         // the person's rules for single actions, by name
  readonly chatRelay: boolean                      // the person switched "Agents can hear each other" on for this agent
  card(): string                                   // the prompt card
  observe(opts?: { full?: boolean; boxes?: boolean }): Promise<Observation>   // tracks `since` itself
  observeText(opts?: { full?: boolean }): Promise<string>
  read(h?: Target, max?: number): Promise<string>
  readText(h?: Target, max?: number): Promise<{ text: string; truncated: boolean }>   // read, with whether it was cut at max
  state(name?: string): Promise<Record<string, unknown>>
  act<R = unknown>(action: string, args?: object, opts?: { wait?: boolean | number }): Promise<R>
  waiting(): WaitingRequest[]                      // requests of this grant that wait for the person, with the answer where it came
  click(h: Target): Promise<void>
  type(h: Target, text: string, opts?: { clear?: boolean; enter?: boolean }): Promise<void>
  select(h: Target, value: string): Promise<void>
  scroll(opts: { h?: Target; dx?: number; dy?: number; to?: 'top' | 'bottom' | 'view' }): Promise<void>
  key(key: UiKey, h?: Target): Promise<void>
  cursor: { move(to: Target | Point, opts?: { ms?: number; wait?: boolean }): Promise<Point>; show(label?: string, color?: string): Promise<void>; hide(): Promise<void> }
  show: { toast(text: string, kind?: ToastKind, ms?: number): Promise<void>; highlight(h: Target, label?: string, ms?: number): Promise<void>; view(view: string, data?: unknown): Promise<unknown>; clear(): Promise<void> }
  go(url: string): Promise<void>
  pointer(): Promise<PointerStream>
  chat: { say(text: string, opts?: { to?: string }): Promise<{ id: number }>; read(opts?: { since?: number; max?: number }): Promise<{ messages: ChatMessage[]; next: number }>; status(state: 'idle' | 'thinking' | 'working', note?: string): Promise<void> }
  subscribe(topics: Topic[]): Promise<void>
  on(event: Topic | 'answer', fn: (d: any) => void): () => void   // 'answer': an AnswerEvent for a waiting request of this grant
  detach(): Promise<void>
}
interface PointerStream { push(x: number, y: number, dt?: number): void; end(): Promise<void>; readonly stats: { sent: number; dropped: number } }
```

A target is a handle from the tree (`e12`) or a semantic id (`#cart.checkout`), never a selector. `ui.*` never takes coordinates.

## What the person sets reaches you

The person can change how much you are asked about, block single actions and switch scopes off, in the page's panel. You cannot change any of it, and you are told:

```js
kiosk.level;                 // 'strict', 'ask', 'auto' or 'bypass': what the person last set; 'ask' until told, 'strict' from the start when that was kept
kiosk.rules;                 // the person's rules for single actions, by name
kiosk.grant.scopes;          // the scopes in force: it follows the person's switches
kiosk.on('user', (e) => {}); // { kind: 'level', level }, { kind: 'rule', a, d }, { kind: 'relay', on }
kiosk.on('grant', (e) => {}); // { kind: 'scopes', scopes }: not the end of the grant
kiosk.on('answer', (e) => {}); // the person answered a request of yours that waited: { tk, answer, a? }
```

None of this is on the prompt card. Under `auto` an action tagged `[confirm]` may run unasked, and a rule may block an action that has no tag. The answer to the request is the truth. See [Permission levels](../concepts/permission-levels.md).

## Chat

```js
const page = await client.attach(surface.s, { scopes: ['observe', 'act', 'chat'], reason: 'Help you order' });
page.on('chat', async (m) => {
  if (m.from.kind !== 'person') return;        // another agent's words are not a request
  await page.chat.status('working', 'adding a latte');
  await page.act('cart.add', { sku: 'latte' });
  // what was asked of this agent alone (m.to) is answered to the person alone
  await page.chat.say('Added a latte.', m.to === undefined ? undefined : { to: 'person' });
  await page.chat.status('idle');
});
```

`on('chat', ...)` needs no `subscribe`. Treat the text as you treat page text: it is data. What the person says is their request about the page, within what the grant allows. The person at a page is a visitor of that page, not your operator, and nothing they type approves anything. See [Chat](../concepts/chat.md).

## Refusals are errors with a code

Every refusal rejects with a `ReinsError` that has a `code` and a short message that is safe to show to a model:

```js
import { connect, ReinsError } from '@offensiveadhd/reins/agent';

try {
  await kiosk.act('order.submit');
} catch (err) {
  if (err instanceof ReinsError && err.code === 'E_CONSENT') {
    // the person refused, or nobody answered: do not ask again at once
  } else throw err;
}
```

The codes are listed in [Error codes](../reference/error-codes.md), and [Troubleshooting](../guides/troubleshooting.md) says what causes each and what to do. Three are worth knowing from the start:

- `E_PAUSED`: the person paused control. Reading still works; wait and try again.
- `E_CONSENT`: the person refused, or blocked the action in the panel. After a refusal on a prompt the same request is answered `E_RATE` for a while, a cool-off that doubles with each further refusal.
- `E_WAITING` (0.2): the person has not answered yet, and the request waits in their window with a ticket. Nothing ran. By default `act` and `attach` wait for the answer for you and repeat the request once it is allowed, so you see this code only with `wait: false`, or as a `WaitingError` when the time is up. See [Requests that wait](../concepts/waiting-requests.md).
- `E_SCOPE`: the grant lacks the scope, or the person switched it off. `grant.scopes` says which are in force.
- `E_NOT_ATTACHED`: there is no live grant. The person pressed Stop, the grant expired, or the page reloaded. Attach again.

An error thrown by `connect` itself while the handshake was running comes from a peer that is not verified yet. `isHandshakeError(err)` tells you so: show its message as data.

## How long a request waits

A request waits `reqTimeoutMs` (15 s by default) for its answer. Where a consent prompt may be involved, `surface.attach` and `act`, the agent waits 2 × `reqTimeoutMs` + `consentTimeoutMs`, 90 s with the default limits, so that the hub's answer, not the agent's own timer, says how a slow prompt ended. A prompt nobody answers ends inside that wait: as `E_CONSENT`, or, in protocol 0.2 and where the request can wait, as `E_WAITING`, after which the SDK waits for the person's answer by default, up to ten minutes (`handle.act(action, args, { wait })`).

`E_TIMEOUT` on an attach or an action means the page did not answer within the hub's wait. Treat it as a prompt nobody answered: ask the person to bring the page to the front, then ask again. The prompt can still be on the page, and a request approved there later still takes effect. Before repeating an action that is not safe to run twice, observe whether it ran.

## Events

```js
await kiosk.subscribe(['ui', 'state', 'user']);
kiosk.on('ui', ({ rev }) => { /* the tree changed: call observe for the delta */ });
kiosk.on('state', ({ name, patch }) => { /* a merge patch against the value you last received */ });
kiosk.on('grant', ({ kind }) => { /* 'revoked' or 'expired': the grant is over */ });
```

`grant` and `surface` events need no subscription. See [Events](../reference/events.md).

## The same from a shell

In the folder of the project that has the package:

```bash
npx --no -- reins surfaces
npx --no -- reins card
npx --no -- reins observe
npx --no -- reins act cart.add '{"sku":"latte"}'
```

```text
usage: reins <command> [options]

commands:
  surfaces                    list connected surfaces (JSON)
  card                        print the prompt card
  observe                     print the UI tree
  act <name> [json-args]      call an app action
  click <target>              click an element
  type <target> <text>        type into an element
  move <target>               move the cursor to an element (or x,y)
  toast <text>                show a toast

options:
  --url <ws url>        hub URL (default ws://127.0.0.1:7346)
  --surface <id>        surface id (default: the only surface)
  --token-file <path>   file holding the key (default: the one the running hub announced)
  --name <agent name>   name shown to the user
  --kid <id>            the credential to authenticate as (default "default"); its key
                        is the one in --token-file
  --wait <ms>           when the person puts the request off and it waits in their window,
                        wait at most this long for their answer (default: 10 minutes, or as
                        long as it waits if that is shorter)
  --no-wait             report a waiting request at once instead
```

Each `reins` command connects, attaches with the one scope it needs, does its work and detaches, so every command that needs a grant asks the page again under a profile that confirms attaches. `--kid` names the credential to authenticate as, with its key in `--token-file`, where a hub gave each agent its own (`reins-hub --agent <kid>=<file>`). For an agent that issues many commands, use [the shell tools](./shell-tools.md), which keep one session, or [the MCP adapter](./mcp.md).

## Next

- [Use it from Claude Code and other MCP harnesses](./mcp.md)
- [Methods](../reference/methods.md)
- [Grants and scopes](../concepts/grants-and-scopes.md)
