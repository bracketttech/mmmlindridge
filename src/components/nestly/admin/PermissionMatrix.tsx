import { Check, Lock } from "lucide-react";
import { ACTIONS, LOCKED_MODULES, MODULES, type Action, type Module, type PermSet } from "@/lib/access-rules";
import { t } from "@/lib/strings";
import { cn } from "@/lib/utils";

const s = t.staffAdmin;

/** View/create/edit/delete/approve/export grid. `changed` marks cells that differ from the role preset. */
export function PermissionMatrix({ perms, onToggle, changed, disabled = false }: {
  perms: PermSet; onToggle: (m: Module, a: Action, v: boolean) => void; changed?: (m: Module, a: Action) => boolean; disabled?: boolean;
}) {
  const Cell = ({ m, a }: { m: Module; a: Action }) => {
    const on = perms[m][a];
    const locked = LOCKED_MODULES.includes(m);
    const ch = changed?.(m, a);
    return (
      <button type="button" role="checkbox" aria-checked={on} disabled={disabled || locked}
        aria-label={`${s.modules[m]}: ${s.actions[a]}${ch ? ` (${s.panel.overridden.replace("{role}", "")})` : ""}`}
        onClick={() => onToggle(m, a, !on)}
        className={cn("relative grid h-8 w-8 place-items-center rounded-full border transition-colors disabled:cursor-not-allowed",
          on ? "border-olive-700 bg-olive-700 text-primary-foreground" : "border-border-soft bg-surface-solid text-transparent hover:bg-olive-100",
          locked && "opacity-40", ch && "ring-2 ring-warning ring-offset-1")}>
        <Check className="h-4 w-4" aria-hidden />
      </button>
    );
  };
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-[14px]">
          <thead><tr>{["", ...ACTIONS].map((a) => <th key={a} scope="col" className="text-overline px-2 py-2 font-medium text-ink-500">{a ? s.actions[a as Action] : ""}</th>)}</tr></thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m} className="border-t border-border-soft">
                <th scope="row" className="py-2 pr-3 font-medium text-ink-900"><span className="flex items-center gap-2">{s.modules[m]}{LOCKED_MODULES.includes(m) && <span className="inline-flex items-center gap-1 text-[12px] font-normal text-ink-500"><Lock className="h-3 w-3" />{s.panel.locked}</span>}</span></th>
                {ACTIONS.map((a) => <td key={a} className="px-2 py-1.5"><Cell m={m} a={a} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {MODULES.map((m) => (
          <li key={m} className="rounded-[5.75px] border border-border-soft bg-surface-solid/80 p-3">
            <p className="mb-2 flex items-center gap-2 text-[14px] font-medium text-ink-900">{s.modules[m]}{LOCKED_MODULES.includes(m) && <Lock className="h-3 w-3 text-ink-500" aria-label={s.panel.locked} />}</p>
            <div className="grid grid-cols-3 gap-2">
              {ACTIONS.map((a) => <label key={a} className="flex items-center gap-2 text-[12px] text-ink-500"><Cell m={m} a={a} />{s.actions[a]}</label>)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
