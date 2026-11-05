import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, UserPlus, ArrowUpRight, Home } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, PillButton, SegmentedChips, StatusChip, Stagger, Skel, EmptyState, Timeline, Stepper, SuccessCheck, TruncatedText, CardMenu } from "@/components/nestly/primitives";
import { KpiTile, DataTable, PersonCell, ProgressCell, StatusCell, Modal, BottomSheet, AvatarUploader, NAvatar, type Column } from "@/components/nestly/composites";
import { ChartCard, AreaComparisonChart, TickBarChart, GaugeChart } from "@/components/nestly/charts";
import { tenantService, reportService, propertyService, type Tenant, type Property } from "@/services";
import { formatZAR, formatDate } from "@/lib/format";
import { DEMO_USER } from "@/components/nestly/shell";
import { avatarFor } from "@/images";

export const Route = createFileRoute("/_shell/design")({
  head: () => ({
    meta: [
      { title: "Design system — Nestly" },
      { name: "description", content: "Nestly component showcase for design review." },
      { property: "og:title", content: "Design system — Nestly" },
      { property: "og:description", content: "Every Nestly component and variant in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DesignPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function DesignPage() {
  const [filter, setFilter] = useState<"all" | "active" | "arrears" | "notice">("all");
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [props, setProps] = useState<Property[]>([]);
  const [rev, setRev] = useState<{ month: string; collected: number; previous: number }[] | null>(null);
  const [sel, setSel] = useState("t1");
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tableErr, setTableErr] = useState(false);

  useEffect(() => {
    tenantService.list().then(setTenants);
    reportService.revenue().then(setRev);
    propertyService.list().then(setProps);
  }, []);

  const rows = (tenants ?? []).filter((x) => filter === "all" || x.status === filter);
  const unitOf = (x: Tenant) => props.find((p) => p.id === x.propertyId)?.name ?? "";
  const cols: Column<Tenant>[] = [
    { key: "t", header: "Tenant", render: (r) => <PersonCell name={r.name} email={r.email} src={r.avatar} /> },
    { key: "p", header: "Property", render: (r) => <TruncatedText text={unitOf(r)} className="max-w-[160px] text-ink-900" /> },
    { key: "s", header: "Status", render: (r) => <StatusCell status={r.status} /> },
    { key: "r", header: "Rent", render: (r) => <span className="tabular-nums">{formatZAR(r.rent)}</span> },
    { key: "pd", header: "Paid", render: (r) => <ProgressCell value={r.paidPct} /> },
    { key: "l", header: "Last payment", render: (r) => <span className="text-ink-500">{formatDate(r.lastPayment)}</span> },
    { key: "m", header: "", className: "w-10", render: () => <CardMenu /> },
  ];

  return (
    <div className="space-y-12">
      <PageHeader title="Design" muted="system" sub="Phase 1 review · every component, variant and state"
        actions={<>
          <SegmentedChips label="Filter tenants" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "arrears", label: "Arrears" }, { value: "notice", label: "Notice" }]} />
          <PillButton icon={<UserPlus className="h-4 w-4" />} onClick={() => toast.success("Tenant invite sent (mock)")}>Add tenant</PillButton>
        </>} />

      <Section title="KPI tiles">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Occupied units" value="52" unit="of 58" variant="donut" percent={90} tip="90% occupancy across 4 properties" delta="+3" deltaLabel="this month" />
          <KpiTile label="Rent collected" value="R 215k" variant="sparkline" visual={[182, 191, 186, 204, 198, 215]} tip="Nov 2026: R 215 400,00" delta="+8,4%" deltaLabel="vs October" />
          <KpiTile label="Open requests" value="9" unit="requests" variant="tick-bar" visual={[3, 5, 2, 6, 4, 7, 5, 9]} tip="9 open · 3 high priority" delta="-2" deltaLabel="vs last week" />
          <KpiTile label="Overdue rent across all properties this month" value="R 35k" delta="+1" deltaLabel="tenant in arrears" />
        </Stagger>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiTile label="" value="" loading /></div>
      </Section>

      <Section title="Buttons, chips & status">
        <GlassCard hover={false} className="flex flex-wrap items-center gap-3">
          <PillButton icon={<Plus className="h-4 w-4" />}>Add property</PillButton>
          <PillButton size="lg" icon={<ArrowUpRight className="h-4 w-4" />}>Pay rent</PillButton>
          <PillButton variant="dark" icon={<Home className="h-4 w-4" />}>Back to home</PillButton>
          <PillButton variant="secondary">Secondary</PillButton>
          <PillButton variant="ghost">Ghost</PillButton>
          <PillButton disabled>Disabled</PillButton>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone="success">Paid</StatusChip><StatusChip tone="warning">In progress</StatusChip>
            <StatusChip tone="danger">Overdue</StatusChip><StatusChip tone="info">Open</StatusChip>
            <StatusChip tone="neutral">Pending</StatusChip><StatusChip tone="strong">Lease signed</StatusChip>
          </div>
        </GlassCard>
      </Section>

      <Section title="Data table">
        <GlassCard hover={false} className="p-3 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 px-2">
            <div className="min-w-0"><h3 className="text-h3">All tenants</h3><p className="text-[12px] text-ink-500">Click a row to select · long names truncate</p></div>
            <PillButton size="sm" variant="secondary" onClick={() => setTableErr((e) => !e)}>{tableErr ? "Show data" : "Show error"}</PillButton>
          </div>
          <DataTable caption="Tenants" rows={rows} columns={cols} selectedId={sel} onSelect={setSel} loading={!tenants} error={tableErr} onRetry={() => setTableErr(false)} />
        </GlassCard>
      </Section>

      <Section title="Charts (hover or tap for values)">
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Rent collected" sub="Last 6 months vs last year (dashed)" state={rev ? "ready" : "loading"}>{rev && <AreaComparisonChart data={rev} />}</ChartCard>
          <ChartCard title="Monthly collections" sub="Tick-bar" state={rev ? "ready" : "loading"}>{rev && <TickBarChart data={rev.map((r) => ({ label: r.month, value: r.collected }))} />}</ChartCard>
          <ChartCard title="Collection rate" sub="November 2026"><div className="grid h-56 place-items-center"><GaugeChart value={86} label="Rent collected on time" detail="R 185 200,00 of R 215 400,00 collected" /></div></ChartCard>
        </Stagger>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartCard title="Empty chart" state="empty"><span /></ChartCard>
          <ChartCard title="Errored chart" state="error"><span /></ChartCard>
        </div>
      </Section>

      <Section title="Truncation & tooltips">
        <GlassCard hover={false} className="grid gap-4 md:grid-cols-3">
          <div className="min-w-0"><p className="text-overline text-ink-500">Single line</p><TruncatedText text="Camps Bay Ocean View Residences & Penthouse Collection, 3 Victoria Road, Cape Town" className="text-h3" /></div>
          <div className="min-w-0"><p className="text-overline text-ink-500">Two lines</p><TruncatedText lines={2} text="The gate motor stopped responding after load-shedding on Tuesday evening. Tenants in villas 2 to 5 cannot exit with vehicles and are using the pedestrian gate." className="text-[14px] text-ink-500" /></div>
          <div className="min-w-0"><p className="text-overline text-ink-500">Email</p><TruncatedText text="johannes.botha.fitzgerald.mahlangu@longcompanyname.co.za" /></div>
        </GlassCard>
      </Section>

      <Section title="Avatar & uploader">
        <GlassCard hover={false} className="space-y-5">
          <div className="flex items-center gap-2">{[["Thandiwe Nkosi", "thandiwe.nkosi@mail.co.za"], ["Pieter van der Merwe", "pieter.vdm@mail.co.za"], ["Lerato Mokoena", "lerato.mokoena@mail.co.za"], ["Sipho Dlamini", "sipho.dlamini@mail.co.za"]].map(([n, e], i) => <NAvatar key={n} name={n!} src={avatarFor(e)} size={28 + i * 8} />)}</div>
          <AvatarUploader name={DEMO_USER.name} initial={avatarFor(DEMO_USER.email) ?? null} />
        </GlassCard>
      </Section>

      <Section title="Overlays, feedback & flow">
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard hover={false} className="flex flex-wrap gap-3">
            <PillButton onClick={() => setModal(true)}>Open modal</PillButton>
            <PillButton variant="secondary" onClick={() => setSheet(true)}>Open bottom sheet</PillButton>
            <PillButton variant="secondary" onClick={() => toast.success("Invoice sent to Thandiwe Nkosi")}>Success toast</PillButton>
            <PillButton variant="secondary" onClick={() => toast.error("Payment failed at the gateway")}>Error toast</PillButton>
          </GlassCard>
          <GlassCard hover={false}><Stepper steps={["Details", "Property", "Plan", "Invite staff"]} current={2} /></GlassCard>
          <GlassCard hover={false}><h3 className="mb-4 text-h3">Request timeline</h3>
            <Timeline items={[{ title: "Caretaker Bongani Zulu assigned", meta: "4 Nov 2026 · 09:12" }, { title: "Request logged: Geyser leaking in main bathroom", meta: "3 Nov 2026 · 18:40" }, { title: "Photo added by tenant", meta: "3 Nov 2026 · 18:41" }]} />
          </GlassCard>
          <GlassCard hover={false} className="flex flex-col items-center gap-3 text-center">
            <SuccessCheck />
            <p className="text-h2">You're all <em className="font-light">set.</em></p>
          </GlassCard>
          <GlassCard hover={false} className="space-y-3"><p className="text-overline text-ink-500">Skeleton</p><Skel className="h-4 w-1/2" /><Skel className="h-4 w-3/4" /><Skel className="h-24 w-full" /></GlassCard>
          <GlassCard hover={false}><EmptyState title="No requests yet" body="When tenants log a fault or upgrade, it appears here." action={<PillButton icon={<Plus className="h-4 w-4" />}>Log request</PillButton>} /></GlassCard>
        </div>
      </Section>

      <Modal open={modal} onOpenChange={setModal} title="Send rent reminder" footer={<><PillButton variant="secondary" onClick={() => setModal(false)}>Cancel</PillButton><PillButton onClick={() => { setModal(false); toast.success("Reminder sent"); }}>Send</PillButton></>}>
        <p className="text-[14px] text-ink-500">Pieter van der Merwe owes {formatZAR(4895)} for A102, due {formatDate("2026-11-01")}.</p>
      </Modal>
      <BottomSheet open={sheet} onOpenChange={setSheet} title="Quick actions">
        <div className="grid gap-2">{["Log a request", "Pay rent", "Download statement"].map((a) => <PillButton key={a} variant="secondary" className="w-full" onClick={() => setSheet(false)}>{a}</PillButton>)}</div>
      </BottomSheet>
    </div>
  );
}
