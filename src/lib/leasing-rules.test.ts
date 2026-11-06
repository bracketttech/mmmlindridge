import { describe, expect, it } from "vitest";
import { affordability, autoFields, canConvertMonthToMonth, canSignerAct, dueReminders, envelopeStatus, freeSlots, isValidSignature, leaseDisplay, nextEscalation, renderMerge, renewIssues, screeningProgress, sendIssues, validateSignatureUpload } from "./leasing-rules";
import { CHECK_KEYS, type ScreeningCheck, type Signer } from "@/mocks/leasing";

const signer = (id: string, state: Signer["state"], email = `${id}@mail.co.za`): Signer => ({ id, name: `Signer ${id}`, email, phone: "", role: "tenant", state, token: `tok-${id}` });
const NOW = "2026-11-06T10:00:00";

describe("envelope status", () => {
  it("is Draft until sent", () => expect(envelopeStatus({ signers: [signer("a", "pending")] }, NOW)).toBe("draft"));
  it("is Sent when nobody has opened it", () => expect(envelopeStatus({ signers: [signer("a", "pending")], sentAt: NOW, expiresAt: "2026-11-20" }, NOW)).toBe("sent"));
  it("is Viewed once any signer opens it", () => expect(envelopeStatus({ signers: [signer("a", "viewed"), signer("b", "pending")], sentAt: NOW, expiresAt: "2026-11-20" }, NOW)).toBe("viewed"));
  it("is Signed only when every signer has signed", () => {
    expect(envelopeStatus({ signers: [signer("a", "signed"), signer("b", "viewed")], sentAt: NOW, expiresAt: "2026-11-20" }, NOW)).toBe("viewed");
    expect(envelopeStatus({ signers: [signer("a", "signed"), signer("b", "signed")], sentAt: NOW, expiresAt: "2026-11-20" }, NOW)).toBe("signed");
  });
  it("is Declined if any signer declines", () => expect(envelopeStatus({ signers: [signer("a", "signed"), signer("b", "declined")], sentAt: NOW, expiresAt: "2026-11-20" }, NOW)).toBe("declined"));
  it("is Expired after the deadline when unsigned", () => expect(envelopeStatus({ signers: [signer("a", "pending")], sentAt: "2026-10-01", expiresAt: "2026-10-15" }, NOW)).toBe("expired"));
  it("stays Signed after the deadline once complete", () => expect(envelopeStatus({ signers: [signer("a", "signed")], sentAt: "2026-10-01", expiresAt: "2026-10-15" }, NOW)).toBe("signed"));
  it("signers can't act on expired or declined envelopes", () => {
    expect(canSignerAct("expired", { state: "pending" })).toBe(false);
    expect(canSignerAct("declined", { state: "viewed" })).toBe(false);
    expect(canSignerAct("viewed", { state: "viewed" })).toBe(true);
    expect(canSignerAct("viewed", { state: "signed" })).toBe(false);
  });
});

describe("sending for signature", () => {
  it("needs at least one signer", () => expect(sendIssues({ signers: [], fields: [] })).toEqual([{ kind: "no_signers" }]));
  it("needs a signature field for every signer", () => {
    const issues = sendIssues({ signers: [signer("a", "pending"), signer("b", "pending")], fields: [{ id: "f", signerId: "a", type: "signature", page: 0, x: 0, y: 0 }, { id: "g", signerId: "b", type: "date", page: 0, x: 0, y: 0 }] });
    expect(issues).toEqual([{ kind: "no_signature_field", signerId: "b" }]);
  });
  it("rejects bad and duplicate emails", () => {
    const issues = sendIssues({ signers: [signer("a", "pending", "x@mail.co.za"), signer("b", "pending", "X@mail.co.za"), signer("c", "pending", "nope")], fields: ["a", "b", "c"].map((id) => ({ id, signerId: id, type: "signature" as const, page: 0, x: 0, y: 0 })) });
    expect(issues.map((i) => i.kind)).toEqual(["duplicate_email", "bad_email"]);
  });
  it("auto-places a signature and date for each signer on the last page", () => {
    const f = autoFields(["a", "b"], 8);
    expect(f).toHaveLength(4);
    expect(f.every((x) => x.page === 8)).toBe(true);
    expect(f.filter((x) => x.type === "signature").map((x) => x.signerId)).toEqual(["a", "b"]);
  });
});

describe("signatures", () => {
  it("typed signatures need two letters", () => { expect(isValidSignature("type", "J")).toBe(false); expect(isValidSignature("type", "Jo")).toBe(true); });
  it("drawn signatures must be an image", () => { expect(isValidSignature("draw", "")).toBe(false); expect(isValidSignature("draw", `data:image/png;base64,${"A".repeat(60)}`)).toBe(true); });
  it("uploads must be PNG/JPG/WebP up to 2 MB", () => {
    expect(validateSignatureUpload({ type: "application/pdf", size: 1000 })).toBe("type");
    expect(validateSignatureUpload({ type: "image/png", size: 3 * 1024 * 1024 })).toBe("size");
    expect(validateSignatureUpload({ type: "image/jpeg", size: 50_000 })).toBeNull();
  });
});

describe("leases", () => {
  const today = "2026-11-06";
  it("shows Expiring within 90 days of the end date", () => {
    expect(leaseDisplay({ state: "active", end: "2026-11-30" }, today)).toBe("expiring");
    expect(leaseDisplay({ state: "active", end: "2027-02-28" }, today)).toBe("active");
  });
  it("past the end date an active lease continues month-to-month", () => expect(leaseDisplay({ state: "active", end: "2026-10-31" }, today)).toBe("month_to_month"));
  it("90/60/30-day reminders become due as the end approaches", () => {
    const reminders = { d90: true, d60: true, d30: true };
    expect(dueReminders({ state: "active", end: "2026-11-30", reminders }, today)).toEqual([90, 60, 30]);
    expect(dueReminders({ state: "active", end: "2026-12-26", reminders }, today)).toEqual([90, 60]);
    expect(dueReminders({ state: "active", end: "2026-12-26", reminders: { ...reminders, d60: false } }, today)).toEqual([90]);
    expect(dueReminders({ state: "draft", end: "2026-11-30", reminders }, today)).toEqual([]);
  });
  it("rent escalates on the next start-date anniversary", () => {
    expect(nextEscalation("2025-12-01", today)).toBe("2026-12-01");
    expect(nextEscalation("2025-03-01", today)).toBe("2027-03-01");
    expect(nextEscalation("2026-12-01", today)).toBe("2027-12-01");
  });
  it("renewal must end after the current end date with rent above zero", () => {
    expect(renewIssues({ end: "2026-11-30" }, "2026-11-30", 13000)).toEqual(["end"]);
    expect(renewIssues({ end: "2026-11-30" }, "2027-11-30", 0)).toEqual(["rent"]);
    expect(renewIssues({ end: "2026-11-30" }, "2027-11-30", 13500)).toEqual([]);
  });
  it("month-to-month is offered only for active leases inside 90 days", () => {
    expect(canConvertMonthToMonth({ state: "active", end: "2026-11-30" }, today)).toBe(true);
    expect(canConvertMonthToMonth({ state: "active", end: "2027-06-30" }, today)).toBe(false);
    expect(canConvertMonthToMonth({ state: "draft", end: "2026-11-30" }, today)).toBe(false);
  });
});

describe("merge fields", () => {
  it("fills known fields and flags missing ones", () => {
    const r = renderMerge("Lease for {{tenant_name}} at {{ unit }} — {{rent}}", { tenant_name: "Thandiwe Nkosi", unit: "A101", rent: "" });
    expect(r.text).toBe("Lease for Thandiwe Nkosi at A101 — [rent]");
    expect(r.missing).toEqual(["rent"]);
  });
});

describe("screening checklist", () => {
  const pass = (): ScreeningCheck => ({ done: true, result: "pass", notes: "" });
  it("affordability: ≤30% pass, ≤35% concern, above fails", () => {
    expect(affordability(14500, 52000)).toEqual({ ratio: 27.9, result: "pass" });
    expect(affordability(14500, 43000)).toEqual({ ratio: 33.7, result: "concern" });
    expect(affordability(14500, 38000)).toEqual({ ratio: 38.2, result: "fail" });
    expect(affordability(14500, 0)).toBeNull();
  });
  it("progress counts ticked checks that have a result", () => {
    const p = screeningProgress({ id: pass(), income: { done: true, notes: "" }, credit: pass() }, CHECK_KEYS);
    expect(p.done).toBe(2);
    expect(p.pct).toBe(22);
  });
  it("can't be marked ready until every required check is complete", () => {
    const some = { id: pass(), income: pass(), landlord: pass(), affordability: pass(), popia: pass() };
    expect(screeningProgress(some, CHECK_KEYS).canMarkReady).toBe(false);
    expect(screeningProgress(some, CHECK_KEYS).missing).toEqual(["deposit"]);
    expect(screeningProgress({ ...some, deposit: pass() }, CHECK_KEYS).canMarkReady).toBe(true);
  });
  it("a failed check blocks ready to approve", () => {
    const all = { id: pass(), income: pass(), landlord: pass(), affordability: pass(), popia: pass(), deposit: pass(), credit: { done: true, result: "fail" as const, notes: "" } };
    expect(screeningProgress(all, CHECK_KEYS).canMarkReady).toBe(false);
  });
});

describe("viewing slots", () => {
  it("hides booked and past slots", () => {
    const now = new Date(2026, 10, 6, 10, 30);
    expect(freeSlots("2026-11-06", [{ date: "2026-11-06", time: "14:00" }], now)).toEqual(["11:00", "12:00", "15:00", "16:00"]);
    expect(freeSlots("2026-11-05", [], now)).toEqual([]);
    expect(freeSlots("2026-11-09", [{ date: "2026-11-09", time: "10:00" }], now)).not.toContain("10:00");
  });
});
