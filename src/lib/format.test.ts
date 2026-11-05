import { describe, expect, it } from "vitest";
import { formatDate, formatZAR } from "./format";
import { navForRole } from "./nav";

describe("en-ZA formatting", () => {
  it("formats ZAR like R 12 500,00", () => {
    expect(formatZAR(12500)).toBe("R 12 500,00");
  });
  it("formats dates like 14 Oct 2026", () => {
    expect(formatDate("2026-10-14T10:00:00")).toBe("14 Oct 2026");
  });
});

describe("role navigation", () => {
  it("tenant mobile tabs are Home, Requests, Pay, Documents, Profile", () => {
    expect(navForRole("tenant").tabs.map((i) => i.label)).toEqual(["Home", "Requests", "Pay", "Documents", "Profile"]);
  });
  it("owner mobile tabs are Home, Properties, Requests, Money, Profile", () => {
    expect(navForRole("owner").tabs.map((i) => i.label)).toEqual(["Home", "Properties", "Requests", "Money", "Profile"]);
  });
  it("tenant cannot see staff & permissions", () => {
    expect(navForRole("tenant").items.some((i) => i.key === "staff")).toBe(false);
  });
});
