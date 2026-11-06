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
  list: (propertyId = "all") => billingService.invoices(propertyId).then((xs) => xs.filter((i) => i.status !== "void").map((i): Invoice => ({
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
