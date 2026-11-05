// Service layer: pages call these. Swap the bodies for real API calls later.
import * as db from "@/mocks/data";
export type { Property, Unit, Tenant, Request, Invoice, Staff, Notification } from "@/mocks/data";

const delay = <T,>(v: T, ms = 600) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));

export const propertyService = {
  list: () => delay(db.properties),
  get: (id: string) => delay(db.properties.find((p) => p.id === id) ?? null),
};
export const unitService = { listByProperty: (id: string) => delay(db.units.filter((u) => id === "all" || u.propertyId === id)) };
export const tenantService = { list: (propertyId = "all") => delay(db.tenants.filter((x) => propertyId === "all" || x.propertyId === propertyId)) };
export const requestService = { list: () => delay(db.requests) };
export const invoiceService = { list: () => delay(db.invoices) };
export const staffService = { list: () => delay(db.staff) };
export const notificationService = { list: () => delay(db.notifications, 300) };
export const reportService = { revenue: () => delay(db.revenueSeries) };
