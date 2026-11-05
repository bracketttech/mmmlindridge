import { useEffect, useMemo, useState } from "react";
import { propertyService, unitService, type Tenant } from "@/services";
import { useData } from "@/lib/use-data";
import { t } from "@/lib/strings";
import { StatusChip } from "../primitives";
import { statusTone } from "../composites";

/** Property + unit names for tenant rows, read through services. */
export function useUnitDirectory() {
  const props = useData(() => propertyService.list(), []);
  const units = useData(() => unitService.listByProperty("all"), []);
  return useMemo(() => {
    const p = new Map((props.data ?? []).map((x) => [x.id, x]));
    const u = new Map((units.data ?? []).map((x) => [x.id, x]));
    return {
      loading: props.loading || units.loading,
      properties: props.data ?? [],
      units: units.data ?? [],
      propertyName: (id: string) => p.get(id)?.name ?? "—",
      unitLabel: (id: string) => u.get(id)?.label ?? "—",
      place: (x: Pick<Tenant, "propertyId" | "unitId">) => `${p.get(x.propertyId)?.name ?? "—"} · ${u.get(x.unitId)?.label ?? "—"}`,
    };
  }, [props.data, props.loading, units.data, units.loading]);
}

export function TenantStatus({ x }: { x: Pick<Tenant, "status" | "archived"> }) {
  const s = t.tenants.statuses;
  if (x.archived) return <StatusChip tone="neutral" dot>{s.archived}</StatusChip>;
  return <StatusChip tone={statusTone(x.status)} dot>{s[x.status]}</StatusChip>;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 864e5);
