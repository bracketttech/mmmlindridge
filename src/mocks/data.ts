// Mock data (UI-only phases). Replace via /src/services when a backend arrives.
import { avatarFor } from "@/images";
export type Property = { id: string; name: string; address: string; suburb: string; province: string; units: number; occupied: number; image?: string };
export type Unit = { id: string; propertyId: string; label: string; beds: number; rent: number; status: "occupied" | "vacant" | "notice" };
export type Tenant = { id: string; name: string; email: string; phone: string; propertyId: string; unitId: string; rent: number; status: "active" | "arrears" | "notice" | "pending"; paidPct: number; lastPayment: string; avatar?: string };
export type Request = { id: string; title: string; type: "fault" | "upgrade"; priority: "low" | "medium" | "high"; status: "open" | "in_progress" | "resolved"; tenantId: string; createdAt: string };
export type Invoice = { id: string; tenantId: string; amount: number; dueDate: string; status: "paid" | "pending" | "overdue" | "failed" };
export type Staff = { id: string; name: string; email: string; role: "caretaker" | "agent" | "finance" | "legal"; phone: string };
export type Notification = { id: string; title: string; body: string; at: string; unread: boolean };

export const properties: Property[] = [
  { id: "p1", name: "Sunset Gardens", address: "12 Rivonia Road", suburb: "Sandton", province: "Gauteng", units: 24, occupied: 22 },
  { id: "p2", name: "Rosebank Lofts", address: "8 Tyrwhitt Avenue", suburb: "Rosebank, Johannesburg", province: "Gauteng", units: 16, occupied: 14 },
  { id: "p3", name: "Bryanston Villas", address: "41 Main Road", suburb: "Bryanston", province: "Gauteng", units: 10, occupied: 9 },
  { id: "p4", name: "Camps Bay Ocean View Residences & Penthouse Collection", address: "3 Victoria Road", suburb: "Camps Bay, Cape Town", province: "Western Cape", units: 8, occupied: 7 },
];

export const units: Unit[] = [
  { id: "u1", propertyId: "p1", label: "A101", beds: 2, rent: 12500, status: "occupied" },
  { id: "u2", propertyId: "p1", label: "A102", beds: 1, rent: 8900, status: "occupied" },
  { id: "u3", propertyId: "p1", label: "B204", beds: 3, rent: 16800, status: "notice" },
  { id: "u4", propertyId: "p2", label: "Loft 3", beds: 1, rent: 11200, status: "occupied" },
  { id: "u5", propertyId: "p2", label: "Loft 7", beds: 2, rent: 14500, status: "vacant" },
  { id: "u6", propertyId: "p3", label: "Villa 2", beds: 4, rent: 28000, status: "occupied" },
  { id: "u7", propertyId: "p4", label: "PH1", beds: 3, rent: 26500, status: "occupied" },
  { id: "u8", propertyId: "p3", label: "Villa 5", beds: 3, rent: 6500, status: "occupied" },
];

export const tenants: Tenant[] = [
  { id: "t1", name: "Thandiwe Nkosi", email: "thandiwe.nkosi@mail.co.za", avatar: avatarFor("thandiwe.nkosi@mail.co.za"), phone: "+27 82 555 0141", propertyId: "p1", unitId: "u1", rent: 12500, status: "active", paidPct: 100, lastPayment: "2026-11-01" },
  { id: "t2", name: "Pieter van der Merwe", email: "pieter.vdm@mail.co.za", avatar: avatarFor("pieter.vdm@mail.co.za"), phone: "+27 83 555 0177", propertyId: "p1", unitId: "u2", rent: 8900, status: "arrears", paidPct: 45, lastPayment: "2026-09-30" },
  { id: "t3", name: "Lerato Mokoena", email: "lerato.mokoena@mail.co.za", avatar: avatarFor("lerato.mokoena@mail.co.za"), phone: "+27 71 555 0102", propertyId: "p2", unitId: "u4", rent: 11200, status: "active", paidPct: 100, lastPayment: "2026-11-02" },
  { id: "t4", name: "Sipho Dlamini", email: "sipho.dlamini@mail.co.za", phone: "+27 72 555 0199", propertyId: "p1", unitId: "u3", rent: 16800, status: "notice", paidPct: 80, lastPayment: "2026-10-28" },
  { id: "t5", name: "Aisha Patel", email: "aisha.patel@mail.co.za", phone: "+27 84 555 0123", propertyId: "p3", unitId: "u6", rent: 28000, status: "active", paidPct: 92, lastPayment: "2026-11-03" },
  { id: "t6", name: "Johannes Botha-Fitzgerald Mahlangu", email: "johannes.botha.fitzgerald.mahlangu@longcompanyname.co.za", phone: "+27 76 555 0188", propertyId: "p4", unitId: "u7", rent: 26500, status: "pending", paidPct: 20, lastPayment: "2026-10-15" },
  { id: "t7", name: "Naledi Khumalo", email: "naledi.k@mail.co.za", phone: "+27 79 555 0110", propertyId: "p3", unitId: "u8", rent: 6500, status: "active", paidPct: 100, lastPayment: "2026-11-01" },
];

export const requests: Request[] = [
  { id: "r1", title: "Geyser leaking in main bathroom", type: "fault", priority: "high", status: "open", tenantId: "t1", createdAt: "2026-11-03" },
  { id: "r2", title: "Install prepaid electricity meter", type: "upgrade", priority: "medium", status: "in_progress", tenantId: "t3", createdAt: "2026-10-29" },
  { id: "r3", title: "Gate motor not responding after load-shedding", type: "fault", priority: "high", status: "in_progress", tenantId: "t5", createdAt: "2026-10-27" },
  { id: "r4", title: "Repaint lounge wall", type: "upgrade", priority: "low", status: "resolved", tenantId: "t7", createdAt: "2026-10-12" },
];

export const invoices: Invoice[] = [
  { id: "INV-1042", tenantId: "t1", amount: 12500, dueDate: "2026-11-01", status: "paid" },
  { id: "INV-1043", tenantId: "t2", amount: 8900, dueDate: "2026-11-01", status: "overdue" },
  { id: "INV-1044", tenantId: "t3", amount: 11200, dueDate: "2026-11-01", status: "paid" },
  { id: "INV-1045", tenantId: "t4", amount: 16800, dueDate: "2026-11-01", status: "pending" },
  { id: "INV-1046", tenantId: "t6", amount: 26500, dueDate: "2026-11-01", status: "failed" },
];

export const staff: Staff[] = [
  { id: "s1", name: "Bongani Zulu", email: "bongani@nestly.co.za", role: "caretaker", phone: "+27 82 555 0300" },
  { id: "s2", name: "Chantelle Adams", email: "chantelle@nestly.co.za", role: "agent", phone: "+27 83 555 0301" },
  { id: "s3", name: "Ravi Naidoo", email: "ravi@nestly.co.za", role: "finance", phone: "+27 84 555 0302" },
  { id: "s4", name: "Zanele Mthembu", email: "zanele@nestly.co.za", role: "legal", phone: "+27 72 555 0303" },
];

export const notifications: Notification[] = [
  { id: "n1", title: "Rent received", body: "Thandiwe Nkosi paid R 12 500,00 for A101.", at: "2026-11-01", unread: true },
  { id: "n2", title: "New fault logged", body: "Geyser leaking in main bathroom — Sunset Gardens A101.", at: "2026-11-03", unread: true },
  { id: "n3", title: "Lease ending soon", body: "Sipho Dlamini's lease for B204 ends on 30 Nov 2026.", at: "2026-10-30", unread: false },
];

export const revenueSeries = [
  { month: "Jun", collected: 182000, previous: 168000 },
  { month: "Jul", collected: 191500, previous: 172000 },
  { month: "Aug", collected: 186000, previous: 179000 },
  { month: "Sep", collected: 204300, previous: 181500 },
  { month: "Oct", collected: 198700, previous: 188000 },
  { month: "Nov", collected: 215400, previous: 192000 },
];
