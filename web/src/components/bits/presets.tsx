// React Bits components themed for Ink & jade (design-system/chainbrain/MASTER.md). Sources: reference/frontend/react-bits
// (ts-tailwind, MIT + Commons Clause), vendored next to this file. Every preset follows the live theme and reduced motion.
import type { HTMLAttributes, ReactNode } from "react";
import DotGrid from "./DotGrid";
import Threads from "./Threads";
import BlurText from "./BlurText";
import ShinyText from "./ShinyText";
import SpotlightCard from "./SpotlightCard";
import ClickSpark from "./ClickSpark";
import Magnet from "./Magnet";
import DecryptedText from "./DecryptedText";
import { useInk, useReducedMotionPref } from "../../lib/palette";
import { cn } from "../../lib/cn";

/** Paper-dot canvas behind the whole app: ink dots, jade near the pointer. Static under reduced motion. */
export function DotCanvas() {
  const ink = useInk();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <DotGrid key={ink.dark ? "d" : "l"} dotSize={2.5} gap={22} baseColor={ink.dot} activeColor={ink.accent} proximity={120} strength={0.6} shockStrength={2} glow={0} swell={0.5} fade={0.35} className="h-full w-full" />
    </div>
  );
}

/** Slow jade threads for hero and empty states. */
export function ThreadsBackdrop({ className }: { className?: string }) {
  const ink = useInk();
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <Threads key={ink.dark ? "d" : "l"} color={ink.t3} accentColor={ink.accent} amplitude={0.45} distance={0.15} lineCount={12} speed={0.2} brightness={ink.dark ? 0.6 : 0.8} opacity={ink.dark ? 0.4 : 0.3} enableMouseInteraction className="h-full w-full" />
    </div>
  );
}

/** Heading that blurs in word by word. Screen readers and text queries get the plain sentence once. */
export function Headline({ text, className, as: Tag = "h1" }: { text: string; className?: string; as?: "h1" | "h2" | "p" }) {
  const reduce = useReducedMotionPref();
  return (
    <Tag className={className}>
      {reduce ? text : <><span className="sr-only">{text}</span><span aria-hidden><BlurText text={text} delay={70} animateBy="words" direction="bottom" className="inline-flex flex-wrap" /></span></>}
    </Tag>
  );
}

/** Agent "working" label: ink text with a slow jade shine. */
export function Working({ children, className }: { children: ReactNode; className?: string }) {
  const ink = useInk();
  const reduce = useReducedMotionPref();
  if (reduce) return <span className={className}>{children}</span>;
  return <ShinyText color={ink.t3} shineColor={ink.accentHi} speed={2.4} shineWidth={30} className={className}>{children}</ShinyText>;
}

/** Card with a soft jade spotlight that follows the pointer. Surface and hairline come from the tokens. */
export function Spotlight({ children, className, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const ink = useInk();
  return (
    <SpotlightCard {...rest} theme={ink.dark ? "dark" : "light"} spotlightColor={ink.accent} intensity={ink.dark ? 0.12 : 0.3} spotlightSize={260} borderGlow={0.5} flare={false}
      className={cn("rounded-[14px]", className)} style={{ ["--spotlight-card-surface" as string]: "var(--e1)", ["--spotlight-card-border" as string]: "var(--hair)", ["--spotlight-card-shadow" as string]: "none" }}>
      {children}
    </SpotlightCard>
  );
}

/** Jade click sparks across the app (React Bits handles reduced motion itself). */
export function Sparks({ children }: { children: ReactNode }) {
  const ink = useInk();
  return <ClickSpark sparkColor={ink.accent} sparkCount={7} sparkRadius={18} sparkSize={9} duration={380}>{children}</ClickSpark>;
}

/** Gentle magnetic pull for the one primary call to action on a screen. */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotionPref();
  return <Magnet disabled={reduce} padding={40} magnetStrength={4} maxOffset={8} wrapperClassName={className}>{children}</Magnet>;
}

/** Hash or address that decrypts into place once. */
export function Decrypt({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotionPref();
  if (reduce) return <span className={className}>{text}</span>;
  return <DecryptedText text={text} animateOn="view" sequential revealDirection="start" speed={28} characters="0123456789abcdef" className={className} />;
}
