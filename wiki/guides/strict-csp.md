# Running under a strict CSP

> The Reins bundles run under a Content Security Policy with no inline script, no inline style and no eval. What to allow, and why a strict policy is part of the security model.

## The bundles are built for it

The bundles have no dependencies and no `node:` imports, and they run under a strict Content Security Policy: `script-src 'self'`, no inline script, no `eval`.

The driver's own UI is built for `style-src 'self'` as well. Its styles come from a constructable stylesheet, and positions are set through the CSSOM (`style.setProperty`), never through a `style` attribute. Every dynamic string is inserted as text.

So you do not have to loosen your policy to add Reins. Neither `'unsafe-inline'` nor `'unsafe-eval'` is needed.

## What to allow

The one thing a page with a hub needs is permission to open the WebSocket. This is the policy the demo server sends with every response:

```text
default-src 'self';
connect-src 'self' ws://127.0.0.1:7346 ws://localhost:7346;
img-src 'self' data:;
style-src 'self';
script-src 'self';
base-uri 'none';
form-action 'none';
frame-ancestors 'none'
```

- **`connect-src`** names the hub: `ws://127.0.0.1:7346`, or the port you chose.
- **`script-src 'self'`** is enough when you serve the bundle from your own origin, which is how Reins is meant to be shipped: copy `reins.js` or `reins-driver.js` next to your own scripts, or bundle the package.
- **`frame-ancestors 'none'`** says that no page may frame this one. The driver refuses to connect inside a frame anyway, but a page that is never meant to be framed should say so itself.

In [the in-tab shape](../start/in-tab.md) nothing is dialled, so `connect-src` needs no entry for a hub. The same goes for an Electron window linked over a port from its main process, and for an app adopted with `reins-electron`, whose frames travel over the debugging connection: the example page runs with `connect-src 'none'`.

## This site as an example

The [playground](../../playground.html) runs the kit bundle in the in-tab shape under this policy, which every page of this site carries in a `<meta>` element:

```text
default-src 'none';
script-src 'self';
style-src 'self';
img-src 'self';
media-src 'self';
font-src 'self';
connect-src 'self';
manifest-src 'self';
base-uri 'none';
form-action 'none'
```

That block is printed from the build's own setting.

The site's build refuses to publish a page with an inline script, an inline style or a resource from another host.

A policy in a `<meta>` element cannot carry `frame-ancestors`: browsers ignore that directive there. Send it as a response header wherever you control the headers.

## Why it matters

Reins defends the page against the agent. It does not defend the page against the page.

An XSS payload or a malicious third-party script runs with the app's authority and in the same JavaScript realm as the driver. It can call the app's functions directly, and it can defeat the overlay, whatever the order in which it and the driver load: the second security review answered prompts and set Bypass from a script injected after the driver had attached, with no input from the person at all. The driver's shadow root and trusted-event checks defend against the agent, against the page's styles and against events a script forges or borrows. They close nothing else about script in the page. See [What script in the page can do](../concepts/human-control.md#what-script-in-the-page-can-do).

A strict Content Security Policy is what keeps such code out. It is the first item under [What Reins does not protect against](../reference/security-model.md#what-reins-does-not-protect-against), and the advice there is plain: keep a strict Content Security Policy, because what must not happen is hostile script in the page. Where that cannot be ruled out and the app is an Electron app, adopting it with `reins-electron` gives the driver an isolated world of its own ([Adopt an Electron app](./adopting-an-electron-app.md)).

## A page that is framed on purpose

A page inside a frame cannot see what the page around it draws over the consent prompt or the indicator. The driver therefore connects in a framed page only with `policy.framed`. If you set it, say which pages may embed yours:

```text
Content-Security-Policy: frame-ancestors https://portal.example
```

A cross-origin frame that has to reach a hub on loopback also needs `allow="loopback-network"` from its embedder in Chrome and Edge. See [Browser access to loopback](../reference/security-model.md#browser-access-to-loopback).

## If something is blocked

Open the browser's console. A blocked connection to the hub shows as a `connect-src` violation, and the driver reports `offline` and keeps retrying. See [Troubleshooting](./troubleshooting.md).

## Further reading

- [The security model](../reference/security-model.md)
- [Kiosk deployment](./kiosk-deployment.md)
