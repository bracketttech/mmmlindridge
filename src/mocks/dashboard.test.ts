import { describe, expect, it } from "vitest";
import { buildDashboard, searchAll } from "./dashboard";

describe("dashboard data follows the property switcher", () => {
  it("a single property shows different numbers from all properties", () => {
    const all = buildDashboard("all");
    const one = buildDashboard("p2");
    expect(one.rent.due).toBeLessThan(all.rent.due);
    expect(one.totals.units).toBe(16);
    expect(one.attention.every((a) => a.propertyId === "p2")).toBe(true);
  });
  it("all properties sums every rent roll", () => {
    expect(buildDashboard("all").rent.due).toBe(312000 + 176000 + 154000 + 198500);
  });
  it("search finds tenants by name", () => {
    expect(searchAll("lerato").some((r) => r.title === "Lerato Mokoena")).toBe(true);
  });
});
