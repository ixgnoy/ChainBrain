#!/usr/bin/env python3
"""Re-fetch every hosted-chain transaction in the execution evidence from the public FISCO RPC.
Standard library only, read-only, no keys.  python3 docs/submission/evidence/check_hosted.py [--write]
Prints block, time (HKT), status and whether it matches the expected result; exits 1 on any mismatch.
--write refreshes hosted-receipts.json next to this file."""
import datetime, json, os, sys, urllib.request

RPC = os.environ.get("FISCO_RPC", "https://fisco-node-production.up.railway.app")
HERE = os.path.dirname(os.path.abspath(__file__))
HKT = datetime.timezone(datetime.timedelta(hours=8))


def call(method, params, tries=3):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(RPC, body, {"content-type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=30))["result"]
        except OSError:
            if i == tries - 1:
                raise


def rows():
    app = json.load(open(os.path.join(HERE, "evidence-fisco-railway.json")))
    for e in app["entries"]:
        yield {"set": "app", "label": e["label"], "tx": e["tx"], "expect": e["expect"]}
    proof = json.load(open(os.path.join(HERE, "..", "redteam", "hosted-proof.json")))
    for s in proof["steps"]:
        yield {"set": "proof", "label": s["step"], "tx": s["tx"], "expect": s["expect"], "reason": s.get("reason")}


out, blocks, misses = [], {}, 0
for r in rows():
    rc = call("eth_getTransactionReceipt", [r["tx"]])
    if rc:
        n = int(rc["blockNumber"], 16)
        if n not in blocks:
            blocks[n] = int(call("eth_getBlockByNumber", [hex(n), False])["timestamp"], 16)
        ts = blocks[n] / 1000 if blocks[n] > 1e11 else blocks[n]  # FISCO block time is in milliseconds
        r.update(block=n, time=datetime.datetime.fromtimestamp(ts, HKT).strftime("%Y-%m-%d %H:%M:%S"),
                 status="success" if int(rc["status"], 16) == 1 else "reverted", sender=rc["from"], to=rc.get("to"))
    else:
        r["status"] = "not found"
    ok = r["status"] == r["expect"]
    misses += not ok
    print(f"{'ok  ' if ok else 'MISS'} {r.get('block', '-'):>4} {r.get('time', '-'):19} {r['status']:9} {r['tx']}  {r['label']}")
    out.append(r)

print(f"{len(out) - misses} of {len(out)} match; head block {int(call('eth_blockNumber', []), 16)}; {RPC}")
if "--write" in sys.argv:
    with open(os.path.join(HERE, "hosted-receipts.json"), "w") as f:
        json.dump({"rpc": RPC, "checkedAt": datetime.datetime.now(HKT).strftime("%Y-%m-%d %H:%M HKT"), "rows": out}, f, indent=1)
sys.exit(1 if misses else 0)
