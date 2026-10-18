import { Hono } from "hono";
import { isAddress, type Address, type Hex } from "viem";
import { cfg } from "./chains";
import { write } from "./ledger";
import { pub } from "./wallet/chain";
import { fundIfEmpty } from "./fund";
import { parseAmount, formatAmount } from "./wallet/money";

/**
 * Mock e-HKD faucet: credits native balance so the address can send (gas is free, the RPC needs > 0),
 * then OWNER mints FAUCET_AMOUNT eHKD to it. Mock token on a demo chain: the limits keep it from being drained by a loop,
 * nothing more.
 */
const DAY = 86_400_000, HOUR = 3_600_000;
// ponytail: in-memory limits, reset on restart; persist them if the faucet ever guards something of value
const byAddress = new Map<string, number>();
const byIp = new Map<string, number[]>();

const mintAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;
const amount = () => process.env.FAUCET_AMOUNT ?? "100";
const publicRpc = () => process.env.PUBLIC_RPC_URL || cfg().chain.rpcUrls.default.http[0];
const publicApi = () => process.env.PUBLIC_API_URL ?? "http://localhost:8787";

export function faucetRoutes() {
  const app = new Hono();

  app.get("/api/faucet/info", (c) => c.json({
    chainId: cfg().chain.id, chainName: "FISCO BCOS (ChainBrain demo)", rpc: publicRpc(), explorer: `${publicApi()}/explorer`,
    token: cfg().token, symbol: "eHKD", decimals: 6, amount: amount(), enabled: cfg().key === "fisco",
  }));

  app.post("/api/faucet", async (c) => {
    if (cfg().key !== "fisco") return c.json({ error: "FAUCET_ONLY_ON_FISCO" }, 400);
    const { address } = (await c.req.json().catch(() => ({}))) as { address?: string };
    if (!address || !isAddress(address)) return c.json({ error: "BAD_ADDRESS" }, 400);
    const a = address.toLowerCase();
    const ip = c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const now = Date.now();
    const last = byAddress.get(a);
    if (last && now - last < DAY) return c.json({ error: "ALREADY_CLAIMED", retryAfterSec: Math.ceil((last + DAY - now) / 1000) }, 429);
    const recent = (byIp.get(ip) ?? []).filter((t) => now - t < HOUR);
    if (recent.length >= 10) return c.json({ error: "TOO_MANY_REQUESTS" }, 429);
    byAddress.set(a, now);
    byIp.set(ip, [...recent, now]);
    try {
      const funded = await fundIfEmpty(pub(), [address as Address]);
      const value = parseAmount(amount());
      // the ledger queues OWNER's mints one at a time (FISCO: one transaction per sender)
      const { hash: tx } = await write(process.env.OWNER_PK as Hex, { address: cfg().token, abi: mintAbi, functionName: "mint", args: [address as Address, value] });
      const out = { tx, minted: formatAmount(value), nativeFunded: funded.length > 0, explorer: `${publicApi()}/explorer#/tx/${tx}` };
      return c.json({ ok: true, ...out });
    } catch (e) {
      byAddress.delete(a); // a failed claim does not use up the address's allowance
      return c.json({ error: "FAUCET_FAILED", detail: String((e as Error).message).split("\n")[0] }, 500);
    }
  });

  app.get("/faucet", (c) => c.html(PAGE));
  return app;
}

const PAGE = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock e-HKD Faucet</title>
<style>
:root{--bg:#f6f7f6;--card:#fff;--text:#111714;--muted:#5f6b65;--line:#e3e8e5;--accent:#0b7a55;--accent-soft:#e3f3ec;--danger:#b42318;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--bg:#0d110f;--card:#141a17;--text:#e8eeea;--muted:#93a29a;--line:#24302a;--accent:#3ccf91;--accent-soft:#16291f;--danger:#f97066}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:620px;margin:0 auto;padding:32px 16px;display:grid;gap:16px}
h1{font-size:24px;margin:0}h2{font-size:16px;margin:0 0 8px}p{margin:0}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;display:grid;gap:12px}
.note{color:var(--muted);font-size:13px}.mono{font-family:var(--mono);font-size:13px;word-break:break-all}
input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--text);font:inherit;font-family:var(--mono)}
.row{display:flex;flex-wrap:wrap;gap:8px}
button{padding:11px 18px;border-radius:999px;border:1px solid var(--accent);background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button.ghost{background:transparent;color:var(--text);border-color:var(--line)}button:disabled{opacity:.5;cursor:default}
a{color:var(--accent)}.ok{color:var(--accent)}.err{color:var(--danger)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;margin:0}dt{color:var(--muted)}dd{margin:0}
</style></head><body><main>
<h1>Mock e-HKD faucet</h1>
<p class="note">Mock e-HKD (eHKD) is a demo token on the ChainBrain FISCO BCOS chain. It is not the HKMA e-HKD and not money.</p>
<section class="card"><h2>Get test eHKD</h2>
<input id="addr" placeholder="0x… your wallet address" autocomplete="off" aria-label="Wallet address">
<div class="row"><button id="claim">Send me HK$<span id="amt">100</span></button><button class="ghost" id="mm">Use MetaMask</button></div>
<p id="out" class="note" role="status"></p></section>
<section class="card"><h2>Use this chain in MetaMask</h2>
<p class="note">"Use MetaMask" adds the network for you. To add it by hand: Settings, Networks, Add a network manually.</p>
<dl><dt>Network name</dt><dd>FISCO BCOS (ChainBrain demo)</dd><dt>RPC URL</dt><dd class="mono" id="rpc"></dd><dt>Chain ID</dt><dd>20200</dd><dt>Currency symbol</dt><dd>FISCO</dd><dt>Block explorer</dt><dd class="mono" id="exp"></dd><dt>eHKD token</dt><dd class="mono" id="tok"></dd></dl>
<div class="row"><button class="ghost" id="watch">Add eHKD to MetaMask</button></div>
<p class="note">Gas is free here. The chain only refuses senders with a zero native balance, so the faucet credits that too.</p></section>
</main><script>
const $=(s)=>document.querySelector(s); let I;
const say=(t,cls)=>{const o=$("#out");o.className=cls||"note";o.innerHTML=t;};
const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
const addChain=()=>ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:"0x"+I.chainId.toString(16),chainName:I.chainName,nativeCurrency:{name:"FISCO",symbol:"FISCO",decimals:18},rpcUrls:[I.rpc],blockExplorerUrls:[I.explorer]}]});
fetch("/api/faucet/info").then((r)=>r.json()).then((i)=>{I=i;$("#amt").textContent=i.amount;$("#rpc").textContent=i.rpc;$("#exp").textContent=i.explorer;$("#tok").textContent=i.token;if(!i.enabled){$("#claim").disabled=true;say("The faucet only runs on the FISCO chain.","err");}});
$("#mm").onclick=async()=>{
  if(!window.ethereum)return say("No browser wallet found. Install MetaMask, or paste an address above.","err");
  try{const [a]=await ethereum.request({method:"eth_requestAccounts"});$("#addr").value=a;await addChain();say("MetaMask is on the ChainBrain FISCO chain. Now press Send.","ok");}catch(e){say(esc(e.message||e),"err");}
};
$("#watch").onclick=async()=>{
  if(!window.ethereum)return say("No browser wallet found.","err");
  try{await addChain();await ethereum.request({method:"wallet_watchAsset",params:{type:"ERC20",options:{address:I.token,symbol:I.symbol,decimals:I.decimals}}});say("eHKD added to MetaMask.","ok");}catch(e){say(esc(e.message||e),"err");}
};
$("#claim").onclick=async()=>{
  const address=$("#addr").value.trim();
  if(!/^0x[0-9a-fA-F]{40}$/.test(address))return say("Enter a 0x address (40 hex characters).","err");
  $("#claim").disabled=true;say("Minting…");
  try{const r=await fetch("/api/faucet",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({address})});const j=await r.json();
    if(!r.ok)throw new Error(j.error==="ALREADY_CLAIMED"?"This address already claimed today. Try again in "+Math.ceil(j.retryAfterSec/3600)+" h.":j.error==="TOO_MANY_REQUESTS"?"Too many requests from your network. Try again later.":(j.detail||j.error));
    say("Sent HK$"+esc(j.minted)+" eHKD"+(j.nativeFunded?" and enough native balance to send transactions":"")+'. <a href="'+esc(j.explorer)+'" target="_blank" rel="noopener">View transaction</a>',"ok");
  }catch(e){say(esc(e.message||e),"err");}finally{$("#claim").disabled=false;}
};
</script></body></html>`;
