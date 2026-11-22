# Origins: of a URL, in an allowlist, of hello.surface.url

> Test vectors: Origins: of a URL, in an allowlist, of hello.surface.url. Shown here as it is in conformance/vectors/origins.json.

Protocol `0.2`. Covers: SPEC.md section 5, "Origins".

[Download origins.json](./origins.json): the file itself, as the conformance suite reads it.

## How to use it

`urlOrigin`: the origin of each `url` (JSON null: not a URL; the string `"null"`: opaque). `allowed`: whether `entries` admit `origin`. `surfaceUrl`: whether `url` may be `hello.surface.url` on a connection from `origin`.

## Rule

```text
a web origin is the serialised origin of an http:, https:, ws:, wss: or ftp: URL
every file: URL has the origin file://
blob: has the web origin of the http(s) URL after "blob:", else null
any other scheme: scheme://host[:port] from the text between // and the next /, ? or # (credentials dropped, lower case) when it fits the app-origin form, else null
entries: exact, scheme://host:* (web and app origins), * (web origins only); file://, an app origin and null only by an entry that names them
hello.surface.url has the connection origin when its origin equals it; a null connection takes any URL without a web origin
```

## Notes

Computed here from the text of SPEC 5, with the WHATWG URL parser used for web origins only. A `urlOrigin` case whose origin is the JSON value null is not a URL; the string "null" is the opaque origin. The values for file: and app-scheme URLs do not come from a URL library: Node reports "null" for both, Chromium does not.

## urlOrigin

41 entries.

| `url` | `origin` |
|---|---|
| `http://localhost:5173/menu?x=1#top` | `http://localhost:5173` |
| `https://Example.COM:443/a` | `https://example.com` |
| `http://127.0.0.1:80/` | `http://127.0.0.1` |
| `ws://127.0.0.1:7346/` | `ws://127.0.0.1:7346` |
| `wss://hub.example:8443/socket` | `wss://hub.example:8443` |
| `ftp://files.example/pub` | `ftp://files.example` |
| `http://[::1]:8080/x` | `http://[::1]:8080` |
| `https://user:pw@example.com/` | `https://example.com` |
| `file:///C:/Users/me/app/index.html` | `file://` |
| `file:///home/me/app/index.html` | `file://` |
| `file://server/share/index.html` | `file://` |
| `file://localhost/etc/hosts` | `file://` |
| `app://notes/index.html` | `app://notes` |
| `app://Notes/index.html#/settings` | `app://notes` |
| `app://notes:8080/index.html?tab=1` | `app://notes:8080` |
| `app://user:pw@notes/index.html` | `app://notes` |
| `app://notes` | `app://notes` |
| `reins-probe://notes/page.html` | `reins-probe://notes` |
| `chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html` | `chrome-extension://abcdefghijklmnopabcdefghijklmnop` |
| `vscode-webview://0a1b2c3d/index.html` | `vscode-webview://0a1b2c3d` |
| `app://notes:0/x` | `null` |
| `app://notes:65536/x` | `null` |
| `app://notes:080/x` | `app://notes:80` |
| `app://no%74es/x` | `null` |
| `app://-notes/x` | `app://-notes` |
| `app://-/index.html` | `app://-` |
| `app://./index.html` | `app://.` |
| `app://notes./index.html` | `app://notes.` |
| `app://my_app/index.html` | `app://my_app` |
| `app://no tes/x` | `null` |
| `app:///index.html` | `null` |
| `app:notes/index.html` | `null` |
| `blob:http://localhost:5173/3f0c9c1e-6f5e-4d9b-9a44-0d6c6b0e8a11` | `http://localhost:5173` |
| `blob:https://example.com/3f0c9c1e-6f5e-4d9b-9a44-0d6c6b0e8a11` | `https://example.com` |
| `blob:null/3f0c9c1e-6f5e-4d9b-9a44-0d6c6b0e8a11` | `null` |
| `blob:file:///C:/x/3f0c9c1e` | `null` |
| `data:text/html,<p>hi` | `null` |
| `about:blank` | `null` |
| `javascript:void(0)` | `null` |
| `not a url` | `null` |
| `` | `null` |

## allowed

46 cases.

```json
[
  {
    "origin": "http://localhost:5173",
    "entries": [
      "http://localhost:5173"
    ],
    "expect": true
  },
  {
    "origin": "http://localhost:5173",
    "entries": [
      "http://localhost:5174"
    ],
    "expect": false
  },
  {
    "origin": "https://localhost:5173",
    "entries": [
      "http://localhost:5173"
    ],
    "expect": false
  },
  {
    "origin": "http://example.com",
    "entries": [
      "http://example.com:80"
    ],
    "expect": true
  },
  {
    "origin": "http://example.com",
    "entries": [
      "http://example.com/"
    ],
    "expect": true
  },
  {
    "origin": "http://example.com",
    "entries": [],
    "expect": false
  },
  {
    "origin": "http://localhost:3000",
    "entries": [
      "http://localhost:*"
    ],
    "expect": true
  },
  {
    "origin": "http://localhost",
    "entries": [
      "http://localhost:*"
    ],
    "expect": true
  },
  {
    "origin": "https://localhost:3000",
    "entries": [
      "http://localhost:*"
    ],
    "expect": false
  },
  {
    "origin": "http://localhost.evil.com:3000",
    "entries": [
      "http://localhost:*"
    ],
    "expect": false
  },
  {
    "origin": "https://anything.example",
    "entries": [
      "*"
    ],
    "expect": true
  },
  {
    "origin": "ws://127.0.0.1:7346",
    "entries": [
      "*"
    ],
    "expect": true
  },
  {
    "origin": "http://localhost:5173/path",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "http://user@localhost:5173",
    "entries": [
      "http://localhost:5173"
    ],
    "expect": false
  },
  {
    "origin": "not an origin",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "http://localhost:5173",
    "entries": [
      "http://localhost:5173/path"
    ],
    "expect": false
  },
  {
    "origin": "null",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "null",
    "entries": [
      "null"
    ],
    "expect": true
  },
  {
    "origin": "null",
    "entries": [
      "file://",
      "app://notes"
    ],
    "expect": false
  },
  {
    "origin": "file://",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "file://",
    "entries": [
      "file://"
    ],
    "expect": true
  },
  {
    "origin": "file://",
    "entries": [
      "file:///"
    ],
    "expect": true
  },
  {
    "origin": "file://",
    "entries": [
      "null"
    ],
    "expect": false
  },
  {
    "origin": "file://",
    "entries": [
      "file://*",
      "file://localhost",
      "http://localhost:*"
    ],
    "expect": false
  },
  {
    "origin": "file://server",
    "entries": [
      "file://",
      "file://server",
      "*"
    ],
    "expect": false
  },
  {
    "origin": "file:///C:/app/index.html",
    "entries": [
      "file://",
      "*"
    ],
    "expect": false
  },
  {
    "origin": "app://notes",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "app://notes",
    "entries": [
      "app://notes"
    ],
    "expect": true
  },
  {
    "origin": "app://notes",
    "entries": [
      "app://notes/"
    ],
    "expect": true
  },
  {
    "origin": "app://notes",
    "entries": [
      "APP://Notes"
    ],
    "expect": true
  },
  {
    "origin": "app://notes",
    "entries": [
      "app://other"
    ],
    "expect": false
  },
  {
    "origin": "app://notes",
    "entries": [
      "app://notes:*"
    ],
    "expect": true
  },
  {
    "origin": "app://notes:8080",
    "entries": [
      "app://notes:*"
    ],
    "expect": true
  },
  {
    "origin": "app://notes:8080",
    "entries": [
      "app://notes"
    ],
    "expect": false
  },
  {
    "origin": "app://notes",
    "entries": [
      "app://notes:8080"
    ],
    "expect": false
  },
  {
    "origin": "app://notes",
    "entries": [
      "other://notes",
      "app://notes.evil",
      "null",
      "file://"
    ],
    "expect": false
  },
  {
    "origin": "app://notes.evil",
    "entries": [
      "app://notes:*"
    ],
    "expect": false
  },
  {
    "origin": "app://Notes",
    "entries": [
      "app://notes",
      "*"
    ],
    "expect": false
  },
  {
    "origin": "app://notes/index.html",
    "entries": [
      "app://notes",
      "*"
    ],
    "expect": false
  },
  {
    "origin": "app://user@notes",
    "entries": [
      "app://notes",
      "*"
    ],
    "expect": false
  },
  {
    "origin": "app://-",
    "entries": [
      "app://-"
    ],
    "expect": true
  },
  {
    "origin": "app://-",
    "entries": [
      "*",
      "app://."
    ],
    "expect": false
  },
  {
    "origin": "app://.",
    "entries": [
      "app://."
    ],
    "expect": true
  },
  {
    "origin": "app://notes.",
    "entries": [
      "app://notes"
    ],
    "expect": false
  },
  {
    "origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    "entries": [
      "*"
    ],
    "expect": false
  },
  {
    "origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
    "entries": [
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
    ],
    "expect": true
  }
]
```

## surfaceUrl

22 entries.

| `origin` | `url` | `expect` |
|---|---|---|
| `http://localhost:5173` | `http://localhost:5173/menu` | `true` |
| `http://localhost:5173` | `http://localhost:5174/menu` | `false` |
| `http://localhost:5173` | `blob:http://localhost:5173/3f0c9c1e` | `true` |
| `file://` | `file:///C:/Users/me/app/index.html` | `true` |
| `file://` | `file://server/share/index.html` | `true` |
| `file://` | `app://notes/index.html` | `false` |
| `file://` | `http://localhost:5173/` | `false` |
| `app://notes` | `app://notes/index.html#/settings` | `true` |
| `app://notes` | `app://other/index.html` | `false` |
| `app://notes` | `app://notes:8080/index.html` | `false` |
| `app://notes` | `file:///C:/app/index.html` | `false` |
| `app://notes` | `https://notes/index.html` | `false` |
| `app://-` | `app://-/index.html` | `true` |
| `app://.` | `app://./index.html#/settings` | `true` |
| `app://-` | `app://./index.html` | `false` |
| `null` | `reins-plain://notes/page.html` | `true` |
| `null` | `file:///C:/app/index.html` | `true` |
| `null` | `data:text/html,<p>hi` | `true` |
| `null` | `blob:null/3f0c9c1e` | `true` |
| `null` | `http://localhost:5173/` | `false` |
| `null` | `blob:http://localhost:5173/3f0c9c1e` | `false` |
| `null` | `not a url` | `false` |

Generated by `conformance/tools/make-vectors.mjs` from the formulas in the specification, with `node:crypto` only.
