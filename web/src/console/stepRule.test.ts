import { expect, it } from "vitest";
import { activeStep } from "./stepRule";

const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
it("the scene the story plays wins over a manual pick, and the pick sticks only while nothing plays", () => {
  expect(activeStep({ ids, manual: 3, storyScene: "1", linked: false, running: false })).toEqual({ index: 0, driven: true });
  expect(activeStep({ ids, manual: 3, storyScene: undefined, linked: false, running: false })).toEqual({ index: 3, driven: false });
  expect(activeStep({ ids, manual: 3, storyScene: "5", linked: false, running: false })).toEqual({ index: 4, driven: true }); // snaps to the new scene
});
it("the escalation scene keeps the manual step but still counts as the story driving", () => {
  expect(activeStep({ ids, manual: 5, storyScene: "A", linked: false, running: false })).toEqual({ index: 5, driven: true });
});
it("on a linked phone the scene that was sent leads while it runs", () => {
  expect(activeStep({ ids, manual: 1, linked: true, sent: "6", running: true, storyScene: "2" })).toEqual({ index: 5, driven: true });
  expect(activeStep({ ids, manual: 1, linked: true, sent: "6", running: false })).toEqual({ index: 1, driven: false });
});
