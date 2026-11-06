// Announcement audience + status rules (pure, tested).
import type { Announcement, Audience } from "@/mocks/admin";

/** A scheduled announcement counts as sent once its time has passed. */
export function announcementStatus(a: Pick<Announcement, "status" | "scheduledFor">, nowIso: string): Announcement["status"] {
  if (a.status === "scheduled" && a.scheduledFor && a.scheduledFor <= nowIso) return "sent";
  return a.status;
}

export function audienceIncludes(aud: Audience, x: { propertyId: string; unitId: string }): boolean {
  if (aud.kind === "all") return true;
  if (aud.kind === "property") return aud.propertyId === x.propertyId;
  return aud.propertyId === x.propertyId && aud.unitIds.includes(x.unitId);
}

export const recipientsFor = <T extends { propertyId: string; unitId: string; archived?: boolean }>(aud: Audience, tenants: T[]) =>
  tenants.filter((x) => !x.archived && audienceIncludes(aud, x));

/** Scoped staff can only address the properties they look after. */
export function audienceAllowed(aud: Audience, scope: "all" | string[]): boolean {
  if (scope === "all") return true;
  return aud.kind !== "all" && scope.includes(aud.propertyId);
}

export const readPct = (reads: number, recipients: number) => (recipients > 0 ? Math.min(100, Math.round((reads / recipients) * 100)) : 0);
