# Sealed-session keys and frame MACs

> Test vectors: Sealed-session keys and frame MACs. Shown here as it is in conformance/vectors/seal.json.

Protocol `0.2`. Covers: SPEC.md section 5, "Sealed sessions".

[Download seal.json](./seal.json): the file itself, as the conformance suite reads it.

## How to use it

Derive `th`, `kPeer` and `kHub` from `key`, `nonce`, `cnonce`, `challengeText`, `helloText`, `welcomeText`; seal the `peerToHub` messages in order from sequence 0 and compare with `wire` / `wireHex`; do the same with `hubToPeer`; open the wire messages and expect the payloads. `macOnly` gives MACs at large sequence numbers. `illFormed` must never be sealed or opened.

## Formula

```text
th = b64url(SHA-256(L(c) || c || L(h) || h || L(w) || w)), with c, h, w the UTF-8 bytes of challengeText, helloText, welcomeText and L(x) the byte length of x as an unsigned 32-bit big-endian integer
k = HMAC-SHA256(key, context + "\n" + nonce + "\n" + cnonce + "\n" + th), context "reins.v1.seal.peer" (peer sends) or "reins.v1.seal.hub" (hub sends)
mac = HMAC-SHA256(k, u64be(seq) || kind || payload), kind 0x74 text, 0x62 binary; seq counts from 0 per direction and is never sent
sealed text = b64url(mac) + "." + text; sealed binary = bytes || mac
```

## Notes

Everything here is stated in SPEC 5: the HMAC key and message are UTF-8 bytes, th is base64url text, k is the raw 32-byte HMAC output used as the key of the frame MAC, and the payload of a text message is its UTF-8 bytes. `macOnly` entries use sequence numbers that the public API cannot reach (the counter starts at 0 and is internal); they are here for other implementations. `illFormed` is a text with a lone surrogate (written as a JSON escape), which must never be sealed or opened.

## Fixed values

| key | value |
|---|---|
| `key` | `HebNZMN9EImpyoAZxAMca3WUyq-yG5DAkpSIfXpS294` |
| `nonce` | `X4jwsNU4ZbyLfcfpTAjqL6YTHwJFRJnhOkaAiob2bbU` |
| `cnonce` | `WI8VBFzQHSRrn0GqeV7pEYkNsGcnJACIX8XysTe0wuc` |
| `challengeText` | `{"t":"challenge","v":["0.1"],"nonce":"X4jwsNU4ZbyLfcfpTAjqL6YTHwJFRJnhOkaAiob2bbU","hub":{"name":"conformance-hub","ver":"0.1.0"}}` |
| `helloText` | `{"t":"hello","v":"0.1","role":"agent","name":"conformance","cnonce":"WI8VBFzQHSRrn0GqeV7pEYkNsGcnJACIX8XysTe0wuc","auth":{"kid":"default","proof":"nD89mHMkpZjv1bORaBzPNGoMXilSlR-6cu-JIzNjpZs"}}` |
| `welcomeText` | `{"t":"welcome","v":"0.1","session":"a1","role":"agent","limits":{"maxText":262144,"maxBinary":16384,"heartbeatMs":15000,"reqTimeoutMs":15000,"consentTimeoutMs":60000},"proof":"BYpxxhfA4x9Xak04Rvey74cSQOaBtXiYKY7E3A7N3R0"}` |
| `th` | `2F9jYemeRLbGr6ALI0IOJOPEIXO3o41FVekTBjdE1TI` |
| `kPeerHex` | `f114ccc730ba2b425779b0eccfd1b11d4234aea34fabf0aaa4f2da1e293cdf2d` |
| `kHubHex` | `64b9cbd92979ff0f0464dbe64774df9aefc7adb832a44b46de69179901951231` |
| `illFormed` | `{"t":"ping","ts":1,"x":"�"}` |

## peerToHub

4 cases.

```json
[
  {
    "seq": 0,
    "kind": "text",
    "text": "{\"t\":\"ping\",\"ts\":1}",
    "mac": "MT5ASRv9RnmesIfIwUME6mjptWyUOl8DiNqJishP9-U",
    "wire": "MT5ASRv9RnmesIfIwUME6mjptWyUOl8DiNqJishP9-U.{\"t\":\"ping\",\"ts\":1}"
  },
  {
    "seq": 1,
    "kind": "text",
    "text": "{\"t\":\"req\",\"id\":1,\"m\":\"hub.info\"}",
    "mac": "F_Hb4dRSIWZ_xIko6qRNYiwcWyhJoo5IUsLVBTenlSw",
    "wire": "F_Hb4dRSIWZ_xIko6qRNYiwcWyhJoo5IUsLVBTenlSw.{\"t\":\"req\",\"id\":1,\"m\":\"hub.info\"}"
  },
  {
    "seq": 2,
    "kind": "binary",
    "hex": "01000100050000000100ff7f00401000",
    "mac": "LQYHA9iIqSP1Lknk2rQQFKR0R3I3DRixmTN3wm8e3Xc",
    "wireHex": "01000100050000000100ff7f004010002d060703d888a923f52e49e4dab41014a4744772370d18b1993377c26f1edd77"
  },
  {
    "seq": 3,
    "kind": "text",
    "text": "{\"t\":\"req\",\"id\":2,\"m\":\"act\",\"p\":{\"s\":\"s1\",\"a\":\"note.add\",\"args\":{\"text\":\"café ☕\"}}}",
    "mac": "F78b1FT6vhUYw-5ePVQKY-jmIeD3nlTfqBI3nUl85VI",
    "wire": "F78b1FT6vhUYw-5ePVQKY-jmIeD3nlTfqBI3nUl85VI.{\"t\":\"req\",\"id\":2,\"m\":\"act\",\"p\":{\"s\":\"s1\",\"a\":\"note.add\",\"args\":{\"text\":\"café ☕\"}}}"
  }
]
```

## hubToPeer

2 cases.

```json
[
  {
    "seq": 0,
    "kind": "text",
    "text": "{\"t\":\"pong\",\"ts\":1}",
    "mac": "vU_rszPksyQjcw4gxsavf9TkI4eF3ClUeR13ACBJyOA",
    "wire": "vU_rszPksyQjcw4gxsavf9TkI4eF3ClUeR13ACBJyOA.{\"t\":\"pong\",\"ts\":1}"
  },
  {
    "seq": 1,
    "kind": "text",
    "text": "{\"t\":\"res\",\"re\":1,\"ok\":true,\"r\":{}}",
    "mac": "ZLgxlMD0TRpWDjYfFTlGfDeyVOXuBcvFbyCtBs9eEIk",
    "wire": "ZLgxlMD0TRpWDjYfFTlGfDeyVOXuBcvFbyCtBs9eEIk.{\"t\":\"res\",\"re\":1,\"ok\":true,\"r\":{}}"
  }
]
```

## macOnly

3 cases.

```json
[
  {
    "direction": "peerToHub",
    "seq": 255,
    "kind": "text",
    "text": "{\"t\":\"ping\",\"ts\":2}",
    "mac": "N421NL3hMwwef2S_TH_1lBBCz-qcE8au7U4zJnXL17s",
    "wire": "N421NL3hMwwef2S_TH_1lBBCz-qcE8au7U4zJnXL17s.{\"t\":\"ping\",\"ts\":2}"
  },
  {
    "direction": "peerToHub",
    "seq": 4294967303,
    "kind": "text",
    "text": "{\"t\":\"ping\",\"ts\":3}",
    "mac": "HBdriryj-F4yJqfDt35-WrHYtatYBFX6vpqR7oSUfbY",
    "wire": "HBdriryj-F4yJqfDt35-WrHYtatYBFX6vpqR7oSUfbY.{\"t\":\"ping\",\"ts\":3}"
  },
  {
    "direction": "hubToPeer",
    "seq": 1099511627776,
    "kind": "binary",
    "hex": "01000100050000000100ff7f00401000",
    "mac": "9FdNozTl7LLWZdMc0hR7_eAVGaj7iaSjbmLrjfdwnE4",
    "wireHex": "01000100050000000100ff7f00401000f4574da334e5ecb2d665d31cd2147bfde01519a8fb89a4a36e62eb8df7709c4e"
  }
]
```

Generated by `conformance/tools/make-vectors.mjs` from the formulas in the specification, with `node:crypto` only.
