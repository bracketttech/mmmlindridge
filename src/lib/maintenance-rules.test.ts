import { describe, expect, it } from "vitest";
import { canRate, countByCategory, forTenantView, groupByStatus, validateAttachment } from "./maintenance-rules";
import { seedRequests } from "@/mocks/maintenance";

describe("maintenance rules", () => {
  it("rejects unsupported file types", () => {
    expect(validateAttachment({ type: "application/x-msdownload", size: 100 }, 0)).toBe("type");
  });
  it("rejects files over 10 MB", () => {
    expect(validateAttachment({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 }, 0)).toBe("size");
  });
  it("allows at most 5 attachments", () => {
    expect(validateAttachment({ type: "image/png", size: 1000 }, 5)).toBe("count");
    expect(validateAttachment({ type: "image/png", size: 1000 }, 4)).toBeNull();
  });
  it("never exposes internal notes, cost or quote to tenants", () => {
    const r = seedRequests().find((x) => x.id === "r2")!;
    const v = forTenantView(r);
    expect(r.thread.some((m) => m.internal)).toBe(true);
    expect(v.thread.some((m) => m.internal)).toBe(false);
    expect(v.quote).toBeUndefined();
  });
  it("asks for a rating only on resolved/closed unrated requests", () => {
    expect(canRate({ status: "resolved" })).toBe(true);
    expect(canRate({ status: "in_progress" })).toBe(false);
    expect(canRate({ status: "closed", rating: { stars: 4, comment: "" } })).toBe(false);
  });
  it("board columns and category chart count the same requests as the list", () => {
    const rs = seedRequests();
    expect(groupByStatus(rs).reduce((a, g) => a + g.items.length, 0)).toBe(rs.length);
    expect(countByCategory(rs).reduce((a, g) => a + g.count, 0)).toBe(rs.length);
  });
});
