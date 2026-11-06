import { describe, expect, it } from "vitest";
import { DEFAULT_PRESETS, canApproveSpend, effective, isOverridden, scopedPropertyId, toggle, visibleModules } from "./access-rules";
import { canMoveTo, quote, tierFor } from "./subscription-rules";
import { addBusinessDays, advanceIssue, deliveryState, overallDelivery } from "./legal-rules";
import { rangeBounds, turnoverPct } from "./reports-rules";
import { announcementStatus, audienceAllowed, audienceIncludes } from "./announcement-rules";
import { plans } from "@/mocks/plans";

const care = DEFAULT_PRESETS.caretaker;

describe("permissions", () => {
  it("granting invoices view to a caretaker adds it to their menu", () => {
    expect(visibleModules(effective(care)).includes("invoices")).toBe(false);
    const o = toggle(care, {}, "invoices", "view", true);
    expect(visibleModules(effective(care, o))).toContain("invoices");
  });
  it("revoking schedule view removes the module and all its actions", () => {
    const p = effective(care, toggle(care, {}, "schedule", "view", false));
    expect(p.schedule.create).toBe(false);
    expect(visibleModules(p)).not.toContain("schedule");
  });
  it("turning on an action turns on view; matching the preset drops the override", () => {
    const o = toggle(care, {}, "reports", "export", true);
    expect(effective(care, o).reports.view).toBe(true);
    expect(isOverridden(care, o, "reports", "export")).toBe(true);
    expect(toggle(care, o, "reports", "view", false)).toEqual({});
  });
  it("staff can never get the staff module", () => expect(effective(care, { staff: { view: true } }).staff.view).toBe(false));
  it("a caretaker scoped to Property A never lands on Property B or the portfolio", () => {
    expect(scopedPropertyId(["p1"], "p2")).toBe("p1");
    expect(scopedPropertyId(["p1"], "all")).toBe("p1");
    expect(scopedPropertyId("all", "p2")).toBe("p2");
  });
  it("caretakers approve spend up to their limit only", () => {
    expect(canApproveSpend(effective(care), 2000, 2000)).toBe(true);
    expect(canApproveSpend(effective(care), 2001, 2000)).toBe(false);
  });
});

describe("pricing by tenants per property", () => {
  it("picks the smallest fitting tier", () => {
    expect(tierFor(5, plans).id).toBe("starter");
    expect(tierFor(6, plans).id).toBe("standard");
    expect(tierFor(51, plans).id).toBe("custom");
  });
  it("monthly total updates as tenant counts change; annual charges 10 months", () => {
    const q1 = quote([{ id: "a", name: "A", tenants: 4 }, { id: "b", name: "B", tenants: 18 }], plans);
    expect(q1.monthly).toBe(199 + 499);
    const q2 = quote([{ id: "a", name: "A", tenants: 30 }, { id: "b", name: "B", tenants: 18 }], plans);
    expect(q2.monthly).toBe(999 + 499);
    expect(q2.annual).toBe((999 + 499) * 10);
  });
  it("can't downgrade below the current tenant count", () => expect(canMoveTo(12, plans[0]!)).toBe(false));
});

describe("legal", () => {
  it("delivery progresses with time and failures stick", () => {
    expect(deliveryState({ channel: "whatsapp", sentAt: "2026-11-06T10:00:00" }, "2026-11-06T10:00:01")).toBe("queued");
    expect(deliveryState({ channel: "whatsapp", sentAt: "2026-11-06T10:00:00" }, "2026-11-06T10:01:00")).toBe("read");
    expect(deliveryState({ channel: "sms", sentAt: "2026-11-06T10:00:00", failed: true }, "2026-11-06T11:00:00")).toBe("failed");
    expect(overallDelivery(["failed", "delivered"])).toBe("delivered");
  });
  it("an eviction stage needs a date before moving on", () => {
    expect(advanceIssue({ stage: 0, stages: {} })).toBe("date");
    expect(advanceIssue({ stage: 0, stages: { breach_notice: { date: "2026-11-01", note: "", docs: [] } } })).toBeNull();
  });
  it("20 business days skips weekends", () => expect(addBusinessDays("2026-11-06", 20)).toBe("2026-12-04"));
});

describe("reports & announcements", () => {
  it("date ranges", () => {
    expect(rangeBounds("3m", "2026-11-06")).toEqual({ from: "2026-09", to: "2026-11" });
    expect(rangeBounds("ytd", "2026-11-06")).toEqual({ from: "2026-01", to: "2026-11" });
  });
  it("turnover", () => expect(turnoverPct(3, 60)).toBe(5));
  it("scheduled becomes sent after its time", () => expect(announcementStatus({ status: "scheduled", scheduledFor: "2026-11-06T09:00:00" }, "2026-11-06T10:00:00")).toBe("sent"));
  it("unit audiences only reach those units; scoped staff can't message everyone", () => {
    expect(audienceIncludes({ kind: "units", propertyId: "p2", unitIds: ["u4"] }, { propertyId: "p2", unitId: "u5" })).toBe(false);
    expect(audienceAllowed({ kind: "all" }, ["p1"])).toBe(false);
  });
});
