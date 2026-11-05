// Service layer: pages call these. Swap the bodies for real API calls later.
import * as db from "@/mocks/data";
import { commit, getState, newId, previewUrls } from "@/mocks/portfolio-store";
import { tenantForUnit, type DocumentRecord, type PropertyRecord, type UnitRecord } from "@/mocks/portfolio";
export type { Tenant, Request, Invoice, Staff, Notification } from "@/mocks/data";
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

export const tenantService = { list: (propertyId = "all") => delay(db.tenants.filter((x) => propertyId === "all" || x.propertyId === propertyId)) };
const propertyOfTenant = (tenantId: string) => db.tenants.find((t) => t.id === tenantId)?.propertyId;
export const requestService = {
  list: (propertyId = "all") => delay(db.requests.filter((r) => propertyId === "all" || propertyOfTenant(r.tenantId) === propertyId)),
};
export const invoiceService = {
  list: (propertyId = "all") => delay(db.invoices.filter((i) => propertyId === "all" || propertyOfTenant(i.tenantId) === propertyId)),
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
