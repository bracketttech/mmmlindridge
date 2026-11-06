import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// Layout effect restores saved choices before first paint (no flash of default property/sidebar).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
import type { Role } from "./nav";
import { scopeFor } from "@/services/admin";
import { scopedPropertyId, type Scope } from "./access-rules";
import { readSession } from "./session";
import { PORTFOLIO_EVENT } from "@/mocks/portfolio-store";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  propertyId: string; // "all" or property id
  setPropertyId: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  /** Properties the current role may see ("all" or ids). */
  scope: Scope;
  /** Bumps whenever mock data (incl. permissions) changes. */
  version: number;
};

const Ctx = createContext<AppState | null>(null);

function usePersisted<T extends string | boolean>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useIsoLayoutEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw !== null) setV(JSON.parse(raw) as T);
  }, [key]);
  const set = (next: T) => {
    setV(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [v, set] as const;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = usePersisted<Role>("nestly.role", "owner");
  const [propertyId, setPropertyId] = usePersisted<string>("nestly.property", "all");
  const [collapsed, setCollapsed] = usePersisted<boolean>("nestly.sidebarCollapsed", false);
  const [version, setVersion] = useState(0);
  useEffect(() => { const on = () => setVersion((v) => v + 1); window.addEventListener(PORTFOLIO_EVENT, on); return () => window.removeEventListener(PORTFOLIO_EVENT, on); }, []);
  const scope = typeof window === "undefined" ? "all" : scopeFor(role, readSession()?.email);
  const effective = scopedPropertyId(scope, propertyId);
  return (
    <Ctx.Provider value={{ role, setRole, propertyId: effective, setPropertyId, collapsed, setCollapsed, scope, version }}>{children}</Ctx.Provider>
  );
}

export function useAppState() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppState must be inside AppStateProvider");
  return c;
}
