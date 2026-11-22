# Surface keys

> A key that lets a page and the hub prove themselves to each other. What it buys, how to set it up, and when it protects nothing.

## The problem a surface key solves

A surface is identified by its origin. A browser sets the `Origin` header truthfully, so a web page cannot pose as another site's surface. A local process that is not a browser can forge the header.

The page has the mirror problem. Without a key it cannot check the hub's proof, so it cannot tell the hub from another process listening on the same port.

A **surface key** is a shared secret, held by the hub under the app's id and by the page. With it:

- the page proves it is the app, and the hub proves it is the hub, in the handshake;
- the session is sealed: every message carries a MAC;
- the hub lists the surface as `verified`, which tells agents that the app id is more than a claim.

## Without a key

A surface that holds no key treats the hub as **unverified**. It never accepts an attach silently: the decision is at least `confirm`, and the consent prompt and the indicator say that the hub is unverified. The kiosk profile, which has nobody to ask, refuses to start.

This is fine for development and for a person's own browser, where the person answers the prompt. It is not enough for a kiosk.

## On the hub

```bash
npx --no -- reins-hub --allow-origin http://localhost:5173 --surface-key brew-kiosk=.reins/surface-key
```

`--surface-key <appId>=<path>` names a file that holds the key for one app id; give it once per app. A file that does not exist is created with a random key, and restricted to the current user.

Once the hub holds a key for an app id, a surface whose manifest claims that app id MUST prove the key, with or without `--require-key`. Without a proof it is refused with `E_AUTH` ("surface key required").

`--require-key` goes further: it refuses every surface without a key. Kiosk deployments should set it.

## On the page

```js
const driver = createDriver({
  app: { id: 'brew-kiosk', name: 'Brew Kiosk', version: '1.0.0' },
  hub: 'ws://127.0.0.1:7346',
  key: surfaceKey,
  policy: 'kiosk',
});
```

The app id is the key id: `app.id` here and the `<appId>` on the hub's command line have to match. `driver.hubVerified` is true once the hub proved the same key.

## Where the key must live

> [!WARNING]
> A key served to a web page is readable by anyone who can fetch that page. It only authenticates the hub to the page, and the page to the hub, where the page's source is out of the attacker's reach: a packaged kiosk app, not a page any local process can download.

The demo serves its key over loopback for convenience and says so: `examples/kiosk/serve.mjs` reads the key file the hub wrote and hands it to the page. That is a demo shortcut. A real kiosk provisions the key into its packaged app.

## Manifest pins

A hub may also pin an app id to a manifest digest and refuse a surface whose manifest differs (`E_DENIED`). Pinning catches a modified build of the app. It does not stop a forger, who can copy the manifest. A pin is not a substitute for a key.

## The in-tab shape needs none

A link the app built itself counts as verified. In [the in-tab shape](../start/in-tab.md) there is no port for another process to squat on, so there is no hub to verify and no key to hold. The same holds for an Electron window that its main process linked over a port: the main process vouches for it, and the hub lists it as `verified`.

## What else depends on a verified page

"The person at the page" is only as sure as the page is. When a page proved no key, any program on the computer that can reach the hub's port can be that page, and can write to an agent as its person. So the chat tools say on their first line when a page is one the hub did not verify, and `chat-serve` refuses to serve such a page unless it is given `--allow-unverified`. See [Chat](../concepts/chat.md).

## Further reading

- [Handshake, authentication and sealed sessions](../concepts/handshake.md)
- [Kiosk deployment](./kiosk-deployment.md)
- [Threats and what stops them](../reference/security-model.md#threats-and-what-stops-them): T5, T8 and T27.
