// "Your wallet": the console's own owner identity on the real chain, so a judge can act without the phone. A key made in
// this browser (wrapped by a passkey where PRF works, else kept here with a one-time backup), one guarded Login signature
// to sign up (the server funds the wallet with real transactions), then cards created and funded by this key, a chat with
// each card's agent, and revoke. Every hash opens in the explorer.
import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Wallet, X } from "lucide-react";
import type { Address, Hex } from "viem";
import { useNetwork } from "./useNetwork";
import { clientFor } from "./chain";
import { explorerHref } from "./route";
import { formatHkd, parseHkd, curSign } from "../shared";
import { createBrowserKey, createPasskeyKey, loadStored, markBackedUp, passkeysAvailable, unlock, type StoredKey } from "../owner/key";
import { ownerWallet, type OwnerWallet, type Pending, type SignUp } from "../owner/wallet";
import { cn } from "../lib/cn";

let unlocked: Hex | null = null; // this tab only, never stored in the clear for a passkey key
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const btn = "pressable h-11 rounded-full px-5 text-[14px] font-bold disabled:opacity-40";

function TxLink({ hash, label }: { hash: string; label: string }) {
  const { explorer } = useNetwork();
  return (
    <a href={explorer?.(hash) ?? explorerHref.tx(hash)} target={explorer ? "_blank" : undefined} rel="noreferrer" className="flex items-center justify-between gap-3 rounded-[14px] bg-tile px-3 py-2 text-[13px] hover:bg-line">
      <span className="font-medium">{label}</span><span className="num text-muted">{short(hash)}</span>
    </a>
  );
}

export function Owner() {
  const net = useNetwork();
  const [open, setOpen] = useState(false);
  const [stored, setStored] = useState<StoredKey | null>(() => loadStored());
  const [pk, setPk] = useState<Hex | null>(() => (stored?.method === "browser" ? stored.pk : unlocked));
  const [canPasskey, setCanPasskey] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [signedUp, setSignedUp] = useState<SignUp | null>(null);
  const [session, setSession] = useState<"none" | "signing" | "ready">("none");
  const [balance, setBalance] = useState<bigint>();
  const [made, setMade] = useState<{ card: string; createTx: string; fundTx: string; sentences: string[] } | null>(null);
  const [importing, setImporting] = useState("");
  useEffect(() => { void passkeysAvailable().then(setCanPasskey); }, []);

  const live = net.live;
  // keyed on plain values: the network object is rebuilt on every event, the wallet must not be
  const wallet: OwnerWallet | null = useMemo(() => (pk && live ? ownerWallet(pk, { api: live.api, rpc: live.rpc, cfg: net.cfg, client: clientFor(live.rpc), chainId: live.chainId }) : null),
    [pk, live?.api, live?.rpc, live?.chainId, net.cfg.factory, net.cfg.token]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMemo(() => (wallet ? net.pockets.filter((p) => p.owner.toLowerCase() === wallet.address.toLowerCase()) : []), [net.pockets, wallet]);

  // signed in as soon as there is a key: one Login signature (or a saved token)
  useEffect(() => {
    if (!wallet) return;
    let alive = true;
    setSession("signing"); setError("");
    wallet.session().then((r) => { if (!alive) return; setSignedUp(r); setSession("ready"); net.refresh(); }, (e) => { if (alive) { setSession("none"); setError((e as Error).message); } });
    return () => { alive = false; };
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!wallet || session !== "ready") return;
    let have = false; // one failed read between good ones is noise; no balance at all is worth saying
    const read = () => void wallet.balance().then((b) => { have = true; setBalance(b); }, (e) => { if (!have) setError(`Could not read your balance: ${(e as Error).message.split("\n")[0]}`); });
    read();
    const t = setInterval(read, 8000);
    return () => clearInterval(t);
  }, [wallet, session]);

  if (!live) return null; // the demo network has its own owner

  const run = async (what: string, f: () => Promise<void>) => {
    setBusy(what); setError("");
    try { await f(); } catch (e) { setError((e as Error).message.split("\n")[0]); } finally { setBusy(""); }
  };
  const makeKey = (passkey: boolean) => run("key", async () => {
    if (passkey) {
      const k = await createPasskeyKey();
      if (k) { setStored(k); unlocked = await unlock(k).catch(() => null); setPk(unlocked); return; }
      setError("This passkey can't wrap a key (no PRF), so the key is kept in this browser instead.");
    }
    const k = createBrowserKey();
    setStored(k); setPk(k.pk);
  });
  const sellers = net.cfg.sellers.filter((s) => s.id !== "shadyfeed").map((s) => s.payTo as Address);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Your wallet" className="pressable inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-card px-3 text-[14px] font-bold text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile xl:px-4">
        <Wallet className="size-5 xl:size-4" strokeWidth={1.75} /><span className="num hidden xl:inline">{wallet ? short(wallet.address) : "Your wallet"}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(17,18,21,0.40)]" />
        <Dialog.Content className="sheet-in fixed z-50 bg-card p-5 outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90dvh] max-sm:overflow-y-auto max-sm:rounded-t-[24px] sm:left-1/2 sm:top-[8vh] sm:max-h-[84vh] sm:w-[min(520px,calc(100vw-24px))] sm:-translate-x-1/2 sm:overflow-y-auto sm:rounded-[24px] sm:p-6 shadow-level3">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[22px] font-bold leading-7 tracking-[-0.02em]">Your wallet</Dialog.Title>
            <Dialog.Close aria-label="Close" className="pressable grid size-11 place-items-center rounded-full bg-tile text-ink hover:bg-line"><X className="size-5" strokeWidth={1.75} /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-[14px] text-muted">An owner key made in this browser, on the real FISCO chain. Test money only.</Dialog.Description>

          {!stored && (
            <div className="mt-5 grid gap-2">
              {canPasskey && <button type="button" disabled={!!busy} onClick={() => void makeKey(true)} className={cn(btn, "bg-ink text-on-accent hover:bg-accent-press")}>Make a key, locked by a passkey</button>}
              <button type="button" disabled={!!busy} onClick={() => void makeKey(false)} className={cn(btn, canPasskey ? "bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)] hover:bg-tile" : "bg-ink text-on-accent hover:bg-accent-press")}>{busy === "key" ? "Making your key…" : "Make a key in this browser"}</button>
              <details className="mt-1 text-[14px]">
                <summary className="cursor-pointer text-muted">Import a key</summary>
                <div className="mt-2 flex gap-2">
                  <input value={importing} onChange={(e) => setImporting(e.target.value)} placeholder="0x… (64 hex characters)" spellCheck={false} className="num h-11 min-w-0 flex-1 rounded-[14px] bg-tile px-3 text-[14px] outline-none focus:ring-2 focus:ring-ink" />
                  <button type="button" disabled={!/^0x[0-9a-fA-F]{64}$/.test(importing.trim())} onClick={() => { const k = createBrowserKey(importing.trim() as Hex); setStored({ ...k, backedUp: true }); markBackedUp(); setPk(k.pk); setImporting(""); }} className={cn(btn, "bg-ink text-on-accent")}>Import</button>
                </div>
              </details>
            </div>
          )}

          {stored?.method === "passkey" && !pk && (
            <button type="button" disabled={!!busy} onClick={() => void run("unlock", async () => { unlocked = await unlock(stored); setPk(unlocked); })} className={cn(btn, "mt-5 w-full bg-ink text-on-accent")}>{busy === "unlock" ? "Unlocking…" : "Unlock with your passkey"}</button>
          )}

          {wallet && (
            <div className="mt-5 grid gap-4">
              <div className="tile px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-medium">Main wallet <span className="num text-muted">{short(wallet.address)}</span></span>
                  <span className="num text-[17px] font-bold">{balance != null ? `${curSign()}${formatHkd(balance)}` : "…"}</span>
                </div>
                <div className="mt-1 text-[13px] text-muted">{session === "signing" ? "Signing in (one signature, moves no money)…" : session === "ready" ? `Signed in${stored?.method === "passkey" ? " · key locked by your passkey" : ""}` : "Not signed in"}</div>
              </div>
              {signedUp?.created && signedUp.funding.mintTx && <TxLink hash={signedUp.funding.mintTx} label={`${curSign()}${signedUp.funding.minted} arrived in your main wallet`} />}
              {signedUp?.funding.error && <p className="text-[14px] text-vermillion-ink">Signed in, but funding failed: {signedUp.funding.error}</p>}

              {stored?.method === "browser" && !stored.backedUp && (
                <div className="rounded-[16px] bg-vermillion-soft p-4 text-[14px]">
                  <p className="font-medium">Back up your key</p>
                  <p className="mt-1 text-ink2">It lives only in this browser. Clear the site's data without a copy and your cards are gone.</p>
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(stored.pk); markBackedUp(); setStored({ ...stored, backedUp: true }); }} className={cn(btn, "mt-3 bg-ink text-on-accent")}>Copy my key</button>
                </div>
              )}

              {session === "ready" && (
                <div className="grid gap-2">
                  <h3 className="eyebrow text-muted">New card</h3>
                  <p className="text-[14px] text-ink2">Pays up to {curSign()}5 each, asks you above {curSign()}3, holds {curSign()}20 for 7 days, at {net.cfg.sellers.filter((s) => s.id !== "shadyfeed").map((s) => s.name).join(", ")}. Its agent key is made for this card alone.</p>
                  <button type="button" disabled={!!busy || (balance ?? 0n) < parseHkd("20")} onClick={() => void run("card", async () => {
                    const r = await wallet.createCard({ cap: parseHkd("5"), askAbove: parseHkd("3"), budget: parseHkd("20"), days: 7, sellers });
                    setMade(r); net.refresh(); setBalance(await wallet.balance());
                  })} className={cn(btn, "bg-vermillion text-on-accent hover:bg-vermillion-press")}>{busy === "card" ? "Creating and funding…" : `Create a card with ${curSign()}20`}</button>
                  {made && (
                    <div className="grid gap-1.5">
                      <TxLink hash={made.createTx} label="Card created" />
                      <TxLink hash={made.fundTx} label={`${curSign()}20 moved to the card`} />
                      <p className="text-[12px] text-muted">Your key signed: {made.sentences.join(" ")}</p>
                    </div>
                  )}
                </div>
              )}

              {mine.length > 0 && (
                <div className="grid gap-2">
                  <h3 className="eyebrow text-muted">Your cards</h3>
                  {mine.map((p) => <CardRow key={p.address} wallet={wallet} p={p} />)}
                </div>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-4 text-[14px] text-vermillion-ink">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CardRow({ wallet, p }: { wallet: OwnerWallet; p: { address: Address; balance: bigint; revoked: boolean; frozen?: boolean } }) {
  const net = useNetwork();
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<{ hash: string; label: string } | null>(null);
  const [waiting, setWaiting] = useState<Pending[]>([]);
  useEffect(() => {
    if (p.revoked) return;
    let alive = true;
    const read = () => void wallet.pending(p.address).then((x) => alive && setWaiting(x), () => {});
    read();
    const t = setInterval(read, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [wallet, p.address, p.revoked]);
  const answer = async (a: Pending, ok: boolean) => {
    try {
      if (ok && a.kind === "payment") setReply(`Signed: ${await wallet.cosign(a)}`);
      else await wallet.answer(a.id, ok);
      setWaiting((w) => w.filter((x) => x.id !== a.id));
    } catch (e) { setReply((e as Error).message.split("\n")[0]); }
  };
  const say = async () => {
    if (!text.trim() || !net.actions.chat) return;
    setBusy(true); setReply("");
    const r = await net.actions.chat(p.address, text.trim());
    setReply(r.text); setBusy(false); setText(""); net.refresh();
  };
  return (
    <div className="tile grid gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-[14px]">
        <a href={explorerHref.address(p.address)} className="font-medium hover:underline">{net.nameOf(p.address)} <span className="num text-muted">{short(p.address)}</span></a>
        <span className="num font-bold">{p.revoked ? "Revoked" : p.frozen ? "Frozen" : `${curSign()}${formatHkd(p.balance)}`}</span>
      </div>
      {!p.revoked && (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void say(); }} placeholder="Ask its agent, e.g. buy the durian report" className="h-10 min-w-0 flex-1 rounded-[12px] bg-card px-3 text-[14px] outline-none focus:ring-2 focus:ring-ink" />
          <button type="button" disabled={busy || !text.trim()} onClick={() => void say()} className={cn(btn, "h-10 bg-ink text-on-accent")}>{busy ? "…" : "Send"}</button>
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const r = await wallet.revoke(p.address); setTx({ hash: r.hash, label: "Card revoked" }); net.refresh(); } catch (e) { setReply((e as Error).message.split("\n")[0]); } setBusy(false); }} className={cn(btn, "h-10 bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--color-tile-stroke)]")}>Revoke</button>
        </div>
      )}
      {waiting.map((a) => (
        <div key={a.id} className="rounded-[12px] bg-blue-soft p-3 text-[14px]">
          <p className="font-medium">{a.kind === "payment" ? `Co-sign ${curSign()}${a.data?.amount ?? "?"} to ${net.cfg.sellers.find((s) => s.id === a.data?.sellerId)?.name ?? "a seller"}?` : a.kind === "intent" ? "Confirm this task?" : "Your agent asks"}</p>
          {a.text && <p className="mt-1 whitespace-pre-line text-ink2">{a.text}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => void answer(a, true)} className={cn(btn, "h-9 bg-ink text-on-accent")}>{a.kind === "payment" ? "Co-sign" : "Confirm"}</button>
            <button type="button" onClick={() => void answer(a, false)} className={cn(btn, "h-9 bg-card text-ink")}>Decline</button>
          </div>
        </div>
      ))}
      {reply && <p className="text-[14px] text-ink2">{reply}</p>}
      {tx && <TxLink hash={tx.hash} label={tx.label} />}
    </div>
  );
}
