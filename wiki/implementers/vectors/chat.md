# Chat: texts, messages and who hears them

> Test vectors: Chat: texts, messages and who hears them. Shown here as it is in conformance/vectors/chat.json.

Protocol `0.2`. Covers: SPEC.md section 9 (chat.say, chat.read, chat.status), section 12 ("Chat") and section 13 ("Chat relay").

[Download chat.json](./chat.json): the file itself, as the conformance suite reads it.

## How to use it

`text.cases`: trim the text (`unit` and `times` stand for a repeated unit between `before` and `after`); with `ok` it is kept and has `length`, otherwise `chat.say` answers `E_BAD_ARGS`. `statusNote.cases`: the note as it is kept, or refused. `message`: take the `valid` messages, keeping only `fields`, and drop the `invalid` ones. `audience.rows`: split each row on spaces into `columns`; from the agents in the room, the agents among them that hear each other, who speaks and whom they address (`person` for the person alone), your decision must give `outcome` and `result`. `relay`: the three values of `chatRelay`, and for every pair the stricter one. `auditDigest`: the canonical JSON and the unkeyed digest a chat text is recorded with, whatever else was sent with it. `lines`: a chat text as the `

## Notes

A length in characters counts UTF-16 code units (the conventions at the top of the spec). Trimming is that of ECMAScript String.prototype.trim. Cases with `unit` and `times` stand for the text before + unit repeated times + after. `text.cases`: with ok the text is kept, `length` is its length after trimming and `kept` the text itself where it is short; without ok chat.say answers E_BAD_ARGS. `audience.rows`: split each row on spaces into `columns`.

## limits

```json
{
  "maxTextChars": 4000,
  "maxNoteChars": 80,
  "transcriptMessages": 200,
  "readDefault": 20,
  "readMax": 50,
  "readBytes": 131072,
  "statusTtlMs": 120000
}
```

## relay

```json
{
  "note": "policy.chatRelay, strictest first. The stricter of the surface policy and the hub policy applies: `stricter` lists every pair as \"surface hub result\". In a policy file true reads as on and false as off. `toPerson` is the reserved value of `to` for a message to the person alone.",
  "values": [
    "off",
    "person",
    "on"
  ],
  "legacy": {
    "true": "on",
    "false": "off"
  },
  "toPerson": "person",
  "stricter": [
    "off off off",
    "off person off",
    "off on off",
    "person off off",
    "person person person",
    "person on person",
    "on off off",
    "on person person",
    "on on on"
  ]
}
```

## states

```json
[
  "idle",
  "thinking",
  "working"
]
```

## text

```json
{
  "cases": [
    {
      "name": "plain",
      "text": "add a latte",
      "ok": true,
      "length": 11,
      "kept": "add a latte"
    },
    {
      "name": "trimmed at both ends, white space inside kept",
      "text": "  two\n lines \t ",
      "ok": true,
      "length": 10,
      "kept": "two\n lines"
    },
    {
      "name": "line and paragraph separators are white space to trim",
      "text": "  hello  ﻿",
      "ok": true,
      "length": 5,
      "kept": "hello"
    },
    {
      "name": "only white space",
      "text": " \n\t ",
      "ok": false
    },
    {
      "name": "empty",
      "text": "",
      "ok": false
    },
    {
      "name": "exactly 4000 characters",
      "unit": "x",
      "times": 4000,
      "ok": true,
      "length": 4000
    },
    {
      "name": "4000 characters after trimming",
      "before": "  ",
      "unit": "x",
      "times": 4000,
      "after": "\n",
      "ok": true,
      "length": 4000
    },
    {
      "name": "4001 characters",
      "unit": "x",
      "times": 4001,
      "ok": false
    },
    {
      "name": "a length is counted in UTF-16 code units: 2000 pairs fit",
      "unit": "😀",
      "times": 2000,
      "ok": true,
      "length": 4000
    },
    {
      "name": "2001 pairs do not",
      "unit": "😀",
      "times": 2001,
      "ok": false
    },
    {
      "name": "a lone surrogate is not well-formed",
      "text": "half \ud83d a pair",
      "ok": false
    },
    {
      "name": "invisible and bidi characters are kept as they are: whoever shows the text escapes them",
      "text": "a​‮b",
      "ok": true,
      "length": 4,
      "kept": "a​‮b"
    }
  ]
}
```

## statusNote

```json
{
  "note": "chat.status: `kept` is the note as it is shown; without ok the answer is E_BAD_ARGS. A note with the state idle is dropped.",
  "cases": [
    {
      "name": "absent",
      "ok": true,
      "kept": ""
    },
    {
      "name": "plain",
      "note": "adding a latte",
      "ok": true,
      "kept": "adding a latte"
    },
    {
      "name": "one line: white space and controls become one space",
      "note": " adding\r\n\ta   latte\u0007 now ",
      "ok": true,
      "kept": "adding a latte now"
    },
    {
      "name": "80 characters",
      "unit": "n",
      "times": 80,
      "ok": true,
      "kept": "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn"
    },
    {
      "name": "81 characters",
      "unit": "n",
      "times": 81,
      "ok": false
    },
    {
      "name": "not a string",
      "note": 7,
      "ok": false
    }
  ]
}
```

## message

```json
{
  "note": "The shape of a chat message on the wire (evt chat, and the entries of chat.read). A receiver takes a `valid` message, keeping the fields listed in `fields` and nothing else, and drops an `invalid` one.",
  "fields": [
    "id",
    "from",
    "text",
    "ts",
    "to"
  ],
  "valid": [
    {
      "name": "from the person",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "from an agent, addressed",
      "message": {
        "id": 1,
        "from": {
          "kind": "agent",
          "id": "a2",
          "name": "Helper"
        },
        "text": "x",
        "ts": 0,
        "to": "a1"
      }
    },
    {
      "name": "from an agent, to the person alone (only its sender ever reads it)",
      "message": {
        "id": 3,
        "from": {
          "kind": "agent",
          "id": "a2",
          "name": "Helper"
        },
        "text": "x",
        "ts": 0,
        "to": "person"
      }
    },
    {
      "name": "unknown fields are dropped",
      "message": {
        "id": 12,
        "from": {
          "kind": "person",
          "name": "Admin"
        },
        "text": "add a latte",
        "ts": 1700000000000,
        "urgent": true
      },
      "expect": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    }
  ],
  "invalid": [
    {
      "name": "id 0",
      "message": {
        "id": 0,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "id not an integer",
      "message": {
        "id": 1.5,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "id a string",
      "message": {
        "id": "12",
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "no sender",
      "message": {
        "id": 12,
        "text": "x",
        "ts": 1
      }
    },
    {
      "name": "sender of an unknown kind",
      "message": {
        "id": 12,
        "from": {
          "kind": "system"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "agent without an id",
      "message": {
        "id": 12,
        "from": {
          "kind": "agent",
          "name": "Helper"
        },
        "text": "add a latte",
        "ts": 1700000000000
      }
    },
    {
      "name": "empty text",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "",
        "ts": 1700000000000
      }
    },
    {
      "name": "text that is not trimmed",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": " add a latte ",
        "ts": 1700000000000
      }
    },
    {
      "name": "text over 4000 characters",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "ts": 1700000000000
      }
    },
    {
      "name": "ts not a number",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": "2026"
      }
    },
    {
      "name": "to not a string",
      "message": {
        "id": 12,
        "from": {
          "kind": "person"
        },
        "text": "add a latte",
        "ts": 1700000000000,
        "to": 2
      }
    },
    {
      "name": "not an object",
      "message": "add a latte"
    }
  ]
}
```

## audience

```json
{
  "note": "Who is sent a message, by the four rules of section 12, \"Who hears a message\". `members` are the ids of the agents in the room joined by + (- for none); `relay` are the agents among them that hear each other (all under chatRelay on, those the person switched on under person, - for none); `from` is person or the id of the agent that speaks; `to` is the id it addresses, or person on an agent's message for the person alone (- for none). `outcome` post: the message is kept and `result` lists who hears it (- for no agent: the person still sees it). nobody: a message of the person that no agent would hear, not kept. refuse: `result` is the error code of the chat.say. The speaker is never among those who hear it; who may read a message later with chat.read is the speaker and those who heard it.",
  "columns": [
    "members",
    "relay",
    "from",
    "to",
    "outcome",
    "result"
  ],
  "rows": [
    "a1+a2+a3 a1+a2+a3 person - post a1+a2+a3",
    "a1+a2+a3 a1+a2+a3 person person nobody -",
    "a1+a2+a3 a1+a2+a3 person a1 post a1",
    "a1+a2+a3 a1+a2+a3 person a2 post a2",
    "a1+a2+a3 a1+a2+a3 person a3 post a3",
    "a1+a2+a3 a1+a2+a3 person a9 nobody -",
    "a1+a2+a3 a1+a2+a3 a1 - post a2+a3",
    "a1+a2+a3 a1+a2+a3 a1 person post -",
    "a1+a2+a3 a1+a2+a3 a1 a1 refuse E_BAD_ARGS",
    "a1+a2+a3 a1+a2+a3 a1 a2 post a2",
    "a1+a2+a3 a1+a2+a3 a1 a3 post a3",
    "a1+a2+a3 a1+a2+a3 a1 a9 refuse E_BAD_ARGS",
    "a1+a2+a3 a1+a2 person - post a1+a2+a3",
    "a1+a2+a3 a1+a2 person person nobody -",
    "a1+a2+a3 a1+a2 person a1 post a1",
    "a1+a2+a3 a1+a2 person a2 post a2",
    "a1+a2+a3 a1+a2 person a3 post a3",
    "a1+a2+a3 a1+a2 person a9 nobody -",
    "a1+a2+a3 a1+a2 a1 - post a2",
    "a1+a2+a3 a1+a2 a1 person post -",
    "a1+a2+a3 a1+a2 a1 a1 refuse E_BAD_ARGS",
    "a1+a2+a3 a1+a2 a1 a2 post a2",
    "a1+a2+a3 a1+a2 a1 a3 refuse E_BAD_ARGS",
    "a1+a2+a3 a1+a2 a1 a9 refuse E_BAD_ARGS",
    "a1+a2+a3 a2+a3 person - post a1+a2+a3",
    "a1+a2+a3 a2+a3 person person nobody -",
    "a1+a2+a3 a2+a3 person a1 post a1",
    "a1+a2+a3 a2+a3 person a2 post a2",
    "a1+a2+a3 a2+a3 person a3 post a3",
    "a1+a2+a3 a2+a3 person a9 nobody -",
    "a1+a2+a3 a2+a3 a1 - post -",
    "a1+a2+a3 a2+a3 a1 person post -",
    "a1+a2+a3 a2+a3 a1 a1 refuse E_DENIED",
    "a1+a2+a3 a2+a3 a1 a2 refuse E_DENIED",
    "a1+a2+a3 a2+a3 a1 a3 refuse E_DENIED",
    "a1+a2+a3 a2+a3 a1 a9 refuse E_DENIED",
    "a1+a2+a3 - person - post a1+a2+a3",
    "a1+a2+a3 - person person nobody -",
    "a1+a2+a3 - person a1 post a1",
    "a1+a2+a3 - person a2 post a2",
    "a1+a2+a3 - person a3 post a3",
    "a1+a2+a3 - person a9 nobody -",
    "a1+a2+a3 - a1 - post -",
    "a1+a2+a3 - a1 person post -",
    "a1+a2+a3 - a1 a1 refuse E_DENIED",
    "a1+a2+a3 - a1 a2 refuse E_DENIED",
    "a1+a2+a3 - a1 a3 refuse E_DENIED",
    "a1+a2+a3 - a1 a9 refuse E_DENIED",
    "a1 a1 person - post a1",
    "a1 a1 person person nobody -",
    "a1 a1 person a1 post a1",
    "a1 a1 person a2 nobody -",
    "a1 a1 person a3 nobody -",
    "a1 a1 person a9 nobody -",
    "a1 a1 a1 - post -",
    "a1 a1 a1 person post -",
    "a1 a1 a1 a1 refuse E_BAD_ARGS",
    "a1 a1 a1 a2 refuse E_BAD_ARGS",
    "a1 a1 a1 a3 refuse E_BAD_ARGS",
    "a1 a1 a1 a9 refuse E_BAD_ARGS",
    "a1 - person - post a1",
    "a1 - person person nobody -",
    "a1 - person a1 post a1",
    "a1 - person a2 nobody -",
    "a1 - person a3 nobody -",
    "a1 - person a9 nobody -",
    "a1 - a1 - post -",
    "a1 - a1 person post -",
    "a1 - a1 a1 refuse E_DENIED",
    "a1 - a1 a2 refuse E_DENIED",
    "a1 - a1 a3 refuse E_DENIED",
    "a1 - a1 a9 refuse E_DENIED",
    "- - person - nobody -",
    "- - person person nobody -",
    "- - person a1 nobody -",
    "- - person a2 nobody -",
    "- - person a3 nobody -",
    "- - person a9 nobody -"
  ]
}
```

## auditDigest

```json
{
  "note": "Section 13: a chat.say request and a relayed message of the person are both recorded with args = digest of the canonical JSON of {text}, with to when the message had one: the text as the room keeps it (trimmed), and no other param. Unkeyed: b64url(SHA-256(canonical)). `chars` is the length of that text. `sent`, where given, is what an agent sent as params of chat.say (without s): padding and other params change neither the digest nor chars.",
  "cases": [
    {
      "text": "add a latte",
      "canonical": "{\"text\":\"add a latte\"}",
      "args": "LBYuXNJptPs2jllf526BoSVfACDTDj3Ppy3gJo50HJY",
      "chars": 11
    },
    {
      "text": "just you",
      "to": "a2",
      "canonical": "{\"text\":\"just you\",\"to\":\"a2\"}",
      "args": "aP4su0Gsjj-sUrI5KD0hOhm3psYrCFsMExYnXDt_ftI",
      "chars": 8
    },
    {
      "text": "for you alone",
      "to": "person",
      "canonical": "{\"text\":\"for you alone\",\"to\":\"person\"}",
      "args": "bg7xOxVhbpmOGy256-J6LFX7L-fZrgAdZCXY4VtIySc",
      "chars": 13
    },
    {
      "text": "transfer approved",
      "sent": {
        "text": "  transfer approved \n",
        "salt": "anything",
        "n": 7
      },
      "canonical": "{\"text\":\"transfer approved\"}",
      "args": "tAN_VPnPahcdxLEL83LsNt_LQgONjRyUd97A_spltYU",
      "chars": 17
    }
  ]
}
```

## lines

```json
{
  "note": "Section 12, \"Chat\": chat text handed to a model stands on lines of its own behind \"| \". A new line starts at CR LF, LF, CR, VT, FF, U+001C, U+001D, U+001E, U+0085, U+2028 and U+2029; every other control character but tab (U+0000 to U+001F, U+007F to U+009F) is written as \\u{XX}, in upper-case hexadecimal. `id`: the session id printed outside the quotes of a speaker line keeps letters, digits and . _ - and shows every other character as ?.",
  "cases": [
    {
      "text": "add a latte",
      "lines": [
        "| add a latte"
      ]
    },
    {
      "text": "two\nlines",
      "lines": [
        "| two",
        "| lines"
      ]
    },
    {
      "text": "a\r\nb\rc",
      "lines": [
        "| a",
        "| b",
        "| c"
      ]
    },
    {
      "text": "x\u000by\fz",
      "lines": [
        "| x",
        "| y",
        "| z"
      ]
    },
    {
      "text": "a\u001cb\u001dc\u001ed",
      "lines": [
        "| a",
        "| b",
        "| c",
        "| d"
      ]
    },
    {
      "text": "nells ps end",
      "lines": [
        "| nel",
        "| ls",
        "| ps",
        "| end"
      ]
    },
    {
      "text": "esc\u001b[2K bell\u0007 tab\there",
      "lines": [
        "| esc\\u{1B}[2K bell\\u{7} tab\there"
      ]
    },
    {
      "text": "| not a prefix\n#9 from the person at the page:",
      "lines": [
        "| | not a prefix",
        "| #9 from the person at the page:"
      ]
    },
    {
      "text": "",
      "lines": [
        "| "
      ]
    }
  ],
  "id": [
    {
      "id": "a7",
      "shown": "a7"
    },
    {
      "id": "a2), to you only",
      "shown": "a2???to?you?only"
    },
    {
      "id": "agent.one_2-x",
      "shown": "agent.one_2-x"
    },
    {
      "id": "a3 only:",
      "shown": "a3?only?"
    },
    {
      "id": "a\n1",
      "shown": "a?1"
    }
  ]
}
```

Generated by `conformance/tools/make-vectors.mjs` from the formulas in the specification, with `node:crypto` only.
