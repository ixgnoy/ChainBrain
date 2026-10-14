import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Banknote, KeyRound, LayoutDashboard, Monitor, Moon, ShieldCheck, ScrollText, Sun, Unplug, Wallet, FlaskConical } from "lucide-react";
import { ConsoleProvider, useConsole, viewsFor, type Role, type View } from "./console";
import { EventsProvider, useEvents } from "./useEvents";
import { DevProvider, useDev } from "./useDev";
import { ApprovalsProvider, useApprovals } from "./useApprovals";
import { ChatProvider } from "./useChat";
import { hasInjectedWallet } from "./wallet";
import { useTheme, nextChoice, type ThemeChoice } from "./lib/theme";
import { Button, Logo, Money, Segmented, Tip } from "./components/ui";
import Chat from "./panes/Chat";
import Trace from "./panes/Trace";
import Pocket from "./panes/Pocket";
import Sellers from "./panes/Sellers";
import Bank from "./panes/Bank";
import ApprovalSheet from "./components/ApprovalSheet";
import { shortAddr } from "./shared";
import { cn } from "./lib/cn";
import type { Approval } from "./lib/events";

const ROLES: { value: Role; label: string }[] = [{ value: "owner", label: "Owner" }, { value: "bank", label: "Bank risk" }, { value: "regulator", label: "Regulator" }];

function ThemeToggle({ choice, set }: { choice: ThemeChoice; set: (c: ThemeChoice) => void }) {
  const Icon = choice === "system" ? Monitor : choice === "light" ? Sun : Moon;
  return (
    <Tip label={`Theme: ${choice}. Click to change.`}>
      <button type="button" onClick={() => set(nextChoice(choice))} aria-label={`Theme: ${choice}. Click to change.`} className="grid size-9 place-items-center rounded-full border border-hair2 bg-e2/70 text-t2 hover:text-fg"><Icon className="size-4" /></button>
    </Tip>
  );
}

function SignerButton() {
  const { owner, signerKind, disconnect, connectInjected, connectDev, connecting, readOnly } = useConsole();
  const dev = useDev();
  if (readOnly) return null;
  if (owner) return (
    <button type="button" onClick={disconnect} title="Disconnect" className="group hidden h-9 items-center gap-2 rounded-full border border-hair2 bg-e2/70 pl-3 pr-2.5 text-xs font-medium md:inline-flex">
      <span className="size-1.5 rounded-full bg-ok" /><span className="mono">{shortAddr(owner)}</span><span className="text-t3">{signerKind === "dev" ? "Dev signer" : "Wallet"}</span><Unplug className="size-3 text-t3 group-hover:text-fg" />
    </button>
  );
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {dev.state && <Button size="sm" variant="secondary" disabled={connecting} onClick={() => void connectDev()}><KeyRound className="size-3.5" />Dev signer</Button>}
      <Button size="sm" variant={dev.state ? "ghost" : "primary"} disabled={connecting} onClick={() => void connectInjected()}>Connect wallet</Button>
    </div>
  );
}

function TopBar({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const { role, setRole, readOnly, view, setView } = useConsole();
  const dev = useDev();
  const { connected } = useEvents();
  return (
    <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 px-3 md:px-4" style={{ borderTopWidth: 0, borderInline: 0, borderRadius: 0 }}>
      <div className="hidden items-center gap-2 min-[480px]:flex lg:hidden"><Logo size={26} /></div>
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <span className="grid size-7 place-items-center rounded-lg bg-e3 text-[11px] font-bold text-t2" aria-hidden>{readOnly ? "·" : "C"}</span>
        <span className="truncate text-sm font-semibold">{readOnly ? "Regulator workspace" : "ChainBrain Wallet"}</span>
      </div>
      <span className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-info/30 bg-info-bg px-2.5 text-xs font-medium text-info-ink"><span className="size-1.5 rounded-full bg-info" /><span className="sm:hidden">Testnet</span><span className="hidden sm:inline">Base Sepolia · testnet</span></span>
      {dev.state && <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-stepup/40 bg-stepup-bg px-2.5 text-[11px] font-bold tracking-wider text-stepup-ink" title="Local anvil fork with a scripted model: no real chain, no real funds">LOCAL FORK</span>}
      <span className={cn("hidden items-center gap-1.5 text-xs xl:flex", connected ? "text-t2" : "text-refused-ink")}><span className={cn("size-1.5 rounded-full", connected ? "bg-ok" : "bg-refused")} />{connected ? "Live" : "Offline"}</span>
      <div className="ml-auto flex items-center gap-2">
        <div className="lg:hidden"><Segmented<View> label="View" value={view} onChange={setView} options={viewsFor(role).map((v) => ({ value: v, label: v === "operate" ? "Operate" : "Bank" }))} /></div>
        <SignerButton />
        <Segmented<Role> label="Role" value={role} onChange={setRole} options={ROLES} className="hidden sm:inline-flex" />
        <ThemeToggle choice={theme.choice} set={theme.set} />
      </div>
    </header>
  );
}

function Sidebar() {
  const { view, setView, role } = useConsole();
  const item = (v: View, label: string, Icon: typeof Banknote) => (
    <button type="button" onClick={() => setView(v)} aria-current={view === v ? "page" : undefined}
      className={cn("flex h-10 w-full items-center gap-3 rounded-full px-3.5 text-sm font-medium transition-colors", view === v ? "bg-e3 text-fg" : "text-t2 hover:bg-e2 hover:text-fg")}>
      <Icon className="size-4" aria-hidden />{label}
    </button>
  );
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-hair px-3 py-4 lg:flex" aria-label="Navigation">
      <div className="flex items-center gap-2.5 px-2"><Logo size={32} /><div className="leading-tight"><div className="display text-[17px]">ChainBrain</div><div className="text-[11px] text-t3">链<span className="font-semibold text-accent-ink">AI</span>脑 · Console</div></div></div>
      <nav className="mt-6 space-y-5">
        {viewsFor(role).includes("operate") && <div><div className="caps mb-1.5 px-3.5">Operate</div>{item("operate", "Operate", LayoutDashboard)}</div>}
        <div><div className="caps mb-1.5 px-3.5">Bank / Compliance</div>{item("bank", "Bank / Compliance", Banknote)}</div>
      </nav>
      <div className="mt-auto space-y-2 px-2 text-[11px] text-t3">
        <div className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Role: <span className="font-medium text-t2">{ROLES.find((r) => r.value === role)?.label}</span></div>
        <div className="flex items-center gap-1.5"><ScrollText className="size-3.5" />Testnet only. No real funds.</div>
      </div>
    </aside>
  );
}

function Welcome() {
  const { connectInjected, connectDev, connecting, connectError } = useConsole();
  const dev = useDev();
  return (
    <div className="mx-auto grid max-w-[1100px] items-center gap-10 px-5 py-10 min-[900px]:grid-cols-[1.1fr_1fr] min-[900px]:py-20">
      <div>
        <p className="caps mb-3 text-accent-ink">Agent wallet</p>
        <h1 className="display text-[clamp(2.2rem,4.4vw,3.4rem)] leading-[1.04]">Give your AI a pocket, not your wallet.</h1>
        <p className="mt-4 max-w-[46ch] text-[16px] leading-7 text-t2">Set a budget, pick the sellers, and let the agent buy on its own. The pocket contract enforces every rule on-chain.</p>
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <Button variant="primary" className="h-12 px-6" disabled={connecting} onClick={() => void connectInjected()}><Wallet className="size-4" />Connect wallet</Button>
          {dev.state && <Button variant="secondary" className="h-12 px-5" disabled={connecting} onClick={() => void connectDev()}><FlaskConical className="size-4" />Use dev signer</Button>}
        </div>
        {connectError && <p role="alert" className="mt-3 max-w-[52ch] text-sm text-refused-ink">{connectError}</p>}
        {!hasInjectedWallet() && !dev.state && <p className="mt-3 text-xs text-t3">No browser wallet found. Install MetaMask to continue, or open the Bank / Compliance view to look around without a wallet.</p>}
      </div>
      <aside className="card glass-edge mx-auto w-full max-w-[420px] p-5" aria-label="Example pocket: the Research data preset" style={{ background: "linear-gradient(135deg, #2A2F8F 0%, #6E56FF 100%)", color: "#fff", borderColor: "transparent" }}>
        <div className="flex items-center justify-between text-sm"><span className="text-white/85">Research data pocket</span><span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-2.5 text-xs font-medium"><span className="size-1.5 rounded-full bg-[#7dffb5]" />Active</span></div>
        <div className="display mt-3 flex items-baseline gap-1.5 text-[44px] leading-[48px]"><span className="text-2xl text-white/80">$</span><Money value={5} /><span className="text-xs font-medium text-white/75">USDC</span></div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px]">
          <dt className="text-white/70">Sellers</dt><dd>DataLite, DataPro</dd><dt className="text-white/70">Per payment</dt><dd>up to US$2.00</dd><dt className="text-white/70">Ask me</dt><dd>above US$1.00</dd><dt className="text-white/70">Ends</dt><dd>23:59 tonight</dd>
        </dl>
        <p className="mt-4 text-xs leading-5 text-white/80">The agent spends only from here. Anything outside these rules is refused by the contract, even if the agent is tricked.</p>
      </aside>
    </div>
  );
}

function Operate({ onReview }: { onReview(a: Approval): void }) {
  const { owner } = useConsole();
  if (!owner) return <Welcome />;
  const cell = "min-[1200px]:h-auto min-[1200px]:min-h-0 [&>section]:h-full";
  return (
    <div className="grid grid-cols-1 gap-3 p-3 min-[1200px]:h-[max(calc(100dvh-56px),1000px)] min-[1200px]:grid-cols-2 min-[1200px]:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className={cn("h-[600px]", cell)}><Chat onReview={onReview} /></div>
      <div className={cn("h-[560px]", cell)}><Trace /></div>
      <div className={cn("h-[760px]", cell)}><Pocket /></div>
      <div className={cn("h-[640px]", cell)}><Sellers /></div>
    </div>
  );
}

function Shell() {
  const theme = useTheme();
  const { view, readOnly, cfg, cfgError, retryConfig, owner, connectDev } = useConsole();
  const dev = useDev();
  const { pending } = useApprovals();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Approval>();
  const next = pending.find((a) => a.kind === "payment" && !dismissed.has(a.id));
  const sheet = manual && pending.some((a) => a.id === manual.id) ? manual : next;
  const close = () => { if (sheet) setDismissed((s) => new Set(s).add(sheet.id)); setManual(undefined); };

  // On the dev stack with no browser wallet, the dev signer is the default owner.
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (dev.state && !owner && !auto && !hasInjectedWallet()) { setAuto(true); void connectDev(); }
  }, [dev.state, owner, auto, connectDev]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar theme={theme} />
        {readOnly && <div role="status" className="stripes flex items-center justify-center gap-2 border-b border-info/30 py-1.5 text-xs font-semibold text-info-ink"><ShieldCheck className="size-3.5" />Read-only · Regulator view</div>}
        <main className="min-w-0 flex-1 overflow-x-clip">
          {cfgError && !cfg ? (
            <div className="grid min-h-[60dvh] place-items-center p-6 text-center"><div className="max-w-md"><p role="alert" className="text-refused-ink">{cfgError}</p><Button className="mt-4" variant="secondary" onClick={retryConfig}>Try again</Button></div></div>
          ) : !cfg ? (
            <div className="grid min-h-[60dvh] place-items-center text-sm text-t3">Loading…</div>
          ) : view === "operate" ? <Operate onReview={(a) => { setDismissed((s) => { const n = new Set(s); n.delete(a.id); return n; }); setManual(a); }} /> : <Bank />}
        </main>
      </div>
      <ApprovalSheet approval={readOnly ? undefined : sheet} onClose={close} />
      <Toaster theme={theme.resolved} position="bottom-left" toastOptions={{ style: { borderRadius: 16 } }} />
    </div>
  );
}

export default function App() {
  return (
    <Tooltip.Provider>
      <DevProvider>
        <EventsProvider>
          <ConsoleProvider>
            <ApprovalsProvider>
              <ChatProvider><Shell /></ChatProvider>
            </ApprovalsProvider>
          </ConsoleProvider>
        </EventsProvider>
      </DevProvider>
    </Tooltip.Provider>
  );
}
