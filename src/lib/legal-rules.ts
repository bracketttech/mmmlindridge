// Legal desk rules (pure, tested): notice delivery tracking and the eviction pipeline.
// Evictions in South Africa need a court order (PIE Act 19 of 1998) — the pipeline only records lawful steps.

export const NOTICE_CHANNELS = ["email", "whatsapp", "sms", "registered_post", "hand"] as const;
export type NoticeChannel = (typeof NOTICE_CHANNELS)[number];
export const DELIVERY_STATES = ["queued", "sent", "delivered", "read", "failed"] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];
export type Delivery = { channel: NoticeChannel; sentAt: string; failed?: boolean | undefined; failReason?: string | undefined };

/** Mock delivery progress by elapsed seconds since sending; a real backend uses provider webhooks. */
const STEPS: Record<NoticeChannel, [number, DeliveryState][]> = {
  email: [[0, "queued"], [3, "sent"], [8, "delivered"], [25, "read"]],
  whatsapp: [[0, "queued"], [2, "sent"], [6, "delivered"], [15, "read"]],
  sms: [[0, "queued"], [2, "sent"], [8, "delivered"]],
  registered_post: [[0, "queued"], [5, "sent"]],
  hand: [[0, "delivered"]],
};

export function deliveryState(d: Delivery, nowIso: string): DeliveryState {
  if (d.failed) return "failed";
  const secs = (new Date(nowIso).getTime() - new Date(d.sentAt).getTime()) / 1000;
  let state: DeliveryState = "queued";
  for (const [at, s] of STEPS[d.channel]) if (secs >= at) state = s;
  return state;
}

export const isFinal = (s: DeliveryState, channel: NoticeChannel) => s === "failed" || s === STEPS[channel].at(-1)![1];

const RANK: Record<DeliveryState, number> = { failed: 0, queued: 1, sent: 2, delivered: 3, read: 4 };
/** Best state across channels: a notice counts as served once any channel delivered it. */
export function overallDelivery(states: DeliveryState[]): DeliveryState {
  if (!states.length) return "queued";
  return states.reduce((best, s) => (RANK[s] > RANK[best] ? s : best), "failed" as DeliveryState);
}

/* ---------- Eviction pipeline ---------- */
export const EVICTION_STAGES = ["breach_notice", "cancellation", "application", "s4_notice", "hearing", "order", "sheriff"] as const;
export type EvictionStage = (typeof EVICTION_STAGES)[number];
export type StageRecord = { date?: string | undefined; note: string; docs: { name: string; size: number; type: string }[] };
export type EvictionOutcome = "remedied" | "vacated" | "order_executed" | "settled" | "withdrawn";
export type CaseLike = { stage: number; stages: Partial<Record<EvictionStage, StageRecord>>; closed?: { outcome: EvictionOutcome; at: string } | undefined };

export type AdvanceIssue = "closed" | "last" | "date";
/** A stage is completed by recording the date it happened; the next stage then opens. */
export function advanceIssue(c: CaseLike): AdvanceIssue | null {
  if (c.closed) return "closed";
  if (c.stage >= EVICTION_STAGES.length) return "last";
  if (!c.stages[EVICTION_STAGES[c.stage]!]?.date) return "date";
  return null;
}
export const currentStage = (c: CaseLike): EvictionStage | null => EVICTION_STAGES[c.stage] ?? null;
export const casePct = (c: CaseLike) => Math.round((Math.min(c.stage, EVICTION_STAGES.length) / EVICTION_STAGES.length) * 100);

/** Adds business days (Mon–Fri), e.g. the 20-business-day remedy period on a breach notice. */
export function addBusinessDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  let left = n;
  while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) left--; }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
