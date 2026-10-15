// Which scene the presenter's stepper shows. Something playing wins over a manual pick: the built-in story's own scene, or
// (on a linked phone) the scene that was sent and is still running. A pick by arrow key or click only sticks while nothing plays.
export type StepInput = { ids: string[]; manual: number; storyScene?: string; linked: boolean; sent?: string; running: boolean };

export function activeStep(o: StepInput): { index: number; driven: boolean } {
  const clamp = (n: number) => Math.max(0, Math.min(n, o.ids.length - 1));
  if (!o.linked && o.storyScene) {
    const n = o.ids.indexOf(o.storyScene);
    if (n >= 0) return { index: n, driven: true };
    return { index: clamp(o.manual), driven: true }; // the escalation scene "A" has no step of its own
  }
  if (o.linked && o.running && o.sent) {
    const n = o.ids.indexOf(o.sent);
    if (n >= 0) return { index: n, driven: true };
  }
  return { index: clamp(o.manual), driven: false };
}
