import { describe, expect, it } from "vitest";
import { loginSchema, passwordScore, resetSchema, signupSchema, phoneField } from "./validation";
import { authService } from "@/services/auth";

describe("auth validation", () => {
  it("rejects an empty login", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
  it("rejects a bad email", () => {
    expect(loginSchema.safeParse({ email: "janice@", password: "x" }).success).toBe(false);
  });
  it("rejects a weak password", () => {
    expect(resetSchema.safeParse({ password: "password", confirm: "password" }).success).toBe(false);
    expect(passwordScore("password")).toBeLessThan(3);
  });
  it("rejects mismatched passwords", () => {
    const r = resetSchema.safeParse({ password: "Sunset#2026", confirm: "Sunset#2027" });
    expect(r.success).toBe(false);
  });
  it("accepts a strong matching password", () => {
    expect(resetSchema.safeParse({ password: "Sunset#2026", confirm: "Sunset#2026" }).success).toBe(true);
  });
  it("requires accepting terms on signup", () => {
    const r = signupSchema.safeParse({ name: "Janice Tinto", email: "j@t.co.za", phone: "+27821234567", password: "Sunset#2026", confirm: "Sunset#2026", terms: false });
    expect(r.success).toBe(false);
  });
  it("accepts SA mobile numbers with +27 or 0", () => {
    expect(phoneField.safeParse("+27 82 123 4567").success).toBe(true);
    expect(phoneField.safeParse("082 123 4567").success).toBe(true);
    expect(phoneField.safeParse("12345").success).toBe(false);
  });
});

describe("mock invite links", () => {
  it("valid, expired, used and unknown staff invites", async () => {
    expect((await authService.getStaffInvite("inv-caretaker-valid")).status).toBe("valid");
    expect((await authService.getStaffInvite("inv-expired")).status).toBe("expired");
    expect((await authService.getStaffInvite("inv-used")).status).toBe("used");
    expect((await authService.getStaffInvite("nope")).status).toBe("invalid");
  });
  it("tenant link carries locked property and unit", async () => {
    const r = await authService.getTenantLink("reg-sunset-a101");
    expect(r.link?.propertyName).toBe("Sunset Gardens");
    expect(r.link?.unit).toBe("A101");
  });
});

describe("property & unit validation", () => {
  const base = {
    name: "Melville Cottages", type: "house", description: "", yearBuilt: "", address: "4 Main Road", suburb: "Melville", city: "Johannesburg",
    province: "Gauteng", postalCode: "2092", erf: "", amenities: [], municipality: "", accountNo: "", ratesMonthly: "", electricity: "prepaid",
    electricityMeter: "", waterMeter: "", rulesText: "", pets: false, smoking: false, quietFrom: "22:00", quietTo: "06:00",
  };
  it("accepts a property with only the required details", async () => {
    const { propertySchema } = await import("./validation");
    expect(propertySchema.safeParse(base).success).toBe(true);
  });
  it("rejects a property with a 5-digit postal code", async () => {
    const { propertySchema } = await import("./validation");
    expect(propertySchema.safeParse({ ...base, postalCode: "20921" }).success).toBe(false);
  });
  it("rejects a unit rent below R 500", async () => {
    const { unitSchema } = await import("./validation");
    expect(unitSchema.safeParse({ label: "A1", beds: 1, baths: 1, sizeM2: 40, rent: 400, deposit: 0, status: "vacant", features: "" }).success).toBe(false);
  });
});
