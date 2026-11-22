var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// packages/core/src/protocol.ts
var PROTOCOL_VERSION, SUPPORTED_VERSIONS, WS_SUBPROTOCOL, DEFAULT_PORT, SCOPES, LEVELS, DEFAULT_LEVEL, ERROR_CODES, ReinsError, DEFAULT_LIMITS, MAX_MANIFEST_BYTES, MAX_ACTIONS, MAX_VIEWS, MAX_RESULT_BYTES, MAX_NAME_CHARS, MAX_VALUE_CHARS, MAX_SURFACE_SESSIONS, NAME_PATTERN, COLOR_PATTERN, HOUR, MIN, POLICY_PRESETS, CHAT_RELAY, CHAT_TO_PERSON, CHAT_STATES, CHAT_MAX_TEXT, CHAT_MAX_NOTE, CHAT_TRANSCRIPT_MAX, CHAT_READ_DEFAULT, CHAT_READ_MAX, CHAT_READ_BYTES, CHAT_STATUS_TTL_MS, UI_KEYS, METHOD_SCOPE, READ_ONLY_METHODS, CHAT_SPEAK_METHODS, TOPICS, SUBSCRIBABLE_TOPICS, AUTH_CONTEXT, SEAL_CONTEXT, SEAL_CONFIRM_MS, SEAL_KIND, SEAL_MAC_BYTES, SEAL_MAC_TEXT_LENGTH, SEAL_SEPARATOR, BIN_POINTER, PTR_FLAG_DROPPABLE, PTR_FLAG_END, PTR_HEADER_BYTES, PTR_POINT_BYTES, PTR_MAX_POINTS, PTR_INITIAL_CREDIT;
var init_protocol = __esm({
  "packages/core/src/protocol.ts"() {
    "use strict";
    PROTOCOL_VERSION = "0.1";
    SUPPORTED_VERSIONS = ["0.1"];
    WS_SUBPROTOCOL = "reins.v1";
    DEFAULT_PORT = 7346;
    SCOPES = ["observe", "act", "ui", "cursor", "show", "nav", "chat"];
    LEVELS = ["strict", "ask", "auto", "bypass"];
    DEFAULT_LEVEL = "ask";
    ERROR_CODES = [
      "E_BAD_FRAME",
      // malformed frame, unknown frame type, protocol violation
      "E_VERSION",
      // no protocol version in common
      "E_AUTH",
      // missing or wrong proof
      "E_ORIGIN",
      // origin not allowed for this role
      "E_TOO_LARGE",
      // frame, manifest or result over a size limit
      "E_UNKNOWN_METHOD",
      "E_BAD_ARGS",
      // params fail validation
      "E_NO_SURFACE",
      // unknown surface id
      "E_NOT_ATTACHED",
      // no live grant for this surface
      "E_SCOPE",
      // grant lacks the scope this method needs
      "E_DENIED",
      // policy says no
      "E_CONSENT",
      // a human declined, or the consent prompt timed out
      "E_PAUSED",
      // the human paused agent control
      "E_RATE",
      // rate limit hit
      "E_NO_TARGET",
      // handle does not resolve to a live, exposed element
      "E_TIMEOUT",
      // the other side did not answer in time
      "E_GONE",
      // surface or agent disconnected mid-request
      "E_BUSY",
      // too many sessions, surfaces or streams
      "E_INTERNAL"
      // unexpected failure; the message never carries internals
    ];
    ReinsError = class extends Error {
      code;
      data;
      constructor(code, msg, data) {
        super(msg);
        this.name = "ReinsError";
        this.code = code;
        this.data = data;
      }
      toWire() {
        return this.data === void 0 ? { code: this.code, msg: this.message } : { code: this.code, msg: this.message, data: this.data };
      }
    };
    DEFAULT_LIMITS = {
      maxText: 262144,
      maxBinary: 16384,
      heartbeatMs: 15e3,
      reqTimeoutMs: 15e3,
      consentTimeoutMs: 6e4
    };
    MAX_MANIFEST_BYTES = 65536;
    MAX_ACTIONS = 256;
    MAX_VIEWS = 64;
    MAX_RESULT_BYTES = 32768;
    MAX_NAME_CHARS = 120;
    MAX_VALUE_CHARS = 200;
    MAX_SURFACE_SESSIONS = 32;
    NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
    COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    HOUR = 36e5;
    MIN = 6e4;
    POLICY_PRESETS = {
      // Local development: everything reachable, risky actions still ask.
      open: {
        profile: "open",
        scopes: ["observe", "act", "ui", "cursor", "show", "nav", "chat"],
        attach: "allow",
        risk: { safe: "allow", sensitive: "confirm", dangerous: "confirm" },
        actions: {},
        exposure: "auto",
        privateInput: false,
        coordinates: true,
        framed: false,
        nav: ["/"],
        chatRelay: "on",
        rates: { observe: 30, act: 30, ui: 60, cursor: 120, show: 30, nav: 2, chat: 10 },
        pointerRate: 4e3,
        ttlMs: 8 * HOUR,
        idleMs: 30 * MIN,
        human: { yieldMs: 600, pause: true, stop: true, levels: ["strict", "ask", "auto", "bypass"], panel: true },
        consent: { timeoutMs: 6e4, remember: "session" }
      },
      // Default for a person's own browser: the user approves every attach and every sensitive action.
      guarded: {
        profile: "guarded",
        scopes: ["observe", "act", "ui", "cursor", "show", "nav", "chat"],
        attach: "confirm",
        risk: { safe: "allow", sensitive: "confirm", dangerous: "deny" },
        actions: {},
        exposure: "auto",
        privateInput: false,
        coordinates: true,
        framed: false,
        nav: ["/"],
        // Who hears whom is the person's choice: agents hear each other once the person says so.
        chatRelay: "person",
        rates: { observe: 20, act: 20, ui: 40, cursor: 60, show: 20, nav: 1, chat: 5 },
        pointerRate: 2e3,
        ttlMs: 2 * HOUR,
        idleMs: 15 * MIN,
        human: { yieldMs: 800, pause: true, stop: true, levels: ["strict", "ask", "auto", "bypass"], panel: true },
        consent: { timeoutMs: 6e4, remember: "never" }
      },
      // Unattended station: a fixed allowlist, no synthetic input, no navigation, nobody to ask.
      kiosk: {
        profile: "kiosk",
        scopes: ["observe", "act", "cursor", "show"],
        attach: "allow",
        risk: { safe: "allow", sensitive: "deny", dangerous: "deny" },
        actions: {},
        exposure: "annotated",
        privateInput: false,
        coordinates: false,
        framed: false,
        nav: [],
        // A kiosk grants no `chat` scope: its allowlist stays what it was, and nothing is relayed.
        chatRelay: "off",
        rates: { observe: 20, act: 10, ui: 0, cursor: 60, show: 10, nav: 0, chat: 0 },
        pointerRate: 2e3,
        ttlMs: 8 * HOUR,
        idleMs: 5 * MIN,
        // A kiosk visitor is not the owner: no level to switch, no panel to open.
        human: { yieldMs: 400, pause: true, stop: false, levels: [], panel: false },
        consent: { timeoutMs: 3e4, remember: "never" }
      }
    };
    CHAT_RELAY = ["off", "person", "on"];
    CHAT_TO_PERSON = "person";
    CHAT_STATES = ["idle", "thinking", "working"];
    CHAT_MAX_TEXT = 4e3;
    CHAT_MAX_NOTE = 80;
    CHAT_TRANSCRIPT_MAX = 200;
    CHAT_READ_DEFAULT = 20;
    CHAT_READ_MAX = 50;
    CHAT_READ_BYTES = 131072;
    CHAT_STATUS_TTL_MS = 12e4;
    UI_KEYS = ["Enter", "Escape", "Tab", "Backspace", "Delete", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"];
    METHOD_SCOPE = {
      observe: "observe",
      read: "observe",
      "state.get": "observe",
      sub: "observe",
      unsub: "observe",
      act: "act",
      "ui.click": "ui",
      "ui.type": "ui",
      "ui.select": "ui",
      "ui.scroll": "ui",
      "ui.key": "ui",
      "cursor.move": "cursor",
      "cursor.set": "cursor",
      "stream.open": "cursor",
      "show.toast": "show",
      "show.highlight": "show",
      "show.view": "show",
      "show.clear": "show",
      "nav.go": "nav",
      "chat.say": "chat",
      "chat.read": "chat",
      "chat.status": "chat"
    };
    READ_ONLY_METHODS = ["observe", "read", "state.get", "sub", "unsub", "chat.read"];
    CHAT_SPEAK_METHODS = ["chat.say", "chat.status"];
    TOPICS = ["ui", "state", "user", "nav", "grant", "surface", "chat"];
    SUBSCRIBABLE_TOPICS = ["ui", "state", "user", "nav"];
    AUTH_CONTEXT = { peer: "reins.v1.auth", hub: "reins.v1.hub" };
    SEAL_CONTEXT = { peer: "reins.v1.seal.peer", hub: "reins.v1.seal.hub" };
    SEAL_CONFIRM_MS = 5e3;
    SEAL_KIND = { text: 116, binary: 98 };
    SEAL_MAC_BYTES = 32;
    SEAL_MAC_TEXT_LENGTH = 43;
    SEAL_SEPARATOR = ".";
    BIN_POINTER = 1;
    PTR_FLAG_DROPPABLE = 1;
    PTR_FLAG_END = 2;
    PTR_HEADER_BYTES = 10;
    PTR_POINT_BYTES = 6;
    PTR_MAX_POINTS = Math.floor((DEFAULT_LIMITS.maxBinary - PTR_HEADER_BYTES) / PTR_POINT_BYTES);
    PTR_INITIAL_CREDIT = 512;
  }
});

// packages/core/src/util.ts
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function hasOwn(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}
function own(o, k) {
  return hasOwn(o, k) ? o[k] : void 0;
}
function setOwn(o, k, v) {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
}
function deepEqual(a, b, depth = 0) {
  if (a === b) return true;
  if (depth > MAX_DEPTH) return false;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b;
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], bb[i], depth + 1)) return false;
    return true;
  }
  const ka = Object.keys(a).filter((k) => a[k] !== void 0);
  const kb = Object.keys(b).filter((k) => b[k] !== void 0);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!hasOwn(b, k)) return false;
    if (!deepEqual(a[k], b[k], depth + 1)) return false;
  }
  return true;
}
function safeClone(v, depth = 0) {
  if (typeof v !== "object" || v === null) return v;
  if (depth > MAX_DEPTH) throw new RangeError("value nested too deeply");
  if (Array.isArray(v)) return v.map((x) => safeClone(x, depth + 1));
  const out = {};
  for (const k of Object.keys(v)) setOwn(out, k, safeClone(v[k], depth + 1));
  return out;
}
var FORBIDDEN_KEYS, MAX_DEPTH;
var init_util = __esm({
  "packages/core/src/util.ts"() {
    "use strict";
    FORBIDDEN_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
    MAX_DEPTH = 100;
  }
});

// packages/core/src/codec.ts
function encodeFrame(f) {
  return JSON.stringify(f);
}
function utf8Length(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) n += 1;
    else if (c < 2048) n += 2;
    else if (c >= 55296 && c <= 56319 && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 56320 && d <= 57343) {
        n += 4;
        i++;
      } else n += 3;
    } else n += 3;
  }
  return n;
}
function bad(why) {
  throw new ReinsError("E_BAD_FRAME", `bad frame: ${why}`);
}
function str(o, k) {
  const v = o[k];
  if (typeof v !== "string") bad(`${k} must be a string`);
  return v;
}
function optStr(o, k) {
  return o[k] === void 0 ? void 0 : str(o, k);
}
function num(o, k) {
  const v = o[k];
  if (typeof v !== "number" || !Number.isFinite(v)) bad(`${k} must be a number`);
  return v;
}
function int(o, k) {
  const v = num(o, k);
  if (!Number.isSafeInteger(v) || v < 0) bad(`${k} must be a non-negative integer`);
  return v;
}
function obj(o, k) {
  const v = o[k];
  if (!isPlainObject(v)) bad(`${k} must be an object`);
  return v;
}
function optObj(o, k) {
  return o[k] === void 0 ? void 0 : obj(o, k);
}
function role(o) {
  const v = o.role;
  if (v !== "agent" && v !== "surface") bad("role must be agent or surface");
  return v;
}
function compact(o) {
  const out = {};
  for (const k of Object.keys(o)) if (o[k] !== void 0) out[k] = o[k];
  return out;
}
function decodeFrame(text, maxBytes = DEFAULT_LIMITS.maxText) {
  if (typeof text !== "string") bad("not text");
  if (text.length > maxBytes || utf8Length(text) > maxBytes) throw new ReinsError("E_TOO_LARGE", "frame too large");
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    bad("invalid JSON");
  }
  if (!isPlainObject(raw)) bad("not an object");
  const o = raw;
  switch (o.t) {
    case "challenge": {
      const v = o.v;
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) bad("v must be a string array");
      const hub = obj(o, "hub");
      return { t: "challenge", v: [...v], nonce: str(o, "nonce"), hub: { name: str(hub, "name"), ver: str(hub, "ver") } };
    }
    case "hello": {
      const auth = optObj(o, "auth");
      const surface = optObj(o, "surface");
      return compact({
        t: "hello",
        v: str(o, "v"),
        role: role(o),
        name: str(o, "name"),
        cnonce: str(o, "cnonce"),
        auth: auth && { kid: str(auth, "kid"), proof: str(auth, "proof") },
        surface: surface && { manifest: obj(surface, "manifest"), url: str(surface, "url"), title: str(surface, "title") }
      });
    }
    case "welcome": {
      const l = obj(o, "limits");
      return compact({
        t: "welcome",
        v: str(o, "v"),
        session: str(o, "session"),
        role: role(o),
        limits: {
          maxText: num(l, "maxText"),
          maxBinary: num(l, "maxBinary"),
          heartbeatMs: num(l, "heartbeatMs"),
          reqTimeoutMs: num(l, "reqTimeoutMs"),
          consentTimeoutMs: num(l, "consentTimeoutMs")
        },
        proof: optStr(o, "proof")
      });
    }
    case "req": {
      if (o.c !== void 0 && o.c !== 1) bad("c must be 1");
      return compact({ t: "req", id: int(o, "id"), m: str(o, "m"), p: optObj(o, "p"), ag: optStr(o, "ag"), c: o.c });
    }
    case "res": {
      const re = int(o, "re");
      if (o.ok === true) return compact({ t: "res", re, ok: true, r: o.r });
      if (o.ok !== false) bad("ok must be a boolean");
      const e = obj(o, "e");
      return compact({ t: "res", re, ok: false, e: compact({ code: str(e, "code"), msg: str(e, "msg"), data: e.data }) });
    }
    case "evt":
      return compact({ t: "evt", topic: str(o, "topic"), s: optStr(o, "s"), ag: optStr(o, "ag"), d: o.d });
    case "flow":
      return { t: "flow", ch: int(o, "ch"), credit: num(o, "credit") };
    case "ping":
      return { t: "ping", ts: num(o, "ts") };
    case "pong":
      return { t: "pong", ts: num(o, "ts") };
    case "bye":
      return compact({ t: "bye", code: str(o, "code"), msg: optStr(o, "msg") });
    default:
      bad("unknown frame type");
  }
}
function binaryKind(bytes) {
  return bytes.length > 0 ? bytes[0] : -1;
}
function clamp01(v) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}
function clampU16(v) {
  return Number.isFinite(v) ? Math.min(65535, Math.max(0, Math.round(v))) : 0;
}
function encodePointer(f) {
  const n = f.points.length;
  if (n > PTR_MAX_POINTS) throw new ReinsError("E_TOO_LARGE", "too many points in one frame");
  const out = new Uint8Array(PTR_HEADER_BYTES + n * PTR_POINT_BYTES);
  const dv = new DataView(out.buffer);
  dv.setUint8(0, BIN_POINTER);
  dv.setUint8(1, f.flags & 255);
  dv.setUint16(2, f.ch & 65535, true);
  dv.setUint32(4, f.seq >>> 0, true);
  dv.setUint16(8, n, true);
  let off = PTR_HEADER_BYTES;
  for (const p of f.points) {
    dv.setUint16(off, Math.round(clamp01(p.x) * 65535), true);
    dv.setUint16(off + 2, Math.round(clamp01(p.y) * 65535), true);
    dv.setUint16(off + 4, clampU16(p.dt), true);
    off += PTR_POINT_BYTES;
  }
  return out;
}
function decodePointer(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < PTR_HEADER_BYTES) bad("pointer frame too short");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint8(0) !== BIN_POINTER) bad("not a pointer frame");
  const n = dv.getUint16(8, true);
  if (bytes.length !== PTR_HEADER_BYTES + n * PTR_POINT_BYTES) bad("pointer frame length mismatch");
  const points = [];
  let off = PTR_HEADER_BYTES;
  for (let i = 0; i < n; i++) {
    points.push({ x: dv.getUint16(off, true) / 65535, y: dv.getUint16(off + 2, true) / 65535, dt: dv.getUint16(off + 4, true) });
    off += PTR_POINT_BYTES;
  }
  return { ch: dv.getUint16(2, true), seq: dv.getUint32(4, true), flags: dv.getUint8(1), points };
}
var init_codec = __esm({
  "packages/core/src/codec.ts"() {
    "use strict";
    init_protocol();
    init_util();
  }
});

// packages/core/src/schema.ts
function patternOf(schema) {
  if (schema.pattern === void 0) return null;
  let re = regexCache.get(schema);
  if (!re) {
    re = new RegExp(schema.pattern, "u");
    regexCache.set(schema, re);
  }
  return re;
}
function codePoints(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 55296 && c <= 56319 && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 56320 && d <= 57343) i++;
    }
    n++;
  }
  return n;
}
function jsonLine(s) {
  return JSON.stringify(s).replace(/[\u007f-\u009f\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
function child(path, key) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? `${path}.${key}` : `${path}[${jsonLine(key)}]`;
}
function isCount(v) {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}
function checkSchema(schema) {
  return checkAt(schema, "$", 0);
}
function checkAt(s, path, depth) {
  if (depth > MAX_SCHEMA_DEPTH) return `${path}: nested too deeply`;
  if (!isPlainObject(s)) return `${path}: schema must be an object`;
  const type = own(s, "type");
  if (typeof type !== "string" || !hasOwn(ALLOWED_KEYS, type)) return `${path}: unknown type`;
  const allowed = ALLOWED_KEYS[type];
  for (const k of Object.keys(s)) if (!allowed.includes(k)) return `${path}: keyword ${jsonLine(k)} not allowed for ${type}`;
  if (s.description !== void 0 && typeof s.description !== "string") return `${path}: description must be a string`;
  switch (type) {
    case "string": {
      if (s.enum !== void 0) {
        if (!Array.isArray(s.enum) || s.enum.length === 0 || !s.enum.every((x) => typeof x === "string")) return `${path}: enum must be a non-empty string array`;
      }
      if (s.minLength !== void 0 && !isCount(s.minLength)) return `${path}: minLength must be a non-negative integer`;
      if (s.maxLength !== void 0 && !isCount(s.maxLength)) return `${path}: maxLength must be a non-negative integer`;
      if (s.minLength !== void 0 && s.maxLength !== void 0 && s.minLength > s.maxLength) return `${path}: minLength exceeds maxLength`;
      if (s.pattern !== void 0) {
        if (typeof s.pattern !== "string") return `${path}: pattern must be a string`;
        try {
          new RegExp(s.pattern, "u");
        } catch {
          return `${path}: invalid pattern`;
        }
      }
      return null;
    }
    case "number":
    case "integer": {
      for (const k of ["minimum", "maximum"]) {
        const v = s[k];
        if (v !== void 0 && (typeof v !== "number" || !Number.isFinite(v))) return `${path}: ${k} must be a finite number`;
      }
      if (s.minimum !== void 0 && s.maximum !== void 0 && s.minimum > s.maximum) return `${path}: minimum exceeds maximum`;
      return null;
    }
    case "boolean":
      return null;
    case "array": {
      if (s.minItems !== void 0 && !isCount(s.minItems)) return `${path}: minItems must be a non-negative integer`;
      if (s.maxItems !== void 0 && !isCount(s.maxItems)) return `${path}: maxItems must be a non-negative integer`;
      if (s.minItems !== void 0 && s.maxItems !== void 0 && s.minItems > s.maxItems) return `${path}: minItems exceeds maxItems`;
      if (!hasOwn(s, "items")) return `${path}: items is required`;
      return checkAt(s.items, `${path}[]`, depth + 1);
    }
    case "object": {
      const props = own(s, "properties");
      if (!isPlainObject(props)) return `${path}: properties must be an object`;
      for (const k of Object.keys(props)) {
        if (FORBIDDEN_KEYS.has(k) || !PROP_NAME.test(k)) return `${path}: invalid property name ${jsonLine(k)}`;
        const err = checkAt(props[k], child(path, k), depth + 1);
        if (err) return err;
      }
      if (s.required !== void 0) {
        const req = s.required;
        if (!Array.isArray(req)) return `${path}: required must be an array`;
        const seen = /* @__PURE__ */ new Set();
        for (const r of req) {
          if (typeof r !== "string" || !hasOwn(props, r)) return `${path}: required names an undeclared property`;
          if (seen.has(r)) return `${path}: duplicate required property`;
          seen.add(r);
        }
      }
      return null;
    }
  }
  return `${path}: unknown type`;
}
function validate(schema, value) {
  if (schema === void 0) {
    if (value === void 0 || isPlainObject(value) && Object.keys(value).length === 0) return null;
    return "$: takes no arguments";
  }
  return validateAt(schema, value, "$", 0);
}
function typeName(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}
function validateAt(s, v, path, depth) {
  if (depth > MAX_SCHEMA_DEPTH || !isPlainObject(s)) return `${path}: invalid schema`;
  switch (s.type) {
    case "string": {
      if (typeof v !== "string") return `${path}: expected string, got ${typeName(v)}`;
      if (s.enum !== void 0 && !s.enum.includes(v)) return `${path}: must be one of ${s.enum.map((x) => jsonLine(x)).join(", ")}`;
      if (s.minLength !== void 0 || s.maxLength !== void 0) {
        const n = codePoints(v);
        if (s.minLength !== void 0 && n < s.minLength) return `${path}: shorter than ${s.minLength}`;
        if (s.maxLength !== void 0 && n > s.maxLength) return `${path}: longer than ${s.maxLength}`;
      }
      let re;
      try {
        re = patternOf(s);
      } catch {
        return `${path}: invalid schema`;
      }
      if (re && !re.test(v)) return `${path}: does not match pattern`;
      return null;
    }
    case "number":
    case "integer": {
      if (typeof v !== "number" || !Number.isFinite(v)) return `${path}: expected ${s.type === "integer" ? "integer" : "number"}, got ${typeName(v)}`;
      if (s.type === "integer" && !Number.isInteger(v)) return `${path}: expected integer`;
      if (s.minimum !== void 0 && v < s.minimum) return `${path}: below minimum ${s.minimum}`;
      if (s.maximum !== void 0 && v > s.maximum) return `${path}: above maximum ${s.maximum}`;
      return null;
    }
    case "boolean":
      return typeof v === "boolean" ? null : `${path}: expected boolean, got ${typeName(v)}`;
    case "array": {
      if (!Array.isArray(v)) return `${path}: expected array, got ${typeName(v)}`;
      if (s.minItems !== void 0 && v.length < s.minItems) return `${path}: fewer than ${s.minItems} items`;
      if (s.maxItems !== void 0 && v.length > s.maxItems) return `${path}: more than ${s.maxItems} items`;
      for (let i = 0; i < v.length; i++) {
        const err = validateAt(s.items, v[i], `${path}[${i}]`, depth + 1);
        if (err) return err;
      }
      return null;
    }
    case "object": {
      if (!isPlainObject(v)) return `${path}: expected object, got ${typeName(v)}`;
      const props = s.properties;
      for (const k of Object.keys(v)) {
        if (!isPlainObject(props) || !hasOwn(props, k)) return `${child(path, k)}: not allowed`;
      }
      for (const r of s.required ?? []) {
        if (!hasOwn(v, r) || v[r] === void 0) return `${child(path, r)}: required`;
      }
      for (const k of Object.keys(v)) {
        if (v[k] === void 0) continue;
        const err = validateAt(props[k], v[k], child(path, k), depth + 1);
        if (err) return err;
      }
      return null;
    }
  }
  return `${path}: invalid schema`;
}
function range(min, max) {
  if (min === void 0 && max === void 0) return "";
  return ` ${min ?? ""}..${max ?? ""}`;
}
function typeSig(s) {
  switch (s.type) {
    case "string":
      return s.enum ? s.enum.map((x) => jsonLine(x)).join("|") : "str";
    case "integer":
      return `int${range(s.minimum, s.maximum)}`;
    case "number":
      return `num${range(s.minimum, s.maximum)}`;
    case "boolean":
      return "bool";
    case "array":
      return `[${typeSig(s.items)}]`;
    case "object":
      return `{${propsSig(s)}}`;
  }
  return "?";
}
function propsSig(s) {
  const req = new Set(s.required ?? []);
  return Object.keys(s.properties).map((k) => `${k}${req.has(k) ? "" : "?"}: ${typeSig(s.properties[k])}`).join(", ");
}
function schemaSignature(schema) {
  if (schema === void 0) return "()";
  if (schema.type === "object") return `(${propsSig(schema)})`;
  return `(${typeSig(schema)})`;
}
var PROP_NAME, MAX_SCHEMA_DEPTH, ALLOWED_KEYS, regexCache;
var init_schema = __esm({
  "packages/core/src/schema.ts"() {
    "use strict";
    init_util();
    PROP_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;
    MAX_SCHEMA_DEPTH = 16;
    ALLOWED_KEYS = {
      string: ["type", "description", "enum", "minLength", "maxLength", "pattern"],
      number: ["type", "description", "minimum", "maximum"],
      integer: ["type", "description", "minimum", "maximum"],
      boolean: ["type", "description"],
      array: ["type", "description", "items", "minItems", "maxItems"],
      object: ["type", "description", "properties", "required"]
    };
    regexCache = /* @__PURE__ */ new WeakMap();
  }
});

// packages/core/src/crypto.ts
function subtle() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new ReinsError("E_INTERNAL", "WebCrypto is not available");
  return c.subtle;
}
function b64urlEncode(bytes) {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
    out += ALPHABET[n >> 18 & 63] + ALPHABET[n >> 12 & 63] + ALPHABET[n >> 6 & 63] + ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[n >> 18 & 63] + ALPHABET[n >> 12 & 63];
  } else if (rest === 2) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8;
    out += ALPHABET[n >> 18 & 63] + ALPHABET[n >> 12 & 63] + ALPHABET[n >> 6 & 63];
  }
  return out;
}
function randomToken(bytes = 32) {
  const c = globalThis.crypto;
  if (!c) throw new ReinsError("E_INTERNAL", "WebCrypto is not available");
  if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > 65536) throw new ReinsError("E_BAD_ARGS", "invalid token length");
  return b64urlEncode(c.getRandomValues(new Uint8Array(bytes)));
}
async function sha256(data) {
  const bytes = typeof data === "string" ? enc.encode(data) : new Uint8Array(data);
  return b64urlEncode(new Uint8Array(await subtle().digest("SHA-256", bytes)));
}
async function hmacSha256(key, msg) {
  const k = await subtle().importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64urlEncode(new Uint8Array(await subtle().sign("HMAC", k, enc.encode(msg))));
}
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const n = Math.max(a.length, b.length);
  let diff2 = a.length ^ b.length;
  for (let i = 0; i < n; i++) diff2 |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  return diff2 === 0;
}
function wellFormed(s) {
  const native = s.isWellFormed;
  if (typeof native === "function") return native.call(s);
  return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
}
function proofInput(context, f) {
  const parts = [f.role, f.kid, f.nonce, f.cnonce];
  if (parts.some((p) => typeof p !== "string" || p.includes("\n") || !wellFormed(p))) throw new ReinsError("E_AUTH", "invalid proof fields");
  return `${context}
${parts.join("\n")}`;
}
async function peerProof(key, f) {
  return hmacSha256(key, proofInput(AUTH_CONTEXT.peer, f));
}
async function hubProof(key, f) {
  return hmacSha256(key, proofInput(AUTH_CONTEXT.hub, f));
}
var ALPHABET, LOOKUP, enc;
var init_crypto = __esm({
  "packages/core/src/crypto.ts"() {
    "use strict";
    init_protocol();
    ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    LOOKUP = (() => {
      const t = new Int16Array(128).fill(-1);
      for (let i = 0; i < ALPHABET.length; i++) t[ALPHABET.charCodeAt(i)] = i;
      return t;
    })();
    enc = new TextEncoder();
  }
});

// packages/core/src/policy.ts
function fail(field, why) {
  throw new ReinsError("E_BAD_ARGS", `policy.${field}: ${why}`);
}
function clonePolicy(p) {
  return {
    ...p,
    scopes: [...p.scopes],
    risk: { ...p.risk },
    actions: { ...p.actions },
    nav: [...p.nav],
    rates: { ...p.rates },
    human: { ...p.human, levels: [...p.human.levels] },
    consent: { ...p.consent }
  };
}
function decision(v, field) {
  if (!DECISIONS.includes(v)) fail(field, "must be allow, confirm or deny");
  return v;
}
function bool(v, field) {
  if (typeof v !== "boolean") fail(field, "must be a boolean");
  return v;
}
function nonNeg(v, field) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) fail(field, "must be a non-negative number");
  return v;
}
function positive(v, field) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) fail(field, "must be a positive number");
  return v;
}
function subObject(v, field, keys) {
  if (!isPlainObject(v)) fail(field, "must be an object");
  for (const k of Object.keys(v)) if (!keys.includes(k)) fail(`${field}.${k}`, "unknown field");
  return v;
}
function resolvePolicy(input) {
  if (input === void 0) return clonePolicy(POLICY_PRESETS.guarded);
  if (typeof input === "string") {
    if (!PROFILES.includes(input)) fail("profile", "unknown profile");
    return clonePolicy(POLICY_PRESETS[input]);
  }
  if (!isPlainObject(input)) fail("profile", "policy must be a profile name or an object");
  const o = input;
  for (const k of Object.keys(o)) if (!TOP_KEYS.includes(k)) fail(k, "unknown field");
  const profile = o.profile === void 0 ? "guarded" : o.profile;
  if (!PROFILES.includes(profile)) fail("profile", "unknown profile");
  const p = clonePolicy(POLICY_PRESETS[profile]);
  if (o.scopes !== void 0) {
    if (!Array.isArray(o.scopes) || !o.scopes.every((s) => SCOPES.includes(s))) fail("scopes", "must list known scopes");
    p.scopes = capScopes(o.scopes);
  }
  if (o.attach !== void 0) p.attach = decision(o.attach, "attach");
  if (o.risk !== void 0) {
    const r = subObject(o.risk, "risk", RISKS);
    for (const k of Object.keys(r)) if (r[k] !== void 0) p.risk[k] = decision(r[k], `risk.${k}`);
  }
  if (o.actions !== void 0) {
    if (!isPlainObject(o.actions)) fail("actions", "must be an object");
    const a = o.actions;
    for (const k of Object.keys(a)) {
      if (k.length > 66 || !NAME_PATTERN.test(k) && !PREFIX_PATTERN.test(k)) fail(`actions[${JSON.stringify(k.slice(0, 64))}]`, "must be an action name or a prefix ending in .*");
      Object.defineProperty(p.actions, k, { value: decision(a[k], `actions.${k}`), enumerable: true, writable: true, configurable: true });
    }
  }
  if (o.exposure !== void 0) {
    if (!EXPOSURES.includes(o.exposure)) fail("exposure", "must be auto, annotated or none");
    p.exposure = o.exposure;
  }
  if (o.privateInput !== void 0) p.privateInput = bool(o.privateInput, "privateInput");
  if (o.coordinates !== void 0) p.coordinates = bool(o.coordinates, "coordinates");
  if (o.framed !== void 0) p.framed = bool(o.framed, "framed");
  if (o.nav !== void 0) {
    if (!Array.isArray(o.nav) || !o.nav.every((x) => typeof x === "string" && x.startsWith("/") && !x.startsWith("//"))) fail("nav", "must be path prefixes starting with /");
    p.nav = [...o.nav];
  }
  if (o.chatRelay !== void 0) {
    const v = o.chatRelay === true ? "on" : o.chatRelay === false ? "off" : o.chatRelay;
    if (!CHAT_RELAY.includes(v)) fail("chatRelay", "must be off, person or on");
    p.chatRelay = v;
  }
  if (o.rates !== void 0) {
    const r = subObject(o.rates, "rates", SCOPES);
    for (const k of Object.keys(r)) if (r[k] !== void 0) p.rates[k] = nonNeg(r[k], `rates.${k}`);
  }
  if (o.pointerRate !== void 0) p.pointerRate = nonNeg(o.pointerRate, "pointerRate");
  if (o.ttlMs !== void 0) p.ttlMs = positive(o.ttlMs, "ttlMs");
  if (o.idleMs !== void 0) p.idleMs = positive(o.idleMs, "idleMs");
  if (o.human !== void 0) {
    const h = subObject(o.human, "human", ["yieldMs", "pause", "stop", "levels", "panel"]);
    if (h.yieldMs !== void 0) p.human.yieldMs = nonNeg(h.yieldMs, "human.yieldMs");
    if (h.pause !== void 0) p.human.pause = bool(h.pause, "human.pause");
    if (h.stop !== void 0) p.human.stop = bool(h.stop, "human.stop");
    if (h.levels !== void 0) {
      const l = h.levels;
      if (!Array.isArray(l) || !l.every((x) => LEVELS.includes(x))) fail("human.levels", `must list known levels (${LEVELS.join(", ")})`);
      p.human.levels = LEVELS.filter((x) => l.includes(x));
    }
    if (h.panel !== void 0) p.human.panel = bool(h.panel, "human.panel");
  }
  if (o.consent !== void 0) {
    const c = subObject(o.consent, "consent", ["timeoutMs", "remember"]);
    if (c.timeoutMs !== void 0) p.consent.timeoutMs = positive(c.timeoutMs, "consent.timeoutMs");
    if (c.remember !== void 0) {
      if (c.remember !== "never" && c.remember !== "session") fail("consent.remember", "must be never or session");
      p.consent.remember = c.remember;
    }
  }
  return p;
}
function rank(d) {
  const i = DECISIONS.indexOf(d);
  return i < 0 ? 2 : i;
}
function stricter(a, b) {
  return DECISIONS[Math.max(rank(a), rank(b))];
}
function decideAction(policy, action) {
  const overrides = policy.actions;
  if (hasOwn(overrides, action.name)) return DECISIONS[rank(overrides[action.name])];
  let best;
  for (const key of Object.keys(overrides)) {
    if (!key.endsWith(".*")) continue;
    const prefix = key.slice(0, -1);
    if (action.name.startsWith(prefix) && (best === void 0 || key.length > best.length)) best = key;
  }
  if (best !== void 0) return DECISIONS[rank(overrides[best])];
  return hasOwn(policy.risk, action.risk) ? DECISIONS[rank(policy.risk[action.risk])] : "deny";
}
function capLevels(...lists) {
  return LEVELS.filter((l) => l === "ask" || l === "strict" || lists.every((c) => Array.isArray(c) && c.includes(l)));
}
function keptSettings(v, granted, actions) {
  const out = { level: void 0, rules: /* @__PURE__ */ new Map(), off: [] };
  if (!isPlainObject(v)) return out;
  if (hasOwn(v, "level") && v.level === "strict") out.level = "strict";
  const rules = hasOwn(v, "rules") ? v.rules : void 0;
  if (isPlainObject(rules)) {
    for (const name2 of actions) {
      const d = hasOwn(rules, name2) ? rules[name2] : void 0;
      if (d === "confirm" || d === "deny") out.rules.set(name2, d);
    }
  }
  const off = hasOwn(v, "off") ? v.off : void 0;
  if (Array.isArray(off)) out.off = granted.filter((x) => off.includes(x));
  return out;
}
function actionDecisions(policy, actions) {
  const out = {};
  for (const a of actions) Object.defineProperty(out, a.name, { value: decideAction(policy, a), enumerable: true, writable: true, configurable: true });
  return out;
}
function hubDecision(decisions, name2) {
  if (!isPlainObject(decisions) || !hasOwn(decisions, name2)) return "confirm";
  const d = decisions[name2];
  return d === "allow" || d === "confirm" || d === "deny" ? d : "confirm";
}
function allowRulePermitted(risk, offered) {
  if (offered.includes("bypass")) return true;
  return (risk === "safe" || risk === "sensitive") && offered.includes("auto");
}
function decideAct(q) {
  const base = q.c ? stricter(q.base, "confirm") : DECISIONS[rank(q.base)];
  if (base === "deny") return { outcome: "denied" };
  const rule2 = q.rule === void 0 ? void 0 : DECISIONS[rank(q.rule)];
  if (rule2 === "deny") return { outcome: "blocked" };
  const offered = Array.isArray(q.offered) ? q.offered : [];
  let level = LEVELS.includes(q.level) ? q.level : "strict";
  if ((level === "auto" || level === "bypass") && !offered.includes(level)) level = "ask";
  const risk = q.risk === "safe" || q.risk === "sensitive" ? q.risk : "dangerous";
  if (base !== "confirm" && level !== "strict" && rule2 !== "confirm") return { outcome: "run", by: "policy" };
  if (rule2 === "confirm") return { outcome: "prompt", remember: false };
  if (rule2 === "allow" && (base !== "confirm" || allowRulePermitted(risk, offered))) return { outcome: "run", by: "rule" };
  if (level === "bypass" || level === "auto" && risk !== "dangerous") return { outcome: "run", by: "level" };
  return { outcome: "prompt", remember: level !== "strict" };
}
function capScopes(requested, ...caps) {
  return SCOPES.filter((s) => requested.includes(s) && caps.every((c) => c === void 0 || c.includes(s)));
}
function methodScope(m) {
  return hasOwn(METHOD_SCOPE, m) ? METHOD_SCOPE[m] : void 0;
}
function pathUnder(path, prefix) {
  if (prefix.endsWith("/")) return path.startsWith(prefix);
  return path === prefix || path.startsWith(`${prefix}/`);
}
function navAllowed(policy, url, pageUrl) {
  if (!Array.isArray(policy.nav) || policy.nav.length === 0) return false;
  if (typeof url !== "string" || typeof pageUrl !== "string") return false;
  let page;
  let target;
  try {
    page = new URL(pageUrl);
    target = new URL(url, page);
  } catch {
    return false;
  }
  const web = (u) => u.protocol === "http:" || u.protocol === "https:";
  if (!web(page) || !web(target)) return false;
  if (target.origin !== page.origin) return false;
  if (target.username || target.password) return false;
  const path = target.pathname;
  if (/%(2e|2f|5c)/i.test(path)) return false;
  return policy.nav.some((prefix) => typeof prefix === "string" && prefix.startsWith("/") && pathUnder(path, prefix));
}
function appOrigin(s) {
  const m = APP_ORIGIN.exec(s);
  if (!m) return null;
  const scheme = m[1];
  if (scheme === "file" || scheme === "blob" || WEB_SCHEMES.has(`${scheme}:`)) return null;
  if (m[3] !== void 0 && Number(m[3]) > 65535) return null;
  return { scheme, host: m[2], port: m[3] ?? "" };
}
function urlOrigin(url) {
  if (typeof url !== "string") return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (WEB_SCHEMES.has(u.protocol)) return u.origin;
  if (u.protocol === "file:") return FILE_ORIGIN;
  if (u.protocol === "blob:") {
    try {
      const inner = new URL(u.href.slice("blob:".length));
      return inner.protocol === "http:" || inner.protocol === "https:" ? inner.origin : "null";
    } catch {
      return "null";
    }
  }
  const rest = u.href.slice(u.protocol.length);
  if (!rest.startsWith("//")) return "null";
  let authority = rest.slice(2);
  const end = authority.search(/[/?#]/);
  if (end !== -1) authority = authority.slice(0, end);
  const at = authority.lastIndexOf("@");
  if (at !== -1) authority = authority.slice(at + 1);
  const o = `${u.protocol}//${authority.toLowerCase()}`;
  return appOrigin(o) !== null ? o : "null";
}
function urlHasOrigin(url, origin) {
  const o = urlOrigin(url);
  if (o === null || typeof origin !== "string") return false;
  if (origin !== "null") return o === origin;
  return o === "null" || o === FILE_ORIGIN || appOrigin(o) !== null;
}
function bareOrigin(s, allowSlash) {
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!WEB_SCHEMES.has(u.protocol)) return null;
  if (u.origin === "null" || u.username || u.password || u.search || u.hash) return null;
  if (u.pathname !== "/" && u.pathname !== "") return null;
  if (!allowSlash && s.endsWith("/")) return null;
  return u.origin;
}
function entryText(p) {
  return (p.endsWith("/") && !p.endsWith("//") ? p.slice(0, -1) : p).toLowerCase();
}
function originAllowed(origin, patterns) {
  if (typeof origin !== "string" || !Array.isArray(patterns)) return false;
  if (origin === "null") return patterns.includes("null");
  if (origin === FILE_ORIGIN) return patterns.some((p) => p === FILE_ORIGIN || p === `${FILE_ORIGIN}/`);
  const app = appOrigin(origin);
  if (app !== null) {
    for (const p of patterns) {
      if (typeof p !== "string") continue;
      const m = PORT_WILDCARD.exec(p);
      if (m) {
        if (m[1].toLowerCase() === app.scheme && m[2].toLowerCase() === app.host) return true;
        continue;
      }
      const e = appOrigin(entryText(p));
      if (e !== null && e.scheme === app.scheme && e.host === app.host && e.port === app.port) return true;
    }
    return false;
  }
  const o = bareOrigin(origin, false);
  if (o === null) return false;
  const u = new URL(o);
  for (const p of patterns) {
    if (typeof p !== "string") continue;
    if (p === "*") return true;
    const m = PORT_WILDCARD.exec(p);
    if (m) {
      let host;
      try {
        host = new URL(`${m[1]}://${m[2]}`);
      } catch {
        continue;
      }
      if (host.protocol === u.protocol && host.hostname === u.hostname) return true;
      continue;
    }
    const exact = bareOrigin(p, true);
    if (exact !== null && exact === o) return true;
  }
  return false;
}
var DECISIONS, PROFILES, EXPOSURES, RISKS, PREFIX_PATTERN, TOP_KEYS, WEB_SCHEMES, FILE_ORIGIN, APP_ORIGIN, PORT_WILDCARD;
var init_policy = __esm({
  "packages/core/src/policy.ts"() {
    "use strict";
    init_protocol();
    init_util();
    DECISIONS = ["allow", "confirm", "deny"];
    PROFILES = ["open", "guarded", "kiosk"];
    EXPOSURES = ["auto", "annotated", "none"];
    RISKS = ["safe", "sensitive", "dangerous"];
    PREFIX_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*\.\*$/;
    TOP_KEYS = ["profile", "scopes", "attach", "risk", "actions", "exposure", "privateInput", "coordinates", "framed", "nav", "chatRelay", "rates", "pointerRate", "ttlMs", "idleMs", "human", "consent"];
    WEB_SCHEMES = /* @__PURE__ */ new Set(["http:", "https:", "ws:", "wss:", "ftp:"]);
    FILE_ORIGIN = "file://";
    APP_ORIGIN = /^([a-z][a-z0-9+.-]*):\/\/([a-z0-9._-]+)(?::([1-9][0-9]{0,4}))?$/;
    PORT_WILDCARD = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/(\[[0-9a-fA-F:.]+\]|[^/:@\[\]]+):\*$/;
  }
});

// packages/core/src/manifest.ts
function canonicalJson(v) {
  const out = canon(v, 0, /* @__PURE__ */ new Set());
  return out === void 0 ? "null" : out;
}
function canon(v, depth, stack) {
  if (v === null) return "null";
  if (typeof v === "object" && typeof v.toJSON === "function") v = v.toJSON();
  switch (typeof v) {
    case "string":
      return JSON.stringify(v);
    case "number":
      return Number.isFinite(v) ? JSON.stringify(v) : "null";
    case "boolean":
      return v ? "true" : "false";
    case "undefined":
    case "function":
    case "symbol":
      return void 0;
    case "bigint":
      throw new ReinsError("E_BAD_ARGS", "value is not JSON");
  }
  if (v === null) return "null";
  const o = v;
  if (depth > MAX_DEPTH) throw new ReinsError("E_BAD_ARGS", "value nested too deeply");
  if (stack.has(o)) throw new ReinsError("E_BAD_ARGS", "value is cyclic");
  stack.add(o);
  let out;
  if (Array.isArray(o)) {
    out = `[${o.map((x) => canon(x, depth + 1, stack) ?? "null").join(",")}]`;
  } else {
    const parts = [];
    for (const k of Object.keys(o).sort()) {
      const s = canon(o[k], depth + 1, stack);
      if (s !== void 0) parts.push(`${JSON.stringify(k)}:${s}`);
    }
    out = `{${parts.join(",")}}`;
  }
  stack.delete(o);
  return out;
}
function bad2(path, why) {
  throw new ReinsError("E_BAD_ARGS", `manifest${path}: ${why}`);
}
function reqStr(o, k, path) {
  const v = hasOwn(o, k) ? o[k] : void 0;
  if (typeof v !== "string") bad2(`${path}.${k}`, "must be a string");
  return v;
}
function optStr2(o, k, path) {
  const v = hasOwn(o, k) ? o[k] : void 0;
  if (v === void 0) return void 0;
  if (typeof v !== "string") bad2(`${path}.${k}`, "must be a string");
  return v;
}
function name(o, path, seen) {
  const n = reqStr(o, "name", path);
  if (n.length > MAX_NAME_LEN || !NAME_PATTERN.test(n)) bad2(`${path}.name`, "invalid name");
  if (seen.has(n)) bad2(`${path}.name`, "duplicate name");
  seen.add(n);
  return n;
}
function list(m, k, max) {
  const v = hasOwn(m, k) ? m[k] : void 0;
  if (!Array.isArray(v)) bad2(`.${k}`, "must be an array");
  if (v.length > max) throw new ReinsError("E_TOO_LARGE", `manifest.${k}: more than ${max} entries`);
  v.forEach((x, i) => {
    if (!isPlainObject(x)) bad2(`.${k}[${i}]`, "must be an object");
  });
  return v;
}
function params(o, path, mustBeObject) {
  const s = hasOwn(o, "params") ? o.params : void 0;
  if (s === void 0) return void 0;
  const err = checkSchema(s);
  if (err) bad2(`${path}.params`, err.replace(/^\$/, "schema"));
  if (mustBeObject && s.type !== "object") bad2(`${path}.params`, "must be an object schema");
  return s;
}
function validateManifest(m) {
  if (!isPlainObject(m)) bad2("", "must be an object");
  let text;
  try {
    text = canonicalJson(m);
  } catch {
    bad2("", "must be JSON");
  }
  if (utf8Length(text) > MAX_MANIFEST_BYTES) throw new ReinsError("E_TOO_LARGE", "manifest larger than 64 KiB");
  const reins = reqStr(m, "reins", "");
  if (reins.length === 0 || reins.length > 16) bad2(".reins", "invalid version");
  const a = hasOwn(m, "app") ? m.app : void 0;
  if (!isPlainObject(a)) bad2(".app", "must be an object");
  const app = { id: reqStr(a, "id", ".app"), name: reqStr(a, "name", ".app") };
  if (app.id.length > MAX_NAME_LEN || !APP_ID.test(app.id)) bad2(".app.id", "invalid id");
  if (app.name.trim().length === 0) bad2(".app.name", "must not be empty");
  const version = optStr2(a, "version", ".app");
  if (version !== void 0) app.version = version;
  const description = optStr2(a, "description", ".app");
  if (description !== void 0) app.description = description;
  const seenA = /* @__PURE__ */ new Set();
  const actions = list(m, "actions", MAX_ACTIONS).map((x, i) => {
    const path = `.actions[${i}]`;
    const def = { name: name(x, path, seenA), description: reqStr(x, "description", path), risk: x.risk };
    if (!RISKS2.includes(def.risk)) bad2(`${path}.risk`, "must be safe, sensitive or dangerous");
    const p = params(x, path, true);
    if (p !== void 0) def.params = p;
    const returns = optStr2(x, "returns", path);
    if (returns !== void 0) def.returns = returns;
    return def;
  });
  const seenV = /* @__PURE__ */ new Set();
  const views = list(m, "views", MAX_VIEWS).map((x, i) => {
    const path = `.views[${i}]`;
    const def = { name: name(x, path, seenV), description: reqStr(x, "description", path) };
    const p = params(x, path, false);
    if (p !== void 0) def.params = p;
    return def;
  });
  const seenS = /* @__PURE__ */ new Set();
  const state = list(m, "state", MAX_ACTIONS).map((x, i) => {
    const path = `.state[${i}]`;
    const def = { name: name(x, path, seenS) };
    const d = optStr2(x, "description", path);
    if (d !== void 0) def.description = d;
    return def;
  });
  const exposure = m.exposure;
  if (!EXPOSURES2.includes(exposure)) bad2(".exposure", "must be auto, annotated or none");
  const profile = m.profile;
  if (!PROFILES2.includes(profile)) bad2(".profile", "must be open, guarded or kiosk");
  return JSON.parse(JSON.stringify({ reins, app, actions, views, state, exposure, profile }));
}
function manifestDigest(m) {
  return sha256(canonicalJson(m));
}
function line(s) {
  return (s ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\s]+/g, " ").trim();
}
function renderCard(m, ctx = {}) {
  const policy = ctx.policy ?? POLICY_PRESETS[m.profile] ?? POLICY_PRESETS.guarded;
  const out = [];
  let head = "# Reins surface";
  if (ctx.surface) head += ` ${line(ctx.surface.s)}`;
  head += `: ${line(m.app.name)}`;
  if (m.app.version) head += ` ${line(m.app.version)}`;
  head += ` (${line(m.app.id)})`;
  out.push(head);
  if (m.app.description && line(m.app.description)) out.push(line(m.app.description));
  const meta = [];
  if (ctx.surface) meta.push(`origin ${line(ctx.surface.origin)}`);
  meta.push(`profile ${policy.profile}`);
  if (ctx.scopes) meta.push(`scopes ${capScopes(ctx.scopes).join(" ")}`);
  out.push(meta.join(" | "));
  out.push("Prefer actions over ui ops. [confirm] asks the user on screen. [deny] is blocked.");
  if (m.actions.length) {
    out.push("", "## actions");
    for (const a of m.actions) {
      let s = `${a.name}${schemaSignature(a.params)}`;
      if (a.returns && line(a.returns)) s += ` -> ${line(a.returns)}`;
      const d = decideAction(policy, a);
      if (d !== "allow") s += ` [${d}]`;
      if (line(a.description)) s += `. ${line(a.description)}`;
      out.push(s);
    }
  }
  if (m.views.length) {
    out.push("", "## views");
    for (const v of m.views) {
      let s = `${v.name}${schemaSignature(v.params)}`;
      if (line(v.description)) s += `. ${line(v.description)}`;
      out.push(s);
    }
  }
  if (m.state.length) {
    out.push("", "## state");
    for (const st of m.state) out.push(line(st.description) ? `${st.name}: ${line(st.description)}` : st.name);
  }
  return out.join("\n");
}
var APP_ID, RISKS2, EXPOSURES2, PROFILES2, MAX_NAME_LEN;
var init_manifest = __esm({
  "packages/core/src/manifest.ts"() {
    "use strict";
    init_protocol();
    init_codec();
    init_crypto();
    init_policy();
    init_schema();
    init_util();
    APP_ID = /^[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)*$/;
    RISKS2 = ["safe", "sensitive", "dangerous"];
    EXPOSURES2 = ["auto", "annotated", "none"];
    PROFILES2 = ["open", "guarded", "kiosk"];
    MAX_NAME_LEN = 64;
  }
});

// packages/core/src/chat.ts
function chatText(v) {
  if (typeof v !== "string") return void 0;
  if (v.length > CHAT_MAX_TEXT * 4) return void 0;
  const t = v.trim();
  if (t.length < 1 || t.length > CHAT_MAX_TEXT || !wellFormed(t)) return void 0;
  return t;
}
function chatWellFormed(text) {
  return wellFormed(text) ? text : text.replace(LONE_SURROGATE, "\uFFFD");
}
function chatNote(v) {
  if (v === void 0) return "";
  if (typeof v !== "string" || v.length > CHAT_MAX_NOTE * 4) return void 0;
  const t = v.replace(/[\s\p{Cc}]+/gu, " ").trim();
  if (t.length > CHAT_MAX_NOTE || !wellFormed(t)) return void 0;
  return t;
}
function isChatState(v) {
  return CHAT_STATES.includes(v);
}
function chatFrom(v) {
  if (!isPlainObject(v)) return void 0;
  if (v.kind === "person") return { kind: "person" };
  if (v.kind !== "agent") return void 0;
  const { id, name: name2 } = v;
  if (typeof id !== "string" || id.length < 1 || id.length > MAX_ID_CHARS) return void 0;
  if (typeof name2 !== "string" || name2.length > MAX_NAME_CHARS2 || !wellFormed(name2)) return void 0;
  return { kind: "agent", id, name: name2 };
}
function chatRelayMode(v) {
  if (v === true) return "on";
  if (v === false) return "off";
  return CHAT_RELAY.includes(v) ? v : void 0;
}
function stricterRelay(a, b) {
  return CHAT_RELAY[Math.min(CHAT_RELAY.indexOf(a), CHAT_RELAY.indexOf(b))] ?? "off";
}
function chatAudience(q) {
  const members = Array.isArray(q.members) ? q.members : [];
  if (q.from === "person") {
    const hear = q.to === void 0 ? [...members] : members.includes(q.to) ? [q.to] : [];
    return hear.length ? { outcome: "post", hear } : { outcome: "nobody" };
  }
  const me = q.from.agent;
  const relay = Array.isArray(q.relay) ? members.filter((m) => q.relay.includes(m)) : [];
  if (q.to === CHAT_TO_PERSON) return { outcome: "post", hear: [] };
  if (q.to !== void 0) {
    if (!relay.includes(me)) return { outcome: "refuse", code: "E_DENIED" };
    if (q.to === me || !relay.includes(q.to)) return { outcome: "refuse", code: "E_BAD_ARGS" };
    return { outcome: "post", hear: [q.to] };
  }
  return { outcome: "post", hear: relay.includes(me) ? relay.filter((m) => m !== me) : [] };
}
function chatMessage(v) {
  if (!isPlainObject(v)) return void 0;
  const { id, ts, to } = v;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) return void 0;
  if (typeof ts !== "number" || !Number.isFinite(ts)) return void 0;
  const from = chatFrom(v.from);
  const text = chatText(v.text);
  if (from === void 0 || text === void 0 || text !== v.text) return void 0;
  const m = { id, from, text, ts };
  if (to !== void 0) {
    if (typeof to !== "string" || to.length < 1 || to.length > MAX_ID_CHARS) return void 0;
    m.to = to;
  }
  return m;
}
var MAX_ID_CHARS, MAX_NAME_CHARS2, LONE_SURROGATE, DATA_BREAK, DATA_CONTROL;
var init_chat = __esm({
  "packages/core/src/chat.ts"() {
    "use strict";
    init_crypto();
    init_protocol();
    init_util();
    MAX_ID_CHARS = 64;
    MAX_NAME_CHARS2 = 120;
    LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
    DATA_BREAK = new RegExp(`\\r\\n|[\\n\\r\\v\\f\\x1c-\\x1e\\x85${String.fromCharCode(8232, 8233)}]`);
    DATA_CONTROL = new RegExp(`[\\x00-\\x08\\x0a-\\x1f\\x7f-\\x9f${String.fromCharCode(8232, 8233)}]`, "g");
  }
});

// packages/core/src/observe.ts
function cloneNode(n) {
  const c = { ...n };
  if (n.st) c.st = [...n.st];
  if (n.box) c.box = [...n.box];
  return c;
}
function lisIndices(a) {
  const tails = [];
  const prev = new Array(a.length).fill(-1);
  for (let i = 0; i < a.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (a[tails[mid]] < a[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const out = /* @__PURE__ */ new Set();
  let k = tails.length ? tails[tails.length - 1] : -1;
  while (k >= 0) {
    out.add(k);
    k = prev[k];
  }
  return out;
}
function diffNodes(prev, next) {
  const prevIndex = /* @__PURE__ */ new Map();
  prev.forEach((n, i) => prevIndex.set(n.h, i));
  const nextHandles = new Set(next.map((n) => n.h));
  const survivors = [];
  const oldPos = [];
  next.forEach((n, i) => {
    const p = prevIndex.get(n.h);
    if (p !== void 0) {
      survivors.push(i);
      oldPos.push(p);
    }
  });
  const stay = /* @__PURE__ */ new Set();
  for (const k of lisIndices(oldPos)) stay.add(survivors[k]);
  const ops = [];
  const movedHandles = /* @__PURE__ */ new Set();
  next.forEach((n, i) => {
    if (prevIndex.has(n.h) && !stay.has(i)) movedHandles.add(n.h);
  });
  for (const n of prev) {
    if (!nextHandles.has(n.h) || movedHandles.has(n.h)) ops.push({ op: "del", h: n.h });
  }
  next.forEach((n, i) => {
    if (stay.has(i)) {
      if (!deepEqual(prev[prevIndex.get(n.h)], n)) ops.push({ op: "set", n: cloneNode(n) });
      return;
    }
    if (i > 0) {
      const before = next[i - 1];
      const last = ops[ops.length - 1];
      if (!(last && last.op === "set" && last.n.h === before.h)) ops.push({ op: "set", n: cloneNode(before) });
    }
    ops.push({ op: "set", n: cloneNode(n) });
  });
  return ops;
}
function applyOps(nodes, ops) {
  const out = nodes.map(cloneNode);
  const indexOf = (h) => out.findIndex((n) => n.h === h);
  let lastSet = null;
  for (const op of ops) {
    if (op.op === "del") {
      const i2 = indexOf(op.h);
      if (i2 >= 0) out.splice(i2, 1);
      lastSet = null;
      continue;
    }
    if (op.op !== "set" || !op.n || typeof op.n.h !== "string") continue;
    const n = cloneNode(op.n);
    const i = indexOf(n.h);
    if (i >= 0) out[i] = n;
    else if (lastSet === null) out.unshift(n);
    else {
      const a = indexOf(lastSet);
      out.splice(a < 0 ? out.length : a + 1, 0, n);
    }
    lastSet = n.h;
  }
  return out;
}
function token(s) {
  return BARE.test(s) ? s : jsonLine(s);
}
function urlToken(s) {
  return BARE_URL.test(s) ? s : jsonLine(s);
}
function nodeLine(n) {
  let s = `${token(String(n.h))} ${token(String(n.role))}`;
  if (n.name !== void 0 && n.name !== "") s += ` ${jsonLine(String(n.name))}`;
  if (n.id !== void 0) s += ` #${token(String(n.id))}`;
  if (n.val !== void 0) s += ` = ${jsonLine(String(n.val))}`;
  if (n.st && n.st.length) s += ` [${n.st.map((x) => token(String(x))).join(" ")}]`;
  if (n.box) s += ` @${n.box.map((x) => Math.round(Number(x))).join(",")}`;
  return s;
}
function renderTree(nodes) {
  const byHandle = /* @__PURE__ */ new Map();
  for (const n of nodes) byHandle.set(n.h, n);
  const depthCache = /* @__PURE__ */ new Map();
  const depth = (n) => {
    const cached = depthCache.get(n.h);
    if (cached !== void 0) return cached;
    let d = 0;
    let cur = n;
    const seen = /* @__PURE__ */ new Set([n.h]);
    while (cur.p !== void 0 && byHandle.has(cur.p) && !seen.has(cur.p)) {
      seen.add(cur.p);
      cur = byHandle.get(cur.p);
      d++;
    }
    depthCache.set(n.h, d);
    return d;
  };
  return nodes.map((n) => " ".repeat(depth(n)) + nodeLine(n)).join("\n");
}
function renderOps(ops, prev) {
  const known = prev ? new Map(prev.map((n) => [n.h, n])) : null;
  const wasKnown = new Set(prev ? prev.map((n) => n.h) : []);
  const setLater = /* @__PURE__ */ new Set();
  for (const op of ops) if (op.op === "set") setLater.add(op.n.h);
  const lines = [];
  for (const op of ops) {
    if (op.op === "del") {
      if (!setLater.has(op.h)) lines.push(`- ${token(String(op.h))}`);
      known?.delete(op.h);
      continue;
    }
    if (known) {
      const before = known.get(op.n.h);
      if (before && deepEqual(before, op.n)) continue;
      lines.push(`${before || wasKnown.has(op.n.h) ? "~" : "+"} ${nodeLine(op.n)}`);
      known.set(op.n.h, op.n);
    } else {
      lines.push(`~ ${nodeLine(op.n)}`);
    }
  }
  return lines.join("\n");
}
function renderObservation(o, prev) {
  const parts = [`# rev ${Number(o.rev)}`];
  if (o.base !== void 0) parts.push(`since ${Number(o.base)}`);
  parts.push(`url ${urlToken(String(o.url ?? ""))}`, `title ${jsonLine(String(o.title ?? ""))}`);
  if (Array.isArray(o.vp)) parts.push(`vp ${Number(o.vp[0])}x${Number(o.vp[1])}`);
  if (o.paused) parts.push("paused");
  const head = parts.join(" | ");
  let body;
  if (o.ops !== void 0) body = renderOps(o.ops, prev) || "(no changes)";
  else body = renderTree(o.nodes ?? []) || "(empty)";
  return `${head}
${body}`;
}
var BARE, BARE_URL;
var init_observe = __esm({
  "packages/core/src/observe.ts"() {
    "use strict";
    init_schema();
    init_util();
    BARE = /^[A-Za-z0-9_][A-Za-z0-9_.:-]*$/;
    BARE_URL = /^[!#-~]+$/;
  }
});

// packages/core/src/merge.ts
function tooDeep() {
  throw new ReinsError("E_BAD_ARGS", "value nested too deeply");
}
function safeCloneOrThrow(v) {
  try {
    return safeClone(v);
  } catch {
    tooDeep();
  }
}
function mergeDiff(from, to) {
  return diff(from, to === void 0 ? null : to, 0);
}
function diff(from, to, depth) {
  if (depth > MAX_DEPTH) tooDeep();
  if (!isPlainObject(to) || !isPlainObject(from)) return deepEqual(from, to) ? void 0 : safeCloneOrThrow(to);
  const patch = {};
  let changed = false;
  for (const k of Object.keys(from)) {
    if (from[k] !== void 0 && from[k] !== null && (!hasOwn(to, k) || to[k] === void 0 || to[k] === null)) {
      setOwn(patch, k, null);
      changed = true;
    }
  }
  for (const k of Object.keys(to)) {
    const t = to[k];
    if (t === void 0 || t === null) continue;
    const f = hasOwn(from, k) ? from[k] : void 0;
    const d = f === void 0 ? safeCloneOrThrow(t) : diff(f, t, depth + 1);
    if (d !== void 0) {
      setOwn(patch, k, d);
      changed = true;
    }
  }
  return changed ? patch : void 0;
}
var init_merge = __esm({
  "packages/core/src/merge.ts"() {
    "use strict";
    init_protocol();
    init_util();
  }
});

// packages/core/src/flow.ts
function finiteNonNeg(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}
function playbackRate(queuedMs) {
  if (!(queuedMs > 120)) return 1;
  if (queuedMs >= 600) return 4;
  return 1 + 3 * (queuedMs - 120) / 480;
}
var TokenBucket, CreditWindow, CreditGranter, MAX_DT, PointerCoalescer;
var init_flow = __esm({
  "packages/core/src/flow.ts"() {
    "use strict";
    init_protocol();
    TokenBucket = class {
      #rate;
      #burst;
      #tokens;
      #last;
      #now;
      constructor(ratePerSec, burst, now4 = Date.now) {
        this.#rate = finiteNonNeg(ratePerSec, 0);
        this.#burst = finiteNonNeg(burst, this.#rate);
        this.#tokens = this.#burst;
        this.#now = now4;
        this.#last = now4();
      }
      /** Take `n` tokens if available. */
      take(n = 1) {
        const t = this.#now();
        const elapsed = Math.max(0, t - this.#last);
        this.#last = t;
        this.#tokens = Math.min(this.#burst, this.#tokens + elapsed * this.#rate / 1e3);
        if (!(n >= 0)) return false;
        if (this.#tokens + 1e-9 >= n) {
          this.#tokens = Math.max(0, this.#tokens - n);
          return true;
        }
        return false;
      }
    };
    CreditWindow = class {
      #available;
      constructor(initial = PTR_INITIAL_CREDIT) {
        this.#available = finiteNonNeg(initial, 0);
      }
      get available() {
        return this.#available;
      }
      /** Spend `n` units if the window allows it; otherwise spend nothing. */
      consume(n) {
        if (!(Number.isFinite(n) && n >= 0) || n > this.#available) return false;
        this.#available -= n;
        return true;
      }
      grant(n) {
        if (Number.isFinite(n) && n > 0) this.#available += n;
      }
    };
    CreditGranter = class {
      #threshold;
      #pending = 0;
      constructor(window) {
        this.#threshold = Math.max(1, Math.ceil(finiteNonNeg(window, 0) / 4));
      }
      /** Record `n` consumed units. Returns the credit to send now, or 0. */
      consumed(n) {
        if (Number.isFinite(n) && n > 0) this.#pending += n;
        if (this.#pending < this.#threshold) return 0;
        const c = this.#pending;
        this.#pending = 0;
        return c;
      }
    };
    MAX_DT = 65535;
    PointerCoalescer = class {
      #max;
      #queue = [];
      #dropped = 0;
      constructor(maxBacklog = 1024) {
        this.#max = Math.max(3, Math.floor(finiteNonNeg(maxBacklog, 1024)));
      }
      get size() {
        return this.#queue.length;
      }
      get dropped() {
        return this.#dropped;
      }
      push(p) {
        this.#queue.push({ x: p.x, y: p.y, dt: p.dt });
        if (this.#queue.length > this.#max) this.#coalesce();
      }
      take(max) {
        const n = Math.max(0, Math.min(this.#queue.length, Math.floor(Number.isFinite(max) ? max : 0)));
        return this.#queue.splice(0, n);
      }
      #coalesce() {
        const q = this.#queue;
        const out = [q[0]];
        let i = 1;
        for (; i < q.length - 1; i += 2) {
          const drop = q[i];
          const next = q[i + 1];
          if (drop.dt + next.dt <= MAX_DT) {
            next.dt += drop.dt;
            this.#dropped++;
          } else out.push(drop);
          out.push(next);
        }
        if (out[out.length - 1] !== q[q.length - 1]) out.push(q[q.length - 1]);
        this.#queue = out;
      }
    };
  }
});

// packages/core/src/link.ts
function msgBytes(m) {
  return typeof m === "string" ? utf8Length(m) : m.length;
}
function linkPair() {
  const a = new PairEnd();
  const b = new PairEnd();
  a.peer = b;
  b.peer = a;
  return [a, b];
}
function toBytes(v) {
  if (v instanceof ArrayBuffer) return new Uint8Array(v.slice(0));
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice();
  return null;
}
function wsLink(ws) {
  try {
    ws.binaryType = "arraybuffer";
  } catch {
  }
  const link = new WsLink(ws);
  ws.onmessage = (ev) => link.inbound(ev);
  const opened = () => {
    ws.onopen = null;
    ws.onerror = () => {
    };
    ws.onclose = () => link.remoteClosed();
  };
  if (ws.readyState === WS_OPEN) {
    opened();
    return Promise.resolve(link);
  }
  if (ws.readyState !== WS_CONNECTING) return Promise.reject(new ReinsError("E_GONE", "connection closed"));
  return new Promise((resolve, reject) => {
    const failed = () => {
      ws.onopen = ws.onerror = ws.onclose = ws.onmessage = null;
      try {
        ws.close();
      } catch {
      }
      reject(new ReinsError("E_GONE", "connection failed"));
    };
    ws.onopen = () => {
      opened();
      resolve(link);
    };
    ws.onerror = failed;
    ws.onclose = failed;
  });
}
var MAX_INBOUND_QUEUE, MAX_INBOUND_BYTES, QueueLink, PairEnd, WS_CONNECTING, WS_OPEN, WsLink;
var init_link = __esm({
  "packages/core/src/link.ts"() {
    "use strict";
    init_codec();
    init_protocol();
    MAX_INBOUND_QUEUE = 4096;
    MAX_INBOUND_BYTES = 16 * 1024 * 1024;
    QueueLink = class {
      #handler = null;
      #onclose = null;
      #queue = [];
      #queuedBytes = 0;
      #maxMessages = MAX_INBOUND_QUEUE;
      #maxBytes = MAX_INBOUND_BYTES;
      #flushScheduled = false;
      #draining = false;
      #closed = false;
      #closeFired = false;
      get onmessage() {
        return this.#handler;
      }
      set onmessage(fn) {
        this.#handler = fn;
        if (fn && this.#queue.length) this.#scheduleFlush();
      }
      get onclose() {
        return this.#onclose;
      }
      set onclose(fn) {
        this.#onclose = fn;
        if (fn && this.#closed && !this.#closeFired) queueMicrotask(() => this.#maybeFireClose());
      }
      get open() {
        return !this.#closed;
      }
      /**
       * Bound the inbound queue to `maxMessages` messages and `maxBytes` bytes (each at most
       * the link's default); without arguments, restore the defaults. A queue already past a
       * new bound closes the link.
       */
      limitInbound(maxMessages, maxBytes) {
        const pick = (v, max) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : max;
        this.#maxMessages = pick(maxMessages, MAX_INBOUND_QUEUE);
        this.#maxBytes = pick(maxBytes, MAX_INBOUND_BYTES);
        if (this.#queue.length > this.#maxMessages || this.#queuedBytes > this.#maxBytes) this.#overflow();
      }
      send(data) {
        if (this.#closed) return;
        this.transmit(data);
      }
      close() {
        if (this.#closed) return;
        this.markClosed();
        this.shutdown();
      }
      /** A message arrived from the transport. */
      receive(data) {
        if (this.#closed) return;
        if (this.#handler && this.#queue.length === 0 && !this.#draining) {
          this.#invoke(data);
          return;
        }
        const n = msgBytes(data);
        if (this.#queue.length >= this.#maxMessages || this.#queuedBytes + n > this.#maxBytes) {
          this.#overflow();
          return;
        }
        this.#queue.push(data);
        this.#queuedBytes += n;
        if (this.#handler) this.#scheduleFlush();
      }
      /** The queue went past its bound: drop what it holds and close. */
      #overflow() {
        this.#queue = [];
        this.#queuedBytes = 0;
        this.close();
      }
      /** The link is closed (locally or by the transport). Idempotent. */
      markClosed() {
        if (this.#closed) return;
        this.#closed = true;
        queueMicrotask(() => this.#maybeFireClose());
      }
      #invoke(data) {
        try {
          this.#handler?.(data);
        } catch {
        }
      }
      #scheduleFlush() {
        if (this.#flushScheduled) return;
        this.#flushScheduled = true;
        queueMicrotask(() => {
          this.#flushScheduled = false;
          this.#drain();
        });
      }
      #drain() {
        if (this.#draining) return;
        this.#draining = true;
        try {
          while (this.#queue.length && this.#handler) {
            const m = this.#queue.shift();
            this.#queuedBytes = Math.max(0, this.#queuedBytes - msgBytes(m));
            this.#invoke(m);
          }
        } finally {
          this.#draining = false;
        }
        this.#maybeFireClose();
      }
      #maybeFireClose() {
        if (!this.#closed || this.#closeFired || !this.#onclose) return;
        if (this.#queue.length && this.#handler) {
          this.#scheduleFlush();
          return;
        }
        this.#closeFired = true;
        const fn = this.#onclose;
        try {
          fn();
        } catch {
        }
      }
    };
    PairEnd = class extends QueueLink {
      peer = null;
      bufferedAmount = 0;
      transmit(data) {
        const copy = typeof data === "string" ? data : data.slice();
        const peer = this.peer;
        if (peer) queueMicrotask(() => peer.deliver(copy));
      }
      shutdown() {
        const peer = this.peer;
        if (peer) queueMicrotask(() => peer.remoteClosed());
      }
      deliver(data) {
        this.receive(data);
      }
      remoteClosed() {
        this.markClosed();
      }
    };
    WS_CONNECTING = 0;
    WS_OPEN = 1;
    WsLink = class extends QueueLink {
      #ws;
      constructor(ws) {
        super();
        this.#ws = ws;
      }
      get bufferedAmount() {
        const n = this.#ws.bufferedAmount;
        return typeof n === "number" ? n : 0;
      }
      transmit(data) {
        if (this.#ws.readyState !== WS_OPEN) return;
        try {
          this.#ws.send(data);
        } catch {
          this.close();
        }
      }
      shutdown() {
        try {
          this.#ws.close(1e3);
        } catch {
        }
      }
      inbound(ev) {
        const d = ev?.data;
        if (typeof d === "string") this.receive(d);
        else {
          const bytes = toBytes(d);
          if (bytes) this.receive(bytes);
        }
      }
      remoteClosed() {
        this.markClosed();
      }
    };
  }
});

// packages/core/src/seal.ts
function subtle2() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new ReinsError("E_INTERNAL", "WebCrypto is not available");
  return c.subtle;
}
function lengthPrefixed(texts) {
  const parts = texts.map((t) => enc2.encode(t));
  const out = new Uint8Array(parts.reduce((n, p) => n + 4 + p.length, 0));
  const dv = new DataView(out.buffer);
  let at = 0;
  for (const p of parts) {
    dv.setUint32(at, p.length);
    out.set(p, at + 4);
    at += 4 + p.length;
  }
  return out;
}
async function deriveSealKeys(key, t, side) {
  const { nonce, cnonce, challengeText, helloText, welcomeText } = t ?? {};
  if (typeof key !== "string" || typeof nonce !== "string" || typeof cnonce !== "string" || nonce.includes("\n") || cnonce.includes("\n") || typeof challengeText !== "string" || typeof helloText !== "string" || typeof welcomeText !== "string" || !wellFormed(challengeText) || !wellFormed(helloText) || !wellFormed(welcomeText)) {
    throw new ReinsError("E_AUTH", "invalid seal fields");
  }
  if (side !== "peer" && side !== "hub") throw new ReinsError("E_BAD_ARGS", "invalid seal side");
  const s = subtle2();
  const th = b64urlEncode(new Uint8Array(await s.digest("SHA-256", lengthPrefixed([challengeText, helloText, welcomeText]))));
  const root = await s.importKey("raw", enc2.encode(key), HMAC, false, ["sign"]);
  const derive = async (context) => {
    const raw = new Uint8Array(await s.sign("HMAC", root, enc2.encode(`${context}
${nonce}
${cnonce}
${th}`)));
    try {
      return await s.importKey("raw", raw, HMAC, false, ["sign"]);
    } finally {
      raw.fill(0);
    }
  };
  const [kPeer, kHub] = await Promise.all([derive(SEAL_CONTEXT.peer), derive(SEAL_CONTEXT.hub)]);
  return Object.freeze(side === "peer" ? { send: kPeer, recv: kHub } : { send: kHub, recv: kPeer });
}
async function mac(k, seq, kind, payload) {
  const body = typeof payload === "string" ? enc2.encode(payload) : payload;
  const input = new Uint8Array(9 + body.length);
  const dv = new DataView(input.buffer);
  dv.setUint32(0, Math.floor(seq / 4294967296));
  dv.setUint32(4, seq >>> 0);
  input[8] = kind;
  input.set(body, 9);
  return new Uint8Array(await subtle2().sign("HMAC", k, input));
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff2 = 0;
  for (let i = 0; i < a.length; i++) diff2 |= a[i] ^ b[i];
  return diff2 === 0;
}
function size(m) {
  return typeof m === "string" ? utf8Length(m) : m.length;
}
function sealLink(link, keys) {
  return new SealedLink(link, keys);
}
function firstMessage(link, ms) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      link.onmessage = null;
      link.onclose = null;
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new ReinsError("E_TIMEOUT", "timed out"))), ms);
    link.onclose = () => done(() => reject(new ReinsError("E_GONE", "connection closed")));
    link.onmessage = (d) => done(() => resolve(d));
  });
}
function confirmTs(m, t) {
  if (typeof m !== "string") return void 0;
  try {
    const f = decodeFrame(m, DEFAULT_LIMITS.maxText);
    return f.t === t ? f.ts : void 0;
  } catch {
    return void 0;
  }
}
async function peerConfirm(link, keys, timeoutMs = SEAL_CONFIRM_MS) {
  const sealed2 = sealLink(link, keys);
  const ts = Date.now();
  sealed2.send(encodeFrame({ t: "ping", ts }));
  let first;
  try {
    first = await firstMessage(sealed2, timeoutMs);
  } catch {
    sealed2.close();
    throw new ReinsError("E_AUTH", "hub did not confirm the session");
  }
  if (confirmTs(first, "pong") !== ts) {
    sealed2.close();
    throw new ReinsError("E_AUTH", "hub did not confirm the session");
  }
  return sealed2;
}
async function hubSeal(link, s, opts = {}) {
  link.onmessage = null;
  const timeoutMs = opts.timeoutMs ?? SEAL_CONFIRM_MS;
  let keys;
  try {
    keys = await deriveSealKeys(s.key, s, "hub");
  } catch {
    link.close();
    throw new ReinsError("E_AUTH", "session confirmation failed");
  }
  const sealed2 = sealLink(link, keys);
  let first;
  try {
    first = await firstMessage(sealed2, timeoutMs);
  } catch {
    sealed2.close();
    throw new ReinsError("E_AUTH", "session confirmation failed");
  }
  const ts = confirmTs(first, "ping");
  if (ts === void 0) {
    sealed2.close();
    throw new ReinsError("E_AUTH", "session confirmation failed");
  }
  sealed2.send(encodeFrame({ t: "pong", ts }));
  return sealed2;
}
var enc2, HMAC, SEP, SealedLink;
var init_seal = __esm({
  "packages/core/src/seal.ts"() {
    "use strict";
    init_protocol();
    init_crypto();
    init_codec();
    init_link();
    enc2 = new TextEncoder();
    HMAC = { name: "HMAC", hash: "SHA-256" };
    SEP = SEAL_SEPARATOR.charCodeAt(0);
    SealedLink = class extends QueueLink {
      #inner;
      #keys;
      #sendSeq = 0;
      #recvSeq = 0;
      #sendChain = Promise.resolve();
      #recvChain = Promise.resolve();
      #pending = 0;
      #failed = false;
      constructor(inner, keys) {
        super();
        this.#inner = inner;
        this.#keys = keys;
        inner.onmessage = (d) => this.#inbound(d);
        inner.onclose = () => {
          this.#recvChain = this.#recvChain.then(() => this.markClosed());
        };
      }
      get bufferedAmount() {
        return this.#inner.bufferedAmount + this.#pending;
      }
      transmit(data) {
        if (!this.#inner.open) return;
        if (typeof data === "string" && !wellFormed(data)) throw new ReinsError("E_BAD_FRAME", "text is not well-formed Unicode");
        const seq = this.#sendSeq++;
        const text = typeof data === "string";
        const payload = text ? data : data.slice();
        const n = size(payload);
        this.#pending += n;
        const tag = mac(this.#keys.send, seq, text ? SEAL_KIND.text : SEAL_KIND.binary, payload);
        this.#sendChain = this.#sendChain.then(() => tag).then(
          (m) => {
            if (this.#failed) return;
            if (typeof payload === "string") this.#inner.send(b64urlEncode(m) + SEAL_SEPARATOR + payload);
            else {
              const out = new Uint8Array(payload.length + SEAL_MAC_BYTES);
              out.set(payload, 0);
              out.set(m, payload.length);
              this.#inner.send(out);
            }
          },
          () => this.#fail()
        ).finally(() => {
          this.#pending -= n;
        });
      }
      shutdown() {
        if (this.#failed) return;
        this.#sendChain = this.#sendChain.then(() => this.#inner.close());
      }
      #inbound(data) {
        if (this.#failed) return;
        const seq = this.#recvSeq++;
        let check;
        if (typeof data === "string") {
          if (data.length < SEAL_MAC_TEXT_LENGTH + 1 || data.charCodeAt(SEAL_MAC_TEXT_LENGTH) !== SEP || !wellFormed(data)) check = Promise.resolve(null);
          else {
            const got = data.slice(0, SEAL_MAC_TEXT_LENGTH);
            const text = data.slice(SEAL_MAC_TEXT_LENGTH + 1);
            check = mac(this.#keys.recv, seq, SEAL_KIND.text, text).then((m) => timingSafeEqual(got, b64urlEncode(m)) ? text : null);
          }
        } else if (data.length < SEAL_MAC_BYTES) check = Promise.resolve(null);
        else {
          const body = data.slice(0, data.length - SEAL_MAC_BYTES);
          const got = data.subarray(data.length - SEAL_MAC_BYTES);
          check = mac(this.#keys.recv, seq, SEAL_KIND.binary, body).then((m) => bytesEqual(got, m) ? body : null);
        }
        this.#recvChain = this.#recvChain.then(() => check).then(
          (msg) => {
            if (this.#failed) return;
            if (msg === null) return this.#fail();
            this.receive(msg);
          },
          () => this.#fail()
        );
      }
      #fail() {
        if (this.#failed) return;
        this.#failed = true;
        this.markClosed();
        this.#inner.onmessage = null;
        this.#inner.close();
      }
    };
  }
});

// packages/core/src/rpc.ts
function isErrorCode(c) {
  return typeof c === "string" && ERROR_CODES.includes(c);
}
async function clientConnect(link, hello, opts = {}) {
  const r = await runHandshake(link, hello, opts);
  if (hello.key === void 0) return { welcome: r.welcome, link, sealed: false };
  let keys;
  try {
    keys = await deriveSealKeys(hello.key, r, "peer");
  } catch {
    link.close();
    throw new ReinsError("E_AUTH", "could not derive session keys");
  }
  const sealed2 = await peerConfirm(link, keys, opts.confirmTimeoutMs);
  return { welcome: r.welcome, link: sealed2, sealed: true };
}
function runHandshake(link, hello, opts) {
  const timeoutMs = opts.timeoutMs ?? 1e4;
  return new Promise((resolve, reject) => {
    let done = false;
    let stage = "challenge";
    let sent;
    const finish = () => {
      done = true;
      clearTimeout(timer);
      link.onmessage = null;
      link.onclose = null;
    };
    const fail4 = (code, msg, sendBye) => {
      if (done) return;
      finish();
      if (sendBye && link.open) {
        try {
          link.send(encodeFrame({ t: "bye", code, msg }));
        } catch {
        }
      }
      link.close();
      reject(new ReinsError(code, msg));
    };
    const timer = setTimeout(() => fail4("E_TIMEOUT", "handshake timed out", true), timeoutMs);
    const onFrame = async (data) => {
      if (typeof data !== "string") return fail4("E_BAD_FRAME", "unexpected binary frame", true);
      let f;
      try {
        f = decodeFrame(data, DEFAULT_LIMITS.maxText);
      } catch (e) {
        const code = e instanceof ReinsError ? e.code : "E_BAD_FRAME";
        return fail4(code, code === "E_TOO_LARGE" ? "frame too large" : "malformed frame", true);
      }
      if (f.t === "bye") {
        const code = isErrorCode(f.code) ? f.code : "E_GONE";
        return fail4(code, f.msg ? f.msg.slice(0, 200) : "refused by hub", false);
      }
      if (stage === "challenge") {
        if (f.t !== "challenge") return fail4("E_BAD_FRAME", "expected challenge", true);
        const v = f.v.find((x) => SUPPORTED_VERSIONS.includes(x));
        if (v === void 0) return fail4("E_VERSION", "no common protocol version", true);
        const cnonce = randomToken(32);
        const kid = hello.kid ?? "default";
        const frame = { t: "hello", v, role: hello.role, name: hello.name, cnonce };
        if (hello.key !== void 0) frame.auth = { kid, proof: await peerProof(hello.key, { role: hello.role, kid, nonce: f.nonce, cnonce }) };
        if (hello.surface !== void 0) frame.surface = hello.surface;
        if (done) return;
        const helloText = encodeFrame(frame);
        sent = { v, kid, nonce: f.nonce, cnonce, challengeText: data, helloText };
        stage = "welcome";
        link.send(helloText);
        return;
      }
      if (f.t !== "welcome" || !sent) return fail4("E_BAD_FRAME", "expected welcome", true);
      if (f.v !== sent.v) return fail4("E_VERSION", "hub answered with another version", true);
      if (f.role !== hello.role) return fail4("E_BAD_FRAME", "hub answered with another role", true);
      if (hello.key !== void 0) {
        if (typeof f.proof !== "string") return fail4("E_AUTH", "hub did not prove the key", true);
        const expected = await hubProof(hello.key, { role: hello.role, kid: sent.kid, nonce: sent.nonce, cnonce: sent.cnonce });
        if (!timingSafeEqual(f.proof, expected)) return fail4("E_AUTH", "hub proof mismatch", true);
      }
      if (done) return;
      finish();
      resolve({ welcome: f, nonce: sent.nonce, cnonce: sent.cnonce, challengeText: sent.challengeText, helloText: sent.helloText, welcomeText: data });
    };
    const handler = (data) => {
      link.onmessage = null;
      onFrame(data).catch(() => fail4("E_INTERNAL", "handshake failed", true)).finally(() => {
        if (!done) link.onmessage = handler;
      });
    };
    link.onclose = () => fail4("E_GONE", "connection closed during handshake", false);
    link.onmessage = handler;
  });
}
var Peer;
var init_rpc = __esm({
  "packages/core/src/rpc.ts"() {
    "use strict";
    init_protocol();
    init_codec();
    init_crypto();
    init_seal();
    Peer = class {
      #link;
      #h;
      #limits;
      #now;
      #nextId = 0;
      #pending = /* @__PURE__ */ new Map();
      #pings = /* @__PURE__ */ new Map();
      #closed = false;
      #closeCode;
      #closeMsg;
      #lastSeen;
      #maxBuffered;
      #overflowing = false;
      /**
       * `maxBuffered`: when the link's send buffer holds more than this many bytes after a
       * send, the far end is not reading: the Peer sends `bye {code:"E_BUSY"}` and closes.
       */
      constructor(link, handlers, opts = {}) {
        this.#link = link;
        this.#h = handlers;
        this.#limits = { ...DEFAULT_LIMITS, ...opts.limits ?? {} };
        this.#now = opts.now ?? Date.now;
        const mb = opts.maxBuffered;
        this.#maxBuffered = typeof mb === "number" && Number.isFinite(mb) && mb > 0 ? mb : void 0;
        this.#lastSeen = this.#now();
        link.onmessage = (d) => this.#onMessage(d);
        link.onclose = () => this.#finish();
      }
      get closed() {
        return this.#closed || !this.#link.open;
      }
      /** Time (per `now`) the last frame arrived. */
      get lastSeen() {
        return this.#lastSeen;
      }
      get bufferedAmount() {
        return this.#link.bufferedAmount;
      }
      request(m, p, opts = {}) {
        if (this.closed) return Promise.reject(new ReinsError("E_GONE", "connection closed"));
        const id = ++this.#nextId;
        const frame = { t: "req", id, m };
        if (p !== void 0) frame.p = p;
        if (opts.ag !== void 0) frame.ag = opts.ag;
        if (opts.c === 1) frame.c = 1;
        let text;
        try {
          text = encodeFrame(frame);
        } catch {
          return Promise.reject(new ReinsError("E_BAD_ARGS", "params are not JSON"));
        }
        if (utf8Length(text) > this.#limits.maxText) return Promise.reject(new ReinsError("E_TOO_LARGE", "request too large"));
        const timeoutMs = opts.timeoutMs ?? this.#limits.reqTimeoutMs;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.#pending.delete(id);
            reject(new ReinsError("E_TIMEOUT", `${m} timed out`));
          }, timeoutMs);
          this.#pending.set(id, { resolve, reject, timer });
          this.#send(text);
        });
      }
      event(topic, d, extra = {}) {
        const f = { t: "evt", topic };
        if (extra.s !== void 0) f.s = extra.s;
        if (extra.ag !== void 0) f.ag = extra.ag;
        if (d !== void 0) f.d = d;
        this.#sendFrame(f, true);
      }
      sendBinary(bytes) {
        if (this.closed) return;
        if (bytes.length > this.#limits.maxBinary) throw new ReinsError("E_TOO_LARGE", "binary frame too large");
        this.#send(bytes);
      }
      flow(ch, credit) {
        this.#sendFrame({ t: "flow", ch, credit }, true);
      }
      /** Round-trip time in ms. Rejects with `E_TIMEOUT` or `E_GONE`. */
      ping(timeoutMs = this.#limits.reqTimeoutMs) {
        if (this.closed) return Promise.reject(new ReinsError("E_GONE", "connection closed"));
        const ts = this.#now();
        return new Promise((resolve, reject) => {
          const list2 = this.#pings.get(ts) ?? [];
          const entry = {
            resolve,
            reject,
            timer: setTimeout(() => {
              const l = this.#pings.get(ts);
              if (l) {
                const i = l.indexOf(entry);
                if (i >= 0) l.splice(i, 1);
                if (!l.length) this.#pings.delete(ts);
              }
              reject(new ReinsError("E_TIMEOUT", "ping timed out"));
            }, timeoutMs)
          };
          list2.push(entry);
          this.#pings.set(ts, list2);
          this.#sendFrame({ t: "ping", ts }, false);
        });
      }
      /** Send `bye` and close. */
      bye(code = "OK", msg) {
        if (this.closed) return;
        const f = { t: "bye", code };
        if (msg !== void 0) f.msg = msg;
        this.#sendFrame(f, false);
        this.#closeCode = code;
        this.#closeMsg = msg;
        this.#link.close();
        this.#finish();
      }
      #sendFrame(f, checkSize) {
        if (this.closed) return;
        const text = encodeFrame(f);
        if (checkSize && utf8Length(text) > this.#limits.maxText) throw new ReinsError("E_TOO_LARGE", "frame too large");
        this.#send(text);
      }
      /** Put a message on the link, then close if the far end has stopped reading. */
      #send(data) {
        this.#link.send(data);
        if (this.#maxBuffered === void 0 || this.#overflowing || this.#link.bufferedAmount <= this.#maxBuffered) return;
        this.#overflowing = true;
        this.bye("E_BUSY", "not reading: send buffer full");
      }
      #onMessage(data) {
        if (this.#closed) return;
        this.#lastSeen = this.#now();
        if (typeof data !== "string") {
          if (data.length > this.#limits.maxBinary) return this.bye("E_TOO_LARGE", "binary frame too large");
          this.#safe(() => this.#h.binary?.(data));
          return;
        }
        let f;
        try {
          f = decodeFrame(data, this.#limits.maxText);
        } catch (e) {
          const code = e instanceof ReinsError ? e.code : "E_BAD_FRAME";
          return this.bye(code, code === "E_TOO_LARGE" ? "frame too large" : "malformed frame");
        }
        switch (f.t) {
          case "req":
            void this.#serve(f);
            return;
          case "res": {
            const p = this.#pending.get(f.re);
            if (!p) return;
            this.#pending.delete(f.re);
            clearTimeout(p.timer);
            if (f.ok) p.resolve(f.r);
            else p.reject(new ReinsError(isErrorCode(f.e.code) ? f.e.code : "E_INTERNAL", String(f.e.msg), f.e.data));
            return;
          }
          case "evt":
            this.#safe(() => this.#h.event?.(f));
            return;
          case "flow":
            this.#safe(() => this.#h.flow?.(f));
            return;
          case "ping":
            this.#sendFrame({ t: "pong", ts: f.ts }, false);
            return;
          case "pong": {
            const list2 = this.#pings.get(f.ts);
            if (!list2) return;
            this.#pings.delete(f.ts);
            const rtt = Math.max(0, this.#now() - f.ts);
            for (const w of list2) {
              clearTimeout(w.timer);
              w.resolve(rtt);
            }
            return;
          }
          case "bye":
            this.#closeCode = f.code === "OK" || isErrorCode(f.code) ? f.code : "E_GONE";
            this.#closeMsg = f.msg;
            this.#link.close();
            this.#finish();
            return;
          default:
            this.bye("E_BAD_FRAME", "unexpected frame");
        }
      }
      async #serve(f) {
        let res;
        try {
          if (!this.#h.request) throw new ReinsError("E_UNKNOWN_METHOD", `unknown method ${f.m.slice(0, 64)}`);
          const r = await this.#h.request(f.m, f.p ?? {}, f);
          res = r === void 0 ? { t: "res", re: f.id, ok: true } : { t: "res", re: f.id, ok: true, r };
        } catch (e) {
          const err = e instanceof ReinsError ? e : new ReinsError("E_INTERNAL", "internal error");
          res = { t: "res", re: f.id, ok: false, e: err.toWire() };
        }
        if (this.closed) return;
        let text;
        try {
          text = encodeFrame(res);
        } catch {
          text = encodeFrame({ t: "res", re: f.id, ok: false, e: { code: "E_INTERNAL", msg: "result is not JSON" } });
        }
        if (utf8Length(text) > this.#limits.maxText) text = encodeFrame({ t: "res", re: f.id, ok: false, e: { code: "E_TOO_LARGE", msg: "result too large" } });
        this.#send(text);
      }
      #safe(fn) {
        try {
          fn();
        } catch {
        }
      }
      #finish() {
        if (this.#closed) return;
        this.#closed = true;
        const gone2 = () => new ReinsError("E_GONE", "connection closed");
        for (const p of this.#pending.values()) {
          clearTimeout(p.timer);
          p.reject(gone2());
        }
        this.#pending.clear();
        for (const list2 of this.#pings.values()) {
          for (const w of list2) {
            clearTimeout(w.timer);
            w.reject(gone2());
          }
        }
        this.#pings.clear();
        const code = this.#closeCode ?? "E_GONE";
        this.#safe(() => this.#h.close?.(code, this.#closeMsg));
      }
    };
  }
});

// packages/core/src/index.ts
var init_src = __esm({
  "packages/core/src/index.ts"() {
    "use strict";
    init_protocol();
    init_codec();
    init_schema();
    init_manifest();
    init_policy();
    init_chat();
    init_observe();
    init_merge();
    init_flow();
    init_crypto();
    init_link();
    init_rpc();
    init_seal();
  }
});

// packages/agent/src/keys.browser.ts
var keys_browser_exports = {};
__export(keys_browser_exports, {
  announcedHub: () => announcedHub,
  findNodeKey: () => findNodeKey,
  readTokenFile: () => readTokenFile
});
async function readTokenFile(_path) {
  throw new ReinsError("E_AUTH", "token files are not available in a browser: pass options.key");
}
async function findNodeKey(_url) {
  return void 0;
}
async function announcedHub(_url) {
  return void 0;
}
var init_keys_browser = __esm({
  "packages/agent/src/keys.browser.ts"() {
    init_src();
  }
});

// packages/driver/src/driver.ts
init_src();

// packages/driver/src/chat.ts
init_src();

// packages/driver/src/panel.ts
init_src();

// packages/driver/src/primordials.ts
var G = globalThis;
var apply = Reflect.apply;
var getOwn = Object.getOwnPropertyDescriptor;
var define = Object.defineProperty;
var create = Object.create;
function capture() {
  const ET = G.EventTarget;
  const Ev = G.Event;
  if (typeof ET !== "function" || typeof Ev !== "function" || typeof ET.prototype?.addEventListener !== "function") return null;
  let trusted;
  try {
    const d = getOwn(new Ev("reins"), "isTrusted");
    if (d && typeof d.get === "function" && d.configurable === false) trusted = d.get;
  } catch {
    trusted = void 0;
  }
  const fn = (o, k) => o && typeof o[k] === "function" ? o[k] : void 0;
  const win = G.window;
  return {
    add: ET.prototype.addEventListener,
    remove: ET.prototype.removeEventListener,
    win,
    winAdd: fn(win, "addEventListener") ?? ET.prototype.addEventListener,
    winRemove: fn(win, "removeEventListener") ?? ET.prototype.removeEventListener,
    createElement: fn(G.Document?.prototype, "createElement"),
    createElementNS: fn(G.Document?.prototype, "createElementNS"),
    createTextNode: fn(G.Document?.prototype, "createTextNode"),
    attachShadow: fn(G.Element?.prototype, "attachShadow"),
    trusted,
    currentTarget: getOwn(Ev.prototype, "currentTarget")?.get,
    stopPropagation: fn(Ev.prototype, "stopPropagation"),
    preventDefault: fn(Ev.prototype, "preventDefault"),
    Event: Ev
  };
}
var setT = G.setTimeout;
var clearT = G.clearTimeout;
var setI = G.setInterval;
var clearI = G.clearInterval;
var dateNow = Date.now;
var perf = G.performance;
var perfNow = typeof G.performance?.now === "function" ? G.performance.now : void 0;
var P = capture();
function prims() {
  return P ??= capture();
}
function nativeTrust() {
  return prims()?.trusted !== void 0;
}
function isTrusted(e) {
  const p = prims();
  if (!p) return false;
  if (p.trusted) {
    try {
      return apply(p.trusted, e, []) === true;
    } catch {
      return false;
    }
  }
  return e instanceof p.Event && e.isTrusted === true;
}
function currentTargetOf(e) {
  const p = prims();
  try {
    return p?.currentTarget ? apply(p.currentTarget, e, []) : e.currentTarget;
  } catch {
    return null;
  }
}
function trustedAt(e, at) {
  return isTrusted(e) && currentTargetOf(e) === at;
}
function stop(e) {
  const f = prims()?.stopPropagation;
  try {
    if (f) apply(f, e, []);
    else e.stopPropagation();
  } catch {
  }
}
function prevent(e) {
  const f = prims()?.preventDefault;
  try {
    if (f) apply(f, e, []);
    else e.preventDefault();
  } catch {
  }
}
function bare(o) {
  if (o === void 0 || typeof o === "boolean") return o;
  const out = create(null);
  if (o.capture !== void 0) out.capture = o.capture;
  if (o.passive !== void 0) out.passive = o.passive;
  if (o.once !== void 0) out.once = o.once;
  return out;
}
function wire(which, target, type, fn, options) {
  const p = prims();
  if (p) {
    const mine = target === p.win;
    const f = which === "add" ? mine ? p.winAdd : p.add : mine ? p.winRemove : p.remove;
    if (p.trusted) {
      apply(f, target, [type, fn, bare(options)]);
      return;
    }
    try {
      apply(f, target, [type, fn, bare(options)]);
      return;
    } catch {
    }
  }
  if (which === "add") target.addEventListener(type, fn, options);
  else target.removeEventListener(type, fn, options);
}
function listen(target, type, fn, options) {
  wire("add", target, type, fn, options);
}
function unlisten(target, type, fn, options) {
  wire("remove", target, type, fn, options);
}
function ownAdd(type, fn, options) {
  listen(this, type, fn, options);
}
function ownRemove(type, fn, options) {
  unlisten(this, type, fn, options);
}
function seal(el) {
  try {
    define(el, "addEventListener", { value: ownAdd, writable: false, configurable: false, enumerable: false });
    define(el, "removeEventListener", { value: ownRemove, writable: false, configurable: false, enumerable: false });
  } catch {
  }
  return el;
}
function createElement(doc, tag) {
  const f = prims()?.createElement;
  if (f) {
    try {
      return seal(apply(f, doc, [tag]));
    } catch (e) {
      if (nativeTrust()) throw e;
    }
  }
  return seal(doc.createElement(tag));
}
function createElementNS(doc, ns, tag) {
  const f = prims()?.createElementNS;
  if (f) {
    try {
      return seal(apply(f, doc, [ns, tag]));
    } catch (e) {
      if (nativeTrust()) throw e;
    }
  }
  return seal(doc.createElementNS(ns, tag));
}
function createTextNode(doc, text) {
  const f = prims()?.createTextNode;
  if (f) {
    try {
      return apply(f, doc, [text]);
    } catch (e) {
      if (nativeTrust()) throw e;
    }
  }
  return doc.createTextNode(text);
}
function attachShadow(host, init) {
  const f = prims()?.attachShadow;
  if (f) {
    try {
      return apply(f, host, [init]);
    } catch (e) {
      if (nativeTrust()) throw e;
    }
  }
  return host.attachShadow(init);
}
function later(fn, ms) {
  return apply(setT, void 0, [fn, ms]);
}
function cancelLater(t) {
  if (t !== void 0) apply(clearT, void 0, [t]);
}
function every(fn, ms) {
  return apply(setI, void 0, [fn, ms]);
}
function cancelEvery(t) {
  if (t !== void 0) apply(clearI, void 0, [t]);
}
function now() {
  return apply(dateNow, Date, []);
}
function tick() {
  return perfNow ? apply(perfNow, perf, []) : now();
}

// packages/driver/src/text.ts
function truncate(s, max) {
  const cps = Array.from(s);
  return cps.length > max ? `${cps.slice(0, max - 1).join("")}\u2026` : s;
}
var UNSEEN = new RegExp("[\\p{C}\\p{Z}\\p{Default_Ignorable_Code_Point}\\u2800]", "gu");
function escape(c) {
  return `\\u{${c.codePointAt(0).toString(16).toUpperCase()}}`;
}
var MARKS_MAX = 2;
var MARK_RUN = new RegExp(`\\p{M}{${MARKS_MAX + 1},}`, "gu");
function visible(s) {
  return s.replace(UNSEEN, (c) => c === " " ? c : escape(c)).replace(MARK_RUN, (run) => {
    const marks = Array.from(run);
    return marks.slice(0, MARKS_MAX).join("") + marks.slice(MARKS_MAX).map(escape).join("");
  });
}
function visibleLines(s) {
  return s.split("\n").map(visible).join("\n");
}
var QUOTES = /[“”]/g;
function agentLabel(name2, id, o = {}) {
  const shown = visible(truncate(typeof name2 === "string" ? name2 : "", o.max ?? 60)).replace(QUOTES, escape);
  const sid = visible(truncate(typeof id === "string" ? id : "", 12)).replace(/[()]/g, escape);
  const quoted2 = shown === "" ? "unnamed" : `\u201C${shown}\u201D`;
  const label = sid === "" ? quoted2 : `${quoted2} (${sid})`;
  return o.lead ? `AI agent ${label}` : label;
}

// packages/driver/src/panel.ts
var PANEL_ID = "reins-panel";
var Panel = class {
  el;
  #kit;
  #tablist;
  #closeBtn;
  #tabs = [];
  #active;
  #open = false;
  #onToggle;
  /** A line under the tabs, from the overlay: why a click was not taken. */
  #notice;
  /** `onToggle(open, byPerson)`: `byPerson` is true when the panel was closed from inside (Escape, the close button). */
  constructor(kit, onToggle) {
    this.#kit = kit;
    this.#onToggle = onToggle;
    this.el = kit.el("div", "panel");
    this.el.id = PANEL_ID;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "AI agent permissions and activity");
    this.el.hidden = true;
    const head = kit.el("div", "tabs");
    this.#tablist = kit.el("div", "tablist");
    this.#tablist.setAttribute("role", "tablist");
    this.#closeBtn = kit.button("\xD7", "x", () => this.close(true));
    this.#closeBtn.setAttribute("aria-label", "Close");
    head.append(this.#tablist, this.#closeBtn);
    this.#notice = kit.el("p", "held");
    this.#notice.setAttribute("role", "status");
    this.#notice.hidden = true;
    this.el.append(head, this.#notice);
    const el = this.el;
    listen(el, "keydown", (e) => {
      const mine = trustedAt(e, el);
      stop(e);
      if (!mine) return;
      if (e.key === "Escape") {
        prevent(e);
        this.close(true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") this.#arrow(e);
    });
    listen(el, "click", stop);
  }
  /** Show a line under the tabs, or with `null` take it away. The overlay's words, never an agent's. */
  notice(text) {
    this.#notice.textContent = text ?? "";
    this.#notice.hidden = text === null;
  }
  get isOpen() {
    return this.#open;
  }
  addTab(tab) {
    const kit = this.#kit;
    const btn = kit.button(tab.label, "tab", () => this.#select(tab.id, true));
    btn.id = `${PANEL_ID}-tab-${tab.id}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", `${PANEL_ID}-body-${tab.id}`);
    const mark = kit.el("span", "tb");
    mark.hidden = true;
    btn.append(mark);
    const body = kit.el("div", "pbody");
    body.id = `${PANEL_ID}-body-${tab.id}`;
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", btn.id);
    body.hidden = true;
    const rec = { tab, btn, mark, body };
    this.#tabs.push(rec);
    this.#tablist.append(btn);
    this.el.append(body);
    if (this.#active === void 0) this.#active = tab.id;
    this.#sync();
    const showing = () => this.#open && this.#active === tab.id;
    return {
      refresh: () => {
        if (showing()) tab.render(body);
      },
      badge: (text) => {
        mark.textContent = text;
        mark.hidden = text === "";
      },
      get showing() {
        return showing();
      }
    };
  }
  #rec(id) {
    return this.#tabs.find((t) => t.tab.id === id);
  }
  #sync() {
    for (const t of this.#tabs) {
      const on = t.tab.id === this.#active;
      t.btn.setAttribute("aria-selected", String(on));
      t.btn.tabIndex = on ? 0 : -1;
      t.body.hidden = !on;
    }
  }
  #select(id, focus2 = false) {
    const next = this.#rec(id);
    if (!next) return;
    if (this.#active !== id) this.#rec(this.#active)?.tab.hidden?.();
    this.#active = id;
    this.#sync();
    if (this.#open) {
      next.tab.render(next.body);
      next.tab.rearm?.();
    }
    if (focus2) this.#focus(next.btn);
  }
  #focus(el) {
    try {
      el?.focus({ preventScroll: true });
    } catch {
    }
  }
  /**
   * Arrow keys move focus inside a tab list or a radio group and choose nothing: choosing is
   * a click, Enter or Space on the control, which the browser delivers as a trusted click.
   */
  #arrow(e) {
    const from = this.el.getRootNode().activeElement;
    const group = from?.closest('[role="tablist"],[role="radiogroup"]');
    if (!from || !group) return;
    const items = Array.from(group.querySelectorAll('[role="tab"],[role="radio"]'));
    const i = items.indexOf(from);
    if (i < 0) return;
    prevent(e);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    this.#focus(items[(i + step + items.length) % items.length]);
  }
  open() {
    if (this.#open || !this.#tabs.length) return;
    this.#open = true;
    this.el.hidden = false;
    const cur = this.#rec(this.#active) ?? this.#tabs[0];
    this.#active = cur.tab.id;
    this.#sync();
    cur.tab.render(cur.body);
    cur.tab.rearm?.();
    this.#onToggle(true, false);
    this.#focus(cur.btn);
  }
  /** `byPerson`: closed from inside the panel, so focus goes back to the control that opened it. */
  close(byPerson = false) {
    if (!this.#open) return;
    this.#open = false;
    this.el.hidden = true;
    for (const t of this.#tabs) {
      t.tab.hidden?.();
      t.body.replaceChildren();
    }
    this.#onToggle(false, byPerson);
  }
  /** The overlay moved to another place on screen: nothing armed may take a click aimed at what was there. */
  rearm() {
    if (this.#open) this.#rec(this.#active)?.tab.rearm?.();
  }
  /**
   * What is under the pointer changed without the person choosing it: a consent card or its
   * backdrop went away from over the panel. For a moment, nothing in the tab that is showing
   * that lets an agent do more takes a click.
   */
  settle() {
    if (this.#open) this.#rec(this.#active)?.tab.settle?.();
  }
};
var LEVEL_LABEL = { strict: "Strict", ask: "Ask", auto: "Auto", bypass: "Bypass" };
var LEVEL_MEANING = {
  strict: "Asks you before every action.",
  ask: "Asks you when the app or the hub says an action needs your approval.",
  auto: "Runs actions without asking, except those marked dangerous.",
  bypass: "Runs every action without asking. Actions the app or the hub blocks stay blocked."
};
var UNVERIFIED_HUB = "Unverified hub: this page cannot confirm that this agent comes through your Reins hub. Any program on this computer could be behind it. Continue only if you started this agent yourself.";
function rankOf(l) {
  return LEVELS.indexOf(l);
}
function own2(o, k) {
  return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : void 0;
}
function hubOf(agent, name2) {
  const d = own2(agent.hub, name2);
  return d === "allow" || d === "confirm" || d === "deny" ? d : "confirm";
}
function baseOf(a, agent) {
  return stricter(a.base, hubOf(agent, a.name));
}
function standing(a, agent, over = {}) {
  const rule2 = over.rule === null ? void 0 : over.rule ?? own2(agent.rules, a.name);
  const q = { base: baseOf(a, agent), risk: a.risk, level: over.level ?? agent.level, offered: agent.offered };
  if (rule2 !== void 0) q.rule = rule2;
  const v = decideAct(q);
  if (v.outcome === "prompt" && v.remember === true && !over.forget && agent.remembered.includes(a.name)) return { outcome: "run", by: "remembered" };
  return v;
}
function stopsAsking(model, agent, change) {
  const out = [];
  for (const a of model.actions) {
    const now4 = standing(a, agent).outcome;
    if (now4 === "run" || now4 === "denied") continue;
    const r = change.rule;
    const after = r && r.action === a.name ? standing(a, agent, { rule: r.d, forget: r.d === null }) : standing(a, agent, change.level === void 0 ? {} : { level: change.level });
    if (after.outcome === "run") out.push(a.name);
  }
  return out;
}
var PermissionsTab = class {
  id = "permissions";
  label = "Permissions";
  #kit;
  #hooks;
  #model = { agents: [], actions: [], unverified: false, canStop: false };
  #pending = null;
  #armedAt = 0;
  #armTimer;
  #confirmBtn = null;
  /** Where the tab is drawn, while it is the one showing. */
  #body = null;
  #seq = 0;
  /** A hook is running: the change that comes back is the person's own. */
  #acting = false;
  /** Until then the controls that let an agent do more ignore activation: what is under the pointer just changed. */
  #settleAt = 0;
  /** A confirm step was just opened: the next draw scrolls it into view. */
  #reveal = false;
  constructor(kit, hooks) {
    this.#kit = kit;
    this.#hooks = hooks;
  }
  /** A new state from the driver. Returns whether anything the tab shows changed. */
  update(model) {
    const changed = JSON.stringify(model) !== JSON.stringify(this.#model);
    this.#model = model;
    if (changed && !this.#acting && this.#body) this.settle();
    if (this.#pending && !this.#stillPending(this.#pending)) this.#drop();
    return changed;
  }
  /**
   * What is under the pointer changed, or is about to, without the person aiming at it: the
   * list was redrawn, a confirm step or a consent card went away. For `armMs` no control
   * that lets an agent do more takes a click, so neither a click on its way nor the second
   * half of a double click lands on one.
   */
  settle() {
    this.#settleAt = this.#kit.now() + this.#kit.armMs;
  }
  #agent(ag) {
    return this.#model.agents.find((a) => a.ag === ag);
  }
  #find(name2) {
    return this.#model.actions.find((x) => x.name === name2);
  }
  #stillPending(p) {
    const agent = this.#agent(p.ag);
    if (!agent) return false;
    if (p.kind === "level") return agent.offered.includes(p.level) && agent.level !== p.level;
    const a = this.#find(p.action);
    if (a === void 0 || baseOf(a, agent) === "deny") return false;
    if (p.kind === "reset") return own2(agent.rules, p.action) !== void 0 || agent.remembered.includes(p.action);
    return own2(agent.rules, p.action) !== "allow" && this.#mayAllow(a, agent);
  }
  /**
   * May the person set the rule `allow` for this action: never where the app or the hub
   * denies it, and where either asks about it only if a level on offer would waive the same
   * prompt. Where the hub did not say what it asks about, it counts as asking.
   */
  #mayAllow(a, agent) {
    const base = baseOf(a, agent);
    return base === "allow" || base === "confirm" && allowRulePermitted(a.risk, agent.offered);
  }
  /**
   * Open the confirm step for a change that lets an agent do more. It comes up under or
   * near the pointer and moves what is there, so nothing else that loosens takes a click for
   * a moment; its own button is armed after the same delay.
   */
  #ask(p) {
    this.#pending = p;
    this.#reveal = true;
    this.settle();
    this.#redraw();
  }
  /**
   * May a control that lets an agent do more take this click: not while what is under the
   * pointer has just changed, and not while the overlay cannot be relied on.
   */
  #mayLoosen() {
    return this.#settled() && this.#kit.sound();
  }
  #drop() {
    this.#pending = null;
    this.#confirmBtn = null;
    if (this.#armTimer) this.#kit.cancel(this.#armTimer);
    this.#armTimer = void 0;
    this.#armedAt = 0;
  }
  hidden() {
    this.#drop();
    this.#body = null;
    this.#settleAt = 0;
  }
  /** Run one of the driver's hooks for a click of the person. */
  #apply(fn) {
    this.#acting = true;
    try {
      fn();
    } finally {
      this.#acting = false;
    }
    this.#redraw();
  }
  #settled() {
    return this.#kit.now() >= this.#settleAt;
  }
  /** Start the arming delay of the confirm step again. */
  rearm() {
    if (!this.#pending) return;
    if (this.#armTimer) this.#kit.cancel(this.#armTimer);
    this.#armedAt = this.#kit.now() + this.#kit.armMs;
    this.#armTimer = this.#kit.later(() => {
      this.#armTimer = void 0;
      this.#armedAt = 0;
      this.#showArmed();
    }, this.#kit.armMs);
    this.#showArmed();
  }
  #showArmed() {
    const b = this.#confirmBtn;
    if (!b) return;
    const wait = this.#kit.now() < this.#armedAt;
    b.classList.toggle("wait", wait);
    if (wait) b.setAttribute("aria-disabled", "true");
    else b.removeAttribute("aria-disabled");
  }
  #redraw() {
    if (this.#body) this.render(this.#body);
  }
  render(body) {
    const kit = this.#kit;
    this.#body = body;
    const root = body.getRootNode();
    const active = root.activeElement;
    const key = active && body.contains(active) ? active.getAttribute("data-k") : null;
    const scroll = body.scrollTop;
    this.#confirmBtn = null;
    body.replaceChildren();
    if (!this.#model.agents.length) body.append(kit.el("p", "empty", "No AI agent is connected."));
    for (const agent of this.#model.agents) body.append(this.#section(agent));
    if (this.#pending) this.rearm();
    body.scrollTop = scroll;
    if (this.#reveal) {
      this.#reveal = false;
      try {
        this.#confirmBtn?.closest(".confirm")?.scrollIntoView({ block: "nearest" });
      } catch {
      }
    }
    if (key !== null) {
      const again = Array.from(body.querySelectorAll("[data-k]")).find((e) => e.getAttribute("data-k") === key);
      try {
        again?.focus({ preventScroll: true });
      } catch {
      }
    }
  }
  #heading(text) {
    const h = this.#kit.el("h4", void 0, text);
    h.id = `${PANEL_ID}-h${++this.#seq}`;
    return h;
  }
  #section(agent) {
    const kit = this.#kit;
    const name2 = agentLabel(agent.name, agent.ag);
    const sec = kit.el("section", "agent");
    sec.setAttribute("aria-label", name2);
    const head = kit.el("div", "ahead");
    head.append(kit.el("h3", void 0, name2));
    if (this.#model.unverified) {
      const flag = kit.el("span", "flag", "Unverified hub");
      flag.title = "This page could not verify the Reins hub it is connected to";
      head.append(flag);
    }
    if (this.#model.canStop) {
      const off = kit.button("Disconnect", "danger sm", () => this.#apply(() => this.#hooks.disconnect(agent.ag)));
      off.setAttribute("aria-label", `Disconnect ${name2} and revoke its access`);
      off.setAttribute("data-k", `off:${agent.ag}`);
      head.append(off);
    }
    sec.append(head);
    const lh = this.#heading("How much it asks you");
    const group = kit.el("div", "opts");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-labelledby", lh.id);
    for (const level of agent.offered) {
      const on = level === agent.level;
      const b = kit.button("", `opt l-${level}`, () => this.#chooseLevel(agent.ag, level));
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(on));
      b.setAttribute("data-k", `level:${agent.ag}:${level}`);
      b.tabIndex = on ? 0 : -1;
      b.append(kit.el("span", "mk"), kit.el("span", "ol", LEVEL_LABEL[level]), kit.el("span", "od", LEVEL_MEANING[level]));
      group.append(b);
    }
    sec.append(lh, group);
    if (!agent.offered.includes("auto") && !agent.offered.includes("bypass")) sec.append(kit.el("p", "note", "This app or its hub offers no level that asks less."));
    const p = this.#pending;
    if (p && p.ag === agent.ag && p.kind === "level") sec.append(this.#confirmLevel(agent, p.level));
    if (this.#model.actions.length) {
      sec.append(this.#heading("Actions"), kit.el("p", "note", "A rule you set here covers that action with any arguments, until this agent disconnects."));
      if (agent.hub === null) sec.append(kit.el("p", "note", "This hub did not say which actions it asks about, so each is shown as asking."));
      const list2 = kit.el("ul", "acts");
      for (const a of this.#model.actions) list2.append(this.#action(agent, a));
      sec.append(list2);
    }
    if (agent.scopes.length) {
      sec.append(this.#heading("What it may do"));
      const list2 = kit.el("ul", "scopes");
      for (const s of agent.scopes) {
        const li = kit.el("li");
        const sw = kit.button("", "sw", () => {
          if (!s.on && !this.#mayLoosen()) return;
          this.#apply(() => this.#hooks.setScope(agent.ag, s.scope, !s.on));
        });
        sw.setAttribute("role", "switch");
        sw.setAttribute("aria-checked", String(s.on));
        sw.setAttribute("data-k", `scope:${agent.ag}:${s.scope}`);
        sw.append(kit.el("span", "tr"), kit.el("span", "sk", s.scope), kit.el("span", "sd", SCOPE_MEANING[s.scope] ?? s.scope));
        li.append(sw);
        list2.append(li);
      }
      sec.append(list2);
    }
    return sec;
  }
  #action(agent, a) {
    const kit = this.#kit;
    const li = kit.el("li", "act");
    const row = kit.el("div", "arow");
    row.append(kit.el("span", "an", kit.show(a.name, 80)), kit.el("span", `risk ${a.risk}`, a.risk));
    li.append(row);
    if (baseOf(a, agent) === "deny") {
      row.append(kit.el("span", "blocked", a.base === "deny" ? "Blocked by app" : "Blocked by hub"));
      return li;
    }
    const hubAsks = a.base === "allow" && hubOf(agent, a.name) === "confirm";
    const st = standing(a, agent);
    const now4 = st.outcome === "run" ? "allow" : st.outcome === "prompt" ? "confirm" : "deny";
    const rule2 = own2(agent.rules, a.name);
    const mayAllow = this.#mayAllow(a, agent);
    const seg = kit.el("span", "seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", `${kit.show(a.name, 80)}: what happens when ${agentLabel(agent.name, agent.ag, { lead: true })} calls it`);
    const choices = [
      ["allow", "Allow"],
      ["confirm", "Ask"],
      ["deny", "Block"]
    ];
    for (const [d, label] of choices) {
      const b = kit.button(label, `b-${d}`, () => this.#chooseRule(agent.ag, a, d));
      b.setAttribute("aria-pressed", String(now4 === d));
      b.setAttribute("data-k", `rule:${agent.ag}:${a.name}:${d}`);
      if (d === "allow" && !mayAllow) {
        b.setAttribute("aria-disabled", "true");
        b.title = "Not available for this action here";
      }
      seg.append(b);
    }
    row.append(seg);
    const sub = kit.el("div", "asub");
    const remembered = rule2 === void 0 && st.by === "remembered";
    if (rule2 !== void 0) sub.append(kit.el("span", "src", "Your rule"));
    else if (remembered) sub.append(kit.el("span", "src", agent.hub === null ? "You approved it earlier. The hub may still ask" : "You approved it earlier"));
    else sub.append(kit.el("span", "src", "Follows the level"));
    if (hubAsks && agent.hub !== null) sub.append(kit.el("span", "src", "The hub asks about it"));
    if (rule2 !== void 0 || remembered) {
      const reset = kit.button("Reset", "link", () => this.#chooseRule(agent.ag, a, null));
      reset.setAttribute("aria-label", `Reset ${kit.show(a.name, 80)} to follow the level`);
      reset.setAttribute("data-k", `rule:${agent.ag}:${a.name}:reset`);
      sub.append(reset);
    }
    li.append(sub);
    if (!mayAllow) {
      const need = a.risk === "dangerous" ? LEVEL_LABEL.bypass : LEVEL_LABEL.auto;
      const who = a.base === "confirm" ? "the app asks about this action" : agent.hub === null ? "the hub may ask about this action" : "the hub asks about this action";
      li.append(kit.el("p", "why", `Allow is off: ${who}, and only the ${need} level could waive that. This app or its hub does not offer it.`));
    }
    const p = this.#pending;
    if (p && p.ag === agent.ag && p.kind !== "level" && p.action === a.name) {
      if (p.kind === "rule") li.append(this.#confirmRule(agent, a));
      else if (p.kind === "reset") li.append(this.#confirmReset(agent, a));
    }
    return li;
  }
  // ── choosing ──
  /**
   * Every click that can make an action run without asking takes the confirm step, armed
   * after a delay: there is no exception, so no single click loosens anything. That is the
   * levels `auto` and `bypass` above the present one, any level under which an action that
   * asks now would stop asking (`ask` after `strict`), the rule `allow`, and a reset after
   * which the action runs unasked. Everything else applies at once.
   */
  #chooseLevel(ag, level) {
    const agent = this.#agent(ag);
    if (!agent || !agent.offered.includes(level)) return;
    if (level === agent.level) {
      if (this.#pending) {
        this.#drop();
        this.#redraw();
      }
      return;
    }
    const up = rankOf(level) > rankOf(agent.level);
    if (up && (level === "auto" || level === "bypass") || stopsAsking(this.#model, agent, { level }).length > 0) {
      if (!this.#mayLoosen()) return;
      this.#ask({ ag, kind: "level", level });
      return;
    }
    this.#drop();
    this.#apply(() => this.#hooks.setLevel(ag, level));
  }
  #chooseRule(ag, a, d) {
    const agent = this.#agent(ag);
    if (!agent || baseOf(a, agent) === "deny") return;
    const now4 = standing(a, agent).outcome;
    if (d === "allow") {
      if (!this.#mayAllow(a, agent) || own2(agent.rules, a.name) === "allow") return;
      if (!this.#mayLoosen()) return;
      this.#ask({ ag, kind: "rule", action: a.name });
      return;
    }
    if (d === null && now4 !== "run" && standing(a, agent, { rule: null, forget: true }).outcome === "run") {
      if (!this.#mayLoosen()) return;
      this.#ask({ ag, kind: "reset", action: a.name });
      return;
    }
    if (d !== "deny" && now4 === "blocked" && !this.#mayLoosen()) return;
    this.#drop();
    this.#apply(() => this.#hooks.setRule(ag, a.name, d));
  }
  // ── the confirm step ──
  #confirmBox(title, lines, action, apply2) {
    const kit = this.#kit;
    const box = kit.el("div", "confirm");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", title);
    box.append(kit.el("p", "ct", title));
    if (this.#model.unverified) box.append(kit.el("p", "warn", UNVERIFIED_HUB));
    for (const l of lines) {
      if (typeof l === "string") box.append(kit.el("p", void 0, l));
      else {
        const ul = kit.el("ul", "cl");
        for (const x of l) ul.append(kit.el("li", void 0, x));
        box.append(ul);
      }
    }
    const row = kit.el("div", "cb");
    const cancel = kit.button("Cancel", "sm", () => {
      this.#drop();
      this.settle();
      this.#redraw();
    });
    cancel.setAttribute("data-k", "confirm:cancel");
    const go = kit.button(action, "primary sm", () => {
      if (kit.now() < this.#armedAt || !kit.sound()) return;
      const p = this.#pending;
      this.#drop();
      this.settle();
      if (p && this.#stillPending(p)) apply2();
      else this.#redraw();
    });
    go.setAttribute("data-k", "confirm:go");
    this.#confirmBtn = go;
    row.append(cancel, go);
    box.append(row);
    return box;
  }
  #confirmLevel(agent, level) {
    const kit = this.#kit;
    const name2 = agentLabel(agent.name, agent.ag);
    const stops = stopsAsking(this.#model, agent, { level }).map((n) => kit.show(n, 80));
    const lines = [];
    if (stops.length) {
      lines.push(`${name2} will then run ${stops.length === 1 ? "this action" : "these actions"} without asking you, with any arguments:`, stops);
    } else lines.push(`No action of this app asks you about ${name2} right now, so nothing changes at once.`);
    lines.push(
      level === "auto" ? "Actions marked dangerous still ask. Actions the app or the hub blocks stay blocked, and your own Ask and Block rules stay." : level === "bypass" ? "This includes actions marked dangerous. Actions the app or the hub blocks stay blocked, and your own Ask and Block rules stay." : "Actions the app or the hub wants confirmed still ask, and your own Ask and Block rules stay.",
      "It lasts until this agent disconnects or you change it here."
    );
    return this.#confirmBox(`Set ${name2} to ${LEVEL_LABEL[level]}?`, lines, `Set to ${LEVEL_LABEL[level]}`, () => this.#apply(() => this.#hooks.setLevel(agent.ag, level)));
  }
  #confirmRule(agent, a) {
    const kit = this.#kit;
    const name2 = agentLabel(agent.name, agent.ag);
    const action = kit.show(a.name, 80);
    const lines = [`${name2} will then run ${action} without asking you, with any arguments${a.risk === "safe" ? "" : `. The app marks this action ${a.risk}`}.`];
    if (a.base === "allow" && hubOf(agent, a.name) === "confirm") lines.push(agent.hub === null ? "The hub may want this action confirmed. This rule answers that for you from now on." : "The hub wants this action confirmed. This rule answers that for you from now on.");
    lines.push("It lasts until this agent disconnects or you change it here, whatever the level.");
    return this.#confirmBox(`Always allow ${action}?`, lines, "Always allow", () => this.#apply(() => this.#hooks.setRule(agent.ag, a.name, "allow")));
  }
  /** Reset, where the action would then run without asking: the person's own Ask or Block is all that holds it. */
  #confirmReset(agent, a) {
    const kit = this.#kit;
    const name2 = agentLabel(agent.name, agent.ag);
    const action = kit.show(a.name, 80);
    const after = standing(a, agent, { rule: null, forget: true });
    const lines = [
      `Your rule for ${action} goes. ${name2} will then run it without asking you, with any arguments: ${after.by === "level" ? `the ${LEVEL_LABEL[agent.level]} level lets it` : "nothing else asks about it"}${a.risk === "safe" ? "" : `. The app marks this action ${a.risk}`}.`,
      "It lasts until this agent disconnects or you change it here."
    ];
    return this.#confirmBox(`Reset ${action}?`, lines, "Reset", () => this.#apply(() => this.#hooks.setRule(agent.ag, a.name, null)));
  }
};
var ACTIVITY_MAX = 50;
var BY_TEXT = {
  person: "you approved",
  level: "allowed by the level",
  rule: "allowed by your rule",
  remembered: "approved earlier"
};
function clock(t) {
  const d = new Date(t);
  const two = (n) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}
var ActivityTab = class {
  id = "activity";
  label = "Activity";
  #kit;
  #entries = [];
  constructor(kit) {
    this.#kit = kit;
  }
  /** The log, newest last, at most ACTIVITY_MAX entries. */
  update(entries) {
    this.#entries = entries;
  }
  render(body) {
    const kit = this.#kit;
    const scroll = body.scrollTop;
    body.replaceChildren();
    if (!this.#entries.length) {
      body.append(kit.el("p", "empty", "Nothing yet. Commands from AI agents show up here."));
      return;
    }
    body.append(kit.el("p", "note", `The last ${ACTIVITY_MAX} commands, newest first. Arguments and page content are not kept here.`));
    const list2 = kit.el("ul", "log");
    for (let i = this.#entries.length - 1; i >= 0; i--) {
      const e = this.#entries[i];
      const li = kit.el("li", e.you ? "you" : "");
      const time = kit.el("time", "lt", clock(e.t));
      const what = kit.el("span", "lw", `${kit.show(e.what, 80)}${e.n > 1 ? ` \xD7${e.n}` : ""}`);
      const name2 = agentLabel(e.agent, e.ag, { max: 40 });
      const who = kit.el("span", "la", e.you ? `You, for ${name2}` : name2);
      li.append(time, what);
      if (e.outcome) li.append(kit.el("span", `lo ${e.outcome === "ok" ? "ok" : "err"}`, e.outcome === "ok" ? "ok" : kit.show(e.outcome, 24)));
      li.append(who);
      if (e.by) li.append(kit.el("span", "lb", BY_TEXT[e.by]));
      list2.append(li);
    }
    body.append(list2);
    body.scrollTop = scroll;
  }
};
var SCOPE_MEANING = {
  observe: "See what is on this page",
  act: "Use this app's own actions",
  ui: "Click, type and scroll for you",
  cursor: "Show its pointer on screen",
  show: "Show messages and panels",
  nav: "Open other pages of this app",
  chat: "Send you chat messages and read what you type to it"
};
var PANEL_CSS = `
.pill .open{flex:0 1 auto;min-width:0;display:flex;justify-content:flex-start;gap:10px;height:30px;padding:0 9px 0 8px;margin:0 0 0 -8px;border-radius:999px;background:transparent;font:inherit;color:inherit}
.pill .open:hover,.pill .open[aria-expanded="true"]{background:var(--r-soft)}
.pill .open .car{flex:none;width:7px;height:7px;margin:0 1px 3px 0;border:solid var(--r-muted);border-width:0 0 2px 2px;transform:rotate(135deg);transition:transform .15s}
.pill .open[aria-expanded="true"] .car{margin:3px 1px 0 0;transform:rotate(-45deg)}
.pill .lvl,.pill .rul{flex:none;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;line-height:17px;background:var(--r-soft);color:var(--r-muted)}
.pill .lvl.auto,.pill .rul.auto{background:rgba(217,119,6,.16);color:var(--r-warn)}
.pill .lvl.bypass,.pill .rul.bypass{background:rgba(220,38,38,.14);color:var(--r-danger)}
.pill.lv-auto .dot{background:var(--r-warn);animation-name:r-pulse-a}
.pill.lv-bypass .dot{background:var(--r-danger);animation-name:r-pulse-b}
.backdrop.beside{padding-right:calc(min(400px,100vw - 32px) + 80px)}
@media (max-width:860px){.backdrop.beside{padding-right:16px}.panel.under{z-index:1}}
.panel{position:fixed;z-index:3;right:16px;bottom:104px;display:flex;flex-direction:column;width:min(400px,calc(100vw - 32px));height:min(620px,calc(100vh - 128px));overflow:hidden;border-radius:16px;
background:var(--r-card);color:var(--r-fg);border:1px solid var(--r-line);box-shadow:var(--r-shadow);pointer-events:auto}
.panel .tabs{flex:none;display:flex;align-items:flex-end;gap:6px;padding:8px 8px 0 10px;border-bottom:1px solid var(--r-line)}
.panel .tablist{display:flex;gap:2px}
.panel .tab{height:32px;padding:0 12px;border-radius:9px 9px 0 0;background:transparent;color:var(--r-muted)}
.panel .tab:hover{background:var(--r-soft)}
.panel .tab[aria-selected="true"]{color:var(--r-fg);box-shadow:inset 0 -2px 0 var(--r-accent)}
.panel .tb{padding:0 6px;border-radius:999px;background:var(--r-accent);color:#fff;font-size:10.5px;line-height:16px}
.panel .x{margin:0 0 4px auto;width:28px;height:28px;padding:0;background:transparent;color:var(--r-muted);font-size:17px;font-weight:400}
.panel .x:hover{background:var(--r-soft)}
.panel .pbody{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:12px 14px 14px}
.panel ul{list-style:none;margin:0;padding:0}
.panel p{margin:0}
.panel h3{margin:0;font-size:14px;line-height:1.3;font-weight:680;overflow-wrap:anywhere}
.panel h4{margin:14px 0 6px;font-size:11px;line-height:1.3;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--r-muted)}
.panel .agent+.agent{margin-top:16px;padding-top:14px;border-top:1px solid var(--r-line)}
.panel .ahead{display:flex;align-items:center;gap:8px}
.panel .ahead h3{flex:1 1 auto;min-width:0}
.panel .flag{flex:none;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;line-height:17px;background:rgba(220,38,38,.14);color:var(--r-danger)}
.panel button.sm{flex:none;height:26px;padding:0 11px;font-size:12px}
.panel .opts{display:grid;gap:3px}
.panel .opt{display:grid;grid-template-columns:16px 1fr;column-gap:9px;justify-content:stretch;align-items:start;height:auto;padding:7px 10px;border-radius:10px;background:transparent;text-align:left;font-weight:400;line-height:1.35;user-select:none}
.panel .opt:hover,.panel .opt[aria-checked="true"]{background:var(--r-soft)}
.panel .opt:active{transform:none}
.panel .opt .mk{width:14px;height:14px;margin-top:2px;border-radius:50%;border:2px solid var(--r-muted)}
.panel .opt[aria-checked="true"] .mk{border-color:var(--r-accent);background:var(--r-accent);box-shadow:inset 0 0 0 2.5px var(--r-card)}
.panel .opt .ol{font-size:13px;font-weight:650}
.panel .opt.l-auto .ol{color:var(--r-warn)}
.panel .opt.l-bypass .ol{color:var(--r-danger)}
.panel .opt .od{grid-column:2;color:var(--r-muted);font-size:12px}
.panel .note{margin:0 0 6px;color:var(--r-muted);font-size:12px}
.panel .act{padding:7px 0;border-top:1px solid var(--r-line)}
.panel .act:first-child{border-top:0}
.panel .arow{display:flex;align-items:center;gap:8px}
.panel .an{flex:1 1 auto;min-width:0;font:600 12.5px/1.4 monospace;overflow-wrap:anywhere}
.panel .risk{flex:none;padding:1px 7px;border-radius:999px;font:700 10px/16px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;background:var(--r-soft);color:var(--r-muted)}
.panel .risk.sensitive{background:rgba(217,119,6,.15);color:var(--r-warn)}
.panel .risk.dangerous{background:rgba(220,38,38,.14);color:var(--r-danger)}
.panel .seg{flex:none;display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--r-soft)}
.panel .seg button{height:24px;padding:0 9px;border-radius:7px;background:transparent;font-size:12px;color:var(--r-muted)}
.panel .seg button:hover{color:var(--r-fg)}
.panel .seg button[aria-pressed="true"]{background:var(--r-card);color:var(--r-fg);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.panel .seg button.b-allow[aria-pressed="true"]{color:var(--r-ok)}
.panel .seg button.b-deny[aria-pressed="true"]{color:var(--r-danger)}
.panel .seg button[aria-disabled="true"],.panel .seg button[aria-disabled="true"]:hover{opacity:.45;cursor:not-allowed;color:var(--r-muted);transform:none}
.panel .blocked{flex:none;color:var(--r-danger);font-size:12px;font-weight:650}
.panel .asub{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;margin-top:2px;color:var(--r-muted);font-size:11.5px}
.panel .link{height:auto;padding:1px 2px;border-radius:4px;background:transparent;color:var(--r-accent);font-size:11.5px}
.panel .link:hover{background:transparent;text-decoration:underline}
.panel .why{margin-top:2px;color:var(--r-muted);font-size:11.5px}
.panel .sw{display:grid;grid-template-columns:30px auto 1fr;column-gap:10px;justify-content:stretch;align-items:center;width:100%;height:auto;padding:5px 6px;border-radius:9px;background:transparent;text-align:left;font-weight:400}
.panel .sw:hover{background:var(--r-soft)}
.panel .sw:active{transform:none}
.panel .sw .tr{position:relative;width:30px;height:18px;border-radius:999px;background:var(--r-soft-h);box-shadow:inset 0 0 0 1px var(--r-line);transition:background .15s}
.panel .sw .tr::after{content:"";position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s}
.panel .sw[aria-checked="true"] .tr{background:var(--r-ok)}
.panel .sw[aria-checked="true"] .tr::after{transform:translateX(12px)}
.panel .sw .sk{min-width:52px;font:600 12px/1.3 monospace}
.panel .sw .sd{color:var(--r-muted);font-size:12px;line-height:1.3}
.panel .confirm{margin:8px 0 2px;padding:10px 12px;border-radius:12px;border:1px solid var(--r-line);background:var(--r-soft)}
.panel .confirm p{margin:0 0 6px;font-size:12.5px;overflow-wrap:anywhere}
.panel .confirm .ct{font-size:13px;font-weight:680}
.panel .confirm .warn{padding:6px 9px;border-radius:8px;background:rgba(220,38,38,.12);color:var(--r-danger);font-weight:600}
.panel .confirm .cl{max-height:92px;overflow:auto;margin:0 0 6px;padding:4px 9px;border-radius:8px;background:var(--r-card);font:12px/1.5 monospace;overflow-wrap:anywhere}
.panel .confirm .cb{display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.panel .empty{margin:6px 0;color:var(--r-muted)}
.panel .log li{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:6px 0;border-top:1px solid var(--r-line);font-size:12px}
.panel .log li:first-child{border-top:0}
.panel .log .lt{flex:none;color:var(--r-muted);font-variant-numeric:tabular-nums}
.panel .log .lw{flex:1 1 auto;min-width:0;font:600 12px/1.4 monospace;overflow-wrap:anywhere}
.panel .log .you .lw{font:600 12px/1.4 system-ui,sans-serif}
.panel .log .lo{flex:none;font-weight:700}
.panel .log .lo.ok{color:var(--r-ok)}
.panel .log .lo.err{color:var(--r-danger)}
.panel .log .la{flex:1 1 100%;color:var(--r-muted);overflow-wrap:anywhere}
.panel .log .la+.lb{flex:1 1 100%;margin-top:-2px}
.panel .log .lb{color:var(--r-muted);font-style:italic}
`;

// packages/driver/src/chat.ts
var COUNTS_MAX = 256;
var ChatRoom = class {
  #mode;
  #now;
  #seq = 0;
  #log = [];
  /** By key: an object that stands for one grant, so that a new grant of the same agent reads nothing of the old one. */
  #members = /* @__PURE__ */ new Map();
  /** Under `person`: the grants the person let hear each other. Never one alone. */
  #heard = /* @__PURE__ */ new Set();
  /**
   * How many messages each agent session could read so far: the next one gets the next number.
   * Kept by session id, so that an agent's ids go on counting when its grant is replaced, and
   * say nothing about what was said to others.
   */
  #counts = /* @__PURE__ */ new Map();
  /**
   * `mode`: what the room relays between agents (`chatRelay`: the stricter of the page's
   * policy and the hub's). The person hears everyone, and everyone hears the person, either
   * way. `true` reads as `on` and `false` as `off`.
   */
  constructor(mode, now4 = Date.now) {
    this.#mode = chatRelayMode(mode) ?? "off";
    this.#now = now4;
  }
  get mode() {
    return this.#mode;
  }
  /**
   * The mode changed (the hub's policy arrived with an attach). What the person switched on
   * does not carry over. Returns whether it changed, and the ids of the agents the person had
   * switched on, which no longer hear each other by that switch.
   */
  setMode(mode) {
    if (mode === this.#mode) return { changed: false, silenced: [] };
    this.#mode = mode;
    return { changed: true, silenced: this.silence() };
  }
  /** A grant with `chat` in force enters the room. The name is the one its grant carries. It hears no other agent until the mode, or the person, says so. */
  join(key, ag, name2) {
    if (!this.#members.has(key)) this.#members.set(key, { ag, name: name2, state: "idle", note: "", at: 0 });
  }
  /**
   * The grant ended, or the person switched its `chat` scope off. What it said stays in the
   * transcript. Returns the ids of the agents that no longer hear another because of it: the
   * one that left, when the person had switched it on, and the one it leaves alone.
   */
  leave(key) {
    const m = this.#members.get(key);
    if (!m) return [];
    this.#members.delete(key);
    if (!this.#heard.delete(key)) return [];
    return [m.ag, ...this.#settle()];
  }
  /** One agent left alone hears nobody: the person's switch is off again. */
  #settle() {
    if (this.#heard.size >= 2) return [];
    return this.silence();
  }
  has(key) {
    return this.#members.has(key);
  }
  /** The agents in the room, in the order they came. */
  members() {
    const now4 = this.#now();
    return [...this.#members.values()].map((m) => {
      const live = m.state !== "idle" && now4 - m.at < CHAT_STATUS_TTL_MS;
      return { ag: m.ag, name: m.name, state: live ? m.state : "idle", note: live ? m.note : "" };
    });
  }
  /** The ids of the agents that hear each other now, in room order: all under `on`, none under `off`, and under `person` the ones the person switched on. */
  hearing() {
    if (this.#mode === "off") return [];
    const out = [];
    for (const [key, m] of this.#members) if (this.#mode === "on" || this.#heard.has(key)) out.push(m.ag);
    return out;
  }
  /**
   * The person lets these agents hear each other, together with the ones already switched on.
   * Taken only under `person`, only when every id is an agent in the room now, and only when
   * at least two then hear each other. Returns the ids newly switched on: empty when nothing
   * was taken.
   */
  include(ags) {
    if (this.#mode !== "person" || !Array.isArray(ags)) return [];
    const add = [];
    for (const ag of new Set(ags)) {
      const e = typeof ag === "string" ? this.#memberByAg(ag) : void 0;
      if (!e) return [];
      if (!this.#heard.has(e[0])) add.push(e);
    }
    if (!add.length || this.#heard.size + add.length < 2) return [];
    for (const [key] of add) this.#heard.add(key);
    return add.map(([, m]) => m.ag);
  }
  /** The person switched it off: no agent hears another from now on. Returns the ids that were switched on. */
  silence() {
    const out = [];
    for (const key of this.#heard) {
      const m = this.#members.get(key);
      if (m) out.push(m.ag);
    }
    this.#heard.clear();
    return out;
  }
  /** When the next status lapses, in milliseconds from now, or undefined when none is set. */
  nextLapse() {
    const now4 = this.#now();
    let due;
    for (const m of this.#members.values()) {
      if (m.state === "idle") continue;
      const left = m.at + CHAT_STATUS_TTL_MS - now4;
      if (left > 0 && (due === void 0 || left < due)) due = left;
    }
    return due;
  }
  /** The whole transcript, oldest first: what the person sees. */
  lines() {
    return this.#log.map((e) => e.line);
  }
  #memberByAg(ag) {
    for (const e of this.#members) if (e[1].ag === ag) return e;
    return void 0;
  }
  #ids() {
    return [...this.#members.values()].map((m) => m.ag);
  }
  /** The next id a message has for one agent session. */
  #nextId(ag) {
    const n = (this.#counts.get(ag) ?? 0) + 1;
    this.#counts.set(ag, n);
    if (this.#counts.size > COUNTS_MAX) {
      for (const k of this.#counts.keys()) {
        if (this.#memberByAg(k)) continue;
        this.#counts.delete(k);
        break;
      }
    }
    return n;
  }
  /** The message as one agent gets it: under the id it has for that agent, without what only the tab shows. */
  #message(line2, id) {
    const msg = { id, from: line2.from, text: line2.text, ts: line2.ts };
    if (line2.to !== void 0) msg.to = line2.to;
    return msg;
  }
  /**
   * Keep a message and say whom to send it to. `hear` are the ids `chatAudience` named; the
   * keys behind them, and the speaker's, are who may read the message from now on.
   */
  #post(from, text, hear, to, sender) {
    const line2 = { id: ++this.#seq, from, text, ts: this.#now() };
    if (to !== void 0) {
      line2.to = to;
      if (to !== CHAT_TO_PERSON) line2.toName = this.#memberByAg(to)[1].name;
    }
    const ids = /* @__PURE__ */ new Map();
    const give = (key) => {
      const id = this.#nextId(this.#members.get(key).ag);
      ids.set(key, id);
      return this.#message(line2, id);
    };
    const own3 = sender ? give(sender).id : void 0;
    const deliver = hear.map((ag) => ({ ag, msg: give(this.#memberByAg(ag)[0]) }));
    this.#log.push({ line: line2, ids });
    if (this.#log.length > CHAT_TRANSCRIPT_MAX) this.#log.splice(0, this.#log.length - CHAT_TRANSCRIPT_MAX);
    return own3 === void 0 ? { line: line2, deliver } : { line: line2, deliver, id: own3 };
  }
  /**
   * The person said something: to one agent of the room (`to`, its id) or to all of them.
   * Undefined, and nothing is kept, when nobody is there to hear it: also when the agent
   * `to` names is not in the room. A message for one agent is never widened to the others.
   */
  personSay(text, to) {
    const a = chatAudience({ relay: this.hearing(), from: "person", members: this.#ids(), ...to !== void 0 && { to } });
    if (a.outcome !== "post") return void 0;
    return this.#post({ kind: "person" }, text, a.hear, to);
  }
  /**
   * An agent said something. The person sees it in any case. Another agent hears it only when
   * both are among the agents that hear each other, and with `to` only the one it names; with
   * `to: "person"` no agent does. Throws `E_DENIED` for any other `to` from an agent that no
   * agent hears (the answer then says nothing about who else is attached), and `E_BAD_ARGS`
   * for a `to` that names no agent that hears it.
   */
  agentSay(key, text, to) {
    const me = this.#members.get(key);
    if (!me) throw new ReinsError("E_SCOPE", "grant lacks scope chat");
    const a = chatAudience({ relay: this.hearing(), from: { agent: me.ag }, members: this.#ids(), ...to !== void 0 && { to } });
    if (a.outcome === "refuse") {
      throw new ReinsError(a.code, a.code === "E_DENIED" ? "no other agent hears you on this page" : "to: no agent with that id hears you here");
    }
    return this.#post({ kind: "agent", id: me.ag, name: me.name }, text, a.outcome === "post" ? a.hear : [], to, key);
  }
  /**
   * What one agent may read, oldest first, each message under the id it has for that agent:
   * without `since` the latest `max` messages, with it the first `max` after that id. An
   * answer also holds at most CHAT_READ_BYTES of JSON, so that it always fits a frame. Where
   * that cuts, the latest are cut at the front (what is left is the newest), and with `since`
   * at the end (`next` then lets the agent go on from there).
   */
  read(key, since, max = CHAT_READ_DEFAULT) {
    const limit = Math.max(1, Math.min(CHAT_READ_MAX, Math.floor(max)));
    const mine = [];
    for (const e of this.#log) {
      const id = e.ids.get(key);
      if (id !== void 0 && (since === void 0 || id > since)) mine.push(this.#message(e.line, id));
    }
    const size2 = (m) => utf8Length(JSON.stringify(m));
    let messages;
    let bytes = 0;
    if (since === void 0) {
      const picked = mine.slice(-limit);
      let from = picked.length;
      while (from > 0) {
        const n = size2(picked[from - 1]);
        if (from < picked.length && bytes + n > CHAT_READ_BYTES) break;
        bytes += n;
        from--;
      }
      messages = picked.slice(from);
    } else {
      messages = [];
      for (const m of mine.slice(0, limit)) {
        const n = size2(m);
        if (messages.length > 0 && bytes + n > CHAT_READ_BYTES) break;
        bytes += n;
        messages.push(m);
      }
    }
    const last = messages[messages.length - 1];
    return { messages, next: last ? last.id : since ?? 0 };
  }
  /** What an agent says it is doing. Shown to the person; told to nobody else. */
  status(key, state, note) {
    const me = this.#members.get(key);
    if (!me) throw new ReinsError("E_SCOPE", "grant lacks scope chat");
    me.state = state;
    me.note = state === "idle" ? "" : note;
    me.at = this.#now();
  }
  /** A consent prompt came up: what the agents said they were doing is dropped, and is not shown again when the prompt has gone. */
  quiet() {
    for (const m of this.#members.values()) {
      m.state = "idle";
      m.note = "";
    }
  }
  /**
   * The hub did not deliver a message of the person to one agent: `id` is the id the message
   * has for that agent. Returns whether a line was marked. Only a message of the person is.
   */
  undelivered(key, id) {
    const m = this.#members.get(key);
    if (!m) return false;
    for (const e of this.#log) {
      if (e.ids.get(key) !== id || e.line.from.kind !== "person") continue;
      const list2 = e.line.undelivered ??= [];
      if (list2.some((x) => x.ag === m.ag)) return false;
      list2.push({ ag: m.ag, name: m.name });
      return true;
    }
    return false;
  }
};
var COUNT_FROM = CHAT_MAX_TEXT - 400;
var STICK_PX = 40;
var QUIET_EVENTS = ["keyup", "keypress", "input", "beforeinput", "paste", "copy", "cut", "compositionstart", "compositionupdate", "compositionend"];
function clock2(t) {
  const d = new Date(t);
  const two = (n) => String(n).padStart(2, "0");
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}
function escapeMark(c) {
  return `\\u{${c.codePointAt(0).toString(16).toUpperCase()}}`;
}
function quoted(kit, s, max) {
  return `\u201C${kit.show(s, max).replace(/[“”]/g, escapeMark)}\u201D`;
}
function heldKey(box) {
  const root = box.getRootNode();
  const active = root.activeElement;
  return active && box.contains(active) ? active.getAttribute("data-k") : null;
}
function focusKey(box, key) {
  if (key === null) return;
  const again = Array.from(box.querySelectorAll("[data-k]")).find((e) => e.getAttribute("data-k") === key);
  try {
    again?.focus({ preventScroll: true });
  } catch {
  }
}
var ChatTab = class {
  id = "chat";
  label = "Chat";
  #kit;
  #hooks;
  #onUnread;
  #model = { lines: [], members: [], busy: false, relay: "off", hearing: [] };
  /** Where the tab is drawn, while it is the one showing. */
  #body = null;
  #log = null;
  #empty = null;
  #stat = null;
  #warn = null;
  #hear = null;
  #gone = null;
  #toRow = null;
  #ta = null;
  #count = null;
  #sendBtn = null;
  /** The messages drawn in the log, oldest first. */
  #drawn = [];
  /** What the member row, the status line and the "who hears what" box were last drawn from. */
  #membersKey = "";
  #statKey = "";
  #hearKey = "";
  /**
   * The text the person has typed and not sent, as trusted input events left it. It survives
   * a change of tab. A textarea value that differs from it was not typed, and is never sent.
   */
  #draft = "";
  /** The agent the person addresses, by id. Undefined: everyone. */
  #to;
  /** The agent the person addressed has left: how the tab names it. Nothing is sent until they choose again. */
  #toGone = null;
  /** The highest message id the person has had in front of them. */
  #seen = 0;
  /** A confirm step is open: the agents it would let hear the others. */
  #pending = null;
  #armedAt = 0;
  #armTimer;
  #confirmBtn = null;
  /** Until then Send, Enter and the controls that let agents hear more ignore activation: the room just changed under the person. */
  #settleAt = 0;
  /** A hook is running: the change that comes back is the person's own. */
  #acting = false;
  /** `onUnread`: called with the unread count whenever it may have changed. */
  constructor(kit, hooks, onUnread = () => {
  }) {
    this.#kit = kit;
    this.#hooks = hooks;
    this.#onUnread = onUnread;
  }
  /** Messages of agents that came while the tab was not showing. */
  get unread() {
    let n = 0;
    for (const l of this.#model.lines) if (l.id > this.#seen && l.from.kind === "agent") n++;
    return n;
  }
  /** Whether the person's focus is in the composer. */
  get focused() {
    const ta = this.#ta;
    return ta !== null && ta.isConnected && ta.getRootNode().activeElement === ta;
  }
  /** Give the composer its focus back, when a command took it while the person was typing. */
  refocus() {
    const ta = this.#ta;
    if (!ta || !ta.isConnected || this.#model.members.length === 0 || this.focused) return;
    try {
      ta.focus({ preventScroll: true });
    } catch {
    }
  }
  /**
   * A new state from the driver. Draws only what changed, and only inside this tab: a message
   * that arrives moves no focus and redraws nothing the person may be about to press.
   */
  update(model) {
    const prev = this.#model;
    this.#model = model;
    const room = (m) => JSON.stringify([m.members.map((x) => [x.ag, x.name]), m.relay, m.hearing]);
    if (this.#to !== void 0 && this.#toGone === null && !model.members.some((m) => m.ag === this.#to)) {
      const was = prev.members.find((m) => m.ag === this.#to);
      this.#toGone = agentLabel(was?.name ?? "", this.#to, { lead: true });
    }
    if (room(prev) !== room(model)) {
      this.#dropPending();
      if (this.#body && !this.#acting) this.#settleAt = tick() + this.#kit.armMs;
    }
    if (this.#body) {
      if (prev.busy !== model.busy) this.render(this.#body);
      else if (!model.busy) {
        this.#sync();
        this.#markSeen();
      }
    }
    this.#onUnread(this.unread);
  }
  #forget() {
    this.#log = this.#empty = this.#stat = this.#warn = this.#hear = this.#gone = this.#toRow = this.#count = null;
    this.#ta = null;
    this.#sendBtn = null;
    this.#confirmBtn = null;
    this.#drawn = [];
    this.#membersKey = this.#statKey = this.#hearKey = "";
  }
  hidden() {
    this.#forget();
    this.#dropPending();
    this.#body = null;
    this.#settleAt = 0;
  }
  #markSeen() {
    const last = this.#model.lines[this.#model.lines.length - 1];
    if (last && last.id > this.#seen) this.#seen = last.id;
  }
  #settled() {
    return tick() >= this.#settleAt;
  }
  /**
   * What is under the pointer changed without the person choosing it (a consent card went away
   * from over the panel, or the overlay was put back on top): for `armMs` Send, the "Send to"
   * choices and the controls that let agents hear more take no press.
   */
  settle() {
    if (this.#body) this.#settleAt = tick() + this.#kit.armMs;
  }
  /** Run one of the driver's hooks for a press of the person. */
  #apply(fn) {
    this.#acting = true;
    try {
      fn();
    } finally {
      this.#acting = false;
    }
    this.#sync();
  }
  // ── the confirm step of "Agents can hear each other" ──
  #dropPending() {
    this.#pending = null;
    this.#confirmBtn = null;
    if (this.#armTimer) this.#kit.cancel(this.#armTimer);
    this.#armTimer = void 0;
    this.#armedAt = 0;
  }
  /** Start the arming delay of the confirm step again: the overlay moved, or the panel opened. */
  rearm() {
    if (!this.#pending) return;
    if (this.#armTimer) this.#kit.cancel(this.#armTimer);
    this.#armedAt = tick() + this.#kit.armMs;
    this.#armTimer = this.#kit.later(() => {
      this.#armTimer = void 0;
      this.#armedAt = 0;
      this.#showArmed();
    }, this.#kit.armMs);
    this.#showArmed();
  }
  #showArmed() {
    const b = this.#confirmBtn;
    if (!b) return;
    const wait = tick() < this.#armedAt;
    b.classList.toggle("wait", wait);
    if (wait) b.setAttribute("aria-disabled", "true");
    else b.removeAttribute("aria-disabled");
  }
  /** Would the confirm step still do what it says: under `person`, every agent it names in the room and not yet switched on, and at least two hearing each other afterwards. */
  #stillPending(p) {
    const m = this.#model;
    if (m.relay !== "person" || p.length === 0) return false;
    if (!p.every((ag) => m.members.some((x) => x.ag === ag) && !m.hearing.includes(ag))) return false;
    return m.hearing.length + p.length >= 2;
  }
  /**
   * Open the confirm step for letting `ags` hear the others. Letting agents hear more is never
   * one press, and like every change that lets an agent do or hear more it is not taken while
   * the overlay cannot be relied on (`kit.sound`): the person may not be seeing this tab as it is.
   */
  #ask(ags) {
    if (!this.#settled() || !this.#stillPending(ags) || !this.#kit.sound()) return;
    this.#pending = ags;
    this.#syncHear();
  }
  #toggleRelay() {
    if (this.#model.hearing.length >= 2) {
      this.#dropPending();
      this.#apply(() => this.#hooks.relay([], false));
      return;
    }
    if (this.#pending) return;
    this.#ask(this.#model.members.map((x) => x.ag));
  }
  #confirmBox(add) {
    const kit = this.#kit;
    const m = this.#model;
    const already = m.members.filter((x) => m.hearing.includes(x.ag));
    const adding = m.members.filter((x) => add.includes(x.ag));
    const box = kit.el("div", "confirm");
    const one = already.length > 0 && adding.length === 1;
    const title = one ? `Let ${agentLabel(adding[0].name, adding[0].ag, { lead: true })} hear the others?` : "Let these agents hear each other?";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", title);
    box.append(kit.el("p", "chd", title));
    if (m.unverified) box.append(kit.el("p", "warn", "Unverified hub: this page cannot confirm who these agents are."));
    box.append(kit.el("p", void 0, "Each of these will then receive what the others write in this chat, and can write to them:"));
    const ul = kit.el("ul", "cl");
    for (const x of [...already, ...adding]) ul.append(kit.el("li", "ag", agentLabel(x.name, x.ag, { lead: true })));
    box.append(ul);
    box.append(
      kit.el("p", void 0, "Nothing said so far is handed over. An agent that joins later is not included until you add it here."),
      kit.el("p", void 0, "It lasts until you switch it off, or until fewer than two of them are left.")
    );
    const row = kit.el("div", "cb");
    const cancel = kit.button("Cancel", "sm", () => {
      this.#dropPending();
      this.#syncHear();
    });
    cancel.setAttribute("data-k", "chat:relay:cancel");
    const go = kit.button(one ? "Let it hear them" : "Let them hear each other", "primary sm", () => {
      if (tick() < this.#armedAt || !this.#kit.sound()) return;
      const p = this.#pending;
      this.#dropPending();
      if (p && this.#stillPending(p)) this.#apply(() => this.#hooks.relay(p, true));
      else this.#syncHear();
    });
    go.setAttribute("data-k", "chat:relay:go");
    this.#confirmBtn = go;
    row.append(cancel, go);
    box.append(row);
    return box;
  }
  // ── drawing ──
  /** An agent as the tab names it in a sentence of its own: what it is, its name in quotation marks, its session id. */
  #label(x) {
    return this.#kit.el("span", "ag", agentLabel(x.name, x.ag, { lead: true }));
  }
  #list(ms) {
    const out = [];
    ms.forEach((x, i) => {
      if (i) out.push(i === ms.length - 1 ? " and " : ", ");
      out.push(this.#label(x));
    });
    return out;
  }
  render(body) {
    const kit = this.#kit;
    this.#forget();
    this.#body = body;
    body.replaceChildren();
    const wrap = kit.el("div", "chat");
    for (const type of QUIET_EVENTS) wrap.addEventListener(type, (e) => e.stopPropagation());
    if (this.#model.busy) {
      this.#dropPending();
      const frozen = kit.el("p", "cfrozen", "Chat is hidden until you have answered the request on screen. Nothing typed here approves it.");
      frozen.setAttribute("role", "status");
      wrap.append(frozen);
      body.append(wrap);
      this.#onUnread(this.unread);
      return;
    }
    const warn = kit.el("p", "cwarn", "Unverified hub: this page cannot confirm who is behind this chat. Any program on this computer could be writing here.");
    warn.hidden = true;
    this.#warn = warn;
    const hear = kit.el("div", "chear");
    hear.hidden = true;
    this.#hear = hear;
    const log = kit.el("div", "clog");
    log.id = `${PANEL_ID}-chat-log`;
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-relevant", "additions");
    log.setAttribute("aria-label", "Chat messages");
    log.tabIndex = 0;
    this.#log = log;
    this.#empty = kit.el("p", "empty");
    const stat = kit.el("p", "cstat");
    stat.setAttribute("role", "status");
    this.#stat = stat;
    const gone2 = kit.el("p", "cgone");
    gone2.setAttribute("role", "status");
    gone2.hidden = true;
    this.#gone = gone2;
    const form = kit.el("div", "cform");
    const toRow = kit.el("div", "cto");
    toRow.hidden = true;
    this.#toRow = toRow;
    const ta = kit.el("textarea", "cta");
    ta.rows = 2;
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("autocapitalize", "sentences");
    ta.setAttribute("aria-describedby", `${PANEL_ID}-chat-hint`);
    ta.value = this.#draft;
    ta.addEventListener("input", (e) => {
      if (isTrusted(e) && this.#model.held !== true) {
        this.#draft = ta.value;
        this.#hooks.typing();
      } else ta.value = this.#draft;
      this.#showComposer();
    });
    ta.addEventListener("keydown", (e) => {
      if (!isTrusted(e)) return;
      this.#hooks.typing();
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      this.#send();
    });
    this.#ta = ta;
    const foot = kit.el("div", "cfoot");
    const hint = kit.el("span", "chint", "A message here never approves a request or changes a permission.");
    hint.id = `${PANEL_ID}-chat-hint`;
    const count = kit.el("span", "ccount");
    count.setAttribute("aria-live", "polite");
    count.hidden = true;
    this.#count = count;
    const send = kit.button("Send", "primary sm", () => this.#send());
    send.setAttribute("data-k", "chat:send");
    this.#sendBtn = send;
    foot.append(hint, count, send);
    form.append(toRow, ta, foot);
    wrap.append(warn, hear, log, stat, gone2, form);
    body.append(wrap);
    this.#sync();
    this.#markSeen();
    log.scrollTop = log.scrollHeight;
    this.#onUnread(this.unread);
  }
  /** Bring what is drawn in line with the model, touching only what differs. */
  #sync() {
    const kit = this.#kit;
    const log = this.#log;
    const m = this.#model;
    if (!log || !this.#empty || !this.#stat || m.busy) return;
    const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight <= STICK_PX;
    const first = m.lines[0]?.id ?? Infinity;
    while (this.#drawn.length && this.#drawn[0].id < first) this.#drawn.shift().el.remove();
    const lastDrawn = this.#drawn[this.#drawn.length - 1]?.id ?? 0;
    let added = false;
    for (const line2 of m.lines) {
      if (line2.id <= lastDrawn) continue;
      const el = this.#message(line2);
      log.append(el);
      this.#drawn.push({ id: line2.id, el, marked: 0 });
      added = true;
    }
    for (const d of this.#drawn) {
      const line2 = m.lines.find((l) => l.id === d.id);
      const n = line2?.undelivered?.length ?? 0;
      if (!line2 || n === d.marked) continue;
      d.marked = n;
      d.el.querySelector(".cu")?.remove();
      const note = kit.el("p", "cu");
      note.append("Not delivered to ", ...this.#list(line2.undelivered), ". Send it again.");
      d.el.append(note);
    }
    if (m.lines.length === 0) {
      this.#empty.textContent = m.members.length ? "No messages yet." : "No agent attached with chat.";
      if (!this.#empty.isConnected) log.prepend(this.#empty);
    } else this.#empty.remove();
    if (added && atEnd) log.scrollTop = log.scrollHeight;
    const statKey = JSON.stringify(m.members.map((x) => [x.ag, x.name, x.state, x.note]));
    if (statKey !== this.#statKey) {
      this.#statKey = statKey;
      const stat = this.#stat;
      stat.replaceChildren();
      if (!m.members.length) stat.append("No agent attached with chat.");
      m.members.filter((x) => x.state !== "idle").forEach((x, i) => {
        if (i) stat.append(" \xB7 ");
        stat.append(this.#label(x), ` says it is ${x.state}`);
        if (x.note) stat.append(": ", kit.el("span", "cq", quoted(kit, x.note, 80)));
        else stat.append(".");
      });
    }
    if (this.#warn) this.#warn.hidden = m.unverified !== true;
    this.#syncHear();
    this.#syncTo();
    this.#showComposer();
  }
  #message(line2) {
    const kit = this.#kit;
    const el = kit.el("div", `cm ${line2.from.kind === "person" ? "you" : "ai"}`);
    const head = kit.el("p", "cw");
    if (line2.from.kind === "agent") head.append(kit.el("span", "ck", "AI agent"), kit.el("span", "cn", agentLabel(line2.from.name, line2.from.id)));
    else head.append(kit.el("span", "cn", "You"));
    if (line2.to === CHAT_TO_PERSON) head.append(kit.el("span", "cd", "to you only"));
    else if (line2.to !== void 0) head.append(kit.el("span", "cd", `to ${agentLabel(line2.toName ?? "", line2.to)} only`));
    head.append(kit.el("time", "ct", clock2(line2.ts)));
    const text = line2.text.replace(/\r\n?/g, "\n").split("\n").map((l) => kit.show(l, CHAT_MAX_TEXT + 1)).join("\n");
    el.append(head, kit.el("p", "cx", text));
    return el;
  }
  /**
   * Who hears what. Always there while an agent is in the room, and every agent is named, so
   * that the person is never surprised by who is listening. Under `chatRelay: "person"` it
   * also holds the switch, and for an agent that came after the switch was turned on, the
   * control that adds it.
   */
  #syncHear() {
    const box = this.#hear;
    const kit = this.#kit;
    if (!box) return;
    const m = this.#model;
    const key = JSON.stringify([m.members.map((x) => [x.ag, x.name]), m.relay, m.hearing, this.#pending, m.unverified === true, m.relayReset === true]);
    if (key === this.#hearKey) return;
    this.#hearKey = key;
    const held = heldKey(box);
    this.#confirmBtn = null;
    box.replaceChildren();
    box.hidden = m.members.length === 0;
    if (!m.members.length) return;
    const inSet = m.members.filter((x) => m.hearing.includes(x.ag));
    const alone = m.members.filter((x) => !m.hearing.includes(x.ag));
    const who = kit.el("p", "cwho");
    if (inSet.length >= 2) who.append(...this.#list(inSet), m.relay === "on" ? " hear you and each other: this app is set up that way." : " hear you and each other, because you switched that on.");
    else if (inSet.length === 1) who.append(...this.#list(inSet), " hears you. Agents that join this chat hear each other: this app is set up that way.");
    if (alone.length) {
      if (inSet.length) who.append(" ");
      who.append(...this.#list(alone), alone.length === 1 ? " hears only you." : " each hear only you, not each other.");
    }
    box.append(who);
    if (m.relayReset === true) {
      const reset = kit.el("p", "creset", "The hub changed how agents hear each other on this page. What you had switched on is off again: no agent hears another until you say so.");
      reset.setAttribute("role", "status");
      box.append(reset);
    }
    if (m.relay === "person" && m.members.length >= 2) {
      const on = inSet.length >= 2;
      const sw = kit.button("", "sw", () => this.#toggleRelay());
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-checked", String(on));
      sw.setAttribute("data-k", "chat:relay");
      sw.append(kit.el("span", "tr"), kit.el("span", "sk", "Agents can hear each other"), kit.el("span", "sd", on ? "On" : "Off"));
      box.append(sw);
      if (on) {
        for (const x of alone) {
          const add = kit.button(`Let ${agentLabel(x.name, x.ag)} hear them too`, "sm cadd", () => this.#ask([x.ag]));
          add.setAttribute("data-k", `chat:include:${x.ag}`);
          box.append(add);
        }
      }
      if (this.#pending) {
        box.append(this.#confirmBox(this.#pending));
        this.rearm();
      }
    }
    focusKey(box, held);
  }
  /** The row that says whom the person addresses: there when more than one agent listens, or when the one addressed has left. */
  #syncTo() {
    const row = this.#toRow;
    const kit = this.#kit;
    if (!row) return;
    const members = this.#model.members;
    const key = JSON.stringify([members.map((x) => [x.ag, x.name]), this.#to ?? null, this.#toGone]);
    if (key === this.#membersKey) return;
    this.#membersKey = key;
    const held = heldKey(row);
    row.replaceChildren();
    const show = members.length >= 2 || this.#toGone !== null && members.length >= 1;
    row.hidden = !show;
    if (this.#gone) {
      this.#gone.hidden = this.#toGone === null;
      this.#gone.textContent = this.#toGone === null ? "" : `${this.#toGone} left this chat. Your message was for it alone, so it was not sent: choose who gets it.`;
    }
    if (show) {
      row.setAttribute("role", "radiogroup");
      row.setAttribute("aria-label", "Send to");
      const option = (label, ag) => {
        const on = this.#toGone === null && this.#to === ag;
        const b = kit.button(label, "cto-o", () => {
          if (!this.#settled()) return;
          this.#to = ag;
          this.#toGone = null;
          this.#syncTo();
          this.#showComposer();
        });
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", String(on));
        b.setAttribute("data-k", `chat:to:${ag ?? "*"}`);
        b.tabIndex = on || this.#toGone !== null && ag === void 0 ? 0 : -1;
        row.append(b);
      };
      option("Everyone", void 0);
      for (const x of members) option(agentLabel(x.name, x.ag), x.ag);
    }
    focusKey(row, held);
  }
  /** The text that would be sent now, or undefined when nothing can be. */
  #sendable() {
    const m = this.#model;
    if (m.busy || m.members.length === 0 || this.#toGone !== null) return void 0;
    return chatText(chatWellFormed(this.#draft));
  }
  #showComposer() {
    const ta = this.#ta;
    const send = this.#sendBtn;
    const count = this.#count;
    if (!ta || !send || !count) return;
    const m = this.#model;
    const off = m.busy || m.members.length === 0;
    const target = m.members.find((x) => x.ag === this.#to) ?? (m.members.length === 1 ? m.members[0] : void 0);
    ta.readOnly = off || m.held === true;
    if (off) ta.setAttribute("aria-disabled", "true");
    else ta.removeAttribute("aria-disabled");
    const label = m.members.length === 0 ? "No agent attached with chat" : this.#toGone !== null ? "Choose who gets your message" : `Message ${target ? agentLabel(target.name, target.ag, { lead: true }) : "everyone"}`;
    ta.setAttribute("aria-label", label);
    ta.placeholder = label;
    const length = this.#draft.trim().length;
    count.hidden = length < COUNT_FROM;
    count.textContent = `${length} / ${CHAT_MAX_TEXT}`;
    count.classList.toggle("over", length > CHAT_MAX_TEXT);
    const ok = this.#sendable() !== void 0;
    send.classList.toggle("wait", !ok);
    if (ok) send.removeAttribute("aria-disabled");
    else send.setAttribute("aria-disabled", "true");
  }
  /** Send what the person typed. Reached from a trusted click on Send or a trusted Enter only. */
  #send() {
    const ta = this.#ta;
    if (!ta) return;
    if (ta.value !== this.#draft) {
      ta.value = this.#draft;
      this.#showComposer();
      return;
    }
    if (!this.#settled()) return;
    const text = this.#sendable();
    if (text === void 0) return;
    if (!this.#hooks.say(text, this.#to)) return;
    this.#draft = "";
    ta.value = "";
    this.#showComposer();
    const log = this.#log;
    if (log) log.scrollTop = log.scrollHeight;
  }
};
var CHAT_CSS = `
.vh{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.pill .unread{flex:none;min-width:18px;padding:0 5px;border-radius:999px;background:var(--r-accent);color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center}
.panel .chat{display:flex;flex-direction:column;gap:8px;height:100%;min-height:0}
.panel .chat .ag,.panel .chat .cn,.panel .chat .cd,.panel .chat .cq,.panel .chat .cx,.panel .chat .cto-o{unicode-bidi:isolate}
.panel .chat .clog{flex:1 1 auto;min-height:72px;overflow:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;padding:0 2px 2px;border-radius:8px;scrollbar-width:thin;scrollbar-color:var(--r-soft-h) transparent}
.panel .chat .clog:focus-visible{outline:2px solid var(--r-accent);outline-offset:1px}
.panel .chat .cm{flex:none;max-width:88%;padding:0 10px 8px;border-radius:12px;background:var(--r-soft);overflow-wrap:anywhere}
.panel .chat .cm.you{align-self:flex-end;background:var(--r-accent);color:#fff}
.panel .chat .cm.ai{align-self:flex-start}
.panel .chat .cw{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 6px;margin:0;padding:7px 0 2px;border-radius:12px 12px 0 0;background:inherit;font-size:11px;line-height:1.3;overflow:hidden}
.panel .chat .cn{font-weight:700;overflow-wrap:anywhere}
.panel .chat .ck{flex:none;padding:0 5px;border-radius:999px;border:1px solid var(--r-line);color:var(--r-muted);font-size:10px;font-weight:650}
.panel .chat .cd,.panel .chat .ct{color:var(--r-muted)}
.panel .chat .cm.you .cd,.panel .chat .cm.you .ct{color:rgba(255,255,255,.82)}
.panel .chat .cx{margin:0;white-space:pre-wrap;font-size:13px;line-height:1.4;overflow:hidden}
.panel .chat .cu{margin:4px 0 0;padding:3px 7px;border-radius:7px;background:#fff;color:var(--r-danger);font-size:11.5px;font-weight:650;overflow:hidden}
.panel .chat .cstat{flex:none;min-height:16px;margin:0;color:var(--r-muted);font-size:12px;line-height:1.3;overflow-wrap:anywhere;overflow:hidden}
.panel .chat .cq{font-style:italic}
.panel .chat .cfrozen{flex:none;margin:0;padding:6px 9px;border-radius:8px;background:rgba(217,119,6,.15);color:var(--r-warn);font-size:12px;font-weight:600}
.panel .chat .cgone{flex:none;margin:0;padding:6px 9px;border-radius:8px;background:rgba(217,119,6,.15);color:var(--r-warn);font-size:12px;font-weight:600;overflow-wrap:anywhere;overflow:hidden}
.panel .chat .cwarn{flex:none;margin:0;padding:6px 9px;border-radius:8px;background:rgba(220,38,38,.12);color:var(--r-danger);font-size:12px;font-weight:600;overflow-wrap:anywhere}
.panel .chat .chear{flex:none;display:grid;gap:4px;padding:6px 8px;border-radius:8px;border:1px solid var(--r-line);font-size:12px;line-height:1.35;overflow:hidden}
.panel .chat .cwho{margin:0;color:var(--r-muted);overflow-wrap:anywhere}
.panel .chat .creset{margin:0;padding:4px 7px;border-radius:7px;background:rgba(217,119,6,.15);color:var(--r-warn);font-weight:600;overflow-wrap:anywhere}
.panel .chat .chear .sw{grid-template-columns:30px 1fr auto;padding:3px 2px}
.panel .chat .chear .sw .sk{min-width:0;font:600 12px/1.3 system-ui,sans-serif}
.panel .chat .cadd{justify-self:start;height:24px;max-width:100%;padding:0 10px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;line-height:24px}
.panel .chat .confirm{margin:2px 0 0}
.panel .chat .confirm .chd{font-size:13px;font-weight:680}
.panel .chat .cform{flex:none;display:grid;gap:6px}
.panel .chat .cto{display:flex;flex-wrap:wrap;gap:4px}
.panel .chat .cto-o{height:24px;max-width:100%;padding:0 10px;font-size:12px;font-weight:600;color:var(--r-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;line-height:24px}
.panel .chat .cto-o[aria-checked="true"]{background:var(--r-accent);color:#fff}
.panel .chat .cta{box-sizing:border-box;display:block;width:100%;min-height:46px;max-height:132px;margin:0;padding:8px 10px;resize:none;border-radius:10px;border:1px solid var(--r-line);background:var(--r-card);color:var(--r-fg);
font:13px/1.4 system-ui,sans-serif;outline:none}
.panel .chat .cta::placeholder{color:var(--r-muted);opacity:1}
.panel .chat .cta:focus-visible{border-color:var(--r-accent);box-shadow:0 0 0 2px rgba(91,91,246,.28)}
.panel .chat .cta[aria-disabled="true"]{background:var(--r-soft);color:var(--r-muted);cursor:not-allowed}
.panel .chat .cfoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:4px 8px}
.panel .chat .chint{flex:1 1 150px;min-width:0;color:var(--r-muted);font-size:11px;line-height:1.3}
.panel .chat .ccount{flex:none;color:var(--r-muted);font-size:11.5px;font-variant-numeric:tabular-nums}
.panel .chat .ccount.over{color:var(--r-danger);font-weight:700}
`;

// packages/driver/src/input.ts
init_src();

// packages/driver/src/tree.ts
init_src();
var MAX_NODES = 1500;
var MAX_TREE_BYTES = 18e4;
var MAX_DEPTH2 = 256;
var MAX_ID_CHARS2 = 120;
var SKIP_TAGS = /* @__PURE__ */ new Set(["script", "style", "template", "noscript", "head", "meta", "link", "title", "base", "iframe", "object", "embed", "frame", "frameset", "datalist"]);
var PRIVATE_AUTOCOMPLETE = /* @__PURE__ */ new Set(["cc-number", "cc-csc", "cc-exp", "cc-exp-month", "cc-exp-year", "one-time-code", "current-password", "new-password"]);
var INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "textbox",
  "searchbox",
  "combobox",
  "slider",
  "spinbutton",
  "listbox",
  "treeitem",
  "gridcell",
  "scrollbar"
]);
var LANDMARK_ROLES = /* @__PURE__ */ new Set(["navigation", "main", "complementary", "banner", "contentinfo", "region", "search", "form"]);
var NO_CONTENT_NAME = /* @__PURE__ */ new Set([
  "textbox",
  "searchbox",
  "combobox",
  "listbox",
  "slider",
  "spinbutton",
  "dialog",
  "alertdialog",
  "navigation",
  "main",
  "complementary",
  "banner",
  "contentinfo",
  "region",
  "search",
  "form",
  "group",
  "list",
  "table",
  "img",
  "progressbar",
  "meter",
  "tree",
  "grid",
  "tablist",
  "menu",
  "menubar",
  "toolbar",
  "radiogroup"
]);
var BLOCK_TAGS = /* @__PURE__ */ new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tr",
  "ul",
  "caption",
  "legend",
  "option"
]);
var INLINE_FORMAT = /* @__PURE__ */ new Set(["b", "i", "em", "strong", "u", "s", "small", "sub", "sup", "mark", "abbr", "code", "kbd", "q", "cite", "dfn", "var", "time", "bdi", "bdo", "wbr", "del", "ins"]);
var TEXT_INPUT_TYPES = /* @__PURE__ */ new Set(["", "text", "search", "email", "tel", "url", "password", "number"]);
var NO_VALUE_INPUT_TYPES = /* @__PURE__ */ new Set(["checkbox", "radio", "button", "submit", "reset", "image", "file", "hidden"]);
function collapse(s) {
  return s.replace(/\s+/g, " ").trim();
}
function clip(s, max) {
  if (s.length <= max) return s;
  let end = max;
  const c = s.charCodeAt(end - 1);
  if (c >= 55296 && c <= 56319) end--;
  return s.slice(0, end);
}
var privateSeen = /* @__PURE__ */ new WeakSet();
var fieldSeen = /* @__PURE__ */ new WeakSet();
function markPrivate(el, field = false) {
  privateSeen.add(el);
  if (field) fieldSeen.add(el);
}
function privateFieldNow(el) {
  if (el.localName === "input" && (el.type || "").toLowerCase() === "password") return true;
  const ac = el.getAttribute("autocomplete");
  if (ac) {
    for (const t of ac.toLowerCase().split(/\s+/)) if (PRIVATE_AUTOCOMPLETE.has(t)) return true;
  }
  return false;
}
var gone = [];
var MAX_GONE = 32;
var SWAP_MS = 1e3;
var TEXT_ENTRY_SELECTOR = "input,textarea,[contenteditable]";
function matchesGone(el) {
  const id = el.getAttribute("id") || "";
  const name2 = el.getAttribute("name") || "";
  const rid = el.getAttribute("data-reins-id") || "";
  return gone.some((g) => g.id !== "" && g.id === id || g.name !== "" && g.name === name2 || g.rid !== "" && g.rid === rid);
}
function withTextEntries(node) {
  const out = [node];
  try {
    out.push(...Array.from(node.querySelectorAll(TEXT_ENTRY_SELECTOR)));
  } catch {
  }
  return out.filter((e) => isTextEntry(e));
}
function notePrivateRemoved(node, parent) {
  if (node.nodeType !== 1) return;
  const parentPrivate = parent !== null && isPrivate(parent);
  for (const e of withTextEntries(node)) {
    if (!(parentPrivate || privateSeen.has(e) || isPrivate(e))) continue;
    gone.push({
      id: e.getAttribute("id") || "",
      name: e.getAttribute("name") || "",
      rid: e.getAttribute("data-reins-id") || "",
      parent: e === node ? parent : e.parentElement,
      at: Date.now()
    });
    if (gone.length > MAX_GONE) gone.shift();
  }
}
function notePrivateAdded(node, parent) {
  if (node.nodeType !== 1) return;
  if (gone.length) {
    const now4 = Date.now();
    const swapped = parent !== null && gone.some((g) => g.parent === parent && now4 - g.at <= SWAP_MS);
    for (const e of withTextEntries(node)) if (swapped || matchesGone(e)) markSwapped(e);
  }
  notePrivate(node);
}
function isPrivateField(el) {
  if (privateSeen.has(el)) return true;
  if (privateFieldNow(el)) {
    privateSeen.add(el);
    fieldSeen.add(el);
    return true;
  }
  if (gone.length && isTextEntry(el) && matchesGone(el)) {
    markSwapped(el);
    return true;
  }
  return false;
}
function privateAsFieldOnly(el) {
  if (!fieldSeen.has(el) && !privateFieldNow(el)) return false;
  if (el.getAttribute("data-reins") === "private") return false;
  for (let e = el.parentElement; e; e = e.parentElement) {
    if (e.getAttribute("data-reins") === "private" || privateSeen.has(e) && !fieldSeen.has(e)) return false;
  }
  return true;
}
function markSwapped(el) {
  markPrivate(el, true);
}
function isPrivateSelf(el) {
  if (isPrivateField(el)) return true;
  if (el.getAttribute("data-reins") === "private") {
    privateSeen.add(el);
    return true;
  }
  return false;
}
function isPrivate(el, stop2) {
  if (isPrivateField(el)) return true;
  for (let e = el; e; e = e.parentElement) {
    if (isPrivateSelf(e)) {
      privateSeen.add(el);
      return true;
    }
    if (e === stop2) break;
  }
  return false;
}
function notePrivate(root) {
  if (!root || root.nodeType !== 1) return;
  isPrivateSelf(root);
  try {
    for (const e of Array.from(root.querySelectorAll('input,[autocomplete],[data-reins="private"]'))) isPrivateSelf(e);
  } catch {
  }
}
function wasPrivateAttr(el, attr, old) {
  if (old === null) return false;
  const v = old.toLowerCase();
  if (attr === "type") return el.localName === "input" && v.trim() === "password";
  if (attr === "autocomplete") return v.split(/\s+/).some((t) => PRIVATE_AUTOCOMPLETE.has(t));
  if (attr === "data-reins") return v === "private";
  return false;
}
function isAnnotated(el) {
  return el.hasAttribute("data-reins-id") || el.getAttribute("data-reins") === "expose";
}
function roleOf(el) {
  const explicit = (el.getAttribute("role") || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (explicit && /^[a-z]{1,32}$/.test(explicit) && explicit !== "none" && explicit !== "presentation") return explicit;
  const tag = el.localName;
  switch (tag) {
    case "a":
    case "area":
      return el.hasAttribute("href") ? "link" : "generic";
    case "button":
    case "summary":
      return "button";
    case "input": {
      const type = (el.type || "text").toLowerCase();
      if (type === "button" || type === "submit" || type === "reset" || type === "image") return "button";
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "range") return "slider";
      if (type === "number") return "spinbutton";
      if (type === "search") return el.hasAttribute("list") ? "combobox" : "searchbox";
      if (el.hasAttribute("list")) return "combobox";
      return "textbox";
    }
    case "select": {
      const s = el;
      return s.multiple || (s.size || 0) > 1 ? "listbox" : "combobox";
    }
    case "textarea":
      return "textbox";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "heading";
    case "img":
      return "img";
    case "dialog":
      return "dialog";
    case "nav":
      return "navigation";
    case "main":
      return "main";
    case "aside":
      return "complementary";
    case "header":
      return "banner";
    case "footer":
      return "contentinfo";
    case "section":
      return "region";
    case "search":
      return "search";
    case "form":
      return "form";
    case "output":
      return "status";
    case "option":
      return "option";
    case "progress":
      return "progressbar";
    case "meter":
      return "meter";
    case "ul":
    case "ol":
    case "menu":
      return "list";
    case "li":
      return "listitem";
    case "table":
      return "table";
    case "tr":
      return "row";
    case "td":
      return "cell";
    case "th":
      return "columnheader";
    case "fieldset":
    case "details":
      return "group";
    case "p":
      return "paragraph";
    case "article":
      return "article";
    case "label":
      return "label";
    case "hr":
      return "separator";
    case "figure":
      return "figure";
  }
  if (isEditable(el)) return "textbox";
  return "generic";
}
function isEditable(el) {
  const ce = el.getAttribute("contenteditable");
  return ce !== null && (ce === "" || ce.toLowerCase() === "true" || ce.toLowerCase() === "plaintext-only");
}
function isDisabled(el) {
  if (el.disabled === true) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  const tag = el.localName;
  if (tag === "button" || tag === "input" || tag === "select" || tag === "textarea") {
    for (let e = el.parentElement; e; e = e.parentElement) {
      if (e.localName === "fieldset" && e.disabled) {
        const legend = Array.from(e.children).find((c) => c.localName === "legend");
        if (!legend || !legend.contains(el)) return true;
      }
    }
  }
  return false;
}
function isTextEntry(el) {
  if (el.localName === "textarea") return true;
  if (el.localName === "input") return TEXT_INPUT_TYPES.has((el.type || "").toLowerCase());
  return isEditable(el);
}
var UiTree = class {
  #o;
  #handles = /* @__PURE__ */ new WeakMap();
  #byHandle = /* @__PURE__ */ new Map();
  #counter = 0;
  #rev = 0;
  #lastKey = "[]";
  /** Whether the last `text()` call stopped at its limit with content left over. */
  #cut = false;
  constructor(o) {
    this.#o = o;
  }
  get rev() {
    return this.#rev;
  }
  // ───────── exposure ─────────
  #win(el) {
    return el.ownerDocument.defaultView;
  }
  #skip(el) {
    const tag = el.localName;
    if (SKIP_TAGS.has(tag)) return "subtree";
    if (this.#o.isOverlay(el)) return "subtree";
    if (el.getAttribute("data-reins") === "ignore") return "subtree";
    if (el.hasAttribute("hidden") || el.hasAttribute("inert") || el.getAttribute("aria-hidden") === "true") return "subtree";
    if (tag === "input" && (el.type || "").toLowerCase() === "hidden") return "subtree";
    const parent = el.parentElement;
    if (parent && parent.localName === "details" && !parent.open && tag !== "summary") return "subtree";
    if (tag === "dialog" && !el.open) return "subtree";
    const win = this.#win(el);
    if (win && typeof win.getComputedStyle === "function") {
      let cs = null;
      try {
        cs = win.getComputedStyle(el);
      } catch {
        cs = null;
      }
      if (cs) {
        if (cs.display === "none") return "subtree";
        if (cs.visibility === "hidden" || cs.visibility === "collapse") return "self";
      }
    }
    return false;
  }
  #candidate(el) {
    const mode = this.#o.exposure;
    if (mode === "none") return false;
    if (isAnnotated(el)) return true;
    if (mode !== "auto") return false;
    const tag = el.localName;
    if (tag === "a" && el.hasAttribute("href")) return true;
    if (tag === "button" || tag === "select" || tag === "textarea" || tag === "summary") return true;
    if (tag === "input") return true;
    if (el.hasAttribute("tabindex")) return true;
    if (isEditable(el)) return true;
    const role2 = roleOf(el);
    if (INTERACTIVE_ROLES.has(role2)) return true;
    if (role2 === "heading" || role2 === "dialog" || role2 === "alertdialog" || role2 === "status" || role2 === "alert") return true;
    const live = el.getAttribute("aria-live");
    if (live === "polite" || live === "assertive") return true;
    if (role2 === "img") return tag === "img" ? (el.getAttribute("alt") || "").trim() !== "" : this.#explicitName(el) !== "";
    if (LANDMARK_ROLES.has(role2)) return this.#explicitName(el) !== "";
    return false;
  }
  /** Name from attributes only (no content), used to decide whether a landmark is named. */
  #explicitName(el) {
    return collapse(el.getAttribute("data-reins-label") || el.getAttribute("aria-label") || this.#labelledBy(el) || el.getAttribute("title") || "");
  }
  /** Is `el` connected, inside the root, not hidden or ignored, and exposed under the current mode. */
  exposedNow(el) {
    const root = this.#o.root();
    if (!root || !el.isConnected) return false;
    if (el !== root && !root.contains(el)) return false;
    let first = true;
    for (let e = el; e; e = e.parentElement) {
      const s = this.#skip(e);
      if (s === "subtree" || s === "self" && first) return false;
      first = false;
    }
    return this.#candidate(el);
  }
  // ───────── handles ─────────
  #handle(el) {
    let h = this.#handles.get(el);
    if (h === void 0) {
      h = `e${(++this.#counter).toString(36)}`;
      this.#handles.set(el, h);
    }
    this.#byHandle.set(h, el);
    return h;
  }
  /** Handle already assigned to `el`, if any. */
  handleOf(el) {
    return this.#handles.get(el);
  }
  /**
   * Resolve `e12` or `#semantic.id` to a live, exposed element, else `E_NO_TARGET`.
   * Never builds a selector from the target string.
   */
  resolve(target) {
    if (typeof target !== "string" || target.length === 0 || target.length > 130) throw new ReinsError("E_NO_TARGET", "unknown target");
    let el;
    if (/^e[0-9a-z]{1,12}$/.test(target)) {
      el = this.#byHandle.get(target);
      if (el && !el.isConnected) el = void 0;
    } else if (target.startsWith("#") && target.length > 1) {
      const id = target.slice(1);
      const root = this.#o.root();
      if (root) {
        const all = [root, ...Array.from(root.querySelectorAll("[data-reins-id]"))];
        el = all.find((e) => e.getAttribute("data-reins-id") === id && this.exposedNow(e));
        if (el) this.#handle(el);
      }
    }
    if (!el || !this.exposedNow(el)) throw new ReinsError("E_NO_TARGET", "target not found or not exposed");
    return el;
  }
  // ───────── nodes ─────────
  /**
   * May the text of `ref`, an element another node points at (a label, an `aria-labelledby`
   * reference), name that node? Only when it is inside the root, connected, and neither it
   * nor an ancestor is private, ignored, hidden, inert or the overlay.
   */
  #nameSource(ref) {
    const root = this.#o.root();
    if (!root || !ref.isConnected) return false;
    if (ref !== root && !root.contains(ref)) return false;
    if (isPrivate(ref)) return false;
    let first = true;
    for (let e = ref; e; e = e.parentElement) {
      const s = this.#skip(e);
      if (s === "subtree" || s === "self" && first) return false;
      first = false;
    }
    return true;
  }
  #labelledBy(el) {
    const ids = (el.getAttribute("aria-labelledby") || "").trim();
    if (!ids) return "";
    const doc = el.ownerDocument;
    const parts = [];
    for (const id of ids.split(/\s+/).slice(0, 8)) {
      const ref = doc.getElementById(id);
      if (ref && this.#nameSource(ref)) parts.push(this.text(ref, MAX_NAME_CHARS, true));
    }
    return collapse(parts.join(" "));
  }
  #labelText(el) {
    const tag = el.localName;
    if (tag !== "input" && tag !== "select" && tag !== "textarea" && tag !== "button" && tag !== "meter" && tag !== "output" && tag !== "progress") return "";
    let labels = [];
    const native = el.labels;
    if (native && typeof native.length === "number") labels = Array.from(native);
    else {
      const wrap = el.closest("label");
      if (wrap) labels.push(wrap);
      const id = el.getAttribute("id");
      if (id) {
        for (const l of Array.from(el.ownerDocument.getElementsByTagName("label"))) if (l.htmlFor === id && l !== wrap) labels.push(l);
      }
    }
    return collapse(labels.filter((l) => this.#nameSource(l)).map((l) => this.text(l, MAX_NAME_CHARS, true)).join(" "));
  }
  /**
   * Accessible name. `priv` is false for a public node, 'field' for a node private only as
   * a field (named by its attributes and public labels, never by its content), and
   * 'subtree' for any other private node, which only `data-reins-label` names.
   */
  name(el, role2, priv) {
    const attr = (a) => collapse(el.getAttribute(a) || "");
    if (priv === "subtree") return clip(attr("data-reins-label"), MAX_NAME_CHARS);
    let s = attr("data-reins-label") || attr("aria-label") || this.#labelledBy(el) || this.#labelText(el) || attr("placeholder");
    if (!s && !priv) s = attr("alt");
    if (!s) s = attr("title");
    if (!s && !priv && el.localName === "input") {
      const type = (el.type || "").toLowerCase();
      if (type === "button" || type === "submit" || type === "reset") s = collapse(el.value || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : ""));
    }
    if (!s && !priv && !NO_CONTENT_NAME.has(role2) && !isEditable(el)) s = collapse(this.text(el, MAX_NAME_CHARS + 1, true));
    return clip(s, MAX_NAME_CHARS);
  }
  value(el, role2) {
    const tag = el.localName;
    let v;
    if (tag === "input") {
      const type = (el.type || "").toLowerCase();
      if (!NO_VALUE_INPUT_TYPES.has(type)) v = el.value;
    } else if (tag === "textarea") v = el.value;
    else if (tag === "select") {
      const opts = Array.from(el.options || []).filter((o) => o.selected);
      v = opts.map((o) => collapse(o.label || o.text || o.value)).join(", ");
    } else if (isEditable(el)) v = collapse(this.text(el, MAX_VALUE_CHARS + 1, false));
    else if (role2 === "slider" || role2 === "spinbutton" || role2 === "progressbar" || role2 === "meter") {
      v = el.getAttribute("aria-valuetext") || el.getAttribute("aria-valuenow") || void 0;
    }
    if (v === void 0 || v === "") return void 0;
    return clip(v, MAX_VALUE_CHARS);
  }
  states(el, priv) {
    const st = [];
    const aria = (a) => el.getAttribute(a);
    const tag = el.localName;
    if (priv) {
      if (isDisabled(el)) st.push("disabled");
      if (el.ownerDocument.activeElement === el) st.push("focused");
      st.push("private");
      return st;
    }
    if (isDisabled(el)) st.push("disabled");
    if (tag === "input" && el.checked || aria("aria-checked") === "true" || aria("aria-pressed") === "true") st.push("checked");
    if (tag === "option" && el.selected || aria("aria-selected") === "true" || aria("aria-current") !== null && aria("aria-current") !== "false") st.push("selected");
    if (aria("aria-expanded") === "true" || tag === "details" && el.open || tag === "summary" && el.parentElement?.localName === "details" && el.parentElement.open) st.push("expanded");
    if (el.ownerDocument.activeElement === el) st.push("focused");
    if (el.required === true || aria("aria-required") === "true") st.push("required");
    if (aria("aria-invalid") === "true") st.push("invalid");
    if (isTextEntry(el) && el.readOnly === true || aria("aria-readonly") === "true") st.push("readonly");
    return st;
  }
  #node(el, parent, priv, boxes) {
    const role2 = roleOf(el);
    const n = { h: this.#handle(el), role: role2 };
    const id = el.getAttribute("data-reins-id");
    if (id) n.id = clip(id, MAX_ID_CHARS2);
    const name2 = this.name(el, role2, !priv ? false : privateAsFieldOnly(el) ? "field" : "subtree");
    if (name2) n.name = name2;
    if (!priv) {
      const v = this.value(el, role2);
      if (v !== void 0) n.val = v;
    }
    const st = this.states(el, priv);
    if (st.length) n.st = st;
    if (parent !== void 0) n.p = parent;
    if (boxes) {
      try {
        const r = el.getBoundingClientRect();
        n.box = [Math.round(r.x || r.left || 0), Math.round(r.y || r.top || 0), Math.round(r.width || 0), Math.round(r.height || 0)];
      } catch {
        n.box = [0, 0, 0, 0];
      }
    }
    return n;
  }
  /** Build the exposed tree in document order, bounded in count and size. */
  build(boxes = false) {
    const root = this.#o.root();
    const out = [];
    if (!root || !root.isConnected || this.#o.exposure === "none") return out;
    for (const [h, el] of this.#byHandle) if (!el.isConnected) this.#byHandle.delete(h);
    for (let e = root.parentElement; e; e = e.parentElement) if (this.#skip(e) === "subtree") return out;
    const startPriv = isPrivate(root);
    let bytes = 2;
    const visit = (el, parent, priv, depth) => {
      if (out.length >= MAX_NODES || bytes > MAX_TREE_BYTES || depth > MAX_DEPTH2) return;
      const skip = this.#skip(el);
      if (skip === "subtree") return;
      const p = isPrivateSelf(el) || priv;
      if (p) markPrivate(el);
      let h = parent;
      if (skip !== "self" && this.#candidate(el)) {
        const node = this.#node(el, parent, p, boxes);
        bytes += JSON.stringify(node).length + 1;
        if (bytes > MAX_TREE_BYTES) return;
        out.push(node);
        h = node.h;
      }
      if (el.localName === "select") return;
      for (const c of Array.from(el.children)) visit(c, h, p, depth + 1);
    };
    visit(root, void 0, startPriv, 0);
    return out;
  }
  /** Build, and bump the revision when the tree (ignoring boxes) changed. */
  snapshot(boxes = false) {
    const nodes = this.build(boxes);
    const key = JSON.stringify(boxes ? nodes.map(({ box: _box, ...rest }) => rest) : nodes);
    if (key !== this.#lastKey) {
      this.#lastKey = key;
      this.#rev++;
    }
    return { rev: this.#rev, nodes };
  }
  // ───────── text ─────────
  /**
   * Visible text of `el`, leaving out private, ignored and hidden subtrees, the overlay,
   * and form-control contents. `flat` collapses everything to one line (names); otherwise
   * block elements start new lines (read). Stops once `limit` characters are collected.
   */
  text(el, limit, flat) {
    let out = "";
    let cut = false;
    const push = (s) => {
      if (out.length < limit) out += s;
      else if (s.trim()) cut = true;
    };
    const sep = (s) => {
      if (!out.length || out.length >= limit) return;
      if (s === "\n") {
        out = out.replace(/[ \t]+$/, "");
        if (!out.endsWith("\n")) out += "\n";
      } else if (!/\s$/.test(out)) out += " ";
    };
    const walk = (node, depth) => {
      if (depth > MAX_DEPTH2) return;
      if (out.length >= limit) {
        if ((node.textContent || "").trim()) cut = true;
        return;
      }
      if (node.nodeType === 3) {
        push((node.nodeValue || "").replace(/\s+/g, " "));
        return;
      }
      if (node.nodeType !== 1) return;
      const e = node;
      const skip = this.#skip(e);
      if (depth > 0) {
        if (skip === "subtree") return;
        if (isPrivateSelf(e)) return;
      }
      const selfHidden = skip === "self";
      const tag = e.localName;
      if (tag === "textarea" || tag === "select" || tag === "input") return;
      if (tag === "br") {
        sep(flat ? " " : "\n");
        return;
      }
      const block = BLOCK_TAGS.has(tag);
      const boundary = block ? flat ? " " : "\n" : INLINE_FORMAT.has(tag) ? "" : " ";
      if (depth > 0 && boundary) sep(boundary);
      if (tag === "img" && depth > 0 && !selfHidden) {
        const alt = collapse(e.getAttribute("alt") || "");
        if (alt) push(alt);
      }
      for (const c of Array.from(e.childNodes)) {
        if (selfHidden && c.nodeType !== 1) continue;
        walk(c, depth + 1);
      }
      if (depth > 0 && boundary) sep(boundary);
    };
    walk(el, 0);
    this.#cut = cut;
    if (flat) return collapse(out);
    return out.split("\n").map((l) => collapse(l)).filter((l, i, a) => l !== "" || i > 0 && a[i - 1] !== "").join("\n").trim();
  }
  /**
   * Text for `read`. With `el`, that element's text (it must already be resolved). Without,
   * the root's text, or under `annotated` exposure the text of the outermost annotated regions.
   */
  readText(el, max) {
    const mode = this.#o.exposure;
    const root = this.#o.root();
    let text = "";
    let cut = false;
    const one = (e, limit) => {
      const t = this.text(e, limit, false);
      if (this.#cut) cut = true;
      return t;
    };
    if (mode === "none" || !root) text = "";
    else if (el) text = isPrivate(el) ? "" : one(el, max + 1);
    else if (mode === "auto") text = isPrivate(root) ? "" : one(root, max + 1);
    else {
      const parts = [];
      let total = 0;
      const visit = (e, depth) => {
        if (depth > MAX_DEPTH2) return;
        const skip = this.#skip(e);
        if (skip === "subtree" || isPrivateSelf(e)) return;
        if (skip !== "self" && isAnnotated(e)) {
          if (total > max) {
            cut = true;
            return;
          }
          const t = one(e, max + 1 - total);
          if (t) {
            parts.push(t);
            total += t.length + 1;
          }
          return;
        }
        for (const c of Array.from(e.children)) visit(c, depth + 1);
      };
      if (!isPrivate(root)) visit(root, 0);
      text = parts.join("\n");
    }
    const truncated = cut || text.length > max;
    return { text: truncated ? clip(text, max) : text, truncated };
  }
};

// packages/driver/src/input.ts
function winOf(el) {
  const w = el.ownerDocument.defaultView;
  if (!w) throw new ReinsError("E_NO_TARGET", "target is not in a window");
  return w;
}
function centerOf(el) {
  try {
    const r = el.getBoundingClientRect();
    return { x: Math.round((r.left || 0) + (r.width || 0) / 2), y: Math.round((r.top || 0) + (r.height || 0) / 2) };
  } catch {
    return { x: 0, y: 0 };
  }
}
function mouse(el, type, pt, buttons) {
  const w = winOf(el);
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: pt.x,
    clientY: pt.y,
    button: 0,
    buttons,
    detail: type === "click" || type.endsWith("down") || type.endsWith("up") ? 1 : 0
  };
  let ev;
  if (type.startsWith("pointer")) {
    if (typeof w.PointerEvent !== "function") return true;
    ev = new w.PointerEvent(type, { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true });
  } else ev = new w.MouseEvent(type, init);
  return el.dispatchEvent(ev);
}
function focusable(el) {
  return typeof el.focus === "function";
}
function focus(el) {
  if (focusable(el)) {
    try {
      el.focus({ preventScroll: true });
    } catch {
    }
  }
}
function scrollIntoView(el) {
  try {
    el.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  } catch {
  }
}
function click(el, pt) {
  mouse(el, "pointerover", pt, 0);
  mouse(el, "mouseover", pt, 0);
  const down = mouse(el, "pointerdown", pt, 1);
  const mdown = down ? mouse(el, "mousedown", pt, 1) : false;
  if (mdown) focus(el);
  mouse(el, "pointerup", pt, 0);
  if (down) mouse(el, "mouseup", pt, 0);
  mouse(el, "click", pt, 0);
}
function valueSetter(el) {
  const w = winOf(el);
  const proto = el.localName === "textarea" ? w.HTMLTextAreaElement?.prototype : el.localName === "select" ? w.HTMLSelectElement?.prototype : w.HTMLInputElement?.prototype;
  const desc = proto ? Object.getOwnPropertyDescriptor(proto, "value") : void 0;
  if (desc?.set) {
    const set = desc.set;
    return (v) => set.call(el, v);
  }
  return null;
}
function setValue(el, v, data) {
  const set = valueSetter(el);
  if (set) set(v);
  else el.value = v;
  fireInput(el, data);
  fire(el, "change");
}
function fire(el, type) {
  el.dispatchEvent(new (winOf(el)).Event(type, { bubbles: true, cancelable: false, composed: type === "input" }));
}
function fireInput(el, data, inputType = "insertText") {
  const w = winOf(el);
  let ev;
  try {
    ev = typeof w.InputEvent === "function" ? new w.InputEvent("input", { bubbles: true, composed: true, inputType, data }) : new w.Event("input", { bubbles: true, composed: true });
  } catch {
    ev = new w.Event("input", { bubbles: true, composed: true });
  }
  el.dispatchEvent(ev);
}
function typeText(el, text, clear) {
  focus(el);
  if (el.localName === "input" || el.localName === "textarea") {
    const f = el;
    let next = clear ? text : f.value + text;
    const max = f.maxLength;
    if (typeof max === "number" && max >= 0 && next.length > max) next = next.slice(0, max);
    setValue(f, next, text);
    return;
  }
  if (isEditable(el)) {
    if (clear) el.textContent = text;
    else el.append(el.ownerDocument.createTextNode(text));
    fireInput(el, text);
    return;
  }
  throw new ReinsError("E_BAD_ARGS", "target does not take text");
}
var KEY_CODES = {
  Enter: { key: "Enter", code: "Enter", keyCode: 13 },
  Escape: { key: "Escape", code: "Escape", keyCode: 27 },
  Tab: { key: "Tab", code: "Tab", keyCode: 9 },
  Backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
  Delete: { key: "Delete", code: "Delete", keyCode: 46 },
  Space: { key: " ", code: "Space", keyCode: 32 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  PageUp: { key: "PageUp", code: "PageUp", keyCode: 33 },
  PageDown: { key: "PageDown", code: "PageDown", keyCode: 34 },
  Home: { key: "Home", code: "Home", keyCode: 36 },
  End: { key: "End", code: "End", keyCode: 35 }
};
function keyEvent(el, type, k) {
  const w = winOf(el);
  const c = KEY_CODES[k];
  const ev = new w.KeyboardEvent(type, { key: c.key, code: c.code, bubbles: true, cancelable: true, composed: true });
  for (const f of ["keyCode", "which"]) {
    try {
      Object.defineProperty(ev, f, { get: () => c.keyCode });
    } catch {
    }
  }
  return el.dispatchEvent(ev);
}
function submitForm(el) {
  const form = el.form ?? el.closest("form");
  if (!form) return;
  if (typeof form.requestSubmit === "function") {
    try {
      form.requestSubmit();
      return;
    } catch {
    }
  }
  const ev = new (winOf(el)).Event("submit", { bubbles: true, cancelable: true });
  if (form.dispatchEvent(ev)) {
    try {
      form.submit();
    } catch {
    }
  }
}
function tabbables(scope, ok) {
  const all = Array.from(scope.querySelectorAll("a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]"));
  const list2 = all.filter((e) => ok(e) && !e.disabled && (e.getAttribute("tabindex") ?? "0") !== "-1");
  const positive2 = list2.filter((e) => e.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex);
  return [...positive2, ...list2.filter((e) => !(e.tabIndex > 0))];
}
function pressKey(el, k, scope, exposed) {
  const go = keyEvent(el, "keydown", k);
  if (k === "Enter" || k === "Space") keyEvent(el, "keypress", k);
  keyEvent(el, "keyup", k);
  if (!go) return;
  const tag = el.localName;
  const type = tag === "input" ? (el.type || "text").toLowerCase() : "";
  const textField = tag === "input" && !["checkbox", "radio", "button", "submit", "reset", "image", "range", "color", "file"].includes(type) || tag === "textarea";
  switch (k) {
    case "Enter":
      if (tag === "button" || tag === "a" || tag === "summary" || tag === "input" && ["button", "submit", "reset", "image"].includes(type)) click(el, centerOf(el));
      else if (tag === "input" && textField) submitForm(el);
      return;
    case "Space":
      if (tag === "button" || tag === "summary" || tag === "input" && ["checkbox", "radio", "button", "submit", "reset"].includes(type)) click(el, centerOf(el));
      else if (textField) typeText(el, " ", false);
      return;
    case "Backspace":
    case "Delete":
      if (textField) {
        const f = el;
        let start = f.value.length;
        let end = start;
        try {
          if (typeof f.selectionStart === "number" && typeof f.selectionEnd === "number") {
            start = f.selectionStart;
            end = f.selectionEnd;
          }
        } catch {
        }
        if (start === end) {
          if (k === "Backspace") start = Math.max(0, start - 1);
          else end = Math.min(f.value.length, end + 1);
        }
        const set = valueSetter(el);
        const next = f.value.slice(0, start) + f.value.slice(end);
        if (set) set(next);
        else f.value = next;
        fireInput(el, null, k === "Backspace" ? "deleteContentBackward" : "deleteContentForward");
      }
      return;
    case "Tab": {
      const list2 = tabbables(scope, exposed);
      if (!list2.length) return;
      const i = list2.indexOf(el);
      focus(list2[(i + 1) % list2.length]);
      return;
    }
    case "ArrowUp":
    case "ArrowDown":
      if (tag === "select") {
        const s = el;
        const step = k === "ArrowDown" ? 1 : -1;
        let i = s.selectedIndex + step;
        while (i >= 0 && i < s.options.length && s.options[i].disabled) i += step;
        if (i >= 0 && i < s.options.length && i !== s.selectedIndex) {
          s.selectedIndex = i;
          fireInput(s, null);
          fire(s, "change");
        }
        return;
      }
      if (!textField) scrollBy(el, 0, k === "ArrowDown" ? 40 : -40);
      return;
    case "PageUp":
    case "PageDown":
      if (!textField) scrollBy(el, 0, (k === "PageDown" ? 1 : -1) * Math.max(100, (winOf(el).innerHeight || 600) * 0.85));
      return;
    case "Home":
    case "End":
      if (!textField) scrollTo(el, k === "Home" ? "top" : "bottom");
      return;
    default:
      return;
  }
}
function selectOption(el, value) {
  if (el.localName !== "select") throw new ReinsError("E_BAD_ARGS", "target is not a select");
  const s = el;
  const opts = Array.from(s.options);
  let i = opts.findIndex((o) => o.value === value);
  if (i < 0) i = opts.findIndex((o) => (o.label || o.text || "").replace(/\s+/g, " ").trim() === value.trim());
  if (i < 0) throw new ReinsError("E_BAD_ARGS", "no such option");
  if (opts[i].disabled) throw new ReinsError("E_BAD_ARGS", "option is disabled");
  focus(s);
  if (s.multiple) opts[i].selected = true;
  else s.selectedIndex = i;
  fireInput(s, null);
  fire(s, "change");
}
function scrollable(el) {
  const w = winOf(el);
  if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return false;
  try {
    const cs = w.getComputedStyle(el);
    return /(auto|scroll|overlay)/.test(`${cs.overflowY} ${cs.overflowX} ${cs.overflow}`);
  } catch {
    return false;
  }
}
function scroller(el) {
  for (let e = el; e && e !== e.ownerDocument.documentElement && e !== e.ownerDocument.body; e = e.parentElement) if (scrollable(e)) return e;
  return null;
}
function scrollBy(el, dx, dy, win) {
  const s = scroller(el);
  if (s) {
    if (typeof s.scrollBy === "function") s.scrollBy({ left: dx, top: dy });
    else {
      s.scrollLeft += dx;
      s.scrollTop += dy;
    }
    return;
  }
  const w = win ?? (el ? winOf(el) : null);
  try {
    w?.scrollBy({ left: dx, top: dy });
  } catch {
  }
}
function scrollTo(el, to, win) {
  const s = scroller(el);
  if (s) {
    s.scrollTop = to === "top" ? 0 : s.scrollHeight;
    return;
  }
  const w = win ?? (el ? winOf(el) : null);
  if (!w) return;
  try {
    const h = w.document.documentElement?.scrollHeight ?? 0;
    w.scrollTo({ left: w.scrollX ?? 0, top: to === "top" ? 0 : h });
  } catch {
  }
}
var HUMAN_EVENTS = ["pointerdown", "pointerup", "pointermove", "mousedown", "keydown", "wheel", "touchstart", "touchmove"];
var HUMAN_GIVE_UP_MS = 5e3;
var HumanWatch = class {
  #win;
  #yieldMs;
  #onBurst;
  #isOverlay;
  #last = -Infinity;
  #on = false;
  #handler = (e) => this.#event(e);
  constructor(win, yieldMs, onBurst, isOverlay) {
    this.#win = win;
    this.#yieldMs = yieldMs;
    this.#onBurst = onBurst;
    this.#isOverlay = isOverlay;
  }
  start() {
    if (this.#on) return;
    this.#on = true;
    for (const t of HUMAN_EVENTS) listen(this.#win, t, this.#handler, { capture: true, passive: true });
  }
  stop() {
    if (!this.#on) return;
    this.#on = false;
    for (const t of HUMAN_EVENTS) unlisten(this.#win, t, this.#handler, { capture: true });
  }
  #event(e) {
    if (!isTrusted(e)) return;
    if ((e.type === "pointermove" || e.type === "mousemove") && !(e.buttons > 0)) return;
    if (this.#isOverlay(e)) return;
    this.mark();
  }
  /** Record one human input now. */
  mark(t = Date.now()) {
    const quiet = t - this.#last > Math.max(0, this.#yieldMs());
    this.#last = t;
    if (quiet) {
      try {
        this.#onBurst();
      } catch {
      }
    }
  }
  /** No human input for `yieldMs`: the human-priority rule allows synthetic input now. */
  get idle() {
    const yieldMs = this.#yieldMs();
    return !(yieldMs > 0) || Date.now() - this.#last >= yieldMs;
  }
  /** Wait until no human input for `yieldMs`. E_PAUSED if the person keeps going for 5 s. */
  async quiet() {
    const yieldMs = this.#yieldMs();
    if (!(yieldMs > 0)) return;
    const start = Date.now();
    for (; ; ) {
      const wait = this.#last + yieldMs - Date.now();
      if (wait <= 0) return;
      if (Date.now() - start >= HUMAN_GIVE_UP_MS) throw new ReinsError("E_PAUSED", "the user is using the page");
      await new Promise((r) => setTimeout(r, Math.min(wait, HUMAN_GIVE_UP_MS - (Date.now() - start)) + 1));
    }
  }
};

// packages/driver/src/motion.ts
init_src();
var FRAME_BUDGET_MS = 6;
var FRAME_FALLBACK_MS = 50;
var MAX_GLIDE_MS = 3e3;
function now2() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}
function glideMs(distance) {
  const d = Number.isFinite(distance) && distance > 0 ? distance : 0;
  return Math.min(900, Math.max(120, 120 + 110 * Math.log2(1 + d / 40)));
}
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
var Frames = class {
  #win;
  constructor(win) {
    this.#win = win;
  }
  /** True when animation frames can be expected: rAF exists and the page is visible. */
  get live() {
    const doc = this.#win.document;
    return typeof this.#win.requestAnimationFrame === "function" && (!doc || doc.visibilityState === void 0 || doc.visibilityState === "visible");
  }
  /** Resolves at the next animation frame, or after a short timer when frames are not coming. */
  next() {
    return new Promise((resolve) => {
      let done = false;
      let raf;
      const fire2 = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (raf !== void 0) {
          try {
            this.#win.cancelAnimationFrame?.(raf);
          } catch {
          }
        }
        resolve(now2());
      };
      const live = this.live;
      const timer = setTimeout(fire2, live ? FRAME_FALLBACK_MS : 16);
      if (live) {
        try {
          raf = this.#win.requestAnimationFrame(fire2);
        } catch {
          raf = void 0;
        }
      }
    });
  }
};
var CommandQueue = class {
  #frames;
  #jobs = [];
  #running = false;
  #frameStart = -1;
  #closed = false;
  constructor(frames) {
    this.#frames = frames;
  }
  get size() {
    return this.#jobs.length;
  }
  push(run) {
    if (this.#closed) return Promise.reject(new ReinsError("E_GONE", "driver stopped"));
    return new Promise((resolve, reject) => {
      this.#jobs.push({ run, resolve, reject });
      if (!this.#running) void this.#pump();
    });
  }
  async #pump() {
    this.#running = true;
    try {
      while (this.#jobs.length && !this.#closed) {
        if (this.#frameStart < 0 || now2() - this.#frameStart >= FRAME_BUDGET_MS) this.#frameStart = await this.#frames.next();
        const job = this.#jobs.shift();
        if (!job) break;
        try {
          job.resolve(await job.run());
        } catch (e) {
          job.reject(e);
        }
      }
    } finally {
      this.#running = false;
      this.#frameStart = -1;
    }
  }
  /** Fail everything still queued. */
  close() {
    this.#closed = true;
    const jobs = this.#jobs.splice(0);
    for (const j of jobs) j.reject(new ReinsError("E_GONE", "driver stopped"));
  }
  reopen() {
    this.#closed = false;
  }
};
var CursorMotion = class {
  #frames;
  #view;
  #vp;
  x = -100;
  y = -100;
  #placed = false;
  #glide = null;
  #points = [];
  /** Position the current stream segment starts from, and progress into the head point. */
  #segFrom = null;
  #segT = 0;
  #ticking = false;
  #lastTick = 0;
  #stopped = false;
  constructor(frames, view, viewport) {
    this.#frames = frames;
    this.#view = view;
    this.#vp = viewport;
  }
  get placed() {
    return this.#placed;
  }
  /** Milliseconds of stream motion still queued. */
  get queuedMs() {
    let ms = -this.#segT;
    for (const p of this.#points) ms += p.dt;
    return Math.max(0, ms);
  }
  get queuedPoints() {
    return this.#points.length;
  }
  #draw(x, y) {
    this.x = x;
    this.y = y;
    this.#placed = true;
    this.#view.position(x, y);
  }
  /** Put the cursor somewhere without animating (first appearance). */
  jump(p) {
    this.#draw(p.x, p.y);
  }
  /**
   * Glide to `to`. Resolves with the end point when the motion ends, or with the
   * position reached when a newer glide or a stream replaces it.
   */
  moveTo(to, ms) {
    const target = { x: Math.round(to.x), y: Math.round(to.y) };
    this.#endGlide();
    if (!this.#placed) {
      const [w, h] = this.#vp();
      this.#draw(Math.max(0, Math.min(w, target.x - 160)), Math.max(0, Math.min(h, target.y - 110)));
    }
    const from = { x: this.x, y: this.y };
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const d = Math.hypot(dx, dy);
    const dur = Math.min(MAX_GLIDE_MS, Math.max(0, ms ?? glideMs(d)));
    if (d < 0.5 || dur <= 0 || !this.#frames.live || this.#stopped) {
      this.#draw(target.x, target.y);
      return Promise.resolve(target);
    }
    const off = Math.min(80, d * 0.14) * (Math.random() < 0.5 ? -1 : 1);
    const ctrl = { x: from.x + dx / 2 - dy / d * off, y: from.y + dy / 2 + dx / d * off };
    return new Promise((resolve) => {
      this.#glide = { from, ctrl, to: target, t0: now2(), dur, done: resolve };
      this.#points = this.#points.filter((p) => (p.played?.(), false));
      this.#segFrom = null;
      this.#segT = 0;
      this.#run();
    });
  }
  #endGlide() {
    const g = this.#glide;
    if (!g) return;
    this.#glide = null;
    g.done({ x: Math.round(this.x), y: Math.round(this.y) });
  }
  /** Queue stream points (viewport fractions). `gap` bridges a sequence gap with a straight segment. */
  push(points, played, gap) {
    if (this.#stopped) {
      for (let i = 0; i < points.length; i++) played?.();
      return;
    }
    this.#endGlide();
    points.forEach((p, i) => {
      const q = { x: p.x, y: p.y, dt: i === 0 && gap ? Math.max(16, p.dt) : p.dt };
      if (played) q.played = played;
      this.#points.push(q);
    });
    while (this.#points.length > 4096) {
      this.#points.shift()?.played?.();
      this.#segFrom = null;
      this.#segT = 0;
    }
    if (!this.#frames.live) this.finish();
    else this.#run();
  }
  /** Complete everything now: used while hidden and when stopping. */
  finish() {
    const g = this.#glide;
    if (g) {
      this.#draw(g.to.x, g.to.y);
      this.#endGlide();
    }
    if (this.#points.length) {
      const last = this.#points[this.#points.length - 1];
      const [w, h] = this.#vp();
      for (const p of this.#points.splice(0)) p.played?.();
      this.#draw(last.x * w, last.y * h);
      this.#segFrom = null;
      this.#segT = 0;
    }
  }
  /**
   * Stop where it is (Pause, Stop): end the glide at the current position and discard
   * queued stream points, returning their credit, without playing or jumping to them.
   */
  halt() {
    this.#endGlide();
    for (const p of this.#points.splice(0)) p.played?.();
    this.#segFrom = null;
    this.#segT = 0;
  }
  stop() {
    this.#stopped = true;
    this.finish();
  }
  restart() {
    this.#stopped = false;
  }
  #run() {
    if (this.#ticking) return;
    this.#ticking = true;
    this.#lastTick = now2();
    void (async () => {
      try {
        while (!this.#stopped && (this.#glide || this.#points.length)) {
          const t = await this.#frames.next();
          if (!this.#frames.live) {
            this.finish();
            break;
          }
          this.#tick(t);
        }
      } finally {
        this.#ticking = false;
      }
    })();
  }
  #tick(t) {
    const elapsed = Math.max(0, Math.min(250, t - this.#lastTick));
    this.#lastTick = t;
    const g = this.#glide;
    if (g) {
      const k = Math.min(1, (t - g.t0) / g.dur);
      const e = easeInOut(k);
      const u = 1 - e;
      this.#draw(u * u * g.from.x + 2 * u * e * g.ctrl.x + e * e * g.to.x, u * u * g.from.y + 2 * u * e * g.ctrl.y + e * e * g.to.y);
      if (k >= 1) {
        this.#draw(g.to.x, g.to.y);
        this.#endGlide();
      }
      return;
    }
    if (!this.#points.length) return;
    const [w, h] = this.#vp();
    let advance = elapsed * playbackRate(this.queuedMs);
    if (!this.#segFrom) this.#segFrom = { x: this.x, y: this.y };
    while (this.#points.length) {
      const head = this.#points[0];
      const left = head.dt - this.#segT;
      if (advance >= left) {
        advance -= left;
        this.#points.shift();
        this.#segFrom = { x: head.x * w, y: head.y * h };
        this.#segT = 0;
        head.played?.();
        this.#draw(this.#segFrom.x, this.#segFrom.y);
        continue;
      }
      this.#segT += advance;
      const k = head.dt > 0 ? this.#segT / head.dt : 1;
      this.#draw(this.#segFrom.x + (head.x * w - this.#segFrom.x) * k, this.#segFrom.y + (head.y * h - this.#segFrom.y) * k);
      break;
    }
  }
};

// packages/driver/src/overlay.ts
init_src();

// packages/driver/src/style.ts
var LIGHT = {
  fg: "#16161d",
  muted: "#5c5d6e",
  card: "#fff",
  line: "rgba(22,22,40,.12)",
  soft: "#f0f0f5",
  "soft-h": "#e5e5ee",
  accent: "#5b5bf6",
  "accent-h": "#4a49e6",
  ok: "#16a34a",
  warn: "#d97706",
  danger: "#dc2626",
  "danger-h": "#c11f1f",
  shadow: "0 10px 30px rgba(16,16,48,.16),0 2px 6px rgba(16,16,48,.10)"
};
var DARK = {
  ...LIGHT,
  fg: "#f1f1f6",
  muted: "#a3a4b5",
  card: "#1d1d25",
  line: "rgba(255,255,255,.12)",
  soft: "#2b2b36",
  "soft-h": "#363644",
  accent: "#7c7cff",
  "accent-h": "#8f8fff",
  shadow: "0 10px 30px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.35)"
};
var TOKEN = /var\(--r-([a-z-]+)\)/g;
function fail2(what) {
  throw new Error(`overlay stylesheet: ${what}`);
}
function paint(css, theme) {
  return css.replace(TOKEN, (_, name2) => {
    if (!Object.prototype.hasOwnProperty.call(theme, name2)) fail2(`unknown colour --r-${name2}`);
    return theme[name2];
  });
}
function themed(css) {
  for (const m of css.matchAll(TOKEN)) if (DARK[m[1]] !== LIGHT[m[1]]) return true;
  return false;
}
function topLevel(css) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) fail2("unbalanced braces");
      if (depth === 0) {
        out.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  if (depth !== 0 || css.slice(start).trim() !== "") fail2("unbalanced braces, or a rule without a block");
  return out;
}
var SAFE_FAMILIES = /* @__PURE__ */ new Set(["system-ui", "sans-serif", "monospace", "serif"]);
var WIDE = /* @__PURE__ */ new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);
var IMPORTANT = /\s*!important\s*$/;
function families(value) {
  const important = IMPORTANT.test(value) ? "!important" : "";
  const list2 = value.replace(IMPORTANT, "").trim();
  if (WIDE.has(list2)) return `${list2}${important}`;
  const kept = list2.split(",").map((f) => f.trim()).filter((f) => SAFE_FAMILIES.has(f));
  return `${kept.length ? kept.join(",") : "sans-serif"}${important}`;
}
var SHORTHAND = /^(.*?\d*\.?\d+(?:px|em|rem|pt|%)(?:\s*\/\s*[\d.]+(?:px|em|rem|%)?)?)\s+(.+)$/;
function shorthand(value) {
  if (WIDE.has(value.replace(IMPORTANT, "").trim())) return value.trim();
  const m = SHORTHAND.exec(value.trim());
  if (!m) fail2(`cannot read the font in "${value.trim()}"`);
  return `${m[1]} ${families(m[2])}`;
}
var AT_RULES = /^@(media|keyframes)\b/;
var FUNCTIONS = /* @__PURE__ */ new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "calc",
  "min",
  "max",
  "clamp",
  "translate",
  "translateX",
  "translateY",
  "translate3d",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "cubic-bezier",
  "steps",
  "drop-shadow",
  "blur",
  "inset",
  "linear-gradient",
  "radial-gradient",
  "repeat",
  "minmax",
  "fit-content",
  "not",
  "is",
  "where",
  "nth-child",
  "nth-last-child",
  "nth-of-type"
]);
var SYSTEM_COLOURS = /* @__PURE__ */ new Set([
  "accentcolor",
  "accentcolortext",
  "activetext",
  "buttonborder",
  "buttonface",
  "buttontext",
  "canvas",
  "canvastext",
  "field",
  "fieldtext",
  "graytext",
  "highlight",
  "highlighttext",
  "linktext",
  "mark",
  "marktext",
  "selecteditem",
  "selecteditemtext",
  "visitedtext",
  // The deprecated names, which browsers still resolve.
  "activeborder",
  "activecaption",
  "appworkspace",
  "background",
  "buttonhighlight",
  "buttonshadow",
  "captiontext",
  "inactiveborder",
  "inactivecaption",
  "inactivecaptiontext",
  "infobackground",
  "infotext",
  "menu",
  "menutext",
  "scrollbar",
  "threeddarkshadow",
  "threedface",
  "threedhighlight",
  "threedlightshadow",
  "threedshadow",
  "window",
  "windowframe",
  "windowtext"
]);
var SELECTOR_READS_PAGE = /:host-context|:host\(|::part|::slotted|:root\b/;
var PROPERTY = /^-?[a-z][a-z0-9-]*$/;
function unquoted(text) {
  let out = "";
  let quote = "";
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = "";
      else if (ch === "\n") fail2("a string that runs over a line");
    } else if (ch === '"' || ch === "'") quote = ch;
    else out += ch;
  }
  if (quote) fail2("a string that is not closed");
  return out;
}
function checkFunctions(text, where) {
  for (const m of text.matchAll(/([A-Za-z_-][A-Za-z0-9_-]*)\(/g)) {
    const name2 = m[1];
    if (name2 === "var") {
      if (!/^var\(--r-[a-z-]+\)/.test(text.slice(m.index))) fail2(`var() that is not a theme colour, in ${where}`);
      continue;
    }
    if (!FUNCTIONS.has(name2)) fail2(`${name2}() is not let through, in ${where}`);
  }
}
function declarations(block, hostRule) {
  const out = [];
  for (const raw of block.split(";")) {
    const decl = raw.trim();
    if (decl === "") continue;
    const colon = decl.indexOf(":");
    if (colon < 0) fail2(`not a declaration: "${decl}"`);
    const prop = decl.slice(0, colon).trim();
    let value = decl.slice(colon + 1).trim();
    if (!PROPERTY.test(prop)) fail2(`a property name that is not plain lower case: "${prop}"`);
    if (prop.startsWith("--")) fail2("a custom property is declared");
    const bare2 = unquoted(value);
    checkFunctions(bare2, `"${prop}"`);
    const words = bare2.toLowerCase().match(/[a-z-]+/g) ?? [];
    const namesProperties = prop === "transition" || prop === "transition-property" || prop === "will-change";
    if (!namesProperties) {
      for (const w of words) if (SYSTEM_COLOURS.has(w)) fail2(`a system colour (${w}) in "${prop}"`);
    }
    if (hostRule && words.some((w) => w === "inherit" || w === "unset" || w === "revert" || w === "revert-layer")) fail2(`"${prop}" takes its value from the page in a :host rule`);
    if (prop === "font-family") value = families(value);
    else if (prop === "font") value = shorthand(value);
    else if (prop === "src") fail2("a font or image source");
    out.push(`${prop}:${value}`);
  }
  return out.join(";");
}
function rule(text) {
  const open = text.indexOf("{");
  const head = text.slice(0, open).trim();
  const body = text.slice(open + 1, text.lastIndexOf("}"));
  if (head.startsWith("@")) {
    if (!AT_RULES.test(head)) fail2(`${head.split(/[\s{(]/)[0]} is not let through`);
    checkFunctions(unquoted(head), head);
    return `${head}{${topLevel(body).map(rule).join("")}}`;
  }
  const selector = unquoted(head);
  if (SELECTOR_READS_PAGE.test(selector)) fail2(`a selector that reads the page: "${head}"`);
  checkFunctions(selector, `"${head}"`);
  if (body.includes("{")) fail2(`a block inside the rule "${head}"`);
  return `${head}{${declarations(body, /:host\b/.test(selector))}}`;
}
function sealCss(source) {
  if (source.includes("\\")) fail2("an escape");
  if (source.includes("/*") || source.includes("*/")) fail2("a comment");
  if (/<!--|-->/.test(source)) fail2("a comment");
  let out = "";
  for (const text of topLevel(source)) {
    const checked = rule(text);
    out += `${paint(checked, LIGHT)}
`;
    if (!themed(checked)) continue;
    if (checked.startsWith("@")) {
      out += `@media (prefers-color-scheme:dark){${paint(checked, DARK)}}
`;
      continue;
    }
    const open = checked.indexOf("{");
    const dark = checked.slice(open + 1, checked.lastIndexOf("}")).split(";").filter(themed).join(";");
    out += `@media (prefers-color-scheme:dark){${checked.slice(0, open)}{${paint(dark, DARK)}}}
`;
  }
  if (/var\s*\(/i.test(out) || /(^|[{;\s])--[\w-]+\s*:/.test(out)) fail2("a custom property is left in it");
  return out;
}

// packages/driver/src/overlay.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var HTML_NS = "http://www.w3.org/1999/xhtml";
var shadows = /* @__PURE__ */ new WeakMap();
var checks = /* @__PURE__ */ new WeakMap();
var ALLOW_ARM_MS = 500;
var CSS = `
:host{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;
direction:ltr!important;unicode-bidi:isolate!important;
font:13px/1.45 system-ui,sans-serif!important;color:var(--r-fg)!important;-webkit-font-smoothing:antialiased!important}
:host::backdrop{display:none!important}
:host::before{content:none!important;display:none!important}
:host::after{content:none!important;display:none!important}
:host::marker{content:none!important}
:host::first-line{color:var(--r-fg)!important;background:none!important;font:13px/1.45 system-ui,sans-serif!important;text-decoration:none!important;text-shadow:none!important}
:host::first-letter{color:var(--r-fg)!important;background:none!important;font:13px/1.45 system-ui,sans-serif!important;text-decoration:none!important;text-shadow:none!important;float:none!important;margin:0!important;padding:0!important;border:0!important}
*::selection{color:#fff!important;background-color:#3b5bdb!important;text-shadow:none!important;text-decoration:none!important}
*::target-text{color:#16161d!important;background-color:#ffe066!important;text-shadow:none!important;text-decoration:none!important}
*::search-text{color:#16161d!important;background-color:#ffe066!important;text-shadow:none!important;text-decoration:none!important}
*::spelling-error{color:currentColor!important;background-color:transparent!important;text-shadow:none!important}
*::grammar-error{color:currentColor!important;background-color:transparent!important;text-shadow:none!important}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 13px;border-radius:999px;
font:600 12.5px/1 system-ui,sans-serif;cursor:pointer;background:var(--r-soft);color:var(--r-fg);transition:background .15s,transform .1s;user-select:none}
button:hover{background:var(--r-soft-h)}button:active{transform:scale(.97)}
button:focus-visible{outline:2px solid var(--r-accent);outline-offset:2px}
button.primary{background:var(--r-accent);color:#fff}button.primary:hover{background:var(--r-accent-h)}
button.danger{background:var(--r-danger);color:#fff}button.danger:hover{background:var(--r-danger-h)}
.cursor{position:fixed;left:0;top:0;width:0;height:0;opacity:0;transition:opacity .25s ease;will-change:transform}
.cursor.on{opacity:1}
.cursor svg{position:absolute;left:-4px;top:-3px;width:26px;height:26px;overflow:visible;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28))}
.cursor path{fill:#5b5bf6;stroke:#fff;stroke-width:1.6;stroke-linejoin:round}
.chip{position:absolute;left:17px;top:21px;max-width:240px;padding:3px 9px;border-radius:999px;background:#5b5bf6;color:#fff;font-weight:600;font-size:12px;line-height:18px;
white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,.22)}
.chip:empty{display:none}
.cursor.flip-x .chip{left:auto;right:12px}
.cursor.flip-y .chip{top:auto;bottom:10px}
.ripple{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #5b5bf6;opacity:0;animation:r-ripple .55s ease-out}
@keyframes r-ripple{0%{transform:scale(.3);opacity:.9}100%{transform:scale(1.5);opacity:0}}
.pill{position:fixed;z-index:3;right:16px;bottom:16px;display:flex;align-items:center;gap:10px;max-width:min(560px,calc(100vw - 32px));padding:5px 5px 5px 13px;border-radius:999px;
background:var(--r-card);border:1px solid var(--r-line);box-shadow:var(--r-shadow);pointer-events:auto}
.pill .dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--r-ok);box-shadow:0 0 0 0 rgba(22,163,74,.55);animation:r-pulse 2s infinite}
.pill.paused .dot{background:var(--r-warn);animation:none}
.pill .text{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--r-muted)}
.pill .who{color:var(--r-fg);font-weight:650}
.pill .state{flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--r-warn)}
.pill .flag{flex:none;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;line-height:17px;background:rgba(220,38,38,.14);color:var(--r-danger)}
.pill .ctrls{flex:none;display:flex;gap:5px}
.pill .ctrls:empty{display:none}
@keyframes r-pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
@keyframes r-pulse-a{0%{box-shadow:0 0 0 0 rgba(217,119,6,.5)}70%{box-shadow:0 0 0 7px rgba(217,119,6,0)}100%{box-shadow:0 0 0 0 rgba(217,119,6,0)}}
@keyframes r-pulse-b{0%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}70%{box-shadow:0 0 0 7px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}
.card .held,.panel .held,.card .keys,.card .kept{margin:8px 0 0;padding:8px 12px;border-radius:10px;background:rgba(217,119,6,.15);color:var(--r-warn);font-weight:600;overflow-wrap:anywhere}
.card .kept{margin:0 0 14px;background:var(--r-soft);color:var(--r-fg)}
.card .remember{margin:8px 0 0;color:var(--r-muted);font-size:12px}
.panel .held{flex:none;margin:8px 10px 0}
.backdrop{position:fixed;z-index:2;inset:0;display:flex;align-items:center;justify-content:center;padding:16px 16px 72px;background:rgba(8,8,18,.48);pointer-events:auto}
.backdrop~.pill{box-shadow:0 1px 3px rgba(0,0,0,.3)}
.card{display:flex;flex-direction:column;width:min(440px,100%);max-height:calc(100vh - 88px);overflow:hidden;padding:22px 22px 18px;border-radius:18px;background:var(--r-card);color:var(--r-fg);
border:1px solid var(--r-line);box-shadow:0 30px 80px rgba(0,0,0,.35)}
.card:focus{outline:none}
.card .body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}
.card .body:focus-visible{outline:2px solid var(--r-accent);outline-offset:2px}
.card .more{margin:8px 0 0;color:var(--r-warn);font-size:12px;font-weight:600}
.card .head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px}
.card .badge{flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:var(--r-accent);color:#fff}
.card .badge svg{width:20px;height:20px}
.card h2{margin:0;font-size:16px;line-height:1.3;font-weight:680;overflow-wrap:anywhere;overflow:hidden}
.card .sub{margin:2px 0 0;color:var(--r-muted);font-size:12.5px;overflow-wrap:anywhere;overflow:hidden}
.card .lead{margin:0 0 8px;font-weight:600}
.card ul{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:7px}
.card li{display:flex;gap:9px;align-items:baseline}
.card li .k{flex:none;min-width:58px;padding:1px 7px;border-radius:6px;background:var(--r-soft);font:600 11.5px/18px monospace;text-align:center}
.card .action{margin:0 0 6px;font:650 14px/1.4 monospace;overflow-wrap:anywhere;overflow:hidden}
.card .desc{margin:0 0 12px;color:var(--r-muted);overflow-wrap:anywhere;overflow:hidden}
.card .risk{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:999px;font:700 10.5px/17px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;vertical-align:2px;background:var(--r-soft);color:var(--r-muted)}
.card .risk.sensitive{background:rgba(217,119,6,.15);color:var(--r-warn)}.card .risk.dangerous{background:rgba(220,38,38,.14);color:var(--r-danger)}
.card .warn{margin:0 0 14px;padding:8px 12px;border-radius:10px;background:rgba(220,38,38,.12);color:var(--r-danger);font-weight:600;overflow-wrap:anywhere}
button.primary.wait,button.primary.wait:hover{background:var(--r-soft);color:var(--r-muted);cursor:default;transform:none}
button.wait:not(.primary),button.wait:not(.primary):hover{background:var(--r-soft);color:var(--r-muted);opacity:.6;cursor:default;transform:none}
.card .always{margin:8px 0 0;padding:8px 12px;border-radius:10px;background:var(--r-soft);font-weight:600;overflow-wrap:anywhere}
.card pre{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:var(--r-soft);font:12px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden}
.card pre .ln{display:block;overflow:hidden}
.card .reason{margin:0 0 14px;padding:8px 12px;border-left:3px solid var(--r-line);color:var(--r-muted);font-style:italic;overflow-wrap:anywhere;overflow:hidden}
.card .foot{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;margin-top:4px}
.card .timer{margin-right:auto;color:var(--r-muted);font-size:12px}
.card .queue{color:var(--r-muted);font-size:12px}
.toasts{position:fixed;top:16px;left:50%;transform:translateX(-50%);width:min(420px,calc(100vw - 32px));display:flex;flex-direction:column;align-items:center;gap:8px}
.toast{max-width:100%;padding:10px 15px 10px 13px;border-radius:12px;background:var(--r-card);
border:1px solid var(--r-line);border-left:4px solid var(--r-accent);box-shadow:var(--r-shadow);overflow-wrap:anywhere;white-space:pre-wrap;animation:r-drop .24s cubic-bezier(.2,.8,.2,1);transition:opacity .3s,transform .3s}
.toast .from{display:block;margin:0 0 2px;color:var(--r-muted);font-size:11px;font-weight:650;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.toast.ok{border-left-color:var(--r-ok)}.toast.warn{border-left-color:var(--r-warn)}
.toast.out{opacity:0;transform:translateY(-6px)}
@keyframes r-drop{from{transform:translateY(-10px);opacity:0}to{transform:none;opacity:1}}
.hl{position:fixed;left:0;top:0;border-radius:9px;border:2px solid var(--r-accent);box-shadow:0 0 0 4px rgba(91,91,246,.22);animation:r-glow 1.1s ease-in-out infinite alternate;transition:opacity .25s}
.hl.out{opacity:0}
.hl .tag{position:absolute;left:-2px;bottom:100%;margin-bottom:5px;max-width:280px;padding:2px 8px;border-radius:7px;background:var(--r-accent);color:#fff;
font-weight:600;font-size:12px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hl .tag:empty{display:none}
@keyframes r-glow{from{box-shadow:0 0 0 3px rgba(91,91,246,.18)}to{box-shadow:0 0 0 7px rgba(91,91,246,.06)}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;
var sealed;
function overlayCss() {
  return sealed ??= sealCss(CSS + PANEL_CSS + CHAT_CSS);
}
var WITHDRAWN_MS = 1500;
var KEY_LOCK_MS = 3e3;
var KEYS_NOTE = "Keys do not answer this request right now, because something was just typed. Use the pointer, or wait a moment and press the key again.";
function typesText(e, onButton) {
  const k = typeof e.key === "string" ? e.key : "";
  if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta" || k === "AltGraph" || k === "CapsLock" || k === "NumLock" || k === "Fn") return false;
  if (e.ctrlKey || e.altKey || e.metaKey) return true;
  if (k === "Backspace" || k === "Delete" || k === "Process" || k === "Dead" || k === "Unidentified" || k === "") return true;
  if (k === " " || k === "Spacebar") return !onButton;
  return Array.from(k).length === 1;
}
var HELD_NOTE = "A click here was not taken: for a moment this page covered these controls or changed how they are shown. Check what you see, then choose again.";
function textOn(color) {
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return L > 0.42 ? "#111118" : "#ffffff";
}
var ARGS_MAX_ENTRIES = 40;
var ARGS_MAX_DEPTH = 4;
var ARGS_MAX_CODE_POINTS = 2e3;
function showString(s) {
  return visible(JSON.stringify(s));
}
function renderArgs(args) {
  let entries = 0;
  let tooBig = false;
  const render = (v, depth) => {
    if (tooBig) return "";
    if (v === null) return "null";
    if (typeof v === "string") return showString(v);
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
    if (typeof v === "boolean") return String(v);
    if (typeof v !== "object") {
      tooBig = true;
      return "";
    }
    const arr = Array.isArray(v);
    const keys = arr ? v.map((_, i) => i) : Object.keys(v);
    if (!keys.length) return arr ? "[]" : "{}";
    entries += keys.length;
    if (entries > ARGS_MAX_ENTRIES || depth + 1 > ARGS_MAX_DEPTH) {
      tooBig = true;
      return "";
    }
    const pad = "  ".repeat(depth + 1);
    const lines = [];
    for (const k of keys) {
      const item = v[k];
      lines.push(`${pad}${arr ? "" : `${showString(String(k))}: `}${render(item, depth + 1)}`);
      if (tooBig) return "";
    }
    return `${arr ? "[" : "{"}
${lines.join(",\n")}
${"  ".repeat(depth)}${arr ? "]" : "}"}`;
  };
  let s;
  try {
    s = render(args, 0);
  } catch {
    return null;
  }
  if (tooBig) return null;
  let cps = 0;
  for (const _ of s) if (++cps > ARGS_MAX_CODE_POINTS) return null;
  return s;
}
var NO_CHILDREN = /* @__PURE__ */ new Set([
  "video",
  "audio",
  "canvas",
  "img",
  "picture",
  "iframe",
  "embed",
  "object",
  "input",
  "textarea",
  "select",
  "button",
  "br",
  "hr",
  "area",
  "base",
  "col",
  "meta",
  "link",
  "source",
  "track",
  "wbr",
  "template",
  "slot"
]);
function canHost(el) {
  return el.namespaceURI === HTML_NS && !NO_CHILDREN.has(el.localName);
}
function isModalDialog(d) {
  try {
    return d.matches(":modal");
  } catch {
    return false;
  }
}
var Overlay = class {
  host;
  #doc;
  #root;
  #hooks;
  #cursor;
  #chip;
  #pill;
  #pillDot;
  #pillText;
  #pillWho;
  #pillLevel;
  #pillState;
  #pillFlag;
  #pillCtrls;
  /** The part of the indicator that opens the panel: a real button, there only when the policy has a panel. */
  #openBtn;
  #panelOn;
  #panel;
  #permissions;
  #permissionsTab;
  #activity;
  #activityTab;
  /** The Chat tab, where the policy has chat at all. */
  #chat = null;
  #chatTab = null;
  /** Unread chat messages, next to the indicator's text. */
  #pillUnread;
  #pillUnreadN;
  /** The mark for `allow` rules that waive a prompt: the indicator is not calm while there are any. */
  #pillRules;
  #cursorPath;
  /** The agent's cursor colour and the text colour on it, once one was set. */
  #cursorTint = null;
  /** Top-layer elements (modal dialogs, fullscreen) in the order they were first seen open. */
  #topOrder = /* @__PURE__ */ new Map();
  #topSeq = 0;
  #placedOk = true;
  #mo = null;
  #onTopChange = () => this.place();
  /** The browser has the Popover API: the host is shown in the top layer, last, where no page content paints over it. */
  #popover;
  /** The other top-layer elements (open popovers, modal dialogs, a fullscreen element) that were there when the host was last raised. */
  #below = /* @__PURE__ */ new Set();
  /** A popover was toggled somewhere since: the host may no longer be last. */
  #stale = true;
  /** The API was there but the host could not be shown once: it is used no further. */
  #shownOnce = false;
  #onToggle = (e) => {
    if (this.#destroyed) return;
    const t = e.target;
    if (!t || t === this.host || typeof t.hasAttribute !== "function" || !(t.hasAttribute("popover") || t.localName === "dialog")) return;
    if (e.newState === "closed") return;
    this.#stale = true;
    this.#later(() => this.place(), 0);
  };
  /**
   * IntersectionObserver v2, where the browser has it: is the indicator, the open panel or the
   * card that is showing painted over, or drawn under an effect? What it last said for each.
   */
  #io = null;
  #seenCovered = /* @__PURE__ */ new Map();
  /**
   * How often the host had to be put back: shown again in the top layer, or moved to another
   * place. A check that had to do that did not find the overlay as the person saw it.
   */
  #repairs = 0;
  /** When the person last pressed a key that types, anywhere on the page. */
  #typedAt = Number.NEGATIVE_INFINITY;
  /** The card that is showing, and what a key pressed outside it means for it. */
  #cardEl = null;
  #cardKey = null;
  #onAnyKey = (e) => {
    if (this.#destroyed || !isTrusted(e)) return;
    const card = this.#cardEl;
    const inCard = card !== null && card.contains(this.#root.activeElement);
    if (typesText(e, false)) this.#typedAt = tick();
    if (!inCard) this.#cardKey?.(e);
  };
  /** The label an agent gave its cursor. It is not shown while a consent card is up. */
  #chipText = "";
  /** Toasts on screen, each with the time it is due to go. */
  #toastList = [];
  /** Why the overlay cannot be relied on right now; empty when it can. */
  #unsound = "";
  /** A click that would have let an agent do more was not taken while the overlay could not be relied on. */
  #held = false;
  #heldTimer;
  /** Says so on the card that is showing, once the overlay can be relied on again. */
  #cardHeld = null;
  /** Re-arms Allow on the card showing now (after it appears or moves). */
  #armAllow = null;
  #pauseBtn;
  #stopBtn;
  #paused = false;
  #toasts;
  #hls;
  #highlights = [];
  #prompts = [];
  #current = null;
  /** A withdrawn prompt's "Request withdrawn" card, holding back the next card until `until`. */
  #hold = null;
  #timers = /* @__PURE__ */ new Set();
  #onScroll = () => this.#placeHighlights();
  #destroyed = false;
  constructor(doc, hooks, options = {}) {
    this.#doc = doc;
    this.#hooks = hooks;
    this.host = createElement(doc, "div");
    this.host.setAttribute("data-reins", "ignore");
    const hs = this.host.style;
    hs.setProperty("position", "fixed", "important");
    hs.setProperty("inset", "0", "important");
    hs.setProperty("z-index", "2147483647", "important");
    hs.setProperty("pointer-events", "none", "important");
    hs.setProperty("display", "block", "important");
    hs.setProperty("direction", "ltr", "important");
    hs.setProperty("unicode-bidi", "isolate", "important");
    this.#popover = typeof this.host.showPopover === "function" && typeof this.host.hidePopover === "function";
    if (this.#popover) this.host.setAttribute("popover", "manual");
    this.#root = attachShadow(this.host, { mode: "closed" });
    shadows.set(this.host, this.#root);
    checks.set(this.host, () => (this.check(), this.#unsound));
    this.#style();
    this.#cursor = this.#el("div", "cursor");
    const svg = createElementNS(doc, SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = createElementNS(doc, SVG_NS, "path");
    path.setAttribute("d", "M4 2.6v17.2l4.5-4.1 2.9 6.6 3.2-1.4-2.9-6.5h6.2z");
    this.#cursorPath = path;
    svg.append(path);
    this.#chip = this.#el("div", "chip");
    this.#cursor.append(svg, this.#chip);
    this.#hls = this.#el("div", "hls");
    this.#toasts = this.#el("div", "toasts");
    this.#toasts.setAttribute("role", "status");
    this.#toasts.setAttribute("aria-live", "polite");
    this.#pill = this.#el("div", "pill");
    this.#pill.setAttribute("role", "status");
    this.#pill.hidden = true;
    this.#pillDot = this.#el("span", "dot");
    this.#pillText = this.#el("span", "text");
    this.#pillWho = this.#el("span", "who");
    this.#pillText.append(createTextNode(doc, "AI connected: "), this.#pillWho);
    this.#pillLevel = this.#el("span", "lvl");
    this.#pillLevel.hidden = true;
    this.#pillRules = this.#el("span", "rul");
    this.#pillRules.hidden = true;
    this.#pillUnread = this.#el("span", "unread");
    this.#pillUnread.hidden = true;
    this.#pillUnreadN = this.#el("span");
    this.#pillUnread.append(this.#pillUnreadN, this.#el("span", "vh", " unread chat messages"));
    this.#pillState = this.#el("span", "state", "Paused");
    this.#pillState.hidden = true;
    this.#pillFlag = this.#el("span", "flag", "Unverified hub");
    this.#pillFlag.title = "This page could not verify the Reins hub it is connected to";
    this.#pillFlag.hidden = true;
    this.#pillCtrls = this.#el("span", "ctrls");
    this.#pauseBtn = this.#button("Pause", "", () => this.#paused ? this.#hooks.resume() : this.#hooks.pause());
    this.#stopBtn = this.#button("Stop", "danger", () => {
      this.#hooks.stop();
      this.#panel.close();
    });
    this.#stopBtn.setAttribute("aria-label", "Stop the AI agent and revoke its access");
    this.#openBtn = this.#button("", "open", () => this.#panel.isOpen ? this.#panel.close(true) : this.#panel.open());
    this.#openBtn.setAttribute("aria-expanded", "false");
    this.#openBtn.setAttribute("aria-haspopup", "dialog");
    this.#openBtn.setAttribute("aria-controls", PANEL_ID);
    this.#openBtn.title = options.chat ? "Permissions, activity and chat" : "Permissions and activity";
    const pill = this.#pill;
    listen(pill, "keydown", (e) => {
      if (!trustedAt(e, pill) || e.key !== "Escape" || !this.#panel.isOpen) return;
      prevent(e);
      stop(e);
      this.#panel.close(true);
    });
    const kit = {
      doc,
      el: (tag, cls, text) => this.#el(tag, cls, text),
      button: (label, cls, act) => this.#button(label, cls, act),
      later: (fn, ms) => this.#later(fn, ms),
      cancel: (t) => {
        cancelLater(t);
        this.#timers.delete(t);
      },
      show: (text, max) => visible(truncate(text, max)),
      armMs: ALLOW_ARM_MS,
      now: tick,
      sound: () => this.#mayLoosen()
    };
    this.#panel = new Panel(kit, (open, byPerson) => {
      this.#openBtn.setAttribute("aria-expanded", String(open));
      if (open) listen(doc, "keydown", this.#onPanelKey, true);
      else unlisten(doc, "keydown", this.#onPanelKey, true);
      if (!open) this.#panel.notice(null);
      this.#arrange();
      this.#armAllow?.();
      if (!open && byPerson && this.#openBtn.isConnected) {
        try {
          this.#openBtn.focus({ preventScroll: true });
        } catch {
        }
      }
    });
    this.#permissions = new PermissionsTab(kit, hooks);
    this.#permissionsTab = this.#panel.addTab(this.#permissions);
    this.#activity = new ActivityTab(kit);
    this.#activityTab = this.#panel.addTab(this.#activity);
    if (options.chat) {
      this.#chat = new ChatTab(kit, hooks, (n) => this.#showUnread(n));
      this.#chatTab = this.#panel.addTab(this.#chat);
      this.#panel.el.setAttribute("aria-label", "AI agent permissions, activity and chat");
    }
    this.#layoutPill(false);
    this.#root.append(this.#hls, this.#cursor, this.#toasts, this.#panel.el, this.#pill);
  }
  /** The indicator's children, with the opening button around the first of them when there is a panel. */
  #layoutPill(panel) {
    if (this.#panelOn === panel) return;
    this.#panelOn = panel;
    if (panel) {
      const caret = this.#el("span", "car");
      caret.setAttribute("aria-hidden", "true");
      this.#openBtn.replaceChildren(this.#pillDot, this.#pillText, this.#pillLevel, this.#pillRules, this.#pillUnread, caret);
      this.#pill.replaceChildren(this.#openBtn, this.#pillFlag, this.#pillState, this.#pillCtrls);
    } else {
      this.#panel.close();
      this.#pill.replaceChildren(this.#pillDot, this.#pillText, this.#pillLevel, this.#pillRules, this.#pillFlag, this.#pillState, this.#pillCtrls);
    }
  }
  /**
   * Escape with the panel open and focus on the page itself (not in a page control, which
   * keeps its own Escape, and not while a consent prompt is up, where Escape denies).
   * Focus inside the overlay is handled there.
   */
  #onPanelKey = (e) => {
    if (!trustedAt(e, this.#doc) || e.key !== "Escape" || this.#current || !this.#panel.isOpen) return;
    const a = this.#doc.activeElement;
    if (a && a !== this.#doc.body && a !== this.#doc.documentElement) return;
    prevent(e);
    stop(e);
    this.#panel.close();
  };
  /**
   * A consent card and the open panel on one screen. On a wide viewport the card moves aside
   * (`beside`), so both can be read and used. On a narrow one there is no room for both: the
   * panel goes under the backdrop (`under`) until the prompt is answered. It is not closed.
   */
  #arrange() {
    const prompting = this.#current !== null || this.#hold !== null;
    this.#panel.el.classList.toggle("under", prompting);
    for (const b of Array.from(this.#root.querySelectorAll(".backdrop"))) b.classList.toggle("beside", this.#panel.isOpen);
  }
  /** Focus is in the open panel, or on the button that opens it. */
  #panelFocused() {
    const a = this.#root.activeElement;
    return this.#panel.isOpen && a !== null && (a === this.#openBtn || this.#panel.el.contains(a));
  }
  /** A further tab for the panel (the tab API of `panel.ts`). */
  addPanelTab(tab) {
    return this.#panel.addTab(tab);
  }
  get panelOpen() {
    return this.#panel.isOpen;
  }
  /** What the Permissions tab shows. Changes nothing by itself: only the person's clicks do. */
  permissions(model) {
    if (this.#destroyed) return;
    if (this.#permissions.update(model)) this.#permissionsTab.refresh();
  }
  /** The activity log, newest last. */
  activity(entries) {
    if (this.#destroyed) return;
    this.#activity.update(entries);
    this.#activityTab.refresh();
  }
  /**
   * What the Chat tab shows. The tab draws what changed inside itself and nothing else: no
   * other tab is redrawn or armed again, no focus moves, and the panel does not open.
   */
  chat(model) {
    if (this.#destroyed) return;
    this.#chat?.update(model);
  }
  /** The unread count: a mark on the Chat tab and a small number in the indicator. */
  #showUnread(n) {
    this.#chatTab?.badge(n > 0 ? String(n) : "");
    this.#pillUnread.hidden = n <= 0;
    this.#pillUnreadN.textContent = n > 99 ? "99+" : String(n);
    this.#pillUnread.title = n === 1 ? "1 unread chat message" : `${n} unread chat messages`;
  }
  /** The person's focus is in the chat composer. */
  get chatFocused() {
    return this.#chat !== null && this.#chat.focused;
  }
  /** Put focus back in the chat composer, after a command took it from the person while they typed. */
  refocusChat() {
    if (!this.#destroyed) this.#chat?.refocus();
  }
  #style() {
    const css = overlayCss();
    const win = this.#doc.defaultView;
    try {
      const Sheet = win?.CSSStyleSheet;
      if (Sheet && "adoptedStyleSheets" in this.#root) {
        const sheet = new Sheet();
        sheet.replaceSync(css);
        this.#root.adoptedStyleSheets = [sheet];
        return;
      }
    } catch {
    }
    const style = createElement(this.#doc, "style");
    style.textContent = css;
    this.#root.append(style);
  }
  /** An element of the overlay. Its listeners go through the functions kept at load (`primordials.ts`). */
  #el(tag, cls, text) {
    const e = createElement(this.#doc, tag);
    if (cls) e.className = cls;
    if (text !== void 0) e.textContent = text;
    return e;
  }
  /**
   * A button that reacts to the person's own activation only: a natively trusted click that
   * is being dispatched to this very button. Not a synthetic event, not an object that says
   * it is trusted, and not a real click that was made somewhere else.
   */
  #button(label, cls, act) {
    const b = this.#el("button", cls, label);
    b.type = "button";
    listen(b, "click", (e) => {
      const mine = trustedAt(e, b);
      stop(e);
      if (mine) act(e);
    });
    return b;
  }
  #later(fn, ms) {
    const t = later(() => {
      this.#timers.delete(t);
      fn();
    }, ms);
    this.#timers.add(t);
    return t;
  }
  mount() {
    if (this.#destroyed) return;
    const parent = this.#doc.documentElement;
    if (parent && this.host.parentNode !== parent) parent.append(this.host);
    const win = this.#doc.defaultView;
    if (!this.#mo && win && typeof win.MutationObserver === "function" && parent) {
      this.#mo = new win.MutationObserver(this.#onTopChange);
      this.#mo.observe(parent, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    }
    listen(this.#doc, "fullscreenchange", this.#onTopChange);
    listen(this.#doc, "webkitfullscreenchange", this.#onTopChange);
    if (this.#popover) {
      listen(this.#doc, "beforetoggle", this.#onToggle, true);
      listen(this.#doc, "toggle", this.#onToggle, true);
    }
    if (win) listen(win, "keydown", this.#onAnyKey, true);
    this.#watch(win);
    this.place();
  }
  /**
   * IntersectionObserver v2, where the browser has it, says whether what the person has to read
   * is painted over or drawn under an effect: the indicator, the open panel and the card that is
   * showing. It also sees things a hit test passes through, and top-layer elements the document
   * does not list (a popover inside a shadow root). An extra signal: without it `check()` rests
   * on the rest.
   *
   * None of the three is animated in (no opacity, no transform), so that what the observer says
   * about them is about the page and not about the overlay's own entrance.
   */
  #watch(win) {
    const IO = win?.IntersectionObserver;
    if (this.#io || typeof IO !== "function" || !("trackVisibility" in IO.prototype)) return;
    try {
      const init = { trackVisibility: true, delay: 100, threshold: [0, 1] };
      this.#io = new IO((entries) => {
        if (this.#destroyed) return;
        let news = false;
        for (const e of entries) {
          const covered = e.isIntersecting && e.isVisible === false;
          if (covered && this.#seenCovered.get(e.target) !== true) news = true;
          this.#seenCovered.set(e.target, covered);
        }
        if (news && this.#coveredNow() !== "") {
          this.#stale = true;
          this.place();
        }
      }, init);
      this.#io.observe(this.#pill);
      this.#io.observe(this.#panel.el);
    } catch {
      this.#io = null;
    }
  }
  /** Watch one more element (the card that is showing), or stop watching it. */
  #observe(el, on) {
    if (!on) this.#seenCovered.delete(el);
    try {
      if (on) this.#io?.observe(el);
      else this.#io?.unobserve(el);
    } catch {
    }
  }
  /** Which of the things the observer watches is painted over or under an effect right now; '' for none. */
  #coveredNow() {
    if (this.#seenCovered.get(this.#pill) === true) return "the indicator is covered or drawn under an effect";
    const card = this.#cardEl;
    if (card && this.#seenCovered.get(card) === true) return "the request on screen is covered or drawn under an effect";
    if (this.#panel.isOpen && this.#seenCovered.get(this.#panel.el) === true && !this.#panelUnder()) return "the panel is covered or drawn under an effect";
    return "";
  }
  /** The panel is under a prompt's backdrop right now (`.panel.under` on a narrow viewport): the overlay's own doing. */
  #panelUnder() {
    if (this.#current === null && this.#hold === null) return false;
    try {
      return this.#doc.defaultView?.matchMedia?.("(max-width:860px)").matches === true;
    } catch {
      return false;
    }
  }
  isOverlay(el) {
    return el === this.host;
  }
  destroy() {
    this.#destroyed = true;
    this.cancel();
    this.clear();
    this.#panel.close();
    for (const t of this.#timers) cancelLater(t);
    this.#timers.clear();
    cancelEvery(this.#heldTimer);
    this.#heldTimer = void 0;
    this.#mo?.disconnect();
    this.#mo = null;
    this.#io?.disconnect();
    this.#io = null;
    unlisten(this.#doc, "fullscreenchange", this.#onTopChange);
    unlisten(this.#doc, "webkitfullscreenchange", this.#onTopChange);
    unlisten(this.#doc, "beforetoggle", this.#onToggle, true);
    unlisten(this.#doc, "toggle", this.#onToggle, true);
    unlisten(this.#doc, "keydown", this.#onPanelKey, true);
    const win = this.#doc.defaultView;
    if (win) unlisten(win, "keydown", this.#onAnyKey, true);
    this.host.remove();
  }
  // ───────── placement (top layer) ─────────
  /** The topmost open modal dialog or fullscreen element, or null. */
  #topLayer() {
    const doc = this.#doc;
    const found = [];
    const d = doc;
    const fs = doc.fullscreenElement ?? d.webkitFullscreenElement ?? null;
    if (fs && fs.isConnected) found.push(fs);
    let dialogs = [];
    try {
      dialogs = Array.from(doc.querySelectorAll("dialog[open]"));
    } catch {
      dialogs = [];
    }
    for (const el of dialogs) if (isModalDialog(el)) found.push(el);
    for (const el of [...this.#topOrder.keys()]) if (!found.includes(el)) this.#topOrder.delete(el);
    let top = null;
    let best = -1;
    for (const el of found) {
      let n = this.#topOrder.get(el);
      if (n === void 0) this.#topOrder.set(el, n = ++this.#topSeq);
      if (n > best) {
        best = n;
        top = el;
      }
    }
    return top;
  }
  /**
   * Put the host where the person can see and use it: inside the topmost modal dialog or
   * fullscreen element while one is open (so it shares that element's non-inert top-layer
   * subtree), else on <html>; and, with the Popover API, last in the top layer. Structural
   * only; `check()` also verifies it on screen.
   */
  place() {
    if (this.#destroyed) return;
    const root = this.#doc.documentElement;
    if (!root) return;
    const top = this.#topLayer();
    let parent = root;
    this.#placedOk = true;
    if (top && top !== root) {
      if (canHost(top)) parent = top;
      else this.#placedOk = false;
    }
    if (this.host.parentNode !== parent) {
      const active = this.#root.activeElement;
      parent.append(this.host);
      this.#repairs++;
      this.#raise();
      try {
        active?.focus({ preventScroll: true });
      } catch {
      }
      this.#armAllow?.();
      this.#panel.rearm();
    } else this.#raise();
  }
  /** The host is shown as a popover right now. */
  #inTopLayer() {
    try {
      return this.#popover && this.host.matches(":popover-open");
    } catch {
      return false;
    }
  }
  /**
   * The elements in the top layer other than the host, as far as the document tells: open
   * popovers, modal dialogs, a fullscreen element. One inside another shadow root is not
   * listed; `#watch` is the signal for that.
   */
  #others() {
    const out = /* @__PURE__ */ new Set();
    const doc = this.#doc;
    try {
      for (const el of Array.from(doc.querySelectorAll(":popover-open"))) if (el !== this.host) out.add(el);
    } catch {
    }
    try {
      for (const el of Array.from(doc.querySelectorAll("dialog[open]"))) if (isModalDialog(el)) out.add(el);
    } catch {
    }
    const fs = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (fs && fs.isConnected) out.add(fs);
    return out;
  }
  /**
   * Show the host in the top layer, and show it again whenever something else has entered
   * the top layer since: what is shown last is painted last, over everything. A page's own
   * content, whatever its z-index, is below the top layer altogether.
   */
  #raise() {
    if (!this.#popover || !this.host.isConnected) return;
    const others = this.#others();
    const open = this.#inTopLayer();
    let behind = this.#stale || !open;
    for (const el of others) if (!this.#below.has(el)) behind = true;
    this.#below = others;
    this.#stale = false;
    if (!behind) return;
    const host = this.host;
    const active = this.#root.activeElement;
    if (this.#shownOnce) this.#repairs++;
    try {
      if (open) host.hidePopover();
      host.showPopover();
      this.#shownOnce = true;
    } catch {
      if (!this.#shownOnce) {
        this.#popover = false;
        host.removeAttribute("popover");
      }
    }
    if (!open) return;
    try {
      active?.focus({ preventScroll: true });
    } catch {
    }
    this.#armAllow?.();
    this.#panel.rearm();
  }
  /**
   * Can the overlay be relied on right now: is it where the person sees it as it was drawn,
   * and can use it? Places the host, then verifies that it is connected, not inert, last in
   * the top layer (where there is one), at its own size (no zoom), under no effect that changes
   * how it is painted, not painted over (where the browser can tell: the indicator, the open
   * panel, the card that is showing), covering the viewport, and that the indicator (when
   * shown) is what is hit at its own centre. Where the window has no layout at all (a test
   * DOM, a prerenderer) the geometry is skipped; a page that hides everything is not that.
   *
   * A check that had to put the overlay back passes: it is where it belongs now. Whether the
   * person's click may be taken is another question, which `#mayLoosen` answers.
   */
  check() {
    this.#sweep();
    this.#unsound = this.#why();
    return this.#unsound === "";
  }
  /** Why `check()` last failed, for an error message; empty when it passed. */
  get unsound() {
    return this.#unsound;
  }
  /**
   * Is there a layout engine behind this window at all? Asked of the window, not of the
   * overlay's boxes: `html{display:none}` leaves every box empty in a real browser too.
   * Undefined where the window cannot say (no visual viewport: a test DOM, an old engine).
   */
  #windowHasLayout(win) {
    const vv = win.visualViewport;
    if (vv === void 0 || vv === null) return void 0;
    return typeof vv.width === "number" && typeof vv.height === "number" && vv.width > 0 && vv.height > 0;
  }
  #why() {
    if (this.#destroyed) return "the overlay is gone";
    const covered = this.#coveredNow();
    if (covered !== "") this.#stale = true;
    this.place();
    if (!this.#placedOk) return "the element in fullscreen cannot show the overlay";
    const host = this.host;
    if (!host.isConnected) return "the overlay is not in the page";
    try {
      if (host.closest("[inert]")) return "the overlay is inert";
    } catch {
    }
    const doc = this.#doc;
    const win = doc.defaultView;
    if (!win) return "";
    const top = this.#inTopLayer();
    if (this.#popover) {
      if (!top) return "the overlay is not in the top layer";
      for (const el of this.#others()) if (!this.#below.has(el)) return "the overlay is not last in the top layer";
    }
    if (this.#zoomed(win)) return "the page puts zoom on the overlay";
    const fx = this.#effect(win, top);
    if (fx) return `the page puts ${fx} on the overlay`;
    if (covered !== "") return covered;
    let r;
    let page = null;
    try {
      r = host.getBoundingClientRect();
      page = doc.documentElement?.getBoundingClientRect() ?? null;
    } catch {
      return "";
    }
    const layout = this.#windowHasLayout(win) ?? (r.width > 0 || r.height > 0 || page !== null && (page.width > 0 || page.height > 0));
    if (!layout) return "";
    const vw = win.innerWidth || 0;
    const vh = win.innerHeight || 0;
    if (r.left > 1 || r.top > 1 || r.right < vw - 30 || r.bottom < vh - 30) return "the overlay does not cover the page";
    if (!this.#pill.hidden && typeof doc.elementFromPoint === "function") {
      try {
        const p = this.#pill.getBoundingClientRect();
        if (p.width > 0 && p.height > 0) {
          const x = p.left + p.width / 2;
          const y = p.top + p.height / 2;
          if (x >= 0 && y >= 0 && x < vw && y < vh && doc.elementFromPoint(x, y) !== host) return "the indicator is covered";
        } else return "the indicator has no size";
      } catch {
      }
    }
    return "";
  }
  /**
   * The host is not drawn at its own size: `zoom` on an ancestor multiplies down the tree,
   * into the top layer as well, and shrinks the overlay to a dot or blows it up past the
   * screen while the page puts its own content back to size.
   */
  #zoomed(win) {
    const off = (z) => Number.isFinite(z) && Math.abs(z - 1) > 0.01;
    try {
      const z = this.host.currentCSSZoom;
      if (typeof z === "number") return off(z);
    } catch {
    }
    if (typeof win.getComputedStyle !== "function") return false;
    let total = 1;
    for (let e = this.host; e; e = e.parentElement) {
      try {
        const cs = win.getComputedStyle(e);
        const v = (cs.getPropertyValue("zoom") || cs.zoom || "").trim();
        const n = v !== "" && v !== "normal" ? v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v) : 1;
        if (off(n)) return true;
        if (Number.isFinite(n)) total *= n;
      } catch {
      }
    }
    return off(total);
  }
  /**
   * A style that changes how the overlay is painted, by name, or '' when there is none: on
   * the host itself, and on its ancestors where their effects reach it. An element in the top
   * layer is painted apart from its ancestors: their filter, opacity, transform, mask, clip
   * path and blend mode do not touch it, and only what stops them rendering their content at
   * all does. Outside the top layer every one of them counts.
   */
  #effect(win, top) {
    if (typeof win.getComputedStyle !== "function") return "";
    for (let e = this.host; e; e = e.parentElement) {
      let cs;
      try {
        cs = win.getComputedStyle(e);
      } catch {
        continue;
      }
      const v = (p) => {
        try {
          return (cs.getPropertyValue(p) || "").trim();
        } catch {
          return "";
        }
      };
      const set = (p, none) => {
        const x = v(p);
        return x !== "" && x !== none && x !== "initial" && x !== "inherit" && x !== "unset" && x !== "revert";
      };
      if (v("content-visibility") === "hidden") return "content-visibility";
      if (v("display") === "none") return "display";
      if (top && e !== this.host) continue;
      const opacity = parseFloat(v("opacity"));
      if (Number.isFinite(opacity) && opacity < 1) return "opacity";
      if (set("visibility", "visible")) return "visibility";
      for (const p of ["filter", "backdrop-filter", "-webkit-backdrop-filter", "clip-path", "mask-image", "-webkit-mask-image", "transform", "translate", "rotate", "scale"]) if (set(p, "none")) return p.replace("-webkit-", "");
      if (set("mix-blend-mode", "normal")) return "mix-blend-mode";
    }
    return "";
  }
  /**
   * May a control that lets an agent do more take this click? Only when the overlay can be
   * relied on and was found that way: a check that had to put the overlay back on top, or
   * move it, found it covered or out of place, and the person made this click on what they saw
   * then. That click is not taken; a later, separate one is. The same holds for the first
   * click after a time in which the overlay could not be relied on: it brings the notice and
   * starts every arming delay over, and is itself not taken. No timer is needed for any of it.
   */
  #mayLoosen() {
    const before = this.#repairs;
    const sound = this.check();
    if (sound && this.#repairs === before) {
      if (!this.#held) return true;
      this.#recovered();
      return false;
    }
    this.#held = true;
    if (this.#heldTimer === void 0) {
      this.#heldTimer = every(() => {
        if (this.#destroyed || !this.#held) {
          cancelEvery(this.#heldTimer);
          this.#heldTimer = void 0;
          return;
        }
        const seen = this.#repairs;
        if (this.check() && this.#repairs === seen) this.#recovered();
      }, 400);
    }
    return false;
  }
  /** The overlay can be relied on again after a click was not taken: say so, and arm everything anew. */
  #recovered() {
    cancelEvery(this.#heldTimer);
    this.#heldTimer = void 0;
    this.#held = false;
    this.#cardHeld?.();
    if (this.#panel.isOpen) this.#panel.notice(HELD_NOTE);
    this.#armAllow?.();
    this.#panel.rearm();
    this.#panel.settle();
  }
  /**
   * What is past its time goes, by the clock: a prompt past its deadline is a refusal, a
   * "Request withdrawn" notice makes way, a toast or a highlight is taken down. Each of these
   * also has a timer, and a timer may never fire: timer ids belong to the document, and in an
   * app that `reins-electron` adopted a script of the page's own world can clear them all.
   * So nothing here waits on a callback to stop being answerable.
   */
  #sweep() {
    if (this.#destroyed) return;
    const t = tick();
    const cur = this.#current;
    if (cur && t >= cur.deadline) cur.close("timeout");
    const hold = this.#hold;
    if (hold && t >= hold.until) this.#endHold(hold);
    for (const x of [...this.#toastList]) if (t >= x.until) this.#dropToast(x.el);
    for (const h of [...this.#highlights]) if (t >= h.until) this.#dropHighlight(h);
  }
  // ───────── cursor ─────────
  position(x, y) {
    this.#cursor.style.setProperty("transform", `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`);
    const el = this.#doc.documentElement;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    this.#cursor.classList.toggle("flip-x", w > 0 && x > w - 270);
    this.#cursor.classList.toggle("flip-y", h > 0 && y > h - 56);
  }
  cursorVisible(on) {
    this.#cursor.classList.toggle("on", on);
  }
  get cursorShown() {
    return this.#cursor.classList.contains("on");
  }
  cursorLabel(label) {
    this.#chipText = visible(label);
    this.#showChip();
  }
  /** The cursor's label is the agent's text: it is not on screen while a consent card or its notice is. */
  #showChip() {
    this.#chip.textContent = this.#current !== null || this.#hold !== null ? "" : this.#chipText;
  }
  /**
   * `color` must already match COLOR_PATTERN; anything else is ignored. The colour goes on
   * the cursor's own elements through the CSSOM, never into a custom property.
   */
  cursorColor(color) {
    if (!COLOR_PATTERN.test(color)) return;
    const fg = textOn(color);
    this.#cursorTint = { bg: color, fg };
    this.#cursorPath.style.setProperty("fill", color);
    this.#chip.style.setProperty("background", color);
    this.#chip.style.setProperty("color", fg);
    for (const h of this.#highlights) this.#tint(h.box);
  }
  /** The cursor colour on a highlight box and its tag. */
  #tint(box) {
    const t = this.#cursorTint;
    if (!t) return;
    box.style.setProperty("border-color", t.bg);
    const tag = box.firstElementChild;
    tag?.style.setProperty("background", t.bg);
    tag?.style.setProperty("color", t.fg);
  }
  ripple(x, y) {
    const r = this.#el("div", "ripple");
    if (this.#cursorTint) r.style.setProperty("border-color", this.#cursorTint.bg);
    r.style.setProperty("left", `${x.toFixed(1)}px`);
    r.style.setProperty("top", `${y.toFixed(1)}px`);
    this.#root.append(r);
    this.#later(() => r.remove(), 650);
  }
  // ───────── indicator ─────────
  indicator(s) {
    this.#paused = s.paused;
    this.#layoutPill(s.panel === true);
    this.#pill.hidden = !s.show;
    this.#pill.classList.toggle("paused", s.paused);
    const names = s.names.map((n, i) => agentLabel(n, s.ids?.[i] ?? "", { max: 40 }));
    this.#pillWho.textContent = names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
    const levels = (s.levels ?? []).filter((l) => LEVELS.includes(l));
    const top = levels.reduce((a, l) => LEVELS.indexOf(l) > LEVELS.indexOf(a) ? l : a, "strict");
    const shown = levels.some((l) => l === "auto" || l === "bypass") ? top : levels.includes("strict") ? "strict" : "ask";
    const count = levels.filter((l) => l === shown).length;
    this.#pillLevel.hidden = shown === "ask";
    this.#pillLevel.className = `lvl ${shown}`;
    this.#pillLevel.textContent = shown === "ask" ? "" : count < levels.length ? `${LEVEL_LABEL[shown]} (${count} of ${levels.length})` : LEVEL_LABEL[shown];
    this.#pillLevel.title = shown === "ask" ? "" : `Permission level: ${LEVEL_LABEL[shown]}`;
    const approved = s.rules?.approved ?? 0;
    const rules = s.rules && s.rules.n + approved > 0 ? s.rules : void 0;
    this.#pillRules.hidden = rules === void 0;
    this.#pillRules.className = `rul ${rules?.like ?? ""}`.trim();
    const parts = [];
    if (rules && rules.n > 0) parts.push(rules.n === 1 ? "1 rule" : `${rules.n} rules`);
    if (rules && approved > 0) parts.push(`${approved} approved`);
    this.#pillRules.textContent = parts.join(", ");
    const why = [];
    if (rules && rules.n > 0) why.push(`${rules.n === 1 ? "One of your Allow rules lets an action" : `${rules.n} of your Allow rules let actions`} run without asking you`);
    if (rules && approved > 0) why.push(`${approved === 1 ? "One action runs" : `${approved} actions run`} without asking because you approved ${approved === 1 ? "it" : "them"} earlier`);
    this.#pillRules.title = why.join(". ");
    const calm = shown === "bypass" || rules?.like === "bypass" ? "bypass" : shown === "auto" || rules?.like === "auto" ? "auto" : "ask";
    this.#pill.classList.toggle("lv-auto", calm === "auto");
    this.#pill.classList.toggle("lv-bypass", calm === "bypass");
    this.#pillState.hidden = !s.paused;
    this.#pillFlag.hidden = !s.unverified;
    this.#pauseBtn.textContent = s.paused ? "Resume" : "Pause";
    this.#pauseBtn.className = s.paused ? "primary" : "";
    this.#pauseBtn.setAttribute("aria-label", s.paused ? "Resume AI control" : "Pause AI control");
    const ctrls = [];
    if (s.canPause) ctrls.push(this.#pauseBtn);
    if (s.canStop) ctrls.push(this.#stopBtn);
    this.#pillCtrls.replaceChildren(...ctrls);
  }
  // ───────── consent ─────────
  get prompting() {
    this.#sweep();
    return this.#current !== null;
  }
  /**
   * Let what is past its time go now (`#sweep`): a prompt past its deadline is a refusal. The
   * driver calls this whenever it asks whether a prompt is up, so no timer has to fire for a
   * prompt to end.
   */
  expire() {
    this.#sweep();
  }
  /**
   * Ask the person. One prompt at a time; the rest wait their turn. Resolves false on
   * timeout. Rejects with E_TOO_LARGE, without asking, when the action's arguments cannot
   * be shown on the card in full.
   */
  ask(view, timeoutMs, owner) {
    if (this.#destroyed) return Promise.resolve("cancel");
    let argsText;
    if (view.kind === "action" && view.args !== void 0 && !(typeof view.args === "object" && view.args !== null && !Array.isArray(view.args) && Object.keys(view.args).length === 0)) {
      const t = renderArgs(view.args);
      if (t === null) return Promise.reject(new ReinsError("E_TOO_LARGE", "the arguments are too large to show for confirmation"));
      argsText = t;
    }
    this.#sweep();
    return new Promise((resolve) => {
      this.#prompts.push({ view, argsText, timeoutMs, owner, resolve });
      if (!this.#current && !this.#hold) this.#next();
      else this.#updateQueueNote();
    });
  }
  /** Prompts waiting or showing, for one owner or all. */
  pending(owner) {
    let n = 0;
    for (const p of this.#prompts) if (owner === void 0 || p.owner === owner) n++;
    if (this.#current && (owner === void 0 || this.#current.prompt.owner === owner)) n++;
    return n;
  }
  /**
   * Refuse queued and showing prompts, for one owner or all. A showing prompt withdrawn for
   * one owner turns into a "Request withdrawn" card for WITHDRAWN_MS before any next card, so
   * a different request cannot take its place under the person's pointer. Cancelling all
   * (Stop, disconnect) closes everything at once.
   */
  cancel(owner) {
    const keep = [];
    for (const p of this.#prompts) {
      if (owner === void 0 || p.owner === owner) p.resolve("cancel");
      else keep.push(p);
    }
    this.#prompts = keep;
    if (this.#current && (owner === void 0 || this.#current.prompt.owner === owner)) this.#current.close("cancel", owner !== void 0);
    if (owner === void 0 && this.#hold) {
      cancelLater(this.#hold.timer);
      this.#timers.delete(this.#hold.timer);
      this.#hold.backdrop.remove();
      this.#hold = null;
      this.#panel.settle();
    }
    this.#updateQueueNote();
    this.#arrange();
    this.#showChip();
  }
  #queueNote = null;
  #updateQueueNote() {
    if (this.#queueNote) this.#queueNote.textContent = this.#prompts.length ? `${this.#prompts.length} more waiting` : "";
  }
  /**
   * Show the next prompt as a card.
   *
   * What answers a card. A pointer click on Deny, at once. A pointer click on a button that
   * approves, once the card has been up (or has moved) for ALLOW_ARM_MS and the overlay can be
   * relied on. The keyboard only when the person plainly means the card: Enter or Space on a
   * button that has the focus, or Escape to deny, and only when at least ALLOW_ARM_MS have
   * passed since the card came up, since the focus landed on that button and since any other
   * key was pressed, and at least KEY_LOCK_MS since the last key that types. So keys on their
   * way to the page answer nothing: the card takes the focus itself, not a button; Tab does
   * nothing while the card has only just appeared; and while the person goes on typing, the
   * card says that keys do not answer it. Nothing here waits on a timer to be safe: every
   * wait is a time, compared with the clock when a click or a key arrives.
   */
  #next() {
    const prompt = this.#prompts.shift();
    if (!prompt || this.#destroyed) return;
    const v = prompt.view;
    const doc = this.#doc;
    const previous = doc.activeElement;
    const previousInner = this.#root.activeElement;
    const previousKey = previousInner?.getAttribute("data-k") ?? null;
    this.clear();
    const backdrop = this.#el("div", "backdrop");
    const card = this.#el("div", "card");
    card.setAttribute("role", "alertdialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "reins-consent-title");
    card.tabIndex = -1;
    backdrop.append(card);
    const head = this.#el("div", "head");
    const badge = this.#el("div", "badge");
    const icon = createElementNS(doc, SVG_NS, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    const ip = createElementNS(doc, SVG_NS, "path");
    ip.setAttribute("d", "M5 3.5v15l3.8-3.4 2.4 5.5 2.7-1.2-2.4-5.4h5.2z");
    ip.setAttribute("fill", "currentColor");
    icon.append(ip);
    badge.append(icon);
    const titles = this.#el("div");
    const agent = agentLabel(v.agentName, v.agentId ?? "");
    const h2 = this.#el("h2", void 0, v.kind === "attach" ? `${agent} wants to control this page` : `${agent} wants to run an action`);
    h2.id = "reins-consent-title";
    const sub = this.#el("p", "sub", `${truncate(v.appName, 60)} \xB7 AI agent request`);
    titles.append(h2, sub);
    head.append(badge, titles);
    card.append(head);
    const body = this.#el("div", "body");
    card.append(body);
    if (v.unverifiedHub) {
      body.append(
        this.#el(
          "p",
          "warn",
          "Unverified hub: this page cannot confirm that this request comes from your Reins hub. Any program on this computer could be sending it. Allow only if you started this agent yourself."
        )
      );
    }
    if (v.kind === "attach") {
      body.append(this.#el("p", "lead", "It asks to:"));
      const ul = this.#el("ul");
      for (const s of v.scopes ?? []) {
        const li = this.#el("li");
        li.append(this.#el("span", "k", s), this.#el("span", void 0, SCOPE_MEANING[s] ?? s));
        ul.append(li);
      }
      body.append(ul);
      if (v.kept && v.kept.length) {
        const kept = this.#el("div", "kept");
        kept.append(this.#el("p", "lead", v.keptWhy ?? "What you set before stays for this agent:"));
        const kl = this.#el("ul");
        for (const line2 of v.kept) kl.append(this.#el("li", void 0, visible(truncate(line2, 120))));
        kept.append(kl);
        body.append(kept);
      }
    } else if (v.action) {
      const name2 = this.#el("p", "action", truncate(v.action.name, 80));
      if (v.action.risk !== "safe") name2.append(this.#el("span", `risk ${v.action.risk}`, v.action.risk));
      body.append(name2);
      if (v.action.description) body.append(this.#el("p", "desc", truncate(v.action.description, 300)));
      if (prompt.argsText !== void 0) {
        const pre = this.#el("pre");
        const lines = prompt.argsText.split("\n");
        lines.forEach((line2, i) => pre.append(this.#el("span", "ln", i < lines.length - 1 ? `${line2}
` : line2)));
        body.append(pre);
      }
    }
    if (v.reason) body.append(this.#el("p", "reason", `\u201C${visible(truncate(v.reason, 240))}\u201D`));
    const more = this.#el("p", "more", "Scroll to the end to review everything before allowing.");
    more.hidden = true;
    const foot = this.#el("div", "foot");
    const timer = this.#el("span", "timer");
    this.#queueNote = this.#el("span", "queue");
    let finished = false;
    const shownAt = tick();
    const deadline = shownAt + prompt.timeoutMs;
    const over = () => {
      if (finished) return true;
      if (tick() < deadline) return false;
      close("timeout");
      return true;
    };
    let armedAt = 0;
    let armTimer;
    let seenEnd = false;
    const overflows = () => body.scrollHeight - body.clientHeight > 2;
    const unread = () => overflows() && !seenEnd;
    const arming = () => tick() < armedAt;
    const waiting = () => arming() || unread();
    let keysAt = shownAt + ALLOW_ARM_MS;
    let lockUntil = this.#typedAt + KEY_LOCK_MS;
    if (lockUntil > keysAt) keysAt = lockUntil;
    let keyOff = false;
    let keyTimer;
    let keysNote = null;
    const buttons = [];
    const keysOpen = () => tick() >= keysAt;
    const showKeys = () => {
      if (finished) return;
      const locked = tick() < lockUntil;
      if (locked && !keysNote) {
        keysNote = this.#el("p", "keys", KEYS_NOTE);
        keysNote.setAttribute("role", "status");
        card.insertBefore(keysNote, foot);
      }
      if (keysNote) keysNote.hidden = !locked;
      refresh();
      if (keyTimer) {
        cancelLater(keyTimer);
        this.#timers.delete(keyTimer);
        keyTimer = void 0;
      }
      const left = Math.max(keysAt, lockUntil) - tick();
      if (left > 0) {
        keyTimer = this.#later(() => {
          keyTimer = void 0;
          showKeys();
        }, left + 5);
      }
    };
    const delay = (ms) => {
      const t = tick() + ms;
      if (t > keysAt) keysAt = t;
      showKeys();
    };
    const lock = () => {
      lockUntil = tick() + KEY_LOCK_MS;
      delay(KEY_LOCK_MS);
    };
    const fromRefusedKey = (e) => keyOff && e.detail === 0;
    const deny = this.#button("Deny", "", (e) => {
      if (fromRefusedKey(e) || over()) return;
      close("deny");
    });
    let heldNote = null;
    const showHeld = () => {
      if (heldNote || finished) return;
      heldNote = this.#el("p", "held", HELD_NOTE);
      heldNote.setAttribute("role", "status");
      card.insertBefore(heldNote, foot);
    };
    this.#cardHeld = showHeld;
    const approving = [];
    const keyWait = (b) => {
      if (keysOpen() || this.#root.activeElement !== b) return false;
      try {
        return b.matches(":focus-visible");
      } catch {
        return false;
      }
    };
    const refresh = () => {
      const wait = waiting();
      for (const b of approving) {
        const w = wait || keyWait(b);
        b.classList.toggle("wait", w);
        if (w) b.setAttribute("aria-disabled", "true");
        else b.removeAttribute("aria-disabled");
      }
      more.hidden = !unread();
      if (overflows()) body.tabIndex = 0;
    };
    const allow = this.#button("Allow", "primary", (e) => {
      if (fromRefusedKey(e) || over() || waiting() || !this.#mayLoosen()) return;
      close("allow");
    });
    approving.push(allow);
    const extra = [];
    let alwaysNote = null;
    if (v.kind === "action" && v.action && v.always) {
      alwaysNote = this.#el(
        "p",
        "always",
        `Always allow ${truncate(v.action.name, 80)} for ${agent}? It will then run without asking you, with any arguments, until this agent disconnects. You can change this from the "AI connected" indicator.`
      );
      alwaysNote.hidden = true;
      const note = alwaysNote;
      const step = (on) => {
        note.hidden = !on;
        always.hidden = on;
        allow.hidden = on;
        back.hidden = !on;
        confirmAlways.hidden = !on;
        if (rememberNote) rememberNote.hidden = on;
        arm();
        delay(ALLOW_ARM_MS);
        try {
          card.focus({ preventScroll: true });
        } catch {
        }
      };
      const always = this.#button("Always allow", "", (e) => {
        if (fromRefusedKey(e) || over() || waiting() || !this.#mayLoosen()) return;
        step(true);
      });
      const back = this.#button("Back", "", (e) => {
        if (fromRefusedKey(e) || over()) return;
        step(false);
      });
      back.hidden = true;
      const confirmAlways = this.#button("Always allow", "primary", (e) => {
        if (fromRefusedKey(e) || over() || waiting() || !this.#mayLoosen()) return;
        close("always");
      });
      confirmAlways.hidden = true;
      approving.push(always, confirmAlways);
      extra.push(always, back, confirmAlways);
    }
    let rememberNote = null;
    if (v.kind === "action" && v.action && v.remembers) {
      rememberNote = this.#el("p", "remember", `Allow is remembered: ${agent} may then run ${truncate(v.action.name, 80)} again without asking, with any arguments, until it disconnects. The "AI connected" indicator shows it, and you can take it back there.`);
    }
    buttons.push(deny, ...extra, allow);
    listen(
      body,
      "scroll",
      () => {
        if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) seenEnd = true;
        refresh();
      },
      { passive: true }
    );
    const arm = () => {
      armedAt = tick() + ALLOW_ARM_MS;
      if (armTimer) {
        cancelLater(armTimer);
        this.#timers.delete(armTimer);
      }
      armTimer = this.#later(() => {
        armTimer = void 0;
        armedAt = 0;
        refresh();
      }, ALLOW_ARM_MS);
      refresh();
    };
    arm();
    this.#armAllow = () => {
      arm();
      delay(ALLOW_ARM_MS);
    };
    foot.append(timer, this.#queueNote, deny, ...extra, allow);
    card.append(more);
    if (alwaysNote) card.append(alwaysNote);
    if (rememberNote) card.append(rememberNote);
    card.append(foot);
    this.#updateQueueNote();
    const countdown = () => {
      if (over()) return;
      const left = Math.max(0, Math.ceil((deadline - tick()) / 1e3));
      timer.textContent = `Denies automatically in ${left} s`;
    };
    const interval = every(countdown, 1e3);
    const timeout = this.#later(() => close("timeout"), prompt.timeoutMs);
    const onKey = (e, inside) => {
      if (over()) return;
      const k = e.key;
      const target = inside ? e.target : null;
      const onButton = target !== null && buttons.includes(target);
      const activates = k === "Enter" || k === " " || k === "Spacebar";
      const answers = inside && activates && onButton || k === "Escape" && !this.#panelFocused();
      if (answers && !e.repeat && keysOpen()) {
        keyOff = false;
        return;
      }
      if (typesText(e, onButton)) lock();
      else delay(ALLOW_ARM_MS);
      if (!inside) return;
      if (k === "Tab" && tick() < shownAt + ALLOW_ARM_MS) prevent(e);
      if (activates && onButton) {
        keyOff = true;
        prevent(e);
      }
    };
    let seenKey = null;
    const noteKey = (e, inside) => {
      if (seenKey === e) return;
      seenKey = e;
      onKey(e, inside);
    };
    this.#cardKey = (e) => noteKey(e, false);
    listen(card, "keydown", (e) => {
      if (trustedAt(e, card)) noteKey(e, true);
    }, true);
    listen(card, "keyup", (e) => {
      if (trustedAt(e, card)) this.#later(() => keyOff = false, 0);
    }, true);
    listen(card, "focusin", (e) => {
      if (buttons.includes(e.target)) delay(ALLOW_ARM_MS);
    });
    const escape2 = (e) => {
      if (this.#panelFocused() || e.key !== "Escape") return;
      prevent(e);
      stop(e);
      if (e.repeat || !keysOpen() || over()) return;
      close("deny");
    };
    const onCardKey = (e) => {
      stop(e);
      if (!trustedAt(e, card)) return;
      noteKey(e, true);
      escape2(e);
    };
    const onDocKey = (e) => {
      if (!trustedAt(e, doc) || e.key !== "Escape") return;
      noteKey(e, card.contains(this.#root.activeElement));
      escape2(e);
    };
    listen(card, "keydown", onCardKey);
    listen(doc, "keydown", onDocKey, true);
    listen(backdrop, "click", stop);
    const win = doc.defaultView;
    if (win) listen(win, "resize", refresh, { passive: true });
    const close = (outcome, withdrawn = false) => {
      if (finished) return;
      finished = true;
      cancelEvery(interval);
      cancelLater(timeout);
      this.#timers.delete(timeout);
      if (armTimer) {
        cancelLater(armTimer);
        this.#timers.delete(armTimer);
      }
      if (keyTimer) {
        cancelLater(keyTimer);
        this.#timers.delete(keyTimer);
      }
      this.#armAllow = null;
      if (this.#cardHeld === showHeld) this.#cardHeld = null;
      if (this.#cardEl === card) {
        this.#cardEl = null;
        this.#cardKey = null;
      }
      this.#observe(card, false);
      unlisten(doc, "keydown", onDocKey, true);
      if (win) unlisten(win, "resize", refresh);
      this.#current = null;
      this.#queueNote = null;
      if (withdrawn && !this.#destroyed) this.#withdrawn(backdrop, card);
      else backdrop.remove();
      this.#arrange();
      this.#showChip();
      this.#panel.settle();
      prompt.resolve(outcome);
      let back = null;
      if (previousInner && previousInner.isConnected && this.#root.contains(previousInner)) back = previousInner;
      else if (previousKey !== null) back = Array.from(this.#root.querySelectorAll("[data-k]")).find((x) => x.getAttribute("data-k") === previousKey) ?? null;
      if (!back && previousInner && this.#panel.isOpen) back = this.#openBtn;
      if (!back && previous && previous !== this.host && previous.isConnected) back = previous;
      try {
        if (back && typeof back.focus === "function") back.focus({ preventScroll: true });
      } catch {
      }
      if (this.#prompts.length && !this.#hold) this.#next();
    };
    this.#current = { prompt, deadline, close };
    this.#cardEl = card;
    this.#root.insertBefore(backdrop, this.#pill);
    this.#observe(card, true);
    this.#arrange();
    this.#showChip();
    countdown();
    showKeys();
    try {
      card.focus({ preventScroll: true });
    } catch {
    }
  }
  /**
   * Replace a withdrawn prompt's card with a "Request withdrawn" notice that has no Allow
   * button, and hold any next card back for WITHDRAWN_MS: a click or key press aimed at the
   * old card cannot approve a different request that appears in its place.
   */
  #withdrawn(backdrop, card) {
    if (this.#hold) {
      cancelLater(this.#hold.timer);
      this.#timers.delete(this.#hold.timer);
      this.#hold.backdrop.remove();
    }
    card.className = "card withdrawn";
    card.removeAttribute("aria-labelledby");
    card.setAttribute("aria-label", "Request withdrawn");
    const head = this.#el("div", "head");
    const titles = this.#el("div");
    titles.append(this.#el("h2", void 0, "Request withdrawn"), this.#el("p", "sub", "The agent withdrew this request. Nothing was approved."));
    head.append(titles);
    card.replaceChildren(head);
    const hold = {
      backdrop,
      until: tick() + WITHDRAWN_MS,
      timer: this.#later(() => this.#endHold(hold), WITHDRAWN_MS)
    };
    this.#hold = hold;
    this.#showChip();
  }
  /** The "Request withdrawn" notice has had its time: it goes, and the next card may come. */
  #endHold(hold) {
    if (this.#hold !== hold) return;
    cancelLater(hold.timer);
    this.#timers.delete(hold.timer);
    this.#hold = null;
    hold.backdrop.remove();
    this.#arrange();
    this.#showChip();
    this.#panel.settle();
    if (this.#prompts.length && !this.#current) this.#next();
  }
  // ───────── toasts and highlights ─────────
  /** A toast always carries a caption naming the agent, so it cannot pass as the app's or the browser's. */
  toast(text, kind, ms, from) {
    this.#sweep();
    if (this.#current !== null || this.#hold !== null) return;
    const t = this.#el("div", `toast ${kind}`);
    t.append(this.#el("span", "from", `From AI agent ${visible(truncate(from || "unnamed", 40))}`), this.#el("span", "msg", visibleLines(text)));
    this.#toasts.append(t);
    this.#toastList.push({ el: t, until: tick() + ms + 320 });
    while (this.#toastList.length > 4) this.#dropToast(this.#toastList[0].el);
    this.#later(() => {
      t.classList.add("out");
      this.#later(() => this.#dropToast(t), 320);
    }, ms);
  }
  #dropToast(el) {
    el.remove();
    const i = this.#toastList.findIndex((x) => x.el === el);
    if (i >= 0) this.#toastList.splice(i, 1);
  }
  highlight(target, label, ms) {
    this.#sweep();
    if (this.#current !== null || this.#hold !== null) return;
    const existing = this.#highlights.find((h2) => h2.target === target);
    if (existing) this.#dropHighlight(existing);
    const box = this.#el("div", "hl");
    box.append(this.#el("span", "tag", visible(label)));
    this.#tint(box);
    this.#hls.append(box);
    const h = { target, box, until: tick() + ms + 260, timer: this.#later(() => this.#dropHighlight(h, true), ms) };
    this.#highlights.push(h);
    if (this.#highlights.length === 1) {
      const win = this.#doc.defaultView;
      if (win) {
        listen(win, "scroll", this.#onScroll, { capture: true, passive: true });
        listen(win, "resize", this.#onScroll, { passive: true });
      }
    }
    this.#placeHighlights();
  }
  #dropHighlight(h, fade = false) {
    cancelLater(h.timer);
    this.#timers.delete(h.timer);
    const i = this.#highlights.indexOf(h);
    if (i >= 0) this.#highlights.splice(i, 1);
    if (fade) {
      h.box.classList.add("out");
      this.#later(() => h.box.remove(), 260);
    } else h.box.remove();
    if (!this.#highlights.length) {
      const win = this.#doc.defaultView;
      if (win) {
        unlisten(win, "scroll", this.#onScroll, { capture: true });
        unlisten(win, "resize", this.#onScroll);
      }
    }
  }
  #placeHighlights() {
    for (const h of [...this.#highlights]) {
      if (!h.target.isConnected) {
        this.#dropHighlight(h);
        continue;
      }
      const r = h.target.getBoundingClientRect();
      const s = h.box.style;
      s.setProperty("transform", `translate(${(r.left - 4).toFixed(1)}px,${(r.top - 4).toFixed(1)}px)`);
      s.setProperty("width", `${(r.width + 8).toFixed(1)}px`);
      s.setProperty("height", `${(r.height + 8).toFixed(1)}px`);
    }
  }
  clear() {
    for (const h of [...this.#highlights]) this.#dropHighlight(h);
    this.#toasts.replaceChildren();
    this.#toastList = [];
  }
};

// packages/driver/src/driver.ts
var MAX_KEPT_CREDS = 256;
var DEFAULT_HUB = `ws://127.0.0.1:${DEFAULT_PORT}/`;
var TARGET_MAX = 130;
var MAX_TEXT = 1e4;
var MAX_READ = 8e3;
var UI_EVENT_INTERVAL_MS = 100;
var NAV_POLL_MS = 1e3;
var MAX_PROMPTS = 4;
var OVERLAY_CHECK_CACHE_MS = 250;
var ACTIVITY_DRAW_MS = 200;
var COOL_OFF_BASE_MS = 2e3;
var COOL_OFF_MAX_MS = 6e4;
var REVOKE_AFTER_DENIALS = 3;
var MAX_COOL_OFF_ENTRIES = 64;
function hasOwn2(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}
function isObj(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function bad3(msg) {
  throw new ReinsError("E_BAD_ARGS", msg);
}
function get(p, k) {
  return hasOwn2(p, k) ? p[k] : void 0;
}
function optStr3(p, k, max) {
  const v = get(p, k);
  if (v === void 0) return void 0;
  if (typeof v !== "string") bad3(`${k}: expected string`);
  if (v.length > max) bad3(`${k}: longer than ${max}`);
  return v;
}
function reqStr2(p, k, max) {
  const v = optStr3(p, k, max);
  if (v === void 0) bad3(`${k}: required`);
  return v;
}
function optNum(p, k, min, max, int2 = false) {
  const v = get(p, k);
  if (v === void 0) return void 0;
  if (typeof v !== "number" || !Number.isFinite(v)) bad3(`${k}: expected number`);
  if (int2 && !Number.isInteger(v)) bad3(`${k}: expected integer`);
  if (v < min || v > max) bad3(`${k}: out of range`);
  return v;
}
function optBool(p, k) {
  const v = get(p, k);
  if (v === void 0) return void 0;
  if (typeof v !== "boolean") bad3(`${k}: expected boolean`);
  return v;
}
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
function jsonClone(v) {
  if (v === void 0) return v;
  const s = JSON.stringify(v);
  return s === void 0 ? void 0 : JSON.parse(s);
}
var EDIT_KEYS = /* @__PURE__ */ new Set(["Backspace", "Delete", "Space"]);
function isReadOnly(el) {
  return el.readOnly === true || el.getAttribute("aria-readonly") === "true";
}
function hasPrivateInside(el) {
  for (const e of Array.from(el.querySelectorAll("*"))) if (isPrivateSelf(e)) return true;
  return false;
}
function fromHandler(e, what) {
  if (e instanceof ReinsError) return e;
  if (isObj(e) || e instanceof Error) {
    const o = e;
    if (o.name === "ReinsError" && typeof o.code === "string" && ERROR_CODES.includes(o.code) && typeof o.message === "string") {
      return new ReinsError(o.code, o.message.slice(0, 200));
    }
  }
  console.error(`[reins] ${what} failed:`, e);
  return new ReinsError("E_INTERNAL", `${what} failed`);
}
function resultJson(v) {
  if (v === void 0) return void 0;
  let s;
  try {
    s = JSON.stringify(v);
  } catch {
    throw new ReinsError("E_INTERNAL", "result is not JSON");
  }
  if (s === void 0) return void 0;
  if (utf8Length(s) > MAX_RESULT_BYTES) throw new ReinsError("E_TOO_LARGE", "result larger than 32 KiB");
  return JSON.parse(s);
}
var ReinsDriver = class {
  #o;
  #policy;
  #win;
  #doc;
  #root = null;
  #actions = /* @__PURE__ */ new Map();
  #views = /* @__PURE__ */ new Map();
  #states = /* @__PURE__ */ new Map();
  #manifest = null;
  #listeners = /* @__PURE__ */ new Map();
  // connection
  #want = false;
  #conn = "idle";
  #epoch = 0;
  #link = null;
  #peer = null;
  #limits = DEFAULT_LIMITS;
  #linkUsed = false;
  #attempt = 0;
  #retryTimer = null;
  #hbTimer = null;
  #pinging = false;
  #waiter = null;
  #connecting = null;
  #lastStatus = "idle";
  // sessions and page state
  #sessions = /* @__PURE__ */ new Map();
  #streams = /* @__PURE__ */ new Map();
  #paused = false;
  #tree;
  #frames;
  #queue;
  #overlay = null;
  #motion = null;
  #human;
  #cursorOn = false;
  #cursorLabelSet = false;
  /** The agent that last showed or moved the cursor. */
  #cursorAg;
  /** The last commands, newest last, for the Activity tab: names and outcomes only. */
  #activity = [];
  #activityTimer = null;
  #activityDrawn = -Infinity;
  /** The app's actions with the policy's decision for each, as the panel lists them. */
  #panelActions = null;
  /** The page's chat room. It lives as long as this driver, in memory only. */
  #room;
  /**
   * Whether this surface has chat at all: the policy grants the scope, and there is a panel
   * the person can open. Without a place to read and answer, no grant gets `chat`.
   */
  #chatOn;
  #chatTimer = null;
  /** App actions an agent asked for that are running now: the chat composer takes no input meanwhile. */
  #chatHeld = 0;
  #consentChain = Promise.resolve();
  /** Consent prompts pending per agent. */
  #asking = /* @__PURE__ */ new Map();
  #askingTotal = 0;
  /** Cool-off after refused action prompts, per agent (see COOL_OFF_*). */
  #coolOff = /* @__PURE__ */ new Map();
  /** Cool-off after refused attach prompts, one for the whole surface. */
  #attachCoolOff = { until: 0, level: 0, denials: 0 };
  /** Whether the current hub connection is verified (see `hubVerified`). */
  #hubVerified = false;
  /** Stop was used on this page: every later attach needs at least `confirm`. */
  #stopped = false;
  /** What the person tightened, by credential id (`''`: the agents this surface cannot tell apart). */
  #kept = /* @__PURE__ */ new Map();
  /** More credentials came than are kept apart: what is kept under `''` then holds for every agent. */
  #keptShared = false;
  /** The hub changed what the room relays and the person's switch went with it: the Chat tab says so until they have seen it. */
  #relayReset = false;
  /** Consent requests an app's own handler has not answered yet, each with its deadline by the clock. */
  #customAsks = /* @__PURE__ */ new Set();
  #refreshDue = 0;
  #activityDue = 0;
  #stopGen = 0;
  #overlayOkAt = -Infinity;
  #overlayOk = true;
  // DOM watching
  #domOn = false;
  #mo = null;
  #refreshTimer = null;
  #uiTimer = null;
  #uiSentRev = -1;
  #uiSentAt = -Infinity;
  #navTimer = null;
  #navUrl = "";
  #navTitle = "";
  #timers = /* @__PURE__ */ new Set();
  #onDomChange = () => this.#scheduleRefresh();
  /**
   * Keep privacy sticky: an element that was private when it changed stays private, and a
   * text entry that takes the place of a removed private field is private too. Removals are
   * noted before insertions, so a swap within one record is recognised.
   */
  #onMutations = (records) => {
    for (const r of records) {
      if (r.type !== "childList") continue;
      const parent = r.target.nodeType === 1 ? r.target : null;
      for (const n of Array.from(r.removedNodes)) if (n.nodeType === 1) notePrivateRemoved(n, parent);
    }
    for (const r of records) {
      if (r.type === "attributes") {
        const t = r.target;
        if (wasPrivateAttr(t, r.attributeName, r.oldValue)) markPrivate(t, r.attributeName !== "data-reins");
      } else if (r.type === "childList") {
        const parent = r.target.nodeType === 1 ? r.target : null;
        for (const n of Array.from(r.addedNodes)) if (n.nodeType === 1) notePrivateAdded(n, parent);
      }
    }
    this.#scheduleRefresh();
  };
  /** Handle mutations not yet delivered, so the tree never sees a change before its privacy note. */
  #flushMutations() {
    const mo = this.#mo;
    if (!mo || typeof mo.takeRecords !== "function") return;
    const recs = mo.takeRecords();
    if (recs.length) this.#onMutations(recs);
  }
  #onNav = () => this.#checkNav();
  #onVisibility = () => {
    if (!this.#frames.live) this.#motion?.finish();
  };
  constructor(options) {
    if (!isObj(options) || !isObj(options.app)) throw new ReinsError("E_BAD_ARGS", "createDriver: options.app is required");
    this.#o = { ...options };
    this.#policy = resolvePolicy(options.policy);
    if (this.#policy.profile === "kiosk" && options.link === void 0 && !this.#hasKey) {
      throw new ReinsError("E_BAD_ARGS", "createDriver: the kiosk profile needs options.key (the surface key) to verify the hub, or an app-built options.link");
    }
    const doc = options.root?.ownerDocument ?? globalThis.document;
    if (!doc || !doc.defaultView) throw new Error("@offensiveadhd/reins/driver needs a browser document");
    this.#doc = doc;
    this.#win = doc.defaultView;
    this.#chatOn = this.#policy.scopes.includes("chat") && this.#policy.human.panel && options.indicator !== false;
    this.#room = new ChatRoom("off");
    this.#frames = new Frames(this.#win);
    this.#queue = new CommandQueue(this.#frames);
    this.#tree = new UiTree({
      root: () => this.#root,
      exposure: this.#policy.exposure,
      isOverlay: (el) => this.#overlay !== null && this.#overlay.isOverlay(el)
    });
    this.#human = new HumanWatch(
      this.#win,
      () => this.#policy.human.yieldMs,
      () => this.#onHumanBurst(),
      (e) => this.#overlay !== null && typeof e.composedPath === "function" && e.composedPath().includes(this.#overlay.host)
    );
  }
  // ───────── registration ─────────
  #checkOpen(kind, name2) {
    if (this.#want || this.#manifest) throw new Error(`@offensiveadhd/reins/driver: register ${kind}s before connect()`);
    if (typeof name2 !== "string") throw new ReinsError("E_BAD_ARGS", `${kind} name must be a string`);
  }
  action(def, handler) {
    this.#checkOpen("action", def?.name);
    if (this.#actions.has(def.name)) throw new ReinsError("E_BAD_ARGS", `duplicate action ${def.name}`);
    if (typeof handler !== "function") throw new ReinsError("E_BAD_ARGS", "action handler must be a function");
    this.#actions.set(def.name, { def: jsonClone(def), run: handler });
    return this;
  }
  view(def, render) {
    this.#checkOpen("view", def?.name);
    if (this.#views.has(def.name)) throw new ReinsError("E_BAD_ARGS", `duplicate view ${def.name}`);
    if (typeof render !== "function") throw new ReinsError("E_BAD_ARGS", "view renderer must be a function");
    this.#views.set(def.name, { def: jsonClone(def), run: render });
    return this;
  }
  state(name2, getter, description) {
    this.#checkOpen("state", name2);
    if (this.#states.has(name2)) throw new ReinsError("E_BAD_ARGS", `duplicate state ${name2}`);
    if (typeof getter !== "function") throw new ReinsError("E_BAD_ARGS", "state getter must be a function");
    const def = { name: name2 };
    if (description !== void 0) def.description = description;
    this.#states.set(name2, { def, get: getter });
    return this;
  }
  #buildManifest() {
    return validateManifest({
      reins: PROTOCOL_VERSION,
      app: this.#o.app,
      actions: [...this.#actions.values()].map((a) => a.def),
      views: [...this.#views.values()].map((v) => v.def),
      state: [...this.#states.values()].map((s) => s.def),
      exposure: this.#policy.exposure,
      profile: this.#policy.profile
    });
  }
  get manifest() {
    return jsonClone(this.#manifest ?? this.#buildManifest());
  }
  get policy() {
    return jsonClone(this.#policy);
  }
  get hubVerified() {
    return this.#hubVerified;
  }
  agents() {
    return [...this.#sessions.values()].map((s) => ({
      agent: { ...s.agent },
      level: s.level,
      scopes: [...s.scopes],
      granted: [...s.granted],
      rules: Object.fromEntries(s.rules)
    }));
  }
  get #hasKey() {
    return typeof this.#o.key === "string" && this.#o.key.length > 0;
  }
  // ───────── events ─────────
  on(event, fn) {
    let set = this.#listeners.get(event);
    if (!set) this.#listeners.set(event, set = /* @__PURE__ */ new Set());
    set.add(fn);
    return () => set.delete(fn);
  }
  #emit(event, e) {
    for (const fn of [...this.#listeners.get(event) ?? []]) {
      try {
        fn(e);
      } catch (err) {
        console.error("[reins] listener failed:", err);
      }
    }
  }
  get status() {
    if (this.#conn !== "ready") return this.#conn;
    if (this.#paused) return "paused";
    return this.#sessions.size ? "controlled" : "ready";
  }
  #statusChanged() {
    const s = this.status;
    if (s === this.#lastStatus) return;
    this.#lastStatus = s;
    this.#emit("status", s);
  }
  #setConn(c) {
    this.#conn = c;
    this.#statusChanged();
  }
  // ───────── connection ─────────
  connect() {
    if (this.#connecting) return this.#connecting;
    if (!this.#policy.framed && this.#framed) {
      return Promise.reject(new ReinsError("E_DENIED", "this page is inside a frame, where the page around it could cover the consent prompt; open it in its own tab, or set policy.framed"));
    }
    try {
      this.#manifest = this.#buildManifest();
    } catch (e) {
      return Promise.reject(e);
    }
    this.#want = true;
    this.#root = this.#o.root ?? this.#doc.body ?? this.#doc.documentElement;
    this.#startDom();
    this.#connecting = new Promise((resolve, reject) => {
      this.#waiter = { resolve, reject };
    });
    this.#connecting.catch(() => {
    });
    void this.#tryOpen();
    return this.#connecting;
  }
  /** The driver's document is not the top-level one of its tab. A window that cannot be asked counts as framed. */
  get #framed() {
    try {
      return this.#win.top !== this.#win;
    } catch {
      return true;
    }
  }
  get #ownsSocket() {
    return this.#o.link === void 0;
  }
  async #tryOpen() {
    this.#retryTimer = null;
    try {
      await this.#open();
      this.#attempt = 0;
      const w = this.#waiter;
      this.#waiter = null;
      w?.resolve();
    } catch (e) {
      if (!this.#want) return;
      this.#setConn("offline");
      if (this.#ownsSocket && this.#o.reconnect !== false) this.#scheduleRetry();
      else {
        const w = this.#waiter;
        this.#waiter = null;
        w?.reject(e);
      }
    }
  }
  #scheduleRetry() {
    if (!this.#want || this.#retryTimer) return;
    const base = Math.min(1e4, 500 * 2 ** Math.min(this.#attempt, 5));
    this.#attempt++;
    const delay = base + Math.random() * Math.min(1e3, base * 0.3);
    this.#retryTimer = setTimeout(() => void this.#tryOpen(), delay);
  }
  async #open() {
    const epoch = ++this.#epoch;
    this.#hubVerified = false;
    this.#setConn("connecting");
    let link;
    if (this.#o.link) {
      if (this.#linkUsed) throw new ReinsError("E_GONE", "link already used");
      this.#linkUsed = true;
      link = this.#o.link;
    } else {
      const WS = this.#win.WebSocket ?? globalThis.WebSocket;
      if (typeof WS !== "function") throw new ReinsError("E_GONE", "WebSocket unavailable");
      link = await wsLink(new WS(this.#o.hub ?? DEFAULT_HUB, WS_SUBPROTOCOL));
    }
    if (epoch !== this.#epoch || !this.#want) {
      link.close();
      throw new ReinsError("E_GONE", "connection superseded");
    }
    this.#link = link;
    const manifest = this.#manifest;
    const hello = {
      role: "surface",
      name: this.#o.app.name,
      kid: this.#o.app.id,
      surface: { manifest, url: this.#win.location.href, title: this.#doc.title }
    };
    if (this.#o.key !== void 0) hello.key = this.#o.key;
    const conn = await clientConnect(link, hello);
    const welcome = conn.welcome;
    link = conn.link;
    this.#link = link;
    if (epoch !== this.#epoch || !this.#want) {
      link.close();
      throw new ReinsError("E_GONE", "connection superseded");
    }
    this.#hubVerified = this.#o.link !== void 0 || conn.sealed;
    this.#limits = { ...DEFAULT_LIMITS, ...welcome.limits };
    this.#navUrl = this.#win.location.href;
    this.#navTitle = this.#doc.title;
    this.#peer = new Peer(
      link,
      {
        request: (m, p, f) => this.#request(m, p, f),
        binary: (b) => this.#onBinary(b),
        close: () => this.#onClose(epoch)
      },
      { limits: this.#limits }
    );
    this.#startHeartbeat();
    this.#setConn("ready");
  }
  #startHeartbeat() {
    this.#stopHeartbeat();
    const hb = this.#limits.heartbeatMs > 0 ? this.#limits.heartbeatMs : DEFAULT_LIMITS.heartbeatMs;
    this.#hbTimer = setInterval(() => {
      const peer = this.#peer;
      if (!peer || peer.closed) return;
      const idle = Date.now() - peer.lastSeen;
      if (idle > 2.5 * hb) {
        this.#link?.close();
        return;
      }
      if (idle >= hb && !this.#pinging) {
        this.#pinging = true;
        peer.ping(hb).catch(() => {
        }).finally(() => this.#pinging = false);
      }
    }, clamp(hb / 3, 250, 5e3));
  }
  #stopHeartbeat() {
    if (this.#hbTimer) clearInterval(this.#hbTimer);
    this.#hbTimer = null;
    this.#pinging = false;
  }
  #onClose(epoch) {
    if (epoch !== this.#epoch) return;
    this.#peer = null;
    this.#link = null;
    this.#stopHeartbeat();
    this.#dropAll("hub");
    if (!this.#want) return;
    this.#setConn("offline");
    if (this.#ownsSocket && this.#o.reconnect !== false) this.#scheduleRetry();
  }
  disconnect() {
    const wasWanted = this.#want;
    this.#want = false;
    this.#epoch++;
    if (this.#retryTimer) clearTimeout(this.#retryTimer);
    this.#retryTimer = null;
    this.#stopHeartbeat();
    const peer = this.#peer;
    this.#peer = null;
    const link = this.#link;
    this.#link = null;
    this.#dropAll("hub", false);
    try {
      if (peer && !peer.closed) peer.bye("OK");
      else link?.close();
    } catch {
    }
    const w = this.#waiter;
    this.#waiter = null;
    w?.reject(new ReinsError("E_GONE", "disconnected"));
    this.#connecting = null;
    this.#stopDom();
    this.#queue.close();
    this.#queue.reopen();
    if (wasWanted || this.#conn !== "idle") this.#setConn("idle");
  }
  // ───────── DOM watching ─────────
  #startDom() {
    if (this.#domOn) return;
    this.#domOn = true;
    this.#overlay = new Overlay(
      this.#doc,
      {
        pause: () => this.pause(),
        resume: () => this.resume(),
        stop: () => this.stop(),
        setLevel: (ag, level) => this.#setLevel(ag, level),
        setRule: (ag, action, rule2) => this.#setRule(ag, action, rule2),
        setScope: (ag, scope, on) => this.#setScope(ag, scope, on),
        disconnect: (ag) => this.#disconnectOne(ag),
        say: (text, to) => this.#personSay(text, to),
        relay: (ags, on) => this.#setRelay(ags, on),
        // Typing to the agent is using the page: synthetic input yields to it (SPEC 12, human control).
        typing: () => this.#human.mark()
      },
      { chat: this.#chatOn }
    );
    this.#overlay.mount();
    this.#motion = new CursorMotion(this.#frames, this.#overlay, () => this.#vp());
    this.#refreshIndicator();
    this.#overlay.activity(this.#activity);
    this.#drawChat();
    const root = this.#root;
    notePrivate(root);
    if (root && typeof this.#win.MutationObserver === "function") {
      this.#mo = new this.#win.MutationObserver(this.#onMutations);
      this.#mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true });
    }
    root?.addEventListener("input", this.#onDomChange, true);
    root?.addEventListener("change", this.#onDomChange, true);
    this.#doc.addEventListener("focusin", this.#onDomChange, true);
    this.#doc.addEventListener("focusout", this.#onDomChange, true);
    this.#doc.addEventListener("visibilitychange", this.#onVisibility);
    this.#win.addEventListener("popstate", this.#onNav);
    this.#win.addEventListener("hashchange", this.#onNav);
    this.#navTimer = setInterval(this.#onNav, NAV_POLL_MS);
    this.#human.start();
  }
  #stopDom() {
    if (!this.#domOn) return;
    this.#domOn = false;
    this.#mo?.disconnect();
    this.#mo = null;
    const root = this.#root;
    root?.removeEventListener("input", this.#onDomChange, true);
    root?.removeEventListener("change", this.#onDomChange, true);
    this.#doc.removeEventListener("focusin", this.#onDomChange, true);
    this.#doc.removeEventListener("focusout", this.#onDomChange, true);
    this.#doc.removeEventListener("visibilitychange", this.#onVisibility);
    this.#win.removeEventListener("popstate", this.#onNav);
    this.#win.removeEventListener("hashchange", this.#onNav);
    if (this.#navTimer) clearInterval(this.#navTimer);
    this.#navTimer = null;
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#refreshTimer = null;
    if (this.#uiTimer) clearTimeout(this.#uiTimer);
    this.#uiTimer = null;
    for (const t of this.#timers) clearTimeout(t);
    this.#timers.clear();
    if (this.#activityTimer) clearTimeout(this.#activityTimer);
    this.#activityTimer = null;
    if (this.#chatTimer) clearTimeout(this.#chatTimer);
    this.#chatTimer = null;
    this.#human.stop();
    this.#motion?.stop();
    this.#motion = null;
    this.#overlay?.destroy();
    this.#overlay = null;
    this.#cursorOn = false;
    this.#cursorLabelSet = false;
    this.#cursorAg = void 0;
  }
  #later(fn, ms) {
    const t = setTimeout(() => {
      this.#timers.delete(t);
      fn();
    }, ms);
    this.#timers.add(t);
  }
  #vp() {
    const de = this.#doc.documentElement;
    return [Math.round(this.#win.innerWidth || de?.clientWidth || 0), Math.round(this.#win.innerHeight || de?.clientHeight || 0)];
  }
  #scheduleRefresh() {
    if (!this.#domOn) return;
    if (this.#refreshTimer && Date.now() < this.#refreshDue + 1e3) return;
    if (this.#refreshTimer) clearTimeout(this.#refreshTimer);
    this.#refreshTimer = null;
    let wanted = false;
    for (const s of this.#sessions.values()) if (this.#hears(s, "ui")) wanted = true;
    if (!wanted) return;
    this.#refreshDue = Date.now() + UI_EVENT_INTERVAL_MS;
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = null;
      this.#refresh();
      this.#checkNav();
    }, UI_EVENT_INTERVAL_MS);
  }
  /** Rebuild the tree; tell subscribers when the revision moved. */
  #refresh() {
    if (!this.#sessions.size) return this.#tree.rev;
    this.#flushMutations();
    const rev = this.#tree.snapshot(false).rev;
    this.#uiChanged();
    return rev;
  }
  #uiChanged() {
    if (this.#uiTimer) return;
    const wait = this.#uiSentAt + UI_EVENT_INTERVAL_MS - Date.now();
    if (wait > 0) {
      this.#uiTimer = setTimeout(() => {
        this.#uiTimer = null;
        this.#sendUi();
      }, wait);
      return;
    }
    this.#sendUi();
  }
  #sendUi() {
    const rev = this.#tree.rev;
    if (rev === this.#uiSentRev) return;
    this.#uiSentRev = rev;
    this.#uiSentAt = Date.now();
    for (const s of this.#sessions.values()) if (this.#hears(s, "ui")) this.#send("ui", { rev }, s.ag);
  }
  /** Subscribed, and still holding the scope the topic needs: `observe` for all but `user`. */
  #hears(s, topic) {
    return s.subs.has(topic) && (topic === "user" || s.scopes.includes("observe"));
  }
  #checkNav() {
    if (!this.#peer || this.#peer.closed) return;
    const url = this.#win.location?.href;
    if (typeof url !== "string") return;
    const title = this.#doc.title;
    if (url === this.#navUrl && title === this.#navTitle) return;
    this.#navUrl = url;
    this.#navTitle = title;
    this.#send("nav", { url, title });
  }
  #send(topic, d, ag) {
    const peer = this.#peer;
    if (!peer || peer.closed) return;
    try {
      peer.event(topic, d, ag === void 0 ? {} : { ag });
    } catch (e) {
      console.warn(`[reins] could not send ${topic} event:`, e instanceof ReinsError ? e.message : e);
    }
  }
  // ───────── sessions, indicator, human control ─────────
  #refreshIndicator() {
    const sessions = [...this.#sessions.values()];
    const names = sessions.map((s) => s.agent.name);
    this.#overlay?.indicator({
      show: this.#o.indicator !== false && names.length > 0,
      names,
      ids: sessions.map((s) => s.ag),
      paused: this.#paused,
      canPause: this.#policy.human.pause,
      canStop: this.#policy.human.stop,
      unverified: !this.#hubVerified,
      panel: this.#policy.human.panel,
      levels: sessions.map((s) => s.level),
      ...this.#waivingRules(sessions)
    });
    this.#overlay?.permissions(this.#panelModel());
    this.#statusChanged();
  }
  /**
   * The person's `allow` rules that waive a prompt right now, over all sessions: without the
   * rule the action would ask. With one for a dangerous action they do what `bypass` does,
   * otherwise what `auto` does, and the indicator shows them like that level.
   */
  #waivingRules(sessions) {
    let n = 0;
    let approved = 0;
    let like = "auto";
    for (const s of sessions) {
      for (const [name2, rule2] of s.rules) {
        const def = this.#actions.get(name2)?.def;
        if (rule2 !== "allow" || !def) continue;
        const q = { base: this.#base(s, def), risk: def.risk, level: s.level, offered: s.offered };
        if (decideAct(q).outcome !== "prompt" || decideAct({ ...q, rule: rule2 }).outcome !== "run") continue;
        n++;
        if (def.risk !== "safe" && def.risk !== "sensitive") like = "bypass";
      }
      if (this.#policy.consent.remember !== "session") continue;
      for (const name2 of s.approved) {
        const def = this.#actions.get(name2)?.def;
        if (!def || s.rules.has(name2)) continue;
        const v = decideAct({ base: this.#base(s, def), risk: def.risk, level: s.level, offered: s.offered });
        if (v.outcome !== "prompt" || v.remember !== true || s.hub?.get(name2) === "confirm" || s.hub?.get(name2) === "deny") continue;
        approved++;
        if (def.risk !== "safe" && def.risk !== "sensitive") like = "bypass";
      }
    }
    return n + approved > 0 ? { rules: { n, like, approved } } : {};
  }
  // ───────── what the person tightened stays ─────────
  /** What the person has tightened on this grant right now. */
  #tight(s) {
    const rules = /* @__PURE__ */ new Map();
    for (const [name2, d] of s.rules) if (d === "confirm" || d === "deny") rules.set(name2, d);
    return { strict: s.level === "strict", rules, off: new Set(s.granted.filter((x) => !s.scopes.includes(x))) };
  }
  /** The kept entry for a credential, made when there is none. Past the bound, the shared one. */
  #keptEntry(cred) {
    let k = this.#kept.get(cred);
    if (k) return k;
    if (cred !== "" && this.#kept.size >= MAX_KEPT_CREDS) {
      this.#keptShared = true;
      return this.#keptEntry("");
    }
    k = { strict: false, rules: /* @__PURE__ */ new Map(), off: /* @__PURE__ */ new Set() };
    this.#kept.set(cred, k);
    return k;
  }
  /**
   * Keep what the person tightened on this grant for the next grant of the same agent. Called
   * whenever the person changes something and when the grant ends, however it ends: nothing
   * the agent does (attach again, detach, let it run out, come back under another name) takes
   * a tightening away. Only adds; what the person lifts is taken out where they lift it.
   */
  #keep(s) {
    const t = this.#tight(s);
    if (!t.strict && t.rules.size === 0 && t.off.size === 0) return;
    const k = this.#keptEntry(s.cred);
    if (t.strict) k.strict = true;
    for (const [name2, d] of t.rules) if (d === "deny" || k.rules.get(name2) !== "deny") k.rules.set(name2, d);
    for (const x of t.off) k.off.add(x);
  }
  /**
   * What stays for a new grant of this credential: what was kept for it, and what the person
   * has set on its grants that are live now. Where the two differ, the stricter.
   */
  #keptFor(cred) {
    const out = { strict: false, rules: /* @__PURE__ */ new Map(), off: /* @__PURE__ */ new Set() };
    const add = (t) => {
      if (!t) return;
      if (t.strict) out.strict = true;
      for (const [name2, d] of t.rules) if (d === "deny" || out.rules.get(name2) !== "deny") out.rules.set(name2, d);
      for (const x of t.off) out.off.add(x);
    };
    add(this.#kept.get(cred));
    if (cred !== "" && this.#keptShared) add(this.#kept.get(""));
    for (const s of this.#sessions.values()) if (s.cred === cred) add(this.#tight(s));
    return out;
  }
  /** What is kept, as the lines an attach prompt shows: the overlay's own words, and the app's action names. */
  #keptLines(t, granted) {
    const lines = [];
    if (t.strict) lines.push("Level Strict: it asks you before every action");
    for (const [name2, d] of t.rules) if (this.#actions.has(name2)) lines.push(`${d === "deny" ? "Blocked" : "Asks every time"}: ${name2}`);
    const off = granted.filter((x) => t.off.has(x));
    if (off.length) lines.push(`Switched off: ${off.join(", ")}`);
    return lines;
  }
  /**
   * The decision a request for this action meets before anything the person set: the
   * stricter of the app's policy and the hub's. Where the hub did not say what it decides,
   * it counts as confirming: this is what the panel shows and what the person may loosen.
   */
  #base(s, def) {
    return stricter(decideAction(this.#policy, def), s.hub ? s.hub.get(def.name) ?? "confirm" : "confirm");
  }
  // ───────── what the person sets: level, rules, scope switches ─────────
  /** What the Permissions tab shows. Data only: the panel changes nothing except through the hooks below. */
  #panelModel() {
    this.#panelActions ??= [...this.#actions.values()].map((a) => ({ name: a.def.name, risk: a.def.risk, base: decideAction(this.#policy, a.def) }));
    return {
      agents: [...this.#sessions.values()].map((s) => ({
        ag: s.ag,
        name: s.agent.name,
        level: s.level,
        offered: [...s.offered],
        rules: Object.fromEntries(s.rules),
        hub: s.hub ? Object.fromEntries(s.hub) : null,
        remembered: [...s.approved],
        scopes: s.granted.map((scope) => ({ scope, on: s.scopes.includes(scope) }))
      })),
      actions: this.#panelActions,
      unverified: !this.#hubVerified,
      canStop: this.#policy.human.stop
    };
  }
  /**
   * Does the hub confirm a request for this action: the request carries `c:1`, or the hub
   * said at attach that it confirms or refuses the action. The second holds the hub to its
   * word, so that what the panel shows as asking does ask.
   */
  #marked(s, def, f) {
    const said = s.hub?.get(def.name);
    return f.c === 1 || said === "confirm" || said === "deny";
  }
  /** Where an `act` request stands for this agent now (SPEC 12, levels and rules). */
  #verdict(s, def, c) {
    const rule2 = s.rules.get(def.name);
    const base = s.hub?.get(def.name) === "deny" ? "deny" : decideAction(this.#policy, def);
    return decideAct({ base, risk: def.risk, c, level: s.level, offered: s.offered, ...rule2 !== void 0 && { rule: rule2 } });
  }
  /**
   * The person chose a level for one agent, in the panel. Only a level on offer for the
   * grant is taken. The hub and the agent are told; a prompt that is already showing or
   * queued stays as it is.
   */
  #setLevel(ag, level) {
    const s = this.#sessions.get(ag);
    if (!s || !this.#policy.human.panel || !LEVELS.includes(level) || !s.offered.includes(level) || s.level === level) return;
    if (s.level === "strict") {
      const k = this.#kept.get(s.cred);
      if (k) k.strict = false;
    }
    s.level = level;
    this.#keep(s);
    this.#send("user", { kind: "level", level }, ag);
    this.#logYou(s, `Level set to ${LEVEL_LABEL[level]}`);
    this.#refreshIndicator();
    this.#emit("level", { agent: { ...s.agent }, level });
  }
  /**
   * The person set, or with `null` reset, a rule for one action of one agent: in the panel,
   * or with "Always allow" on a prompt. A rule covers the action with any arguments.
   *
   * `allow` on an action that the app or the hub asks about is taken only where a level on
   * offer would waive the same prompt, and nothing is taken for an action either of them
   * denies. Where the hub did not say what it asks about, it counts as asking about each.
   *
   * A reset takes the rule away and, with it, an approval remembered for the action
   * (`consent.remember: session`); so does the rule `confirm`. Otherwise an action the
   * person set back to asking would go on running from memory.
   */
  #setRule(ag, action, rule2) {
    const s = this.#sessions.get(ag);
    const entry = this.#actions.get(action);
    if (!s || !entry || !this.#policy.human.panel) return false;
    let forgot = false;
    if (rule2 === null) {
      forgot = s.approved.delete(action);
      if (!s.rules.delete(action)) {
        if (forgot) {
          this.#logYou(s, `${action} asks again`);
          this.#refreshIndicator();
        }
        return forgot;
      }
    } else {
      if (rule2 !== "allow" && rule2 !== "confirm" && rule2 !== "deny") return false;
      const base = this.#base(s, entry.def);
      if (base === "deny") return false;
      if (rule2 === "allow" && base === "confirm" && !allowRulePermitted(entry.def.risk, s.offered)) return false;
      if (s.rules.get(action) === rule2) return false;
      s.rules.set(action, rule2);
      if (rule2 === "confirm") s.approved.delete(action);
    }
    this.#kept.get(s.cred)?.rules.delete(action);
    this.#keep(s);
    this.#send("user", { kind: "rule", a: action, d: rule2 }, ag);
    this.#logYou(s, rule2 === null ? `${action} follows the level again` : `${action} set to ${rule2 === "allow" ? "Allow" : rule2 === "confirm" ? "Ask" : "Block"}`);
    this.#refreshIndicator();
    this.#emit("rule", { agent: { ...s.agent }, action, rule: rule2 });
    return true;
  }
  /**
   * The person switched one scope of a grant off or back on. Never beyond what was granted
   * at attach. Without `cursor` the agent's pointer streams end and its cursor goes.
   */
  #setScope(ag, scope, on) {
    const s = this.#sessions.get(ag);
    if (!s || !this.#policy.human.panel || !s.granted.includes(scope) || s.scopes.includes(scope) === on) return;
    s.scopes = capScopes(on ? [...s.scopes, scope] : s.scopes.filter((x) => x !== scope), s.granted);
    if (on) this.#kept.get(s.cred)?.off.delete(scope);
    this.#keep(s);
    if (!s.scopes.includes("cursor")) {
      for (const [ch, st] of this.#streams) if (st.ag === ag) this.#streams.delete(ch);
      if (this.#cursorAg === ag) {
        this.#motion?.halt();
        this.#setCursor(false);
      }
    }
    if (scope === "chat") {
      if (on) this.#room.join(s.chat, s.ag, s.agent.name);
      else this.#relayChanged(this.#room.leave(s.chat), false, false);
      this.#drawChat();
    }
    this.#send("grant", { kind: "scopes", scopes: [...s.scopes] }, ag);
    this.#logYou(s, `Scope ${scope} switched ${on ? "on" : "off"}`);
    this.#refreshIndicator();
    this.#emit("scopes", { agent: { ...s.agent }, scopes: [...s.scopes] });
  }
  /** Stop, for one agent: from the panel, where the policy has Stop at all. */
  #disconnectOne(ag) {
    const s = this.#sessions.get(ag);
    if (!s || !this.#policy.human.stop) return;
    this.#logYou(s, "Disconnected");
    this.#revoke(ag);
  }
  // ───────── chat ─────────
  /** Show the room in the Chat tab, and come back when the next status lapses. */
  #drawChat() {
    if (!this.#chatOn) return;
    this.#overlay?.chat({
      lines: this.#room.lines(),
      members: this.#room.members(),
      busy: this.#busy,
      unverified: !this.#hubVerified,
      relay: this.#room.mode,
      hearing: this.#room.hearing(),
      ...this.#chatHeld > 0 && { held: true },
      ...this.#relayReset && { relayReset: true }
    });
    if (this.#chatTimer) clearTimeout(this.#chatTimer);
    this.#chatTimer = null;
    const due = this.#room.nextLapse();
    if (due !== void 0 && this.#domOn) {
      this.#chatTimer = setTimeout(() => {
        this.#chatTimer = null;
        this.#drawChat();
      }, due + 20);
    }
  }
  /** A message is in the room: send it to whoever may hear it, show it, and tell the app that there is one. */
  #posted(posted) {
    for (const d of posted.deliver) this.#send("chat", d.msg, d.ag);
    this.#drawChat();
    const { line: line2 } = posted;
    this.#emit("chat", { id: line2.id, from: { ...line2.from }, chars: line2.text.length, ...line2.to !== void 0 && { to: line2.to } });
  }
  /**
   * The person switched "Agents can hear each other" in the Chat tab: on, for the agents the
   * confirm step named, or off for all of them. Taken only where the page's policy and the
   * hub's both leave it to the person (`chatRelay: "person"`), and never while a consent
   * prompt is up. The room checks the rest: every agent named is in the room, and at least
   * two then hear each other.
   */
  #setRelay(ags, on) {
    if (!this.#chatOn || this.#busy || !this.#policy.human.panel) return;
    this.#relayReset = false;
    this.#relayChanged(on ? this.#room.include(ags) : this.#room.silence(), on, true);
  }
  /**
   * These agents now hear the others in the chat, or no longer do. The hub is told for each
   * grant (`evt user {kind:"relay"}` with `ag`), puts it on record and tells that agent.
   * `byPerson`: the person switched it; otherwise it followed from an agent leaving.
   */
  #relayChanged(ags, on, byPerson) {
    for (const ag of ags) {
      const s = this.#sessions.get(ag);
      if (!s) continue;
      this.#send("user", { kind: "relay", on }, ag);
      if (byPerson) this.#logYou(s, on ? "Chat: may hear the other agents" : "Chat: hears only you");
    }
    if (ags.length) this.#drawChat();
  }
  /** An app action an agent asked for starts (`1`) or has ended (`-1`): the composer is held meanwhile. */
  #holdChat(d) {
    const was = this.#chatHeld > 0;
    this.#chatHeld = Math.max(0, this.#chatHeld + d);
    if (this.#chatOn && was !== this.#chatHeld > 0) this.#drawChat();
  }
  /**
   * The person sent a message from the Chat tab. This is the only way a message of the
   * person comes to be, and the tab calls it from trusted input alone. Nothing is taken
   * while a consent prompt is up: the person answers that first, on the prompt itself.
   * A message changes no level, no rule and no scope, and answers no prompt.
   */
  #personSay(raw, to) {
    if (!this.#chatOn || this.#busy) return false;
    const text = typeof raw === "string" ? chatText(chatWellFormed(raw)) : void 0;
    if (text === void 0) return false;
    const posted = this.#room.personSay(text, typeof to === "string" ? to : void 0);
    if (!posted) return false;
    this.#posted(posted);
    return true;
  }
  // ───────── the activity log ─────────
  #log(e) {
    const last = this.#activity[this.#activity.length - 1];
    const t = Date.now();
    if (last && last.ag === e.ag && last.agent === e.agent && last.what === e.what && last.outcome === e.outcome && last.by === e.by && last.you === e.you) {
      last.t = t;
      last.n++;
    } else {
      this.#activity.push({ ...e, t, n: 1 });
      if (this.#activity.length > ACTIVITY_MAX) this.#activity.splice(0, this.#activity.length - ACTIVITY_MAX);
    }
    if (this.#activityTimer && t < this.#activityDue + 1e3) return;
    if (this.#activityTimer) clearTimeout(this.#activityTimer);
    const wait = this.#activityDrawn + ACTIVITY_DRAW_MS - t;
    const draw = () => {
      this.#activityTimer = null;
      this.#activityDrawn = Date.now();
      this.#overlay?.activity(this.#activity);
    };
    if (wait <= 0) draw();
    else {
      this.#activityDue = t + wait;
      this.#activityTimer = setTimeout(draw, wait);
    }
  }
  /** One command and how it ended: the method, or the name of a declared action. Never arguments. */
  #logCommand(s, m, p, outcome, by) {
    let what = m;
    if (m === "act") what = typeof p.a === "string" && this.#actions.has(p.a) ? p.a : "act (unknown action)";
    const e = { agent: s.agent.name, ag: s.ag, what, outcome };
    if (by !== void 0) e.by = by;
    this.#log(e);
  }
  #logYou(s, what) {
    this.#log({ agent: s.agent.name, ag: s.ag, what, outcome: "", you: true });
  }
  #drop(ag, why, notify = true) {
    const s = this.#sessions.get(ag);
    if (!s) return;
    this.#keep(s);
    this.#sessions.delete(ag);
    for (const [ch, st] of this.#streams) if (st.ag === ag) this.#streams.delete(ch);
    this.#relayChanged(this.#room.leave(s.chat), false, false);
    this.#drawChat();
    this.#overlay?.cancel(ag);
    if (!this.#sessions.size) {
      this.#setCursor(false);
      this.#overlay?.clear();
    }
    this.#refreshIndicator();
    if (notify) this.#emit("detach", { agent: { ...s.agent }, why });
  }
  #dropAll(why, notify = true) {
    for (const ag of [...this.#sessions.keys()]) this.#drop(ag, why, notify);
    this.#streams.clear();
    this.#overlay?.cancel();
  }
  #onHumanBurst() {
    for (const s of this.#sessions.values()) if (s.subs.has("user")) this.#send("user", { kind: "override" }, s.ag);
  }
  pause() {
    if (this.#paused) return;
    this.#paused = true;
    this.#motion?.halt();
    this.#send("user", { kind: "pause" });
    this.#refreshIndicator();
  }
  resume() {
    if (!this.#paused) return;
    this.#paused = false;
    this.#send("user", { kind: "resume" });
    this.#refreshIndicator();
  }
  stop() {
    this.#stopped = true;
    this.#stopGen++;
    this.#overlay?.cancel();
    this.#motion?.halt();
    for (const s of [...this.#sessions.values()]) this.#revoke(s.ag);
  }
  /** What Stop does for one agent: refuse its prompts, revoke its grant, drop its session. */
  #revoke(ag) {
    this.#stopped = true;
    this.#overlay?.cancel(ag);
    if (!this.#sessions.has(ag)) return;
    this.#send("grant", { kind: "revoked" }, ag);
    this.#drop(ag, "user");
  }
  /**
   * A consent prompt is showing or queued: only read-only methods are served meanwhile. A
   * prompt past its deadline is a refusal from the moment anything asks: its timer need not
   * have fired (timer ids can be cleared from outside the driver's world).
   */
  get #busy() {
    if (this.#askingTotal > 0) {
      this.#overlay?.expire();
      const now4 = Date.now();
      for (const a of [...this.#customAsks]) if (now4 >= a.until) a.expire();
    }
    return this.#askingTotal > 0;
  }
  /**
   * Throws unless `s` is still the live session for its agent, still holds the scope `need`
   * (the person may have switched it off meanwhile) and control is not paused.
   */
  #live(s, need) {
    if (this.#sessions.get(s.ag) !== s) throw new ReinsError("E_NOT_ATTACHED", "not attached");
    if (!s.scopes.includes(need)) throw new ReinsError("E_SCOPE", `grant lacks scope ${need}`);
    if (this.#paused) throw new ReinsError("E_PAUSED", "the user paused agent control");
  }
  #requireIdle() {
    if (this.#busy) throw new ReinsError("E_BUSY", "waiting for the person to answer a consent prompt");
  }
  /**
   * Is the indicator, with Pause and Stop, where the person can see and use it? `cached`
   * reuses a recent answer (pointer frames). Re-places the overlay as a side effect.
   */
  #overlayUsable(cached = false) {
    const o = this.#overlay;
    if (!o) return true;
    const now4 = Date.now();
    if (cached && now4 - this.#overlayOkAt < OVERLAY_CHECK_CACHE_MS) return this.#overlayOk;
    this.#overlayOk = o.check();
    this.#overlayOkAt = now4;
    return this.#overlayOk;
  }
  #requireOverlay() {
    if (!this.#overlayUsable()) throw new ReinsError("E_PAUSED", "the AI indicator is covered or hidden on the page; commands wait until it is visible");
  }
  /**
   * The last check before a command acts, run synchronously right before it does, after
   * every wait (glide, consent prompt, yield): still attached, the scope `need` still on, not
   * paused, no consent prompt up (unless this is the action the person just approved), the
   * indicator usable, and for synthetic input, no recent human input.
   */
  #ready(s, need, input = false, approved = false) {
    this.#live(s, need);
    if (!approved) this.#requireIdle();
    this.#requireOverlay();
    if (input && !this.#human.idle) throw new ReinsError("E_PAUSED", "the user is using the page");
    if (input) this.#keepChatFocus();
  }
  /**
   * The person's place in the chat composer is theirs. Called right before a command that may
   * move focus (synthetic input, an app action): when their focus is in the composer now, it is
   * given back as soon as the command's synchronous part has run, so that what they type next
   * does not land in a field the agent focused.
   */
  #keepChatFocus() {
    const o = this.#overlay;
    if (!o || !o.chatFocused) return;
    queueMicrotask(() => {
      if (this.#overlay === o) o.refocusChat();
    });
  }
  /**
   * The single privacy gate of every input-synthesising command: a private target (or a
   * label that forwards activation to a private control) is E_DENIED unless
   * `policy.privateInput`. So is a target whose activation changes a private control it
   * does not point at: a radio whose group has a private member (checking it unchecks the
   * other), and a reset control whose form holds a private field.
   */
  #guardPrivate(el) {
    if (this.#policy.privateInput) return;
    if (isPrivate(el)) throw new ReinsError("E_DENIED", "private field");
    let control = null;
    let button = null;
    try {
      const label = el.closest("label");
      control = label ? label.control : null;
      button = el.closest("button");
    } catch {
      control = null;
    }
    if (control && isPrivate(control)) throw new ReinsError("E_DENIED", "private field");
    for (const c of [el, control, button]) if (c && this.#changesPrivate(c)) throw new ReinsError("E_DENIED", "would change a private field");
  }
  /** Where Tab emulation may move focus: exposed elements, and private ones only under `privateInput`. */
  #tabStop = (e) => this.#tree.exposedNow(e) && (this.#policy.privateInput || !isPrivate(e));
  /** Activating `el` would change a private control elsewhere (radio group, form reset). */
  #changesPrivate(el) {
    const tag = el.localName;
    const type = tag === "input" || tag === "button" ? (el.type || "").toLowerCase() : "";
    if (tag === "input" && type === "radio") {
      const r = el;
      if (!r.name) return false;
      for (const o of Array.from(el.ownerDocument.getElementsByName(r.name))) {
        if (o !== el && o.localName === "input" && o.type === "radio" && o.form === r.form && isPrivate(o)) return true;
      }
      return false;
    }
    if (type === "reset") {
      const form = el.form;
      if (form) {
        for (const f of Array.from(form.elements)) if (isPrivate(f)) return true;
      }
    }
    return false;
  }
  #ctx(s) {
    return { agent: { ...s.agent }, scopes: [...s.scopes] };
  }
  // ───────── consent ─────────
  /**
   * Ask, with at most one pending prompt per agent and MAX_PROMPTS in total (else E_BUSY),
   * and not during a cool-off (else E_RATE). Records the answer for the cool-off; the third
   * explicit refusal in a row of one agent's action prompts revokes its grant.
   */
  async #consent(req, owner, always = false, extra = {}) {
    const now4 = Date.now();
    const cool = req.kind === "attach" ? this.#attachCoolOff : this.#coolOff.get(owner);
    if (cool && now4 < cool.until) throw new ReinsError("E_RATE", `the person refused a recent request; ask again in ${Math.ceil((cool.until - now4) / 1e3)} s`);
    if ((this.#asking.get(owner) ?? 0) > 0) throw new ReinsError("E_BUSY", "a consent prompt for this agent is already pending");
    if (this.#askingTotal >= MAX_PROMPTS) throw new ReinsError("E_BUSY", "too many consent prompts pending");
    this.#asking.set(owner, (this.#asking.get(owner) ?? 0) + 1);
    this.#askingTotal++;
    this.#room.quiet();
    this.#drawChat();
    let outcome;
    try {
      outcome = await this.#ask(req, owner, always, extra);
    } finally {
      const n = (this.#asking.get(owner) ?? 1) - 1;
      if (n > 0) this.#asking.set(owner, n);
      else this.#asking.delete(owner);
      this.#askingTotal--;
      this.#drawChat();
    }
    if (this.#recordAnswer(req.kind, owner, outcome)) throw new ReinsError("E_CONSENT", "the user declined three times in a row; access revoked");
    return outcome === "allow" || outcome === "always" ? outcome : "no";
  }
  /** Update the cool-off for an answer; true when it revoked the agent's grant. */
  #recordAnswer(kind, owner, outcome) {
    if (outcome === "cancel") return false;
    let cool;
    if (kind === "attach") cool = this.#attachCoolOff;
    else {
      cool = this.#coolOff.get(owner);
      if (!cool) {
        if (outcome === "allow" || outcome === "always") return false;
        cool = { until: 0, level: 0, denials: 0 };
        if (this.#coolOff.size >= MAX_COOL_OFF_ENTRIES) this.#coolOff.delete(this.#coolOff.keys().next().value);
        this.#coolOff.set(owner, cool);
      }
    }
    if (outcome === "allow" || outcome === "always") {
      cool.until = 0;
      cool.level = 0;
      cool.denials = 0;
      return false;
    }
    cool.level++;
    cool.until = Date.now() + Math.min(COOL_OFF_MAX_MS, COOL_OFF_BASE_MS * 2 ** Math.min(cool.level - 1, 10));
    if (outcome === "deny") cool.denials++;
    if (kind === "action" && cool.denials >= REVOKE_AFTER_DENIALS && this.#sessions.has(owner)) {
      cool.denials = 0;
      this.#revoke(owner);
      return true;
    }
    return false;
  }
  async #ask(req, owner, always, extra) {
    const timeoutMs = this.#policy.consent.timeoutMs;
    const custom = this.#o.consent;
    if (custom) {
      const run = async () => {
        let timer;
        const pending = { until: Date.now() + timeoutMs, expire: () => {
        } };
        try {
          return await Promise.race([
            Promise.resolve().then(() => custom(jsonClone(req))).then((v) => v === true && Date.now() < pending.until ? "allow" : v === true ? "timeout" : "deny"),
            new Promise((r) => {
              pending.expire = () => r("timeout");
              this.#customAsks.add(pending);
              timer = setTimeout(() => r("timeout"), timeoutMs);
            })
          ]);
        } catch (e) {
          console.error("[reins] consent handler failed:", e);
          return "timeout";
        } finally {
          this.#customAsks.delete(pending);
          if (timer) clearTimeout(timer);
        }
      };
      const p = this.#consentChain.then(run, run);
      this.#consentChain = p.then(
        () => {
        },
        () => {
        }
      );
      return p;
    }
    const overlay = this.#overlay;
    if (!overlay) return "cancel";
    const view = { kind: req.kind, agentName: req.agent.name, agentId: req.agent.id, appName: this.#o.app.name };
    if (req.scopes) view.scopes = req.scopes;
    if (req.action) view.action = { name: req.action.name, description: req.action.description, risk: req.action.risk };
    if (req.args !== void 0) view.args = req.args;
    if (req.reason) view.reason = req.reason;
    if (req.hubVerified === false) view.unverifiedHub = true;
    if (always && req.kind === "action") view.always = true;
    if (extra.remembers && req.kind === "action") view.remembers = true;
    if (req.kept && req.kept.length) {
      view.kept = [...req.kept];
      if (extra.keptWhy) view.keptWhy = extra.keptWhy;
    }
    return overlay.ask(view, timeoutMs, owner);
  }
  // ───────── requests ─────────
  async #request(m, p, f) {
    if (!isObj(p)) bad3("params must be an object");
    this.#flushMutations();
    this.#checkNav();
    if (m === "attach") return this.#attach(p, f);
    if (m === "detach") {
      if (typeof f.ag === "string") {
        this.#overlay?.cancel(f.ag);
        this.#drop(f.ag, typeof p.why === "string" ? p.why.slice(0, 16) : "hub");
      }
      return {};
    }
    if (m === "stream.close") return this.#streamClose(p, f);
    if (m === "chat.undelivered") {
      const to = typeof f.ag === "string" ? this.#sessions.get(f.ag) : void 0;
      const id = p.id;
      if (to && typeof id === "number" && Number.isSafeInteger(id) && this.#room.undelivered(to.chat, id)) this.#drawChat();
      return {};
    }
    const scope = methodScope(m);
    const handler = scope !== void 0 && hasOwn2(this.#handlers, m) ? this.#handlers[m] : void 0;
    if (!handler || scope === void 0) throw new ReinsError("E_UNKNOWN_METHOD", "unknown method");
    const s = typeof f.ag === "string" ? this.#sessions.get(f.ag) : void 0;
    if (!s) throw new ReinsError("E_NOT_ATTACHED", "not attached");
    try {
      if (!s.scopes.includes(scope)) throw new ReinsError("E_SCOPE", `grant lacks scope ${scope}`);
      if (this.#paused && !READ_ONLY_METHODS.includes(m) && !CHAT_SPEAK_METHODS.includes(m)) throw new ReinsError("E_PAUSED", "the user paused agent control");
      if (!READ_ONLY_METHODS.includes(m)) this.#requireIdle();
      if (!READ_ONLY_METHODS.includes(m)) this.#requireOverlay();
    } catch (e) {
      if (e instanceof ReinsError) this.#logCommand(s, m, p, e.code);
      throw e;
    }
    const info = { agent: { ...s.agent }, m };
    if (m === "act" && typeof p.a === "string") info.a = p.a.slice(0, 64);
    const note = {};
    try {
      const r = await handler(s, p, f, note);
      this.#emit("command", { ...info, ok: true, ...note.by !== void 0 && { by: note.by } });
      this.#logCommand(s, m, p, "ok", note.by);
      return r;
    } catch (e) {
      const err = e instanceof ReinsError ? e : fromHandler(e, m);
      this.#emit("command", { ...info, ok: false, code: err.code });
      this.#logCommand(s, m, p, err.code);
      throw err;
    }
  }
  async #attach(p, f) {
    const ag = f.ag;
    if (typeof ag !== "string" || ag.length === 0 || ag.length > 64) bad3("ag: required");
    const a = get(p, "agent");
    if (!isObj(a) || typeof a.name !== "string") bad3("agent: expected {id, name}");
    const agent = { id: ag, name: clip(a.name.replace(/\s+/g, " ").trim(), 80) || ag };
    const requested = get(p, "scopes");
    if (!Array.isArray(requested) || requested.length > 16 || !requested.every((x) => typeof x === "string")) bad3("scopes: expected a list");
    const reasonRaw = optStr3(p, "reason", 2e3);
    const reason = reasonRaw === void 0 ? void 0 : clip(reasonRaw.replace(/\s+/g, " ").trim(), 240);
    const scopes = capScopes(requested, this.#policy.scopes).filter((x) => x !== "chat" || this.#chatOn);
    if (!scopes.length) throw new ReinsError("E_SCOPE", "no requested scope is allowed");
    const full = () => !this.#sessions.has(ag) && this.#sessions.size >= MAX_SURFACE_SESSIONS;
    if (full()) throw new ReinsError("E_BUSY", "too many agents are attached to this page");
    const hubLevels = get(p, "levels");
    const offered = this.#policy.human.panel ? capLevels(this.#policy.human.levels, Array.isArray(hubLevels) ? LEVELS.filter((l) => hubLevels.includes(l)) : []) : [DEFAULT_LEVEL];
    const said = get(p, "decisions");
    const hub = isObj(said) ? new Map([...this.#actions.keys()].map((name2) => [name2, hubDecision(said, name2)])) : null;
    const credRaw = get(p, "cred");
    const cred = this.#hubVerified && typeof credRaw === "string" && credRaw.length >= 1 && credRaw.length <= 64 ? credRaw : "";
    const before = this.#keptFor(cred);
    const beforeLines = this.#keptLines(before, scopes);
    let d = this.#policy.attach;
    if (f.c === 1) d = stricter(d, "confirm");
    if (!this.#hubVerified) d = stricter(d, "confirm");
    if (this.#stopped) d = stricter(d, "confirm");
    if (cred === "" && beforeLines.length > 0) d = stricter(d, "confirm");
    if (d === "deny") throw new ReinsError("E_DENIED", "attach denied by policy");
    this.#requireOverlay();
    if (d === "confirm") {
      const epoch = this.#epoch;
      const stopGen = this.#stopGen;
      const req = { kind: "attach", agent: { ...agent }, scopes: [...scopes] };
      if (reason) req.reason = reason;
      if (!this.#hubVerified) req.hubVerified = false;
      if (beforeLines.length) req.kept = beforeLines;
      const keptWhy = cred === "" ? "This page cannot tell whether this is an agent you restricted before. What you set then stays for this one:" : "What you set for this agent before stays:";
      const answer = await this.#consent(req, ag, false, { keptWhy });
      if (epoch !== this.#epoch) throw new ReinsError("E_GONE", "connection closed");
      if (answer === "no" || stopGen !== this.#stopGen) throw new ReinsError("E_CONSENT", "the user declined");
      this.#requireOverlay();
      if (full()) throw new ReinsError("E_BUSY", "too many agents are attached to this page");
    }
    if (this.#sessions.has(ag)) this.#drop(ag, "replaced", false);
    const kept = this.#keptFor(cred);
    const session = { ag, agent, scopes, granted: [...scopes], level: DEFAULT_LEVEL, offered, hub, rules: /* @__PURE__ */ new Map(), nodes: null, rev: -1, subs: /* @__PURE__ */ new Set(), sent: /* @__PURE__ */ new Map(), approved: /* @__PURE__ */ new Set(), chat: {}, cred };
    const stays = {};
    if (kept.strict && offered.includes("strict")) {
      session.level = "strict";
      stays.level = "strict";
    }
    for (const [name2, rule2] of kept.rules) {
      const def = this.#actions.get(name2)?.def;
      if (!def || this.#base(session, def) === "deny") continue;
      session.rules.set(name2, rule2);
      Object.defineProperty(stays.rules ??= {}, name2, { value: rule2, enumerable: true, writable: true, configurable: true });
    }
    const off = scopes.filter((x) => kept.off.has(x));
    if (off.length) {
      session.scopes = scopes.filter((x) => !kept.off.has(x));
      stays.off = off;
    }
    this.#sessions.set(ag, session);
    this.#keep(session);
    const hubRelay = get(p, "chatRelay");
    const dropped = this.#room.setMode(stricterRelay(this.#policy.chatRelay, CHAT_RELAY.includes(hubRelay) ? hubRelay : "off"));
    if (dropped.changed) {
      this.#relayChanged(dropped.silenced, false, false);
      if (dropped.silenced.length > 0) this.#relayReset = true;
    }
    if (session.scopes.includes("chat")) this.#room.join(session.chat, ag, agent.name);
    this.#drawChat();
    const anyKept = stays.level !== void 0 || stays.rules !== void 0 || stays.off !== void 0;
    if (anyKept) this.#logYou(session, "Kept what you set before");
    this.#refreshIndicator();
    this.#emit("attach", { agent: { ...agent }, scopes: [...session.scopes] });
    return anyKept ? { scopes, ttlMs: this.#policy.ttlMs, kept: stays } : { scopes, ttlMs: this.#policy.ttlMs };
  }
  // ───────── method handlers ─────────
  #handlers = {
    observe: (s, p) => this.#observe(s, p),
    read: (s, p) => {
      const h = optStr3(p, "h", TARGET_MAX);
      const max = Math.min(MAX_READ, optNum(p, "max", 1, Number.MAX_SAFE_INTEGER, true) ?? 2e3);
      const el = h === void 0 ? null : this.#tree.resolve(h);
      return this.#tree.readText(el, max);
    },
    "state.get": (s, p) => {
      const name2 = optStr3(p, "name", 64);
      if (name2 !== void 0 && !this.#states.has(name2)) bad3("unknown state");
      const state = {};
      this.#holdChat(1);
      try {
        for (const n of name2 !== void 0 ? [name2] : [...this.#states.keys()]) {
          const v = this.#readState(n);
          Object.defineProperty(state, n, { value: v, enumerable: true, writable: true, configurable: true });
          s.sent.set(n, v);
        }
      } finally {
        this.#holdChat(-1);
      }
      return { state };
    },
    sub: (s, p) => {
      for (const t of this.#topics(p)) s.subs.add(t);
      return { topics: TOPICS.filter((t) => s.subs.has(t)) };
    },
    unsub: (s, p) => {
      for (const t of this.#topics(p)) s.subs.delete(t);
      return { topics: TOPICS.filter((t) => s.subs.has(t)) };
    },
    act: (s, p, f, note) => this.#act(s, p, f, note),
    "ui.click": (s, p) => {
      const h = reqStr2(p, "h", TARGET_MAX);
      return this.#ui(s, async () => {
        this.#guardPrivate(this.#target(h));
        const el = await this.#approach(h, s);
        this.#ready(s, "ui", true);
        this.#guardPrivate(el);
        click(el, centerOf(el));
      });
    },
    "ui.type": (s, p) => {
      const h = reqStr2(p, "h", TARGET_MAX);
      const text = reqStr2(p, "text", MAX_TEXT);
      const clear = optBool(p, "clear") ?? false;
      const enter = optBool(p, "enter") ?? false;
      return this.#ui(s, async () => {
        const check = (el2) => {
          if (!isTextEntry(el2)) bad3("target does not take text");
          this.#guardPrivate(el2);
          if (isReadOnly(el2)) throw new ReinsError("E_NO_TARGET", "target is read-only");
          if (clear && !this.#policy.privateInput && isEditable(el2) && hasPrivateInside(el2)) throw new ReinsError("E_DENIED", "target contains private content");
        };
        check(this.#target(h));
        const el = await this.#approach(h, s);
        this.#ready(s, "ui", true);
        check(el);
        typeText(el, text, clear);
        if (enter) pressKey(el, "Enter", this.#root, this.#tabStop);
      });
    },
    "ui.select": (s, p) => {
      const h = reqStr2(p, "h", TARGET_MAX);
      const value = reqStr2(p, "value", 1e3);
      return this.#ui(s, async () => {
        const check = (el2) => {
          if (el2.localName !== "select") bad3("target is not a select");
          this.#guardPrivate(el2);
        };
        check(this.#target(h));
        const el = await this.#approach(h, s);
        this.#ready(s, "ui", true);
        check(el);
        selectOption(el, value);
      });
    },
    "ui.scroll": (s, p) => {
      const h = optStr3(p, "h", TARGET_MAX);
      const dx = optNum(p, "dx", -1e6, 1e6);
      const dy = optNum(p, "dy", -1e6, 1e6);
      const to = get(p, "to");
      if (to !== void 0 && to !== "top" && to !== "bottom" && to !== "view") bad3("to: expected top, bottom or view");
      if (to === "view" && h === void 0) bad3("h: required with to=view");
      if (to === void 0 && !dx && !dy) bad3("give dx, dy or to");
      return this.#ui(s, async () => {
        const el = h === void 0 ? null : this.#target(h, true);
        if (el) this.#guardPrivate(el);
        if (to === "view" && el) {
          try {
            el.scrollIntoView?.({ block: "center", inline: "nearest" });
          } catch {
          }
        } else if (to === "top" || to === "bottom") scrollTo(el, to, this.#win);
        if (dx || dy) scrollBy(el, dx ?? 0, dy ?? 0, this.#win);
      });
    },
    "ui.key": (s, p) => {
      const key = reqStr2(p, "key", 16);
      if (!UI_KEYS.includes(key)) bad3("key: not a supported key");
      const h = optStr3(p, "h", TARGET_MAX);
      return this.#ui(s, async () => {
        let el;
        if (h !== void 0) el = this.#target(h);
        else {
          const active = this.#doc.activeElement;
          if (active && active !== this.#doc.body) this.#guardPrivate(active);
          el = active && active !== this.#doc.body && this.#tree.exposedNow(active) ? active : this.#doc.body ?? this.#root;
        }
        this.#guardPrivate(el);
        if (EDIT_KEYS.has(key) && (isReadOnly(el) || isDisabled(el))) throw new ReinsError("E_NO_TARGET", "target is read-only");
        pressKey(el, key, this.#root, this.#tabStop);
      });
    },
    "cursor.move": (s, p) => this.#cursorMove(s, p),
    "cursor.set": (s, p) => {
      const visible2 = optBool(p, "visible");
      const label = optStr3(p, "label", 40);
      const color = optStr3(p, "color", 7);
      if (color !== void 0 && !COLOR_PATTERN.test(color)) bad3("color: expected #rgb or #rrggbb");
      return this.#queue.push(() => {
        this.#ready(s, "cursor");
        if (label !== void 0) {
          this.#overlay?.cursorLabel(label);
          this.#cursorLabelSet = true;
        }
        if (color !== void 0) this.#overlay?.cursorColor(color);
        if (visible2 !== void 0) this.#setCursor(visible2, s);
        return {};
      });
    },
    "show.toast": (s, p) => {
      const text = reqStr2(p, "text", 2e3);
      const kind = get(p, "kind") ?? "info";
      if (kind !== "info" && kind !== "ok" && kind !== "warn") bad3("kind: expected info, ok or warn");
      const ms = optNum(p, "ms", 0, 6e5) ?? 4e3;
      return this.#queue.push(() => {
        this.#ready(s, "show");
        this.#overlay?.toast(clip(text, 500), kind, clamp(ms, 1e3, 6e4), s.agent.name);
        return {};
      });
    },
    "show.highlight": (s, p) => {
      const h = reqStr2(p, "h", TARGET_MAX);
      const label = optStr3(p, "label", 80) ?? "";
      const ms = optNum(p, "ms", 0, 6e5) ?? 3e3;
      return this.#queue.push(() => {
        this.#ready(s, "show");
        const el = this.#target(h, true);
        this.#overlay?.highlight(el, label, clamp(ms, 500, 6e4));
        return {};
      });
    },
    "show.view": (s, p) => this.#showView(s, p),
    "show.clear": (s) => this.#queue.push(() => {
      this.#ready(s, "show");
      this.#overlay?.clear();
      return {};
    }),
    "nav.go": (s, p) => {
      const url = reqStr2(p, "url", 2048);
      if (!navAllowed(this.#policy, url, this.#win.location.href)) throw new ReinsError("E_DENIED", "navigation not allowed");
      return this.#queue.push(() => {
        this.#ready(s, "nav");
        const href = this.#win.location.href;
        if (!navAllowed(this.#policy, url, href)) throw new ReinsError("E_DENIED", "navigation not allowed");
        const target = new URL(url, href).href;
        this.#later(() => {
          if (this.#sessions.get(s.ag) !== s || !s.scopes.includes("nav") || this.#paused || this.#busy || !this.#overlayUsable()) return;
          this.#win.location.assign(target);
        }, 30);
        return {};
      });
    },
    // Chat is answered at once, like the read-only methods: it changes the chat tab and nothing
    // on the page, so it does not wait its turn behind commands that do.
    "chat.say": (s, p) => {
      const text = chatText(get(p, "text"));
      if (text === void 0) bad3(`text: expected 1 to ${CHAT_MAX_TEXT} characters`);
      const to = optStr3(p, "to", 64);
      if (to === "") bad3("to: expected an agent id, or person");
      const posted = this.#room.agentSay(s.chat, text, to);
      this.#posted(posted);
      return { id: posted.id };
    },
    "chat.read": (s, p) => {
      const since = optNum(p, "since", 0, Number.MAX_SAFE_INTEGER, true);
      const max = optNum(p, "max", 1, Number.MAX_SAFE_INTEGER, true);
      return this.#room.read(s.chat, since, max);
    },
    "chat.status": (s, p) => {
      const state = get(p, "state");
      if (!isChatState(state)) bad3("state: expected idle, thinking or working");
      const note = chatNote(get(p, "note"));
      if (note === void 0) bad3(`note: expected one line of at most ${CHAT_MAX_NOTE} characters`);
      this.#room.status(s.chat, state, note);
      this.#drawChat();
      return {};
    },
    "stream.open": (s, p) => {
      if (get(p, "kind") !== "pointer") bad3("kind: expected pointer");
      if (!this.#policy.coordinates) throw new ReinsError("E_DENIED", "raw coordinates are not allowed");
      const ch = optNum(p, "ch", 0, 65535, true);
      if (ch === void 0) bad3("ch: required");
      this.#streams.set(ch, { ch, ag: s.ag, granter: new CreditGranter(PTR_INITIAL_CREDIT), nextSeq: void 0 });
      this.#setCursor(true, s);
      return { credit: PTR_INITIAL_CREDIT };
    }
  };
  #topics(p) {
    const t = get(p, "topics");
    if (!Array.isArray(t) || t.length > 8) bad3("topics: expected a list");
    for (const x of t) if (!SUBSCRIBABLE_TOPICS.includes(x)) bad3("topics: unknown topic");
    return t;
  }
  #readState(name2) {
    const st = this.#states.get(name2);
    if (!st) bad3("unknown state");
    let v;
    try {
      v = jsonClone(st.get());
    } catch (e) {
      console.error(`[reins] state ${name2} failed:`, e);
      throw new ReinsError("E_INTERNAL", "state unavailable");
    }
    return v === void 0 ? null : v;
  }
  notify(name2) {
    if (!this.#peer || this.#peer.closed) return;
    const names = name2 === void 0 ? [...this.#states.keys()] : this.#states.has(name2) ? [name2] : [];
    const targets = [...this.#sessions.values()].filter((s) => this.#hears(s, "state"));
    if (!targets.length || !names.length) return;
    for (const n of names) {
      let value;
      try {
        value = this.#readState(n);
      } catch {
        continue;
      }
      for (const s of targets) {
        const patch = s.sent.has(n) ? mergeDiff(s.sent.get(n), value) : value;
        if (patch === void 0) continue;
        s.sent.set(n, value);
        this.#send("state", { name: n, patch }, s.ag);
      }
    }
  }
  #observe(s, p) {
    const since = optNum(p, "since", 0, Number.MAX_SAFE_INTEGER, true);
    const boxes = optBool(p, "boxes") ?? false;
    const snap = this.#tree.snapshot(boxes);
    this.#uiChanged();
    const o = { rev: snap.rev, url: this.#win.location.href, title: clip(this.#doc.title, 300), vp: this.#vp() };
    if (since !== void 0 && s.nodes && since === s.rev) {
      o.base = since;
      o.ops = diffNodes(s.nodes, snap.nodes);
    } else o.nodes = snap.nodes;
    if (this.#paused) o.paused = true;
    s.nodes = snap.nodes;
    s.rev = snap.rev;
    return o;
  }
  async #act(s, p, f, note) {
    const a = reqStr2(p, "a", 64);
    const entry = this.#actions.get(a);
    if (!entry) bad3("unknown action");
    const args = get(p, "args");
    const err = validate(entry.def.params, args === void 0 ? {} : args);
    if (err) bad3(err);
    const c = this.#marked(s, entry.def, f);
    const remembers = this.#policy.consent.remember === "session";
    const remembered = (v2) => v2.remember === true && remembers && !c && s.approved.has(a);
    const refuse = (v2) => {
      if (v2.outcome === "denied") throw new ReinsError("E_DENIED", "action denied by policy");
      if (v2.outcome === "blocked") throw new ReinsError("E_CONSENT", "the user blocked this action");
    };
    const v = this.#verdict(s, entry.def, c);
    refuse(v);
    let approved = false;
    let record = false;
    let by = v.outcome === "run" && v.by !== "policy" ? v.by : void 0;
    if (v.outcome === "prompt") {
      if (remembered(v)) by = "remembered";
      else {
        const req = { kind: "action", agent: { ...s.agent }, action: jsonClone(entry.def), args: jsonClone(args) };
        const answer = await this.#consent(req, s.ag, this.#mayOfferAlways(s, entry.def, c), { remembers: remembers && v.remember === true && !c });
        if (this.#sessions.get(s.ag) !== s) throw new ReinsError("E_NOT_ATTACHED", "not attached");
        if (answer === "no") throw new ReinsError("E_CONSENT", "the user declined");
        if (answer === "always") this.#setRule(s.ag, a, "allow");
        approved = true;
        by = "person";
        record = remembers && v.remember === true && !c;
      }
    }
    return this.#queue.push(async () => {
      this.#ready(s, "act", false, approved);
      const now4 = this.#verdict(s, entry.def, c);
      refuse(now4);
      if (!approved && now4.outcome === "prompt" && !remembered(now4)) throw new ReinsError("E_BUSY", "the permission for this action changed while the request waited; send it again");
      if (by !== void 0) note.by = by;
      this.#keepChatFocus();
      let r;
      this.#holdChat(1);
      try {
        const pending = entry.run(args === void 0 ? {} : args, this.#ctx(s));
        if (record) this.#remember(s, a);
        r = await pending;
      } catch (e) {
        if (record) this.#remember(s, a);
        throw fromHandler(e, "action");
      } finally {
        this.#holdChat(-1);
      }
      const result = resultJson(r);
      const rev = this.#refresh();
      return result === void 0 ? { rev } : { result, rev };
    });
  }
  /** Keep an approval for this grant, and show it in the panel: the action runs without asking from here on. */
  #remember(s, action) {
    if (s.approved.has(action)) return;
    s.approved.add(action);
    this.#refreshIndicator();
  }
  /**
   * May the prompt for this action offer "Always allow": only with the built-in prompt and
   * a panel where the person can see and undo the rule, and only where the rule would be
   * taken (`#setRule`).
   */
  #mayOfferAlways(s, def, c) {
    if (!this.#policy.human.panel || this.#o.indicator === false || this.#o.consent) return false;
    const base = stricter(this.#base(s, def), c ? "confirm" : "allow");
    return base !== "confirm" || allowRulePermitted(def.risk, s.offered);
  }
  async #showView(s, p) {
    const name2 = reqStr2(p, "view", 64);
    const entry = this.#views.get(name2);
    if (!entry) bad3("unknown view");
    const given = get(p, "data");
    const data = given === void 0 && entry.def.params?.type === "object" ? {} : given;
    const err = validate(entry.def.params, data);
    if (err) bad3(err);
    return this.#queue.push(async () => {
      this.#ready(s, "show");
      this.#keepChatFocus();
      let r;
      this.#holdChat(1);
      try {
        r = await entry.run(data, this.#ctx(s));
      } catch (e) {
        throw fromHandler(e, "view");
      } finally {
        this.#holdChat(-1);
      }
      const result = resultJson(r);
      return result === void 0 ? {} : { result };
    });
  }
  // ───────── ui and cursor ─────────
  /** Resolve a target for an input command: live, exposed and (unless `anyState`) enabled. */
  #target(h, anyState = false) {
    const el = this.#tree.resolve(h);
    if (!anyState && isDisabled(el)) throw new ReinsError("E_NO_TARGET", "target is disabled");
    return el;
  }
  /** Run a `ui.*` command in the queue, after the person has stopped using the page. */
  #ui(s, fn) {
    return this.#queue.push(async () => {
      this.#live(s, "ui");
      await this.#human.quiet();
      this.#ready(s, "ui", true);
      this.#holdChat(1);
      try {
        await fn();
      } finally {
        this.#holdChat(-1);
      }
      return { rev: this.#refresh() };
    });
  }
  /**
   * Bring the target into view and, when the cursor is shown, glide to it and ripple. A
   * glide takes time: afterwards wait for the person to be idle again and re-check that the
   * session is live and not paused. The caller runs `#ready(s, true)` once more,
   * synchronously, right before it synthesises input.
   */
  async #approach(h, s) {
    let el = this.#target(h);
    scrollIntoView(el);
    if (this.#cursorOn && this.#motion) {
      await this.#motion.moveTo(this.#clampPt(centerOf(el)));
      this.#live(s, "ui");
      await this.#human.quiet();
      this.#ready(s, "ui", true);
      el = this.#target(h);
      const c = this.#clampPt(centerOf(el));
      this.#overlay?.ripple(c.x, c.y);
    }
    return el;
  }
  #clampPt(pt) {
    const [w, h] = this.#vp();
    return { x: clamp(pt.x, 0, Math.max(0, w)), y: clamp(pt.y, 0, Math.max(0, h)) };
  }
  #setCursor(on, s) {
    if (!this.#overlay || !this.#motion) return;
    if (on && !this.#cursorOn) {
      if (!this.#cursorLabelSet && s) this.#overlay.cursorLabel(s.agent.name.slice(0, 40));
      if (!this.#motion.placed) {
        const [w, h] = this.#vp();
        this.#motion.jump({ x: Math.round(w / 2), y: Math.round(h / 2) });
      }
    }
    if (!on) this.#motion.finish();
    if (!on) this.#cursorAg = void 0;
    else if (s) this.#cursorAg = s.ag;
    this.#cursorOn = on;
    this.#overlay.cursorVisible(on);
  }
  async #cursorMove(s, p) {
    const to = get(p, "to");
    const ms = optNum(p, "ms", 0, 6e5);
    const wait = optBool(p, "wait") ?? true;
    let raw;
    let h;
    if (typeof to === "string") {
      if (to.length > TARGET_MAX) bad3("to: too long");
      h = to;
    } else if (isObj(to) && typeof to.x === "number" && typeof to.y === "number" && Number.isFinite(to.x) && Number.isFinite(to.y)) {
      if (!this.#policy.coordinates) throw new ReinsError("E_DENIED", "raw coordinates are not allowed");
      raw = { x: to.x, y: to.y };
    } else bad3("to: expected a target or a point");
    const started = await this.#queue.push(() => {
      this.#ready(s, "cursor");
      const pt = this.#clampPt(h !== void 0 ? centerOf(this.#tree.resolve(h)) : raw);
      this.#setCursor(true, s);
      const done = this.#motion ? this.#motion.moveTo(pt, ms === void 0 ? void 0 : Math.min(ms, MAX_GLIDE_MS)) : Promise.resolve(pt);
      return { pt, done };
    });
    if (!wait) return { x: Math.round(started.pt.x), y: Math.round(started.pt.y) };
    return started.done;
  }
  #streamClose(p, f) {
    const ch = optNum(p, "ch", 0, 65535, true);
    if (ch === void 0) bad3("ch: required");
    const st = this.#streams.get(ch);
    if (st && (f.ag === void 0 || st.ag === f.ag)) this.#streams.delete(ch);
    return {};
  }
  #onBinary(bytes) {
    if (bytes.length < 1 || binaryKind(bytes) !== BIN_POINTER) return;
    let frame;
    try {
      frame = decodePointer(bytes);
    } catch {
      return;
    }
    const st = this.#streams.get(frame.ch);
    if (!st) return;
    const n = frame.points.length;
    const credit = () => {
      const c = st.granter.consumed(1);
      if (c > 0 && this.#streams.get(st.ch) === st) {
        try {
          this.#peer?.flow(st.ch, c);
        } catch {
        }
      }
    };
    const s = this.#sessions.get(st.ag);
    if (!s || this.#paused || this.#busy || !s.scopes.includes("cursor") || !this.#motion || !this.#policy.coordinates || !this.#overlayUsable(true)) {
      for (let i = 0; i < n; i++) credit();
      return;
    }
    const gap = st.nextSeq !== void 0 && frame.seq !== st.nextSeq;
    st.nextSeq = frame.seq + n >>> 0;
    if (!this.#cursorOn || this.#cursorAg !== s.ag) this.#setCursor(true, s);
    this.#motion.push(frame.points, credit, gap);
  }
};
function createDriver(options) {
  return new ReinsDriver(options);
}

// packages/agent/src/client.ts
init_src();

// packages/agent/src/emitter.ts
var Emitter = class {
  #map = /* @__PURE__ */ new Map();
  on(event, fn) {
    let set = this.#map.get(event);
    if (!set) this.#map.set(event, set = /* @__PURE__ */ new Set());
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  }
  emit(event, d) {
    const set = this.#map.get(event);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(d);
      } catch {
      }
    }
  }
};
function unref(timer) {
  timer?.unref?.();
  return timer;
}

// packages/agent/src/pointer.ts
init_src();
var FLUSH_MS = 8;
var now3 = () => typeof performance !== "undefined" ? performance.now() : Date.now();
var PointerStreamImpl = class {
  #ch;
  #host;
  #credit;
  #queue = new PointerCoalescer();
  #seq = 0;
  #sent = 0;
  #last;
  #timer;
  #ending;
  #wake;
  #dead;
  constructor(ch, initialCredit, host) {
    this.#ch = ch;
    this.#host = host;
    this.#credit = new CreditWindow(initialCredit);
  }
  get stats() {
    return { sent: this.#sent, dropped: this.#queue.dropped };
  }
  push(x, y, dt) {
    if (this.#ending || this.#dead) return;
    const t = now3();
    const delta = dt ?? (this.#last === void 0 ? 0 : Math.round(t - this.#last));
    this.#last = t;
    this.#queue.push({ x, y, dt: delta });
    this.#schedule();
  }
  /** Credit arrived from the surface. */
  addCredit(n) {
    this.#credit.grant(n);
    if (this.#wake) this.#wake();
    else this.#flush();
  }
  /** The connection is gone: fail a pending end() and stop. */
  fail(err) {
    this.#dead = err;
    if (this.#timer !== void 0) clearTimeout(this.#timer);
    this.#timer = void 0;
    this.#wake?.();
  }
  #schedule() {
    if (this.#timer !== void 0) return;
    this.#timer = unref(
      setTimeout(() => {
        this.#timer = void 0;
        this.#flush();
      }, FLUSH_MS)
    );
  }
  #send(points, flags) {
    this.#host.sendBinary(encodePointer({ ch: this.#ch, seq: this.#seq, flags, points }));
    this.#seq += points.length;
    this.#sent += points.length;
  }
  /** Send as many droppable frames as the credit allows. */
  #flush() {
    if (this.#ending || this.#dead) return;
    try {
      while (this.#queue.size > 0 && this.#credit.available > 0) {
        const n = Math.min(this.#credit.available, PTR_MAX_POINTS, this.#queue.size);
        const pts = this.#queue.take(n);
        this.#credit.consume(pts.length);
        this.#send(pts, PTR_FLAG_DROPPABLE);
      }
    } catch {
    }
  }
  end() {
    return this.#ending ??= this.#end();
  }
  async #end() {
    if (this.#timer !== void 0) clearTimeout(this.#timer);
    this.#timer = void 0;
    let closing = false;
    try {
      for (; ; ) {
        if (this.#dead) throw this.#dead;
        const size2 = this.#queue.size;
        if (size2 === 0) {
          this.#send([], PTR_FLAG_END);
          break;
        }
        const avail = this.#credit.available;
        if (avail > 0) {
          const n = Math.min(avail, PTR_MAX_POINTS, size2);
          const last = n === size2;
          const pts = this.#queue.take(n);
          this.#credit.consume(pts.length);
          this.#send(pts, last ? PTR_FLAG_END : PTR_FLAG_DROPPABLE);
          if (last) break;
          continue;
        }
        await this.#waitForCredit();
      }
      closing = true;
      await this.#host.closeChannel(this.#ch);
    } catch (e) {
      if (!closing && !this.#dead) await this.#host.closeChannel(this.#ch).catch(() => void 0);
      throw e;
    } finally {
      this.#host.release(this.#ch);
    }
  }
  #waitForCredit() {
    return new Promise((resolve, reject) => {
      const timer = unref(
        setTimeout(() => {
          this.#wake = void 0;
          reject(new ReinsError("E_TIMEOUT", "no pointer credit"));
        }, this.#host.waitMs)
      );
      this.#wake = () => {
        clearTimeout(timer);
        this.#wake = void 0;
        resolve();
      };
    });
  }
};

// packages/agent/src/client.ts
var DEFAULT_URL = `ws://127.0.0.1:${DEFAULT_PORT}`;
var DEFAULT_SCOPES = ["observe", "act", "cursor", "show"];
function clean(o) {
  for (const k of Object.keys(o)) if (o[k] === void 0) delete o[k];
  return o;
}
function isNode() {
  return typeof process !== "undefined" && !!process.versions?.node;
}
async function openLink(options) {
  if (options.link) return options.link;
  const WS = globalThis.WebSocket;
  if (!WS) throw new ReinsError("E_BAD_ARGS", "no WebSocket available: pass options.link");
  let ws;
  try {
    ws = new WS(options.url ?? DEFAULT_URL, WS_SUBPROTOCOL);
  } catch {
    throw new ReinsError("E_BAD_ARGS", "invalid hub URL");
  }
  return wsLink(ws);
}
async function resolveKey(options) {
  if (options.key) return options.key;
  if (isNode()) {
    const { findNodeKey: findNodeKey2 } = await Promise.resolve().then(() => (init_keys_browser(), keys_browser_exports));
    const k = await findNodeKey2(options.url);
    if (k) return k;
  }
  throw new ReinsError("E_AUTH", "no key: pass options.key" + (isNode() ? ", or set REINS_TOKEN or REINS_TOKEN_FILE; no running hub announced a token file for this URL, and there is no .reins/token here" : ""));
}
var HANDSHAKE_ERRORS = /* @__PURE__ */ new WeakSet();
function isHandshakeError(e) {
  return typeof e === "object" && e !== null && HANDSHAKE_ERRORS.has(e);
}
async function connect(options = {}) {
  const key = await resolveKey(options);
  const link = await openLink(options);
  let conn;
  try {
    conn = await clientConnect(
      link,
      { role: "agent", name: options.name ?? "reins-agent", kid: options.kid ?? "default", key },
      options.handshakeTimeoutMs === void 0 ? {} : { timeoutMs: options.handshakeTimeoutMs }
    );
  } catch (e) {
    link.close();
    if (typeof e === "object" && e !== null) HANDSHAKE_ERRORS.add(e);
    throw e;
  }
  return new Client(conn.link, conn.welcome.session, conn.welcome.limits);
}
var Client = class {
  session;
  #peer;
  #limits;
  #events = new Emitter();
  #handles = /* @__PURE__ */ new Map();
  #streams = /* @__PURE__ */ new Map();
  #hb;
  #closed = false;
  constructor(link, session, limits) {
    this.session = session;
    this.#limits = { ...DEFAULT_LIMITS, ...limits };
    this.#peer = new Peer(
      link,
      {
        event: (f) => this.#onEvent(f),
        flow: (f) => this.#streams.get(f.ch)?.addCredit(f.credit),
        close: (code, msg) => this.#onClose(code, msg)
      },
      { limits: this.#limits }
    );
    this.#heartbeat();
  }
  request(m, p, timeoutMs) {
    return this.#peer.request(m, p, timeoutMs === void 0 ? {} : { timeoutMs });
  }
  /**
   * Time a request may wait when a consent prompt can be involved (`surface.attach`, `act`):
   * `reqTimeoutMs` for the hub's answer on top of the hub's whole wait for the surface
   * (`reqTimeoutMs + consentTimeoutMs`). The agent so outwaits the hub, and it is the hub
   * that says how a slow prompt ended: the surface's `E_CONSENT`, or the hub's `E_TIMEOUT`
   * when the surface did not answer in time (a hidden tab runs its timers late).
   */
  get consentTimeoutMs() {
    return 2 * this.#limits.reqTimeoutMs + this.#limits.consentTimeoutMs;
  }
  info() {
    return this.request("hub.info", {});
  }
  async surfaces() {
    const r = await this.request("surfaces.list", {});
    return r.surfaces;
  }
  async attach(s, opts = {}) {
    const scopes = capScopes(opts.scopes ?? DEFAULT_SCOPES);
    const r = await this.request("surface.attach", clean({ s, scopes, reason: opts.reason }), this.consentTimeoutMs);
    const h = new Handle(this, r);
    let set = this.#handles.get(h.info.s);
    if (!set) this.#handles.set(h.info.s, set = /* @__PURE__ */ new Set());
    set.add(h);
    return h;
  }
  ping() {
    return this.#peer.ping();
  }
  on(event, fn) {
    return this.#events.on(event, fn);
  }
  close() {
    this.#clearHeartbeat();
    this.#peer.bye("OK");
  }
  // ── used by handles ──
  forget(h) {
    const set = this.#handles.get(h.info.s);
    set?.delete(h);
    if (set && set.size === 0) this.#handles.delete(h.info.s);
  }
  openStream(ch, credit) {
    const host = {
      sendBinary: (b) => this.#peer.sendBinary(b),
      closeChannel: async (c) => {
        await this.request("stream.close", { ch: c });
      },
      release: (c) => {
        this.#streams.delete(c);
      },
      waitMs: this.#limits.reqTimeoutMs
    };
    const st = new PointerStreamImpl(ch, credit, host);
    this.#streams.set(ch, st);
    return st;
  }
  #onEvent(f) {
    const d = f.d;
    if (f.topic === "surface") this.#events.emit("surface", d);
    const s = f.s ?? d?.surface?.s;
    if (s === void 0) return;
    const set = this.#handles.get(s);
    if (!set) return;
    for (const h of [...set]) h.deliver(f.topic, d);
  }
  #onClose(code, msg) {
    this.#closed = true;
    this.#clearHeartbeat();
    for (const st of this.#streams.values()) st.fail(new ReinsError("E_GONE", "connection closed"));
    this.#streams.clear();
    this.#events.emit("close", msg === void 0 ? { code } : { code, msg });
  }
  /** After `heartbeatMs` of silence send a ping; if it fails, close. */
  #heartbeat() {
    const hb = this.#limits.heartbeatMs;
    if (!(hb > 0)) return;
    const arm = (ms) => {
      this.#hb = unref(setTimeout(tick2, Math.max(1, ms)));
    };
    const tick2 = () => {
      if (this.#closed || this.#peer.closed) return;
      const idle = Date.now() - this.#peer.lastSeen;
      if (idle >= hb) {
        this.#peer.ping(this.#limits.reqTimeoutMs).catch(() => {
          if (!this.#closed) this.#peer.bye("E_TIMEOUT", "heartbeat failed");
        });
        arm(hb);
      } else arm(hb - idle);
    };
    arm(hb);
  }
  #clearHeartbeat() {
    if (this.#hb !== void 0) clearTimeout(this.#hb);
    this.#hb = void 0;
  }
};
var Handle = class {
  manifest;
  grant;
  #info;
  #c;
  #events = new Emitter();
  #level = DEFAULT_LEVEL;
  #rules = /* @__PURE__ */ new Map();
  #chatRelay = false;
  #gone;
  #nodes = [];
  #rev;
  #boxes = false;
  #queue = Promise.resolve();
  constructor(c, r) {
    this.#c = c;
    this.#info = r.surface;
    this.manifest = r.manifest;
    this.grant = r.grant;
    const kept = r.kept;
    if (kept && typeof kept === "object") {
      if (kept.level === "strict") this.#level = "strict";
      if (kept.rules && typeof kept.rules === "object") {
        for (const [name2, d] of Object.entries(kept.rules)) if (d === "confirm" || d === "deny") this.#rules.set(name2, d);
      }
    }
  }
  get info() {
    return this.#info;
  }
  get nodes() {
    return this.#nodes;
  }
  get attached() {
    return this.#gone === void 0;
  }
  get level() {
    return this.#level;
  }
  get rules() {
    return Object.fromEntries(this.#rules);
  }
  get chatRelay() {
    return this.#chatRelay;
  }
  card() {
    return renderCard(this.manifest, { surface: this.#info, scopes: this.grant.scopes });
  }
  /** An event from the hub about this surface. */
  deliver(topic, d) {
    const k = d?.kind;
    if (topic === "grant") {
      if (k === "scopes") {
        const list2 = d.scopes;
        if (Array.isArray(list2)) this.grant.scopes = capScopes(list2.filter((x) => typeof x === "string"));
      } else if (k === void 0 || k === "revoked" || k === "expired") this.#end(k ?? "revoked");
    } else if (topic === "user") {
      const u = d;
      if (k === "relay") {
        if (typeof u?.on === "boolean") this.#chatRelay = u.on;
      } else if (k === "level") {
        const level = LEVELS.find((l) => l === u?.level);
        if (level !== void 0) this.#level = level;
      } else if (k === "rule" && typeof u?.a === "string") {
        if (u.d === null) this.#rules.delete(u.a);
        else if (u.d === "allow" || u.d === "confirm" || u.d === "deny") this.#rules.set(u.a, u.d);
      }
    } else if (topic === "surface") {
      const surface = d?.surface;
      if (k === "gone") this.#end("gone");
      else if (k === "changed" && surface) this.#info = surface;
    } else if (topic === "chat") {
      const m = chatMessage(d);
      if (m !== void 0) this.#events.emit("chat", m);
      return;
    }
    this.#events.emit(topic, d);
  }
  #end(why) {
    if (this.#gone !== void 0) return;
    this.#gone = why;
    this.#c.forget(this);
  }
  async #call(m, p = {}, timeoutMs) {
    if (this.#gone !== void 0) throw new ReinsError("E_NOT_ATTACHED", `surface ${this.#info.s} is not attached`);
    try {
      return await this.#c.request(m, { s: this.#info.s, ...clean({ ...p }) }, timeoutMs);
    } catch (e) {
      if (e instanceof ReinsError && e.code === "E_NOT_ATTACHED") this.#end("not attached");
      throw e;
    }
  }
  // ── observe ──
  observe(opts = {}) {
    return this.#serial(async () => (await this.#observe(opts)).o);
  }
  observeText(opts = {}) {
    return this.#serial(async () => {
      const { o, prev } = await this.#observe(opts);
      return renderObservation(o, prev);
    });
  }
  #serial(fn) {
    const run = this.#queue.then(fn);
    this.#queue = run.catch(() => void 0);
    return run;
  }
  async #observe(opts) {
    const boxes = opts.boxes === true;
    const since = !opts.full && this.#rev !== void 0 && boxes === this.#boxes ? this.#rev : void 0;
    let o = await this.#call("observe", { since, boxes: boxes ? true : void 0 });
    if (o.ops !== void 0 && (since === void 0 || o.base !== since)) {
      o = await this.#call("observe", { boxes: boxes ? true : void 0 });
    }
    const before = this.#nodes;
    if (o.ops !== void 0) this.#nodes = applyOps(before, o.ops);
    else if (o.nodes !== void 0) this.#nodes = o.nodes;
    else throw new ReinsError("E_INTERNAL", "observation carries neither nodes nor ops");
    this.#rev = o.rev;
    this.#boxes = boxes;
    return { o, prev: o.ops !== void 0 ? before : void 0 };
  }
  // ── reads ──
  async read(h, max) {
    return (await this.readText(h, max)).text;
  }
  async readText(h, max) {
    const r = await this.#call("read", { h, max });
    return { text: typeof r.text === "string" ? r.text : "", truncated: r.truncated === true };
  }
  async state(name2) {
    return (await this.#call("state.get", { name: name2 })).state;
  }
  // ── commands ──
  async act(action, args) {
    const r = await this.#call("act", { a: action, args }, this.#c.consentTimeoutMs);
    return r.result;
  }
  async click(h) {
    await this.#call("ui.click", { h });
  }
  async type(h, text, opts = {}) {
    await this.#call("ui.type", { h, text, clear: opts.clear, enter: opts.enter });
  }
  async select(h, value) {
    await this.#call("ui.select", { h, value });
  }
  async scroll(opts) {
    await this.#call("ui.scroll", { h: opts.h, dx: opts.dx, dy: opts.dy, to: opts.to });
  }
  async key(key, h) {
    await this.#call("ui.key", { key, h });
  }
  cursor = {
    move: (to, opts = {}) => this.#call("cursor.move", { to, ms: opts.ms, wait: opts.wait }),
    show: async (label, color) => {
      await this.#call("cursor.set", { visible: true, label, color });
    },
    hide: async () => {
      await this.#call("cursor.set", { visible: false });
    }
  };
  show = {
    toast: async (text, kind, ms) => {
      await this.#call("show.toast", { text, kind, ms });
    },
    highlight: async (h, label, ms) => {
      await this.#call("show.highlight", { h, label, ms });
    },
    view: async (view, data) => (await this.#call("show.view", { view, data })).result,
    clear: async () => {
      await this.#call("show.clear", {});
    }
  };
  async go(url) {
    await this.#call("nav.go", { url });
  }
  chat = {
    say: (text, opts = {}) => this.#call("chat.say", { text, to: opts.to }),
    read: (opts = {}) => this.#call("chat.read", { since: opts.since, max: opts.max }),
    status: async (state, note) => {
      await this.#call("chat.status", { state, note });
    }
  };
  async pointer() {
    const r = await this.#call("stream.open", { kind: "pointer" });
    return this.#c.openStream(r.ch, r.credit);
  }
  async subscribe(topics) {
    await this.#call("sub", { topics });
  }
  on(event, fn) {
    return this.#events.on(event, fn);
  }
  async detach() {
    if (this.#gone !== void 0) return;
    try {
      await this.#c.request("surface.detach", { s: this.#info.s });
    } finally {
      this.#end("detached");
    }
  }
};

// packages/hub/src/broker.ts
init_src();

// packages/hub/src/audit.ts
init_src();
function memoryAudit() {
  const records = [];
  return {
    records,
    write(record) {
      records.push(record);
    }
  };
}
function auditHash(prev, record, key) {
  const { hash: _ignored, ...rest } = record;
  const text = `${prev}
${canonicalJson(rest)}`;
  return key !== void 0 ? hmacSha256(key, text) : sha256(text);
}

// packages/hub/src/broker.ts
var HUB_VERSION = "0.1.0";
var MIN_KEY_CHARS = 32;
var HANDSHAKE_MS = 5e3;
var FAIL_WINDOW_MS = 6e4;
var FAIL_DELAY_MS = 200;
var FAIL_DELAY_MAX_MS = 3e3;
var MAX_HANDSHAKES = 16;
var DEFAULT_MAX_SESSIONS = 4;
var ATTACH_RATE = 0.5;
var ATTACH_BURST = 3;
var DROP_BUFFER_BYTES = 256 * 1024;
var STALL_BUFFER_BYTES = 1024 * 1024;
var PEER_BUFFER_MAX_BYTES = 8 * 1024 * 1024;
var PREAUTH_MESSAGES = 16;
var PREAUTH_BYTES = 64 * 1024;
var HUB_METHOD_RATE = 10;
var HUB_METHOD_BURST = 20;
var SURFACE_ADMIT_RATE = 2;
var AGENT_ADMIT_RATE = 2;
var AGENT_ADMIT_BURST = 20;
var MAX_ADMIT_KEYS = 1024;
var AUDIT_BACKLOG_MAX = 1e3;
var AUDIT_QUEUE_MAX = 1e4;
var AUDIT_RETRY_MS = 1e3;
var REFUSALS_PER_SEC = 20;
var PERSON_CHANGES_PER_SEC = 20;
var PERSON_CHAT_RATE = 5;
var PERSON_CHAT_BURST = 10;
var UNDELIVERED_PER_SEC = 20;
var CHAT_SENDERS_MAX = 64;
function chatSayParams(p) {
  const text = chatText(p.text);
  if (text === void 0) return p;
  const out = { text };
  if (p.s !== void 0) out.s = p.s;
  if (p.to !== void 0) out.to = p.to;
  return out;
}
var MAX_TIMER_MS = 2147483647;
var MAX_REASON_CHARS = 500;
var MAX_AGENT_NAME = 64;
var MAX_TITLE_CHARS = 200;
var MAX_URL_CHARS = 4096;
var NAME_STRIP = /[\p{Cc}‎‏‪-‮⁦-⁩]/gu;
function unref2(t) {
  t.unref?.();
  return t;
}
function fail3(code, msg) {
  throw new ReinsError(code, msg);
}
function hasOwn3(o, k) {
  return o !== void 0 && Object.prototype.hasOwnProperty.call(o, k);
}
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function noop() {
}
function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
function isPositiveInt(v) {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}
function audited(m) {
  return m === "act" || m === "show.view" || m === "show.toast" || m === "show.highlight" || m === "stream.open" || m === "chat.say" || m.startsWith("ui.") || m.startsWith("nav.");
}
var TOPIC_SCOPE = { ui: "observe", state: "observe", nav: "observe", user: null, chat: "chat" };
var HUB_METHOD_NAMES = /* @__PURE__ */ new Set(["hub.info", "surfaces.list", "surface.attach", "surface.detach", "stream.open", "stream.close"]);
function cleanName(name2, max) {
  return Array.from(name2.replace(NAME_STRIP, "")).slice(0, max).join("");
}
var RefusalLimiter = class {
  constructor(now4, summary) {
    this.now = now4;
    this.summary = summary;
  }
  #windowStart = Number.NEGATIVE_INFINITY;
  #inWindow = 0;
  #suppressed = 0;
  #sinceTick = 0;
  #timer;
  /** May this refusal be recorded? */
  allow() {
    const t = this.now();
    if (t - this.#windowStart >= 1e3 || t < this.#windowStart) {
      this.#windowStart = t;
      this.#inWindow = 0;
    }
    if (this.#inWindow < REFUSALS_PER_SEC) {
      this.#inWindow++;
      return true;
    }
    this.#suppressed++;
    this.#sinceTick++;
    if (this.#timer === void 0) this.#arm();
    return false;
  }
  #arm() {
    this.#timer = unref2(
      setTimeout(() => {
        this.#timer = void 0;
        if (this.#sinceTick > 0) {
          this.#sinceTick = 0;
          this.#arm();
        } else this.flush();
      }, 1e3)
    );
  }
  /** Write the summary now, if anything was suppressed. */
  flush() {
    if (this.#timer !== void 0) clearTimeout(this.#timer);
    this.#timer = void 0;
    const n = this.#suppressed;
    this.#suppressed = 0;
    this.#sinceTick = 0;
    if (n > 0) this.summary(n);
  }
};
var Broker = class {
  #name;
  #creds = /* @__PURE__ */ new Map();
  #surfaceCfg;
  #policy;
  #limits;
  #sink;
  #auditKey;
  #maxSurfaces;
  #maxAgents;
  #maxStreams;
  #now;
  /** Stands in for the key of an unknown kid, so that path costs the same HMAC. */
  #dummyKey = randomToken(32);
  #agents = /* @__PURE__ */ new Map();
  #surfaces = /* @__PURE__ */ new Map();
  #streams = /* @__PURE__ */ new Map();
  #handshakes = /* @__PURE__ */ new Set();
  /**
   * Rate buckets by `${kid}\n${surface}|${scope}` (scope also `attach` and `pointer`), and
   * `${kid}\n|hub` for hub methods: shared by every session of a credential.
   */
  #buckets = /* @__PURE__ */ new Map();
  /** `${kid}\n${surface}` with an attach in flight, held until the surface answers. */
  #attaching = /* @__PURE__ */ new Set();
  /** Admission buckets by `o\n${origin}` (surfaces) and `k\n${kid}` (agents). */
  #admits = /* @__PURE__ */ new Map();
  #surfaceAdmits;
  #surfaceAdmit;
  #agentAdmit;
  #peerOpts;
  #agentSeq = 0;
  #surfaceSeq = 0;
  #grantSeq = 0;
  #chSeq = 0;
  /** Times of recent failed proofs, for the failure delay. */
  #failures = [];
  #closed = false;
  #heartbeat;
  #auditSeq = 0;
  #auditPrev = "";
  #auditHead;
  #auditQueue = [];
  #auditDraining;
  /** The sink threw and the record at the head of the queue is not written yet. */
  #auditFailed = false;
  #auditRetry;
  #auditLost = 0;
  #connRefusals;
  constructor(config) {
    if (!isObject(config)) throw new TypeError("broker config must be an object");
    if (!Array.isArray(config.agents)) throw new TypeError("config.agents must be an array");
    for (const c of config.agents) {
      if (!isObject(c) || typeof c.kid !== "string" || c.kid === "" || c.kid.includes("\n")) throw new TypeError("agent credential needs a kid");
      const who = `agent credential ${c.kid.slice(0, 64)}`;
      if (typeof c.key !== "string" || c.key.length === 0) throw new TypeError(`${who} needs a key`);
      if (c.key.length < MIN_KEY_CHARS) throw new TypeError(`${who}: key must be at least ${MIN_KEY_CHARS} characters`);
      if (c.maxSessions !== void 0 && !isPositiveInt(c.maxSessions)) throw new TypeError(`${who}: maxSessions must be a positive integer`);
      if (c.name !== void 0 && typeof c.name !== "string") throw new TypeError(`${who}: name must be a string`);
      if (c.scopes !== void 0 && !(Array.isArray(c.scopes) && c.scopes.every((x) => SCOPES.includes(x)))) {
        throw new TypeError(`${who}: scopes must be a list of known scopes (${SCOPES.join(", ")})`);
      }
      if (c.origins !== void 0 && !isStringArray(c.origins)) throw new TypeError(`${who}: origins must be a list of origin strings`);
      if (c.surfaces !== void 0 && !isStringArray(c.surfaces)) throw new TypeError(`${who}: surfaces must be a list of origin patterns`);
      if (this.#creds.has(c.kid)) throw new TypeError(`duplicate agent kid ${c.kid.slice(0, 64)}`);
      const copy = { ...c };
      if (c.scopes !== void 0) copy.scopes = [...c.scopes];
      if (c.origins !== void 0) copy.origins = [...c.origins];
      if (c.surfaces !== void 0) copy.surfaces = [...c.surfaces];
      this.#creds.set(c.kid, copy);
    }
    if (!isObject(config.surfaces) || !isStringArray(config.surfaces.origins)) throw new TypeError("config.surfaces.origins must be a list of origin patterns");
    const sc = config.surfaces;
    if (sc.requireKey !== void 0 && typeof sc.requireKey !== "boolean") throw new TypeError("surfaces.requireKey must be true or false");
    if (sc.keys !== void 0 && !isObject(sc.keys)) throw new TypeError("surfaces.keys must be an object of app id to key");
    if (sc.pins !== void 0 && !(isObject(sc.pins) && Object.values(sc.pins).every((x) => typeof x === "string"))) {
      throw new TypeError("surfaces.pins must be an object of app id to manifest digest");
    }
    const keys = { ...sc.keys ?? {} };
    for (const [id, k] of Object.entries(keys)) {
      if (typeof k !== "string" || k.length < MIN_KEY_CHARS) throw new TypeError(`surface key for ${id.slice(0, 64)} must be a string of at least ${MIN_KEY_CHARS} characters`);
    }
    this.#surfaceCfg = {
      origins: [...sc.origins],
      requireKey: sc.requireKey === true,
      keys,
      pins: { ...sc.pins ?? {} }
    };
    for (const k of ["maxSurfaces", "maxAgents", "maxStreams"]) {
      if (config[k] !== void 0 && !isPositiveInt(config[k])) throw new TypeError(`${k} must be a positive integer`);
    }
    if (config.auditKey !== void 0 && (typeof config.auditKey !== "string" || config.auditKey.length < MIN_KEY_CHARS)) {
      throw new TypeError(`auditKey must be a string of at least ${MIN_KEY_CHARS} characters`);
    }
    this.#auditKey = config.auditKey;
    this.#name = typeof config.name === "string" && config.name ? config.name : "reins-hub";
    this.#policy = resolvePolicy(config.policy);
    this.#limits = { ...DEFAULT_LIMITS, ...config.limits ?? {} };
    for (const [k, v] of Object.entries(this.#limits)) {
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) throw new TypeError(`limits.${k} must be a positive number`);
    }
    this.#sink = config.audit;
    this.#maxSurfaces = config.maxSurfaces ?? 64;
    this.#maxAgents = config.maxAgents ?? 32;
    this.#maxStreams = config.maxStreams ?? 8;
    this.#now = config.now ?? Date.now;
    const admission = (k, rate, burst) => {
      const v = config[k];
      if (v === void 0) return { rate, burst };
      const num2 = (x) => x === void 0 || typeof x === "number" && Number.isFinite(x) && x > 0;
      if (!isObject(v) || !num2(v.rate) || !num2(v.burst)) throw new TypeError(`${k} must be { rate?, burst? } with positive numbers`);
      return { rate: v.rate ?? rate, burst: v.burst ?? burst };
    };
    this.#surfaceAdmit = admission("surfaceAdmission", SURFACE_ADMIT_RATE, 2 * this.#maxSurfaces);
    this.#agentAdmit = admission("agentAdmission", AGENT_ADMIT_RATE, AGENT_ADMIT_BURST);
    this.#surfaceAdmits = new TokenBucket(5 * this.#surfaceAdmit.rate, 2 * this.#surfaceAdmit.burst, this.#now);
    this.#peerOpts = { limits: this.#limits, now: this.#now, maxBuffered: Math.max(PEER_BUFFER_MAX_BYTES, 4 * this.#limits.maxText) };
    const last = this.#sink?.last;
    if (last && Number.isSafeInteger(last.seq) && last.seq >= 0 && typeof last.hash === "string") {
      this.#auditSeq = last.seq;
      this.#auditPrev = last.hash;
      if (last.seq > 0) this.#auditHead = { seq: last.seq, hash: last.hash };
    }
    this.#connRefusals = new RefusalLimiter(this.#now, (count) => this.#audit({ kind: "connect", outcome: "suppressed", count }));
    const hb = this.#limits.heartbeatMs;
    this.#heartbeat = unref2(setInterval(() => this.#tick(), Math.max(10, Math.min(1e3, Math.floor(hb / 4)))));
  }
  /** Totals, for the hub's owner. Agents get `#infoFor`. */
  info() {
    return {
      name: this.#name,
      ver: HUB_VERSION,
      v: [...SUPPORTED_VERSIONS],
      profile: this.#policy.profile,
      surfaces: this.#surfaces.size,
      agents: this.#agents.size
    };
  }
  /**
   * `hub.info` as an agent sees it: `surfaces` counts only surfaces its credential may
   * attach to, and `agents` only the sessions of its own credential.
   */
  #infoFor(a) {
    let surfaces = 0;
    for (const s of this.#surfaces.values()) if (this.#mayAttachTo(a, s)) surfaces++;
    return { ...this.info(), surfaces, agents: this.#sessionsOf(a.cred) };
  }
  /** Where the written audit chain ends, or undefined before the first record. */
  auditHead() {
    return this.#auditHead ? { ...this.#auditHead } : void 0;
  }
  /** Resolves once every queued audit record is written, or the sink is failing. */
  async flushAudit() {
    for (let i = 0; i < 1e3 && this.#auditQueue.length > 0 && !this.#auditFailed; i++) {
      await (this.#auditDraining ?? this.#drainAudit());
    }
  }
  /** Send `bye {code:"OK"}` to every peer, stop every timer, refuse new links. */
  close() {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#heartbeat !== void 0) clearInterval(this.#heartbeat);
    this.#heartbeat = void 0;
    for (const h of [...this.#handshakes]) {
      if (h.abort) {
        h.abort();
        continue;
      }
      h.finish();
      this.#refuse(h.link, "OK", "hub shutting down");
    }
    this.#handshakes.clear();
    for (const a of [...this.#agents.values()]) a.peer.bye("OK", "hub shutting down");
    for (const s of [...this.#surfaces.values()]) s.peer.bye("OK", "hub shutting down");
    for (const a of this.#agents.values()) for (const g of a.grants.values()) clearTimeout(g.timer);
    this.#connRefusals.flush();
    if (this.#auditRetry !== void 0) clearTimeout(this.#auditRetry);
    this.#auditRetry = void 0;
  }
  // ───────────────────────────── handshake ─────────────────────────────
  accept(link, meta = {}) {
    const origin = typeof meta.origin === "string" ? meta.origin : void 0;
    const only = meta.role === "agent" || meta.role === "surface" ? meta.role : void 0;
    const vouched = meta.vouched === true;
    if (this.#closed) {
      this.#refuse(link, "E_BUSY", "hub is shutting down");
      return;
    }
    if (this.#handshakes.size >= MAX_HANDSHAKES) {
      this.#refuse(link, "E_BUSY", "too many pending handshakes");
      this.#auditConnFailure({ kind: "connect", outcome: "E_BUSY", origin });
      return;
    }
    link.limitInbound?.(PREAUTH_MESSAGES, PREAUTH_BYTES);
    const nonce = randomToken(32);
    const challengeText = encodeFrame({ t: "challenge", v: [...SUPPORTED_VERSIONS], nonce, hub: { name: this.#name, ver: HUB_VERSION } });
    let done = false;
    const release = () => {
      done = true;
      clearTimeout(entry.timer);
      clearTimeout(entry.delay);
      this.#handshakes.delete(entry);
    };
    const entry = {
      link,
      timer: void 0,
      delay: void 0,
      finish: () => {
        release();
        link.onmessage = null;
        link.onclose = null;
      }
    };
    const refuse = (code, msg, role2, kid) => {
      if (done) return;
      entry.finish();
      this.#refuse(link, code, msg);
      this.#auditConnFailure({ kind: "connect", outcome: code, role: role2, origin, kid });
    };
    entry.timer = unref2(setTimeout(() => refuse("E_TIMEOUT", "handshake timed out"), HANDSHAKE_MS));
    this.#handshakes.add(entry);
    link.onclose = () => {
      if (!done && entry.delay === void 0) entry.finish();
    };
    link.onmessage = (data) => {
      link.onmessage = null;
      if (typeof data !== "string") return refuse("E_BAD_FRAME", "expected hello");
      let f;
      try {
        f = decodeFrame(data, this.#limits.maxText);
      } catch (e) {
        const code = e instanceof ReinsError && e.code === "E_TOO_LARGE" ? "E_TOO_LARGE" : "E_BAD_FRAME";
        return refuse(code, code === "E_TOO_LARGE" ? "frame too large" : "malformed frame");
      }
      if (f.t !== "hello") return refuse("E_BAD_FRAME", "expected hello");
      const hello = f;
      const kid = hello.role === "agent" && hello.auth ? hello.auth.kid.slice(0, 64) : void 0;
      if (only !== void 0 && hello.role !== only) return refuse("E_ORIGIN", `this connection does not take the ${hello.role === "surface" ? "surface" : "agent"} role`, hello.role, kid);
      if (!SUPPORTED_VERSIONS.includes(hello.v)) return refuse("E_VERSION", "no common protocol version", hello.role, kid);
      clearTimeout(entry.timer);
      entry.timer = unref2(setTimeout(() => refuse("E_TIMEOUT", "handshake timed out"), HANDSHAKE_MS + FAIL_DELAY_MAX_MS));
      this.#admit(hello, nonce, origin).then(
        (r) => {
          if (done) return;
          if (this.#closed) return refuse("E_BUSY", "hub is shutting down", hello.role, kid);
          if (!r.ok) {
            if (!r.badProof) return refuse(r.code, r.msg, hello.role, kid);
            link.onmessage = noop;
            entry.delay = unref2(setTimeout(() => refuse(r.code, r.msg, hello.role, kid), this.#failureDelay()));
            return;
          }
          const full = this.#capacityRefusal(r);
          if (full) return refuse("E_BUSY", full, r.role, kid);
          const key = r.role === "agent" ? r.cred.key : r.key;
          if (key === void 0) {
            entry.finish();
            if (!link.open) return;
            link.limitInbound?.();
            const id2 = `s${++this.#surfaceSeq}`;
            this.#welcome(link, hello.v, id2, "surface", void 0);
            this.#addSurface(link, r, id2, vouched);
            return;
          }
          if (!link.open) return entry.finish();
          clearTimeout(entry.timer);
          clearTimeout(entry.delay);
          link.onclose = null;
          const id = r.role === "agent" ? `a${++this.#agentSeq}` : `s${++this.#surfaceSeq}`;
          const welcomeText = this.#welcome(link, hello.v, id, r.role, r.proof);
          entry.abort = () => {
            release();
            link.close();
          };
          hubSeal(link, { key, nonce, cnonce: hello.cnonce, challengeText, helloText: data, welcomeText }).then(
            (sealed2) => {
              if (done) return sealed2.close();
              release();
              link.limitInbound?.();
              if (this.#closed) return this.#refuse(sealed2, "OK", "hub shutting down");
              const late = this.#capacityRefusal(r);
              if (late) {
                this.#refuse(sealed2, "E_BUSY", late);
                this.#auditConnFailure({ kind: "connect", outcome: "E_BUSY", role: r.role, origin, kid });
                return;
              }
              if (r.role === "agent") this.#addAgent(sealed2, hello, r.cred, id, origin);
              else this.#addSurface(sealed2, r, id, vouched);
            },
            () => {
              if (done) return;
              release();
              this.#auditConnFailure({ kind: "connect", outcome: "E_AUTH", role: r.role, origin, kid });
            }
          );
        },
        () => refuse("E_INTERNAL", "handshake failed", hello.role, kid)
      );
    };
    try {
      link.send(challengeText);
    } catch {
      refuse("E_GONE", "connection closed");
    }
  }
  /** Why admitting `r` now would exceed a capacity, or undefined. */
  #capacityRefusal(r) {
    if (r.role === "agent") {
      if (this.#agents.size >= this.#maxAgents) return "too many agents";
      if (this.#sessionsOf(r.cred) >= (r.cred.maxSessions ?? DEFAULT_MAX_SESSIONS)) return "too many sessions for this credential";
      return void 0;
    }
    return this.#surfaces.size >= this.#maxSurfaces ? "too many surfaces" : void 0;
  }
  #refuse(link, code, msg) {
    try {
      if (link.open) link.send(encodeFrame({ t: "bye", code, msg }));
    } catch {
    }
    link.close();
  }
  #sessionsOf(cred) {
    let n = 0;
    for (const a of this.#agents.values()) if (a.cred.kid === cred.kid) n++;
    return n;
  }
  /** Count a failed proof and say how long to wait before answering it. */
  #failureDelay() {
    const now4 = this.#now();
    this.#failures = this.#failures.filter((t) => now4 - t < FAIL_WINDOW_MS && t <= now4);
    this.#failures.push(now4);
    if (this.#failures.length > 64) this.#failures.splice(0, this.#failures.length - 64);
    const n = this.#failures.length;
    return Math.min(FAIL_DELAY_MAX_MS, FAIL_DELAY_MS * 2 ** Math.min(n - 1, 16));
  }
  /** Take an admission token for `key`: `o\n<origin>` for a surface, `k\n<kid>` for an agent. */
  #admitAllowed(key) {
    const now4 = this.#now();
    let e = this.#admits.get(key);
    if (e === void 0) {
      if (this.#admits.size >= MAX_ADMIT_KEYS) {
        const full = Math.max(this.#surfaceAdmit.burst / this.#surfaceAdmit.rate, this.#agentAdmit.burst / this.#agentAdmit.rate) * 1e3;
        for (const [k, v] of this.#admits) if (now4 - v.last >= full || v.last > now4) this.#admits.delete(k);
        if (this.#admits.size >= MAX_ADMIT_KEYS) return false;
      }
      const cfg = key.startsWith("o\n") ? this.#surfaceAdmit : this.#agentAdmit;
      e = { bucket: new TokenBucket(cfg.rate, cfg.burst, this.#now), last: now4 };
      this.#admits.set(key, e);
    }
    e.last = now4;
    return e.bucket.take();
  }
  /** Compute the expected peer proof; null when the fields are unusable. */
  async #expectedProof(key, role2, kid, nonce, cnonce) {
    try {
      return await peerProof(key, { role: role2, kid, nonce, cnonce });
    } catch {
      return null;
    }
  }
  async #admit(f, nonce, origin) {
    if (f.role === "agent") {
      if (!f.auth) return { ok: false, code: "E_AUTH", msg: "authentication required", badProof: true };
      const cred = this.#creds.get(f.auth.kid);
      const expected = await this.#expectedProof(cred ? cred.key : this.#dummyKey, "agent", f.auth.kid, nonce, f.cnonce);
      const match = expected !== null && timingSafeEqual(f.auth.proof, expected);
      if (!cred || !match) return { ok: false, code: "E_AUTH", msg: "authentication failed", badProof: true };
      if (origin !== void 0 && !(Array.isArray(cred.origins) && originAllowed(origin, cred.origins))) {
        return { ok: false, code: "E_ORIGIN", msg: "origin not allowed for this agent" };
      }
      if (!this.#admitAllowed(`k
${cred.kid}`)) return { ok: false, code: "E_RATE", msg: "too many connections for this credential" };
      const proof2 = await hubProof(cred.key, { role: "agent", kid: f.auth.kid, nonce, cnonce: f.cnonce });
      return { ok: true, role: "agent", cred, proof: proof2 };
    }
    if (origin === void 0 || !originAllowed(origin, this.#surfaceCfg.origins)) return { ok: false, code: "E_ORIGIN", msg: "origin not allowed" };
    if (this.#surfaces.size >= this.#maxSurfaces) return { ok: false, code: "E_BUSY", msg: "too many surfaces" };
    if (!this.#admitAllowed(`o
${origin}`) || !this.#surfaceAdmits.take()) return { ok: false, code: "E_RATE", msg: "too many surface connections" };
    const sh = f.surface;
    if (!sh) return { ok: false, code: "E_BAD_ARGS", msg: "surface hello missing" };
    let url;
    try {
      if (sh.url.length > MAX_URL_CHARS) throw new Error("long");
      url = new URL(sh.url);
    } catch {
      return { ok: false, code: "E_BAD_ARGS", msg: "invalid surface url" };
    }
    if (!urlHasOrigin(sh.url, origin)) return { ok: false, code: "E_ORIGIN", msg: "surface url does not match origin" };
    let manifest;
    try {
      manifest = validateManifest(sh.manifest);
    } catch (e) {
      if (e instanceof ReinsError) return { ok: false, code: e.code, msg: e.message.slice(0, 200) };
      return { ok: false, code: "E_BAD_ARGS", msg: "invalid manifest" };
    }
    let proof;
    let surfaceKey;
    const keys = this.#surfaceCfg.keys;
    if (this.#surfaceCfg.requireKey || f.auth || hasOwn3(keys, manifest.app.id)) {
      if (!f.auth) return { ok: false, code: "E_AUTH", msg: "surface key required" };
      const kid = f.auth.kid;
      const key = kid === manifest.app.id && hasOwn3(keys, kid) && typeof keys[kid] === "string" ? keys[kid] : void 0;
      const expected = await this.#expectedProof(key ?? this.#dummyKey, "surface", kid, nonce, f.cnonce);
      const match = expected !== null && timingSafeEqual(f.auth.proof, expected);
      if (key === void 0 || !match) return { ok: false, code: "E_AUTH", msg: "authentication failed", badProof: true };
      proof = await hubProof(key, { role: "surface", kid, nonce, cnonce: f.cnonce });
      surfaceKey = key;
    }
    const digest = await manifestDigest(manifest);
    const pins = this.#surfaceCfg.pins;
    if (hasOwn3(pins, manifest.app.id) && pins[manifest.app.id] !== digest) {
      return { ok: false, code: "E_DENIED", msg: "manifest does not match the pinned digest" };
    }
    const r = { ok: true, role: "surface", manifest, digest, url: url.href, title: sh.title.slice(0, MAX_TITLE_CHARS), origin };
    if (proof !== void 0) {
      r.proof = proof;
      r.key = surfaceKey;
    }
    return r;
  }
  /** Send `welcome` and return its text exactly as sent. */
  #welcome(link, v, session, role2, proof) {
    const w = { t: "welcome", v, session, role: role2, limits: { ...this.#limits } };
    if (proof !== void 0) w.proof = proof;
    const text = encodeFrame(w);
    link.send(text);
    return text;
  }
  /** The name shown to the user: the credential's, else the declared one, cleaned. */
  #displayName(cred, declared) {
    if (typeof cred.name === "string" && cred.name !== "") return cleanName(cred.name, MAX_AGENT_NAME);
    const name2 = typeof declared === "string" ? cleanName(declared, MAX_AGENT_NAME) : "";
    return name2 !== "" ? name2 : cleanName(cred.kid, MAX_AGENT_NAME);
  }
  /** Register a confirmed agent session; `welcome` (with session `id`) has been sent. */
  #addAgent(link, hello, cred, id, origin) {
    const a = {
      id,
      role: "agent",
      name: this.#displayName(cred, hello.name),
      cred,
      grants: /* @__PURE__ */ new Map(),
      streams: /* @__PURE__ */ new Map(),
      attaching: /* @__PURE__ */ new Set(),
      refusals: new RefusalLimiter(this.#now, (count) => this.#audit({ kind: "request", outcome: "suppressed", agent: id, count })),
      lastPing: 0,
      peer: void 0
    };
    this.#agents.set(id, a);
    a.peer = new Peer(
      link,
      {
        request: (m, p) => this.#agentRequest(a, m, p),
        binary: (bytes) => this.#agentBinary(a, bytes),
        close: (code) => this.#agentGone(a, code)
      },
      this.#peerOpts
    );
    this.#audit({ kind: "connect", outcome: "ok", role: "agent", agent: id, origin, kid: cred.kid.slice(0, 64) });
  }
  /** Register a surface session (confirmed when keyed); `welcome` (with session `id`) has been sent. */
  #addSurface(link, r, id, vouched = false) {
    const s = {
      id,
      role: "surface",
      origin: r.origin,
      url: r.url,
      title: r.title,
      manifest: r.manifest,
      digest: r.digest,
      // It proved a key, or the code that linked it in-process vouches for it.
      verified: r.key !== void 0 || vouched,
      actions: new Map(r.manifest.actions.map((x) => [x.name, x])),
      grants: /* @__PURE__ */ new Map(),
      person: new RefusalLimiter(this.#now, (count) => this.#audit({ kind: "person", outcome: "suppressed", surface: id, count })),
      chat: new RefusalLimiter(this.#now, (count) => this.#audit({ kind: "chat", outcome: "suppressed", surface: id, method: "relay", count })),
      undelivered: new TokenBucket(UNDELIVERED_PER_SEC, UNDELIVERED_PER_SEC, this.#now),
      lastPing: 0,
      peer: void 0
    };
    this.#surfaces.set(id, s);
    s.peer = new Peer(
      link,
      {
        request: () => fail3("E_UNKNOWN_METHOD", "unknown method"),
        event: (f) => this.#surfaceEvent(s, f),
        flow: (f) => this.#surfaceFlow(s, f),
        close: (code) => this.#surfaceGone(s, code)
      },
      this.#peerOpts
    );
    this.#audit({ kind: "connect", outcome: "ok", role: "surface", surface: id, origin: r.origin });
    this.#broadcastSurface("added", s);
  }
  // ───────────────────────────── disconnects ─────────────────────────────
  #agentGone(a, code) {
    if (this.#agents.get(a.id) !== a) return;
    this.#agents.delete(a.id);
    for (const sid of a.attaching) {
      const s = this.#surfaces.get(sid);
      if (s && !this.#closed && !s.peer.closed) s.peer.request("detach", { why: "agent" }, { ag: a.id }).catch(noop);
    }
    a.attaching.clear();
    for (const g of [...a.grants.values()]) this.#endGrant(g, "agent");
    for (const st of [...a.streams.values()]) this.#dropStream(st, true);
    a.refusals.flush();
    this.#audit({ kind: "disconnect", outcome: code, role: "agent", agent: a.id });
  }
  #surfaceGone(s, code) {
    if (this.#surfaces.get(s.id) !== s) return;
    this.#surfaces.delete(s.id);
    for (const g of [...s.grants.values()]) this.#endGrant(g, "surface");
    for (const st of [...this.#streams.values()]) if (st.surface === s) this.#dropStream(st, false);
    const mark = `
${s.id}|`;
    for (const k of [...this.#buckets.keys()]) if (k.includes(mark)) this.#buckets.delete(k);
    s.person.flush();
    s.chat.flush();
    this.#audit({ kind: "disconnect", outcome: code, role: "surface", surface: s.id });
    if (!this.#closed) this.#broadcastSurface("gone", s);
  }
  // ───────────────────────────── surface info and events ─────────────────────────────
  /** May this agent's credential attach to (and so hear about) this surface? */
  #mayAttachTo(a, s) {
    return !Array.isArray(a.cred.surfaces) || originAllowed(s.origin, a.cred.surfaces);
  }
  /** The agent's grant on `s` if it is live, without ending it when it is not. */
  #currentGrant(a, s) {
    const g = a.grants.get(s.id);
    return g !== void 0 && this.#expiry(g) === null && this.#surfaces.get(s.id) === s ? g : void 0;
  }
  /**
   * What an agent may know about a surface. The full URL and title only go to an agent
   * whose live grant includes `observe`; anyone else gets the origin and the app's name.
   */
  #surfaceInfo(s, a) {
    const g = this.#currentGrant(a, s);
    const full = g !== void 0 && g.scopes.includes("observe");
    return {
      s: s.id,
      origin: s.origin,
      url: full ? s.url : s.origin,
      title: full ? s.title : s.manifest.app.name,
      app: { ...s.manifest.app },
      profile: s.manifest.profile,
      digest: s.digest,
      attached: g !== void 0,
      verified: s.verified
    };
  }
  #broadcastSurface(kind, s) {
    for (const a of this.#agents.values()) {
      if (!this.#mayAttachTo(a, s)) continue;
      if (kind === "changed" && this.#currentGrant(a, s) === void 0) continue;
      try {
        a.peer.event("surface", { kind, surface: this.#surfaceInfo(s, a) });
      } catch {
      }
    }
  }
  #surfaceEvent(s, f) {
    if (this.#surfaces.get(s.id) !== s) return;
    const topic = f.topic;
    if (topic === "grant") {
      const d = f.d;
      if (!isObject(d)) return;
      if (d.kind === "revoked") {
        if (f.ag !== void 0) {
          const g = s.grants.get(f.ag);
          if (g) this.#endGrant(g, "revoked");
        } else {
          for (const g of [...s.grants.values()]) this.#endGrant(g, "revoked");
        }
      } else if (d.kind === "scopes") this.#personScopes(s, f.ag, d.scopes);
      return;
    }
    if (topic === "user" && isObject(f.d) && f.d.kind === "relay") {
      this.#personRelay(s, f.ag, f.d);
      return;
    }
    if (topic === "user" && isObject(f.d) && (f.d.kind === "level" || f.d.kind === "rule")) {
      this.#personSetting(s, f.ag, f.d);
      return;
    }
    if (topic === "chat") {
      this.#chatEvent(s, f);
      return;
    }
    if (!TOPICS.includes(topic) || !hasOwn3(TOPIC_SCOPE, topic)) return;
    if (topic === "nav" && !this.#applyNav(s, f.d)) return;
    const need = TOPIC_SCOPE[topic];
    const hears = (g) => g !== void 0 && this.#live(g) && (need === null || need === void 0 || g.scopes.includes(need));
    let targets;
    if (f.ag !== void 0) {
      const g = s.grants.get(f.ag);
      targets = hears(g) ? [g.agent] : [];
    } else {
      targets = [...s.grants.values()].filter(hears).map((g) => g.agent);
    }
    for (const a of targets) {
      try {
        a.peer.event(f.topic, f.d, { s: s.id });
      } catch {
      }
    }
  }
  /** The live grant a surface event names with `ag`, or undefined. */
  #namedGrant(s, ag) {
    const g = ag === void 0 ? void 0 : s.grants.get(ag);
    return g !== void 0 && this.#live(g) ? g : void 0;
  }
  /**
   * A report that changes nothing this hub holds: one that repeats the value it has, or one
   * it does not take. Its record is bounded per surface: beyond the rate such records are
   * counted and summarised. No change of what the hub holds or relays goes through here.
   */
  #personNoted(g, outcome, method, value, action) {
    if (g.surface.person.allow()) this.#audit({ kind: "person", outcome, agent: g.agent.id, surface: g.surface.id, method, value, action });
  }
  /**
   * A report that changes what this hub holds for the grant, and what it tells the agent: it
   * is always recorded, whatever else the surface sent in the same second. Returns false,
   * and ends the grant, when the grant reports more changes in a second than a person makes:
   * that one is recorded as refused and is neither kept nor relayed. `loosens`: the change
   * lets the agent do or hear more than before; such a change also ends the grant when the
   * audit log cannot be written.
   */
  #personChange(g, method, value, loosens, action) {
    if (loosens && this.#auditUnavailable()) {
      this.#audit({ kind: "person", outcome: "refused", agent: g.agent.id, surface: g.surface.id, method, value, action });
      this.#endGrant(g, "audit");
      return false;
    }
    const t = this.#now();
    if (t - g.changesAt >= 1e3 || t < g.changesAt) {
      g.changesAt = t;
      g.changes = 0;
    }
    const ok = g.changes < PERSON_CHANGES_PER_SEC;
    this.#audit({ kind: "person", outcome: ok ? "ok" : "refused", agent: g.agent.id, surface: g.surface.id, method, value, action });
    if (ok) g.changes++;
    else this.#endGrant(g, "reports");
    return ok;
  }
  /**
   * A surface reports the level the person set for one grant, or a rule for one action
   * (`evt user {kind:"level"|"rule"}` with `ag`). Malformed reports are dropped.
   *
   *  - A level this hub's policy does not offer (`auto` or `bypass` that `human.levels` lacks)
   *    ends the grant: an honest surface was told the levels at attach and offers no other.
   *    `strict` and `ask` are always on offer.
   *  - A rule `allow` this hub's policy would not let waive anything (the hub denies the
   *    action, or wants it confirmed and offers no level that would waive that) is recorded as
   *    refused and neither kept nor relayed. The grant goes on: the hub still marks or refuses
   *    every request for that action itself.
   *  - A report that repeats what the hub holds changes nothing and is not relayed.
   *  - Anything else is a change: kept, always recorded, and told to that agent alone, in an
   *    event built from the checked values.
   */
  #personSetting(s, ag, d) {
    const g = this.#namedGrant(s, ag);
    if (!g) return;
    const offered = capLevels(this.#policy.human.levels);
    let payload;
    if (d.kind === "level") {
      const level = LEVELS.find((l) => l === d.level);
      if (level === void 0) return;
      if (!offered.includes(level)) {
        this.#audit({ kind: "person", outcome: "refused", agent: g.agent.id, surface: s.id, method: "level", value: level });
        this.#endGrant(g, "level");
        return;
      }
      if (g.level === level) return this.#personNoted(g, "ok", "level", level);
      if (!this.#personChange(g, "level", level, LEVELS.indexOf(level) > LEVELS.indexOf(g.level))) return;
      g.level = level;
      payload = { kind: "level", level };
    } else {
      const def = typeof d.a === "string" ? s.actions.get(d.a) : void 0;
      const rule2 = d.d;
      if (!def || rule2 !== null && rule2 !== "allow" && rule2 !== "confirm" && rule2 !== "deny") return;
      if (rule2 === "allow") {
        const mine = decideAction(this.#policy, def);
        if (mine === "deny" || mine === "confirm" && !allowRulePermitted(def.risk, offered)) return this.#personNoted(g, "refused", "rule", "allow", def.name);
      }
      if ((g.rules.get(def.name) ?? null) === rule2) return this.#personNoted(g, "ok", "rule", rule2 ?? "none", def.name);
      const holds = (r) => r === "deny" ? 2 : r === "confirm" ? 1 : r === "allow" ? -1 : 0;
      if (!this.#personChange(g, "rule", rule2 ?? "none", holds(rule2) < holds(g.rules.get(def.name)), def.name)) return;
      if (rule2 === null) g.rules.delete(def.name);
      else g.rules.set(def.name, rule2);
      payload = { kind: "rule", a: def.name, d: rule2 };
    }
    try {
      g.agent.peer.event("user", payload, { s: s.id });
    } catch {
    }
  }
  /**
   * A surface reports that the person lets one agent hear, and be heard by, the other agents
   * they switched on in the chat, or no longer does (`evt user {kind:"relay"}` with `ag`).
   * A malformed report, and one for a grant that was never granted `chat`, is dropped.
   *
   *  - `on` under a hub policy that relays nothing (`chatRelay: "off"`), or for a grant whose
   *    `chat` scope is switched off, is recorded as refused and not kept. The grant goes on:
   *    the hub decides for itself what it relays, whatever a surface reports.
   *  - A report that repeats what the hub holds changes nothing and is not relayed.
   *  - Anything else is a change: kept, always recorded, and told to that agent alone, in an
   *    event built from the checked value.
   */
  #personRelay(s, ag, d) {
    const g = this.#namedGrant(s, ag);
    if (!g || typeof d.on !== "boolean" || !g.granted.includes("chat")) return;
    const on = d.on;
    if (on && (this.#policy.chatRelay === "off" || !g.scopes.includes("chat"))) return this.#personNoted(g, "refused", "relay", "on");
    if (g.relay === on) return this.#personNoted(g, "ok", "relay", on ? "on" : "off");
    if (!this.#personChange(g, "relay", on ? "on" : "off", on)) return;
    g.relay = on;
    try {
      g.agent.peer.event("user", { kind: "relay", on }, { s: s.id });
    } catch {
    }
  }
  /** Does this hub's policy let `listener` be sent what `sender` says: always under `on`, never under `off`, and under `person` when the person switched both on. */
  #hears(listener, sender) {
    const mode = this.#policy.chatRelay;
    return mode === "on" || mode === "person" && listener.relay && sender.relay;
  }
  /**
   * The budget of what this hub still relays to one grant from one sender. The person's
   * messages have their own, which nothing an agent sends uses up. An agent's words reach
   * another agent no faster than that agent's own `chat` rate lets it speak, with room for a
   * second's worth that arrives late: a surface that relays what `chat.say` let through is
   * never cut short, and one that sends more is.
   */
  #chatBudget(g, sender) {
    if (!sender) return g.chatPerson ??= new TokenBucket(PERSON_CHAT_RATE, PERSON_CHAT_BURST, this.#now);
    const id = sender.agent.id;
    let b = g.chatIn.get(id);
    if (!b) {
      if (g.chatIn.size >= CHAT_SENDERS_MAX) {
        for (const k of [...g.chatIn.keys()]) if (!g.surface.grants.has(k)) g.chatIn.delete(k);
      }
      const rate = this.#policy.rates.chat;
      b = new TokenBucket(rate, rate * 2, this.#now);
      g.chatIn.set(id, b);
    }
    return b;
  }
  /**
   * A message of the person was not relayed to the agent it was for. The surface is told, so
   * that the page shows the message as not delivered to that agent (`chat.undelivered` with
   * `ag` and the message's id), and the hub puts it on record, without the text.
   */
  #chatUndelivered(s, g, m, why) {
    if (s.person.allow()) this.#audit({ kind: "person", outcome: why, agent: g.agent.id, surface: s.id, method: "chat", chars: m.text.length });
    if (!s.undelivered.take() || s.peer.closed) return;
    s.peer.request("chat.undelivered", { id: m.id }, { ag: g.agent.id }).catch(noop);
  }
  /**
   * A surface sends one message of its chat room to one agent (`evt chat` with `ag`). It is
   * relayed only to the grant it names, only while that grant is live and holds `chat`, and
   * only in an event rebuilt from the checked fields. Everything else is dropped:
   *
   *  - no `ag`, or an `ag` that names no live grant on this surface: a surface speaks to its
   *    own grants and to nobody else, and a chat message is never broadcast;
   *  - a message that is not well-shaped, or addressed (`to`) to anyone but that agent: one
   *    for another agent, and an agent's message for the person alone (`to: "person"`);
   *  - another agent's words when this hub's policy does not let this agent hear them
   *    (`chatRelay`: never under `off`, and under `person` only when the person switched both
   *    agents on), when their sender holds no live `chat` grant here, or when they would go
   *    back to their sender.
   *
   * The sender's name is the one this hub gave that agent, never the one in the event. What
   * the person said is on record as a `person` record with a digest and a length, never the
   * text, before it is relayed; where the audit log cannot take the record, the message is
   * not relayed. What an agent said was recorded when its `chat.say` passed.
   *
   * Each sender has its own budget for each agent that listens (`#chatBudget`). A message of
   * the person the hub does not relay is told to the surface (`#chatUndelivered`); a relay of
   * an agent's words beyond that agent's budget is dropped and counted in a `chat` record.
   */
  #chatEvent(s, f) {
    const g = this.#namedGrant(s, f.ag);
    if (!g || !g.scopes.includes("chat")) return;
    const m = chatMessage(f.d);
    if (!m) return;
    if (m.to !== void 0 && m.to !== g.agent.id) return;
    const d = { id: m.id, from: { kind: "person" }, text: m.text, ts: m.ts };
    if (m.to !== void 0) d.to = m.to;
    if (m.from.kind === "agent") {
      const sender = this.#namedGrant(s, m.from.id);
      if (!sender || sender === g || !sender.scopes.includes("chat")) return;
      if (!this.#hears(g, sender)) {
        if (s.chat.allow()) this.#audit({ kind: "chat", outcome: "refused", agent: sender.agent.id, surface: s.id, method: "relay" });
        return;
      }
      if (this.#auditUnavailable()) return;
      if (!this.#chatBudget(g, sender).take()) {
        if (s.chat.allow()) this.#audit({ kind: "chat", outcome: "dropped", agent: sender.agent.id, surface: s.id, method: "relay" });
        return;
      }
      d.from = { kind: "agent", id: sender.agent.id, name: sender.agent.name };
    } else {
      if (!this.#chatBudget(g, void 0).take()) return this.#chatUndelivered(s, g, m, "E_RATE");
      if (this.#auditUnavailable()) return this.#chatUndelivered(s, g, m, "E_INTERNAL");
      const said = { text: m.text };
      if (m.to !== void 0) said.to = m.to;
      this.#audit({ kind: "person", outcome: "ok", agent: g.agent.id, surface: s.id, method: "chat", chars: m.text.length }, canonicalJson(said));
    }
    try {
      g.agent.peer.event("chat", d, { s: s.id });
    } catch {
      if (d.from.kind === "person") this.#chatUndelivered(s, g, m, "E_TOO_LARGE");
    }
  }
  /**
   * A surface reports the scopes now in force for one grant (`evt grant {kind:"scopes"}`
   * with `ag`): the person switched some off, or back on. The grant then carries the
   * reported scopes that were granted at attach, never more. Without `cursor` the agent's
   * pointer streams on the surface are closed.
   */
  #personScopes(s, ag, list2) {
    const g = this.#namedGrant(s, ag);
    if (!g || !Array.isArray(list2)) return;
    const a = g.agent;
    const scopes = capScopes(list2.filter((x) => typeof x === "string"), [...g.granted]);
    const value = scopes.length > 0 ? scopes.join(" ") : "none";
    if (scopes.length === g.scopes.length && scopes.every((x) => g.scopes.includes(x))) return this.#personNoted(g, "ok", "scopes", value);
    if (!this.#personChange(g, "scopes", value, scopes.some((x) => !g.scopes.includes(x)))) return;
    g.scopes = scopes;
    if (!scopes.includes("chat")) g.relay = false;
    if (!scopes.includes("cursor")) {
      for (const st of [...a.streams.values()]) if (st.surface === s) this.#dropStream(st, true);
    }
    try {
      a.peer.event("grant", { kind: "scopes", scopes: [...scopes] }, { s: s.id });
      a.peer.event("surface", { kind: "changed", surface: this.#surfaceInfo(s, a) });
    } catch {
    }
  }
  /** A surface reports a same-origin navigation. Returns whether it was accepted. */
  #applyNav(s, d) {
    if (!isObject(d) || typeof d.url !== "string" || typeof d.title !== "string" || d.url.length > MAX_URL_CHARS) return false;
    let u;
    try {
      u = new URL(d.url);
    } catch {
      return false;
    }
    if (!urlHasOrigin(d.url, s.origin)) return false;
    const title = d.title.slice(0, MAX_TITLE_CHARS);
    if (u.href !== s.url || title !== s.title) {
      s.url = u.href;
      s.title = title;
      this.#broadcastSurface("changed", s);
    }
    return true;
  }
  #surfaceFlow(s, f) {
    const st = this.#streams.get(f.ch);
    if (!st || st.surface !== s || st.overrun || !st.ready) return;
    if (!(Number.isFinite(f.credit) && f.credit > 0)) return;
    st.credit.grant(f.credit);
    try {
      st.agent.peer.flow(f.ch, f.credit);
    } catch {
    }
  }
  // ───────────────────────────── grants ─────────────────────────────
  /** Why `g` has ended by time, or null while it is live. */
  #expiry(g) {
    const now4 = this.#now();
    if (now4 >= g.exp) return "expired";
    if (now4 - g.used >= this.#policy.idleMs) return "idle";
    return null;
  }
  #live(g) {
    const why = this.#expiry(g);
    if (why === null) return true;
    this.#endGrant(g, why);
    return false;
  }
  /** The agent's live grant on `s`, ending it first if it has run out. */
  #liveGrant(a, s) {
    const g = a.grants.get(s.id);
    return g && this.#live(g) ? g : void 0;
  }
  #schedule(g) {
    if (g.timer !== void 0) clearTimeout(g.timer);
    if (this.#closed) return;
    const due = Math.min(g.exp, g.used + this.#policy.idleMs) - this.#now();
    g.timer = unref2(
      setTimeout(
        () => {
          g.timer = void 0;
          if (g.agent.grants.get(g.surface.id) !== g) return;
          const why = this.#expiry(g);
          if (why) this.#endGrant(g, why);
          else this.#schedule(g);
        },
        Math.max(0, Math.min(MAX_TIMER_MS, due))
      )
    );
  }
  #endGrant(g, why) {
    const { agent: a, surface: s } = g;
    if (a.grants.get(s.id) !== g) return;
    a.grants.delete(s.id);
    if (s.grants.get(a.id) === g) s.grants.delete(a.id);
    if (g.timer !== void 0) clearTimeout(g.timer);
    g.timer = void 0;
    if (why !== "replaced") {
      for (const st of [...a.streams.values()]) if (st.surface === s) this.#dropStream(st, why !== "surface");
    }
    if (!this.#closed) {
      if (why === "agent" || why === "expired" || why === "idle" || why === "hub" || why === "level" || why === "reports" || why === "audit") {
        const reason = why === "idle" ? "expired" : why === "level" || why === "reports" || why === "audit" ? "hub" : why;
        if (!s.peer.closed) s.peer.request("detach", { why: reason }, { ag: a.id }).catch(noop);
      }
      if (why === "expired" || why === "idle" || why === "revoked" || why === "level" || why === "reports" || why === "audit") {
        try {
          a.peer.event("grant", { kind: why === "expired" || why === "idle" ? "expired" : "revoked" }, { s: s.id });
        } catch {
        }
      }
    }
    this.#audit({ kind: "grant.end", outcome: why, agent: a.id, surface: s.id });
  }
  /**
   * The rate bucket of a credential (shared by all its sessions) on a surface, by scope;
   * `pointer` is the point budget of all its pointer streams there (`policy.pointerRate`).
   */
  #bucket(a, s, scope) {
    const k = `${a.cred.kid}
${s.id}|${scope}`;
    let b = this.#buckets.get(k);
    if (!b) {
      const rate = scope === "attach" ? ATTACH_RATE : scope === "pointer" ? this.#policy.pointerRate : this.#policy.rates[scope];
      b = new TokenBucket(rate, scope === "attach" ? ATTACH_BURST : void 0, this.#now);
      this.#buckets.set(k, b);
    }
    return b;
  }
  /** The bucket `hub.info` and `surfaces.list` draw on, per credential. */
  #hubBucket(a) {
    const k = `${a.cred.kid}
|hub`;
    let b = this.#buckets.get(k);
    if (!b) {
      b = new TokenBucket(HUB_METHOD_RATE, HUB_METHOD_BURST, this.#now);
      this.#buckets.set(k, b);
    }
    return b;
  }
  // ───────────────────────────── agent requests ─────────────────────────────
  #requestRecord(a, kind, m, p, outcome) {
    const rec = { kind, outcome, agent: a.id, method: m.slice(0, 64) };
    if (typeof p.s === "string") rec.surface = p.s.slice(0, 32);
    if (m === "act" && typeof p.a === "string") rec.action = p.a.slice(0, 64);
    if (m === "chat.say" && typeof p.text === "string") rec.chars = p.text.length;
    return rec;
  }
  async #agentRequest(a, m, p) {
    const started = this.#now();
    if (m === "chat.say") p = chatSayParams(p);
    const kind = m === "surface.attach" ? "attach" : m === "surface.detach" ? "detach" : "request";
    const { s: _s, ...args } = p;
    let canonical;
    try {
      canonical = canonicalJson(args);
    } catch {
      canonical = void 0;
    }
    const ctx = { args: canonical ?? "" };
    const record = (outcome) => {
      const rec = this.#requestRecord(a, kind, m, p, outcome);
      rec.ms = Math.max(0, this.#now() - started);
      if (ctx.accepted !== void 0) rec.ref = ctx.accepted;
      this.#audit(rec, canonical);
    };
    try {
      if (!HUB_METHOD_NAMES.has(m) && methodScope(m) === void 0) fail3("E_UNKNOWN_METHOD", `unknown method ${m.slice(0, 64)}`);
      if (canonical === void 0) fail3("E_BAD_ARGS", "params are nested too deeply");
      if ((audited(m) || m === "surface.attach") && this.#auditUnavailable()) fail3("E_INTERNAL", "audit unavailable");
      const r = await this.#dispatch(a, m, p, ctx);
      if (ctx.accepted !== void 0 || kind !== "request" || audited(m)) record("ok");
      return r;
    } catch (e) {
      const err = e instanceof ReinsError ? e : new ReinsError("E_INTERNAL", "internal error");
      if (ctx.accepted !== void 0 || a.refusals.allow()) record(err.code);
      throw err;
    }
  }
  /**
   * Write the `accepted` record of an audited request and wait until the sink has it.
   * Refuses with `E_INTERNAL` when the audit is unavailable.
   */
  async #acceptRecord(a, m, p, ctx) {
    if (!this.#sink) return;
    if (this.#auditUnavailable()) fail3("E_INTERNAL", "audit unavailable");
    const kind = m === "surface.attach" ? "attach" : "request";
    const q = this.#audit(this.#requestRecord(a, kind, m, p, "accepted"), ctx.args, true);
    if (q === void 0) fail3("E_INTERNAL", "audit unavailable");
    ctx.accepted = q.seq;
    try {
      await q.written;
    } catch {
      fail3("E_INTERNAL", "audit unavailable");
    }
  }
  #dispatch(a, m, p, ctx) {
    switch (m) {
      case "hub.info":
        if (!this.#hubBucket(a).take()) fail3("E_RATE", "too many hub requests");
        return this.#infoFor(a);
      case "surfaces.list":
        if (!this.#hubBucket(a).take()) fail3("E_RATE", "too many hub requests");
        return { surfaces: [...this.#surfaces.values()].filter((s) => this.#mayAttachTo(a, s)).map((s) => this.#surfaceInfo(s, a)) };
      case "surface.attach":
        return this.#attach(a, p, ctx);
      case "surface.detach":
        return this.#detach(a, p);
      case "stream.open":
        return this.#streamOpen(a, p, ctx);
      case "stream.close":
        return this.#streamClose(a, p);
      default:
        return this.#forward(a, m, p, ctx);
    }
  }
  /**
   * The surface named by `p.s`. One the agent's credential may not attach to is refused
   * exactly like one that does not exist (same code, same message), on every method.
   */
  #surfaceArg(a, p) {
    if (typeof p.s !== "string") fail3("E_BAD_ARGS", "s must be a surface id");
    const s = this.#surfaces.get(p.s);
    if (!s || !this.#mayAttachTo(a, s)) fail3("E_NO_SURFACE", "no such surface");
    return s;
  }
  #requireGrant(a, s) {
    const g = this.#liveGrant(a, s);
    if (!g) fail3("E_NOT_ATTACHED", "not attached to this surface");
    g.used = this.#now();
    return g;
  }
  async #attach(a, p, ctx) {
    const s = this.#surfaceArg(a, p);
    if (!Array.isArray(p.scopes) || !p.scopes.every((x) => typeof x === "string")) fail3("E_BAD_ARGS", "scopes must be a list of scopes");
    const reason = p.reason;
    if (reason !== void 0 && (typeof reason !== "string" || reason.length > MAX_REASON_CHARS)) fail3("E_BAD_ARGS", "reason must be a short string");
    const scopes = capScopes(p.scopes, a.cred.scopes, this.#policy.scopes);
    if (scopes.length === 0) fail3("E_SCOPE", "none of the requested scopes is permitted");
    const decision2 = this.#policy.attach;
    if (decision2 === "deny") fail3("E_DENIED", "attach denied by hub policy");
    const guard = `${a.cred.kid}
${s.id}`;
    if (this.#attaching.has(guard)) fail3("E_BUSY", "an attach to this surface is already pending");
    if (!this.#bucket(a, s, "attach").take()) fail3("E_RATE", "too many attach requests");
    this.#attaching.add(guard);
    let sent = false;
    let r;
    try {
      await this.#acceptRecord(a, "surface.attach", p, ctx);
      if (this.#surfaces.get(s.id) !== s) fail3("E_GONE", "surface gone");
      if (this.#agents.get(a.id) !== a) fail3("E_GONE", "agent gone");
      const params2 = { agent: { id: a.id, name: a.name }, scopes, levels: [...this.#policy.human.levels], decisions: actionDecisions(this.#policy, s.manifest.actions), chatRelay: this.#policy.chatRelay, cred: a.cred.kid.slice(0, 64) };
      if (typeof reason === "string") params2.reason = reason;
      const opts = { ag: a.id, timeoutMs: this.#limits.reqTimeoutMs + this.#limits.consentTimeoutMs };
      if (decision2 === "confirm") opts.c = 1;
      a.attaching.add(s.id);
      sent = true;
      r = await s.peer.request("attach", params2, opts);
    } finally {
      this.#attaching.delete(guard);
      if (sent) a.attaching.delete(s.id);
    }
    if (this.#surfaces.get(s.id) !== s) fail3("E_GONE", "surface gone");
    if (this.#agents.get(a.id) !== a) fail3("E_GONE", "agent gone");
    if (!isObject(r) || !Array.isArray(r.scopes)) {
      s.peer.request("detach", { why: "hub" }, { ag: a.id }).catch(noop);
      fail3("E_INTERNAL", "bad answer from surface");
    }
    const granted = capScopes(r.scopes.filter((x) => typeof x === "string"), scopes);
    if (granted.length === 0) {
      s.peer.request("detach", { why: "hub" }, { ag: a.id }).catch(noop);
      fail3("E_SCOPE", "the surface granted no scopes");
    }
    const ttl = typeof r.ttlMs === "number" && Number.isFinite(r.ttlMs) && r.ttlMs >= 0 ? Math.min(this.#policy.ttlMs, r.ttlMs) : this.#policy.ttlMs;
    const old = a.grants.get(s.id);
    if (old) {
      this.#endGrant(old, "replaced");
      if (!granted.includes("cursor")) {
        for (const st of [...a.streams.values()]) if (st.surface === s) this.#dropStream(st, true);
      }
    }
    const now4 = this.#now();
    const kept = keptSettings(r.kept, granted, s.actions.keys());
    const inForce = granted.filter((x) => !kept.off.includes(x));
    const g = {
      id: `g${++this.#grantSeq}`,
      agent: a,
      surface: s,
      scopes: inForce,
      granted: [...granted],
      level: kept.level ?? DEFAULT_LEVEL,
      rules: new Map(kept.rules),
      changes: 0,
      changesAt: Number.NEGATIVE_INFINITY,
      relay: false,
      chatIn: /* @__PURE__ */ new Map(),
      exp: now4 + ttl,
      used: now4
    };
    a.grants.set(s.id, g);
    s.grants.set(a.id, g);
    this.#schedule(g);
    if (!inForce.includes("cursor")) {
      for (const st of [...a.streams.values()]) if (st.surface === s) this.#dropStream(st, true);
    }
    if (kept.level) this.#audit({ kind: "person", outcome: "kept", agent: a.id, surface: s.id, method: "level", value: kept.level });
    for (const [name2, d] of kept.rules) this.#audit({ kind: "person", outcome: "kept", agent: a.id, surface: s.id, method: "rule", value: d, action: name2 });
    if (kept.off.length) this.#audit({ kind: "person", outcome: "kept", agent: a.id, surface: s.id, method: "scopes", value: inForce.length ? inForce.join(" ") : "none" });
    const result = { grant: { id: g.id, s: s.id, scopes: [...inForce], exp: g.exp }, surface: this.#surfaceInfo(s, a), manifest: s.manifest };
    if (kept.level || kept.rules.size) {
      const k = {};
      if (kept.level) k.level = kept.level;
      if (kept.rules.size) k.rules = Object.fromEntries(kept.rules);
      result.kept = k;
    }
    return result;
  }
  #detach(a, p) {
    const s = this.#surfaceArg(a, p);
    const g = this.#liveGrant(a, s);
    if (!g) fail3("E_NOT_ATTACHED", "not attached to this surface");
    this.#endGrant(g, "agent");
    return {};
  }
  async #forward(a, m, p, ctx) {
    const scope = methodScope(m);
    if (scope === void 0) fail3("E_UNKNOWN_METHOD", `unknown method ${m.slice(0, 64)}`);
    const s = this.#surfaceArg(a, p);
    const g = this.#requireGrant(a, s);
    if (!g.scopes.includes(scope)) fail3("E_SCOPE", `grant lacks scope ${scope}`);
    if (!this.#bucket(a, s, scope).take()) fail3("E_RATE", "rate limit exceeded");
    let c;
    if (m === "act") {
      if (typeof p.a !== "string") fail3("E_BAD_ARGS", "a must be an action name");
      const def = s.actions.get(p.a);
      if (!def) fail3("E_BAD_ARGS", "unknown action");
      const d = decideAction(this.#policy, def);
      if (d === "deny") fail3("E_DENIED", "action denied by hub policy");
      if (d === "confirm") c = 1;
    }
    if (m === "nav.go" && (typeof p.url !== "string" || !navAllowed(this.#policy, p.url, s.url))) fail3("E_DENIED", "navigation not allowed");
    if (m === "chat.say") {
      if (chatText(p.text) === void 0) fail3("E_BAD_ARGS", `text must be 1 to ${CHAT_MAX_TEXT} characters`);
      if (p.to !== void 0 && p.to !== CHAT_TO_PERSON) {
        if (typeof p.to !== "string" || p.to.length < 1 || p.to.length > 64) fail3("E_BAD_ARGS", "to must be an agent id, or person");
        const mode = this.#policy.chatRelay;
        if (mode === "off" || mode === "person" && !g.relay) fail3("E_DENIED", "no other agent hears you under this hub policy");
      }
    }
    const fwd = { ...p };
    delete fwd.s;
    const timeoutMs = m === "act" ? this.#limits.reqTimeoutMs + this.#limits.consentTimeoutMs : this.#limits.reqTimeoutMs;
    const opts = { ag: a.id, timeoutMs };
    if (c === 1) opts.c = 1;
    if (audited(m)) {
      await this.#acceptRecord(a, m, p, ctx);
      if (this.#surfaces.get(s.id) !== s) fail3("E_GONE", "surface gone");
      if (this.#currentGrant(a, s) !== g) fail3("E_NOT_ATTACHED", "not attached to this surface");
    }
    return s.peer.request(m, fwd, opts);
  }
  // ───────────────────────────── pointer streams ─────────────────────────────
  #allocChannel() {
    for (let i = 0; i < 65535; i++) {
      const ch = this.#chSeq++ % 65535 + 1;
      if (!this.#streams.has(ch)) return ch;
    }
    return void 0;
  }
  #dropStream(st, tellSurface) {
    if (this.#streams.get(st.ch) === st) this.#streams.delete(st.ch);
    if (st.agent.streams.get(st.ch) === st) st.agent.streams.delete(st.ch);
    if (tellSurface && !st.overrun && !this.#closed && !st.surface.peer.closed) {
      st.surface.peer.request("stream.close", { ch: st.ch }, { ag: st.agent.id }).catch(noop);
    }
  }
  async #streamOpen(a, p, ctx) {
    const s = this.#surfaceArg(a, p);
    if (!this.#policy.coordinates) fail3("E_DENIED", "pointer streams are off under this hub policy");
    const g = this.#requireGrant(a, s);
    if (!g.scopes.includes("cursor")) fail3("E_SCOPE", "grant lacks scope cursor");
    if (!this.#bucket(a, s, "cursor").take()) fail3("E_RATE", "rate limit exceeded");
    if (p.kind !== "pointer") fail3("E_BAD_ARGS", "kind must be pointer");
    if (a.streams.size >= this.#maxStreams) fail3("E_BUSY", "too many open streams");
    await this.#acceptRecord(a, "stream.open", p, ctx);
    if (this.#surfaces.get(s.id) !== s) fail3("E_GONE", "surface gone");
    if (this.#currentGrant(a, s) !== g) fail3("E_NOT_ATTACHED", "not attached to this surface");
    if (a.streams.size >= this.#maxStreams) fail3("E_BUSY", "too many open streams");
    const ch = this.#allocChannel();
    if (ch === void 0) fail3("E_BUSY", "too many open streams");
    const st = {
      ch,
      agent: a,
      surface: s,
      credit: new CreditWindow(0),
      ready: false,
      overrun: false
    };
    this.#streams.set(ch, st);
    a.streams.set(ch, st);
    let r;
    try {
      r = await s.peer.request("stream.open", { kind: "pointer", ch }, { ag: a.id });
    } catch (e) {
      this.#dropStream(st, false);
      throw e;
    }
    if (this.#streams.get(ch) !== st) fail3("E_GONE", "stream closed");
    const offered = isObject(r) ? r.credit : void 0;
    const credit = typeof offered === "number" && Number.isFinite(offered) && offered >= 0 ? offered : PTR_INITIAL_CREDIT;
    st.credit.grant(credit);
    st.ready = true;
    return { ch, credit };
  }
  #streamClose(a, p) {
    const ch = p.ch;
    if (typeof ch !== "number" || !Number.isInteger(ch)) fail3("E_BAD_ARGS", "ch must be a channel number");
    const st = this.#streams.get(ch);
    if (!st || st.agent !== a) fail3("E_BAD_ARGS", "unknown stream");
    const overrun = st.overrun;
    this.#dropStream(st, true);
    if (overrun) fail3("E_RATE", "stream closed for exceeding its rate or credit");
    return {};
  }
  #overrun(st) {
    st.overrun = true;
    if (!st.surface.peer.closed) st.surface.peer.request("stream.close", { ch: st.ch }, { ag: st.agent.id }).catch(noop);
    this.#audit({ kind: "stream", outcome: "E_RATE", agent: st.agent.id, surface: st.surface.id, method: "stream.open" });
  }
  #agentBinary(a, bytes) {
    let f;
    try {
      f = decodePointer(bytes);
    } catch {
      return;
    }
    const st = this.#streams.get(f.ch);
    if (!st || st.agent !== a || st.overrun || !st.ready) return;
    const g = this.#liveGrant(a, st.surface);
    if (!g || !g.scopes.includes("cursor")) {
      this.#dropStream(st, true);
      return;
    }
    const n = f.points.length;
    const end = (f.flags & PTR_FLAG_END) !== 0;
    if (n === 0 && !end) return;
    if (!this.#bucket(a, st.surface, "pointer").take(Math.max(1, n)) || !st.credit.consume(n)) {
      this.#overrun(st);
      return;
    }
    const buffered = st.surface.peer.bufferedAmount;
    if (buffered > STALL_BUFFER_BYTES) {
      this.#overrun(st);
      return;
    }
    if ((f.flags & PTR_FLAG_DROPPABLE) !== 0 && !end && buffered > DROP_BUFFER_BYTES) {
      st.credit.grant(n);
      try {
        a.peer.flow(st.ch, n);
      } catch {
      }
      return;
    }
    try {
      st.surface.peer.sendBinary(bytes);
    } catch {
    }
  }
  // ───────────────────────────── heartbeat ─────────────────────────────
  #tick() {
    if (this.#closed) return;
    const now4 = this.#now();
    const hb = this.#limits.heartbeatMs;
    const conns = [...this.#agents.values(), ...this.#surfaces.values()];
    for (const c of conns) {
      if (c.peer.closed) continue;
      const silent = now4 - c.peer.lastSeen;
      if (silent > 2.5 * hb) {
        c.peer.bye("E_TIMEOUT", "heartbeat timeout");
        continue;
      }
      if (silent >= hb && now4 - c.lastPing >= hb) {
        c.lastPing = now4;
        c.peer.ping(hb).catch(noop);
      }
    }
  }
  // ───────────────────────────── audit ─────────────────────────────
  /** True while audited requests must be refused: the sink failed, or the backlog is too long. */
  #auditUnavailable() {
    return this.#sink !== void 0 && (this.#auditFailed || this.#auditQueue.length > AUDIT_BACKLOG_MAX);
  }
  #auditConnFailure(input) {
    if (this.#connRefusals.allow()) this.#audit(input);
  }
  /**
   * Queue a record. Its `seq` is fixed now, so records keep the order of events. With
   * `wait`, also returns a promise that settles when the sink has taken the record, or
   * rejects when the sink throws on it. Returns undefined when nothing was queued.
   * `args` is the canonical JSON of the request params.
   */
  #audit(input, args, wait = false) {
    const sink = this.#sink;
    if (!sink) return void 0;
    if (this.#auditQueue.length >= AUDIT_QUEUE_MAX) {
      this.#auditLost++;
      return void 0;
    }
    const rec = { seq: ++this.#auditSeq, ts: this.#now() };
    for (const [k, v] of Object.entries(input)) if (v !== void 0) rec[k] = v;
    const q = { rec, hashed: false };
    if (args !== void 0) q.args = args;
    let written = Promise.resolve();
    if (wait) {
      written = new Promise((resolve, reject) => {
        q.done = { resolve, reject };
      });
    }
    this.#auditQueue.push(q);
    if (!this.#auditFailed) void this.#drainAudit();
    return { seq: rec.seq, written };
  }
  /** Write queued records in order. One drain runs at a time. */
  #drainAudit() {
    if (this.#auditDraining) return this.#auditDraining;
    const sink = this.#sink;
    if (!sink) return Promise.resolve();
    let release;
    this.#auditDraining = new Promise((r) => release = r);
    const running = this.#auditDraining;
    this.#runDrain(sink).catch((e) => this.#auditSinkFailed(e)).finally(() => {
      this.#auditDraining = void 0;
      release();
      if (this.#auditQueue.length > 0 && !this.#auditFailed) void this.#drainAudit();
    });
    return running;
  }
  async #runDrain(sink) {
    for (; ; ) {
      const q = this.#auditQueue[0];
      if (q === void 0) {
        if (this.#auditLost > 0) {
          const count = this.#auditLost;
          this.#auditLost = 0;
          this.#audit({ kind: "audit", outcome: "lost", count });
          continue;
        }
        this.#auditFailed = false;
        return;
      }
      if (!q.hashed) {
        if (q.args !== void 0) {
          q.rec.args = this.#auditKey !== void 0 ? await hmacSha256(this.#auditKey, q.args) : await sha256(q.args);
        }
        q.rec.prev = this.#auditPrev;
        q.rec.hash = await auditHash(this.#auditPrev, q.rec, this.#auditKey);
        q.hashed = true;
      }
      try {
        sink.write(q.rec);
      } catch (e) {
        this.#auditSinkFailed(e);
        return;
      }
      this.#auditQueue.shift();
      this.#auditPrev = q.rec.hash;
      this.#auditHead = { seq: q.rec.seq, hash: q.rec.hash };
      q.done?.resolve();
    }
  }
  #auditSinkFailed(e) {
    this.#auditFailed = true;
    for (const w of this.#auditQueue) {
      w.done?.reject(e);
      w.done = void 0;
    }
    if (!this.#closed && this.#auditRetry === void 0) {
      this.#auditRetry = unref2(
        setTimeout(() => {
          this.#auditRetry = void 0;
          void this.#drainAudit();
        }, AUDIT_RETRY_MS)
      );
    }
  }
};

// packages/kit/src/index.ts
init_src();
export {
  Broker,
  MIN_KEY_CHARS,
  ReinsError,
  connect,
  createDriver,
  isHandshakeError,
  linkPair,
  memoryAudit,
  randomToken
};
//# sourceMappingURL=reins.js.map
