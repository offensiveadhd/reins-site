# FAQ

> Short answers to the questions people ask first, each with a link to the page that has the long answer.

## About the project

### Is Reins on npm?

No. The package is `@offensiveadhd/reins`, and it installs from Git (`npm i github:offensiveadhd/reins`) or from a tarball. It is marked `private` so it cannot be published to a registry by accident. Note that `reins-mcp` on the npm registry is an unrelated package: run the commands as `npx --no -- <command>`. See [Make an app drivable](../start/make-an-app-drivable.md#install).

### Is the wire format stable?

Not yet. This is protocol 0.1, a first version: the wire format may change before 1.0, and a version change is announced in the handshake. See [How to propose a protocol change](./protocol-changes.md).

### What licence is it under?

Apache-2.0.

### Which browsers does it work in?

The demo has been run end to end in Chromium, with the page served from loopback. Firefox, Safari and pages served from a public `https:` origin have not been tested. The in-tab shape needs no network access and so is not affected by loopback restrictions. See [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback).

### Why port 7346?

It spells REIN on a phone keypad.

## How it works

### Do I need to run a hub?

Only when the agent is outside the browser. When the assistant runs in the page, the page hosts the broker and both sides talk over in-memory links: no process, no port. See [The in-tab shape](../start/in-tab.md).

### Can an agent on another machine drive my page?

Not through the hub. The hub binds loopback addresses only, refuses any other bind address, and rejects a socket whose remote address is not loopback.

### How is this related to MCP?

Reins is its own protocol, between an agent and a web page. The MCP adapter is a way in: a stdio MCP server with 10 tools that speaks Reins to the hub on behalf of a model in an agent harness. See [Use it from Claude Code and other MCP harnesses](../start/mcp.md).

### What does the agent actually see?

A compact tree of the elements that matter: one line per element, with a handle, a role, a name and a value. After the first reading it gets only what changed. It does not get the page's HTML or a screenshot. See [Observation, handles and deltas](../concepts/observation.md).

### What does it cost in tokens?

By the README's account: a model learns an app from a prompt card of about a thousand characters, reads the screen as a tree of similar size, and afterwards gets deltas of a few hundred. Bulk data goes to the screen without passing through the model.

### Can several agents attach to the same page?

Yes. One agent holds at most one grant per surface, and several agents can each hold one. The page allows one pending prompt per agent and four in total. The [playground](../../playground.html) has two: the scripted assistant and you, at the console.

### Does it work in an Electron app?

Yes. An app you write gets its link from its own main process, with no socket on the page side. An app you did not write can be adopted with `reins-electron` through its debugging connection, and an agent that is allowed to attach can then press anything in that window. The checks ran in a real Electron on Windows; macOS, Linux and a packaged app were not tested. See [Electron: build Reins into your app](../guides/electron.md) and [Adopt an Electron app](../guides/adopting-an-electron-app.md).

### Can I use the driver inside an iframe?

Not by default. The page around a frame can cover the consent prompt and the indicator, so the driver's `connect()` fails with `E_DENIED` inside a frame. A page that is embedded on purpose, by pages you control, opts in with `framed: true`. See [Policy profiles](../concepts/policy-profiles.md#frames).

## Safety

### Can an agent run code in my page?

No. Nothing in the protocol evaluates agent-supplied code, HTML or CSS. Agent text is inserted as text, and the cursor colour is the only style value an agent may send.

### Can an agent approve its own consent prompt?

No. The prompt lives in a closed shadow root owned by the driver, is outside the tree the agent sees, and accepts only trusted input events. Allow also ignores input for the first 500 ms. See [Consent](../concepts/consent.md).

### Can an agent raise its own permission level?

No. A level, a rule or a scope switch changes only on the person's own input on the driver's controls, which sit outside the tree an agent sees. No protocol message reaches the panel, and the driver's API reads what the person set and sets none of it. What loosens also ends with its grant: after a detach and a new attach, Auto, Bypass and every Allow rule are gone. What the person tightened does the opposite: Strict, their Ask and Block rules and the scopes they switched off stay with the agent, and it cannot shed them by attaching again. See [Permission levels](../concepts/permission-levels.md).

This is about agents. Script that runs in the page's own JavaScript realm is another matter, and Reins does not defend the panel against it: see [What script in the page can do](../concepts/human-control.md#what-script-in-the-page-can-do).

### Can the person approve something by typing "yes" in the chat?

No. A chat message is a request, never an approval, and it changes no permission. An action that needs approval asks on its own prompt, and while that prompt is up the chat is hidden. See [Chat](../concepts/chat.md).

### Is the chat private?

From other agents, as far as the person set it: an agent gets only what was said to it while its grant was live, and under `guarded` agents hear each other only once the person says so. From the page, no: the chat is drawn in the app's page, and the app and every script it loads can read what is typed there and change what is sent. And what the person types goes to the agent, to whoever runs it and to the model behind it.

### Can an agent read a password field?

No. Password, card and one-time-code fields are private automatically: they carry no value, their text is never read, and they refuse synthetic input. They stay private even if the page later changes the field's type or swaps the node. See [Privacy annotations](../guides/privacy-annotations.md).

### What if text on the page tells the model to do something?

Everything a surface reports is untrusted input, and it is marked as page data wherever a model reads it. If the model is fooled anyway, what it tries is still held by its grant, its scopes, the rate limits, the policy and the person's consent.

What policy cannot do is judge whether a permitted action was wise. A model that is talked into a bad but permitted action is on the list of [what Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against). Mark anything costly as `sensitive` or `dangerous`.

### Is the traffic encrypted?

No. Frames are plain text on `127.0.0.1`. Authenticated sessions are sealed: every message carries a MAC, which protects integrity, not secrecy. Anyone able to capture loopback traffic can read it. See [Handshake, authentication and sealed sessions](../concepts/handshake.md).

### Has it been reviewed?

Yes, by reviewers that did not write the code, against the running code: the first version twice, and then permission levels and the panel, chat, and Electron support as they were added, each with a second review of what the first one's fixes had changed (for chat, of the part a model reads and a runner executes). The [Review](../reference/security-model.md#review) section of the security model is the record: what each review covered, what it found, what was changed, and what is left as a stated limit. The second review of the panel showed that script in the page's own JavaScript realm can answer prompts whichever loads first; that is not fixed, and the documents now say so. It also says what has not happened: the fixes that followed the second reviews have not been reviewed by someone else, and nothing was run with a model, in a real Claude Code session or against a live Hermes Desktop.

## Running it

### Where is my token?

In the token file, `.reins/token` in the folder the hub was started in, unless you named another with `--token-file`. The hub prints the file's path, never the token. The SDK finds it from any folder through the hub's announcement in `~/.reins`.

### The page asks me every time an agent attaches. Can I stop that?

Under the `guarded` profile the person approves every attach: that is the profile's purpose, and no permission level changes it. The `open` profile, for local development, allows attaches, but only when the page can verify the hub: a page without a [surface key](../guides/surface-keys.md) always asks. After you press Stop, the page also asks until it is reloaded.

Prompts for actions are another matter: in the panel you can set an agent to Auto, or give one action the rule Allow, for as long as that grant lasts. What you tighten (Strict, Ask, Block, a scope switched off) stays with that agent for as long as the page is open.

### How does a kiosk work if nobody can approve a prompt?

The kiosk profile does not ask. Safe actions are allowed, everything else is denied, and the agent has no synthetic input and no navigation. See [Kiosk deployment](../guides/kiosk-deployment.md).

### My MCP tools are listed but every call fails.

The registration holds a relative path to the token. See [Troubleshooting](../guides/troubleshooting.md#the-mcp-tools-are-listed-and-every-call-fails-with-e_auth).
