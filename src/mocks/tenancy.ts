// Tenancy mock data (Phase 5, UI only): tenant profiles, change-of-details requests, history and registration links.
import { tenants as baseTenants, invoices, type Tenant } from "./data";
import type { TenantLink } from "./auth";

export type Occupant = { name: string; relation: string; age: string };
export type Surety = { name: string; idNumber: string; phone: string; email: string };
export type TenantDoc = { id: string; name: string; kind: "id" | "income" | "lease" | "other"; size: number; uploadedAt: string };

export type TenantRecord = Tenant & {
  idNumber: string; employer: string;
  leaseStart: string; leaseEnd: string; deposit: number;
  /** Amount owing in rand (0 = up to date). */
  balance: number;
  occupants: Occupant[];
  emergency: { name: string; relation: string; phone: string };
  surety: Surety | null;
  archived: boolean; registered: boolean; createdAt: string;
  docs: TenantDoc[];
};

/** Fields a tenant may ask to change themselves. Name, ID and lease stay locked. */
export const CHANGEABLE_FIELDS = ["email", "phone", "employer", "emergencyName", "emergencyRelation", "emergencyPhone"] as const;
export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number];
export type DetailValues = Record<ChangeableField, string>;
export type FieldChange = { field: ChangeableField; from: string; to: string };

export type ChangeRequest = {
  id: string; tenantId: string; submittedAt: string; changes: FieldChange[];
  status: "pending" | "approved" | "rejected"; reason?: string | undefined; decidedAt?: string | undefined; decidedBy?: string | undefined;
};
export type HistoryKind = "created" | "updated" | "link_sent" | "registered" | "change_submitted" | "change_approved" | "change_rejected" | "archived" | "restored";
export type HistoryEntry = { id: string; tenantId: string; at: string; kind: HistoryKind; by: string; note?: string | undefined };

export type SentLink = TenantLink & { tenantId: string };

const EXTRA: Record<string, Omit<TenantRecord, keyof Tenant | "balance" | "archived" | "registered">> = {
  t1: { idNumber: "9203150123082", employer: "Discovery Health", leaseStart: "2025-12-01", leaseEnd: "2026-11-30", deposit: 12500, createdAt: "2025-11-10",
    occupants: [{ name: "Ayanda Nkosi", relation: "Partner", age: "33" }], emergency: { name: "Nomsa Nkosi", relation: "Mother", phone: "+27 82 555 0900" }, surety: null,
    docs: [{ id: "td1", name: "ID copy — T Nkosi.pdf", kind: "id", size: 420_000, uploadedAt: "2025-11-10" }, { id: "td2", name: "Payslip Oct 2025.pdf", kind: "income", size: 210_000, uploadedAt: "2025-11-10" }, { id: "td3", name: "Signed lease A101.pdf", kind: "lease", size: 1_200_000, uploadedAt: "2025-11-24" }] },
  t2: { idNumber: "8507225089081", employer: "Self-employed (plumbing)", leaseStart: "2025-03-01", leaseEnd: "2027-02-28", deposit: 8900, createdAt: "2025-02-12",
    occupants: [], emergency: { name: "Anneke van der Merwe", relation: "Sister", phone: "+27 83 555 0911" }, surety: { name: "Hendrik van der Merwe", idNumber: "5806115084084", phone: "+27 82 555 0912", email: "hendrik.vdm@mail.co.za" },
    docs: [{ id: "td4", name: "ID copy — P van der Merwe.pdf", kind: "id", size: 380_000, uploadedAt: "2025-02-12" }, { id: "td5", name: "Bank statements (3 months).pdf", kind: "income", size: 940_000, uploadedAt: "2025-02-12" }] },
  t3: { idNumber: "9611030456086", employer: "Standard Bank", leaseStart: "2026-02-01", leaseEnd: "2027-01-31", deposit: 11200, createdAt: "2026-01-08",
    occupants: [], emergency: { name: "Kabelo Mokoena", relation: "Brother", phone: "+27 71 555 0920" }, surety: null,
    docs: [{ id: "td6", name: "Signed lease Loft 3.pdf", kind: "lease", size: 1_100_000, uploadedAt: "2026-01-20" }] },
  t4: { idNumber: "8812125398081", employer: "Eskom", leaseStart: "2024-12-01", leaseEnd: "2026-11-30", deposit: 16800, createdAt: "2024-11-02",
    occupants: [{ name: "Zinhle Dlamini", relation: "Spouse", age: "35" }, { name: "Lwazi Dlamini", relation: "Son", age: "7" }], emergency: { name: "Thabo Dlamini", relation: "Brother", phone: "+27 72 555 0930" }, surety: null, docs: [] },
  t5: { idNumber: "9004040567086", employer: "Netcare", leaseStart: "2025-09-01", leaseEnd: "2026-08-31", deposit: 28000, createdAt: "2025-08-01",
    occupants: [{ name: "Imran Patel", relation: "Spouse", age: "38" }], emergency: { name: "Fatima Patel", relation: "Mother", phone: "+27 84 555 0940" }, surety: null, docs: [] },
  t6: { idNumber: "7901015800081", employer: "Mahlangu Botha Fitzgerald Attorneys Incorporated", leaseStart: "2026-12-01", leaseEnd: "2027-11-30", deposit: 26500, createdAt: "2026-10-15",
    occupants: [], emergency: { name: "Grace Mahlangu", relation: "Spouse", phone: "+27 76 555 0950" }, surety: null, docs: [] },
  t7: { idNumber: "0107120345080", employer: "University of Johannesburg (student)", leaseStart: "2026-01-15", leaseEnd: "2026-12-14", deposit: 6500, createdAt: "2026-01-05",
    occupants: [], emergency: { name: "Sibusiso Khumalo", relation: "Father", phone: "+27 79 555 0960" }, surety: { name: "Sibusiso Khumalo", idNumber: "7203035123085", phone: "+27 79 555 0960", email: "s.khumalo@mail.co.za" }, docs: [] },
};

export function seedTenants(): TenantRecord[] {
  return baseTenants.map((t) => ({
    ...t, ...EXTRA[t.id]!,
    balance: invoices.filter((i) => i.tenantId === t.id && (i.status === "overdue" || i.status === "failed")).reduce((a, i) => a + i.amount, 0),
    archived: false, registered: t.status !== "pending",
  }));
}

export function seedChanges(): ChangeRequest[] {
  return [
    { id: "cr1", tenantId: "t2", submittedAt: "2026-11-04", status: "pending", changes: [{ field: "phone", from: "+27 83 555 0177", to: "+27 83 555 0234" }, { field: "employer", from: "Self-employed (plumbing)", to: "Joburg Water" }] },
    { id: "cr2", tenantId: "t3", submittedAt: "2026-11-02", status: "pending", changes: [{ field: "emergencyName", from: "Kabelo Mokoena", to: "Refilwe Mokoena" }, { field: "emergencyRelation", from: "Brother", to: "Mother" }, { field: "emergencyPhone", from: "+27 71 555 0920", to: "+27 71 555 0988" }] },
    { id: "cr3", tenantId: "t1", submittedAt: "2026-06-12", status: "approved", decidedAt: "2026-06-13", decidedBy: "Janice Tinto", changes: [{ field: "employer", from: "Momentum", to: "Discovery Health" }] },
    { id: "cr4", tenantId: "t5", submittedAt: "2026-09-20", status: "rejected", decidedAt: "2026-09-21", decidedBy: "Janice Tinto", reason: "Please upload a new payslip with your new employer first.", changes: [{ field: "employer", from: "Netcare", to: "Mediclinic" }] },
  ];
}

export function seedHistory(): HistoryEntry[] {
  return [
    { id: "h1", tenantId: "t1", at: "2025-11-10", kind: "created", by: "Janice Tinto" },
    { id: "h2", tenantId: "t1", at: "2025-11-10", kind: "link_sent", by: "Janice Tinto", note: "Email" },
    { id: "h3", tenantId: "t1", at: "2025-11-12", kind: "registered", by: "Thandiwe Nkosi" },
    { id: "h4", tenantId: "t1", at: "2026-06-12", kind: "change_submitted", by: "Thandiwe Nkosi", note: "Employer" },
    { id: "h5", tenantId: "t1", at: "2026-06-13", kind: "change_approved", by: "Janice Tinto", note: "Employer" },
    { id: "h6", tenantId: "t2", at: "2026-11-04", kind: "change_submitted", by: "Pieter van der Merwe", note: "Phone, Employer" },
    { id: "h7", tenantId: "t3", at: "2026-11-02", kind: "change_submitted", by: "Lerato Mokoena", note: "Emergency contact" },
    { id: "h8", tenantId: "t5", at: "2026-09-21", kind: "change_rejected", by: "Janice Tinto", note: "Please upload a new payslip with your new employer first." },
    { id: "h9", tenantId: "t6", at: "2026-10-15", kind: "created", by: "Janice Tinto" },
  ];
}

/** Demo fallback when the signed-in tenant isn't matched by email. */
export const DEMO_TENANT_ID = "t1";
