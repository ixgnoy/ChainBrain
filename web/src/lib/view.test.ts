import { it, expect } from "vitest";
import { effectiveView, viewsFor } from "./view";

it("the regulator role only gets Bank / Compliance", () => {
  expect(viewsFor("regulator")).toEqual(["bank"]);
  expect(effectiveView("regulator", "operate")).toBe("bank");
  expect(viewsFor("owner")).toEqual(["operate", "bank"]);
  expect(effectiveView("bank", "operate")).toBe("operate");
});
