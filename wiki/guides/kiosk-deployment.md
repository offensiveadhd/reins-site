# Kiosk deployment

> How to run Reins on an unattended station. The kiosk profile, the surface key, the service account, the audit log, and the checklist from the security model.

## What the kiosk profile is for

A kiosk is an unattended station: a self-service terminal with an assistant that helps whoever walks up. Nobody is there to approve a prompt, so the `kiosk` profile does not ask. It runs a fixed policy instead:

- **Allowlisted actions.** Safe actions are allowed. Sensitive and dangerous actions are denied, not asked.
- **Annotated elements only.** The tree shows only elements carrying `data-reins-id` or `data-reins="expose"`.
- **No synthetic input.** The scopes are `observe`, `act`, `cursor` and `show`. There is no `ui` scope.
- **No navigation**, no raw coordinates and no pointer stream.
- **Pause, no Stop.** A visitor can pause the assistant but cannot revoke it.
- **No panel, no levels, no chat.** A kiosk visitor is not the owner: the profile offers no level beyond `strict` and `ask`, the indicator opens no panel to set one in, and no `chat` scope is granted.
- **A tamper-evident audit log**, when you turn it on.

Compare the profiles in [Policy profiles](../concepts/policy-profiles.md), and run the same script under `kiosk` in the [playground](../../playground.html?profile=kiosk).

## The checklist

This is the checklist of the [security model](../reference/security-model.md#kiosk-deployment-checklist), with the commands and options each step means.

### 1. The kiosk profile on both sides

Run the hub with `--profile kiosk`, and create the driver with `policy: 'kiosk'`. A request has to pass both policies.

The profile offers no permission level but `ask` and has no panel: a visitor cannot make the assistant ask less. Leave `human.levels` and `human.panel` as they are.

### 2. A surface key, required

Give the app a surface key; the hub then demands it from any surface claiming that app id. Start the hub with `--require-key` as well, so that every surface without a key is refused.

```bash
npx --no -- reins-hub --profile kiosk --allow-origin https://kiosk.example \
  --surface-key brew-kiosk=/srv/reins/surface-key --require-key --no-announce \
  --audit /srv/reins/audit.jsonl --audit-key-file /srv/reins/audit-key
```

Ship the key inside the packaged app, not from a URL other processes can fetch. Check that the app is listed as `verified`.

`createDriver` throws when the profile is `kiosk` and the driver would dial a hub without a `key`: nobody is there to confirm an unverified hub, so a kiosk must authenticate it. See [Surface keys](./surface-keys.md).

### 3. Exactly one origin

Allow exactly one origin, the kiosk app's.

### 4. A narrow agent credential

Give the agent credential a name, only the scopes it needs, and the surface origins it may attach to. Credentials with caps go in a configuration file given with `--config`:

```json
{
  "agents": [
    {
      "kid": "kiosk-assistant",
      "key": "<the agent's secret: 32 random bytes, base64url>",
      "name": "Kiosk assistant",
      "scopes": ["observe", "act", "cursor", "show"],
      "surfaces": ["https://kiosk.example"]
    }
  ],
  "surfaces": { "origins": ["https://kiosk.example"], "requireKey": true },
  "policy": "kiosk"
}
```

The `name` is what the indicator shows, and it overrides the name the agent declares. A hub refuses malformed configuration at start, and a key shorter than 32 characters is refused.

The surface key still comes from `--surface-key` on the command line: with `requireKey` and no key for any app, the hub says at start that every surface will be refused. With agents in the configuration file, the hub does not create the default credential or its token file.

### 5. Annotate only what the assistant should see

Annotate only the elements the assistant should see with `data-reins-id`. Everything else does not exist for it. See [Privacy annotations](./privacy-annotations.md).

### 6. The right risk on every action

Mark every action with the right risk. Add `actions` overrides for anything that must stay off whatever its risk tier says:

```js
createDriver({
  app,
  key,
  policy: { profile: 'kiosk', actions: { 'admin.*': 'deny' } },
});
```

Under `kiosk` only `safe` actions run. If the assistant must be able to place an order, the action that does it has to be `safe`, or be allowed by an `actions` override in the page's policy and in the hub's, because the hub decides by the action's risk under its own policy too. Whether that is right for your station is your decision. See [Writing good actions and risk tiers](./actions-and-risk.md).

### 7. A service account of its own

Run the hub under its own OS account, from a working directory and under parent directories that only that account controls. The hub restricts the token, key and audit files, and the directories it creates, to that account, and stops if it cannot. It refuses an existing secret file or audit log that others can use (POSIX) or restricts it again (Windows).

A process running as the same OS user can read the token file and the browser's memory. That is why the hub gets an account of its own. Start it with `--no-announce`: nobody on a kiosk needs the launcher, and it then leaves nothing in the Reins folder.

### 8. Pre-approve loopback access

A browser may put a page's access to `127.0.0.1` behind a permission prompt. Pre-approve loopback access for the kiosk origin by browser policy. Edge documents the policies `LoopbackNetworkAllowedForUrls` and `LoopbackNetworkBlockedForUrls`; Chrome is reported to use the same names. See [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback), and test your target browser: the notes there were checked in November 2026 and browser behaviour is still changing.

The in-tab shape needs no loopback access at all.

### 9. Key the audit log and ship it off the machine

Key the audit log (`--audit-key-file`), ship the log and its head off the machine, and verify the chain against the head on arrival. See [The audit log](../concepts/audit-log.md).

### 10. Reset between visitors

Reset the app session whenever the assistant detaches:

```js
driver.on('detach', () => app.resetSession());
```

The demo does this: under the kiosk profile, Brew Kiosk starts the next visitor from a clean slate whenever the assistant lets go.

### 11. An Electron kiosk links its window in-process

A kiosk built with Electron links its window in-process (`reinsMain`) and starts its hub with `surfaceSockets: false`. Its allowlist then names the origin of its own window, an app scheme rather than `file://`, and nothing can pose as that window over the socket. Never ship it with a debugging port. See [Electron: build Reins into your app](./electron.md).

## Also set

- A strict Content Security Policy, with `frame-ancestors 'none'` for a page that is never meant to be framed. See [Running under a strict CSP](./strict-csp.md).
- An attendant flow of your own, if staff need to approve something: an app may supply its own consent handler, for example an attendant PIN.

## Read before deploying

[What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against). In particular: a surface key that the attacker can read protects nothing, a process running as the hub's OS user can read its secrets, and hostile script inside the app's own origin has the app's authority.
