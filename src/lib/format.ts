// en-ZA formatting helpers: "R 12 500,00", "14 Oct 2026".
const NBSP = /\u00a0|\u202f/g;

export function formatZAR(value: number, opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? true;
  const n = new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
    .format(value)
    .replace(NBSP, " ");
  return `R ${n}`;
}

export function formatCompactZAR(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1).replace(".", ",")}m`;
  if (Math.abs(value) >= 1_000) return `R ${Math.round(value / 1_000)}k`;
  return formatZAR(value, { decimals: false });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
