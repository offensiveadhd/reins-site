// Reads one message off a link into something a person can look at. Everything here
// follows the wire format in the specification (sections 4, 5 and 11), not the bundle's
// internals: a frame is parsed from the bytes that crossed, never rebuilt from what the
// page thinks was sent.

const MAC_TEXT = /^[A-Za-z0-9_-]{43}\./; // a sealed text message: base64url MAC, ".", then the text
const MAC_BYTES = 32; // a sealed binary message: the bytes, then the MAC
const PTR_HEADER = 10;
const PTR_POINT = 6;
const HANDSHAKE = new Set(['challenge', 'hello', 'welcome', 'bye']);

const short = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');

function binary(bytes) {
  const out = { group: 'binary', type: 'binary', sealed: false, bytes: bytes.length };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < PTR_HEADER || bytes[0] !== 0x01) {
    out.summary = `${bytes.length} bytes, not a pointer frame`;
    out.body = { bytes: bytes.length, head: hex(bytes.slice(0, 16)) };
    return out;
  }
  const n = view.getUint16(8, true);
  const plain = PTR_HEADER + PTR_POINT * n;
  if (bytes.length === plain + MAC_BYTES) out.sealed = true;
  else if (bytes.length !== plain) {
    out.summary = `${bytes.length} bytes, length does not fit ${n} points`;
    out.body = { bytes: bytes.length, head: hex(bytes.slice(0, 16)) };
    return out;
  }
  const flags = bytes[1];
  const points = [];
  for (let i = 0; i < Math.min(n, 6); i++) {
    const at = PTR_HEADER + i * PTR_POINT;
    points.push({ x: +(view.getUint16(at, true) / 65535).toFixed(4), y: +(view.getUint16(at + 2, true) / 65535).toFixed(4), dt: view.getUint16(at + 4, true) });
  }
  const names = [flags & 0x01 ? 'DROPPABLE' : '', flags & 0x02 ? 'END' : ''].filter(Boolean);
  out.type = 'pointer';
  out.summary = `ch ${view.getUint16(2, true)} · seq ${view.getUint32(4, true)} · ${n} point${n === 1 ? '' : 's'}${names.length ? ` · ${names.join(' ')}` : ''}`;
  out.body = {
    kind: '0x01 pointer frame',
    flags: names.length ? names : [],
    ch: view.getUint16(2, true),
    seq: view.getUint32(4, true),
    n,
    points: n > points.length ? [...points, `… ${n - points.length} more`] : points,
    header: hex(bytes.slice(0, PTR_HEADER)),
    bytes: bytes.length,
  };
  if (out.sealed) out.mac = `${MAC_BYTES} bytes after the frame`;
  return out;
}

function summarise(f, answers) {
  switch (f.t) {
    case 'challenge':
      return `versions ${JSON.stringify(f.v)} · hub ${f.hub?.name ?? ''} · nonce ${short(String(f.nonce), 10)}`;
    case 'hello':
      return `${f.role} "${f.name}"${f.auth ? ` · kid ${f.auth.kid} · proof ${short(String(f.auth.proof), 10)}` : ' · no key'}${f.surface ? ` · app ${f.surface.manifest?.app?.id}` : ''}`;
    case 'welcome':
      return `session ${f.session}${f.proof ? ' · the hub proves the key' : ''}`;
    case 'req': {
      const p = f.p ?? {};
      const bits = [];
      if (p.s !== undefined) bits.push(`s ${p.s}`);
      if (f.ag !== undefined) bits.push(`ag ${f.ag}`);
      if (f.c === 1) bits.push('c:1');
      if (p.a !== undefined) bits.push(String(p.a));
      if (Array.isArray(p.scopes)) bits.push(p.scopes.join(' '));
      if (p.to !== undefined) bits.push(typeof p.to !== 'string' ? `${p.to.x},${p.to.y}` : String(f.m).startsWith('chat.') ? `to ${p.to}` : p.to);
      if (p.state !== undefined) bits.push(String(p.state));
      if (p.note !== undefined && p.note !== '') bits.push(JSON.stringify(short(String(p.note), 28)));
      // the hub's human.levels; strict and ask are on offer whatever it lists
      if (Array.isArray(p.levels)) bits.push(`levels ${p.levels.join(' ') || '(none listed)'}`);
      if (typeof p.chatRelay === 'string') bits.push(`chatRelay ${p.chatRelay}`);
      if (f.m === 'chat.undelivered') bits.push(`message #${p.id}`);
      if (p.h !== undefined) bits.push(String(p.h));
      if (p.view !== undefined) bits.push(String(p.view));
      if (p.text !== undefined) bits.push(JSON.stringify(short(String(p.text), 28)));
      return { id: f.id, lead: f.m, rest: bits.join(' · ') };
    }
    case 'res': {
      const m = answers;
      if (f.ok) {
        // an attach answer may say what stays of the person's earlier settings for this agent
        const k = f.r && typeof f.r === 'object' ? f.r.kept : undefined;
        const kept = [];
        if (k && typeof k === 'object') {
          if (k.level !== undefined) kept.push(`level ${k.level}`);
          if (k.rules && typeof k.rules === 'object') for (const [a, d] of Object.entries(k.rules)) kept.push(`${a}: ${d}`);
          if (Array.isArray(k.off) && k.off.length) kept.push(`off ${k.off.join(' ')}`);
        }
        return { id: f.re, lead: m ? `ok ${m}` : 'ok', rest: kept.length ? `kept · ${kept.join(' · ')}` : '' };
      }
      return { id: f.re, lead: f.e?.code ?? 'error', rest: `${m ? `${m} · ` : ''}${short(String(f.e?.msg ?? ''), 70)}`, error: true };
    }
    case 'evt': {
      const d = f.d ?? {};
      const bits = [];
      if (f.s !== undefined) bits.push(`s ${f.s}`);
      if (f.ag !== undefined) bits.push(`ag ${f.ag}`);
      if (f.topic === 'chat') {
        // one message of the room, for the one agent `ag` names
        const from = d.from?.kind === 'agent' ? `agent ${JSON.stringify(String(d.from.name))} (${d.from.id})` : 'the person';
        bits.push(`#${d.id} from ${from}`);
        if (d.to !== undefined) bits.push(`to ${d.to}`);
        if (typeof d.text === 'string') bits.push(JSON.stringify(short(d.text, 36)));
      } else if (f.topic === 'user' && d.kind === 'level') bits.push(`the person set the level: ${d.level}`);
      else if (f.topic === 'user' && d.kind === 'rule') bits.push(`the person's rule for ${d.a}: ${d.d === null ? 'removed' : d.d}`);
      else if (f.topic === 'user' && d.kind === 'relay') bits.push(`agents hear each other: ${d.on ? 'on' : 'off'}`);
      else if (f.topic === 'grant' && d.kind === 'scopes') bits.push(`scopes now in force: ${Array.isArray(d.scopes) && d.scopes.length ? d.scopes.join(' ') : 'none'}`);
      else {
        if (d.kind !== undefined) bits.push(String(d.kind));
        if (d.rev !== undefined) bits.push(`rev ${d.rev}`);
        if (d.name !== undefined) bits.push(String(d.name));
      }
      return { lead: f.topic, rest: bits.join(' · ') };
    }
    case 'flow':
      return `ch ${f.ch} · credit +${f.credit}`;
    case 'ping':
    case 'pong':
      return `ts ${f.ts}`;
    case 'bye':
      return { lead: f.code, rest: f.msg ? short(String(f.msg), 70) : '', error: f.code !== 'OK' };
    default:
      return '';
  }
}

/**
 * @param data     the message as it crossed the link
 * @param pending  Map of request ids to method names for the opposite direction of this
 *                 link, so that a `res` can say what it answers; requests are added to `mine`
 * @returns { group, type, sealed, mac?, summary | {id?, lead, rest, error?}, body, bytes }
 */
export function describe(data, mine, pending) {
  if (typeof data !== 'string') return binary(data);
  let text = data;
  let mac;
  if (MAC_TEXT.test(data) && data[44] === '{') {
    mac = data.slice(0, 43);
    text = data.slice(44);
  }
  let frame;
  try {
    frame = JSON.parse(text);
  } catch {
    return { group: 'handshake', type: 'text', sealed: mac !== undefined, mac, summary: 'not JSON', body: short(data, 400), bytes: data.length };
  }
  const t = typeof frame?.t === 'string' ? frame.t : 'unknown';
  let answers;
  if (t === 'req' && typeof frame.id === 'number') mine.set(frame.id, frame.m);
  if (t === 'res' && typeof frame.re === 'number') {
    answers = pending.get(frame.re);
    pending.delete(frame.re);
  }
  const group = HANDSHAKE.has(t) ? 'handshake' : t === 'ping' || t === 'pong' ? 'heartbeat' : t;
  return { group, type: t, sealed: mac !== undefined, mac, summary: summarise(frame, answers), body: frame, bytes: data.length };
}
