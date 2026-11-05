// Pure requests & maintenance rules (Phase 6). Covered by maintenance-rules.test.ts.
import { REQ_CATEGORIES, REQ_STATUSES, type MaintRequest, type ReqStatus, type ThreadMsg } from "@/mocks/maintenance";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf", "video/mp4"];

export type AttachmentError = "type" | "size" | "count";
/** File checks for request attachments (UI only). */
export function validateAttachment(file: { type: string; size: number }, existing: number): AttachmentError | null {
  if (existing >= MAX_ATTACHMENTS) return "count";
  if (!ATTACHMENT_TYPES.includes(file.type)) return "type";
  if (file.size > MAX_ATTACHMENT_BYTES) return "size";
  return null;
}

/** Tenants never see internal notes. */
export const tenantThread = (msgs: ThreadMsg[]) => msgs.filter((m) => !m.internal);

/** Strips everything a tenant must not see from a request. */
export function forTenantView(r: MaintRequest): MaintRequest {
  const { cost: _c, quote: _q, ...rest } = r;
  return { ...rest, thread: tenantThread(r.thread) };
}

export const statusIndex = (s: ReqStatus) => REQ_STATUSES.indexOf(s);
export const isOpenStatus = (s: ReqStatus) => s !== "resolved" && s !== "closed";
/** The tenant is asked for a rating once, after the request is resolved. */
export const canRate = (r: Pick<MaintRequest, "status" | "rating">) => !isOpenStatus(r.status) && !r.rating;

export function countByCategory(rs: Pick<MaintRequest, "category">[]) {
  return REQ_CATEGORIES.map((c) => ({ category: c, count: rs.filter((r) => r.category === c).length }));
}
export function groupByStatus<T extends Pick<MaintRequest, "status">>(rs: T[]) {
  return REQ_STATUSES.map((s) => ({ status: s, items: rs.filter((r) => r.status === s) }));
}
