// Pure leasing rules (Phase 8): envelope status, lease state, merge fields, sending checks, screening and viewings.
import type { CheckKey, CheckResult, Envelope, EnvStatus, FieldType, Lease, ScreeningCheck, SignMethod, Signer } from "@/mocks/leasing";

const DAY = 864e5;
const d = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).getTime();
export const daysBetween = (fromIso: string, toIso: string) => Math.round((d(toIso.slice(0, 10)) - d(fromIso.slice(0, 10))) / DAY);

/* ---------- E-signature ---------- */
/** Overall envelope status. Voided and declined win; then fully signed; then expiry; then viewed / sent / draft. */
export function envelopeStatus(e: Pick<Envelope, "signers" | "sentAt" | "expiresAt" | "voided">, nowIso: string): EnvStatus {
  if (e.voided) return "voided";
  if (!e.sentAt) return "draft";
  if (e.signers.some((s) => s.state === "declined")) return "declined";
  if (e.signers.length > 0 && e.signers.every((s) => s.state === "signed")) return "signed";
  if (e.expiresAt && nowIso.slice(0, 10) > e.expiresAt) return "expired";
  if (e.signers.some((s) => s.state === "viewed" || s.state === "signed")) return "viewed";
  return "sent";
}

/** A signer may sign only while the envelope is still open and they haven't acted yet. */
export const canSignerAct = (status: EnvStatus, s: Pick<Signer, "state">) => (status === "sent" || status === "viewed") && (s.state === "pending" || s.state === "viewed");

export type SendIssue = { kind: "no_signers" } | { kind: "signer_details"; signerId: string } | { kind: "bad_email"; signerId: string } | { kind: "no_signature_field"; signerId: string } | { kind: "duplicate_email"; signerId: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Everything that blocks sending: each signer needs a name, a valid unique email and at least one signature field. */
export function sendIssues(e: Pick<Envelope, "signers" | "fields">): SendIssue[] {
  if (!e.signers.length) return [{ kind: "no_signers" }];
  const out: SendIssue[] = [];
  const seen = new Set<string>();
  for (const s of e.signers) {
    if (!s.name.trim()) out.push({ kind: "signer_details", signerId: s.id });
    else if (!EMAIL.test(s.email.trim())) out.push({ kind: "bad_email", signerId: s.id });
    else if (seen.has(s.email.trim().toLowerCase())) out.push({ kind: "duplicate_email", signerId: s.id });
    seen.add(s.email.trim().toLowerCase());
    if (!e.fields.some((f) => f.signerId === s.id && f.type === "signature")) out.push({ kind: "no_signature_field", signerId: s.id });
  }
  return out;
}

/** Default places for a signer's fields on the last page (two columns). */
export function autoFields(signerIds: string[], lastPage: number): { signerId: string; type: FieldType; page: number; x: number; y: number }[] {
  return signerIds.flatMap((id, i) => {
    const x = i % 2 === 0 ? 8 : 55;
    const y = 52 + Math.floor(i / 2) * 22;
    return [{ signerId: id, type: "signature" as const, page: lastPage, x, y }, { signerId: id, type: "date" as const, page: lastPage, x, y: y + 12 }];
  });
}

/** Drawn or uploaded signatures must be images; typed signatures need at least two letters. */
export function isValidSignature(method: SignMethod, value: string): boolean {
  if (method === "type") return value.replace(/[^\p{L}]/gu, "").length >= 2;
  return /^data:image\/(png|jpeg|webp|svg\+xml);/.test(value) && value.length > 40;
}
export const SIG_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const SIG_UPLOAD_MAX = 2 * 1024 * 1024;
export const validateSignatureUpload = (f: { type: string; size: number }): "type" | "size" | null => (!SIG_UPLOAD_TYPES.includes(f.type) ? "type" : f.size > SIG_UPLOAD_MAX ? "size" : null);

/* ---------- Leases ---------- */
export type LeaseDisplay = "draft" | "active" | "expiring" | "month_to_month" | "ended";
export const EXPIRING_DAYS = 90;
/** Active leases inside 90 days of their end date show as Expiring; past the end they continue month-to-month. */
export function leaseDisplay(l: Pick<Lease, "state" | "end">, todayIso: string): LeaseDisplay {
  if (l.state !== "active") return l.state;
  const left = daysBetween(todayIso, l.end);
  if (left < 0) return "month_to_month";
  return left <= EXPIRING_DAYS ? "expiring" : "active";
}

/** Renewal reminders (90/60/30 days) that are switched on and already due. */
export function dueReminders(l: Pick<Lease, "state" | "end" | "reminders">, todayIso: string): (90 | 60 | 30)[] {
  if (l.state !== "active") return [];
  const left = daysBetween(todayIso, l.end);
  if (left < 0) return [];
  const on: [90 | 60 | 30, boolean][] = [[90, l.reminders.d90], [60, l.reminders.d60], [30, l.reminders.d30]];
  return on.filter(([n, enabled]) => enabled && left <= n).map(([n]) => n);
}

/** Next anniversary of the start date on or after today (when rent escalates). */
export function nextEscalation(startIso: string, todayIso: string): string {
  const [y, m, day] = startIso.split("-").map(Number) as [number, number, number];
  let year = Number(todayIso.slice(0, 4));
  const mk = (yy: number) => `${yy}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (year <= y) year = y + 1;
  let iso = mk(year);
  if (iso < todayIso) iso = mk(year + 1);
  return iso;
}

export type RenewIssue = "end" | "rent";
/** A renewal must end after the current end date and keep rent above R 0. */
export function renewIssues(l: Pick<Lease, "end">, newEnd: string, newRent: number): RenewIssue[] {
  const out: RenewIssue[] = [];
  if (!newEnd || newEnd <= l.end) out.push("end");
  if (!(newRent > 0)) out.push("rent");
  return out;
}
/** Month-to-month is offered once a lease is active and expiring, or already past its end date. */
export const canConvertMonthToMonth = (l: Pick<Lease, "state" | "end">, todayIso: string) => l.state === "active" && daysBetween(todayIso, l.end) <= EXPIRING_DAYS;

/* ---------- Merge fields ---------- */
/** Replaces {{field}} placeholders. Unknown or empty fields stay visible as [field] and are listed in `missing`. */
export function renderMerge(text: string, values: Record<string, string | undefined>): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const out = text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => {
    const v = values[k];
    if (v === undefined || v.trim() === "") { missing.add(k); return `[${k}]`; }
    return v;
  });
  return { text: out, missing: [...missing] };
}

/* ---------- Screening ---------- */
export const REQUIRED_CHECKS: CheckKey[] = ["id", "income", "landlord", "affordability", "popia", "deposit"];
/** Rent up to 30% of gross income passes, up to 35% is a concern, above that fails. */
export function affordability(rent: number, income: number): { ratio: number; result: CheckResult } | null {
  if (!(income > 0) || !(rent > 0)) return null;
  const ratio = Math.round((rent / income) * 1000) / 10;
  return { ratio, result: ratio <= 30 ? "pass" : ratio <= 35 ? "concern" : "fail" };
}

/** A check counts as complete when it's ticked and has a result. */
export const isComplete = (c?: ScreeningCheck) => !!c && c.done && !!c.result;
export function screeningProgress(checks: Partial<Record<CheckKey, ScreeningCheck>>, all: readonly CheckKey[]) {
  const done = all.filter((k) => isComplete(checks[k])).length;
  const requiredDone = REQUIRED_CHECKS.filter((k) => isComplete(checks[k])).length;
  const failed = all.filter((k) => isComplete(checks[k]) && checks[k]!.result === "fail");
  const missing = REQUIRED_CHECKS.filter((k) => !isComplete(checks[k]));
  return { done, total: all.length, requiredDone, requiredTotal: REQUIRED_CHECKS.length, pct: Math.round((done / all.length) * 100), failed, missing, canMarkReady: missing.length === 0 && failed.length === 0 };
}

/* ---------- Viewings ---------- */
export const VIEWING_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];
/** Slots still free on a day for one unit (each slot holds one viewing per unit). Past slots today are not offered. */
export function freeSlots(dateIso: string, booked: { date: string; time: string }[], now: Date): string[] {
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return VIEWING_SLOTS.filter((t) => !booked.some((b) => b.date === dateIso && b.time === t) && (dateIso > todayIso || (dateIso === todayIso && t > nowHm)));
}
