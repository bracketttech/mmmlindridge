// Leasing mock data (Phase 8, UI only): leases, templates, e-signature envelopes, applications and inspections.

/* ---------- Leases ---------- */
export type LeaseState = "draft" | "active" | "month_to_month" | "ended";
export type Lease = {
  id: string; number: string; tenantId: string; coTenant?: string | undefined;
  propertyId: string; unitId: string;
  start: string; end: string; rent: number; escalationPct: number; deposit: number; noticeDays: number; rentDueDay: number;
  specialTerms: string[]; templateId: string; state: LeaseState;
  reminders: { d90: boolean; d60: boolean; d30: boolean };
  history: { at: string; note: string }[];
  createdAt: string;
};

/* ---------- Templates ---------- */
export const ENV_KINDS = ["lease", "addendum", "notice", "inspection", "checklist"] as const;
export type EnvKind = (typeof ENV_KINDS)[number];
export type TemplateSection = { id: string; heading: string; body: string };
export type LeaseTemplate = { id: string; name: string; kind: EnvKind; description: string; sections: TemplateSection[]; updatedAt: string };
export const MERGE_FIELDS = ["tenant_name", "tenant_id", "co_tenant", "landlord_name", "property_name", "property_address", "unit", "lease_start", "lease_end", "rent", "deposit", "escalation", "notice_period", "rent_due_day", "special_terms", "today"] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];

/* ---------- E-signature ---------- */
export const SIGNER_ROLES = ["owner", "tenant", "co_tenant", "surety", "witness"] as const;
export type SignerRole = (typeof SIGNER_ROLES)[number];
export type SignerState = "pending" | "viewed" | "signed" | "declined";
export type SignMethod = "draw" | "type" | "upload";
export type Signer = {
  id: string; name: string; email: string; phone: string; role: SignerRole; state: SignerState; token: string;
  viewedAt?: string | undefined; signedAt?: string | undefined; method?: SignMethod | undefined;
  /** Signature image as a data URL. */
  signature?: string | undefined; declineReason?: string | undefined;
};
export const FIELD_TYPES = ["signature", "initial", "date"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
/** x is a percentage of the section width (stays put at any preview size); y is pixels down the section's signing strip. */
export type SignField = { id: string; signerId: string; type: FieldType; page: number; x: number; y: number };
export type AuditKind = "created" | "sent" | "viewed" | "signed" | "declined" | "reminded" | "expired" | "completed" | "voided";
export type AuditEvent = { id: string; at: string; kind: AuditKind; actor: string; ip?: string | undefined; device?: string | undefined; note?: string | undefined };
export type EnvStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired" | "voided";
export type Envelope = {
  id: string; title: string; kind: EnvKind; leaseId?: string | undefined; inspectionId?: string | undefined;
  pages: TemplateSection[]; signers: Signer[]; fields: SignField[];
  createdAt: string; createdBy: string; sentAt?: string | undefined; expiresAt?: string | undefined; message?: string | undefined;
  voided?: boolean | undefined; audit: AuditEvent[];
};

/* ---------- Applications & screening ---------- */
export const APP_STAGES = ["enquiry", "viewing", "applied", "screening", "approved", "declined"] as const;
export type AppStage = (typeof APP_STAGES)[number];
export const APP_SOURCES = ["link", "property24", "private_property", "walk_in", "referral", "whatsapp"] as const;
export type AppSource = (typeof APP_SOURCES)[number];
export const CHECK_KEYS = ["id", "income", "employer", "credit", "landlord", "background", "affordability", "popia", "deposit"] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];
export type CheckResult = "pass" | "concern" | "fail";
export type FileMeta = { name: string; size: number; type: string };
export type ScreeningCheck = { done: boolean; result?: CheckResult | undefined; notes: string; date?: string | undefined; attachment?: FileMeta | undefined };
export type Viewing = { date: string; time: string; state: "booked" | "done" | "no_show" };
export type Application = {
  id: string; name: string; email: string; phone: string; idNumber: string;
  propertyId: string; unitId: string; stage: AppStage; source: AppSource;
  income: number; employer: string; moveIn: string; occupants: number; message: string;
  viewing?: Viewing | undefined; popiaConsent: boolean; creditConsent: boolean; docs: FileMeta[];
  checks: Partial<Record<CheckKey, ScreeningCheck>>; ready: boolean;
  declineReason?: string | undefined; tenantId?: string | undefined; leaseId?: string | undefined;
  createdAt: string; history: { at: string; note: string }[];
};

/* ---------- Inspections ---------- */
export type Condition = "good" | "fair" | "poor" | "na";
export type InspItem = { id: string; name: string; condition?: Condition | undefined; note: string };
export type InspPhoto = { id: string; name: string; url: string };
export type InspRoom = { id: string; name: string; items: InspItem[]; photos: InspPhoto[] };
export type InspState = "scheduled" | "in_progress" | "awaiting_signoff" | "signed";
export type Inspection = {
  id: string; type: "incoming" | "outgoing"; propertyId: string; unitId: string; tenantId: string; leaseId?: string | undefined;
  date: string; inspector: string; rooms: InspRoom[]; envelopeId?: string | undefined; notes: string; createdAt: string;
};

export const DEFAULT_ROOMS: [string, string[]][] = [
  ["Entrance & lounge", ["Walls & paint", "Floors", "Windows & curtains", "Lights & plugs", "Doors & locks"]],
  ["Kitchen", ["Cupboards", "Counter tops", "Stove & oven", "Sink & taps", "Walls & floors"]],
  ["Bedroom 1", ["Walls & paint", "Floors / carpets", "Built-in cupboards", "Windows", "Lights & plugs"]],
  ["Bathroom", ["Bath / shower", "Toilet", "Basin & taps", "Tiles & grout", "Extractor fan"]],
  ["Exterior & parking", ["Balcony / garden", "Parking bay", "Remotes & keys", "Meters"]],
];
export function buildRooms(prefix: string, fill?: (room: number, item: number) => Condition | undefined): InspRoom[] {
  return DEFAULT_ROOMS.map(([name, items], r) => ({
    id: `${prefix}r${r}`, name, photos: [],
    items: items.map((n, i) => ({ id: `${prefix}r${r}i${i}`, name: n, condition: fill?.(r, i), note: "" })),
  }));
}

/* ---------- Seeds ---------- */
const OWNER = { name: "Janice Tinto", email: "janice@tintoproperties.co.za", phone: "+27 82 555 0100" };
const ev = (id: string, at: string, kind: AuditKind, actor: string, extra: Partial<AuditEvent> = {}): AuditEvent => ({ id, at, kind, actor, ...extra });
const r = (n: number) => ({ d90: true, d60: true, d30: n > 0 });

export function seedLeases(): Lease[] {
  const L = (id: string, n: number, tenantId: string, propertyId: string, unitId: string, start: string, end: string, rent: number, deposit: number, extra: Partial<Lease> = {}): Lease => ({
    id, number: `L-${start.slice(0, 4)}-${String(n).padStart(3, "0")}`, tenantId, propertyId, unitId, start, end, rent, deposit,
    escalationPct: 8, noticeDays: 30, rentDueDay: 1, specialTerms: [], templateId: "tpl-res", state: "active", reminders: r(1),
    history: [{ at: start, note: "Lease started" }], createdAt: start, ...extra,
  });
  return [
    L("l1", 12, "t1", "p1", "u1", "2025-12-01", "2026-11-30", 12500, 12500, { specialTerms: ["One allocated parking bay (P14).", "No pets without written consent."] }),
    L("l2", 4, "t2", "p1", "u2", "2025-03-01", "2027-02-28", 8900, 8900, { escalationPct: 7, specialTerms: ["Surety: Hendrik van der Merwe (signed deed of suretyship)."] }),
    L("l3", 2, "t3", "p2", "u4", "2026-02-01", "2027-01-31", 11200, 11200, { specialTerms: ["Tenant may install a fibre router in the lounge."] }),
    L("l4", 31, "t4", "p1", "u3", "2024-12-01", "2026-11-30", 16800, 16800, { history: [{ at: "2024-12-01", note: "Lease started" }, { at: "2026-10-28", note: "Tenant gave notice to vacate on 30 Nov 2026" }] }),
    L("l5", 18, "t5", "p3", "u6", "2025-09-01", "2026-08-31", 28000, 28000, { state: "month_to_month", noticeDays: 30, history: [{ at: "2025-09-01", note: "Lease started" }, { at: "2026-09-01", note: "Converted to month-to-month" }] }),
    L("l6", 41, "t6", "p4", "u7", "2026-12-01", "2027-11-30", 26500, 26500, { state: "draft", createdAt: "2026-10-30", history: [{ at: "2026-10-30", note: "Draft lease created" }], specialTerms: ["Penthouse rooftop access between 06:00 and 22:00.", "Two parking bays (PH-A, PH-B)."] }),
    L("l7", 3, "t7", "p3", "u8", "2026-01-15", "2026-12-14", 6500, 6500, { escalationPct: 6, coTenant: undefined, specialTerms: ["Surety: Sibusiso Khumalo (father)."] }),
  ];
}

const RES_SECTIONS: TemplateSection[] = [
  { id: "s1", heading: "1. Parties", body: "This lease is entered into between {{landlord_name}} (the Landlord) and {{tenant_name}}, ID {{tenant_id}} (the Tenant). Co-tenant: {{co_tenant}}." },
  { id: "s2", heading: "2. Premises", body: "The Landlord lets to the Tenant unit {{unit}} at {{property_name}}, {{property_address}} (the Premises)." },
  { id: "s3", heading: "3. Term", body: "The lease starts on {{lease_start}} and ends on {{lease_end}}. If the Tenant stays on after the end date with the Landlord's consent, the lease continues month-to-month on the same terms." },
  { id: "s4", heading: "4. Rent and escalation", body: "Rent is {{rent}} per month, payable on or before day {{rent_due_day}} of each month. Rent escalates by {{escalation}} on each anniversary of the start date." },
  { id: "s5", heading: "5. Deposit", body: "The Tenant pays a deposit of {{deposit}}. The Landlord keeps it in an interest-bearing account as required by the Rental Housing Act 50 of 1999 and refunds it with interest, less itemised deductions, after the outgoing inspection." },
  { id: "s6", heading: "6. Notice and cancellation", body: "Either party may end the lease on {{notice_period}} written notice, subject to the Consumer Protection Act 68 of 2008." },
  { id: "s7", heading: "7. Inspections", body: "The parties inspect the Premises together before move-in and within three days before move-out, and record defects in a signed condition report." },
  { id: "s8", heading: "8. Special terms", body: "{{special_terms}}" },
  { id: "s9", heading: "9. Signatures", body: "The parties agree that electronic signatures are valid under the Electronic Communications and Transactions Act 25 of 2002. Signed on {{today}}." },
];

export function seedTemplates(): LeaseTemplate[] {
  return [
    { id: "tpl-res", name: "Residential lease (SA)", kind: "lease", description: "Fixed-term residential lease aligned with the Rental Housing Act, CPA and ECTA.", sections: RES_SECTIONS, updatedAt: "2026-09-12" },
    { id: "tpl-add", name: "Lease addendum", kind: "addendum", description: "Adds or changes terms of an existing lease.", updatedAt: "2026-08-03", sections: [
      { id: "s1", heading: "1. Lease", body: "This addendum forms part of the lease between {{landlord_name}} and {{tenant_name}} for unit {{unit}}, {{property_name}}." },
      { id: "s2", heading: "2. Change", body: "The parties agree to the following change: {{special_terms}}" },
      { id: "s3", heading: "3. Everything else", body: "All other terms of the lease stay the same. Signed on {{today}}." },
    ] },
    { id: "tpl-notice", name: "Renewal offer / notice", kind: "notice", description: "Offers renewal or gives notice before the lease ends (CPA: 40–80 business days).", updatedAt: "2026-07-21", sections: [
      { id: "s1", heading: "Notice to {{tenant_name}}", body: "Your lease for unit {{unit}} at {{property_name}} ends on {{lease_end}}." },
      { id: "s2", heading: "Renewal", body: "We'd like to offer you a renewal at {{rent}} per month. If you do nothing, the lease continues month-to-month with {{notice_period}} notice." },
      { id: "s3", heading: "Acknowledgement", body: "Please sign to confirm you've received this notice. Date: {{today}}." },
    ] },
    { id: "tpl-insp", name: "Inspection sign-off", kind: "inspection", description: "Condition report sign-off for incoming and outgoing inspections.", updatedAt: "2026-06-30", sections: [
      { id: "s1", heading: "Condition report", body: "Inspection of unit {{unit}}, {{property_name}}, for {{tenant_name}}." },
      { id: "s2", heading: "Agreement", body: "By signing, the Tenant and Landlord agree that the attached room-by-room report and photos reflect the condition of the Premises on {{today}}." },
    ] },
    { id: "tpl-check", name: "Move-in / move-out checklist", kind: "checklist", description: "Keys, remotes, meter readings and handover items.", updatedAt: "2026-06-30", sections: [
      { id: "s1", heading: "Handover", body: "Keys and remotes handed over for unit {{unit}}, {{property_name}}, to {{tenant_name}} on {{today}}." },
      { id: "s2", heading: "Meters", body: "Electricity and water meter readings are recorded on the attached checklist." },
    ] },
  ];
}

const T6 = { name: "Johannes Botha-Fitzgerald Mahlangu", email: "johannes.botha.fitzgerald.mahlangu@longcompanyname.co.za", phone: "+27 76 555 0188" };
const T1 = { name: "Thandiwe Nkosi", email: "thandiwe.nkosi@mail.co.za", phone: "+27 82 555 0141" };
const T3 = { name: "Lerato Mokoena", email: "lerato.mokoena@mail.co.za", phone: "+27 71 555 0102" };
const T2 = { name: "Pieter van der Merwe", email: "pieter.vdm@mail.co.za", phone: "+27 83 555 0177" };
const T7 = { name: "Naledi Khumalo", email: "naledi.k@mail.co.za", phone: "+27 79 555 0110" };
const DEV = "Chrome on Android";
const DEV2 = "Safari on iPhone";
const DEV3 = "Edge on Windows";
const sig = (name: string) => `typed:${name}`;
const ADD_PAGES = (change: string, who: string, unit: string, prop: string) => [
  { id: "p1", heading: "1. Lease", body: `This addendum forms part of the lease between Janice Tinto and ${who} for unit ${unit}, ${prop}.` },
  { id: "p2", heading: "2. Change", body: change },
  { id: "p3", heading: "3. Everything else", body: "All other terms of the lease stay the same." },
];

export function seedEnvelopes(): Envelope[] {
  return [
    {
      id: "e1", title: "Lease agreement — PH1, Camps Bay", kind: "lease", leaseId: "l6", pages: [], createdAt: "2026-10-30", createdBy: OWNER.name,
      sentAt: "2026-11-02T09:14:00", expiresAt: "2026-11-16", message: "Please review and sign your new lease.",
      signers: [
        { id: "e1s1", ...OWNER, role: "owner", state: "signed", token: "sign-e1-owner", viewedAt: "2026-11-02T09:15:00", signedAt: "2026-11-02T09:16:00", method: "type", signature: sig(OWNER.name) },
        { id: "e1s2", ...T6, role: "tenant", state: "viewed", token: "sign-e1-tenant", viewedAt: "2026-11-03T18:42:00" },
      ],
      fields: [{ id: "f1", signerId: "e1s1", type: "signature", page: 8, x: 8, y: 8 }, { id: "f2", signerId: "e1s1", type: "date", page: 8, x: 8, y: 54 }, { id: "f3", signerId: "e1s2", type: "signature", page: 8, x: 55, y: 8 }, { id: "f4", signerId: "e1s2", type: "date", page: 8, x: 55, y: 54 }, { id: "f5", signerId: "e1s2", type: "initial", page: 3, x: 80, y: 54 }],
      audit: [
        ev("a1", "2026-10-30T15:02:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 }),
        ev("a2", "2026-11-02T09:14:00", "sent", OWNER.name, { ip: "196.25.14.8", device: DEV3, note: "Email and WhatsApp" }),
        ev("a3", "2026-11-02T09:16:00", "signed", OWNER.name, { ip: "196.25.14.8", device: DEV3 }),
        ev("a4", "2026-11-03T18:42:00", "viewed", T6.name, { ip: "102.132.88.41", device: DEV2 }),
      ],
    },
    {
      id: "e2", title: "Lease agreement — Loft 3, Rosebank", kind: "lease", leaseId: "l3", pages: [], createdAt: "2026-01-18", createdBy: OWNER.name,
      sentAt: "2026-01-18T10:00:00", expiresAt: "2026-02-01",
      signers: [
        { id: "e2s1", ...T3, role: "tenant", state: "signed", token: "sign-e2-tenant", viewedAt: "2026-01-19T07:30:00", signedAt: "2026-01-19T07:41:00", method: "draw", signature: sig(T3.name) },
        { id: "e2s2", ...OWNER, role: "owner", state: "signed", token: "sign-e2-owner", viewedAt: "2026-01-19T12:00:00", signedAt: "2026-01-19T12:02:00", method: "type", signature: sig(OWNER.name) },
      ],
      fields: [{ id: "f1", signerId: "e2s1", type: "signature", page: 8, x: 8, y: 8 }, { id: "f2", signerId: "e2s2", type: "signature", page: 8, x: 55, y: 8 }],
      audit: [
        ev("a1", "2026-01-18T09:50:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 }),
        ev("a2", "2026-01-18T10:00:00", "sent", OWNER.name, { ip: "196.25.14.8", device: DEV3, note: "Email" }),
        ev("a3", "2026-01-19T07:30:00", "viewed", T3.name, { ip: "41.13.200.7", device: DEV }),
        ev("a4", "2026-01-19T07:41:00", "signed", T3.name, { ip: "41.13.200.7", device: DEV }),
        ev("a5", "2026-01-19T12:02:00", "signed", OWNER.name, { ip: "196.25.14.8", device: DEV3 }),
        ev("a6", "2026-01-19T12:02:00", "completed", "Nestly"),
      ],
    },
    {
      id: "e3", title: "Pet addendum — A102", kind: "addendum", leaseId: "l2", createdAt: "2026-10-20", createdBy: OWNER.name, sentAt: "2026-10-20T11:00:00", expiresAt: "2026-11-03",
      pages: ADD_PAGES("The Tenant may keep one small dog. A pet deposit of R 2 500,00 is payable before the dog moves in.", T2.name, "A102", "Sunset Gardens"),
      signers: [
        { id: "e3s1", ...T2, role: "tenant", state: "declined", token: "sign-e3-tenant", viewedAt: "2026-10-21T19:05:00", declineReason: "I'd like the pet deposit amount reviewed first." },
        { id: "e3s2", ...OWNER, role: "owner", state: "pending", token: "sign-e3-owner" },
      ],
      fields: [{ id: "f1", signerId: "e3s1", type: "signature", page: 2, x: 8, y: 8 }, { id: "f2", signerId: "e3s2", type: "signature", page: 2, x: 55, y: 8 }],
      audit: [
        ev("a1", "2026-10-20T10:40:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 }),
        ev("a2", "2026-10-20T11:00:00", "sent", OWNER.name, { ip: "196.25.14.8", device: DEV3, note: "Email" }),
        ev("a3", "2026-10-21T19:05:00", "viewed", T2.name, { ip: "105.245.10.3", device: DEV }),
        ev("a4", "2026-10-21T19:07:00", "declined", T2.name, { ip: "105.245.10.3", device: DEV, note: "I'd like the pet deposit amount reviewed first." }),
      ],
    },
    {
      id: "e4", title: "Rent escalation notice — Villa 5", kind: "notice", leaseId: "l7", createdAt: "2026-10-01", createdBy: OWNER.name, sentAt: "2026-10-01T08:30:00", expiresAt: "2026-10-15",
      pages: [{ id: "p1", heading: "Notice to Naledi Khumalo", body: "Your rent for Villa 5, Bryanston Villas, escalates by 6% to R 6 890,00 from 15 January 2027." }, { id: "p2", heading: "Acknowledgement", body: "Please sign to confirm you've received this notice." }],
      signers: [{ id: "e4s1", ...T7, role: "tenant", state: "pending", token: "sign-e4-tenant" }],
      fields: [{ id: "f1", signerId: "e4s1", type: "signature", page: 1, x: 8, y: 8 }],
      audit: [ev("a1", "2026-10-01T08:20:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 }), ev("a2", "2026-10-01T08:30:00", "sent", OWNER.name, { ip: "196.25.14.8", device: DEV3, note: "SMS" }), ev("a3", "2026-10-08T08:30:00", "reminded", OWNER.name)],
    },
    {
      id: "e5", title: "Lease renewal — A101, Sunset Gardens", kind: "lease", leaseId: "l1", pages: [], createdAt: "2026-11-04", createdBy: OWNER.name,
      signers: [{ id: "e5s1", ...T1, role: "tenant", state: "pending", token: "sign-e5-tenant" }, { id: "e5s2", ...OWNER, role: "owner", state: "pending", token: "sign-e5-owner" }],
      fields: [], audit: [ev("a1", "2026-11-04T16:10:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 })],
    },
    {
      id: "e6", title: "Incoming inspection — Loft 3", kind: "inspection", inspectionId: "i1", leaseId: "l3", createdAt: "2026-02-01", createdBy: OWNER.name, sentAt: "2026-02-01T12:00:00", expiresAt: "2026-02-15",
      pages: [{ id: "p1", heading: "Condition report", body: "Incoming inspection of Loft 3, Rosebank Lofts, for Lerato Mokoena." }, { id: "p2", heading: "Agreement", body: "By signing, the Tenant and Landlord agree that the room-by-room report and photos reflect the condition of the Premises." }],
      signers: [{ id: "e6s1", ...T3, role: "tenant", state: "signed", token: "sign-e6-tenant", viewedAt: "2026-02-01T12:20:00", signedAt: "2026-02-01T12:24:00", method: "draw", signature: sig(T3.name) }, { id: "e6s2", ...OWNER, role: "owner", state: "signed", token: "sign-e6-owner", viewedAt: "2026-02-01T12:30:00", signedAt: "2026-02-01T12:31:00", method: "type", signature: sig(OWNER.name) }],
      fields: [{ id: "f1", signerId: "e6s1", type: "signature", page: 1, x: 8, y: 8 }, { id: "f2", signerId: "e6s2", type: "signature", page: 1, x: 55, y: 8 }],
      audit: [ev("a1", "2026-02-01T11:58:00", "created", OWNER.name), ev("a2", "2026-02-01T12:00:00", "sent", OWNER.name, { note: "In app" }), ev("a3", "2026-02-01T12:24:00", "signed", T3.name, { ip: "41.13.200.7", device: DEV }), ev("a4", "2026-02-01T12:31:00", "signed", OWNER.name, { ip: "196.25.14.8", device: DEV3 }), ev("a5", "2026-02-01T12:31:00", "completed", "Nestly")],
    },
    {
      id: "e7", title: "Parking bay addendum — A101", kind: "addendum", leaseId: "l1", createdAt: "2026-11-05", createdBy: OWNER.name, sentAt: "2026-11-05T10:00:00", expiresAt: "2026-11-19",
      pages: ADD_PAGES("The Tenant rents a second covered parking bay (P15) at R 450,00 per month from 1 December 2026.", T1.name, "A101", "Sunset Gardens"),
      signers: [{ id: "e7s1", ...T1, role: "tenant", state: "pending", token: "sign-e7-tenant" }, { id: "e7s2", ...OWNER, role: "owner", state: "signed", token: "sign-e7-owner", viewedAt: "2026-11-05T10:01:00", signedAt: "2026-11-05T10:02:00", method: "type", signature: sig(OWNER.name) }],
      fields: [{ id: "f1", signerId: "e7s1", type: "signature", page: 2, x: 8, y: 8 }, { id: "f2", signerId: "e7s1", type: "date", page: 2, x: 8, y: 54 }, { id: "f3", signerId: "e7s2", type: "signature", page: 2, x: 55, y: 8 }],
      audit: [ev("a1", "2026-11-05T09:55:00", "created", OWNER.name, { ip: "196.25.14.8", device: DEV3 }), ev("a2", "2026-11-05T10:00:00", "sent", OWNER.name, { ip: "196.25.14.8", device: DEV3, note: "Email and in app" }), ev("a3", "2026-11-05T10:02:00", "signed", OWNER.name, { ip: "196.25.14.8", device: DEV3 })],
    },
  ];
}

const chk = (result: CheckResult, date: string, notes = "", attachment?: FileMeta): ScreeningCheck => ({ done: true, result, date, notes, attachment });
export function seedApplications(): Application[] {
  const A = (x: Partial<Application> & Pick<Application, "id" | "name" | "email" | "phone" | "unitId" | "propertyId" | "stage" | "createdAt">): Application => ({
    idNumber: "", source: "link", income: 0, employer: "", moveIn: "2026-12-01", occupants: 1, message: "", popiaConsent: false, creditConsent: false, docs: [], checks: {}, ready: false,
    history: [{ at: x.createdAt, note: "Enquiry received" }], ...x,
  });
  return [
    A({ id: "a1", name: "Kagiso Molefe", email: "kagiso.molefe@mail.co.za", phone: "+27 73 555 0201", idNumber: "9305125432081", unitId: "u5", propertyId: "p2", stage: "screening", source: "property24", income: 52000, employer: "Vodacom", moveIn: "2026-12-01", occupants: 2, message: "Looking for a 2-bed close to work in Rosebank.", popiaConsent: true, creditConsent: true, createdAt: "2026-10-24",
      docs: [{ name: "ID — K Molefe.pdf", size: 380_000, type: "application/pdf" }, { name: "Payslips Aug–Oct.pdf", size: 640_000, type: "application/pdf" }],
      viewing: { date: "2026-11-02", time: "10:00", state: "done" },
      checks: { id: chk("pass", "2026-11-03", "Green ID book checked against applicant in person."), income: chk("pass", "2026-11-03", "3 payslips, net R 41 800,00."), employer: chk("pass", "2026-11-04", "HR confirmed permanent employment since 2021."), landlord: chk("pass", "2026-11-04", "Previous landlord: always paid on time."), popia: chk("pass", "2026-10-31", "Consent ticked on the online application.") },
      history: [{ at: "2026-10-24", note: "Enquiry received via Property24" }, { at: "2026-11-02", note: "Viewing completed" }, { at: "2026-10-31", note: "Application submitted" }, { at: "2026-11-03", note: "Screening started" }] }),
    A({ id: "a2", name: "Megan Fourie", email: "megan.fourie@mail.co.za", phone: "+27 82 555 0202", unitId: "u5", propertyId: "p2", stage: "viewing", source: "link", occupants: 1, createdAt: "2026-11-01", viewing: { date: "2026-11-09", time: "10:00", state: "booked" }, message: "Is the loft pet friendly?" }),
    A({ id: "a3", name: "Themba Zulu", email: "themba.zulu@mail.co.za", phone: "+27 72 555 0203", unitId: "u3", propertyId: "p1", stage: "enquiry", source: "property24", createdAt: "2026-11-04", message: "When is B204 available?" }),
    A({ id: "a4", name: "Ruan Pretorius", email: "ruan.p@mail.co.za", phone: "+27 83 555 0204", idNumber: "9108085123084", unitId: "u5", propertyId: "p2", stage: "applied", source: "private_property", income: 38000, employer: "Pick n Pay", occupants: 1, popiaConsent: true, creditConsent: true, createdAt: "2026-10-28",
      docs: [{ name: "ID — R Pretorius.pdf", size: 300_000, type: "application/pdf" }], history: [{ at: "2026-10-28", note: "Enquiry received" }, { at: "2026-11-01", note: "Application submitted" }] }),
    A({ id: "a5", name: "Zanele Mthembu", email: "zanele.mthembu@mail.co.za", phone: "+27 71 555 0205", idNumber: "9002020345085", unitId: "u3", propertyId: "p1", stage: "screening", source: "referral", income: 68000, employer: "Deloitte", moveIn: "2026-12-01", occupants: 2, popiaConsent: true, creditConsent: true, createdAt: "2026-10-20",
      docs: [{ name: "ID — Z Mthembu.pdf", size: 350_000, type: "application/pdf" }, { name: "Bank statements.pdf", size: 900_000, type: "application/pdf" }],
      viewing: { date: "2026-10-29", time: "15:00", state: "done" },
      checks: { id: chk("pass", "2026-10-30"), income: chk("pass", "2026-10-30", "Net R 52 100,00."), employer: chk("pass", "2026-10-31"), credit: chk("pass", "2026-10-31", "Report run externally — no judgments.", { name: "Credit report.pdf", size: 220_000, type: "application/pdf" }), landlord: chk("pass", "2026-10-31"), background: chk("pass", "2026-11-01", "Police clearance certificate seen."), affordability: chk("pass", "2026-11-01", "Rent is 24,7% of income."), popia: chk("pass", "2026-10-21") },
      history: [{ at: "2026-10-20", note: "Referred by Lerato Mokoena" }, { at: "2026-10-29", note: "Viewing completed" }, { at: "2026-10-30", note: "Screening started" }] }),
    A({ id: "a6", name: "Chris Naidoo", email: "chris.naidoo@mail.co.za", phone: "+27 84 555 0206", unitId: "u5", propertyId: "p2", stage: "declined", source: "walk_in", income: 21000, createdAt: "2026-10-15", declineReason: "Rent would be over 60% of income.", history: [{ at: "2026-10-15", note: "Walk-in enquiry" }, { at: "2026-10-22", note: "Declined" }] }),
    A({ id: "a7", name: "Bongiwe Sithole", email: "bongiwe.s@mail.co.za", phone: "+27 79 555 0207", unitId: "u3", propertyId: "p1", stage: "viewing", source: "whatsapp", createdAt: "2026-11-03", viewing: { date: "2026-11-07", time: "14:00", state: "booked" } }),
  ];
}

export function seedInspections(): Inspection[] {
  const loft = buildRooms("i1", (r, i) => (r === 1 && i === 2 ? "fair" : r === 4 && i === 0 ? "na" : "good"));
  loft[1]!.items[2]!.note = "Small scratch on oven door.";
  const ph = buildRooms("i3", (r) => (r < 2 ? "good" : undefined));
  return [
    { id: "i1", type: "incoming", propertyId: "p2", unitId: "u4", tenantId: "t3", leaseId: "l3", date: "2026-02-01", inspector: "Janice Tinto", rooms: loft, envelopeId: "e6", notes: "Keys (2), gate remote (1) handed over.", createdAt: "2026-01-28" },
    { id: "i2", type: "outgoing", propertyId: "p1", unitId: "u3", tenantId: "t4", leaseId: "l4", date: "2026-11-28", inspector: "Bongani Zulu", rooms: buildRooms("i2"), notes: "", createdAt: "2026-10-29" },
    { id: "i3", type: "incoming", propertyId: "p4", unitId: "u7", tenantId: "t6", leaseId: "l6", date: "2026-11-30", inspector: "Janice Tinto", rooms: ph, notes: "", createdAt: "2026-11-02" },
  ];
}

export const OWNER_SIGNER = OWNER;
