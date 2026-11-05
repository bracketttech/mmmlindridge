import { getTenancy } from "./tenancy-store";
// Portfolio mock seed (properties, units, documents). The browser store in ./portfolio-store.ts copies this on first run.
import { properties as baseProps, units as baseUnits, tenants } from "./data";

export const PROPERTY_TYPES = ["apartment_block", "house", "complex", "townhouse", "commercial", "student", "granny_flat"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export const AMENITIES = ["parking", "secure_access", "security_24h", "electric_fence", "backup_power", "solar", "borehole", "fibre", "pool", "gym", "garden", "braai", "laundry", "lift", "pet_friendly"] as const;
export type Amenity = (typeof AMENITIES)[number];
export type UnitStatus = "vacant" | "occupied" | "notice" | "maintenance";
export const UNIT_STATUSES: UnitStatus[] = ["vacant", "occupied", "notice", "maintenance"];
export const DOC_TYPES = ["title_deed", "compliance", "insurance", "plans", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type PropertyRecord = {
  id: string; name: string; type: PropertyType;
  address: string; suburb: string; city: string; province: string; postalCode: string; erf: string;
  description: string; yearBuilt: string;
  /** Image URLs or data URLs; "bundled:<id>" points at a photo shipped in src/images. */
  photos: string[];
  amenities: Amenity[];
  municipal: { municipality: string; accountNo: string; ratesMonthly: number; electricity: "prepaid" | "conventional"; electricityMeter: string; waterMeter: string };
  rules: { text: string; pets: boolean; smoking: boolean; quietFrom: string; quietTo: string };
  staffIds: string[];
  createdAt: string;
};

export type UnitRecord = {
  id: string; propertyId: string; label: string; beds: number; baths: number; sizeM2: number;
  rent: number; deposit: number; status: UnitStatus; features: string[];
};

export type DocumentRecord = {
  id: string; propertyId: string; name: string; type: DocType; mime: string; size: number;
  uploadedAt: string; uploadedBy: string; expiresAt?: string | undefined;
};

const EXTRA: Record<string, Omit<PropertyRecord, "id" | "name" | "address" | "suburb" | "province" | "photos" | "createdAt">> = {
  p1: {
    type: "apartment_block", city: "Johannesburg", postalCode: "2196", erf: "Erf 1234, Sandown", yearBuilt: "2012",
    description: "Secure, modern apartment block a short walk from Sandton City and the Gautrain station.",
    amenities: ["secure_access", "parking", "backup_power", "pool", "fibre", "garden"],
    municipal: { municipality: "City of Johannesburg", accountNo: "551 234 7781", ratesMonthly: 18450, electricity: "prepaid", electricityMeter: "0141 2233 4455", waterMeter: "JHB-WM-88213" },
    rules: { text: "No braais on balconies. Visitors sign in at the gate. Refuse goes out on Tuesdays.", pets: false, smoking: false, quietFrom: "22:00", quietTo: "06:00" },
    staffIds: ["s1", "s2", "s3"],
  },
  p2: {
    type: "apartment_block", city: "Johannesburg", postalCode: "2196", erf: "Erf 88, Rosebank", yearBuilt: "2018",
    description: "Converted warehouse lofts with double-volume ceilings in the heart of Rosebank.",
    amenities: ["lift", "secure_access", "fibre", "gym", "parking", "solar"],
    municipal: { municipality: "City of Johannesburg", accountNo: "551 998 1020", ratesMonthly: 11200, electricity: "prepaid", electricityMeter: "0177 5521 9003", waterMeter: "JHB-WM-11920" },
    rules: { text: "Bicycles in the basement racks only. Lift bookings needed for moving day.", pets: true, smoking: false, quietFrom: "22:00", quietTo: "07:00" },
    staffIds: ["s2", "s3"],
  },
  p3: {
    type: "complex", city: "Sandton", postalCode: "2191", erf: "Erf 512, Bryanston Ext 3", yearBuilt: "2006",
    description: "Ten family villas in a leafy, gated complex with a communal pool and borehole.",
    amenities: ["pool", "garden", "borehole", "electric_fence", "braai", "pet_friendly", "backup_power"],
    municipal: { municipality: "City of Johannesburg", accountNo: "552 410 3377", ratesMonthly: 14800, electricity: "conventional", electricityMeter: "BRY-EM-4410", waterMeter: "JHB-WM-50122" },
    rules: { text: "Two pets per villa with prior approval. Speed limit 10 km/h inside the complex.", pets: true, smoking: true, quietFrom: "22:30", quietTo: "06:30" },
    staffIds: ["s1", "s3", "s4"],
  },
  p4: {
    type: "apartment_block", city: "Cape Town", postalCode: "8005", erf: "Erf 2071, Camps Bay", yearBuilt: "2020",
    description: "Ocean-facing residences and penthouses with sunset views over the Atlantic.",
    amenities: ["pool", "lift", "security_24h", "parking", "backup_power", "fibre"],
    municipal: { municipality: "City of Cape Town", accountNo: "CCT 4410 2290", ratesMonthly: 21600, electricity: "prepaid", electricityMeter: "0199 3300 1188", waterMeter: "CCT-WM-77820" },
    rules: { text: "Holiday letting is not permitted. Water restrictions apply during summer.", pets: false, smoking: false, quietFrom: "23:00", quietTo: "07:00" },
    staffIds: ["s3"],
  },
};

const LABELS: Record<string, string[]> = {
  p1: [...Array.from({ length: 12 }, (_, i) => `A${101 + i}`), ...Array.from({ length: 12 }, (_, i) => `B${201 + i}`)],
  p2: Array.from({ length: 16 }, (_, i) => `Loft ${i + 1}`),
  p3: Array.from({ length: 10 }, (_, i) => `Villa ${i + 1}`),
  p4: ["PH1", "PH2", ...Array.from({ length: 6 }, (_, i) => `Suite ${i + 1}`)],
};
/** Generated (non-seed) units that are not let, so totals match the dashboard. */
const NOT_LET: Record<string, { vacant: string[]; maintenance: string[]; notice: string[] }> = {
  p1: { vacant: ["B211"], maintenance: ["B212"], notice: ["A107"] },
  p2: { vacant: [], maintenance: ["Loft 12"], notice: ["Loft 9"] },
  p3: { vacant: ["Villa 9"], maintenance: [], notice: ["Villa 7"] },
  p4: { vacant: ["Suite 6"], maintenance: [], notice: [] },
};

function unitSpec(pid: string, label: string, i: number) {
  if (pid === "p1") { const beds = (i % 3) + 1; return { beds, baths: beds > 1 ? 2 : 1, sizeM2: 45 + beds * 22, rent: [8900, 12500, 16800][beds - 1]!, features: beds > 1 ? ["Balcony", "Built-in cupboards"] : ["Built-in cupboards"] }; }
  if (pid === "p2") { const beds = i % 2 ? 2 : 1; return { beds, baths: 1, sizeM2: beds === 2 ? 92 : 68, rent: beds === 2 ? 14500 : 11200, features: ["Double-volume ceiling", "Open-plan kitchen"] }; }
  if (pid === "p3") { const beds = i % 2 ? 4 : 3; return { beds, baths: beds - 1, sizeM2: beds === 4 ? 240 : 190, rent: beds === 4 ? 28000 : 22500, features: ["Private garden", "Double garage"] }; }
  const ph = label.startsWith("PH");
  return { beds: ph ? 3 : 2, baths: ph ? 3 : 2, sizeM2: ph ? 210 : 120, rent: ph ? 26500 : 18500, features: ph ? ["Sea view", "Private plunge pool"] : ["Sea view", "Balcony"] };
}

export function seedUnits(): UnitRecord[] {
  const out: UnitRecord[] = [];
  for (const [pid, labels] of Object.entries(LABELS)) {
    labels.forEach((label, i) => {
      const spec = unitSpec(pid, label, i);
      const existing = baseUnits.find((u) => u.propertyId === pid && u.label === label);
      const nl = NOT_LET[pid]!;
      const status: UnitStatus = existing ? existing.status : nl.vacant.includes(label) ? "vacant" : nl.maintenance.includes(label) ? "maintenance" : nl.notice.includes(label) ? "notice" : "occupied";
      const rent = existing?.rent ?? spec.rent;
      out.push({ id: existing?.id ?? `${pid}-${i + 1}`, propertyId: pid, label, ...spec, beds: existing?.beds ?? spec.beds, rent, deposit: rent, status });
    });
  }
  return out;
}

export function seedProperties(): PropertyRecord[] {
  return baseProps.map((p, i) => ({
    id: p.id, name: p.name, address: p.address, suburb: p.suburb.split(",")[0]!, province: p.province,
    ...EXTRA[p.id]!, photos: [`bundled:${p.id}`], createdAt: `2025-0${i + 2}-15`,
  }));
}

const D = (id: string, propertyId: string, name: string, type: DocType, size: number, uploadedAt: string, expiresAt?: string, mime = "application/pdf"): DocumentRecord =>
  ({ id, propertyId, name, type, mime, size, uploadedAt, uploadedBy: "Janice Tinto", expiresAt });

export function seedDocuments(): DocumentRecord[] {
  return [
    D("d1", "p1", "Title deed — Erf 1234 Sandown.pdf", "title_deed", 1_820_000, "2025-02-15"),
    D("d2", "p1", "Electrical certificate of compliance.pdf", "compliance", 640_000, "2025-03-02", "2027-03-02"),
    D("d3", "p1", "Gas certificate of conformity.pdf", "compliance", 410_000, "2025-03-04", "2026-12-04"),
    D("d4", "p1", "Building insurance — Santam 2026.pdf", "insurance", 920_000, "2026-01-10", "2027-01-10"),
    D("d5", "p1", "Approved building plans — Block A & B.pdf", "plans", 6_400_000, "2025-02-20"),
    D("d6", "p2", "Title deed — Erf 88 Rosebank.pdf", "title_deed", 1_510_000, "2025-03-15"),
    D("d7", "p2", "Fire compliance certificate.pdf", "compliance", 530_000, "2026-05-01", "2027-05-01"),
    D("d8", "p2", "Lift inspection report.jpg", "other", 2_300_000, "2026-08-12", undefined, "image/jpeg"),
    D("d9", "p3", "Electrical CoC — Villa block.pdf", "compliance", 700_000, "2024-12-12", "2026-12-12"),
    D("d10", "p3", "Homeowners insurance — Old Mutual.pdf", "insurance", 880_000, "2026-02-01", "2027-02-01"),
    D("d11", "p3", "Site plan.png", "plans", 3_100_000, "2025-04-18", undefined, "image/png"),
    D("d12", "p4", "Sectional title deed — PH1.pdf", "title_deed", 1_960_000, "2025-05-15"),
  ];
}

/** Live tenant on a unit (reads the tenancy store so edits show everywhere). */
export const tenantForUnit = (unitId: string) => getTenancy().tenants.find((t) => t.unitId === unitId && !t.archived);
