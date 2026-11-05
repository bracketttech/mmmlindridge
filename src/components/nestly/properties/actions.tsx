import { useState } from "react";
import { toast } from "sonner";
import { propertyService, StorageFullError, type Property } from "@/services";
import { getState } from "@/mocks/portfolio-store";
import { useAppState } from "@/lib/app-state";
import { t } from "@/lib/strings";
import { ConfirmDialog } from "../overlays";
import { fill } from "./shared";

/** Delete-property confirmation, shared by the grid card menu and the detail page. */
export function usePropertyDelete(onDeleted?: () => void) {
  const [target, setTarget] = useState<Property | null>(null);
  const { propertyId, setPropertyId } = useAppState();
  const d = t.props.detail;
  const docCount = target ? getState().documents.filter((x) => x.propertyId === target.id).length : 0;
  const dialog = (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(o) => !o && setTarget(null)}
      title={fill(d.deleteTitle, { name: target?.name ?? "" })}
      body={fill(d.deleteBody, { u: target?.units ?? 0, d: docCount })}
      confirmLabel={d.delete}
      onConfirm={async () => {
        if (!target) return;
        try {
          await propertyService.remove(target.id);
        } catch (e) {
          toast.error(e instanceof StorageFullError ? t.props.form.storageFull : t.common.errorBody);
          throw e;
        }
        if (propertyId === target.id) setPropertyId("all");
        toast.success(d.deleted);
        onDeleted?.();
      }}
    />
  );
  return { ask: setTarget, dialog };
}
