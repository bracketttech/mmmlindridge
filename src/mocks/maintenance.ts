// Requests & maintenance mock data (Phase 6, UI only).
import { tenants } from "./data";

export const REQ_CATEGORIES = ["fault", "upgrade", "query", "moveout"] as const;
export type ReqCategory = (typeof REQ_CATEGORIES)[number];
export const REQ_STATUSES = ["new", "acknowledged", "assigned", "in_progress", "awaiting_quote", "resolved", "closed"] as const;
export type ReqStatus = (typeof REQ_STATUSES)[number];
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const AREAS = ["plumbing", "electrical", "kitchen", "bathroom", "security", "garden", "general"] as const;
export type Area = (typeof AREAS)[number];

export type Attachment = { id: string; name: string; size: number; type: string; url?: string | undefined };
export type ThreadMsg = { id: string; at: string; by: string; from: "tenant" | "staff"; body: string; internal: boolean };
export type StatusEvent = { status: ReqStatus; at: string; by: string };
export type Assignee = { kind: "staff" | "contractor"; id: string; name: string };
export type Quote = { contractorId: string; contractorName: string; amount: number; note: string; status: "pending" | "approved" | "declined"; decidedAt?: string | undefined };

export type MaintRequest = {
  id: string; ref: string; tenantId: string; tenantName: string; propertyId: string; unitId: string;
  category: ReqCategory; area: Area; title: string; description: string; priority: Priority; access: string;
  moveOutDate?: string | undefined;
  status: ReqStatus; createdAt: string; updatedAt: string;
  attachments: Attachment[]; thread: ThreadMsg[]; timeline: StatusEvent[];
  assignee?: Assignee | undefined; cost?: number | undefined; quote?: Quote | undefined;
  rating?: { stars: number; comment: string } | undefined;
};

export type Contractor = { id: string; name: string; company: string; trade: string; phone: string; email: string; rating: number; jobs: number; areas: string };
export type PreventiveTask = { id: string; title: string; propertyId: string; frequency: "monthly" | "quarterly" | "biannual" | "annual"; nextDue: string; lastDone: string; assignee: string };

export const seedContractors = (): Contractor[] => [
  { id: "c1", name: "Mandla Sithole", company: "Sithole Plumbing & Geysers", trade: "Plumbing", phone: "+27 82 555 0410", email: "mandla@sitholeplumbing.co.za", rating: 4.8, jobs: 37, areas: "Sandton, Rosebank" },
  { id: "c2", name: "Charmaine Jacobs", company: "Bright Spark Electrical", trade: "Electrical", phone: "+27 83 555 0422", email: "charmaine@brightspark.co.za", rating: 4.6, jobs: 22, areas: "Johannesburg North" },
  { id: "c3", name: "Riaan Pretorius", company: "Secure Gate Automation", trade: "Gates & security", phone: "+27 84 555 0433", email: "riaan@securegate.co.za", rating: 4.4, jobs: 15, areas: "Bryanston, Sandton" },
  { id: "c4", name: "Precious Ndlovu", company: "Fresh Coat Painters", trade: "Painting", phone: "+27 72 555 0444", email: "precious@freshcoat.co.za", rating: 4.9, jobs: 41, areas: "Gauteng" },
  { id: "c5", name: "Yusuf Ebrahim", company: "Atlantic Handyman Services", trade: "General repairs", phone: "+27 76 555 0455", email: "yusuf@atlantichandyman.co.za", rating: 4.5, jobs: 19, areas: "Cape Town, Atlantic Seaboard" },
];

export const seedSchedule = (): PreventiveTask[] => [
  { id: "pm1", title: "Geyser service & pressure valve check", propertyId: "p1", frequency: "annual", nextDue: "2026-11-18", lastDone: "2025-11-20", assignee: "Sithole Plumbing & Geysers" },
  { id: "pm2", title: "Gate motor & battery backup service", propertyId: "p3", frequency: "quarterly", nextDue: "2026-11-09", lastDone: "2026-08-08", assignee: "Secure Gate Automation" },
  { id: "pm3", title: "Fire extinguisher inspection", propertyId: "p2", frequency: "annual", nextDue: "2026-12-02", lastDone: "2025-12-01", assignee: "Bongani Zulu" },
  { id: "pm4", title: "Gutter & roof clean before rainy season", propertyId: "p1", frequency: "biannual", nextDue: "2026-10-30", lastDone: "2026-04-28", assignee: "Bongani Zulu" },
  { id: "pm5", title: "Pool pump and filter service", propertyId: "p4", frequency: "monthly", nextDue: "2026-11-25", lastDone: "2026-10-25", assignee: "Atlantic Handyman Services" },
  { id: "pm6", title: "Borehole & JoJo tank inspection", propertyId: "p3", frequency: "quarterly", nextDue: "2027-01-12", lastDone: "2026-10-12", assignee: "Bongani Zulu" },
];

const who = (id: string) => tenants.find((x) => x.id === id)!;
const at = (d: string, t = "09:00") => `${d}T${t}:00`;
type Seed = Pick<MaintRequest, "id" | "tenantId" | "category" | "area" | "title" | "description" | "priority" | "status" | "createdAt"> & Partial<MaintRequest> & { path: [ReqStatus, string][] };
function make(s: Seed, i: number): MaintRequest {
  const x = who(s.tenantId);
  const timeline = s.path.map(([status, d]) => ({ status, at: d, by: status === "new" ? x.name : "Janice Tinto" }));
  return {
    ref: `REQ-${1001 + i}`, tenantName: x.name, propertyId: x.propertyId, unitId: x.unitId, access: "Weekdays 08:00–12:00", attachments: [],
    updatedAt: timeline[timeline.length - 1]!.at, timeline, thread: [], ...s,
  };
}

export const seedRequests = (): MaintRequest[] => ([
  { id: "r1", tenantId: "t1", category: "fault", area: "plumbing", title: "Geyser leaking in main bathroom", description: "Water is dripping from the overflow pipe and the ceiling below is stained. Started on Sunday evening.", priority: "high", status: "new", createdAt: at("2026-11-03", "07:42"), path: [["new", at("2026-11-03", "07:42")]],
    thread: [{ id: "m1", at: at("2026-11-03", "07:42"), by: "Thandiwe Nkosi", from: "tenant", body: "I've switched the geyser off at the DB board for now.", internal: false }] },
  { id: "r2", tenantId: "t3", category: "upgrade", area: "electrical", title: "Install prepaid electricity meter", description: "Request to switch from municipal billing to a prepaid meter so I can manage usage.", priority: "medium", status: "awaiting_quote", createdAt: at("2026-10-29", "10:15"),
    path: [["new", at("2026-10-29", "10:15")], ["acknowledged", at("2026-10-29", "14:00")], ["assigned", at("2026-10-30", "09:20")], ["awaiting_quote", at("2026-11-01", "11:05")]],
    assignee: { kind: "contractor", id: "c2", name: "Bright Spark Electrical" }, quote: { contractorId: "c2", contractorName: "Bright Spark Electrical", amount: 4850, note: "Supply and install Conlog split meter, incl. CoC.", status: "pending" },
    thread: [
      { id: "m2", at: at("2026-10-29", "14:00"), by: "Janice Tinto", from: "staff", body: "Thanks Lerato, we're getting a quote from our electrician.", internal: false },
      { id: "m3", at: at("2026-11-01", "11:10"), by: "Janice Tinto", from: "staff", body: "Quote is a bit high — compare with last year's job at Sunset Gardens before approving.", internal: true },
    ] },
  { id: "r3", tenantId: "t5", category: "fault", area: "security", title: "Gate motor not responding after load-shedding", description: "The gate stays closed after power returns. Remote and keypad both don't work.", priority: "urgent", status: "in_progress", createdAt: at("2026-10-27", "18:30"),
    path: [["new", at("2026-10-27", "18:30")], ["acknowledged", at("2026-10-27", "18:45")], ["assigned", at("2026-10-28", "08:00")], ["in_progress", at("2026-10-28", "13:30")]],
    assignee: { kind: "contractor", id: "c3", name: "Secure Gate Automation" }, cost: 1450,
    thread: [
      { id: "m4", at: at("2026-10-28", "08:05"), by: "Janice Tinto", from: "staff", body: "Riaan from Secure Gate will be there this afternoon.", internal: false },
      { id: "m5", at: at("2026-10-28", "08:10"), by: "Janice Tinto", from: "staff", body: "Battery is 3 years old — budget for a replacement.", internal: true },
    ] },
  { id: "r4", tenantId: "t7", category: "upgrade", area: "general", title: "Repaint lounge wall", description: "Would like the lounge feature wall painted a light grey. Happy to share the cost.", priority: "low", status: "resolved", createdAt: at("2026-10-12", "12:00"),
    path: [["new", at("2026-10-12", "12:00")], ["acknowledged", at("2026-10-13", "09:00")], ["assigned", at("2026-10-14", "10:00")], ["in_progress", at("2026-10-20", "08:00")], ["resolved", at("2026-10-21", "16:00")]],
    assignee: { kind: "contractor", id: "c4", name: "Fresh Coat Painters" }, cost: 2200 },
  { id: "r5", tenantId: "t2", category: "query", area: "general", title: "Which day is refuse collection?", description: "I've just moved in and the bins weren't collected on Monday.", priority: "low", status: "closed", createdAt: at("2026-10-05", "08:30"),
    path: [["new", at("2026-10-05", "08:30")], ["acknowledged", at("2026-10-05", "10:00")], ["resolved", at("2026-10-05", "10:05")], ["closed", at("2026-10-08", "09:00")]],
    thread: [{ id: "m6", at: at("2026-10-05", "10:00"), by: "Janice Tinto", from: "staff", body: "Pikitup collects on Tuesdays from 06:00. Please put bins out the night before.", internal: false }], rating: { stars: 5, comment: "Quick answer, thanks!" } },
  { id: "r6", tenantId: "t4", category: "moveout", area: "general", title: "Notice to vacate B204", description: "Relocating to Durban for work. Please arrange the outgoing inspection.", priority: "medium", status: "acknowledged", createdAt: at("2026-10-30", "16:20"), moveOutDate: "2026-11-30",
    path: [["new", at("2026-10-30", "16:20")], ["acknowledged", at("2026-10-31", "09:00")]] },
  { id: "r7", tenantId: "t1", category: "fault", area: "kitchen", title: "Stove plate not heating", description: "Back-left plate stays cold on every setting.", priority: "medium", status: "resolved", createdAt: at("2026-09-18", "19:00"),
    path: [["new", at("2026-09-18", "19:00")], ["acknowledged", at("2026-09-19", "08:30")], ["assigned", at("2026-09-19", "09:00")], ["in_progress", at("2026-09-22", "10:00")], ["resolved", at("2026-09-22", "12:30")]],
    assignee: { kind: "staff", id: "s1", name: "Bongani Zulu" }, cost: 650,
    thread: [{ id: "m7", at: at("2026-09-22", "12:30"), by: "Bongani Zulu", from: "staff", body: "Replaced the plate element. All four plates are working.", internal: false }] },
  { id: "r8", tenantId: "t6", category: "fault", area: "bathroom", title: "Shower drain blocked", description: "Water pools in the shower and drains very slowly.", priority: "medium", status: "assigned", createdAt: at("2026-11-02", "06:50"),
    path: [["new", at("2026-11-02", "06:50")], ["acknowledged", at("2026-11-02", "09:10")], ["assigned", at("2026-11-02", "09:15")]],
    assignee: { kind: "contractor", id: "c5", name: "Atlantic Handyman Services" } },
] as Seed[]).map(make);
