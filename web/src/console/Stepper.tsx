// Presenter mode's scene stepper: eight numbered steps pinned to the bottom, the selected one with its one-line
// expected outcome and the same Play logic as the Judges tab (typed on the linked phone, or played by the built-in network).
import { useState } from "react";
import { Play } from "lucide-react";
import { useNetwork } from "./useNetwork";
import { usePlay } from "./play";
import { copyFor } from "./sceneCopy";
import { Button, Pill } from "../seller/ui";
import { cn } from "../lib/cn";

export function Stepper() {
  const { scenes, actions, linked, refresh } = useNetwork();
  const { state, play, followUp, canPlay } = usePlay(actions, linked, refresh);
  const [i, setI] = useState(0);
  if (!scenes.length) return null;
  const s = scenes[Math.min(i, scenes.length - 1)];
  const c = copyFor(s.id);
  const mine = state?.id === s.id ? state : undefined;
  return (
    <section aria-label="Scenes" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1100px] rounded-[20px] bg-card p-3 shadow-[0_8px_24px_rgba(17,19,24,0.08)] sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap">
        <ol className="flex shrink-0 gap-1.5">
          {scenes.map((x, n) => (
            <li key={x.id}>
              <button type="button" onClick={() => setI(n)} aria-label={`Scene ${x.id}: ${x.title}`} aria-current={n === i ? "step" : undefined}
                className={cn("num grid size-11 place-items-center rounded-full text-[15px] font-semibold transition-colors", n === i ? "bg-accent text-on-accent" : "bg-fill text-ink2 hover:bg-line")}>{x.id}</button>
            </li>
          ))}
        </ol>
        <div className="min-w-0 flex-1 basis-60">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-semibold">{s.title}</span>{c && <Pill tone={c.tone}>{c.outcome}</Pill>}</div>
          <p className="mt-0.5 text-[14px] leading-5 text-ink2">{c?.seeing ?? s.note}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mine?.ok && s.followUp && mine.step === "scene" && <Button variant="outline" disabled={mine.busy} onClick={() => void followUp(s)}>Then send</Button>}
          <Button disabled={!canPlay || !!state?.busy} onClick={() => void play(s)}><Play className="size-4" strokeWidth={1.75} />{mine?.busy ? "Playing…" : "Play"}</Button>
        </div>
      </div>
      {mine?.text && <p role="status" className={cn("mt-2 pl-1 text-[14px]", mine.ok ? "text-ink2" : "text-negative")}>{mine.text}</p>}
    </section>
  );
}
