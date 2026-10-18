"""python3 -m unittest verify/test_verify.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verify_pocket as v  # noqa: E402

POCKET = "0x" + "aa" * 20
TOKEN = "0x0355c0c5afe2a35369056fbb854903a4af07781a"
OWNER, AGENT, GUARD = "0x" + "01" * 20, "0x" + "02" * 20, "0x" + "03" * 20
LITE, PRO, STRAY = "0x" + "11" * 20, "0x" + "22" * 20, "0x" + "99" * 20
FACTORY = v.FACTORY.lower()


def w(x) -> str:
    return (x if isinstance(x, str) else hex(x))[2:].rjust(64, "0")


class FakeRpc:
    """A new-contract pocket: cap 2, ask 1, weekly 0.40 with 0.10 spent, DataLite + DataPro (cap 3), funded 5."""

    def __init__(self, old=False, lookalike=False, factory_token=TOKEN, logs_error=False, drop=()):
        self.old, self.lookalike, self.factory_token, self.logs_error = old, lookalike, factory_token, logs_error
        sel = v.selector
        self.views = {
            sel("token()"): w(TOKEN), sel("owner()"): w(OWNER), sel("agent()"): w(AGENT), sel("guardian()"): w(GUARD),
            sel("perPaymentCap()"): w(2_000_000), sel("askAbove()"): w(1_000_000), sel("expiresAt()"): w(1_792_512_000),
            sel("revoked()"): w(0), sel("frozen()"): w(0), sel("decimals()"): w(6),
            sel("symbol()"): w(32) + w(4) + b"eHKD".hex().ljust(64, "0"),
            sel("periodKind()"): w(2), sel("periodLimit()"): w(400_000), sel("spentThisPeriod()"): w(100_000),
        }
        if old:
            for k in ("periodKind()", "periodLimit()", "spentThisPeriod()"):
                del self.views[sel(k)]
        for k in drop:  # getters this contract lacks
            del self.views[sel(k)]

    def call(self, method, params):
        if method == "eth_getCode":
            return "0x6080"
        if method == "eth_blockNumber":
            return "0x9"  # two scan windows: the logs sit in the second one
        if method == "eth_getLogs":
            f = params[0]
            if f["address"].lower() == FACTORY:  # the factory's PocketCreated, in the first window
                pc = v.topic("PocketCreated(address,address,address)")
                return [] if self.lookalike or f["fromBlock"] != "0x0" else [{"topics": [pc, "0x" + w(POCKET), "0x" + w(OWNER), "0x" + w(AGENT)]}]
            if self.logs_error:
                raise v.Reverted("eth_getLogs failed")
            if self.old or f["fromBlock"] != "0x5":
                return []
            ss, cs = v.topic("SellerSet(address,bool)"), v.topic("SellerCapSet(address,uint256)")
            return [{"topics": [ss, "0x" + w(LITE)]}, {"topics": [ss, "0x" + w(PRO)]}, {"topics": [cs, "0x" + w(PRO)]}, {"topics": [v.topic("RulesChanged()")]}]
        data, to = params[0]["data"][2:], params[0]["to"].lower()
        if to == FACTORY:
            return "0x" + w(self.factory_token) if data[:8] == v.selector("token()") else "0x"
        s, arg = data[:8], ("0x" + data[-40:]) if len(data) > 8 else None
        if s == v.selector("balanceOf(address)"):
            return "0x" + w(5_000_000)
        if s == v.selector("sellerAllowed(address)"):
            return "0x" + w(1 if arg in (LITE, PRO) else 0)
        if s == v.selector("sellerCap(address)"):
            if self.old:
                return "0x"
            return "0x" + w(3_000_000 if arg == PRO else 0)
        if s in self.views:
            return "0x" + self.views[s]
        return "0x"  # unknown function: no return data, like a revert


APPROVED = {"pocket": POCKET, "owner": OWNER, "agent": AGENT, "sellers": [LITE, PRO], "cap": "2.00", "askAbove": "1.00",
            "expiresAt": 1_792_512_000, "period": {"kind": "week", "limit": "0.40"}, "sellerCaps": {PRO: "3.00"}}


class Keccak(unittest.TestCase):
    def test_vectors(self):
        self.assertEqual(v.keccak256(b"").hex(), "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
        self.assertEqual(v.keccak256(b"abc").hex(), "4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45")
        self.assertEqual(v.selector("transfer(address,uint256)"), "a9059cbb")
        self.assertEqual(v.selector("balanceOf(address)"), "70a08231")
        self.assertEqual(v.topic("Transfer(address,address,uint256)"),
                         "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")
        self.assertEqual(len(v.keccak256(b"x" * 300)), 32)  # multi-block input


class Amounts(unittest.TestCase):
    def test_format_and_parse(self):
        self.assertEqual(v.hkd(2_000_000), "HK$2.00")
        self.assertEqual(v.hkd(400_000), "HK$0.40")
        self.assertEqual(v.hkd(1_234_567), "HK$1.234567")
        self.assertEqual(v.hkd(10_000_000_000), "HK$10,000.00")
        self.assertEqual(v.parse_hkd("0.40"), 400_000)
        self.assertEqual(v.parse_hkd("HK$5"), 5_000_000)
        with self.assertRaises(ValueError):
            v.parse_hkd("1.1234567")

    def test_period_text(self):
        self.assertIn("HK$0.40 per week (Hong Kong time, from Monday 00:00); HK$0.10 spent this week",
                      v.period_text(2, 400_000, 100_000))
        self.assertIn("per day", v.period_text(1, 1, 0))
        self.assertIn("No period allowance", v.period_text(0, 0, 0))
        self.assertIn(v.NOT_AVAILABLE, v.period_text(None, None, None))

    def test_precompiled_pseudo_code_is_not_a_contract(self):
        self.assertFalse(v.is_real_code("0x" + b"[PRECOMPILED],0,/usr/abc".hex()))
        self.assertFalse(v.is_real_code("0x"))
        self.assertTrue(v.is_real_code("0x6080604052"))


class ReadAndCompare(unittest.TestCase):
    def test_reads_and_explains(self):
        s = v.read_pocket(FakeRpc(), POCKET)
        self.assertEqual(s["sellers"], [LITE, PRO])
        self.assertEqual(s["sellerCaps"], {PRO: 3_000_000})
        text = "\n".join(v.explain(s))
        self.assertIn("may pay at most HK$2.00 per payment", text)
        self.assertIn(f"{PRO} (cap HK$3.00)", text)
        self.assertIn("Payments above HK$1.00 also need the owner's signature", text)
        self.assertIn("HK$0.40 per week", text)
        self.assertIn("Balance: HK$5.00 eHKD", text)

    def test_everything_matches(self):
        rpc = FakeRpc()
        rows = v.compare(v.read_pocket(rpc, POCKET), APPROVED, rpc)
        self.assertEqual(len(rows), 9)
        self.assertTrue(all(ok for _, ok, _, _ in rows), rows)

    def test_mismatches(self):
        rpc = FakeRpc()
        s = v.read_pocket(rpc, POCKET)
        bad = dict(APPROVED, cap="1.00", askAbove="never", sellers=[LITE], period={"kind": "day", "limit": "0.40"})
        failed = {f for f, ok, _, _ in v.compare(s, bad, rpc) if not ok}
        self.assertEqual(failed, {"cap", "askAbove", "sellers", "period"})  # DataPro on chain but not approved = extra

    def test_old_contract_degrades(self):
        rpc = FakeRpc(old=True)
        s = v.read_pocket(rpc, POCKET)
        self.assertIn("periodKind", s["missing"])
        self.assertFalse(s["sellersFromLogs"])
        text = "\n".join(v.explain(s))
        self.assertIn(v.NOT_AVAILABLE, text)
        rows = {f.split(" ")[0]: ok for f, ok, _, _ in v.compare(s, dict(APPROVED, period=None, sellerCaps={}), rpc)}
        self.assertTrue(rows["sellers"])  # the approved ones are confirmed one by one
        self.assertTrue(rows["period"])  # nothing approved, nothing to hold
        self.assertFalse({f: ok for f, ok, _, _ in v.compare(s, APPROVED, rpc)}["period"])

    def test_main_exit_codes(self):
        import json
        import tempfile
        orig = v.Rpc
        v.Rpc = lambda url: FakeRpc()
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
                json.dump(APPROVED, f)
            self.assertEqual(v.main(["--rpc", "x", "--pocket", POCKET, "--approved", f.name, "--json"]), 0)
            with open(f.name, "w") as g:
                json.dump(dict(APPROVED, cap="9.00"), g)
            self.assertEqual(v.main(["--rpc", "x", "--pocket", POCKET, "--approved", f.name]), 1)
        finally:
            v.Rpc = orig
            os.unlink(f.name)


class Provenance(unittest.TestCase):
    def run_main(self, rpc, *extra):
        orig = v.Rpc
        v.Rpc = lambda url: rpc
        try:
            return v.main(["--rpc", "x", "--pocket", POCKET, *extra])
        finally:
            v.Rpc = orig

    def test_real_pocket_passes(self):
        rpc = FakeRpc()
        ok, detail = v.provenance(rpc, v.read_pocket(rpc, POCKET), FACTORY)
        self.assertTrue(ok, detail)
        self.assertEqual(self.run_main(FakeRpc()), 0)

    def test_lookalike_contract_fails_even_when_every_rule_matches(self):
        import json, tempfile
        rpc = FakeRpc(lookalike=True)
        ok, detail = v.provenance(rpc, v.read_pocket(rpc, POCKET), FACTORY)
        self.assertFalse(ok)
        self.assertIn("not created by the ChainBrain factory", detail)
        self.assertEqual(self.run_main(FakeRpc(lookalike=True)), 1)  # no --approved: still exit 1
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(APPROVED, f)
        try:
            self.assertEqual(self.run_main(FakeRpc(lookalike=True), "--approved", f.name), 1)
        finally:
            os.unlink(f.name)

    def test_token_mismatch(self):
        rpc = FakeRpc(factory_token="0x" + "ee" * 20)
        ok, detail = v.provenance(rpc, v.read_pocket(rpc, POCKET), FACTORY)
        self.assertFalse(ok)
        self.assertIn("is not the factory's token", detail)
        rows = {f: ok for f, ok, _, _ in v.compare(v.read_pocket(FakeRpc(), POCKET), dict(APPROVED, token="0x" + "ee" * 20))}
        self.assertFalse(rows["token"])

    def test_logs_error_on_a_new_pocket_is_a_mismatch(self):
        rpc = FakeRpc(logs_error=True)
        s = v.read_pocket(rpc, POCKET)
        self.assertTrue(s["newVersion"])
        self.assertIn("cannot list from logs", s["sellersError"])
        failed = [f for f, ok, _, _ in v.compare(s, APPROVED, rpc) if not ok]
        self.assertTrue(any(f.startswith("sellers: cannot list from logs") for f in failed), failed)
        self.assertEqual(self.run_main(FakeRpc(logs_error=True)), 1)

    def test_missing_getter_does_not_crash(self):
        s = v.read_pocket(FakeRpc(drop=("owner()", "agent()", "perPaymentCap()", "askAbove()", "guardian()")), POCKET)
        text = "\n".join(v.explain(s))
        self.assertIn(v.NOT_AVAILABLE, text)
        self.assertIn(self.run_main(FakeRpc(drop=("owner()", "perPaymentCap()"))), (0, 1))

    def test_unexpected_error_exits_2(self):
        class Boom(FakeRpc):
            def call(self, method, params):
                if method == "eth_blockNumber":
                    raise KeyError("boom")
                return super().call(method, params)
        self.assertEqual(self.run_main(Boom()), 2)

    def test_headline_mentions_seller_caps(self):
        text = "\n".join(v.explain(v.read_pocket(FakeRpc(), POCKET)))
        self.assertIn("sellers with their own cap below use it instead, higher or lower", text)


if __name__ == "__main__":
    unittest.main()
