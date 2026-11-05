// Pure tenancy rules (Phase 5). Covered by tenancy-rules.test.ts.
import { CHANGEABLE_FIELDS, type DetailValues, type FieldChange } from "@/mocks/tenancy";

/** Only fields whose trimmed value actually changed. */
export function diffDetails(current: DetailValues, next: DetailValues): FieldChange[] {
  return CHANGEABLE_FIELDS.flatMap((field) => {
    const from = (current[field] ?? "").trim();
    const to = (next[field] ?? "").trim();
    return from === to ? [] : [{ field, from, to }];
  });
}

/** Applies approved changes onto the current values. */
export function applyChanges(current: DetailValues, changes: FieldChange[]): DetailValues {
  const out = { ...current };
  for (const c of changes) out[c.field] = c.to;
  return out;
}

export const MIN_REJECT_REASON = 10;
/** A rejection must explain why, so the tenant can fix it. */
export const isValidRejectReason = (reason: string) => reason.trim().length >= MIN_REJECT_REASON;

/** South African ID: 13 digits, valid YYMMDD birth date and Luhn check digit. */
export function isSaIdNumber(id: string): boolean {
  const s = id.replace(/\s/g, "");
  if (!/^\d{13}$/.test(s)) return false;
  const mm = Number(s.slice(2, 4)), dd = Number(s.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(s[12 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export type LinkChannel = "copy" | "email" | "whatsapp" | "sms";
/** Message the tenant receives with their registration link. SMS is kept short. */
export function registrationMessage(channel: LinkChannel, v: { name: string; property: string; unit: string; url: string; owner: string; expires: string }) {
  const first = v.name.split(" ")[0] ?? v.name;
  if (channel === "sms") return `Nestly: Hi ${first}, register for ${v.property} ${v.unit}: ${v.url} (expires ${v.expires})`;
  return `Hi ${first},\n\n${v.owner} has invited you to Nestly for ${v.property}, unit ${v.unit}. Use this link to check your details and set your password:\n\n${v.url}\n\nThe link works once and expires on ${v.expires}.`;
}
