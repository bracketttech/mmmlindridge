// Phase 9 mock data (UI only): staff & permissions, legal desk, schedule, announcements, settings, subscription and audit log.
import { DEFAULT_PRESETS, type Overrides, type PermSet, type Scope, type StaffRole } from "@/lib/access-rules";
import type { Delivery, EvictionOutcome, EvictionStage, NoticeChannel, StageRecord } from "@/lib/legal-rules";
import type { Plan } from "./plans";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDaysIso = (base: string, n: number) => { const d = new Date(`${base.slice(0, 10)}T00:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const todayIso = () => iso(new Date());

/* ---------- Staff ---------- */
export type StaffStatus = "active" | "invited" | "deactivated";
export type StaffMember = {
  id: string; name: string; email: string; phone: string; role: StaffRole; status: StaffStatus;
  scope: Scope; spendLimit?: number | undefined; overrides: Overrides; avatar?: string | undefined;
  invitedAt: string; joinedAt?: string | undefined; lastActive?: string | undefined;
  inviteToken?: string | undefined; inviteExpires?: string | undefined;
};

export function seedStaff(): StaffMember[] {
  const t = todayIso();
  return [
    { id: "s1", name: "Bongani Zulu", email: "bongani@nestly.co.za", phone: "+27 82 555 0300", role: "caretaker", status: "active", scope: ["p1"], spendLimit: 2000, overrides: {}, invitedAt: "2025-03-02", joinedAt: "2025-03-03", lastActive: `${t}T08:12:00` },
    { id: "s2", name: "Chantelle Adams", email: "chantelle@nestly.co.za", phone: "+27 83 555 0301", role: "agent", status: "active", scope: ["p1", "p2"], overrides: {}, invitedAt: "2025-04-10", joinedAt: "2025-04-11", lastActive: `${addDaysIso(t, -1)}T16:40:00` },
    { id: "s3", name: "Ravi Naidoo", email: "ravi@nestly.co.za", phone: "+27 84 555 0302", role: "finance", status: "active", scope: "all", overrides: {}, invitedAt: "2025-02-20", joinedAt: "2025-02-21", lastActive: `${t}T07:55:00` },
    { id: "s4", name: "Zanele Mthembu", email: "zanele@nestly.co.za", phone: "+27 72 555 0303", role: "legal", status: "active", scope: "all", overrides: {}, invitedAt: "2025-05-14", joinedAt: "2025-05-15", lastActive: `${addDaysIso(t, -3)}T11:20:00` },
    { id: "s5", name: "Themba Ndlovu", email: "themba@nestly.co.za", phone: "+27 76 555 0304", role: "caretaker", status: "active", scope: ["p3", "p4"], spendLimit: 1500, overrides: { reports: { view: true } }, invitedAt: "2025-08-01", joinedAt: "2025-08-02", lastActive: `${addDaysIso(t, -2)}T09:05:00` },
    { id: "s6", name: "Kagiso Molefe", email: "kagiso.molefe@mail.co.za", phone: "+27 79 555 0305", role: "agent", status: "invited", scope: ["p4"], overrides: {}, invitedAt: addDaysIso(t, -2), inviteToken: "inv-s6", inviteExpires: addDaysIso(t, 5) },
    { id: "s7", name: "Lindiwe Khoza-Abrahams", email: "lindiwe.khoza-abrahams@khozaabrahamsbookkeeping.co.za", phone: "+27 71 555 0306", role: "finance", status: "deactivated", scope: "all", overrides: {}, invitedAt: "2024-11-01", joinedAt: "2024-11-02", lastActive: "2026-06-30T15:00:00" },
  ];
}
export const seedPresets = (): Record<StaffRole, PermSet> => structuredClone(DEFAULT_PRESETS);

/* ---------- Legal: notices ---------- */
export const NOTICE_KINDS = ["reminder", "demand", "breach", "termination", "renewal"] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];
export type NoticeTemplate = { kind: NoticeKind; subject: string; body: string; fields: string[] };
export const NOTICE_TEMPLATES: NoticeTemplate[] = [
  { kind: "reminder", subject: "Rent reminder — {{unit}}, {{property_name}}", fields: ["tenant_name", "unit", "property_name", "amount_due", "due_date", "landlord_name"],
    body: "Dear {{tenant_name}},\n\nThis is a friendly reminder that {{amount_due}} is outstanding on your account for {{unit}}, {{property_name}}. Please pay by {{due_date}} using your usual reference, or pay in the Nestly app.\n\nIf you've already paid, please ignore this message.\n\nKind regards,\n{{landlord_name}}" },
  { kind: "demand", subject: "Letter of demand — {{unit}}, {{property_name}}", fields: ["tenant_name", "tenant_id", "unit", "property_address", "amount_due", "remedy_date", "landlord_name", "today"],
    body: "{{today}}\n\nDear {{tenant_name}} (ID {{tenant_id}}),\n\nLETTER OF DEMAND: ARREAR RENTAL — {{unit}}, {{property_address}}\n\nAccording to our records, the amount of {{amount_due}} is due and payable in terms of your lease agreement. We hereby demand payment of the full amount on or before {{remedy_date}}.\n\nShould payment not be received by that date, we reserve our rights in terms of the lease, which may include cancelling the lease and instituting legal proceedings to recover the amount owed.\n\nIf you are unable to pay, please contact us before {{remedy_date}} to discuss a payment arrangement.\n\nYours faithfully,\n{{landlord_name}}" },
  { kind: "breach", subject: "Notice of breach — {{unit}}, {{property_name}}", fields: ["tenant_name", "unit", "property_address", "breach_details", "remedy_date", "landlord_name", "today"],
    body: "{{today}}\n\nDear {{tenant_name}},\n\nNOTICE OF BREACH OF LEASE — {{unit}}, {{property_address}}\n\nYou are in breach of your lease agreement in the following respect: {{breach_details}}\n\nIn terms of the lease and section 14 of the Consumer Protection Act, you are required to remedy this breach within 20 business days, on or before {{remedy_date}}. If the breach is not remedied by that date, we may cancel the lease.\n\nYours faithfully,\n{{landlord_name}}" },
  { kind: "termination", subject: "Notice of cancellation of lease — {{unit}}, {{property_name}}", fields: ["tenant_name", "unit", "property_address", "breach_details", "vacate_date", "landlord_name", "today"],
    body: "{{today}}\n\nDear {{tenant_name}},\n\nNOTICE OF CANCELLATION OF LEASE — {{unit}}, {{property_address}}\n\nWe refer to our earlier notice of breach ({{breach_details}}). As the breach was not remedied within the period allowed, the lease is cancelled with effect from today. You are requested to vacate the premises by {{vacate_date}}.\n\nPlease note: you may only be evicted by an order of court. We will not lock you out, disconnect services or remove your belongings.\n\nYours faithfully,\n{{landlord_name}}" },
  { kind: "renewal", subject: "Your lease renewal — {{unit}}, {{property_name}}", fields: ["tenant_name", "unit", "property_name", "lease_end", "new_rent", "landlord_name"],
    body: "Dear {{tenant_name}},\n\nYour lease for {{unit}}, {{property_name}} ends on {{lease_end}}. We'd love to have you stay. We're offering a renewal for a further 12 months at {{new_rent}} per month.\n\nPlease let us know within 20 business days whether you'd like to renew. If we don't hear from you, the lease will continue month-to-month on the same terms.\n\nKind regards,\n{{landlord_name}}" },
];

export type Notice = {
  id: string; number: string; kind: NoticeKind; tenantId: string; propertyId: string; unitId: string;
  subject: string; body: string; values: Record<string, string>; deliveries: Delivery[]; sentAt: string; sentBy: string; caseId?: string | undefined;
};
const sent = (channel: NoticeChannel, at: string, failReason?: string): Delivery => ({ channel, sentAt: at, ...(failReason ? { failed: true, failReason } : {}) });

export function seedNotices(): Notice[] {
  return [
    { id: "nt1", number: "NTC-2026-0011", kind: "reminder", tenantId: "t2", propertyId: "p1", unitId: "u2", subject: "Rent reminder — A102, Sunset Gardens", body: "Dear Pieter van der Merwe,\n\nThis is a friendly reminder that R 8 900,00 is outstanding on your account for A102, Sunset Gardens. Please pay by 07 Oct 2026.\n\nKind regards,\nJanice Tinto", values: {}, deliveries: [sent("email", "2026-10-03T09:00:00"), sent("whatsapp", "2026-10-03T09:00:00")], sentAt: "2026-10-03T09:00:00", sentBy: "Ravi Naidoo" },
    { id: "nt2", number: "NTC-2026-0012", kind: "demand", tenantId: "t2", propertyId: "p1", unitId: "u2", subject: "Letter of demand — A102, Sunset Gardens", body: "Dear Pieter van der Merwe,\n\nLETTER OF DEMAND: ARREAR RENTAL — A102, 12 Rivonia Road, Sandton\n\nThe amount of R 17 800,00 is due and payable. We demand payment on or before 30 Oct 2026.\n\nYours faithfully,\nJanice Tinto", values: {}, deliveries: [sent("email", "2026-10-16T10:30:00"), sent("registered_post", "2026-10-16T10:30:00"), sent("sms", "2026-10-16T10:30:00", "Handset unreachable")], sentAt: "2026-10-16T10:30:00", sentBy: "Zanele Mthembu", caseId: "ev1" },
    { id: "nt3", number: "NTC-2026-0013", kind: "renewal", tenantId: "t1", propertyId: "p1", unitId: "u1", subject: "Your lease renewal — A101, Sunset Gardens", body: "Dear Thandiwe Nkosi,\n\nYour lease for A101, Sunset Gardens ends on 30 Nov 2026. We're offering a renewal for a further 12 months at R 13 500,00 per month.\n\nKind regards,\nJanice Tinto", values: {}, deliveries: [sent("email", "2026-10-28T08:15:00"), sent("whatsapp", "2026-10-28T08:15:00")], sentAt: "2026-10-28T08:15:00", sentBy: "Janice Tinto" },
    { id: "nt4", number: "NTC-2026-0014", kind: "breach", tenantId: "t6", propertyId: "p4", unitId: "u7", subject: "Notice of breach — PH1, Camps Bay Ocean View Residences & Penthouse Collection", body: "Dear Johannes Botha-Fitzgerald Mahlangu,\n\nNOTICE OF BREACH OF LEASE — PH1\n\nYou are in breach of your lease: an unregistered dog is being kept in the unit, contrary to clause 14 (pets).\n\nPlease remedy this within 20 business days.\n\nYours faithfully,\nJanice Tinto", values: {}, deliveries: [sent("email", "2026-11-02T14:00:00"), sent("hand", "2026-11-02T14:00:00")], sentAt: "2026-11-02T14:00:00", sentBy: "Zanele Mthembu" },
  ];
}

/* ---------- Legal: eviction pipeline ---------- */
export type EvictionReason = "arrears" | "breach" | "holding_over";
export type EvictionCase = {
  id: string; number: string; tenantId: string; propertyId: string; unitId: string; reason: EvictionReason; amount?: number | undefined;
  attorney: string; openedAt: string; stage: number; stages: Partial<Record<EvictionStage, StageRecord>>;
  closed?: { outcome: EvictionOutcome; at: string; note: string } | undefined;
};
const doc = (name: string, size = 240_000) => ({ name, size, type: "application/pdf" });
export function seedCases(): EvictionCase[] {
  return [
    { id: "ev1", number: "EV-2026-002", tenantId: "t2", propertyId: "p1", unitId: "u2", reason: "arrears", amount: 17800, attorney: "Mokoena & Partners Attorneys (Sandton)", openedAt: "2026-10-16", stage: 2,
      stages: {
        breach_notice: { date: "2026-10-16", note: "Letter of demand served by email and registered post. 20 business days to pay.", docs: [doc("Letter of demand NTC-2026-0012.pdf"), doc("Registered post slip RD 4471 0021 ZA.pdf", 90_000)] },
        cancellation: { date: "2026-11-04", note: "Arrears not paid. Lease cancelled in writing.", docs: [doc("Notice of cancellation.pdf")] },
        application: { note: "Attorney preparing the eviction application for the Randburg Magistrate's Court.", docs: [] },
      } },
    { id: "ev2", number: "EV-2026-001", tenantId: "t7", propertyId: "p3", unitId: "u8", reason: "breach", attorney: "In-house (Zanele Mthembu)", openedAt: "2026-06-02", stage: 1,
      stages: { breach_notice: { date: "2026-06-02", note: "Noise complaints — breach notice served.", docs: [doc("Breach notice June 2026.pdf")] } },
      closed: { outcome: "remedied", at: "2026-06-24", note: "Tenant remedied the breach within the notice period. No further action." } },
  ];
}

/* ---------- Schedule ---------- */
export type CalKind = "inspection" | "maintenance" | "viewing";
export type CalStatus = "confirmed" | "pending";
export type CalEventRecord = {
  id: string; kind: CalKind; title: string; date: string; time: string; duration: number; propertyId: string; unitId?: string | undefined;
  withName: string; withRole: string; withPhone?: string | undefined; status: CalStatus; notes: string; requestId?: string | undefined;
};
export type CalOverride = { date?: string | undefined; time?: string | undefined; status?: CalStatus | undefined };
export function seedVisits(): CalEventRecord[] {
  const t = todayIso();
  return [
    { id: "v1", kind: "maintenance", title: "Geyser repair", date: t, time: "09:00", duration: 90, propertyId: "p1", unitId: "u1", withName: "Mandla Sithole", withRole: "Sithole Plumbing & Geysers", withPhone: "+27 82 555 0410", status: "confirmed", notes: "Tenant switched the geyser off at the DB board. Access via the caretaker's office.", requestId: "r1" },
    { id: "v2", kind: "maintenance", title: "Shower drain unblock", date: t, time: "13:00", duration: 60, propertyId: "p4", unitId: "u7", withName: "Atlantic Handyman Services", withRole: "Contractor", withPhone: "+27 21 555 0450", status: "pending", notes: "Confirm access time with the tenant first.", requestId: "r8" },
    { id: "v3", kind: "maintenance", title: "Gate motor battery replacement", date: addDaysIso(t, 1), time: "10:00", duration: 60, propertyId: "p3", unitId: "u6", withName: "Riaan Pretorius", withRole: "Secure Gate Automation", withPhone: "+27 84 555 0433", status: "confirmed", notes: "Bring a 7Ah battery. Old one is 3 years old.", requestId: "r3" },
    { id: "v4", kind: "maintenance", title: "Prepaid meter site visit", date: addDaysIso(t, 3), time: "11:00", duration: 45, propertyId: "p2", unitId: "u4", withName: "Charmaine Jacobs", withRole: "Bright Spark Electrical", withPhone: "+27 83 555 0422", status: "pending", notes: "Measure the DB board before the quote is approved.", requestId: "r2" },
    { id: "v5", kind: "viewing", title: "Show day — Loft 7", date: addDaysIso(t, 2), time: "10:00", duration: 120, propertyId: "p2", unitId: "u5", withName: "Chantelle Adams", withRole: "Agent", withPhone: "+27 83 555 0301", status: "confirmed", notes: "Open viewing for walk-ins. Parking bay 7 is free for visitors." },
  ];
}

/* ---------- Announcements ---------- */
export const ANN_CATEGORIES = ["general", "maintenance", "emergency", "rules", "event"] as const;
export type AnnCategory = (typeof ANN_CATEGORIES)[number];
export type AnnChannel = "inapp" | "email" | "whatsapp" | "sms";
export type Audience = { kind: "all" } | { kind: "property"; propertyId: string } | { kind: "units"; propertyId: string; unitIds: string[] };
export type Announcement = {
  id: string; title: string; body: string; category: AnnCategory; audience: Audience; channels: AnnChannel[];
  status: "draft" | "scheduled" | "sent"; scheduledFor?: string | undefined; sentAt?: string | undefined;
  createdBy: string; createdAt: string; pinned: boolean; readBy: string[]; baseReads: number;
};
export function seedAnnouncements(): Announcement[] {
  const t = todayIso();
  return [
    { id: "an1", title: "Water off on Saturday 08:00–14:00", body: "Johannesburg Water is replacing a valve on Rivonia Road. Please fill bottles and the kettle on Friday night. The pool will stay closed until 16:00.", category: "emergency", audience: { kind: "property", propertyId: "p1" }, channels: ["inapp", "whatsapp", "sms"], status: "sent", sentAt: `${addDaysIso(t, -1)}T17:30:00`, createdBy: "Bongani Zulu", createdAt: addDaysIso(t, -1), pinned: true, readBy: [], baseReads: 19 },
    { id: "an2", title: "Welcome to the Nestly tenant app", body: "You can now pay rent, log faults with photos and see your lease in one place. Tap Requests to report anything that needs fixing.", category: "general", audience: { kind: "all" }, channels: ["inapp", "email"], status: "sent", sentAt: "2026-10-01T09:00:00", createdBy: "Janice Tinto", createdAt: "2026-10-01", pinned: false, readBy: ["t1"], baseReads: 41 },
    { id: "an3", title: "Gate motor service — use the pedestrian gate", body: "Secure Gate Automation services the main gate on Monday. Use the pedestrian gate with your tag between 09:00 and 12:00.", category: "maintenance", audience: { kind: "property", propertyId: "p3" }, channels: ["inapp", "whatsapp"], status: "sent", sentAt: `${addDaysIso(t, -4)}T08:00:00`, createdBy: "Themba Ndlovu", createdAt: addDaysIso(t, -4), pinned: false, readBy: [], baseReads: 7 },
    { id: "an4", title: "Festive season braai area bookings", body: "The braai area can be booked for up to 4 hours at a time from 1 December. Please clean up and be quiet after 22:00.", category: "event", audience: { kind: "property", propertyId: "p1" }, channels: ["inapp", "email"], status: "scheduled", scheduledFor: `${addDaysIso(t, 5)}T09:00:00`, createdBy: "Janice Tinto", createdAt: t, pinned: false, readBy: [], baseReads: 0 },
    { id: "an5", title: "New refuse days for Loft 3 and Loft 7", body: "Pikitup now collects on Tuesdays from 06:00. Please put bins out the night before.", category: "rules", audience: { kind: "units", propertyId: "p2", unitIds: ["u4", "u5"] }, channels: ["inapp"], status: "draft", createdBy: "Janice Tinto", createdAt: t, pinned: false, readBy: [], baseReads: 0 },
  ];
}

/* ---------- Settings ---------- */
export const NOTIF_EVENTS = ["rent_due", "payment_received", "rent_overdue", "request_new", "request_update", "invoice_issued", "lease_expiring", "signature_done", "application_new", "notice_served", "announcement", "staff_activity"] as const;
export type NotifEvent = (typeof NOTIF_EVENTS)[number];
export const NOTIF_CHANNELS = ["inapp", "email", "whatsapp", "sms"] as const;
export type NotifChannel = (typeof NOTIF_CHANNELS)[number];
export type NotifPrefs = Record<NotifEvent, Record<NotifChannel, boolean>>;
export const defaultPrefs = (): NotifPrefs =>
  Object.fromEntries(NOTIF_EVENTS.map((e) => [e, { inapp: true, email: e !== "announcement" && e !== "staff_activity", whatsapp: e === "rent_overdue" || e === "request_update", sms: false }])) as NotifPrefs;

export type Company = {
  name: string; tradingAs: string; regNo: string; vatNo: string; address: string; email: string; phone: string;
  bank: string; accountNo: string; branch: string; logo?: string | undefined; footer: string;
};
export const seedCompany = (): Company => ({
  name: "Tinto Property Holdings (Pty) Ltd", tradingAs: "Janice Tinto Properties", regNo: "2019/482113/07", vatNo: "4870 123 456",
  address: "12 Rivonia Road, Sandton, 2196", email: "accounts@tintoproperty.co.za", phone: "+27 11 555 0100",
  bank: "FNB", accountNo: "6281 000 1234", branch: "250655", footer: "Thank you for renting with us.",
});
export type ProfilePrefs = { name?: string | undefined; phone?: string | undefined; twoFactor: boolean };

/* ---------- Subscription ---------- */
export type SubInvoice = { id: string; number: string; date: string; period: string; amount: number; status: "paid" | "due" };
export type Subscription = { cycle: "monthly" | "annual"; trialEnds: string; nextBilling: string; tiers: Record<string, Plan["id"]>; card: string; invoices: SubInvoice[] };
export const seedSubscription = (): Subscription => ({
  cycle: "monthly", trialEnds: "2025-02-28", nextBilling: "2026-12-01", tiers: {}, card: "Visa •••• 4821",
  invoices: [
    { id: "si5", number: "NST-2026-0110", date: "2026-11-01", period: "Nov 2026", amount: 2196, status: "paid" },
    { id: "si4", number: "NST-2026-0098", date: "2026-10-01", period: "Oct 2026", amount: 2196, status: "paid" },
    { id: "si3", number: "NST-2026-0085", date: "2026-09-01", period: "Sep 2026", amount: 1697, status: "paid" },
    { id: "si2", number: "NST-2026-0071", date: "2026-08-01", period: "Aug 2026", amount: 1697, status: "paid" },
    { id: "si1", number: "NST-2026-0060", date: "2026-07-01", period: "Jul 2026", amount: 1697, status: "paid" },
  ],
});

/* ---------- Audit log ---------- */
export type AuditArea = "staff" | "permissions" | "properties" | "tenants" | "invoices" | "leases" | "legal" | "announcements" | "settings" | "subscription" | "schedule" | "auth";
export type AuditRow = { id: string; at: string; actor: string; role: string; action: string; target: string; area: AuditArea; ip: string; device: string };
export function seedAudit(): AuditRow[] {
  const t = todayIso();
  const r = (id: string, day: number, time: string, actor: string, role: string, action: string, target: string, area: AuditArea, ip = "102.135.40.12", device = "Chrome on Windows"): AuditRow =>
    ({ id, at: `${addDaysIso(t, -day)}T${time}:00`, actor, role, action, target, area, ip, device });
  return [
    r("au1", 0, "08:12", "Bongani Zulu", "Caretaker", "Signed in", "Nestly web", "auth", "102.132.18.77", "Chrome on Android"),
    r("au2", 0, "07:55", "Ravi Naidoo", "Finance", "Exported payments CSV", "Payments · November", "invoices", "41.13.220.9", "Edge on Windows"),
    r("au3", 1, "17:30", "Bongani Zulu", "Caretaker", "Sent announcement", "Water off on Saturday 08:00–14:00", "announcements", "102.132.18.77", "Chrome on Android"),
    r("au4", 1, "16:40", "Chantelle Adams", "Agent", "Booked viewing", "Loft 7 · Megan Fourie", "schedule", "196.21.4.150", "Safari on iPhone"),
    r("au5", 2, "11:02", "Janice Tinto", "Owner / Admin", "Invited staff member", "Kagiso Molefe (Agent)", "staff"),
    r("au6", 2, "10:45", "Janice Tinto", "Owner / Admin", "Changed permissions", "Themba Ndlovu · Reports view on", "permissions"),
    r("au7", 3, "11:20", "Zanele Mthembu", "Legal", "Recorded stage date", "EV-2026-002 · Lease cancelled", "legal", "102.140.66.3", "Firefox on macOS"),
    r("au8", 4, "14:00", "Zanele Mthembu", "Legal", "Sent notice", "NTC-2026-0014 · Notice of breach", "legal", "102.140.66.3", "Firefox on macOS"),
    r("au9", 5, "09:30", "Janice Tinto", "Owner / Admin", "Approved quote", "REQ-1003 · R 1 450,00", "properties"),
    r("au10", 6, "15:12", "Ravi Naidoo", "Finance", "Recorded payment", "PAY-5007 · R 12 500,00", "invoices", "41.13.220.9", "Edge on Windows"),
    r("au11", 7, "08:15", "Janice Tinto", "Owner / Admin", "Sent notice", "NTC-2026-0013 · Lease renewal", "legal"),
    r("au12", 9, "12:40", "Janice Tinto", "Owner / Admin", "Updated company details", "Banking details", "settings"),
    r("au13", 12, "10:30", "Zanele Mthembu", "Legal", "Opened eviction case", "EV-2026-002 · A102", "legal", "102.140.66.3", "Firefox on macOS"),
    r("au14", 15, "09:00", "Janice Tinto", "Owner / Admin", "Deactivated staff member", "Lindiwe Khoza-Abrahams (Finance)", "staff"),
    r("au15", 20, "13:10", "Janice Tinto", "Owner / Admin", "Upgraded property plan", "Sunset Gardens → Pro", "subscription"),
    r("au16", 26, "16:05", "Chantelle Adams", "Agent", "Created draft lease", "L-2026-007 · Loft 7", "leases", "196.21.4.150", "Safari on iPhone"),
  ];
}
