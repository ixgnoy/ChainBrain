// Faucet: mint Mock e-HKD to any address on the FISCO chain, through the wallet server's POST /api/faucet
// (the server credits native balance too, so the address can send). Always the real server, even when the console
// shows the built-in network: the built-in network has no chain to mint on.
import { useEffect, useState } from "react";
import { Droplet, Wallet } from "lucide-react";
import { DEFAULT_API, useSource } from "../source/source";
import { Button, Card, PageTitle } from "../seller/ui";
import { cn } from "../lib/cn";

type Info = { chainId: number; chainName: string; rpc: string; explorer: string; token: string; symbol: string; decimals: number; amount: string; enabled: boolean };
type Eth = { request(a: { method: string; params?: unknown }): Promise<unknown> };
const eth = () => (window as unknown as { ethereum?: Eth }).ethereum;
const ADDR = /^0x[0-9a-fA-F]{40}$/;

const ERRORS: Record<string, string> = {
  BAD_ADDRESS: "Enter a 0x address (40 hex characters).",
  TOO_MANY_REQUESTS: "Too many requests from your network. Try again later.",
  FAUCET_ONLY_ON_FISCO: "The faucet only runs on the FISCO chain.",
};

export function Faucet() {
  const src = useSource();
  const api = src.kind === "live" ? src.url : DEFAULT_API;
  const [info, setInfo] = useState<Info>();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string; link?: string }>();

  useEffect(() => {
    fetch(`${api}/api/faucet/info`).then((r) => r.json()).then(setInfo)
      .catch(() => setOut({ ok: false, text: `Cannot reach the faucet at ${api}.` }));
  }, [api]);

  const addChain = (i: Info) => eth()!.request({ method: "wallet_addEthereumChain", params: [{ chainId: `0x${i.chainId.toString(16)}`, chainName: i.chainName, nativeCurrency: { name: "FISCO", symbol: "FISCO", decimals: 18 }, rpcUrls: [i.rpc], blockExplorerUrls: [i.explorer] }] });

  const connectWallet = async () => {
    if (!eth()) return setOut({ ok: false, text: "No browser wallet found. Install MetaMask, or paste an address." });
    try {
      const [a] = (await eth()!.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(a);
      if (info) { await addChain(info); await eth()!.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address: info.token, symbol: info.symbol, decimals: info.decimals } } }); }
      setOut({ ok: true, text: "Wallet is on the ChainBrain FISCO chain with eHKD added. Now press Send." });
    } catch (e) { setOut({ ok: false, text: String((e as Error).message ?? e) }); }
  };

  const claim = async () => {
    const a = address.trim();
    if (!ADDR.test(a)) return setOut({ ok: false, text: ERRORS.BAD_ADDRESS });
    setBusy(true); setOut({ ok: true, text: "Minting…" });
    try {
      const r = await fetch(`${api}/api/faucet`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: a }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error === "ALREADY_CLAIMED" ? `This address already claimed today. Try again in ${Math.ceil(j.retryAfterSec / 3600)} h.` : ERRORS[j.error] ?? j.detail ?? j.error);
      setOut({ ok: true, text: `Sent HK$${j.minted} eHKD${j.nativeFunded ? " and enough native balance to send transactions" : ""}.`, link: j.explorer });
    } catch (e) { setOut({ ok: false, text: String((e as Error).message ?? e) }); }
    finally { setBusy(false); }
  };

  return (
    <div className="fade-up">
      <PageTitle title="Faucet" sub="Mock e-HKD (eHKD) for any wallet on the ChainBrain FISCO BCOS chain. A demo token: not the HKMA e-HKD and not money." />
      <Card className="grid gap-4 p-5 sm:p-6">
        <label className="grid gap-2 text-[14px] font-bold text-ink2">Wallet address
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false}
            className="num h-12 w-full rounded-[14px] bg-tile px-4 text-[15px] font-medium text-ink outline-none shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] focus:shadow-[inset_0_0_0_2px_var(--color-ink)]" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="faucet-send" onClick={claim} disabled={busy || info?.enabled === false}><Droplet className="size-4" strokeWidth={1.75} aria-hidden />Send me HK${info?.amount ?? "100"}</Button>
          <Button variant="outline" onClick={connectWallet}><Wallet className="size-4" strokeWidth={1.75} aria-hidden />Use MetaMask</Button>
        </div>
        {out && <p role="status" className={cn("text-[14px] font-semibold", out.ok ? "text-ink2" : "text-vermillion-ink")}>{out.text}{out.link && <> <a href={out.link} target="_blank" rel="noopener" className="underline">View transaction</a></>}</p>}
      </Card>
      {info && (
        <Card className="mt-4 p-5 sm:p-6">
          <h2 className="mb-3 text-[16px] font-bold">Add this chain to your wallet</h2>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[14px]">
            <dt className="text-muted">Network</dt><dd>{info.chainName}</dd>
            <dt className="text-muted">RPC URL</dt><dd className="num break-all">{info.rpc}</dd>
            <dt className="text-muted">Chain ID</dt><dd className="num">{info.chainId}</dd>
            <dt className="text-muted">Currency symbol</dt><dd>FISCO</dd>
            <dt className="text-muted">eHKD token</dt><dd className="num break-all">{info.token}</dd>
          </dl>
          <p className="mt-3 text-[13px] text-muted">Gas is free here. The chain only refuses senders with a zero native balance, so the faucet credits that too.</p>
        </Card>
      )}
    </div>
  );
}
