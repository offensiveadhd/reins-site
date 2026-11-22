# Policy profiles and action decisions

> Test vectors: Policy profiles and action decisions. Shown here as it is in conformance/vectors/policy.json.

Protocol `0.2`. Covers: SPEC.md section 12 table and "Action decisions"; strictness allow < confirm < deny (section 12 "Two enforcement points": the stricter decision).

[Download policy.json](./policy.json): the file itself, as the conformance suite reads it.

## How to use it

Profile table with its defaults (levels, panel and `chatRelay` included), override precedence, strictness order.

## Notes

"navigation: same origin" is checked as a non-empty nav prefix list that admits a same-origin path; "off" as an empty list. "user controls" maps to human.pause and human.stop. "levels the person may set" is human.levels as listed (kiosk lists none, and has no panel in which to choose one: its grants stay at ask) and "the indicator opens the panel" is human.panel. "a page inside a frame: refused" is framed == false. "agents hear each other in the chat" is chatRelay: `on` (always), `person` (once the person switches it on in the Chat tab) or `off` (never). The kiosk attach entry "allow, with a provisioned agent" is checked as attach == allow. `defaults` are the remaining rows of the table, in Policy field names and milliseconds.

## profiles

```json
{
  "open": {
    "attach": "allow",
    "risk": {
      "safe": "allow",
      "sensitive": "confirm",
      "dangerous": "confirm"
    },
    "scopes": [
      "observe",
      "act",
      "ui",
      "cursor",
      "show",
      "nav",
      "chat"
    ],
    "exposure": "auto",
    "coordinates": true,
    "framed": false,
    "navigation": "same origin",
    "controls": {
      "pause": true,
      "stop": true
    },
    "levels": [
      "strict",
      "ask",
      "auto",
      "bypass"
    ],
    "panel": true,
    "chatRelay": "on"
  },
  "guarded": {
    "attach": "confirm",
    "risk": {
      "safe": "allow",
      "sensitive": "confirm",
      "dangerous": "deny"
    },
    "scopes": [
      "observe",
      "act",
      "ui",
      "cursor",
      "show",
      "nav",
      "chat"
    ],
    "exposure": "auto",
    "coordinates": true,
    "framed": false,
    "navigation": "same origin",
    "controls": {
      "pause": true,
      "stop": true
    },
    "levels": [
      "strict",
      "ask",
      "auto",
      "bypass"
    ],
    "panel": true,
    "chatRelay": "person"
  },
  "kiosk": {
    "attach": "allow",
    "risk": {
      "safe": "allow",
      "sensitive": "deny",
      "dangerous": "deny"
    },
    "scopes": [
      "observe",
      "act",
      "cursor",
      "show"
    ],
    "exposure": "annotated",
    "coordinates": false,
    "framed": false,
    "navigation": "off",
    "controls": {
      "pause": true,
      "stop": false
    },
    "levels": [],
    "panel": false,
    "chatRelay": "off"
  }
}
```

## defaults

```json
{
  "open": {
    "remember": "session",
    "consentTimeoutMs": 60000,
    "yieldMs": 600,
    "ttlMs": 28800000,
    "idleMs": 1800000,
    "rates": {
      "observe": 30,
      "act": 30,
      "ui": 60,
      "cursor": 120,
      "show": 30,
      "nav": 2,
      "chat": 10
    },
    "pointerRate": 4000
  },
  "guarded": {
    "remember": "never",
    "consentTimeoutMs": 60000,
    "yieldMs": 800,
    "ttlMs": 7200000,
    "idleMs": 900000,
    "rates": {
      "observe": 20,
      "act": 20,
      "ui": 40,
      "cursor": 60,
      "show": 20,
      "nav": 1,
      "chat": 5
    },
    "pointerRate": 2000
  },
  "kiosk": {
    "remember": "never",
    "consentTimeoutMs": 30000,
    "yieldMs": 400,
    "ttlMs": 28800000,
    "idleMs": 300000,
    "rates": {
      "observe": 20,
      "act": 10,
      "ui": 0,
      "cursor": 60,
      "show": 10,
      "nav": 0,
      "chat": 0
    },
    "pointerRate": 2000
  }
}
```

## overrides

5 cases.

```json
[
  {
    "name": "exact name beats prefix",
    "profile": "open",
    "actions": {
      "cart.*": "deny",
      "cart.add": "allow"
    },
    "action": {
      "name": "cart.add",
      "risk": "dangerous"
    },
    "expect": "allow"
  },
  {
    "name": "longest prefix wins",
    "profile": "open",
    "actions": {
      "cart.*": "deny",
      "cart.items.*": "confirm"
    },
    "action": {
      "name": "cart.items.add",
      "risk": "safe"
    },
    "expect": "confirm"
  },
  {
    "name": "prefix beats risk tier",
    "profile": "kiosk",
    "actions": {
      "order.*": "allow"
    },
    "action": {
      "name": "order.submit",
      "risk": "dangerous"
    },
    "expect": "allow"
  },
  {
    "name": "prefix does not match a different name",
    "profile": "guarded",
    "actions": {
      "cart.*": "deny"
    },
    "action": {
      "name": "carts.add",
      "risk": "safe"
    },
    "expect": "allow"
  },
  {
    "name": "no override: risk tier",
    "profile": "guarded",
    "actions": {},
    "action": {
      "name": "admin.refund",
      "risk": "dangerous"
    },
    "expect": "deny"
  }
]
```

## stricter

```json
[
  [
    "allow",
    "allow",
    "allow"
  ],
  [
    "allow",
    "confirm",
    "confirm"
  ],
  [
    "confirm",
    "allow",
    "confirm"
  ],
  [
    "confirm",
    "deny",
    "deny"
  ],
  [
    "deny",
    "allow",
    "deny"
  ]
]
```

Generated by `conformance/tools/make-vectors.mjs` from the formulas in the specification, with `node:crypto` only.
