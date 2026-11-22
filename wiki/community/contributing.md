# Contributing

> How to work on Reins. Building and testing the repository, what its checks expect of a change, and how to add or fix a page of this wiki with an ordinary pull request.

## The repository

Reins is developed in one repository, [offensiveadhd/reins](https://github.com/offensiveadhd/reins), under the Apache-2.0 licence.

| Folder | What it is |
|---|---|
| [`packages/core`](https://github.com/offensiveadhd/reins/tree/main/packages/core) | Wire types, codec, schema validation, policy engine, flow control, crypto, RPC. Runs anywhere, no dependencies. |
| [`packages/hub`](https://github.com/offensiveadhd/reins/tree/main/packages/hub) | The broker, its loopback WebSocket server and the `reins-hub` command. |
| [`packages/driver`](https://github.com/offensiveadhd/reins/tree/main/packages/driver) | The in-page runtime: UI tree, command execution, cursor, consent prompt, indicator and its panel. |
| [`packages/agent`](https://github.com/offensiveadhd/reins/tree/main/packages/agent) | The agent SDK and the `reins` command. |
| [`packages/mcp`](https://github.com/offensiveadhd/reins/tree/main/packages/mcp) | The MCP adapter and the `reins-mcp` command. |
| [`packages/kit`](https://github.com/offensiveadhd/reins/tree/main/packages/kit) | The single entry point for browser projects. |
| [`packages/electron`](https://github.com/offensiveadhd/reins/tree/main/packages/electron) | Electron: a window as a surface over a `MessagePort`, and the `reins-electron` command. |
| [`conformance`](https://github.com/offensiveadhd/reins/tree/main/conformance) | The conformance suite and test vectors. |
| [`examples/kiosk`](https://github.com/offensiveadhd/reins/tree/main/examples/kiosk) | Brew Kiosk, the demo app, a scripted agent, and the in-tab example. |
| [`examples/electron`](https://github.com/offensiveadhd/reins/tree/main/examples/electron) | Notes, an Electron app that is a surface, and the same app adopted. Installs Electron by itself; not a workspace. |
| [`integrations/hermes-desktop`](https://github.com/offensiveadhd/reins/tree/main/integrations/hermes-desktop) | A Hermes Desktop plugin that makes Hermes a surface. Not run in Hermes. |
| [`site`](https://github.com/offensiveadhd/reins/tree/main/site) | The website: landing page, wiki and playground. Built by `site/build.mjs`, apart from the npm workspaces. |

This site lives in `site/`, apart from the npm workspaces.

## Build and test

Node 22 or newer.

```bash
npm install            # also builds
npm run build          # type-check, bundle, assemble dist/
npm test               # every test
npm run test:conformance
npm run test:package   # pack, install into an empty project, import, type-check
npm run test:electron  # opt-in: a real Electron, after npm install in examples/electron
```

CI runs all of these on Ubuntu and Windows. Tests run against the package sources, so no build is needed before `npm test`.

## What the checks expect of a change

The repository is strict about a few things, and a pull request passes more easily if you know them.

- **The specification and the wire types move together.** `docs/SPEC.md` describes the behaviour and `packages/core/src/protocol.ts` holds the wire types. If the two ever disagree, fix both in one change.
- **Every normative sentence has a test.** A meta-test in `conformance/` fails when a MUST, MUST NOT or SHALL sentence in the specification has no entry in `conformance/requirements.json`, or when an entry names a test that does not exist. A change to the specification comes with its requirement and its test.
- **The vectors are regenerated, not edited.** `node conformance/tools/make-vectors.mjs --check` exits 1 if a vector file would change.
- **The published package is tested as installed.** `npm run test:package` packs the package, installs it into an empty project, imports it and type-checks against it. The commands the README hands out are run against the installed tarball.
- **Security fixes come with a regression test.**
- **A real Electron is opt-in.** `npm run test:electron` runs the Electron checks after `npm install` in `examples/electron`. It is not part of `npm test`, and the repository never installs Electron by itself.

A change to the wire format is a protocol change: see [How to propose a protocol change](./protocol-changes.md).

## This wiki

Every page of the wiki that is not one of the canonical documents is a Markdown file under [`site/wiki/`](https://github.com/offensiveadhd/reins/tree/main/site/wiki), in the folder of its section. Each page has an "Edit this page on GitHub" link at the bottom. A pull request that changes the file changes the page.

### Add a page

Create `site/wiki/<section>/<name>.md`. The sections are `start`, `concepts`, `guides`, `reference`, `implementers` and `community`. The file starts with front matter:

```text
---
title: The title of the page
description: One sentence that says what the page is for. It is shown under the title, in search results and in link previews.
order: 45
---
```

| Field | Meaning |
|---|---|
| `title` | The page's heading. The text starts at `##` headings. |
| `description` | One sentence. Required. |
| `order` | A number that places the page in its section's list. Required. |
| `nav` | A shorter title for the sidebar. Optional. |
| `draft` | `true` keeps the page out of the published site, its navigation, search and sitemap. Optional. |

### Write it

- Link to another wiki page with a relative path to its `.md` file: `[Consent](../concepts/consent.md)`. Link to the canonical documents from the repository root: `[section 5](../reference/specification.md#5-handshake-and-authentication)`. Both forms also work when the file is read on GitHub.
- **State only what the sources say.** Every technical statement, command and number on this site comes from the specification, the security model, the README, the conformance suite or the code. Where the README says something is untested, say the same.
- **Do not copy a table or a code sample out of the canonical files.** Include it, and the build takes it from the real file every time:

```text
| method | params | result | scope |
|---|---|---|---|
| `hub.info` | | `HubInfo` | |
| `surfaces.list` | | `{surfaces}` | |
| `surface.attach` | `scopes, reason?, tk?` | `{grant, surface, manifest}` | |
| `surface.detach` | | `{}` | |
| `observe` | `since?, boxes?` | `Observation` | observe |
| `read` | `h?, max?` | `{text, truncated}` | observe |
| `state.get` | `name?` | `{state}` | observe |
| `sub` / `unsub` | `topics` | `{topics}` now subscribed | observe |
| `act` | `a, args?, tk?` | `{result?, rev}` | act |
| `ui.click` | `h` | `{rev}` | ui |
| `ui.type` | `h, text, clear?, enter?` | `{rev}` | ui |
| `ui.select` | `h, value` | `{rev}` | ui |
| `ui.scroll` | `h?, dx?, dy?, to?` | `{rev}` | ui |
| `ui.key` | `key, h?` | `{rev}` | ui |
| `cursor.move` | `to, ms?, wait?` | `{x, y}` | cursor |
| `cursor.set` | `visible?, label?, color?` | `{}` | cursor |
| `show.toast` | `text, kind?, ms?` | `{}` | show |
| `show.highlight` | `h, label?, ms?` | `{}` | show |
| `show.view` | `view, data?` | `{result?}` | show |
| `show.clear` | | `{}` | show |
| `nav.go` | `url` | `{}` | nav |
| `chat.say` | `text, to?` | `{id}` | chat |
| `chat.read` | `since?, max?` | `{messages, next}` | chat |
| `chat.status` | `state, note?` | `{}` | chat |
| `stream.open` | `kind:"pointer"` | `{ch, credit}` | cursor |
| `stream.close` | `ch` | `{}` | |
```js
import { createDriver } from '@offensiveadhd/reins';

const driver = createDriver({
  app: { id: 'brew-kiosk', name: 'Brew Kiosk', version: '1.0.0' },
  hub: 'ws://127.0.0.1:7346',
  policy: 'guarded', // or 'open', 'kiosk', or a profile with overrides
});

driver
  .action(
    {
      name: 'cart.add',
      description: 'Add a drink to the order.',
      risk: 'safe',
      params: {
        type: 'object',
        properties: { sku: { type: 'string', enum: ['latte', 'mocha'] }, qty: { type: 'integer', minimum: 1, maximum: 9 } },
        required: ['sku'],
      },
    },
    ({ sku, qty = 1 }) => cart.add(sku, qty),
  )
  .action({ name: 'order.submit', description: 'Place the order.', risk: 'sensitive' }, () => cart.submit())
  .view({ name: 'chart', description: 'Bar chart panel.' }, (data) => renderChart(data))
  .state('cart', () => cart.summary());

await driver.connect();
```
```text
usage: reins-hub [--port 7346] [--profile open|guarded|kiosk] [--allow-origin <origin>]...
                 [--config hub.json] [--token-file <path>] [--audit <path>] [--audit-key-file <path>]
                 [--surface-key <appId>=<path>]... [--require-key] [--no-announce]
                 [--agent <kid>=<path>]... [--no-surface-sockets]

--agent adds a credential of its own for one agent, with its key in that file (created
when missing): the agent then starts with --kid <kid> --token-file <path>. The first
--agent replaces the default token file; --token-file, when given too, stays the
credential "default".
--no-surface-sockets makes the socket take agents only, for a hub whose pages are all
linked in-process (an Electron app's main process).

A running hub announces itself in the user's Reins folder (~/.reins, or REINS_HOME) and
leaves a launcher there, so an agent on this machine can reach it from a shell:
  node "$HOME/.reins/reins.mjs" reins_attach
--no-announce writes neither.
```
```

The wiki pages on chat and on Electron lean on `docs/CHAT.md`, `docs/ELECTRON.md` and the READMEs under `integrations/`, which the site also renders in full. Change the text there and the site follows.

- Raw HTML in Markdown is not rendered. Callouts are GitHub's: a block quote that starts with `[!NOTE]`, `[!TIP]` or `[!WARNING]`.

### Build it

```bash
npm ci                    # in the repository root: builds the package the playground runs
cd site
npm ci
npm run build             # writes site/dist and checks every link and anchor
npm run preview           # serves site/dist on http://127.0.0.1:4173
```

The build fails on a dead link or anchor, on a resource from another host, and on anything the site's Content Security Policy would block. [`site/README.md`](https://github.com/offensiveadhd/reins/blob/main/site/README.md) has the details.

## Reporting problems

- A bug or an unclear page: an issue in the repository.
- A suspected vulnerability: not in a public issue. See [Reporting a vulnerability](./vulnerability-disclosure.md).
