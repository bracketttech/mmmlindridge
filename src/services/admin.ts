// Phase 9 services (UI only): staff & permissions, legal desk, schedule, announcements, reports, settings, subscription, audit.
// Pages call these; swap the bodies for real API calls (with RLS doing the scoping) later.
import { commitAdmin, getAdmin } from "@/mocks/admin-store";
import { getState, newId } from "@/mocks/portfolio-store";
import { getTenancy } from "@/mocks/tenancy-store";
import { getLeasing } from "@/mocks/leasing-store";
import { getMaint } from "@/mocks/maintenance-store";
import { plans } from "@/mocks/plans";
import { historyFor, vacantSinceDays } from "@/mocks/reports";
import {
  addDaysIso, NOTICE_TEMPLATES, defaultPrefs,
  type Announcement, type AnnCategory, type AnnChannel, type Audience, type AuditArea, type CalEventRecord, type CalKind, type CalStatus, type Company,
  type EvictionCase, type EvictionReason, type NoticeKind, type NotifPrefs, type ProfilePrefs, type StaffMember, type StaffStatus,
} from "@/mocks/admin";
import type { StaffInvite } from "@/mocks/auth";
import { DEFAULT_PRESETS, effective, NO_PERMS, OWNER_PERMS, overrideCount, type Overrides, type PermSet, type Scope, type StaffRole } from "@/lib/access-rules";
import { advanceIssue, casePct, currentStage, deliveryState, overallDelivery, EVICTION_STAGES, type DeliveryState, type EvictionOutcome, type EvictionStage, type NoticeChannel } from "@/lib/legal-rules";
import { announcementStatus, readPct, recipientsFor } from "@/lib/announcement-rules";
import { daysVacant } from "@/lib/reports-rules";
import { quote, type Cycle } from "@/lib/subscription-rules";
import { renderMerge, envelopeStatus } from "@/lib/leasing-rules";
import { readSession } from "@/lib/session";
import { formatDate, formatZAR } from "@/lib/format";
import type { Role } from "@/lib/nav";
import { t } from "@/lib/strings";

export type { StaffMember, StaffStatus, Notice, NoticeKind, NoticeTemplate, EvictionCase, EvictionReason, Announcement, AnnCategory, AnnChannel, Audience, CalKind, CalStatus, Company, NotifPrefs, NotifEvent, NotifChannel, ProfilePrefs, SubInvoice, Subscription, AuditRow, AuditArea } from "@/mocks/admin";
export { NOTICE_KINDS, NOTICE_TEMPLATES, ANN_CATEGORIES, NOTIF_EVENTS, NOTIF_CHANNELS } from "@/mocks/admin";

const delay = <T,>(v: T, ms = 450) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), ms));
export class AdminStorageFullError extends Error {}
const A = () => getAdmin();
const save = (mut: Parameters<typeof commitAdmin>[0]) => { if (!commitAdmin(mut)) throw new AdminStorageFullError("storage"); };
const pad = (n: number) => String(n).padStart(2, "0");
const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const today = () => nowLocal().slice(0, 10);
const tenant = (id?: string) => getTenancy().tenants.find((x) => x.id === id);
const prop = (id?: string) => getState().properties.find((x) => x.id === id);
const unit = (id?: string) => getState().units.find((x) => x.id === id);
const placeOf = (propertyId: string, unitId?: string) => [prop(propertyId)?.name ?? "—", unitId ? unit(unitId)?.label : undefined].filter(Boolean).join(" · ");

/* ---------- Who is acting (mock session + dev role preview) ---------- */
export function currentRole(): Role {
  if (typeof window === "undefined") return "owner";
  try { const r = localStorage.getItem("nestly.role"); return r ? (JSON.parse(r) as Role) : "owner"; } catch { return "owner"; }
}
const device = () => {
  if (typeof navigator === "undefined") return "Browser";
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "device";
  return `${b} on ${os}`;
};
let sessionIp = "";
const ip = () => (sessionIp ||= `102.${130 + Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 250)}`);

/** The staff record the current preview acts as: matched by email, else the first active member of that role. */
export function actingMember(role: Role, email?: string): StaffMember | undefined {
  if (role === "owner" || role === "tenant") return undefined;
  const xs = A().staff.filter((m) => m.role === role && m.status === "active");
  return xs.find((m) => !!email && m.email.toLowerCase() === email.toLowerCase()) ?? xs[0];
}
export function permsFor(role: Role, email?: string): PermSet {
  if (role === "owner") return OWNER_PERMS;
  if (role === "tenant") return NO_PERMS;
  return effective(A().presets[role] ?? DEFAULT_PRESETS[role], actingMember(role, email)?.overrides);
}
export function scopeFor(role: Role, email?: string): Scope {
  if (role === "owner" || role === "tenant") return "all";
  return actingMember(role, email)?.scope ?? "all";
}
/** Scope of whoever is signed in right now — mock stand-in for row-level security. */
export const currentScope = (): Scope => scopeFor(currentRole(), readSession()?.email);
const actorName = () => { const role = currentRole(); const m = actingMember(role, readSession()?.email); return m?.name ?? readSession()?.name ?? "Janice Tinto"; };

function audit(action: string, target: string, area: AuditArea) {
  const role = currentRole();
  commitAdmin((s) => { s.audit.unshift({ id: newId("au"), at: nowLocal(), actor: actorName(), role: t.roles[role], action, target, area, ip: ip(), device: device() }); });
}

/* ---------- Staff & permissions ---------- */
export type StaffView = StaffMember & { overrideCount: number; scopeLabel: string; perms: PermSet };
const scopeLabel = (s: Scope) => (s === "all" ? t.staffAdmin.allProps : s.map((id) => prop(id)?.name ?? "—").join(", ") || t.staffAdmin.noProps);
const staffView = (m: StaffMember): StaffView => {
  const preset = A().presets[m.role];
  return { ...m, overrideCount: overrideCount(preset, m.overrides), scopeLabel: scopeLabel(m.scope), perms: effective(preset, m.overrides) };
};
const editStaff = (id: string, fn: (m: StaffMember) => void) => save((s) => { const m = s.staff.find((x) => x.id === id); if (m) fn(m); });
const staffName = (id: string) => A().staff.find((x) => x.id === id)?.name ?? "—";
export type InviteInput = { name: string; email: string; phone: string; role: StaffRole; scope: Scope; spendLimit?: number | undefined };
export const inviteUrl = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/invite/${token}`;

export const staffAdminService = {
  list: () => delay(A().staff.map(staffView)),
  get: (id: string) => { const m = A().staff.find((x) => x.id === id); return delay(m ? staffView(m) : null, 200); },
  presets: () => delay(A().presets, 250),
  async invite(input: InviteInput) {
    if (A().staff.some((m) => m.email.toLowerCase() === input.email.trim().toLowerCase())) throw new Error("duplicate");
    const id = newId("s");
    const token = `inv-${id}`;
    save((s) => { s.staff.unshift({ id, name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(), role: input.role, status: "invited", scope: input.scope, spendLimit: input.role === "caretaker" ? input.spendLimit : undefined, overrides: {}, invitedAt: today(), inviteToken: token, inviteExpires: addDaysIso(today(), 7) }); });
    audit("Invited staff member", `${input.name.trim()} (${t.roles[input.role]})`, "staff");
    return delay({ id, token }, 700);
  },
  async resendInvite(id: string) {
    editStaff(id, (m) => { m.inviteExpires = addDaysIso(today(), 7); m.invitedAt = today(); });
    audit("Resent invite", staffName(id), "staff");
    return delay(true, 500);
  },
  async update(id: string, patch: Pick<StaffMember, "name" | "phone" | "role">) {
    const before = A().staff.find((x) => x.id === id)!;
    editStaff(id, (m) => { if (m.role !== patch.role) { m.overrides = {}; if (patch.role !== "caretaker") m.spendLimit = undefined; } Object.assign(m, { name: patch.name.trim(), phone: patch.phone.trim(), role: patch.role }); });
    audit(before.role !== patch.role ? "Changed role" : "Updated staff details", before.role !== patch.role ? `${patch.name} → ${t.roles[patch.role]}` : patch.name, "staff");
    return delay(true, 500);
  },
  async setScope(id: string, scope: Scope) {
    editStaff(id, (m) => { m.scope = scope; });
    audit("Changed property access", `${staffName(id)} · ${scopeLabel(scope)}`, "permissions");
    return delay(true, 400);
  },
  async setSpendLimit(id: string, limit: number | undefined) {
    editStaff(id, (m) => { m.spendLimit = limit; });
    audit("Changed spend limit", `${staffName(id)} · ${limit === undefined ? t.staffAdmin.noLimit : formatZAR(limit)}`, "permissions");
    return delay(true, 400);
  },
  async setOverrides(id: string, overrides: Overrides, note: string) {
    editStaff(id, (m) => { m.overrides = overrides; });
    audit("Changed permissions", `${staffName(id)} · ${note}`, "permissions");
    return delay(true, 150);
  },
  async setStatus(id: string, status: StaffStatus) {
    editStaff(id, (m) => { m.status = status; if (status === "active" && !m.joinedAt) m.joinedAt = today(); });
    audit(status === "deactivated" ? "Deactivated staff member" : "Reactivated staff member", staffName(id), "staff");
    return delay(true, 500);
  },
  async remove(id: string) {
    const name = staffName(id);
    save((s) => { s.staff = s.staff.filter((m) => m.id !== id); });
    audit("Removed staff member", name, "staff");
    return delay(true, 500);
  },
  async setAvatar(id: string, src: string | null) { editStaff(id, (m) => { m.avatar = src ?? undefined; }); return delay(true, 150); },
  async setPreset(role: StaffRole, preset: PermSet, note: string) {
    save((s) => { s.presets[role] = preset; });
    audit("Changed role preset", `${t.roles[role]} · ${note}`, "permissions");
    return delay(true, 150);
  },
  async resetPreset(role: StaffRole) {
    save((s) => { s.presets[role] = structuredClone(DEFAULT_PRESETS[role]); });
    audit("Restored role preset", t.roles[role], "permissions");
    return delay(true, 300);
  },
  /** Staff invite links created here open the Phase 2 accept-invite screen. */
  findInvite(token: string): StaffInvite | undefined {
    const m = A().staff.find((x) => x.inviteToken === token);
    if (!m) return undefined;
    const status = m.status !== "invited" ? "used" : m.inviteExpires && m.inviteExpires < today() ? "expired" : "valid";
    return { token, status, email: m.email, role: m.role, ownerName: "Tinto Property Holdings", invitedBy: "Janice Tinto", expiresAt: m.inviteExpires ?? today() };
  },
  acceptInvite(token: string, name: string) {
    commitAdmin((s) => { const m = s.staff.find((x) => x.inviteToken === token); if (m) { m.status = "active"; m.joinedAt = today(); m.name = name || m.name; m.lastActive = nowLocal(); } });
  },
};

/* ---------- Legal: notices ---------- */
export type NoticeExtras = { breach_details?: string | undefined; remedy_date?: string | undefined; vacate_date?: string | undefined; new_rent?: string | undefined; amount_due?: string | undefined };
export function noticeValues(tenantId: string, extras: NoticeExtras = {}): Record<string, string> {
  const x = tenant(tenantId);
  const p = prop(x?.propertyId);
  const lease = getLeasing().leases.find((l) => l.tenantId === tenantId && l.state !== "ended");
  const owing = x?.balance ?? 0;
  return {
    tenant_name: x?.name ?? "", tenant_id: x?.idNumber ?? "", unit: unit(x?.unitId)?.label ?? "", property_name: p?.name ?? "",
    property_address: p ? `${p.address}, ${p.suburb}, ${p.postalCode}` : "", landlord_name: "Janice Tinto", today: formatDate(today()),
    amount_due: extras.amount_due ?? (owing > 0 ? formatZAR(owing) : ""), due_date: formatDate(addDaysIso(today(), 7)),
    lease_end: formatDate(lease?.end ?? x?.leaseEnd ?? today()), new_rent: extras.new_rent ?? (x ? formatZAR(Math.round(x.rent * 1.08)) : ""),
    breach_details: extras.breach_details ?? "", remedy_date: extras.remedy_date ? formatDate(extras.remedy_date) : "", vacate_date: extras.vacate_date ? formatDate(extras.vacate_date) : "",
  };
}
export function previewNotice(kind: NoticeKind, tenantId: string, extras: NoticeExtras = {}) {
  const tpl = NOTICE_TEMPLATES.find((x) => x.kind === kind)!;
  const values = noticeValues(tenantId, extras);
  const subject = renderMerge(tpl.subject.replace(/\{\{/g, "{{"), values);
  const body = renderMerge(tpl.body, values);
  return { subject: subject.text, body: body.text, values, missing: [...new Set([...subject.missing, ...body.missing])], fields: tpl.fields };
}
export type NoticeView = ReturnType<typeof noticeView>;
function noticeView(n: (typeof getAdmin extends () => infer S ? S : never)["notices"][number]) {
  const now = nowLocal();
  const deliveries = n.deliveries.map((d) => ({ ...d, state: deliveryState(d, now) as DeliveryState }));
  return { ...n, tenantName: tenant(n.tenantId)?.name ?? "—", place: placeOf(n.propertyId, n.unitId), deliveries, overall: overallDelivery(deliveries.map((d) => d.state)) };
}
const noticeNumber = () => `NTC-${today().slice(0, 4)}-${String(11 + A().notices.length).padStart(4, "0")}`;

export const noticeService = {
  templates: () => delay(NOTICE_TEMPLATES, 250),
  list: (propertyId = "all") => delay(A().notices.filter((n) => propertyId === "all" || n.propertyId === propertyId).map(noticeView).sort((a, b) => b.sentAt.localeCompare(a.sentAt))),
  forTenant: (tenantId: string) => delay(A().notices.filter((n) => n.tenantId === tenantId).map(noticeView).sort((a, b) => b.sentAt.localeCompare(a.sentAt)), 300),
  async send(input: { kind: NoticeKind; tenantId: string; extras: NoticeExtras; channels: NoticeChannel[] }) {
    const x = tenant(input.tenantId)!;
    const pv = previewNotice(input.kind, input.tenantId, input.extras);
    if (pv.missing.length) throw new Error("missing");
    const at = nowLocal();
    const id = newId("nt");
    const number = noticeNumber();
    const deliveries = input.channels.map((channel) => {
      const noPhone = (channel === "sms" || channel === "whatsapp") && !x.phone.trim();
      const noEmail = channel === "email" && !x.email.includes("@");
      return { channel, sentAt: at, ...(noPhone || noEmail ? { failed: true, failReason: noPhone ? "No mobile number on file" : "No email address on file" } : {}) };
    });
    save((s) => { s.notices.unshift({ id, number, kind: input.kind, tenantId: x.id, propertyId: x.propertyId, unitId: x.unitId, subject: pv.subject, body: pv.body, values: pv.values, deliveries, sentAt: at, sentBy: actorName() }); });
    audit("Sent notice", `${number} · ${t.legalDesk.kinds[input.kind]}`, "legal");
    return delay(id, 800);
  },
};

/* ---------- Legal: eviction pipeline ---------- */
export type CaseView = EvictionCase & { tenantName: string; place: string; current: EvictionStage | null; pct: number; issue: ReturnType<typeof advanceIssue> };
const caseView = (c: EvictionCase): CaseView => ({ ...c, tenantName: tenant(c.tenantId)?.name ?? "—", place: placeOf(c.propertyId, c.unitId), current: currentStage(c), pct: casePct(c), issue: advanceIssue(c) });
const editCase = (id: string, fn: (c: EvictionCase) => void) => save((s) => { const c = s.cases.find((x) => x.id === id); if (c) fn(c); });
const caseNo = (id: string) => A().cases.find((x) => x.id === id)?.number ?? "";
export const evictionService = {
  list: (propertyId = "all") => delay(A().cases.filter((c) => propertyId === "all" || c.propertyId === propertyId).map(caseView).sort((a, b) => Number(!!a.closed) - Number(!!b.closed) || b.openedAt.localeCompare(a.openedAt))),
  async open(input: { tenantId: string; reason: EvictionReason; amount?: number | undefined; attorney: string; noticeId?: string | undefined }) {
    const x = tenant(input.tenantId)!;
    const n = A().notices.find((y) => y.id === input.noticeId);
    const id = newId("ev");
    const number = `EV-${today().slice(0, 4)}-${String(A().cases.length + 1).padStart(3, "0")}`;
    save((s) => {
      s.cases.unshift({ id, number, tenantId: x.id, propertyId: x.propertyId, unitId: x.unitId, reason: input.reason, amount: input.amount, attorney: input.attorney.trim() || "—", openedAt: today(), stage: 0,
        stages: { breach_notice: { date: n ? n.sentAt.slice(0, 10) : undefined, note: n ? `${n.number} — ${n.subject}` : "", docs: n ? [{ name: `${n.number}.pdf`, size: 180_000, type: "application/pdf" }] : [] } } });
      if (n) { const y = s.notices.find((z) => z.id === n.id); if (y) y.caseId = id; }
    });
    audit("Opened eviction case", `${number} · ${x.name}`, "legal");
    return delay(id, 600);
  },
  async recordStage(id: string, stage: EvictionStage, patch: { date?: string | undefined; note?: string | undefined }) {
    editCase(id, (c) => { const r = c.stages[stage] ?? { note: "", docs: [] }; c.stages[stage] = { ...r, ...(patch.date !== undefined ? { date: patch.date || undefined } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) }; });
    if (patch.date) audit("Recorded stage date", `${caseNo(id)} · ${t.legalDesk.stages[stage]}`, "legal");
    return delay(true, 300);
  },
  async addDoc(id: string, stage: EvictionStage, file: { name: string; size: number; type: string }) {
    editCase(id, (c) => { const r = c.stages[stage] ?? { note: "", docs: [] }; c.stages[stage] = { ...r, docs: [...r.docs, file] }; });
    audit("Uploaded case document", `${caseNo(id)} · ${file.name}`, "legal");
    return delay(true, 300);
  },
  async removeDoc(id: string, stage: EvictionStage, name: string) { editCase(id, (c) => { const r = c.stages[stage]; if (r) r.docs = r.docs.filter((d) => d.name !== name); }); return delay(true, 200); },
  async advance(id: string) {
    const c = A().cases.find((x) => x.id === id)!;
    if (advanceIssue(c)) throw new Error("blocked");
    editCase(id, (y) => { y.stage += 1; const next = EVICTION_STAGES[y.stage]; if (next && !y.stages[next]) y.stages[next] = { note: "", docs: [] }; });
    audit("Moved case to next stage", `${c.number} · ${t.legalDesk.stages[EVICTION_STAGES[c.stage]!]} done`, "legal");
    return delay(true, 400);
  },
  async close(id: string, outcome: EvictionOutcome, note: string) {
    editCase(id, (c) => { c.closed = { outcome, at: today(), note: note.trim() }; });
    audit("Closed eviction case", `${caseNo(id)} · ${t.legalDesk.outcomes[outcome]}`, "legal");
    return delay(true, 400);
  },
};

/* ---------- Schedule (calendar) ---------- */
export const CAL_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
export type CalSource = "inspection" | "viewing" | "preventive" | "visit";
export type CalEvent = Omit<CalEventRecord, "requestId"> & {
  source: CalSource; propertyName: string; unitLabel: string; photo?: string | undefined;
  link: { to: "/leases" | "/applications" | "/requests"; search: Record<string, string> };
};
function calendar(): CalEvent[] {
  const ov = A().eventOverrides;
  const base = (id: string) => ov[id] ?? {};
  const pv = (propertyId: string, unitId?: string) => ({ propertyName: prop(propertyId)?.name ?? "—", unitLabel: unit(unitId)?.label ?? "", photo: prop(propertyId)?.photos[0] });
  const now = nowLocal();
  const out: CalEvent[] = [];
  for (const i of getLeasing().inspections) {
    const x = tenant(i.tenantId);
    const e = getLeasing().envelopes.find((y) => y.id === i.envelopeId);
    const signed = e && envelopeStatus(e, now) === "signed";
    out.push({ id: `insp-${i.id}`, source: "inspection", kind: "inspection", title: t.cal.inspTitle[i.type], date: i.date, time: "10:00", duration: 90, propertyId: i.propertyId, unitId: i.unitId, withName: x?.name ?? "—", withRole: t.roles.tenant, withPhone: x?.phone, status: "confirmed", notes: i.notes || fillT(t.cal.inspNote, { inspector: i.inspector }), ...pv(i.propertyId, i.unitId), link: { to: "/leases", search: { view: "inspections", id: i.id } }, ...(signed ? { status: "confirmed" as const } : {}), ...base(`insp-${i.id}`) });
  }
  for (const a of getLeasing().applications) {
    if (!a.viewing || a.stage === "declined") continue;
    out.push({ id: `view-${a.id}`, source: "viewing", kind: "viewing", title: fillT(t.cal.viewTitle, { unit: unit(a.unitId)?.label ?? "" }), date: a.viewing.date, time: a.viewing.time, duration: 30, propertyId: a.propertyId, unitId: a.unitId, withName: a.name, withRole: t.cal.applicant, withPhone: a.phone, status: a.viewing.state === "booked" ? "pending" : "confirmed", notes: a.message || "", ...pv(a.propertyId, a.unitId), link: { to: "/applications", search: { view: "applicants", id: a.id } }, ...base(`view-${a.id}`) });
  }
  for (const p of getMaint().schedule) {
    out.push({ id: `pm-${p.id}`, source: "preventive", kind: "maintenance", title: p.title, date: p.nextDue, time: "08:00", duration: 120, propertyId: p.propertyId, withName: p.assignee, withRole: t.cal.planned, status: "confirmed", notes: fillT(t.cal.pmNote, { date: formatDate(p.lastDone) }), ...pv(p.propertyId), link: { to: "/requests", search: { view: "schedule" } }, ...base(`pm-${p.id}`) });
  }
  for (const v of A().events) {
    const { requestId, ...rest } = v;
    out.push({ ...rest, source: "visit", ...pv(v.propertyId, v.unitId), link: requestId ? { to: "/requests", search: { id: requestId } } : { to: "/requests", search: {} }, ...base(v.id) });
  }
  return out;
}
const fillT = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
export type NewEventInput = Pick<CalEventRecord, "kind" | "title" | "date" | "time" | "duration" | "propertyId" | "withName" | "withRole" | "notes"> & { unitId?: string | undefined };
export const calendarService = {
  list: (propertyId = "all") => delay(calendar().filter((e) => propertyId === "all" || e.propertyId === propertyId).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))),
  async create(input: NewEventInput) {
    const id = newId("v");
    save((s) => { s.events.push({ ...input, id, status: "confirmed" }); });
    audit("Scheduled visit", `${input.title} · ${formatDate(input.date)} ${input.time}`, "schedule");
    return delay(id, 500);
  },
  async confirm(id: string) {
    save((s) => { s.eventOverrides[id] = { ...(s.eventOverrides[id] ?? {}), status: "confirmed" }; });
    audit("Confirmed visit", calendar().find((e) => e.id === id)?.title ?? id, "schedule");
    return delay(true, 300);
  },
  async reschedule(id: string, date: string, time: string) {
    save((s) => { s.eventOverrides[id] = { ...(s.eventOverrides[id] ?? {}), date, time, status: "pending" }; });
    audit("Rescheduled visit", `${calendar().find((e) => e.id === id)?.title ?? id} → ${formatDate(date)} ${time}`, "schedule");
    return delay(true, 400);
  },
};

/* ---------- Announcements ---------- */
export type AnnouncementView = Announcement & { shownStatus: Announcement["status"]; recipients: number; reads: number; readPct: number; audienceLabel: string };
const liveTenants = () => getTenancy().tenants.filter((x) => !x.archived);
export function audienceLabel(a: Audience): string {
  if (a.kind === "all") return t.ann.audience.allLabel;
  if (a.kind === "property") return prop(a.propertyId)?.name ?? "—";
  return `${prop(a.propertyId)?.name ?? "—"} · ${a.unitIds.map((u) => unit(u)?.label ?? "").filter(Boolean).join(", ")}`;
}
/** Unit-level recipients for the mock: let units count as households even if no tenant profile exists yet. */
function recipientCount(a: Audience) {
  const us = getState().units.filter((u) => (u.status === "occupied" || u.status === "notice") && (a.kind === "all" || (u.propertyId === a.propertyId && (a.kind === "property" || a.unitIds.includes(u.id)))));
  return Math.max(us.length, recipientsFor(a, liveTenants()).length);
}
const annView = (a: Announcement): AnnouncementView => {
  const shownStatus = announcementStatus(a, nowLocal());
  const recipients = recipientCount(a.audience);
  const reads = shownStatus === "sent" ? Math.min(recipients, a.baseReads + a.readBy.length) : 0;
  return { ...a, shownStatus, recipients, reads, readPct: readPct(reads, recipients), audienceLabel: audienceLabel(a.audience) };
};
const annScope = (a: Announcement, propertyId: string) => propertyId === "all" || a.audience.kind === "all" || a.audience.propertyId === propertyId;
export type AnnInput = { title: string; body: string; category: AnnCategory; audience: Audience; channels: AnnChannel[]; pinned: boolean; mode: "draft" | "now" | "schedule"; scheduledFor?: string | undefined };
const statusOf = (i: AnnInput): Pick<Announcement, "status" | "scheduledFor" | "sentAt"> =>
  i.mode === "now" ? { status: "sent", sentAt: nowLocal(), scheduledFor: undefined } : i.mode === "schedule" ? { status: "scheduled", scheduledFor: i.scheduledFor, sentAt: undefined } : { status: "draft", scheduledFor: undefined, sentAt: undefined };
export const announcementService = {
  list: (propertyId = "all") => delay(A().announcements.filter((a) => annScope(a, propertyId)).map(annView).sort((a, b) => (b.sentAt ?? b.scheduledFor ?? b.createdAt).localeCompare(a.sentAt ?? a.scheduledFor ?? a.createdAt))),
  recipients: (aud: Audience) => recipientCount(aud),
  async save(input: AnnInput, id?: string) {
    const nid = id ?? newId("an");
    save((s) => {
      const rec: Announcement = { id: nid, title: input.title.trim(), body: input.body.trim(), category: input.category, audience: input.audience, channels: input.channels, pinned: input.pinned, ...statusOf(input), createdBy: actorName(), createdAt: today(), readBy: [], baseReads: 0 };
      const i = s.announcements.findIndex((a) => a.id === nid);
      if (i >= 0) s.announcements[i] = rec; else s.announcements.unshift(rec);
    });
    if (input.mode !== "draft") audit(input.mode === "now" ? "Sent announcement" : "Scheduled announcement", input.title.trim(), "announcements");
    return delay(nid, 600);
  },
  async cancelSchedule(id: string) { save((s) => { const a = s.announcements.find((x) => x.id === id); if (a) { a.status = "draft"; a.scheduledFor = undefined; } }); return delay(true, 300); },
  async remove(id: string) { save((s) => { s.announcements = s.announcements.filter((x) => x.id !== id); }); return delay(true, 300); },
  async togglePin(id: string) { save((s) => { const a = s.announcements.find((x) => x.id === id); if (a) a.pinned = !a.pinned; }); return delay(true, 200); },
  /** Tenant notice board: sent announcements that reach this tenant's property/unit. */
  forTenant: (tenantId: string) => {
    const x = tenant(tenantId);
    if (!x) return delay([] as (AnnouncementView & { read: boolean })[], 300);
    return delay(A().announcements.map(annView).filter((a) => a.shownStatus === "sent" && recipientsFor(a.audience, [x]).length > 0)
      .map((a) => ({ ...a, read: a.readBy.includes(tenantId) }))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.sentAt ?? b.scheduledFor ?? "").localeCompare(a.sentAt ?? a.scheduledFor ?? "")), 400);
  },
  async markRead(id: string, tenantId: string) { save((s) => { const a = s.announcements.find((x) => x.id === id); if (a && !a.readBy.includes(tenantId)) a.readBy.push(tenantId); }); return delay(true, 100); },
};

/* ---------- Reports ---------- */
export type RentRollRow = { id: string; propertyId: string; place: string; unit: string; tenantName: string; rent: number; leaseEnd: string; balance: number; status: string };
export type VacancyRow = { id: string; propertyId: string; place: string; unit: string; days: number; rent: number; loss: number };
const scopedProps = (propertyId: string) => getState().properties.filter((p) => propertyId === "all" || p.id === propertyId);
export const reportsService = {
  history: (propertyId = "all") => delay(scopedProps(propertyId).flatMap((p) => {
    const us = getState().units.filter((u) => u.propertyId === p.id);
    const roll = us.filter((u) => u.status === "occupied" || u.status === "notice").reduce((a, u) => a + u.rent, 0);
    return historyFor(p.id, roll, us.length, today(), p.createdAt);
  }), 600),
  rentRoll: (propertyId = "all") => {
    const ids = new Set(scopedProps(propertyId).map((p) => p.id));
    const rows = getState().units.filter((u) => ids.has(u.propertyId) && (u.status === "occupied" || u.status === "notice")).map((u): RentRollRow => {
      const x = getTenancy().tenants.find((y) => y.unitId === u.id && !y.archived);
      const lease = getLeasing().leases.find((l) => l.unitId === u.id && l.state !== "ended" && l.state !== "draft");
      return { id: u.id, propertyId: u.propertyId, place: prop(u.propertyId)?.name ?? "—", unit: u.label, tenantName: x?.name ?? t.rep.unnamed, rent: u.rent, leaseEnd: lease?.end ?? x?.leaseEnd ?? "", balance: x?.balance ?? 0, status: u.status };
    });
    return delay(rows.sort((a, b) => a.place.localeCompare(b.place) || a.unit.localeCompare(b.unit, undefined, { numeric: true })), 500);
  },
  vacancies: (propertyId = "all") => {
    const ids = new Set(scopedProps(propertyId).map((p) => p.id));
    return delay(getState().units.filter((u) => ids.has(u.propertyId) && u.status === "vacant").map((u): VacancyRow => {
      const days = daysVacant(addDaysIso(today(), -vacantSinceDays(u.id)), today());
      return { id: u.id, propertyId: u.propertyId, place: prop(u.propertyId)?.name ?? "—", unit: u.label, days, rent: u.rent, loss: Math.round((u.rent / 30) * days) };
    }).sort((a, b) => b.days - a.days), 500);
  },
};

/* ---------- Settings ---------- */
const emailKey = (email?: string) => (email ?? readSession()?.email ?? "janice@nestly.co.za").toLowerCase();
export const settingsService = {
  profile: (email?: string) => delay<ProfilePrefs>(A().profiles[emailKey(email)] ?? { twoFactor: false }, 250),
  async saveProfile(p: ProfilePrefs, email?: string) { save((s) => { s.profiles[emailKey(email)] = p; }); audit("Updated profile", p.name ?? emailKey(email), "settings"); return delay(true, 500); },
  prefs: (email?: string) => delay<NotifPrefs>(A().prefs[emailKey(email)] ?? defaultPrefs(), 300),
  async savePrefs(p: NotifPrefs, email?: string) { save((s) => { s.prefs[emailKey(email)] = p; }); audit("Updated notification preferences", emailKey(email), "settings"); return delay(true, 500); },
  company: () => delay<Company>(A().company, 300),
  async saveCompany(c: Company) { save((s) => { s.company = c; }); audit("Updated company details", c.name, "settings"); return delay(true, 600); },
};

/* ---------- Subscription & billing (Nestly's own plan) ---------- */
/** Billable tenants = let units (occupied or on notice); vacant units are free. */
export const billableRows = () => getState().properties.map((p) => ({ id: p.id, name: p.name, tenants: getState().units.filter((u) => u.propertyId === p.id && (u.status === "occupied" || u.status === "notice")).length }));
export const subscriptionService = {
  get: () => { const sub = A().subscription; const rows = billableRows(); return delay({ sub, plans, rows, quote: quote(rows, plans, sub.tiers) }, 450); },
  async setCycle(cycle: Cycle) { save((s) => { s.subscription.cycle = cycle; }); audit("Changed billing cycle", cycle === "annual" ? t.sub.annual : t.sub.monthly, "subscription"); return delay(true, 500); },
  async setTier(propertyId: string, planId: (typeof plans)[number]["id"] | null) {
    const before = quote(billableRows(), plans, A().subscription.tiers).lines.find((l) => l.id === propertyId);
    save((s) => { if (planId) s.subscription.tiers[propertyId] = planId; else delete s.subscription.tiers[propertyId]; });
    const after = quote(billableRows(), plans, A().subscription.tiers).lines.find((l) => l.id === propertyId);
    audit(before && after && (after.plan.maxTenants ?? 1e9) >= (before.plan.maxTenants ?? 1e9) ? "Upgraded property plan" : "Downgraded property plan", `${prop(propertyId)?.name ?? ""} → ${after?.plan.name ?? ""}`, "subscription");
    return delay(true, 600);
  },
};

/* ---------- Audit log ---------- */
export const auditService = {
  list: () => delay(A().audit, 400),
};

export { staffName };
