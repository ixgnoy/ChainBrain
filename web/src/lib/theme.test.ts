import { it, expect } from "vitest";
import { nextChoice, parseChoice, resolveTheme } from "./theme";

it("cycles system, light, dark", () => {
  expect(nextChoice("system")).toBe("light");
  expect(nextChoice("light")).toBe("dark");
  expect(nextChoice("dark")).toBe("system");
});
it("system follows the OS, a manual choice wins", () => {
  expect(resolveTheme("system", "light")).toBe("light");
  expect(resolveTheme("system", "dark")).toBe("dark");
  expect(resolveTheme("dark", "light")).toBe("dark");
});
it("an unknown or missing stored value means system", () => {
  expect(parseChoice(null)).toBe("system");
  expect(parseChoice("purple")).toBe("system");
  expect(parseChoice("light")).toBe("light");
});
