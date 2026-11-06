// Leasing services (Phase 8, UI only): leases, templates, e-signature, applications and inspections.
// Pages call these; swap the bodies for real API calls later.
import { commitLeasing, getLeasing } from "@/mocks/leasing-store";
import { getState, newId } from "@/mocks/portfolio-store";
import { commitTenancy, getTenancy } from "@/mocks/tenancy-store";
import { buildRooms, CHECK_KEYS, OWNER_SIGNER, type AppStage, type Application, type CheckKey, type Condition, type Envelope, type EnvKind, type EnvStatus, type FileMeta, type InspPhoto, type InspState, type Inspection, type Lease, type LeaseTemplate, type ScreeningCheck, type SignField, type Signer, type SignMethod, type TemplateSection } from "@/mocks/leasing";
import type { TenantRecord } from "@/mocks/tenancy";
import { affordability, autoFields, canConvertMonthToMonth, canSignerAct, dueReminders, envelopeStatus, leaseDisplay, nextEscalation, renderMerge, renewIssues, screeningProgress, sendIssues, type LeaseDisplay } from "@/lib/leasing-rules";
import { formatDate, formatZAR } from "@/lib/format";

export type { Lease, LeaseTemplate, Envelope, Signer, SignField, EnvKind, EnvStatus, Application, AppStage, CheckKey, ScreeningCheck, Inspection, InspState, Condition, InspPhoto, FileMeta, TemplateSection, SignMethod } from "@/mocks/leasing";

const delay = <T,>(v: T, ms = 500) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));
export class LeasingStorageFullError extends Error {}
const L = () => getLeasing();
const save = (mut: Parameters<typeof commitLeasing>[0]) => { if (!commitLeasing(mut)) throw new LeasingStorageFullError("storage"); };
const pad = (n: number) => String(n).padStart(2, "0");
const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const today = () => nowLocal().slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const tenant = (id?: string) => getTenancy().tenants.find((x) => x.id === id);
const prop = (id?: string) => getState().properties.find((x) => x.id === id);
const unit = (id?: string) => getState().units.find((x) => x.id === id);
const placeOf = (propertyId: string, unitId: string) => `${prop(propertyId)?.name ?? "—"} · ${unit(unitId)?.label ?? "—"}`;

/** Mock device + IP for the audit trail (a real backend records these server-side). */
export function deviceLabel(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "device";
  return `${browser} on ${os}`;
}
const ips = new Map<string, string>();
/** One mock IP per person per session so the audit trail reads like a single device. */
const mockIp = (actor = "") => { if (!ips.has(actor)) ips.set(actor, `102.${130 + Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 250)}`); return ips.get(actor)!; };
const device = () => (typeof navigator === "undefined" ? "Browser" : deviceLabel(navigator.userAgent));

/* ---------- Merge values ---------- */
export function mergeValuesFor(l: Lease | undefined): Record<string, string> {
  const x = tenant(l?.tenantId);
  const p = prop(l?.propertyId);
  return {
    tenant_name: x?.name ?? "", tenant_id: x?.idNumber ?? "", co_tenant: l?.coTenant || "None",
    landlord_name: "Janice Tinto", property_name: p?.name ?? "", property_address: p ? `${p.address}, ${p.suburb}, ${p.postalCode}` : "",
    unit: unit(l?.unitId)?.label ?? "", lease_start: l ? formatDate(l.start) : "", lease_end: l ? formatDate(l.end) : "",
    rent: l ? formatZAR(l.rent) : "", deposit: l ? formatZAR(l.deposit) : "", escalation: l ? `${String(l.escalationPct).replace(".", ",")}%` : "",
    notice_period: l ? `${l.noticeDays} days'` : "", rent_due_day: l ? String(l.rentDueDay) : "",
    special_terms: l ? (l.specialTerms.length ? l.specialTerms.map((s, i) => `${i + 1}. ${s}`).join(" ") : "None.") : "", today: formatDate(today()),
  };
}
export const renderSections = (sections: TemplateSection[], values: Record<string, string>) => sections.map((s) => ({ ...s, heading: renderMerge(s.heading, values).text, body: renderMerge(s.body, values).text }));

/* ---------- Leases ---------- */
export type LeaseView = Lease & { tenantName: string; tenantEmail: string; place: string; display: LeaseDisplay; daysLeft: number; due: (90 | 60 | 30)[]; nextEscalation: string; canMonthToMonth: boolean; signature?: { id: string; status: EnvStatus; title: string } | undefined };
const daysLeft = (end: string) => Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 864e5);
function leaseView(l: Lease): LeaseView {
  const x = tenant(l.tenantId);
  const envs = L().envelopes.filter((e) => e.leaseId === l.id && e.kind === "lease" && !e.voided).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const e = envs[0];
  return {
    ...l, tenantName: x?.name ?? "—", tenantEmail: x?.email ?? "", place: placeOf(l.propertyId, l.unitId), display: leaseDisplay(l, today()), daysLeft: daysLeft(l.end),
    due: dueReminders(l, today()), nextEscalation: nextEscalation(l.start, today()), canMonthToMonth: canConvertMonthToMonth(l, today()),
    signature: e ? { id: e.id, status: envelopeStatus(e, nowLocal()), title: e.title } : undefined,
  };
}
export type LeaseInput = Pick<Lease, "tenantId" | "start" | "end" | "rent" | "deposit" | "escalationPct" | "noticeDays" | "rentDueDay" | "specialTerms" | "templateId"> & { coTenant?: string | undefined };
const leaseNumber = (start: string) => `L-${start.slice(0, 4)}-${String(L().leases.length + 1).padStart(3, "0")}`;
function newLease(input: LeaseInput, propertyId: string, unitId: string, note = "Draft lease created"): Lease {
  return { ...input, id: newId("l"), number: leaseNumber(input.start), propertyId, unitId, state: "draft", reminders: { d90: true, d60: true, d30: true }, history: [{ at: today(), note }], createdAt: today() };
}

export const leaseService = {
  list: (propertyId = "all") => delay(L().leases.filter((l) => propertyId === "all" || l.propertyId === propertyId).map(leaseView).sort((a, b) => a.end.localeCompare(b.end))),
  get: (id: string) => { const l = L().leases.find((x) => x.id === id); return delay(l ? leaseView(l) : null, 300); },
  forTenant: (tenantId: string) => delay(L().leases.filter((l) => l.tenantId === tenantId).map(leaseView).sort((a, b) => b.start.localeCompare(a.start)), 400),
  async create(input: LeaseInput) {
    const x = tenant(input.tenantId)!;
    const l = newLease(input, x.propertyId, x.unitId);
    save((s) => { s.leases.unshift(l); });
    return delay(l.id, 600);
  },
  async update(id: string, input: Partial<LeaseInput>) {
    save((s) => { const l = s.leases.find((y) => y.id === id); if (l) { Object.assign(l, input); l.history.unshift({ at: today(), note: "Lease details updated" }); } });
    return delay(true, 400);
  },
  async setReminders(id: string, reminders: Lease["reminders"]) { save((s) => { const l = s.leases.find((y) => y.id === id); if (l) l.reminders = reminders; }); return delay(true, 200); },
  async renew(id: string, newEnd: string, newRent: number) {
    const l = L().leases.find((y) => y.id === id)!;
    if (renewIssues(l, newEnd, newRent).length) throw new Error("invalid renewal");
    save((s) => { const x = s.leases.find((y) => y.id === id)!; x.history.unshift({ at: today(), note: `Renewed to ${formatDate(newEnd)} at ${formatZAR(newRent)}` }); x.end = newEnd; x.rent = newRent; x.state = "active"; });
    commitTenancy((s) => { const x = s.tenants.find((y) => y.id === l.tenantId); if (x) { x.leaseEnd = newEnd; x.rent = newRent; } });
    return delay(true, 600);
  },
  async monthToMonth(id: string) {
    save((s) => { const x = s.leases.find((y) => y.id === id); if (x) { x.state = "month_to_month"; x.noticeDays = Math.max(30, x.noticeDays); x.history.unshift({ at: today(), note: "Converted to month-to-month" }); } });
    return delay(true, 500);
  },
  async end(id: string) { save((s) => { const x = s.leases.find((y) => y.id === id); if (x) { x.state = "ended"; x.history.unshift({ at: today(), note: "Lease ended" }); } }); return delay(true, 500); },
  async remove(id: string) { save((s) => { s.leases = s.leases.filter((x) => x.id !== id); }); return delay(true, 400); },
  async sendReminder(id: string, channel: string) { save((s) => { s.leases.find((y) => y.id === id)?.history.unshift({ at: today(), note: `Renewal reminder sent via ${channel}` }); }); return delay(true, 600); },
};

/* ---------- Templates ---------- */
export const templateService = {
  list: () => delay(L().templates, 300),
  async save(tpl: LeaseTemplate) {
    save((s) => { const i = s.templates.findIndex((x) => x.id === tpl.id); const rec = { ...tpl, updatedAt: today() }; if (i >= 0) s.templates[i] = rec; else s.templates.unshift(rec); });
    return delay(true, 500);
  },
  async duplicate(id: string, name: string) {
    const src = L().templates.find((x) => x.id === id)!;
    const copy: LeaseTemplate = { ...structuredClone(src), id: newId("tpl"), name, updatedAt: today() };
    save((s) => { s.templates.unshift(copy); });
    return delay(copy.id, 400);
  },
  async remove(id: string) { save((s) => { s.templates = s.templates.filter((x) => x.id !== id); }); return delay(true, 300); },
};

/* ---------- E-signature ---------- */
export type EnvelopeView = Envelope & { status: EnvStatus; place: string; leaseNumber?: string | undefined; signedCount: number };
function envView(e: Envelope): EnvelopeView {
  const l = L().leases.find((x) => x.id === e.leaseId);
  const insp = L().inspections.find((x) => x.id === e.inspectionId);
  const pages = e.pages.length ? e.pages : renderSections(L().templates.find((tp) => tp.id === (l?.templateId ?? "tpl-res"))?.sections ?? [], mergeValuesFor(l));
  const where = l ? placeOf(l.propertyId, l.unitId) : insp ? placeOf(insp.propertyId, insp.unitId) : "—";
  return { ...e, pages, status: envelopeStatus(e, nowLocal()), place: where, leaseNumber: l?.number, signedCount: e.signers.filter((s) => s.state === "signed").length };
}
export type DraftInput = { title: string; kind: EnvKind; leaseId?: string | undefined; inspectionId?: string | undefined; pages: TemplateSection[]; signers: Omit<Signer, "state" | "token">[]; fields: Omit<SignField, "id">[] };
const signerToken = (envId: string, signerId: string) => `sign-${envId}-${signerId}-${Math.random().toString(36).slice(2, 7)}`;
function propertyOfEnvelope(e: Envelope) {
  const l = L().leases.find((x) => x.id === e.leaseId);
  return l?.propertyId ?? L().inspections.find((x) => x.id === e.inspectionId)?.propertyId;
}
function afterSigned(s: ReturnType<typeof getLeasing>, e: Envelope) {
  if (!e.signers.every((x) => x.state === "signed")) return;
  e.audit.push({ id: newId("au"), at: nowLocal(), kind: "completed", actor: "Nestly" });
  const l = s.leases.find((x) => x.id === e.leaseId);
  if (l && e.kind === "lease" && l.state === "draft") { l.state = "active"; l.history.unshift({ at: today(), note: "Lease signed by all parties" }); }
}

export const signService = {
  list: (propertyId = "all") => delay(L().envelopes.filter((e) => propertyId === "all" || propertyOfEnvelope(e) === propertyId).map(envView).sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt))),
  get: (id: string) => { const e = L().envelopes.find((x) => x.id === id); return delay(e ? envView(e) : null, 300); },
  byToken: (token: string) => {
    const e = L().envelopes.find((x) => x.signers.some((s) => s.token === token));
    if (!e) return delay(null, 500);
    const v = envView(e);
    return delay({ envelope: v, signer: v.signers.find((s) => s.token === token)! }, 500);
  },
  forSigner: (email: string) => delay(L().envelopes.filter((e) => e.sentAt && e.signers.some((s) => s.email.toLowerCase() === email.toLowerCase())).map(envView).sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? "")), 400),
  async createDraft(input: DraftInput) {
    const id = newId("e");
    const env: Envelope = {
      id, title: input.title, kind: input.kind, leaseId: input.leaseId, inspectionId: input.inspectionId, pages: input.pages,
      signers: input.signers.map((x) => ({ ...x, state: "pending", token: signerToken(id, x.id) })),
      fields: input.fields.map((f) => ({ ...f, id: newId("f") })), createdAt: today(), createdBy: OWNER_SIGNER.name,
      audit: [{ id: newId("au"), at: nowLocal(), kind: "created", actor: OWNER_SIGNER.name, ip: mockIp(OWNER_SIGNER.name), device: device() }],
    };
    save((s) => { s.envelopes.unshift(env); });
    return delay(id, 400);
  },
  async updateDraft(id: string, input: DraftInput) {
    save((s) => {
      const e = s.envelopes.find((x) => x.id === id);
      if (!e || e.sentAt) return;
      Object.assign(e, { title: input.title, kind: input.kind, leaseId: input.leaseId, inspectionId: input.inspectionId, pages: input.pages });
      e.signers = input.signers.map((x) => ({ ...x, state: "pending", token: e.signers.find((y) => y.id === x.id)?.token ?? signerToken(id, x.id) }));
      e.fields = input.fields.map((f) => ({ ...f, id: newId("f") }));
    });
    return delay(id, 300);
  },
  async send(id: string, opts: { expiresInDays: number; message: string; channels: string[] }) {
    const e = L().envelopes.find((x) => x.id === id)!;
    if (sendIssues(e).length) throw new Error("not ready");
    save((s) => {
      const x = s.envelopes.find((y) => y.id === id)!;
      x.sentAt = nowLocal(); x.expiresAt = addDays(today(), opts.expiresInDays); x.message = opts.message;
      x.audit.push({ id: newId("au"), at: nowLocal(), kind: "sent", actor: OWNER_SIGNER.name, ip: mockIp(OWNER_SIGNER.name), device: device(), note: opts.channels.join(", ") });
    });
    return delay(true, 700);
  },
  async markViewed(token: string) {
    save((s) => {
      const e = s.envelopes.find((x) => x.signers.some((y) => y.token === token)); if (!e) return;
      const sg = e.signers.find((y) => y.token === token)!;
      if (sg.state === "pending" && canSignerAct(envelopeStatus(e, nowLocal()), sg)) { sg.state = "viewed"; sg.viewedAt = nowLocal(); e.audit.push({ id: newId("au"), at: nowLocal(), kind: "viewed", actor: sg.name, ip: mockIp(sg.name), device: device() }); }
    });
    return delay(true, 100);
  },
  async sign(token: string, method: SignMethod, signature: string) {
    let ok = false;
    save((s) => {
      const e = s.envelopes.find((x) => x.signers.some((y) => y.token === token)); if (!e) return;
      const sg = e.signers.find((y) => y.token === token)!;
      if (!canSignerAct(envelopeStatus(e, nowLocal()), sg)) return;
      ok = true;
      const at = nowLocal();
      Object.assign(sg, { state: "signed", signedAt: at, method, signature, viewedAt: sg.viewedAt ?? at });
      e.audit.push({ id: newId("au"), at, kind: "signed", actor: sg.name, ip: mockIp(sg.name), device: device(), note: method });
      afterSigned(s, e);
    });
    if (!ok) throw new Error("closed");
    return delay(true, 800);
  },
  async decline(token: string, reason: string) {
    save((s) => {
      const e = s.envelopes.find((x) => x.signers.some((y) => y.token === token)); if (!e) return;
      const sg = e.signers.find((y) => y.token === token)!;
      if (!canSignerAct(envelopeStatus(e, nowLocal()), sg)) return;
      sg.state = "declined"; sg.declineReason = reason;
      e.audit.push({ id: newId("au"), at: nowLocal(), kind: "declined", actor: sg.name, ip: mockIp(sg.name), device: device(), note: reason });
    });
    return delay(true, 600);
  },
  async remind(id: string) {
    save((s) => { const e = s.envelopes.find((y) => y.id === id); if (e) e.audit.push({ id: newId("au"), at: nowLocal(), kind: "reminded", actor: OWNER_SIGNER.name, note: e.signers.filter((x) => x.state !== "signed").map((x) => x.name).join(", ") }); });
    return delay(true, 500);
  },
  async voidEnvelope(id: string) {
    save((s) => { const e = s.envelopes.find((y) => y.id === id); if (e) { e.voided = true; e.audit.push({ id: newId("au"), at: nowLocal(), kind: "voided", actor: OWNER_SIGNER.name }); } });
    return delay(true, 400);
  },
  /** Re-opens an expired envelope with a new deadline (same signers, fresh links). */
  async extend(id: string, days: number) {
    save((s) => { const e = s.envelopes.find((y) => y.id === id); if (e) { e.expiresAt = addDays(today(), days); e.audit.push({ id: newId("au"), at: nowLocal(), kind: "sent", actor: OWNER_SIGNER.name, note: `Deadline extended to ${formatDate(e.expiresAt)}` }); } });
    return delay(true, 400);
  },
  async removeDraft(id: string) { save((s) => { s.envelopes = s.envelopes.filter((e) => e.id !== id || !!e.sentAt); }); return delay(true, 300); },
};

/* ---------- Applications ---------- */
export type ApplicationView = Application & { propertyName: string; unitLabel: string; rent: number; progress: ReturnType<typeof screeningProgress>; afford: ReturnType<typeof affordability> };
function appView(a: Application): ApplicationView {
  const u = unit(a.unitId);
  return { ...a, propertyName: prop(a.propertyId)?.name ?? "—", unitLabel: u?.label ?? "—", rent: u?.rent ?? 0, progress: screeningProgress(a.checks, CHECK_KEYS), afford: affordability(u?.rent ?? 0, a.income) };
}
const editApp = (id: string, fn: (a: Application) => void) => save((s) => { const a = s.applications.find((x) => x.id === id); if (a) fn(a); });
export type ApplyInput = Pick<Application, "name" | "email" | "phone" | "idNumber" | "employer" | "income" | "moveIn" | "occupants" | "message" | "popiaConsent" | "creditConsent" | "docs">;
export type Vacancy = { unitId: string; propertyId: string; propertyName: string; label: string; beds: number; baths: number; rent: number; deposit: number; status: "vacant" | "notice"; availableFrom: string; applicants: number; photo?: string | undefined };
const vacancyOf = (u: NonNullable<ReturnType<typeof unit>>): Vacancy => {
  const p = prop(u.propertyId);
  const leaving = L().leases.find((l) => l.unitId === u.id && l.state !== "ended");
  return {
    unitId: u.id, propertyId: u.propertyId, propertyName: p?.name ?? "—", label: u.label, beds: u.beds, baths: u.baths, rent: u.rent, deposit: u.deposit,
    status: u.status === "notice" ? "notice" : "vacant", availableFrom: u.status === "notice" && leaving ? addDays(leaving.end, 1) : today(),
    applicants: L().applications.filter((a) => a.unitId === u.id && a.stage !== "declined" && a.stage !== "approved").length, photo: p?.photos[0],
  };
};

export const applicationService = {
  list: (propertyId = "all") => delay(L().applications.filter((a) => propertyId === "all" || a.propertyId === propertyId).map(appView).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  get: (id: string) => { const a = L().applications.find((x) => x.id === id); return delay(a ? appView(a) : null, 300); },
  vacancies: (propertyId = "all") => delay(getState().units.filter((u) => (u.status === "vacant" || u.status === "notice") && (propertyId === "all" || u.propertyId === propertyId)).map(vacancyOf)),
  /** Public application link: only vacant or on-notice units accept applications. */
  vacancy: (unitId: string) => { const u = unit(unitId); return delay(u && (u.status === "vacant" || u.status === "notice") ? vacancyOf(u) : null, 500); },
  async submit(unitId: string, input: ApplyInput) {
    const u = unit(unitId)!;
    const a: Application = { ...input, id: newId("a"), unitId, propertyId: u.propertyId, stage: "applied", source: "link", checks: input.popiaConsent ? { popia: { done: true, result: "pass", notes: "Consent ticked on the online application.", date: today() } } : {}, ready: false, createdAt: today(), history: [{ at: today(), note: "Application submitted via link" }] };
    save((s) => { s.applications.unshift(a); });
    return delay(a.id, 900);
  },
  async addEnquiry(input: Pick<Application, "name" | "email" | "phone" | "unitId" | "source" | "message">) {
    const u = unit(input.unitId)!;
    const a: Application = { ...input, id: newId("a"), propertyId: u.propertyId, stage: "enquiry", idNumber: "", income: 0, employer: "", moveIn: "", occupants: 1, popiaConsent: false, creditConsent: false, docs: [], checks: {}, ready: false, createdAt: today(), history: [{ at: today(), note: "Enquiry captured" }] };
    save((s) => { s.applications.unshift(a); });
    return delay(a.id, 500);
  },
  async setStage(id: string, stage: AppStage) { editApp(id, (a) => { a.stage = stage; a.history.unshift({ at: today(), note: `Moved to ${stage}` }); }); return delay(true, 300); },
  async bookViewing(id: string, date: string, time: string) {
    editApp(id, (a) => { a.viewing = { date, time, state: "booked" }; if (a.stage === "enquiry") a.stage = "viewing"; a.history.unshift({ at: today(), note: `Viewing booked for ${formatDate(date)} at ${time}` }); });
    return delay(true, 500);
  },
  async setViewing(id: string, state: "done" | "no_show" | "cancel") {
    editApp(id, (a) => { if (!a.viewing) return; if (state === "cancel") { a.history.unshift({ at: today(), note: "Viewing cancelled" }); a.viewing = undefined; } else { a.viewing.state = state; a.history.unshift({ at: today(), note: state === "done" ? "Viewing completed" : "Didn't attend the viewing" }); } });
    return delay(true, 300);
  },
  async updateCheck(id: string, key: CheckKey, check: ScreeningCheck) {
    editApp(id, (a) => { a.checks[key] = check; if (a.stage === "applied") a.stage = "screening"; if (a.ready && !screeningProgress(a.checks, CHECK_KEYS).canMarkReady) a.ready = false; });
    return delay(true, 250);
  },
  async setReady(id: string, ready: boolean) {
    const a = L().applications.find((x) => x.id === id)!;
    if (ready && !screeningProgress(a.checks, CHECK_KEYS).canMarkReady) throw new Error("incomplete");
    editApp(id, (x) => { x.ready = ready; x.history.unshift({ at: today(), note: ready ? "Marked ready to approve" : "Ready to approve removed" }); });
    return delay(true, 300);
  },
  async approve(id: string) {
    const a = L().applications.find((x) => x.id === id)!;
    if (!a.ready) throw new Error("not ready");
    editApp(id, (x) => { x.stage = "approved"; x.history.unshift({ at: today(), note: "Application approved" }); });
    return delay(true, 500);
  },
  async decline(id: string, reason: string) { editApp(id, (a) => { a.stage = "declined"; a.declineReason = reason; a.ready = false; a.history.unshift({ at: today(), note: "Application declined" }); }); return delay(true, 400); },
  /** "Create tenant & lease": creates a pending tenant profile and a draft lease from an approved application. */
  async convert(id: string) {
    const a = L().applications.find((x) => x.id === id)!;
    if (a.stage !== "approved") throw new Error("not approved");
    if (a.tenantId && a.leaseId) return delay({ tenantId: a.tenantId, leaseId: a.leaseId }, 300);
    const u = unit(a.unitId)!;
    const start = a.moveIn && a.moveIn >= today() ? a.moveIn : addDays(today(), 7);
    const endD = new Date(`${start}T00:00:00`); endD.setFullYear(endD.getFullYear() + 1); endD.setDate(endD.getDate() - 1);
    const end = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;
    const tenantRec: TenantRecord = {
      id: newId("t"), name: a.name, email: a.email, phone: a.phone, propertyId: u.propertyId, unitId: u.id, rent: u.rent, status: "pending", paidPct: 0, lastPayment: "",
      idNumber: a.idNumber, employer: a.employer, leaseStart: start, leaseEnd: end, deposit: u.deposit, balance: 0, occupants: [], emergency: { name: "", relation: "", phone: "" }, surety: null,
      archived: false, registered: false, createdAt: today(), docs: a.docs.map((d, i) => ({ id: newId("td") + i, name: d.name, kind: /id/i.test(d.name) ? "id" : "income", size: d.size, uploadedAt: today() })),
    };
    commitTenancy((s) => { s.tenants.unshift(tenantRec); s.history.unshift({ id: newId("h"), tenantId: tenantRec.id, at: today(), kind: "created", by: OWNER_SIGNER.name, note: "From approved application" }); });
    const l = newLease({ tenantId: tenantRec.id, start, end, rent: u.rent, deposit: u.deposit, escalationPct: 8, noticeDays: 30, rentDueDay: 1, specialTerms: [], templateId: "tpl-res" }, u.propertyId, u.id, "Draft lease created from approved application");
    save((s) => { s.leases.unshift(l); const x = s.applications.find((y) => y.id === id)!; x.tenantId = tenantRec.id; x.leaseId = l.id; x.history.unshift({ at: today(), note: "Tenant profile and draft lease created" }); });
    return delay({ tenantId: tenantRec.id, leaseId: l.id }, 800);
  },
  viewings: () => delay(L().applications.filter((a) => a.viewing).map(appView), 300),
};

/* ---------- Inspections ---------- */
export type InspectionView = Inspection & { state: InspState; tenantName: string; place: string; rated: number; items: number; photos: number; envelopeStatus?: EnvStatus | undefined };
function inspView(i: Inspection): InspectionView {
  const e = L().envelopes.find((x) => x.id === i.envelopeId);
  const st = e ? envelopeStatus(e, nowLocal()) : undefined;
  const items = i.rooms.flatMap((r) => r.items);
  const rated = items.filter((x) => x.condition).length;
  const state: InspState = st === "signed" ? "signed" : e && st !== "voided" ? "awaiting_signoff" : rated > 0 || i.rooms.some((r) => r.photos.length) ? "in_progress" : "scheduled";
  return { ...i, state, tenantName: tenant(i.tenantId)?.name ?? "—", place: placeOf(i.propertyId, i.unitId), rated, items: items.length, photos: i.rooms.reduce((a, r) => a + r.photos.length, 0), envelopeStatus: st };
}
const editInsp = (id: string, fn: (i: Inspection) => void) => save((s) => { const i = s.inspections.find((x) => x.id === id); if (i) fn(i); });

export const inspectionService = {
  list: (propertyId = "all") => delay(L().inspections.filter((i) => propertyId === "all" || i.propertyId === propertyId).map(inspView).sort((a, b) => b.date.localeCompare(a.date))),
  get: (id: string) => { const i = L().inspections.find((x) => x.id === id); return delay(i ? inspView(i) : null, 300); },
  forTenant: (tenantId: string) => delay(L().inspections.filter((i) => i.tenantId === tenantId).map(inspView), 300),
  async create(input: { type: Inspection["type"]; leaseId: string; date: string; inspector: string }) {
    const l = L().leases.find((x) => x.id === input.leaseId)!;
    const id = newId("i");
    save((s) => { s.inspections.unshift({ id, type: input.type, propertyId: l.propertyId, unitId: l.unitId, tenantId: l.tenantId, leaseId: l.id, date: input.date, inspector: input.inspector, rooms: buildRooms(id), notes: "", createdAt: today() }); });
    return delay(id, 500);
  },
  async setItem(id: string, roomId: string, itemId: string, patch: { condition?: Condition | undefined; note?: string }) {
    editInsp(id, (i) => { const it = i.rooms.find((r) => r.id === roomId)?.items.find((x) => x.id === itemId); if (it) Object.assign(it, patch); });
    return delay(true, 120);
  },
  async addPhoto(id: string, roomId: string, photo: Omit<InspPhoto, "id">) { editInsp(id, (i) => { i.rooms.find((r) => r.id === roomId)?.photos.push({ ...photo, id: newId("ph") }); }); return delay(true, 200); },
  async removePhoto(id: string, roomId: string, photoId: string) { editInsp(id, (i) => { const r = i.rooms.find((x) => x.id === roomId); if (r) r.photos = r.photos.filter((p) => p.id !== photoId); }); return delay(true, 150); },
  async setNotes(id: string, notes: string) { editInsp(id, (i) => { i.notes = notes; }); return delay(true, 200); },
  async remove(id: string) { save((s) => { s.inspections = s.inspections.filter((x) => x.id !== id); }); return delay(true, 300); },
  /** Sends the condition report to the tenant (and owner) for e-signature. */
  async sendForSignoff(id: string) {
    const i = L().inspections.find((x) => x.id === id)!;
    const x = tenant(i.tenantId)!;
    const label = (c?: Condition) => (c === "good" ? "Good" : c === "fair" ? "Fair" : c === "poor" ? "Poor" : c === "na" ? "N/A" : "Not checked");
    const pages: TemplateSection[] = [
      { id: "p0", heading: `${i.type === "incoming" ? "Incoming" : "Outgoing"} inspection — ${placeOf(i.propertyId, i.unitId)}`, body: `Inspected on ${formatDate(i.date)} by ${i.inspector} with ${x.name}. ${i.notes}`.trim() },
      ...i.rooms.map((r) => ({ id: r.id, heading: r.name, body: r.items.map((it) => `${it.name}: ${label(it.condition)}${it.note ? ` (${it.note})` : ""}`).join(" · ") + (r.photos.length ? ` · ${r.photos.length} photo(s) attached` : "") })),
      { id: "pz", heading: "Agreement", body: "By signing, the Tenant and Landlord agree that this report and its photos reflect the condition of the Premises on the inspection date." },
    ];
    const signers = [{ id: "s1", name: x.name, email: x.email, phone: x.phone, role: "tenant" as const }, { id: "s2", ...OWNER_SIGNER, role: "owner" as const }];
    const envId = await signService.createDraft({
      title: `${i.type === "incoming" ? "Incoming" : "Outgoing"} inspection — ${unit(i.unitId)?.label ?? ""}`, kind: "inspection", inspectionId: i.id, leaseId: i.leaseId, pages, signers,
      fields: autoFields(signers.map((s) => s.id), pages.length - 1),
    });
    await signService.send(envId, { expiresInDays: 7, message: "Please review the inspection report and sign it off.", channels: ["Email", "In app"] });
    editInsp(id, (y) => { y.envelopeId = envId; });
    return delay(envId, 300);
  },
};
