# Electron: build Reins into your app

> An Electron app you write is a surface with no socket on the page side. Three small pieces, one per place Electron runs your code, and what origin your page has.

## An Electron window is a page

An Electron window is a Chromium page, so everything Reins does in a browser tab works in it: the UI tree, the app's own actions, the cursor, the consent prompt, the indicator, the panel with its [permission levels](../concepts/permission-levels.md), and the [chat](../concepts/chat.md). What differs is how the page reaches a hub, and what its origin is.

| You have | Use | The page reaches the hub by |
|---|---|---|
| An Electron app you are writing | `@offensiveadhd/reins/electron` | a `MessagePort` from the main process |
| An Electron app somebody else wrote | `reins-electron -- <executable>` | the app's debugging connection |
| A web app in a browser tab | the driver, as in the [README](https://github.com/offensiveadhd/reins/blob/main/README.md#make-an-app-drivable) | `ws://127.0.0.1:7346` |

This page is about the first row. For the second, see [Adopt an Electron app](./adopting-an-electron-app.md).

> [!NOTE]
> The [Electron guide](../reference/electron-guide.md) marks every statement about a real Electron. **Run** names the scenario of `npm run test:electron` that checks it. **Stand-ins** means it is checked by the conformance suite with Electron played by test doubles. **Not run** means it was written from source code and documentation and never tried. This page keeps those marks. Not tested at all: a packaged app, macOS and Linux.

## Three pieces

The example app in [`examples/electron`](https://github.com/offensiveadhd/reins/tree/main/examples/electron) is these three pieces and nothing else.

**The main process** hosts the broker and decides which windows may be surfaces:

```js
// main.mjs
import { app, BrowserWindow, ipcMain, MessageChannelMain, protocol } from 'electron';
import { startHub } from '@offensiveadhd/reins/hub';
import { preloadPath, reinsMain } from '@offensiveadhd/reins/electron';

// A scheme of the app's own gives its pages a real origin, app://notes (section 2).
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true } }]);

app.whenReady().then(async () => {
  // protocol.handle('app', ...) goes here: serve your files.

  const hub = await startHub({
    agents: [{ kid: 'default', key }],          // a 32-byte secret, from a file only you can read
    surfaces: { origins: ['app://notes'] },     // the origin of your own window
    surfaceSockets: false,                      // surfaces come over the port, never the socket
    policy: 'guarded',
  });

  const reins = reinsMain({
    ipcMain,
    MessageChannelMain,
    accept: (link, meta) => hub.broker.accept(link, meta),
  });

  const win = new BrowserWindow({
    webPreferences: { preload: preloadPath, contextIsolation: true, sandbox: true },
  });
  // Only this window may ask for a link, and only while it shows this page.
  reins.allow(win, { url: 'app://notes/index.html' });
  await win.loadURL('app://notes/index.html');
});
```

**The preload** is ready-made. `preloadPath` names one CommonJS file that needs nothing but `electron`, which is all a preload may load under `sandbox: true`. It puts one function in the page and hands the port the main process sends on to the page. It keeps nothing and decides nothing. If the window already has a preload, call the same code from it:

```js
// your-preload.js
import { exposeReins } from '@offensiveadhd/reins/electron/bridge';
import { contextBridge, ipcRenderer } from 'electron';
exposeReins({ contextBridge, ipcRenderer });
```

**The page** asks for its link and gives it to the driver:

```js
// renderer
import { createDriver } from '@offensiveadhd/reins/driver';
import { electronLink } from '@offensiveadhd/reins/electron/renderer';

const driver = createDriver({
  app: { id: 'notes', name: 'Notes', version: '1.0.0' },
  link: await electronLink(),
  policy: 'guarded',
});
driver.action({ name: 'note.add', description: 'Add a note.', risk: 'safe', params: { /* ... */ } }, ({ text }) => addNote(text));
await driver.connect();
```

A page without a build step imports the same two things from files of the package: `dist/bundle/reins-driver.js` and `dist/bundle/reins-electron.js`.

## What that gives you

- **No socket on the page side.** The link is a `MessageChannelMain` between your main process and your page. It works under any Content Security Policy: the example page runs with `connect-src 'none'`. Run (`builtin`).
- **The link counts as verified.** The consent prompt does not carry the "unverified hub" mark, because the link never leaves your app. Run (`builtin`).
- **`surfaceSockets: false` closes the hub's socket to surfaces.** Agents still connect to it with their token. A connection to that socket cannot become a surface, whatever `Origin` it writes. Run (`builtin`). A hub started from the command line takes the same with `reins-hub --no-surface-sockets`.
- **Agents outside the app** reach the hub on loopback like any other hub. Announce it the way `reins-hub` does and `node "$HOME/.reins/reins.mjs" reins_attach` works from any folder: the example does it in ten lines. Run (`tools-together`).
- **An assistant inside the app** needs no hub: build a `Broker` in the main process and connect the assistant with `linkPair()`, as in [the in-tab shape](../start/in-tab.md).

## Register the window with its page

`allow(win, { url })` takes the page's URL (compared without its `#fragment`), several, or a function. It is checked against the URL Electron reports for the frame when the page asks. A window that shows a page of origin `file://` or `null` is not linked unless it was registered with one: such an origin does not say which page it is.

> [!WARNING]
> A window that shows a file has to be registered this way. Every local file has the one origin `file://`, so without the URL any other file that got into the window, by a link, a dropped file or a redirect, would be linked as your app. Run (`builtin-file`, `windows`): another local file loaded into the registered window is refused, and so is a file window registered without a URL. Pin navigation as well, as the example does in `will-navigate`.

Other rules of the main process, each in [section 1 of the guide](../reference/electron-guide.md#1-build-it-in):

- **One window is one surface.** A second request from a window closes the link it had.
- **Reloads and navigations.** A port ends with its document. The new document asks again and appears at the hub as a new surface; an agent attaches again, and the person is asked again. The new grant starts at the level Ask, with no rules, and the chat transcript of the old document is gone. Run (`builtin`).
- **A window that is not shown** gets its link when it is shown, and none before: nobody could see a consent prompt in it. `allow(win, { hidden: true })` links a window unseen. A view registered by its `webContents` is held to the same rule: Reins asks Electron which window holds the view, links it when that window is shown, and gives a view that is in no window nothing. Run (`windows`), for a window and for a view. The rule goes by the window: it does not see a view that is hidden or covered inside a window that is shown, nor a window shown behind others.
- **`contextIsolation` has to stay on.** In a window without it the preload refuses, and both sides are told why. Run (`windows`).
- **Frames and `<webview>` guests.** Only the top-level frame of a registered window gets a port. A guest is refused unless you registered it with `{ embedded: true }`: do that only when the embedding page is your own. Stand-ins.
- **Offscreen and background pages** are refused: there is nobody to ask. Run (`windows`) for an offscreen page; background pages by stand-ins.
- **`nav.go` does nothing here.** It takes `http:` and `https:` URLs only, so on a `file://` or `app://` page it answers `E_DENIED`. Offer navigation as an action of your own, which then has a risk, a prompt and a place in the panel.
- **ESM main files.** A top-level `await app.whenReady()` that comes after another `await` never returns (seen with Electron 45.4.1). Use `app.whenReady().then(main)`.

## What origin your page has

A hub admits surfaces by origin. A page that was not loaded over `http(s)` still has one, and Reins defines exactly what it is.

| The page was loaded from | Its origin | A hub admits it with |
|---|---|---|
| `http://localhost:5173/...` | `http://localhost:5173` | that origin, `http://localhost:*`, or `*` |
| a file, `file:///C:/app/index.html` | `file://` | `file://` only |
| a scheme the app registered as standard, `app://notes/index.html` | `app://notes` | `app://notes` or `app://notes:*` only |
| the same with the default host of a serving library, `app://-/index.html`, `app://./index.html` | `app://-`, `app://.` | that origin only |
| a scheme the app did not register as standard | `null` | `null` only |
| a sandboxed frame, a `data:` URL | `null` | `null` only |

`*` means every web origin and nothing else. It never admits `file://`, an app origin or `null`: each has to be written down.

```bash
npx --no -- reins-hub --profile guarded --allow-origin app://notes
npx --no -- reins-hub --profile guarded --allow-origin file://        # read the warnings below first
```

Two entries need more than a name, because countless pages share the origin:

- **`null` admits every sandboxed frame on every website.** Do not list `null` unless every surface has to prove a key (`--require-key`), or none comes over the socket. `reins-hub` prints a warning at start when it does.
- **`file://` admits every local HTML file.** A hub that admits `file://` on its socket admits your app, and also any HTML file the person opens in a Chromium browser. `reins-hub` warns about this entry too.

Prefer, in this order: the in-process port above with `surfaceSockets: false` and the window registered with its URL; a scheme of your own (`app://notes`), which no web page and no file can have; a [surface key](./surface-keys.md) with `--require-key`.

Give the scheme a host, and register it with `standard: true` before the app is ready, or Chromium treats it as opaque and the origin is `null`. What Chromium reports for each kind of page was measured: the table is in [section 2 of the guide](../reference/electron-guide.md#2-origins), and `npx electron probe-origins.mjs` in the example folder prints it for your machine. The rule itself is in the [specification](../reference/specification.md#5-handshake-and-authentication) under "Origins", with cases for another implementation in [`origins.json`](../implementers/vectors/origins.md).

## The panel, levels and chat

The panel is the driver's, so you get it by using the driver; there is nothing to add to the three pieces. What it offers follows from the policy:

| The person can | Where | Needs |
|---|---|---|
| make one agent ask more: Strict | Permissions, "How much it asks you" | nothing: Strict and Ask are always there |
| make one agent ask less: Auto, Bypass | the same place, with a second step | the level in `human.levels` of the page's policy and of the hub's |
| set one action of one agent to Allow, Ask or Block | Permissions, the list of your actions | |
| switch one scope of one agent off and on | Permissions, "What it may do" | |
| end one agent's grant | Permissions, Disconnect | `human.stop` |
| see the last 50 commands and what let each run | Activity | |
| talk to the agents | Chat | the `chat` scope (section 5) |

Auto and Bypass are on offer only where the page's policy and the hub's policy both list them:

```js
const policy = { profile: 'guarded', human: { levels: ['auto'] } };              // Strict, Ask, Auto: no Bypass
createDriver({ app, link: await electronLink(), policy });                       // page
await startHub({ agents, surfaces, surfaceSockets: false, policy });             // main process
```

One thing is particular to Electron: your main process can send a window real input (`webContents.sendInputEvent`, the `debugger` API). The panel keeps an agent from changing its own permissions. It cannot keep an app from pressing its own buttons, and does not try to.

## Try the example

```bash
npm install            # in the repository root: builds the packages the example imports
cd examples/electron
npm install            # the Electron package; the first run downloads about 160 MB
npx electron .         # terminal 1: the app. It prints where its hub listens.
node agent-demo.mjs    # terminal 2: a scripted agent
```

The example folder is not an npm workspace, so that installing and testing the repository never downloads Electron. Its [README](https://github.com/offensiveadhd/reins/blob/main/examples/electron/README.md) has the rest: the same app from `file://`, two scripted agents in one window, and the same app adopted.

## Further reading

- [The Electron guide](../reference/electron-guide.md): every point above with its details, [troubleshooting](../reference/electron-guide.md#9-troubleshooting) and [what was tested](../reference/electron-guide.md#10-what-was-tested).
- [Adopt an Electron app](./adopting-an-electron-app.md) and [Claude and Hermes](./claude-and-hermes.md).
- [SDK API](../reference/sdk.md#electron): `reinsMain`, `preloadPath`, `electronLink`.
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T57 to T59.
