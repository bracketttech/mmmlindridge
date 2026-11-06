// Service layer: pages call these. Swap the bodies for real API calls later.
import * as db from "@/mocks/data";
import { commit, getState, newId, previewUrls } from "@/mocks/portfolio-store";
import { commitTenancy, getTenancy } from "@/mocks/tenancy-store";
import { DEMO_TENANT_ID, type DetailValues, type FieldChange, type HistoryKind, type TenantRecord } from "@/mocks/tenancy";
import { applyChanges, isValidRejectReason } from "@/lib/tenancy-rules";
import { tenantForUnit, type DocumentRecord, type PropertyRecord, type UnitRecord } from "@/mocks/portfolio";
export type { Request, Invoice, Staff, Notification } from "@/mocks/data";
export type { TenantRecord, ChangeRequest, HistoryEntry, FieldChange, DetailValues, Occupant, Surety, TenantDoc } from "@/mocks/tenancy";
export type { PropertyRecord, UnitRecord, DocumentRecord, PropertyType, Amenity, UnitStatus, DocType } from "@/mocks/portfolio";

const delay = <T,>(v: T, ms = 600) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));
export class StorageFullError extends Error {}
const save = (mut: Parameters<typeof commit>[0]) => { if (!commit(mut)) throw new StorageFullError("storage"); };

/* ---------- Properties ---------- */
export type Property = PropertyRecord & { units: number; occupied: number; vacant: number; notice: number; maintenance: number; rentRoll: number };
export type PropertyInput = Omit<PropertyRecord, "id" | "createdAt" | "staffIds">;

function summarize(p: PropertyRecord): Property {
  const us = getState().units.filter((u) => u.propertyId === p.id);
  const count = (s: UnitRecord["status"]) => us.filter((u) => u.status === s).length;
  return {
    ...p, units: us.length, occupied: count("occupied") + count("notice"), vacant: count("vacant"), notice: count("notice"), maintenance: count("maintenance"),
    rentRoll: us.filter((u) => u.status === "occupied" || u.status === "notice").reduce((a, u) => a + u.rent, 0),
  };
}

export const propertyService = {
  list: () => delay(getState().properties.map(summarize)),
  get: (id: string) => { const p = getState().properties.find((x) => x.id === id); return delay(p ? summarize(p) : null); },
  async create(input: PropertyInput) {
    const rec: PropertyRecord = { ...input, id: newId("p"), staffIds: [], createdAt: new Date().toISOString().slice(0, 10) };
    save((s) => { s.properties.unshift(rec); });
    return delay(rec, 700);
  },
  async update(id: string, input: Partial<PropertyRecord>) {
    save((s) => { const i = s.properties.findIndex((p) => p.id === id); if (i >= 0) s.properties[i] = { ...s.properties[i]!, ...input, id }; });
    return delay(true, 600);
  },
  async remove(id: string) {
    save((s) => {
      s.properties = s.properties.filter((p) => p.id !== id);
      s.units = s.units.filter((u) => u.propertyId !== id);
      s.documents = s.documents.filter((d) => d.propertyId !== id);
    });
    return delay(true, 500);
  },
};

/* ---------- Units ---------- */
export type Unit = UnitRecord & { tenantId?: string | undefined; tenantName?: string | undefined };
export type UnitInput = Omit<UnitRecord, "id" | "propertyId">;
const withTenant = (u: UnitRecord): Unit => { const t = tenantForUnit(u.id); return { ...u, tenantId: t?.id, tenantName: t?.name }; };

export const unitService = {
  listByProperty: (id: string) => delay(getState().units.filter((u) => id === "all" || u.propertyId === id).map(withTenant)),
  async create(propertyId: string, input: UnitInput) {
    const u: UnitRecord = { ...input, id: newId("u"), propertyId };
    save((s) => { s.units.push(u); });
    return delay(withTenant(u), 500);
  },
  async bulkCreate(propertyId: string, labels: string[], template: Omit<UnitInput, "label">) {
    save((s) => { labels.forEach((label) => s.units.push({ ...template, label, id: newId("u"), propertyId })); });
    return delay(labels.length, 800);
  },
  async update(id: string, input: Partial<UnitInput>) {
    save((s) => { const i = s.units.findIndex((u) => u.id === id); if (i >= 0) s.units[i] = { ...s.units[i]!, ...input }; });
    return delay(true, 500);
  },
  async remove(id: string) {
    save((s) => { s.units = s.units.filter((u) => u.id !== id); });
    return delay(true, 400);
  },
};

/* ---------- Documents ---------- */
export type Document = DocumentRecord & { previewUrl?: string | undefined };
export const documentService = {
  list: (propertyId: string) =>
    delay(getState().documents.filter((d) => d.propertyId === propertyId)).then((ds) => ds.map((d): Document => ({ ...d, previewUrl: previewUrls.get(d.id) })).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))),
  async add(propertyId: string, doc: Omit<DocumentRecord, "id" | "propertyId" | "uploadedAt" | "uploadedBy">, previewUrl?: string) {
    const rec: DocumentRecord = { ...doc, id: newId("d"), propertyId, uploadedAt: new Date().toISOString().slice(0, 10), uploadedBy: "Janice Tinto" };
    if (previewUrl) previewUrls.set(rec.id, previewUrl);
    save((s) => { s.documents.push(rec); });
    return delay(rec, 200);
  },
  async update(id: string, input: Partial<Pick<DocumentRecord, "name" | "type" | "expiresAt">>) {
    save((s) => { const i = s.documents.findIndex((d) => d.id === id); if (i >= 0) s.documents[i] = { ...s.documents[i]!, ...input }; });
    return delay(true, 300);
  },
  async remove(id: string) {
    save((s) => { s.documents = s.documents.filter((d) => d.id !== id); });
    previewUrls.delete(id);
    return delay(true, 400);
  },
};

/* ---------- Staff assignment ---------- */
export const staffService = {
  list: () => delay(db.staff),
  async assign(propertyId: string, staffIds: string[]) {
    save((s) => { const p = s.properties.find((x) => x.id === propertyId); if (p) p.staffIds = staffIds; });
    return delay(true, 500);
  },
};

/* ---------- Tenants (Phase 5) ---------- */
export type Tenant = TenantRecord;
export type TenantInput = Omit<TenantRecord, "id" | "createdAt" | "archived" | "registered" | "docs" | "paidPct" | "lastPayment" | "balance" | "status"> & { status?: TenantRecord["status"] };
const T = () => getTenancy();
const OWNER = "Janice Tinto";
const today = () => new Date().toISOString().slice(0, 10);
const tSave = (mut: Parameters<typeof commitTenancy>[0]) => { if (!commitTenancy(mut)) throw new StorageFullError("storage"); };
const log = (s: ReturnType<typeof getTenancy>, tenantId: string, kind: HistoryKind, by: string, note?: string) => s.history.unshift({ id: newId("h"), tenantId, at: today(), kind, by, note });
export const detailValues = (x: TenantRecord): DetailValues => ({ email: x.email, phone: x.phone, employer: x.employer, emergencyName: x.emergency.name, emergencyRelation: x.emergency.relation, emergencyPhone: x.emergency.phone });
function applyDetails(x: TenantRecord, v: DetailValues) {
  x.email = v.email; x.phone = v.phone; x.employer = v.employer; x.emergency = { name: v.emergencyName, relation: v.emergencyRelation, phone: v.emergencyPhone };
}

export const tenantService = {
  list: (propertyId = "all", opts: { archived?: boolean } = {}) =>
    delay(T().tenants.filter((x) => (propertyId === "all" || x.propertyId === propertyId) && (opts.archived ? true : !x.archived))),
  get: (id: string) => delay(T().tenants.find((x) => x.id === id) ?? null, 400),
  /** The signed-in tenant (matched by email, demo fallback). */
  me: (email?: string) => delay(T().tenants.find((x) => !!email && x.email.toLowerCase() === email.toLowerCase()) ?? T().tenants.find((x) => x.id === DEMO_TENANT_ID) ?? null, 400),
  async create(input: TenantInput) {
    const rec: TenantRecord = { ...input, id: newId("t"), status: "pending", paidPct: 0, lastPayment: "", balance: 0, archived: false, registered: false, createdAt: today(), docs: [] };
    tSave((s) => { s.tenants.unshift(rec); log(s, rec.id, "created", OWNER); });
    return delay(rec, 700);
  },
  async update(id: string, input: Partial<TenantRecord>) {
    tSave((s) => { const i = s.tenants.findIndex((x) => x.id === id); if (i >= 0) { s.tenants[i] = { ...s.tenants[i]!, ...input, id }; log(s, id, "updated", OWNER); } });
    return delay(true, 600);
  },
  async setAvatar(id: string, avatar: string | null) {
    tSave((s) => { const x = s.tenants.find((y) => y.id === id); if (x) x.avatar = avatar ?? undefined; });
    return delay(true, 200);
  },
  async archive(id: string, archived: boolean) {
    tSave((s) => { const x = s.tenants.find((y) => y.id === id); if (x) { x.archived = archived; log(s, id, archived ? "archived" : "restored", OWNER); } });
    return delay(true, 500);
  },
  async remove(id: string) {
    tSave((s) => { s.tenants = s.tenants.filter((x) => x.id !== id); s.changes = s.changes.filter((c) => c.tenantId !== id); s.history = s.history.filter((h) => h.tenantId !== id); });
    return delay(true, 500);
  },
  /** Mock send: creates a single-use link that opens the Phase 2 registration screen. */
  async sendLink(id: string, channelLabel: string) {
    const x = T().tenants.find((y) => y.id === id)!;
    const token = linkTokenFor(id);
    const p = getState().properties.find((q) => q.id === x.propertyId);
    const u = getState().units.find((q) => q.id === x.unitId);
    tSave((s) => {
      s.links = s.links.filter((l) => l.tenantId !== id);
      s.links.push({ token, tenantId: id, status: "valid", name: x.name, email: x.email, phone: x.phone, propertyName: p?.name ?? "", propertyAddress: p ? `${p.address}, ${p.suburb}` : "", unit: u?.label ?? "", rent: x.rent, leaseStart: x.leaseStart, expiresAt: linkExpiry() });
      log(s, id, "link_sent", OWNER, channelLabel);
    });
    return delay(token, 700);
  },
  history: (id: string) => delay(T().history.filter((h) => h.tenantId === id)),
};
export const linkTokenFor = (tenantId: string) => `reg-${tenantId}`;
export const linkExpiry = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
export const findSentLink = (token: string) => getTenancy().links.find((l) => l.token === token);
export function markRegistered(token: string) {
  const l = findSentLink(token);
  if (!l) return;
  commitTenancy((s) => {
    const x = s.tenants.find((y) => y.id === l.tenantId);
    if (x) { x.registered = true; if (x.status === "pending") x.status = "active"; log(s, x.id, "registered", x.name); }
    const k = s.links.find((y) => y.token === token); if (k) k.status = "used";
  });
}

/* ---------- Change-of-details requests ---------- */
export const changeService = {
  list: () => delay([...T().changes].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))),
  forTenant: (tenantId: string) => delay(T().changes.filter((c) => c.tenantId === tenantId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), 300),
  async submit(tenantId: string, changes: FieldChange[]) {
    const x = T().tenants.find((y) => y.id === tenantId)!;
    tSave((s) => {
      s.changes = s.changes.filter((c) => !(c.tenantId === tenantId && c.status === "pending"));
      s.changes.unshift({ id: newId("cr"), tenantId, submittedAt: today(), status: "pending", changes });
      log(s, tenantId, "change_submitted", x.name, changes.map((c) => c.field).join(","));
    });
    return delay(true, 700);
  },
  async approve(id: string) {
    tSave((s) => {
      const c = s.changes.find((y) => y.id === id); if (!c) return;
      const x = s.tenants.find((y) => y.id === c.tenantId);
      if (x) applyDetails(x, applyChanges(detailValues(x), c.changes));
      Object.assign(c, { status: "approved", decidedAt: today(), decidedBy: OWNER });
      log(s, c.tenantId, "change_approved", OWNER, c.changes.map((f) => f.field).join(","));
    });
    return delay(true, 600);
  },
  async reject(id: string, reason: string) {
    if (!isValidRejectReason(reason)) throw new Error("reason");
    tSave((s) => {
      const c = s.changes.find((y) => y.id === id); if (!c) return;
      Object.assign(c, { status: "rejected", reason: reason.trim(), decidedAt: today(), decidedBy: OWNER });
      log(s, c.tenantId, "change_rejected", OWNER, reason.trim());
    });
    return delay(true, 600);
  },
};

/* ---------- Own profile photo (staff / owner) ---------- */
export const profileService = {
  avatar: (email: string) => delay(T().avatars[email] ?? null, 200),
  async setAvatar(email: string, src: string | null) {
    tSave((s) => { if (src) s.avatars[email] = src; else delete s.avatars[email]; });
    return delay(true, 200);
  },
};
/** Simple invoice rows (property finance tab), now read from the Phase 7 billing store. */
export const invoiceService = {
  list: (propertyId = "all") => billingService.invoices(propertyId).then((xs) => xs.filter((i) => i.status !== "void").map((i): LegacyInvoice => ({
    id: i.number, tenantId: i.tenantId, amount: i.total, dueDate: i.dueDate,
    status: i.status === "paid" ? "paid" : i.status === "overdue" ? "overdue" : "pending",
  }))),
};
export const notificationService = { list: () => delay(db.notifications, 300) };
export const dashboardService = {
  get: (propertyId: string) => import("@/mocks/dashboard").then((m) => delay(m.buildDashboard(propertyId), 700)),
};
export const searchService = {
  search: (q: string) => import("@/mocks/dashboard").then((m) => delay(m.searchAll(q), 200)),
};
export type { DashboardData, SearchResult } from "@/mocks/dashboard";
export const planService = { list: () => import("@/mocks/plans").then((m) => delay(m.plans, 300)) };
export const reportService = { revenue: () => delay(db.revenueSeries) };

/* ---------- Requests & maintenance (Phase 6) ---------- */
import { getMaint, commitMaint } from "@/mocks/maintenance-store";
import { forTenantView } from "@/lib/maintenance-rules";
import type { MaintRequest, ReqStatus, Assignee, Attachment, ReqCategory, Area, Priority } from "@/mocks/maintenance";
export type { MaintRequest, ReqStatus, Assignee, Attachment, ReqCategory, Area, Priority, Contractor, PreventiveTask, ThreadMsg } from "@/mocks/maintenance";
export type NewRequestInput = { tenantId: string; category: ReqCategory; area: Area; title: string; description: string; priority: Priority; access: string; moveOutDate?: string | undefined; attachments: Attachment[] };
const M = () => getMaint();
const now = () => new Date().toISOString().slice(0, 19);
const mSave = (mut: Parameters<typeof commitMaint>[0]) => { if (!commitMaint(mut)) throw new StorageFullError("storage"); };
const edit = (id: string, fn: (r: MaintRequest) => void) => mSave((s) => { const r = s.requests.find((x) => x.id === id); if (r) { fn(r); r.updatedAt = now(); } });
const sortNew = (rs: MaintRequest[]) => [...rs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const requestService = {
  list: (propertyId = "all") => delay(sortNew(M().requests.filter((r) => propertyId === "all" || r.propertyId === propertyId))),
  /** Tenant-safe: internal notes, cost and quotes are removed here, never only in the UI. */
  forTenant: (tenantId: string) => delay(sortNew(M().requests.filter((r) => r.tenantId === tenantId)).map(forTenantView)),
  async create(input: NewRequestInput) {
    const x = T().tenants.find((y) => y.id === input.tenantId)!;
    const at = now();
    const ref = `REQ-${1001 + M().requests.length}`;
    const rec: MaintRequest = { ...input, id: newId("r"), ref, tenantName: x.name, propertyId: x.propertyId, unitId: x.unitId, status: "new", createdAt: at, updatedAt: at, thread: [], timeline: [{ status: "new", at, by: x.name }] };
    mSave((s) => { s.requests.push(rec); });
    return delay(forTenantView(rec), 900);
  },
  async setStatus(id: string, status: ReqStatus, by: string) {
    edit(id, (r) => { if (r.status !== status) { r.status = status; r.timeline.push({ status, at: now(), by }); } });
    return delay(true, 300);
  },
  async assign(id: string, assignee: Assignee | undefined, by: string) {
    edit(id, (r) => { r.assignee = assignee; if (assignee && (r.status === "new" || r.status === "acknowledged")) { r.status = "assigned"; r.timeline.push({ status: "assigned", at: now(), by }); } });
    return delay(true, 300);
  },
  async addMessage(id: string, body: string, internal: boolean, by: string, from: "tenant" | "staff") {
    edit(id, (r) => { r.thread.push({ id: newId("m"), at: now(), by, from, body, internal: from === "tenant" ? false : internal }); });
    return delay(true, 250);
  },
  async setCost(id: string, cost: number | undefined) { edit(id, (r) => { r.cost = cost; }); return delay(true, 300); },
  async requestQuote(id: string, contractorId: string, amount: number, note: string, by: string) {
    const c = M().contractors.find((x) => x.id === contractorId)!;
    edit(id, (r) => { r.quote = { contractorId, contractorName: c.company, amount, note, status: "pending" }; if (r.status !== "awaiting_quote") { r.status = "awaiting_quote"; r.timeline.push({ status: "awaiting_quote", at: now(), by }); } });
    return delay(true, 400);
  },
  async decideQuote(id: string, approve: boolean, by: string) {
    edit(id, (r) => {
      if (!r.quote) return;
      r.quote.status = approve ? "approved" : "declined"; r.quote.decidedAt = now();
      if (approve) { r.cost = r.quote.amount; r.assignee = { kind: "contractor", id: r.quote.contractorId, name: r.quote.contractorName }; r.status = "in_progress"; r.timeline.push({ status: "in_progress", at: now(), by }); }
    });
    return delay(true, 400);
  },
  async rate(id: string, stars: number, comment: string) { edit(id, (r) => { r.rating = { stars, comment }; }); return delay(true, 300); },
};
export const contractorService = { list: () => delay(M().contractors) };
export const scheduleService = { list: (propertyId = "all") => delay([...M().schedule].filter((x) => propertyId === "all" || x.propertyId === propertyId).sort((a, b) => a.nextDue.localeCompare(b.nextDue))) };

/* ---------- Billing, statements & payments (Phase 7) ---------- */
import type { Invoice as LegacyInvoice } from "@/mocks/data";
import { commitBilling, getBilling } from "@/mocks/billing-store";
import type { Channel, Invoice as BillInvoice, InvoiceLine, InvoiceStatus, Payment, PayMethod, PayStatus, Proof } from "@/mocks/billing";
import { ageing, depositSummary, escalatedRent, invoiceStatus, invoiceTotals, outstanding, paidOn, paymentStatusFor, statement, tenantBalance, type Outcome } from "@/lib/billing-rules";
export type { Channel, Deposit, Escalation, InvoiceLine, InvoiceStatus, Payment, PayMethod, PayStatus, Proof, RecurringSchedule, ChargeKind } from "@/mocks/billing";
export type { Outcome, StatementLine, Bucket } from "@/lib/billing-rules";

export type InvoiceView = BillInvoice & { tenantName: string; total: number; subtotal: number; vatAmount: number; paid: number; outstanding: number; status: InvoiceStatus };
export type NewInvoiceInput = { tenantId: string; issueDate: string; dueDate: string; lines: InvoiceLine[]; vat: boolean; note?: string | undefined; send: boolean; channels: Channel[]; schedule?: { dayOfMonth: number; startDate: string; endDate?: string | undefined } | undefined };
export type CaptureInput = { tenantId: string; invoiceId?: string | undefined; amount: number; method: PayMethod; date: string; reference: string; proof?: Proof | undefined };

const bSave = (mut: Parameters<typeof commitBilling>[0]) => { if (!commitBilling(mut)) throw new StorageFullError("storage"); };
const tenantName = (id?: string) => (id ? T().tenants.find((x) => x.id === id)?.name ?? "—" : "—");
let balancesSynced = false;
/** Keeps the tenant balance shown on Tenants pages in step with billing. */
function syncBalances(ids?: string[]) {
  const s = getBilling();
  const targets = T().tenants.filter((x) => !ids || ids.includes(x.id));
  const changed = targets.filter((x) => x.balance !== Math.max(0, tenantBalance(x.id, s.invoices, s.payments)));
  if (changed.length) tSave((ts) => { ts.tenants.forEach((x) => { if (changed.some((c) => c.id === x.id)) x.balance = Math.max(0, tenantBalance(x.id, s.invoices, s.payments)); }); });
}
const B = () => { const s = getBilling(); if (!balancesSynced && typeof window !== "undefined") { balancesSynced = true; syncBalances(); } return s; };
const view = (i: BillInvoice, payments: Payment[]): InvoiceView => {
  const tot = invoiceTotals(i.lines, i.vat);
  return { ...i, tenantName: tenantName(i.tenantId), total: tot.total, subtotal: tot.subtotal, vatAmount: tot.vat, paid: paidOn(i, payments), outstanding: outstanding(i, payments), status: invoiceStatus(i, payments, today()) };
};
const inScope = (propertyId: string, tenantId?: string) => propertyId === "all" || (!!tenantId && T().tenants.find((x) => x.id === tenantId)?.propertyId === propertyId);
const nextNumber = () => `INV-${new Date().getFullYear()}-${String(B().invoices.length + 1).padStart(4, "0")}`;
const nextPayRef = () => `PAY-${5001 + B().payments.length}`;

export const billingService = {
  invoices: (propertyId = "all") => { const s = B(); return delay(s.invoices.filter((i) => propertyId === "all" || i.propertyId === propertyId).map((i) => view(i, s.payments)).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))); },
  invoice: (id: string) => { const s = B(); const i = s.invoices.find((x) => x.id === id); return delay(i ? view(i, s.payments) : null, 300); },
  async createInvoice(input: NewInvoiceInput) {
    const x = T().tenants.find((y) => y.id === input.tenantId)!;
    const id = newId("inv");
    let scheduleId: string | undefined;
    bSave((s) => {
      if (input.schedule) {
        scheduleId = newId("rs");
        s.schedules.unshift({ id: scheduleId, tenantId: x.id, lines: input.lines, vat: input.vat, dayOfMonth: input.schedule.dayOfMonth, startDate: input.schedule.startDate, endDate: input.schedule.endDate, active: true, createdAt: today() });
      }
      s.invoices.unshift({ id, number: nextNumber(), tenantId: x.id, propertyId: x.propertyId, unitId: x.unitId, issueDate: input.issueDate, dueDate: input.dueDate, lines: input.lines, vat: input.vat, note: input.note, scheduleId, ...(input.send ? { sentAt: today(), sentVia: input.channels } : {}) });
    });
    syncBalances([x.id]);
    return delay(id, 700);
  },
  async send(id: string, channels: Channel[]) {
    let tid = "";
    bSave((s) => { const i = s.invoices.find((y) => y.id === id); if (i) { tid = i.tenantId; i.sentAt = i.sentAt ?? today(); i.sentVia = [...new Set([...(i.sentVia ?? []), ...channels])]; } });
    syncBalances([tid]);
    return delay(true, 800);
  },
  async voidInvoice(id: string) {
    let tid = "";
    bSave((s) => { const i = s.invoices.find((y) => y.id === id); if (i) { tid = i.tenantId; i.voided = true; } });
    syncBalances([tid]);
    return delay(true, 500);
  },
  schedules: () => delay(B().schedules.map((r) => ({ ...r, tenantName: tenantName(r.tenantId), total: invoiceTotals(r.lines, r.vat).total }))),
  async toggleSchedule(id: string) { bSave((s) => { const r = s.schedules.find((y) => y.id === id); if (r) r.active = !r.active; }); return delay(true, 300); },

  payments: (propertyId = "all") => { const s = B(); return delay(s.payments.filter((p) => propertyId === "all" || !p.tenantId || inScope(propertyId, p.tenantId)).map((p) => ({ ...p, tenantName: p.tenantId ? tenantName(p.tenantId) : "", invoiceNumber: s.invoices.find((i) => i.id === p.invoiceId)?.number })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))); },
  async capture(input: CaptureInput) {
    const status: PayStatus = input.method === "eft" ? "pending" : "cleared";
    const p: Payment = { id: newId("pay"), ref: input.reference.trim() || nextPayRef(), tenantId: input.tenantId, invoiceId: input.invoiceId, amount: input.amount, method: input.method, date: input.date, status, source: "manual", proof: input.proof };
    bSave((s) => { s.payments.unshift(p); });
    syncBalances([input.tenantId]);
    return delay(p, 700);
  },
  async setPaymentStatus(id: string, status: PayStatus) {
    let tid: string | undefined;
    bSave((s) => { const p = s.payments.find((y) => y.id === id); if (p) { p.status = status; tid = p.tenantId; } });
    if (tid) syncBalances([tid]);
    return delay(true, 400);
  },
  async match(id: string, tenantId: string, invoiceId: string | undefined) {
    bSave((s) => { const p = s.payments.find((y) => y.id === id); if (p) { p.tenantId = tenantId; p.invoiceId = invoiceId; } });
    syncBalances([tenantId]);
    return delay(true, 500);
  },

  arrears: (propertyId = "all") => {
    const s = B();
    const a = ageing(s.invoices.filter((i) => propertyId === "all" || i.propertyId === propertyId), s.payments, today());
    return delay({ ...a, tenants: a.tenants.map((r) => { const x = T().tenants.find((y) => y.id === r.tenantId); return { ...r, id: r.tenantId, name: x?.name ?? "—", email: x?.email ?? "", phone: x?.phone ?? "", avatar: x?.avatar, propertyId: x?.propertyId ?? "", unitId: x?.unitId ?? "", lastPayment: s.payments.filter((p) => p.tenantId === r.tenantId && p.status === "cleared").map((p) => p.date).sort().at(-1) }; }) });
  },
  async remind(tenantIds: string[], template: string, channel: Channel) {
    bSave((s) => { tenantIds.forEach((tenantId) => s.reminders.unshift({ id: newId("rm"), tenantId, at: today(), template, channel })); });
    return delay(tenantIds.length, 800);
  },
  reminders: () => delay(B().reminders),

  statement: (tenantId: string, from: string, to: string) => { const s = B(); return delay(statement(tenantId, s.invoices, s.payments, from, to), 400); },

  deposits: (propertyId = "all") => delay(B().deposits.filter((d) => inScope(propertyId, d.tenantId)).map((d) => { const sum = depositSummary(d, today()); return { ...d, tenantName: tenantName(d.tenantId), interest: sum.interest, deductionsTotal: sum.deductions, refund: sum.refund }; })),
  async addDeduction(depositId: string, item: string, amount: number, note?: string) { bSave((s) => { s.deposits.find((d) => d.id === depositId)?.deductions.push({ id: newId("dd"), item, amount, note }); }); return delay(true, 300); },
  async removeDeduction(depositId: string, deductionId: string) { bSave((s) => { const d = s.deposits.find((x) => x.id === depositId); if (d) d.deductions = d.deductions.filter((x) => x.id !== deductionId); }); return delay(true, 300); },
  async refundDeposit(depositId: string) {
    bSave((s) => { const d = s.deposits.find((x) => x.id === depositId); if (d) { d.status = "refunded"; d.refundedAt = today(); d.refundAmount = depositSummary(d, today()).refund; } });
    return delay(true, 700);
  },

  escalations: (propertyId = "all") => delay(B().escalations.filter((e) => inScope(propertyId, e.tenantId)).map((e) => ({ ...e, tenantName: tenantName(e.tenantId), newRent: escalatedRent(e.currentRent, e.pct) })).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))),
  async scheduleEscalation(tenantId: string, pct: number, effectiveDate: string) {
    const x = T().tenants.find((y) => y.id === tenantId)!;
    bSave((s) => { s.escalations = s.escalations.filter((e) => !(e.tenantId === tenantId && e.status !== "applied")); s.escalations.unshift({ id: newId("esc"), tenantId, currentRent: x.rent, pct, effectiveDate, status: "scheduled" }); });
    return delay(true, 600);
  },
  async sendEscalationNotice(id: string) { bSave((s) => { const e = s.escalations.find((y) => y.id === id); if (e) { e.status = "notice_sent"; e.noticeSentAt = today(); } }); return delay(true, 600); },
  async applyEscalation(id: string) {
    const e = B().escalations.find((y) => y.id === id)!;
    const rent = escalatedRent(e.currentRent, e.pct);
    bSave((s) => {
      const x = s.escalations.find((y) => y.id === id); if (x) x.status = "applied";
      s.schedules.filter((r) => r.tenantId === e.tenantId).forEach((r) => r.lines.forEach((l) => { if (l.kind === "rent") l.unitPrice = rent; }));
    });
    tSave((s) => { const x = s.tenants.find((y) => y.id === e.tenantId); if (x) x.rent = rent; });
    return delay(true, 600);
  },

  /** Tenant view: own invoices, payments and balance only. */
  forTenant: (tenantId: string) => {
    const s = B();
    const payments = s.payments.filter((p) => p.tenantId === tenantId);
    return delay({
      invoices: s.invoices.filter((i) => i.tenantId === tenantId && i.sentAt && !i.voided).map((i) => view(i, s.payments)).sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
      payments: payments.map((p) => ({ ...p, invoiceNumber: s.invoices.find((i) => i.id === p.invoiceId)?.number })).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
      balance: tenantBalance(tenantId, s.invoices, s.payments),
      pending: payments.filter((p) => p.status === "pending").reduce((a, p) => a + p.amount, 0),
    }, 400);
  },
  payment: (id: string) => { const s = B(); const p = s.payments.find((x) => x.id === id); return delay(p ? { ...p, invoiceNumber: s.invoices.find((i) => i.id === p.invoiceId)?.number, tenantName: tenantName(p.tenantId), balance: p.tenantId ? tenantBalance(p.tenantId, s.invoices, s.payments) : 0 } : null, 300); },
  /** Mock hosted checkout. Abandoned checkouts record nothing. */
  async checkout(invoiceId: string, outcome: Outcome, method: "card" | "eft") {
    const i = B().invoices.find((x) => x.id === invoiceId)!;
    const status = paymentStatusFor(outcome);
    if (!status) return delay(null, 300);
    const amount = outstanding(i, B().payments);
    const p: Payment = { id: newId("pay"), ref: `${nextPayRef()}-GW`, tenantId: i.tenantId, invoiceId, amount, method: "gateway", date: today(), status, source: "gateway", note: outcome === "failed" ? "Card declined by issuing bank" : method === "eft" ? "Instant EFT" : "Card" };
    bSave((s) => { s.payments.unshift(p); });
    syncBalances([i.tenantId]);
    return delay(p, 400);
  },
};
