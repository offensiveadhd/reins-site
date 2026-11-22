# Glossary

> The words Reins uses, each in a sentence or two, with a link to the page that explains it.

**Activity.** The tab of the panel that lists the last 50 commands: time, agent, method or action name, outcome, and what let an action run. Never arguments, results or page text. See [Permission levels](../concepts/permission-levels.md#activity).

**Adopt.** To drive an Electron app you did not write: `reins-electron` loads the driver into its window through the app's debugging connection and carries its frames. An attached agent can then press anything in that window. See [Adopt an Electron app](../guides/adopting-an-electron-app.md).

**App origin.** The origin of a page on an app's own scheme, written `app://name`. `*` in an origin list does not cover it, nor `file://` or `null`: each has to be named. See [Handshake, authentication and sealed sessions](../concepts/handshake.md#origins).

**Action.** Something the app can do, declared with a name, a schema for its arguments and a risk tier, and called by an agent with `act`. See [Writing good actions and risk tiers](../guides/actions-and-risk.md).

**Agent.** An AI harness, or an assistant running in another tab or in the same page. One of the two roles a connection can have. See [Roles and trust](../concepts/roles-and-trust.md).

**Attach.** To ask for a grant on a surface, with `surface.attach`. The page decides, and under the `guarded` profile the person is asked. See [Grants and scopes](../concepts/grants-and-scopes.md).

**Attention.** The driver's event for the app (0.2): how many consent prompts are showing or queued and how many requests wait, whenever either changes, with nothing an agent wrote. For a taskbar flash or a notification. See [Human control](../concepts/human-control.md#drawing-the-persons-eye).

**Audit log.** The hub's append-only, hash-chained record of connections, grants and requests. See [The audit log](../concepts/audit-log.md).

**Always allow.** The third button of a consent card for an action. It sets the person's rule Allow for that action and agent, in two presses. See [Consent](../concepts/consent.md#the-third-button-always-allow).

**Broker.** The part of the hub that authenticates peers, issues grants, enforces policy and routes requests. It is transport-agnostic, so a page can host it too.

**Canonical JSON.** JSON without whitespace, with sorted keys and numbers written one way, so that two parties hash the same bytes. See [Manifest and prompt card](../concepts/manifest-and-prompt-card.md#canonical-json).

**Chat.** The page's one chat room, in the Chat tab of the panel: the person at the page and every attached agent whose grant holds the `chat` scope. A message is a request, never an approval. See [Chat](../concepts/chat.md).

**Chat relay.** Whether agents in the chat hear each other: the policy field `chatRelay`, `off`, `person` (once the person switches it on) or `on`. The stricter of the page's and the hub's applies.

**Confirm step.** The second step the panel shows before anything that lets an agent do more: it names the agent and what stops asking, and its button waits 500 ms. See [Permission levels](../concepts/permission-levels.md#loosening-takes-two-steps).

**Consent prompt.** The card the driver shows when policy answers `confirm`, for an attach or a sensitive action, with Deny, Allow and, for an action, Always allow. See [Consent](../concepts/consent.md).

**Credential.** What an agent authenticates with: a key id (`kid`), a key, and optional caps on scopes, origins and sessions. See [Handshake, authentication and sealed sessions](../concepts/handshake.md#agents).

**Cursor.** The agent's pointer, drawn by the driver so the person can follow. Visual only. See [Cursor and the pointer stream](../concepts/cursor-and-pointer-stream.md).

**Decision.** What policy answers: `allow`, `confirm` or `deny`.

**Delta.** What changed in the UI tree since an agent last looked: a list of `set` and `del` operations. See [Observation, handles and deltas](../concepts/observation.md#revisions-and-deltas).

**Driver.** The in-page runtime of the reference implementation: the UI tree, command execution, the cursor, the consent prompt and the indicator. See [Make an app drivable](../start/make-an-app-drivable.md).

**Exposure.** Which elements the UI tree shows: `auto`, `annotated` or `none`.

**Grant.** An agent's permission on one surface: a set of scopes and an expiry. See [Grants and scopes](../concepts/grants-and-scopes.md).

**Handle.** The id of an element in the UI tree, such as `e12`, stable for the element's lifetime.

**Hub.** The broker both sides connect to, and the process that binds it to a WebSocket on loopback.

**Indicator.** The pill the driver shows while an agent is attached, naming it, with Pause and Stop. Its text opens the panel, and it shows a level other than Ask and the person's Allow rules. See [Human control](../concepts/human-control.md).

**In-tab shape.** Reins with no hub process: the page hosts the broker, and the assistant and the driver talk over in-memory links. See [The in-tab shape](../start/in-tab.md).

**Kit.** The single entry point of the package for browser projects, `@offensiveadhd/reins`, and its bundle, `reins.js`.

**Later.** The answer on a consent card that puts the request off (0.2): it approves nothing, is taken at once like Deny, and sends the request to the waiting list. See [Requests that wait](../concepts/waiting-requests.md).

**Launcher.** `reins.mjs` in the Reins folder: a file that runs the shell tools of the installation that wrote it. See [Shell tools with nothing registered](../start/shell-tools.md).

**Level.** How much the person is asked about one agent's actions, set per grant in the panel: `strict`, `ask` (where a grant starts, unless the person set that agent to Strict earlier on the page), `auto` or `bypass`. See [Permission levels](../concepts/permission-levels.md).

**Link.** A bidirectional, ordered, reliable message pipe. WebSocket, `MessagePort` and the in-memory pair all present this shape. See [Transports and framing](../concepts/transports-and-framing.md).

**Manifest.** A surface's description of itself: its app, actions, views, state, exposure and profile. See [Manifest and prompt card](../concepts/manifest-and-prompt-card.md).

**Notice.** A line the MCP adapter and the shell tools put before a tool's own answer, starting `[reins]`: what the person set, how many chat messages wait. Never page text. See [Use it from Claude Code and other MCP harnesses](../start/mcp.md#notices-what-the-person-set).

**Offer.** An action the attach card lists under "Without asking each time" (0.2), from the app's `human.offer`, as a box the person may tick. A tick alone changes nothing; Allow then opens a second step whose button sets the rule Allow as the grant starts. See [Permission levels](../concepts/permission-levels.md#offers-on-the-attach-card).

**Overlay.** The indicator, the panel and the prompts: the driver's own controls, in a closed shadow root in the browser's top layer, taking only the person's own input.

**Panel.** What the indicator's text opens, for the person alone: the tabs Permissions, Activity and Chat. See [Permission levels](../concepts/permission-levels.md#the-panel).

**Pointer stream.** A binary channel for live cursor trajectories, with credit-based flow control. See [Cursor and the pointer stream](../concepts/cursor-and-pointer-stream.md#the-pointer-stream).

**Policy.** A profile plus overrides: the rules that turn a request into allow, confirm or deny. The hub has one and each surface has one. See [Policy profiles](../concepts/policy-profiles.md).

**Private field.** An element an agent must never read and, by default, never write: passwords, card numbers, one-time codes, and anything marked `data-reins="private"`. See [Privacy annotations](../guides/privacy-annotations.md).

**Profile.** One of three preset policies: `open`, `guarded` or `kiosk`.

**Protocol version.** What a hub and a peer agree on in the handshake, `0.2` or `0.1`, for one link. An implementation of 0.2 keeps to 0.1 on a link that negotiated it. See [Protocol versions](../reference/protocol-versions.md).

**Prompt card.** The short text, rendered from the manifest, that teaches a model to drive an app. See [Manifest and prompt card](../concepts/manifest-and-prompt-card.md#the-prompt-card).

**Rate cap.** `human.burst` (0.2): how many runs of one action by one agent whose prompt was waived go unasked within a stretch before the next call asks again. See [Permission levels](../concepts/permission-levels.md#a-cap-on-unasked-runs).

**Reins folder.** `~/.reins`, or the folder `REINS_HOME` names: where a hub announces itself and leaves the launcher.

**Risk tier.** An app's statement about an action: `safe`, `sensitive` or `dangerous`.

**Rule.** The person's decision for one action of one agent, set in the panel: Allow, Ask or Block (`allow`, `confirm`, `deny`). It beats the level and covers any arguments. Allow ends with the grant; Ask and Block stay with the agent for as long as the page lives. See [Permission levels](../concepts/permission-levels.md#rules-for-single-actions).

**Rule for a time.** A rule Allow set for `human.allowMs`, 15 minutes, instead of the whole grant (0.2). It ends by the clock, and the indicator says when. See [Permission levels](../concepts/permission-levels.md#a-rule-for-a-time).

**Scope.** A kind of thing an agent may do: `observe`, `act`, `ui`, `cursor`, `show`, `nav`, `chat`.

**Scope switch.** A switch in the panel that turns one scope of a grant off, and back on, for one agent. A request whose scope is off fails with `E_SCOPE`. See [Grants and scopes](../concepts/grants-and-scopes.md#scope-switches).

**Sealed session.** A session whose every message carries a MAC under keys derived from the shared secret and the handshake. See [Handshake, authentication and sealed sessions](../concepts/handshake.md#sealed-sessions).

**Semantic id.** The name an app gives an element with `data-reins-id`, addressed as `#name`.

**Session.** A connection's identity at the hub (`a1`, `s1`): a label, never a credential. Also the background process the shell tools keep, which holds a connection and its grant between commands.

**State.** A named piece of app state an agent may read, with a getter in the app.

**Surface.** A web page that embeds the driver. The other role a connection can have.

**Surface key.** A secret shared by the hub and a page, by app id, with which each proves itself to the other. See [Surface keys](../guides/surface-keys.md).

**Target.** How a request names an element: a handle or a semantic id, never a selector.

**Ticket.** What a request that waits is given (0.2): `tk` in the `E_WAITING` error, 22 random characters from the reference driver. The agent repeats the request with it once the person has allowed it, and it is used once. It names nothing without the agent session it was given to. See [Requests that wait](../concepts/waiting-requests.md).

**Token file.** The file that holds an agent's secret, by default `.reins/token` where the hub was started.

**Unverified hub.** What a page calls a hub whose proof it cannot check, because the page holds no key. Such a page never accepts an attach silently.

**View.** A named renderer the app offers for showing data, fed by `show.view`.

**Waiting list.** The panel's "Waiting for your answer" (0.2): requests nobody answered in time, or that the person put off with Later, for up to ten minutes, with Review, Discard and Take back. At most 3 of one agent and 12 in all. See [Requests that wait](../concepts/waiting-requests.md).
