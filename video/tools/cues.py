"""Derive the score's hit points in timeline.json from the scene layout and the voice-over's word timings,
so the music follows the voice whenever a line is re-recorded or moved (v4 edit).

Also writes the hook's Morse pulses (cues.morse: [start, length, dash]); the picture lights a dot or dash on each one
and the score beeps on each one, so sound and picture share one source.

usage: python3 tools/cues.py remotion/src/timeline.json remotion/src/vo-words.json
"""
import json
import re
import sys

tl_path, words_path = sys.argv[1], sys.argv[2]
tl = json.load(open(tl_path))
words = json.load(open(words_path))
at = {v["id"]: v["at"] for v in tl["vo"]}
sc = {s["id"]: s for s in tl["scenes"]}
beat = 60.0 / tl.get("bpm", 120)


def word(line, w, nth=0):
    n = 0
    for x in words.get(line, []):
        if re.sub(r"[^a-z0-9-]", "", x["w"].lower()).startswith(w.lower()):
            if n == nth:
                return round(at[line] + x["s"], 3)
            n += 1
    raise SystemExit(f"cues.py: no word '{w}' in line {line}")


def end(line):
    return round(at[line] + words[line][-1]["e"], 3)


def seg(scene, i):
    t = sc[scene]["start"]
    for s in sc[scene]["segs"][:i]:
        t += (s[2] - s[1]) / (s[3] if len(s) > 3 else 1)
    return round(t, 3)


# Morse for an illustrative order ("SEND ALL"); one unit = 70 ms, laid out from 0.8 s.
CODE = {"S": "...", "E": ".", "N": "-.", "D": "-..", "A": ".-", "L": ".-.."}
U, t, morse = 0.07, 0.8, []
for wi, w in enumerate("SEND ALL".split()):
    for li, ch in enumerate(w):
        for si, sym in enumerate(CODE[ch]):
            d = U * (3 if sym == "-" else 1)
            morse.append([round(t, 3), round(d, 3), 1 if sym == "-" else 0])
            t += d + U
        t += 2 * U
    t += 4 * U

c = {
    "morse": morse,
    "cut": round(at["m2"] - 0.25, 3),            # hard cut to the wallet running out
    "stat": sc["stat"]["start"],
    "nine": word("m3", "nine"),
    "card": sc["card"]["start"],
    "give": word("n1", "give"),
    "what": sc["what"]["start"],
    "agents": [word("n2", "claude"), word("n2", "chatgpt"), word("n2", "ours")],
    "fisco": word("n3", "fisco"),
    "watcher": at["n4"],
    "get": sc["get"]["start"],
    "live": at["g3"],
    "use1": sc["use1"]["start"],
    "pays": seg("use1", 2),
    # the X-ray: one payment, end to end
    "xray": sc["xray"]["start"],
    "scan": round(at["x1"] + 0.45, 3),
    "keys": [word("x2", "owner"), word("x2", "agent"), word("x2", "ai")],
    "quote": word("x3", "price"),
    "checks": [word("x4", "task"), word("x4", "traces"), word("x4", "simulates")],
    "signs": word("x5", "signs"),
    "sends": word("x5", "sends"),
    "contrast": at["x6a"],
    "asks": word("x6", "asks"),
    "eight": word("x6", "eight"),
    "pass": word("x7", "pass"),
    "hash": word("x7", "hash"),
    "pullback": round(end("x7") + 0.6, 3),
    "use2": sc["use2"]["start"],
    "use2_beats": [seg("use2", i) for i in (2, 4, 6)],
    "drop": sc["breakT"]["start"],
    "attack": sc["attack"]["start"],
    "hits": [word("k2", "hidden"), word("k2", "data"), word("k2", "even")],
    "fool": at["k3"],
    "money": sc["money"]["start"],
    "no": word("k4", "no"),
    "because": word("k5", "card"),
    # why it held: the layers, then the server is taken over
    "why": sc["why"]["start"],
    "layers": word("y1", "eight"),
    "last": word("y2", "last"),
    "taken": word("y2", "taken"),
    "stolen": sc["stolen"]["start"],
    "stolen_hits": [word("y3", "steals"), word("y3", "guardian"), word("y3", "your")],
    "watch": sc["watch"]["start"],
    "freeze": word("w2", "freezes"),
    "only": sc["only"]["start"],
    "stricter": word("w3", "stricter"),
    "looser": word("w3", "looser"),
    "hkma": sc["hkma"]["start"],
    "principles": [word("h1", "intent"), word("h1", "kill"), word("h1", "versus"), word("h1", "boundaries")],
    "four": word("h2", "four"),
    "proof": sc["proof"]["start"],
    "rejected": word("f1", "rejected"),
    "attacks": at["f2"],
    "tests": word("f3", "tests"),
    "team": sc["team"]["start"],
    "close": sc["close"]["start"],
    "line": at["z1"],
    "end": tl["total"],
}
# hits that cut through the voice ducking (tools/mix.py)
c["punch"] = [[round(c["cut"] + 2.55, 3), 1.2], [round(c["nine"] - 0.05, 3), 0.9], [round(c["pass"] - 0.05, 3), 0.8], [round(c["no"] - 0.05, 3), 1.3], [round(c["taken"] - 0.05, 3), 0.9], [round(c["looser"] + 0.15, 3), 0.9]]
tl["cues"] = c
json.dump(tl, open(tl_path, "w"), indent=1)
print("cues:", {k: c[k] for k in ("cut", "nine", "xray", "pass", "drop", "no", "taken", "end")}, f"morse {len(morse)} pulses to {t:.2f}s")
