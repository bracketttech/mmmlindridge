import { describe, expect, it } from "vitest";
import { applyChanges, diffDetails, isSaIdNumber, isValidRejectReason, registrationMessage } from "./tenancy-rules";

const base = { email: "a@mail.co.za", phone: "+27 82 555 0141", employer: "Discovery", emergencyName: "Nomsa", emergencyRelation: "Mother", emergencyPhone: "+27 82 555 0900" };

describe("change-of-details diff", () => {
  it("lists only the fields that changed", () => {
    const d = diffDetails(base, { ...base, phone: "+27 82 555 9999", employer: " Discovery " });
    expect(d).toEqual([{ field: "phone", from: "+27 82 555 0141", to: "+27 82 555 9999" }]);
  });
  it("is empty when nothing changed", () => {
    expect(diffDetails(base, { ...base })).toEqual([]);
  });
  it("approving applies the new values", () => {
    expect(applyChanges(base, [{ field: "email", from: base.email, to: "b@mail.co.za" }]).email).toBe("b@mail.co.za");
  });
});

describe("reject reason", () => {
  it("is required", () => {
    expect(isValidRejectReason("   ")).toBe(false);
    expect(isValidRejectReason("No")).toBe(false);
    expect(isValidRejectReason("Please upload a new payslip")).toBe(true);
  });
});

describe("SA ID number", () => {
  it("accepts a valid 13-digit ID", () => expect(isSaIdNumber("9203150123082")).toBe(true));
  it("rejects a bad check digit", () => expect(isSaIdNumber("9203150123083")).toBe(false));
  it("rejects wrong length", () => expect(isSaIdNumber("920315012308")).toBe(false));
});

describe("registration message", () => {
  it("includes the link", () => {
    const m = registrationMessage("sms", { name: "Thandiwe Nkosi", property: "Sunset Gardens", unit: "A101", url: "https://x/register/abc", owner: "Janice", expires: "12 Nov 2026" });
    expect(m).toContain("https://x/register/abc");
  });
});
