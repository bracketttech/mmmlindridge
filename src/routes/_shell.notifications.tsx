import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { GlassCard, PageHeader, PillButton, SegmentedChips, Skel, EmptyState, TruncatedText, Stagger } from "@/components/nestly/primitives";
import { notificationService, type Notification } from "@/services";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => pageHead("Notifications", "Rent, requests, leases and team updates in Nestly."),
  component: NotificationsPage,
});

function NotificationsPage() {
  const s = t.notificationsPage;
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  useEffect(() => { notificationService.list().then(setItems); }, []);
  const shown = (items ?? []).filter((n) => filter === "all" || n.unread);

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} muted={s.muted} sub={s.sub}
        actions={<>
          <SegmentedChips label="Filter" value={filter} onChange={setFilter} options={[{ value: "all", label: s.all }, { value: "unread", label: s.unread, count: items?.filter((n) => n.unread).length ?? 0 }]} />
          <PillButton icon={<CheckCheck className="h-4 w-4" />} onClick={() => setItems((xs) => xs?.map((n) => ({ ...n, unread: false })) ?? null)}>{s.markAll}</PillButton>
        </>} />
      <GlassCard hover={false} className="p-3 md:p-4">
        {!items ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-16 w-full" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={<Bell className="h-6 w-6" />} title={s.empty} />
        ) : (
          <Stagger className="space-y-1" start={60} step={50}>
            {shown.map((n) => (
              <button key={n.id} type="button" onClick={() => setItems((xs) => xs!.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                className={cn("flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition-colors", n.unread ? "bg-olive-100" : "hover:bg-surface-solid/70")}>
                <span aria-hidden className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.unread ? "bg-olive-700" : "bg-olive-200")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink-900">{n.title}{n.unread && <span className="sr-only"> (unread)</span>}</span>
                  <TruncatedText text={n.body} lines={2} className="text-[13px] text-ink-500" />
                </span>
                <span className="shrink-0 text-[12px] text-ink-500">{formatDate(n.at)}</span>
              </button>
            ))}
          </Stagger>
        )}
      </GlassCard>
    </div>
  );
}
