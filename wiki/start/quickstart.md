# Quickstart: run the demo

> Run Brew Kiosk, the demo app in the repository, with a hub and a scripted agent, and watch an agent order a coffee under your control.

## What you need

- A checkout of the [repository](https://github.com/offensiveadhd/reins/blob/main/README.md).
- Node 22 or newer.
- A Chromium-based browser. The demo has been run end to end in Chromium, with the page served from loopback. Firefox and Safari have not been tested.

> [!TIP]
> To see Reins work without installing anything, open the [playground](../../playground.html). It runs the in-tab shape on this site: the same driver, broker and agent SDK, with no hub.

## Install

In the checkout:

```bash
npm install
```

`npm install` also builds the package.

## Start the three parts

In three terminals. First the hub:

```bash
npm run demo:hub
```

`npm run demo:hub` starts the hub with the open profile, a surface key for the demo app, and a keyed audit log under `.reins/`.

Then the page, a small static server on loopback:

```bash
npm run demo
```

Open <http://127.0.0.1:5173> **before** starting the agent. Then the scripted agent:

```bash
npm run demo:agent
```

## What happens

The page asks you to approve the agent. Then you can watch it order a coffee: it moves its cursor, clicks, calls app actions, shows a chart from a file, circles the total with the live pointer stream, and stops at the consent prompt before placing the order.

The script, `examples/kiosk/agent-demo.mjs`, prints each step in its terminal:

1. It attaches, asking for the scopes `observe`, `act`, `ui`, `cursor` and `show`. You approve on the page.
2. It prints the prompt card: everything a model needs to know to drive this app.
3. It prints the screen as the compact tree, with the number of characters.
4. It shows its cursor and a toast.
5. It points at a drink, highlights it and adds it.
6. It adds two mochas with one app action, then tries an item that is not on the menu: the arguments fail the schema and the answer is `E_BAD_ARGS`.
7. It fills in a name.
8. It observes again and prints the delta: only what changed since step 3.
9. It sends a chart from a file to the app's `insights` view. The data never passes through a model.
10. It circles the total with the live pointer stream.
11. It asks to place the order, a sensitive action. The page asks you. Press "Later", or do nothing for a minute, and the request waits in the panel ("1 waiting" on the indicator): this step waits with it, and the order is placed once you allow it there.
12. It tries a dangerous action and a private field. Both stay out of reach.
13. It says goodbye, hides the cursor and detaches.

Whatever the page's policy refuses is printed and the script carries on.

![The attach card: “Barista AI” (a3) wants to control this page, the five scopes it asks for, under Without asking each time an unticked box for order.submit, and Deny, Later and Allow](https://github.com/offensiveadhd/reins/blob/main/docs/demo/1-attach-consent-offer.jpg)

![The card for order.submit, marked sensitive, over the filled-in order: goes to the waiting list in 59 s, Deny and Later on the left, Always allow and Allow on the right](https://github.com/offensiveadhd/reins/blob/main/docs/demo/4-action-consent-later.jpg)

While the agent is attached, the indicator in the corner names it, with Pause and Stop. Try both. Pause holds every command that changes the page; Stop revokes the agent's access.

> [!NOTE]
> The film (45 s) and these stills are the second cut, for protocol 0.2. The film follows one session: the attach card with its offer, the order card put off with "Later", "1 waiting" on the indicator, Review and Allow in the panel, and the order placed on the agent's repeat; the stills add the panel's waiting list and levels and the notice after a refusal. There is no Pause in the film; try it yourself.

![The indicator in the corner: AI connected: “Barista AI” (a3) with a 1 waiting chip, next to Pause and Stop](https://github.com/offensiveadhd/reins/blob/main/docs/demo/5-indicator-waiting.jpg)

## Change how much it asks

Select "AI connected" in the corner for the panel. Set the agent to `auto` there and the order is placed without the prompt. Raising a level takes a second step that says what stops asking, and the indicator then shows the level. See [Permission levels](../concepts/permission-levels.md).

## Talk to it

Start the agent with `npm run demo:agent -- --chat`. After its tour it stays attached: select "AI connected", then the Chat tab, and type "add two mochas", "what is in my order" or "place my order". The page still asks you before the order is placed. "stop" sends it away. The answers are a script in `examples/kiosk/public/chat-script.js`; no model is involved. `--chat-only` skips the tour. See [Chat](../concepts/chat.md).

## The same script under the kiosk policy

Open <http://127.0.0.1:5173/?profile=kiosk> and run the agent again. Under the [kiosk profile](../concepts/policy-profiles.md), synthetic clicks and placing the order are refused outright.

## The in-tab shape

Open <http://127.0.0.1:5173/inpage.html>. No hub is involved (only `npm run demo` needs to be running), and a scripted assistant in the page asks to attach when you press its button. It adds a latte and then listens in the Chat tab with the same script, until you type "stop". See [The in-tab shape](./in-tab.md).

## If something does not work

- The agent says Brew Kiosk is not connected: open the page first, and check that the hub is running.
- The page shows the hub as unreachable: the demo page connects to `ws://127.0.0.1:7346`. See [Troubleshooting](../guides/troubleshooting.md).
- Port 7346 or 5173 is taken: name others with `npm run demo:hub -- --port 7446`, `npm run demo -- --port 5273 --hub-port 7446` and `npm run demo:agent -- --url ws://127.0.0.1:7446`.

## Next

- [Make an app drivable](./make-an-app-drivable.md): what the demo page does, in your own app.
- [Drive it from Node](./drive-from-node.md): what the scripted agent does, in your own code.
