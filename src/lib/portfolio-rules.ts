// Business rules for properties, units and uploads (UI-side validation). Covered by portfolio-rules.test.ts.

export type UploadKind = "document" | "photo";

export const UPLOAD_RULES: Record<UploadKind, { types: string[]; exts: string[]; maxBytes: number; maxFiles: number }> = {
  document: { types: ["application/pdf", "image/jpeg", "image/png", "image/webp"], exts: ["pdf", "jpg", "jpeg", "png", "webp"], maxBytes: 10 * 1024 * 1024, maxFiles: 10 },
  photo: { types: ["image/jpeg", "image/png", "image/webp"], exts: ["jpg", "jpeg", "png", "webp"], maxBytes: 5 * 1024 * 1024, maxFiles: 8 },
};

export type UploadError = "type" | "size" | "empty";

/** Returns why a file is rejected, or null when it is accepted. */
export function checkUpload(file: { name: string; type: string; size: number }, kind: UploadKind): UploadError | null {
  const rule = UPLOAD_RULES[kind];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!rule.types.includes(file.type) && !rule.exts.includes(ext)) return "type";
  if (file.size <= 0) return "empty";
  if (file.size > rule.maxBytes) return "size";
  return null;
}

export function formatBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** South African postal codes are exactly four digits. */
export const isSaPostalCode = (s: string) => /^\d{4}$/.test(s.trim());

/**
 * Bulk unit labels: prefix + running number (optionally zero-padded), e.g. "A" + 101 → A101, A102…
 * Labels that already exist on the property are reported as clashes and skipped.
 */
export function bulkUnitLabels(opts: { prefix: string; start: number; count: number; pad?: number }, existing: string[] = []) {
  const taken = new Set(existing.map((l) => l.trim().toLowerCase()));
  const labels: string[] = [];
  const clashes: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const n = String(opts.start + i).padStart(opts.pad ?? 0, "0");
    const label = `${opts.prefix}${n}`.trim();
    (taken.has(label.toLowerCase()) ? clashes : labels).push(label);
  }
  return { labels, clashes };
}

export const MAX_BULK_UNITS = 100;

/** A unit with a tenant still linked cannot be deleted — end or move the lease first. */
export const canDeleteUnit = (u: { tenantId?: string | undefined; status: string }) => !u.tenantId && u.status !== "occupied" && u.status !== "notice";
