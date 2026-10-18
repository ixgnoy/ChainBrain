#!/usr/bin/env python3
"""Independent pocket verifier: reads a ChainBrain pocket's rules straight from the chain, says them in plain English,
and checks them against what the owner approved.

Python 3 standard library only, no code shared with the TypeScript stack: its own Keccak-256, ABI encoding and JSON-RPC.
Read-only: it never sends a transaction.

  python3 verify/verify_pocket.py --rpc https://fisco-node-production.up.railway.app --pocket 0x... [--approved approved.json] [--json]
                                   [--factory 0x...]   (default: the committed ChainBrain factory)

It also checks provenance: the pocket must appear in the factory's PocketCreated logs and use the factory's token, so a
lookalike contract whose getters return the approved values does not pass.

Exit code: 0 = every approved field matches (or nothing to compare), 1 = a mismatch, 2 = RPC or input error.
"""
import argparse
import datetime
import json
import sys
import urllib.request

# ---------------------------------------------------------------- Keccak-256 (Ethereum's, not hashlib's SHA3-256)

_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000, 0x000000000000808B,
    0x0000000080000001, 0x8000000080008081, 0x8000000000008009, 0x000000000000008A, 0x0000000000000088,
    0x0000000080008009, 0x000000008000000A, 0x000000008000808B, 0x800000000000008B, 0x8000000000008089,
    0x8000000000008003, 0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]
_ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]]
_M = (1 << 64) - 1


def _rol(x, n):
    return ((x << n) | (x >> (64 - n))) & _M if n else x


def _f1600(a):
    for rc in _RC:
        c = [a[x][0] ^ a[x][1] ^ a[x][2] ^ a[x][3] ^ a[x][4] for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rol(c[(x + 1) % 5], 1) for x in range(5)]
        a = [[a[x][y] ^ d[x] for y in range(5)] for x in range(5)]
        b = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                b[y][(2 * x + 3 * y) % 5] = _rol(a[x][y], _ROT[x][y])
        a = [[b[x][y] ^ ((~b[(x + 1) % 5][y]) & b[(x + 2) % 5][y]) for y in range(5)] for x in range(5)]
        a[0][0] ^= rc
    return a


def keccak256(data: bytes) -> bytes:
    rate = 136
    msg = bytearray(data) + b"\x01"
    msg += b"\x00" * (-len(msg) % rate)
    msg[-1] |= 0x80
    a = [[0] * 5 for _ in range(5)]
    for off in range(0, len(msg), rate):
        block = msg[off:off + rate]
        for i in range(rate // 8):
            x, y = i % 5, i // 5
            a[x][y] ^= int.from_bytes(block[8 * i:8 * i + 8], "little")
        a = _f1600(a)
    out = b"".join(a[i % 5][i // 5].to_bytes(8, "little") for i in range(4))
    return out


def selector(sig: str) -> str:
    return keccak256(sig.encode()).hex()[:8]


def topic(sig: str) -> str:
    return "0x" + keccak256(sig.encode()).hex()


assert keccak256(b"").hex() == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
assert selector("transfer(address,uint256)") == "a9059cbb"

# ---------------------------------------------------------------- JSON-RPC and ABI


class RpcError(Exception):
    pass


class Reverted(Exception):
    """The call reverted or returned nothing: the function is not on this contract version."""


class Rpc:
    def __init__(self, url: str):
        self.url = url
        self.n = 0

    def call(self, method: str, params: list):
        self.n += 1
        body = json.dumps({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params}).encode()
        req = urllib.request.Request(self.url, data=body, headers={"content-type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                out = json.loads(r.read())
        except Exception as e:  # network, HTTP, bad JSON
            raise RpcError(f"{method}: {e}") from e
        if "error" in out:
            raise Reverted(str(out["error"]))
        return out.get("result")


def _addr_word(a: str) -> str:
    return a.lower().replace("0x", "").rjust(64, "0")


def eth_call(rpc: Rpc, to: str, sig: str, *args: str) -> bytes:
    data = "0x" + selector(sig) + "".join(_addr_word(x) for x in args)
    res = rpc.call("eth_call", [{"to": to, "data": data}, "latest"])
    if not res or res == "0x":
        raise Reverted(sig)
    return bytes.fromhex(res[2:])


def word(b: bytes, i: int = 0) -> int:
    return int.from_bytes(b[32 * i:32 * i + 32], "big")


def as_addr(b: bytes) -> str:
    return "0x" + b[12:32].hex()


def as_string(b: bytes) -> str:
    if len(b) == 32:  # bytes32-style symbol
        return b.rstrip(b"\x00").decode(errors="replace")
    off = word(b)
    n = word(b[off:])
    return b[off + 32:off + 32 + n].decode(errors="replace")


# ---------------------------------------------------------------- reading a pocket

PERIODS = {1: "day", 2: "week", 3: "month"}
PERIOD_TEXT = {1: "per day (Hong Kong time, from 00:00)", 2: "per week (Hong Kong time, from Monday 00:00)",
               3: "per month (Hong Kong time, from the 1st)"}
THIS = {1: "today", 2: "this week", 3: "this month"}
NOT_AVAILABLE = "not available on this pocket's contract version"
MAX = (1 << 256) - 1
HKT = datetime.timezone(datetime.timedelta(hours=8))
FACTORY = "0x03aB4C311eeE7C3295c63F910D79a07Ffa7A097A"  # contracts/deployments/20200.json, the same on every fresh chain


def hkd(units: int, decimals: int = 6) -> str:
    """6-decimal token units as HK$, at least 2 decimals, no trailing noise: 2000000 -> HK$2.00, 1234567 -> HK$1.234567."""
    whole, frac = divmod(units, 10 ** decimals)
    f = str(frac).rjust(decimals, "0").rstrip("0").ljust(2, "0")
    return f"HK${whole:,}.{f}"


def parse_hkd(s: str, decimals: int = 6) -> int:
    s = str(s).strip().replace("HK$", "").replace(",", "")
    whole, _, frac = s.partition(".")
    if len(frac) > decimals or not (whole or "0").isdigit() or (frac and not frac.isdigit()):
        raise ValueError(f"bad HK$ amount: {s}")
    return int(whole or "0") * 10 ** decimals + int(frac.ljust(decimals, "0") or "0")


def short(a: str) -> str:
    return f"{a[:6]}..{a[-4:]}"


def is_real_code(code: str) -> bool:
    """FISCO BCOS reports accounts it tracks with pseudo-code: the ASCII "[PRECOMPILED],..." in hex. That is not a contract."""
    if not code or code in ("0x", "0x0"):
        return False
    try:
        return not bytes.fromhex(code[2:]).startswith(b"[PRECOMPILED]")
    except ValueError:
        return True


def read_pocket(rpc: Rpc, pocket: str) -> dict:
    s: dict = {"pocket": pocket.lower(), "missing": []}
    s["hasCode"] = is_real_code(rpc.call("eth_getCode", [pocket, "latest"]))
    if not s["hasCode"]:
        return s

    def get(key, sig, conv, *args):
        try:
            s[key] = conv(eth_call(rpc, pocket, sig, *args))
        except Reverted:
            s[key] = None
            s["missing"].append(key)

    get("token", "token()", as_addr)
    get("owner", "owner()", as_addr)
    get("agent", "agent()", as_addr)
    get("guardian", "guardian()", as_addr)
    get("cap", "perPaymentCap()", word)
    get("askAbove", "askAbove()", word)
    get("expiresAt", "expiresAt()", word)
    get("revoked", "revoked()", lambda b: bool(word(b)))
    get("frozen", "frozen()", lambda b: bool(word(b)))
    get("periodKind", "periodKind()", word)
    get("periodLimit", "periodLimit()", word)
    get("spentThisPeriod", "spentThisPeriod()", word)

    s["symbol"], s["decimals"], s["balance"] = "eHKD", 6, None
    if s.get("token"):
        for key, sig, conv in (("symbol", "symbol()", as_string), ("decimals", "decimals()", word)):
            try:
                s[key] = conv(eth_call(rpc, s["token"], sig))
            except Reverted:
                pass
        try:
            s["balance"] = word(eth_call(rpc, s["token"], "balanceOf(address)", pocket))
        except Reverted:
            s["missing"].append("balance")

    # a pocket with sellerCap() is the version that emits SellerSet from its constructor on: for it, missing logs are an error
    try:
        eth_call(rpc, pocket, "sellerCap(address)", "0x" + "0" * 40)
        s["newVersion"] = True
    except Reverted:
        s["newVersion"] = False

    # the allowlist, rebuilt from the pocket's own logs (constructor on), each entry confirmed against current state
    s["sellers"], s["sellerCaps"], s["sellersFromLogs"], s["sellersError"] = [], {}, True, None
    seen = []
    try:
        wanted = (topic("SellerSet(address,bool)"), topic("SellerCapSet(address,uint256)"))
        for lg in logs_of(rpc, pocket):
            if lg.get("topics") and lg["topics"][0] in wanted:
                a = "0x" + lg["topics"][1][-40:]
                if a not in seen:
                    seen.append(a)
    except Reverted as e:
        seen = []
        if s["newVersion"]:
            s["sellersError"] = f"cannot list from logs ({e})"
    if not seen:
        s["sellersFromLogs"] = False  # an older pocket emits no SellerSet events
        if s["newVersion"] and not s["sellersError"]:
            s["sellersError"] = "cannot list from logs (this pocket version must have SellerSet logs, none were found)"
    s["_candidates"] = seen
    confirm_sellers(rpc, s, seen)
    return s


LOG_WINDOW = 5  # FISCO BCOS 3.x drops results from wide eth_getLogs ranges; windows of a few blocks return every log


def logs_of(rpc: Rpc, address: str, topics: list = None) -> list:
    """Every log the address emitted, scanned in small block windows (FISCO quirk, see LOG_WINDOW)."""
    latest = int(rpc.call("eth_blockNumber", []), 16)
    out = []
    for start in range(0, latest + 1, LOG_WINDOW):
        end = min(start + LOG_WINDOW - 1, latest)
        out += rpc.call("eth_getLogs", [{"address": address, "fromBlock": hex(start), "toBlock": hex(end), "topics": topics or []}]) or []
    return out


def provenance(rpc: Rpc, s: dict, factory: str) -> tuple:
    """(ok, detail): the pocket is in the factory's PocketCreated logs and uses the factory's token."""
    want = "0x" + _addr_word(s["pocket"])
    try:
        created = any(len(lg.get("topics", [])) > 1 and lg["topics"][1].lower() == want
                      for lg in logs_of(rpc, factory, [topic("PocketCreated(address,address,address)")]))
    except Reverted as e:
        return False, f"cannot read the factory's logs ({e})"
    if not created:
        return False, f"not created by the ChainBrain factory {factory}"
    try:
        ftoken = as_addr(eth_call(rpc, factory, "token()"))
    except Reverted:
        return False, f"factory {factory} has no token()"
    if (s.get("token") or "").lower() != ftoken.lower():
        return False, f"token {s.get('token')} is not the factory's token {ftoken}"
    return True, f"created by the ChainBrain factory {factory}, token {ftoken}"


def confirm_sellers(rpc: Rpc, s: dict, candidates: list) -> None:
    for a in candidates:
        a = a.lower()
        try:
            if word(eth_call(rpc, s["pocket"], "sellerAllowed(address)", a)) and a not in s["sellers"]:
                s["sellers"].append(a)
        except Reverted:
            pass
        try:
            cap = word(eth_call(rpc, s["pocket"], "sellerCap(address)", a))
            if cap:
                s["sellerCaps"][a] = cap
        except Reverted:
            if "sellerCap" not in s["missing"]:
                s["missing"].append("sellerCap")


# ---------------------------------------------------------------- plain English


def when(sec: int) -> str:
    return datetime.datetime.fromtimestamp(sec, HKT).strftime("%Y-%m-%d %H:%M HKT")


def period_text(kind, limit, spent, dec=6) -> str:
    if kind is None:
        return f"Period allowance: {NOT_AVAILABLE}."
    if kind == 0:
        return "No period allowance: only the per-payment cap and the balance limit spending."
    spent_txt = f"; {hkd(spent, dec)} spent {THIS[kind]}" if spent is not None else ""
    return (f"At most {hkd(limit, dec)} {PERIOD_TEXT[kind]}{spent_txt}. "
            f"Beyond that a payment also needs the owner's signature.")


def _amt(x, d) -> str:
    return NOT_AVAILABLE if x is None else hkd(x, d)


def _who(a) -> str:
    return NOT_AVAILABLE if not a else short(a)


def explain(s: dict) -> list:
    if not s["hasCode"]:
        return [f"{s['pocket']} has no contract code: not a pocket."]
    d = s.get("decimals") or 6
    lines = []
    if s.get("revoked"):
        lines.append("REVOKED: this pocket refuses every payment.")
    if s.get("frozen"):
        lines.append("FROZEN: every payment is stopped until the owner unfreezes it.")
    own = f" (sellers with their own cap below use it instead, higher or lower)" if s.get("sellerCaps") else ""
    lines.append(f"The agent {_who(s.get('agent'))} may pay at most {_amt(s.get('cap'), d)} per payment{own}, from this pocket only.")
    if s["sellers"]:
        lines.append("Only to: " + ", ".join(
            f"{a}" + (f" (cap {hkd(s['sellerCaps'][a], d)})" if a in s["sellerCaps"] else "") for a in s["sellers"]))
    elif s.get("sellersError"):
        lines.append(f"Allowed sellers: {s['sellersError']}.")
    elif s["sellersFromLogs"]:
        lines.append("No seller is allowed: every payment is refused.")
    else:
        lines.append(f"Allowed sellers: the list from logs is {NOT_AVAILABLE}; checked only the sellers given.")
    ask = s.get("askAbove")
    lines.append(f"Ask-me limit: {NOT_AVAILABLE}." if ask is None else "Never asks the owner." if ask == MAX else
                 "Every payment also needs the owner's signature." if ask == 0 else
                 f"Payments above {hkd(ask, d)} also need the owner's signature.")
    lines.append(period_text(s.get("periodKind"), s.get("periodLimit"), s.get("spentThisPeriod"), d))
    if s.get("expiresAt") is not None:
        lines.append(f"Expires {when(s['expiresAt'])}." if s["expiresAt"] < 1 << 63 else "Never expires.")
    g = s.get("guardian")
    lines.append(f"Guardian: {NOT_AVAILABLE}." if "guardian" in s["missing"] else "No guardian." if not g or int(g, 16) == 0 else
                 f"Guardian {short(g)} can only freeze it: it can never move money, unfreeze or change a rule.")
    lines.append(f"Owner {_who(s.get('owner'))} alone can change rules, unfreeze, revoke or take the money back.")
    if s.get("balance") is not None:
        lines.append(f"Balance: {hkd(s['balance'], d)} {s['symbol']} (the budget: the agent can never spend more).")
    return lines


# ---------------------------------------------------------------- comparing with what the owner approved


def compare(s: dict, ap: dict, rpc: Rpc = None) -> list:
    """[(field, ok, approved, on_chain)] for every field the approved JSON names."""
    out = []
    d = s.get("decimals") or 6

    def add(field, want, got, ok=None):
        out.append((field, want == got if ok is None else ok, want, got))

    if "pocket" in ap:
        add("pocket", ap["pocket"].lower(), s["pocket"])
    for k in ("owner", "agent", "guardian", "token"):
        if k in ap:
            add(k, (ap[k] or "0x" + "0" * 40).lower(), (s.get(k) or "").lower())
    if "cap" in ap:
        add("cap", hkd(parse_hkd(ap["cap"], d), d), hkd(s["cap"], d) if s.get("cap") is not None else NOT_AVAILABLE)
    if "askAbove" in ap:
        want = "never" if ap["askAbove"] == "never" else hkd(parse_hkd(ap["askAbove"], d), d)
        got = NOT_AVAILABLE if s.get("askAbove") is None else "never" if s["askAbove"] == MAX else hkd(s["askAbove"], d)
        add("askAbove", want, got)
    if "expiresAt" in ap:
        add("expiresAt", ap["expiresAt"], s.get("expiresAt"))
    if "sellers" in ap:
        want = sorted(x.lower() for x in ap["sellers"])
        if rpc is not None and not s["sellersFromLogs"]:
            confirm_sellers(rpc, s, want)  # an older pocket: at least confirm the approved ones
        got = sorted(s["sellers"])
        extra = [a for a in got if a not in want]
        # an older pocket has no SellerSet logs: the approved sellers are confirmed, but extra ones cannot be ruled out
        if s.get("sellersError"):
            add(f"sellers: {s['sellersError']}", want, got, ok=False)
        else:
            field = "sellers" if s["sellersFromLogs"] else f"sellers (approved ones confirmed; extra sellers {NOT_AVAILABLE})"
            add(field, want, got, ok=not extra and set(want) <= set(got))
    if "period" in ap:
        p = ap["period"]
        if s.get("periodKind") is None:
            add("period", p, NOT_AVAILABLE, ok=p is None)
        else:
            want = None if not p else {"kind": p["kind"], "limit": hkd(parse_hkd(p["limit"], d), d)}
            got = None if s["periodKind"] == 0 else {"kind": PERIODS.get(s["periodKind"], "?"), "limit": hkd(s["periodLimit"], d)}
            add("period", want, got)
    if "sellerCaps" in ap:
        want = {a.lower(): hkd(parse_hkd(v, d), d) for a, v in (ap["sellerCaps"] or {}).items()}
        if rpc is not None:
            confirm_sellers(rpc, s, list(want))
        got = {a: hkd(v, d) for a, v in s["sellerCaps"].items()}
        add("sellerCaps", want, got)
    if "revoked" in ap:
        add("revoked", ap["revoked"], s.get("revoked"))
    if "frozen" in ap:
        add("frozen", ap["frozen"], s.get("frozen"))
    return out


# ---------------------------------------------------------------- CLI


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Read a ChainBrain pocket's rules from the chain and check them.")
    ap.add_argument("--rpc", required=True)
    ap.add_argument("--pocket", required=True)
    ap.add_argument("--approved", help="JSON of what the owner approved (see verify/README.md)")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--factory", default=FACTORY, help="the ChainBrain PocketFactory the pocket must come from")
    a = ap.parse_args(argv)
    rpc = Rpc(a.rpc)
    try:
        approved = json.load(open(a.approved)) if a.approved else None
        s = read_pocket(rpc, a.pocket)
        rows = []
        if s["hasCode"]:
            prov_ok, prov = provenance(rpc, s, a.factory)
            s["provenance"] = prov
            rows.append(("provenance", prov_ok, "created by the ChainBrain factory", prov))
            if s.get("sellersError") and not approved:
                rows.append((f"sellers: {s['sellersError']}", False, "listed from SellerSet logs", "none"))
            if approved:
                rows += compare(s, approved, rpc)
        rules = explain(s)
    except (RpcError, OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except Exception as e:  # anything unexpected: say so, never a traceback
        print(f"error: unexpected {type(e).__name__}: {e}", file=sys.stderr)
        return 2
    ok = all(r[1] for r in rows) and s["hasCode"]
    if a.json:
        s.pop("_candidates", None)
        print(json.dumps({"state": s, "rules": rules,
                          "compare": [{"field": f, "match": m, "approved": w, "onChain": g} for f, m, w, g in rows],
                          "ok": ok}, indent=2, default=str))
    else:
        print(f"Pocket {s['pocket']} (read from {a.rpc})")
        for line in rules:
            print("  - " + line)
        if s["missing"]:
            print(f"  ({', '.join(sorted(set(s['missing'])))}: {NOT_AVAILABLE})")
        if rows:
            print("Checks:" if not approved else "Provenance and what the owner approved:")
            for f, m, w, g in rows:
                print(f"  {'MATCH   ' if m else 'MISMATCH'} {f}: approved {w}" + ("" if m else f", on chain {g}"))
            print(("All approved rules hold on chain." if approved else "Provenance holds.") if ok else
                  "MISMATCH: the chain does not hold what the owner approved." if approved else "MISMATCH: see above.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
