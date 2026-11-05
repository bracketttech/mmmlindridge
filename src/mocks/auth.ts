// Mock auth fixtures (UI-only phases). Tokens below are the demo links to try.
import type { Role } from "@/lib/nav";

export type InviteStatus = "valid" | "expired" | "used" | "invalid";

export type StaffInvite = {
  token: string; status: Exclude<InviteStatus, "invalid">; email: string; role: Exclude<Role, "owner" | "tenant">;
  ownerName: string; invitedBy: string; expiresAt: string;
};
export type TenantLink = {
  token: string; status: Exclude<InviteStatus, "invalid">; name: string; email: string; phone: string;
  propertyName: string; propertyAddress: string; unit: string; rent: number; leaseStart: string; expiresAt: string;
};

export const staffInvites: StaffInvite[] = [
  { token: "inv-caretaker-valid", status: "valid", email: "bongani@nestly.co.za", role: "caretaker", ownerName: "Tinto Property Holdings", invitedBy: "Janice Tinto", expiresAt: "2026-11-12" },
  { token: "inv-finance-valid", status: "valid", email: "ravi@nestly.co.za", role: "finance", ownerName: "Tinto Property Holdings", invitedBy: "Janice Tinto", expiresAt: "2026-11-12" },
  { token: "inv-expired", status: "expired", email: "chantelle@nestly.co.za", role: "agent", ownerName: "Tinto Property Holdings", invitedBy: "Janice Tinto", expiresAt: "2026-10-01" },
  { token: "inv-used", status: "used", email: "zanele@nestly.co.za", role: "legal", ownerName: "Tinto Property Holdings", invitedBy: "Janice Tinto", expiresAt: "2026-11-20" },
];

export const tenantLinks: TenantLink[] = [
  { token: "reg-sunset-a101", status: "valid", name: "Thandiwe Nkosi", email: "thandiwe.nkosi@mail.co.za", phone: "+27 82 555 0141", propertyName: "Sunset Gardens", propertyAddress: "12 Rivonia Road, Sandton", unit: "A101", rent: 12500, leaseStart: "2026-12-01", expiresAt: "2026-11-19" },
  { token: "reg-expired", status: "expired", name: "Lerato Mokoena", email: "lerato.mokoena@mail.co.za", phone: "+27 71 555 0102", propertyName: "Rosebank Lofts", propertyAddress: "8 Tyrwhitt Avenue, Rosebank", unit: "Loft 3", rent: 11200, leaseStart: "2026-10-01", expiresAt: "2026-09-25" },
  { token: "reg-used", status: "used", name: "Aisha Patel", email: "aisha.patel@mail.co.za", phone: "+27 84 555 0123", propertyName: "Bryanston Villas", propertyAddress: "41 Main Road, Bryanston", unit: "Villa 2", rent: 28000, leaseStart: "2026-09-01", expiresAt: "2026-08-30" },
];

/** Demo rules: this password always fails; emails containing "2fa" go through the code screen; code 000000 is rejected. */
export const DEMO_WRONG_PASSWORD = "wrong-password";
export const DEMO_BAD_OTP = "000000";
export const DEMO_TAKEN_EMAIL = "taken@nestly.co.za";
export const DEMO_EXPIRED_RESET = "expired";
