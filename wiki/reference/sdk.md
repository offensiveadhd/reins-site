# SDK API

> The public API of the reference implementation. The driver for pages, the agent SDK, the broker and the hub, the MCP adapter, and the core every part is built on.

## One package, several entry points

| Import | Use it for | Runs in |
|---|---|---|
| `@offensiveadhd/reins` | The kit: `createDriver`, `connect`, `Broker`, `linkPair`, `randomToken`, `ReinsError` and the protocol types | browser, Node |
| `@offensiveadhd/reins/driver` | Making a page drivable | browser |
| `@offensiveadhd/reins/agent` | Driving a page from an agent | browser, Node |
| `@offensiveadhd/reins/broker` | Hosting the broker yourself, for example inside the tab | browser, Node |
| `@offensiveadhd/reins/hub` | The loopback WebSocket hub, `startHub` | Node |
| `@offensiveadhd/reins/mcp` | The MCP adapter, `createReinsMcpServer` | Node |
| `@offensiveadhd/reins/core` | Wire types, codec, policy, crypto, links | browser, Node |
| `@offensiveadhd/reins/electron` | An Electron window as a surface: `reinsMain`, `preloadPath` | Electron main process |
| `@offensiveadhd/reins/electron/renderer` | The page half, `electronLink` | Electron page |
| `@offensiveadhd/reins/electron/adopt` | Adopting an app through its debugging connection | Node |

The signatures on this page are taken from section 15 of the specification when the site is built. There, the packages go by their internal names: `@reins/driver` is `@offensiveadhd/reins/driver`, and so on.

## The driver

`@offensiveadhd/reins/driver`, also exported by the kit. Browser only.

```ts
createDriver(options: {
  app: AppInfo
  hub?: string                       // ws URL, default ws://127.0.0.1:7346
  link?: Link                        // use this link instead of a WebSocket
  key?: string                       // surface key, when the hub requires one
  policy?: PolicyInput               // default 'guarded'
  consent?: (req: ConsentRequest) => Promise<boolean>
  indicator?: boolean                // default true
  reconnect?: boolean                // default true, with backoff 0.5 s to 10 s
  root?: Element                     // subtree to expose, default document.body
}): Driver

interface Driver {
  action<A = any>(def: ActionDef, handler: (args: A, ctx: CommandContext) => unknown | Promise<unknown>): this
  view<D = any>(def: ViewDef, render: (data: D, ctx: CommandContext) => unknown | Promise<unknown>): this
  state(name: string, get: () => unknown, description?: string): this
  notify(name?: string): void        // an exposed state changed
  connect(): Promise<void>           // resolves once the hub has welcomed the surface
  disconnect(): void
  on(event: 'status' | 'attach' | 'detach' | 'command' | 'level' | 'rule' | 'scopes' | 'chat', fn: (e: any) => void): () => void
  readonly status: 'idle' | 'connecting' | 'ready' | 'controlled' | 'paused' | 'offline'
  readonly manifest: Manifest
  readonly policy: Policy
  readonly hubVerified: boolean      // the session is sealed, or the app supplied the link
  agents(): AttachedAgent[]          // a copy: each attached agent with what the person set for it
  pause(): void; resume(): void; stop(): void
}
interface AttachedAgent { agent: AgentInfo; level: Level; scopes: Scope[]; granted: Scope[]; rules: Record<string, Decision> }
interface CommandContext { agent: AgentInfo; scopes: Scope[] }
interface ConsentRequest { kind: 'attach' | 'action'; agent: AgentInfo; scopes?: Scope[]; action?: ActionDef; args?: unknown; reason?: string; hubVerified?: false; kept?: string[] }   // kept: on an attach, what the person tightened for this agent before and that stays, one line each
```

Actions, views and state are registered before `connect()`. `createDriver` throws when the profile is `kiosk` and the driver would dial a hub without a `key`. `connect()` rejects with `E_DENIED`, and connects to nothing, in a page inside a frame whose policy does not set `framed`.

The events `level`, `rule` and `scopes` fire when the person changes one in the panel, and `agents()` returns each attached agent with what the person set for it. The API only reads them: nothing in it sets a level, a rule or a scope switch, and no option opens the panel. The event `chat` says who posted a message and how long it is, not its text, and nothing in the API posts a message or reads the transcript.

Guides: [Make an app drivable](../start/make-an-app-drivable.md), [Writing good actions and risk tiers](../guides/actions-and-risk.md).

## The agent SDK

`@offensiveadhd/reins/agent`, also exported by the kit. Node and browser.

```ts
connect(options: { url?: string; link?: Link; kid?: string; key?: string; name?: string }): Promise<ReinsClient>
isHandshakeError(e: unknown): boolean            // connect threw e during the handshake: its message came from an unverified peer

interface ReinsClient {
  readonly session: string
  info(): Promise<HubInfo>
  surfaces(): Promise<SurfaceInfo[]>
  attach(s: string, opts?: { scopes?: Scope[]; reason?: string }): Promise<SurfaceHandle>
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
  act<R = unknown>(action: string, args?: object): Promise<R>
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
  on(event: Topic, fn: (d: any) => void): () => void
  detach(): Promise<void>
}
interface PointerStream { push(x: number, y: number, dt?: number): void; end(): Promise<void>; readonly stats: { sent: number; dropped: number } }
```

`connect` reads the key from `options.key`, else `REINS_TOKEN`, else the file named by `REINS_TOKEN_FILE`, else the token file that the running hub at `options.url` announced in the Reins folder, else `.reins/token` in the working directory (Node only).

`attach` asks for `observe`, `act`, `cursor` and `show` unless told otherwise: an agent that wants to be in the chat room names `chat`. `grant.scopes` holds the scopes in force and follows the person's switches; `level` and `rules` hold what the person last set. An agent cannot change any of it.

Guide: [Drive it from Node](../start/drive-from-node.md).

## The broker and the hub

`@offensiveadhd/reins/broker` is isomorphic: it runs in Node and in a page. `@offensiveadhd/reins/hub` is Node only and binds the broker to a loopback WebSocket.

```ts
// @reins/hub/broker: isomorphic, runs in Node and in a page
interface AgentCredential { kid: string; key: string; name?: string; scopes?: Scope[]; origins?: string[]; surfaces?: string[]; maxSessions?: number }
interface BrokerConfig {
  name?: string
  agents: AgentCredential[]
  surfaces: { origins: string[]; requireKey?: boolean; keys?: Record<string, string>; pins?: Record<string, string> }
  policy?: PolicyInput
  limits?: Partial<Limits>
  audit?: AuditSink
  auditKey?: string                              // keys the audit chain with HMAC-SHA256
  maxSurfaces?: number; maxAgents?: number; maxStreams?: number
  surfaceAdmission?: { rate?: number; burst?: number }   // per origin; defaults 2/s, 2 x maxSurfaces
  agentAdmission?: { rate?: number; burst?: number }     // per credential; defaults 2/s, 20
  now?: () => number
}
interface LinkMeta { origin?: string; remote?: string; role?: Role; vouched?: boolean }   // role: the only role the link may take, else E_ORIGIN; vouched: the embedder built the link, the surface is verified
interface AuditSink { write(record: AuditRecord): void; readonly last?: { seq: number; hash: string } }   // throwing means the log is unavailable
class Broker {
  constructor(config: BrokerConfig)              // throws a TypeError on malformed configuration, keys shorter than 32 characters included
  accept(link: Link, meta?: LinkMeta): void      // runs the hub side of the handshake, then serves the peer
  info(): HubInfo
  auditHead(): { seq: number; hash: string } | undefined
  flushAudit(): Promise<void>
  close(): void
}
memoryAudit(): AuditSink & { records: AuditRecord[] }
verifyAuditChain(records: AuditRecord[], opts?: { key?: string; head?: { seq: number; hash: string } }): Promise<{ ok: boolean; badSeq?: number }>

// @reins/hub: Node only
interface HubOptions extends BrokerConfig { host?: string; port?: number; auditFile?: string; surfaceSockets?: boolean }   // surfaceSockets false: agents only on the socket
startHub(opts: HubOptions): Promise<{ broker: Broker; port: number; url: string; close(): Promise<void> }>
fileAudit(path: string, opts?: { key?: string; head?: { seq: number; hash: string } }): AuditSink   // one JSON record per line; verifies an existing log first, throws if it is broken

// the user's Reins folder: REINS_HOME, else .reins in the home folder
reinsHome(env?: NodeJS.ProcessEnv): string
announceHub(hub: Omit<HubFile, 'v'>, home?: string): string     // writes hub-<port>.json and returns its path
withdrawHub(port: number, pid: number, home?: string): void     // only the announcement of that process
readHubFile(port: number, home?: string): HubFile | undefined
writeLauncher(target: string, home?: string): string            // writes reins.mjs, which runs the shell tools at `target`
pidAlive(pid: number): boolean
ensureOwnerDir(dir: string): void                               // creates missing directories owner-only
writeOwnerOnlyNew(file: string, text: string): void             // a new owner-only file; refuses to replace one
```

```js
import { startHub } from '@offensiveadhd/reins/hub';

const hub = await startHub({
  agents: [{ kid: 'default', key }],
  surfaces: { origins: ['http://localhost:5173'] },
  policy: 'guarded',
});
console.log(hub.url);
// ...
await hub.close();
```

The `Broker` constructor throws a `TypeError` on malformed configuration, keys shorter than 32 characters included. Guides: [The in-tab shape](../start/in-tab.md), [The audit log](../concepts/audit-log.md).

## The MCP adapter

`@offensiveadhd/reins/mcp`. Node only.

```ts
createReinsMcpServer(options?: {
  url?: string            // hub URL, passed to the SDK's connect
  key?: string            // else the SDK's own lookup
  kid?: string
  name?: string           // agent name shown to the user, default "mcp-agent"
  scopes?: Scope[]        // scopes requested on attach, default observe, act, ui, cursor, show, chat
  dataDir?: string        // directory reins_show may read files from; unset disables `file`
  notices?: Notices       // post notices of your own into the same tool results
  chatMeta?: boolean      // also give the messages of a reins_chat result as data, in the result's _meta
}): McpServer
```

It returns a server of the MCP TypeScript SDK; connect it to a transport yourself. The `reins-mcp` command does that with stdio. Guide: [Use it from Claude Code and other MCP harnesses](../start/mcp.md).

## Electron

`@offensiveadhd/reins/electron` for the main process, `/electron/bridge` for a preload of your own, `/electron/renderer` for the page, and `/electron/adopt` for adopting an app that was not built for Reins. Nothing in the package imports `electron`.

```ts
// @reins/electron: the main process. Nothing in the package imports `electron`.
mainPortLink(port: MessagePortMainLike): Link                  // the main-process end of a MessageChannelMain
reinsMain(options: {
  ipcMain: IpcMainLike
  MessageChannelMain: new () => { port1: MessagePortMainLike; port2: MessagePortMainLike }
  accept(link: Link, meta: { origin: string; vouched: true }): void   // (link, meta) => broker.accept(link, meta)
  channel?: string                                             // IPC channel, default "reins"
  onRefused?(reason: string, event: IpcMainEventLike): void
}): ReinsMain
interface ReinsMain {
  allow(target: BrowserWindow | WebContents, options?: {
    url?: string | string[] | ((url: string) => boolean)       // the page the window is registered for; needed for file:// and null
    hidden?: boolean                                           // link the window while it is not shown
    embedded?: boolean                                         // link a <webview> guest
  }): () => void                                               // returns a function that takes it back
  close(): void
}
preloadPath: string                                            // the ready-made preload script, one CommonJS file

// @reins/electron/bridge: the preload script
exposeReins(electron: { contextBridge; ipcRenderer }, win?: Window, channel?: string): void   // puts window.reinsElectron in the page

// @reins/electron/renderer: the page (also dist/bundle/reins-electron.js)
electronLink(options?: { timeoutMs?: number; window?: Window }): Promise<Link>   // E_GONE without the preload, E_DENIED when refused, E_TIMEOUT

// @reins/electron/adopt: Node, for an app that was not built for Reins
class Cdp { constructor(t: CdpTransport); send<R>(method: string, params?: object, sessionId?: string): Promise<R>; on(fn: (e: CdpEvent) => void): () => void; onClose(fn: () => void): void; close(): void; readonly closed: boolean }
pipeTransport(toBrowser: Writable, fromBrowser: Readable): CdpTransport   // --remote-debugging-pipe: JSON texts, each ended by a zero byte
wsTransport(url: string): Promise<CdpTransport>
debugEndpoint(target: string): { host: string; port: number; ws?: string }   // throws for anything but a loopback address
adopt(options: {
  cdp: Cdp
  pageSource: string                                           // the text of dist/bundle/reins-adopt.iife.js
  app: AppInfo
  connect: { link(link: Link, page: { origin; url; title }): boolean | Promise<boolean> }    // a broker in this process
         | { hub: string; transport?: 'auto' | 'ws' | 'bridge'; key?: string }                // a hub that runs elsewhere
  levels?: Level[]                                             // levels the person may set besides strict and ask; default none
  scopes?: Scope[]                                             // scopes an agent may be granted; default those of guarded
  exclusive?: boolean                                          // false for a debugging port, which other programs can use: nothing is vouched for, no key is given
  match?(target: { type: string; url: string; title: string }): boolean
  log?(line: string): void
  leaseMs?: number                                             // how long a document goes on without hearing this process; default 10 s
}): Promise<{ pages(): { origin; url; title }[]; stop(): Promise<void>; close(): void }>   // stop: every driver ends for good
hubEndpoint(url: string): string                               // throws for anything but ws:// on a loopback address
portBrowser(end: { host; port }): Promise<{ id; ws; product; userAgent } | undefined>   // the browser behind a debugging port
closePortBrowser(end, same: (b) => boolean, waitMs?: number): Promise<'none' | 'other' | 'closed' | 'still'>   // Browser.close over the port
pagePolicy(options?: { levels?: Level[]; scopes?: Scope[] }): PolicyInput   // the policy of an adopted page, and of the hub hosted for it
```

Guides: [Electron: build Reins into your app](../guides/electron.md), [Adopt an Electron app](../guides/adopting-an-electron-app.md).

## The core

`@offensiveadhd/reins/core`: wire types, codec, schema validation, the policy engine, flow control, crypto, links and RPC. Isomorphic, no dependencies. It holds everything in `protocol.ts`, plus:

```ts
// everything in protocol.ts, plus:

// codec
encodeFrame(f: Frame): string
decodeFrame(text: string, maxBytes?: number): Frame            // throws ReinsError E_BAD_FRAME / E_TOO_LARGE
encodePointer(f: PointerFrame): Uint8Array                     // clamps x, y to 0..1 and dt to 0..65535
decodePointer(bytes: Uint8Array): PointerFrame                 // throws E_BAD_FRAME
binaryKind(bytes: Uint8Array): number
utf8Length(text: string): number

// schema
validate(schema: Schema | undefined, value: unknown): string | null   // null when valid, else "path: reason"
checkSchema(schema: unknown): string | null                           // is this a well-formed Schema
schemaSignature(schema: Schema | undefined): string                   // "(sku: "latte"|"mocha", qty?: int 1..9)"

// manifest
validateManifest(m: unknown): Manifest                         // throws E_BAD_ARGS / E_TOO_LARGE
canonicalJson(v: unknown): string                              // section 7; throws E_BAD_ARGS when nested deeper than 100, cyclic or BigInt
manifestDigest(m: Manifest): Promise<string>
renderCard(m: Manifest, ctx?: { surface?: SurfaceInfo; scopes?: Scope[]; policy?: Policy }): string

// policy
resolvePolicy(input?: PolicyInput): Policy                     // validated deep copy of a preset plus overrides
decideAction(policy: Policy, action: { name: string; risk: Risk }): Decision
decideAct(q: { base: Decision; risk: Risk; c?: boolean; level: Level; rule?: Decision; offered: Level[] }): { outcome: 'run' | 'prompt' | 'denied' | 'blocked'; by?: 'policy' | 'level' | 'rule'; remember?: boolean }   // section 12, levels and rules
capLevels(...lists: Level[][]): Level[]                        // the levels on offer: `strict` and `ask`, and `auto` and `bypass` where every list names them
allowRulePermitted(risk: Risk, offered: Level[]): boolean      // may the rule `allow` waive a prompt the policy demands
actionDecisions(policy: Policy, actions: { name: string; risk: Risk }[]): Record<string, Decision>   // what a hub sends in attach as `decisions`
hubDecision(decisions: unknown, name: string): Decision        // what a surface reads from it: `confirm` for anything missing or malformed
keptSettings(v: unknown, granted: Scope[], actions: Iterable<string>): { level?: 'strict'; rules: Map<string, 'confirm' | 'deny'>; off: Scope[] }   // what a hub reads from `kept` in an attach answer: only what tightens
stricter(a: Decision, b: Decision): Decision
capScopes(requested: Scope[], ...caps: (Scope[] | undefined)[]): Scope[]   // intersection, canonical order
methodScope(m: string): Scope | undefined
navAllowed(policy: Policy, url: string, pageUrl: string): boolean
originAllowed(origin: string, patterns: string[]): boolean
urlOrigin(url: string): string | null                          // section 5, "Origins"; null when `url` is not a URL
urlHasOrigin(url: string, origin: string): boolean             // does hello.surface.url have the connection's origin

// chat (sections 9, 12 and 13)
chatText(v: unknown): string | undefined                       // trimmed, 1 to CHAT_MAX_TEXT characters, well-formed; undefined otherwise
chatNote(v: unknown): string | undefined                       // a status note on one line, at most CHAT_MAX_NOTE characters, '' when absent; undefined otherwise
chatMessage(v: unknown): ChatMessage | undefined               // a message off the wire, rebuilt from its checked fields
chatAudience(q: { relay: readonly string[]; from: 'person' | { agent: string }; to?: string; members: readonly string[] }): { outcome: 'post'; hear: string[] } | { outcome: 'nobody' } | { outcome: 'refuse'; code: 'E_BAD_ARGS' | 'E_DENIED' }   // section 12, who is sent a message; relay: the agents that hear each other
chatRelayMode(v: unknown): 'off' | 'person' | 'on' | undefined   // a value of policy.chatRelay; true is on, false is off
stricterRelay(a: ChatRelay, b: ChatRelay): ChatRelay            // off before person before on
chatDataLines(text: string): string[]                          // a chat text as "| " lines for a model: cut at every line break and separator, no control character left raw
chatPlain(s: string): string                                   // control characters but tab as \u{XX}
chatIdShown(id: string): string                                // a session id as it is printed outside quotes: letters, digits and . _ - only
chatWellFormed(text: string): string                           // a lone surrogate becomes U+FFFD
isChatState(v: unknown): boolean                               // idle, thinking or working

// observation
diffNodes(prev: UiNode[], next: UiNode[]): TreeOp[]
applyOps(nodes: UiNode[], ops: TreeOp[]): UiNode[]
renderTree(nodes: UiNode[]): string
renderOps(ops: TreeOp[], prev?: UiNode[]): string              // with `prev`, new (+) and replaced (~) nodes are told apart and anchors are hidden
renderObservation(o: Observation, prev?: UiNode[]): string     // header line plus tree or delta

// state deltas (RFC 7396)
mergeDiff(from: unknown, to: unknown): unknown                 // undefined when equal; a null property counts as absent on both sides
mergeApply(target: unknown, patch: unknown): unknown

// flow control
class TokenBucket { constructor(ratePerSec: number, burst?: number, now?: () => number); take(n?: number): boolean }
class CreditWindow { constructor(initial?: number); readonly available: number; consume(n: number): boolean; grant(n: number): void }
class CreditGranter { constructor(window: number); consumed(n: number): number }   // returns credit to send now, or 0
class PointerCoalescer { constructor(maxBacklog?: number); push(p: PointerPoint): void; take(max: number): PointerPoint[]; readonly size: number; readonly dropped: number }
playbackRate(queuedMs: number): number                         // 1 up to 120 ms of lag, rising linearly to 4 at 600 ms

// crypto (WebCrypto)
randomToken(bytes?: number): string
b64urlEncode(bytes: Uint8Array): string
b64urlDecode(text: string): Uint8Array
sha256(data: string | Uint8Array): Promise<string>             // base64url
hmacSha256(key: string, msg: string): Promise<string>          // base64url
timingSafeEqual(a: string, b: string): boolean
peerProof(key: string, f: { role: Role; kid: string; nonce: string; cnonce: string }): Promise<string>
hubProof(key: string, f: { role: Role; kid: string; nonce: string; cnonce: string }): Promise<string>

// links
linkPair(): [Link, Link]                                       // in-memory, ordered, asynchronous delivery
wsLink(ws: WebSocketLike): Promise<Link>                       // resolves when the socket is open
portLink(port: MessagePortLike): Link

// rpc
class Peer {
  constructor(link: Link, handlers: PeerHandlers, opts?: { limits?: Partial<Limits>; now?: () => number; maxBuffered?: number })   // over maxBuffered bytes waiting after a send: bye E_BUSY
  request<R = unknown>(m: string, p?: object, opts?: { timeoutMs?: number; ag?: string; c?: 1 }): Promise<R>
  event(topic: Topic, d?: unknown, extra?: { s?: string; ag?: string }): void
  sendBinary(bytes: Uint8Array): void
  flow(ch: number, credit: number): void
  ping(timeoutMs?: number): Promise<number>                    // round-trip time in ms
  bye(code?: ErrorCode | 'OK', msg?: string): void             // sends bye and closes
  readonly closed: boolean
  readonly lastSeen: number
  readonly bufferedAmount: number
}
interface PeerHandlers {
  request?(m: string, p: Record<string, unknown>, frame: ReqFrame): unknown | Promise<unknown>   // throw ReinsError to refuse
  event?(frame: EvtFrame): void
  binary?(bytes: Uint8Array): void
  flow?(frame: FlowFrame): void
  close?(code: ErrorCode | 'OK' | 'E_GONE', msg?: string): void
}
clientConnect(link: Link, hello: { role: Role; name: string; kid?: string; key?: string; surface?: SurfaceHello }, opts?: { timeoutMs?: number }): Promise<{ welcome: WelcomeFrame; link: Link; sealed: boolean }>
clientHandshake(link, hello, opts?): Promise<WelcomeFrame>     // unauthenticated sessions only; rejects when given a key

// sealed sessions
deriveSealKeys(key: string, t: { nonce; cnonce; challengeText; helloText; welcomeText }, side: 'peer' | 'hub'): Promise<SealKeys>   // directional keys from the secret and the transcript; E_AUTH on a text that is not well-formed
sealLink(link: Link, keys: SealKeys): Link                     // a Link that seals what it sends and opens what it receives
hubSeal(link: Link, handshake: { key; nonce; cnonce; challengeText; helloText; welcomeText }, opts?): Promise<Link>   // the hub's half, with key confirmation

// the user's Reins folder: names and shapes only, no file access
HOME_DIR                                                       // ".reins"
LAUNCHER_FILE                                                  // "reins.mjs"
SESSION_ID_PATTERN                                             // 1 to 32 letters, digits, "-" or "_"
hubFileName(port: number): string                              // "hub-7346.json"
sessionFileName(port: number, id: string): string              // "session-7346-default.json"
parseHubFile(text: string): HubFile | undefined                // { v: 1, url, port, pid, started, profile, origins, tokenFile?, managed? }
parseSessionFile(text: string): SessionFile | undefined        // { v: 1, port, pid, secret, hub, name, started }
hubPort(url?: string): number | undefined                      // the port a ws URL names; the default port without a URL
```

`clientConnect` runs the handshake and, when a key was used, returns the sealed link after key confirmation. Build the `Peer` on the link it returns. `Peer` answers `ping` itself, turns a thrown `ReinsError` into an error response and anything else into `E_INTERNAL`, and fails pending requests with `E_GONE` when the link closes. It runs no timers of its own: the owner of a connection sends `ping` when the link has been idle.

## The wire types

Every frame, method, event and data shape is a TypeScript type in [`packages/core/src/protocol.ts`](https://github.com/offensiveadhd/reins/blob/main/packages/core/src/protocol.ts). That file is the single source of truth for the wire contract, and holds types and constants only. The kit re-exports the types an app needs.

## Further reading

- [Specification, section 15](./specification.md#15-reference-implementation)
- [CLI](./cli.md)
