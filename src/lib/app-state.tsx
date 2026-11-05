import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

// Layout effect restores saved choices before first paint (no flash of default property/sidebar).
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
import type { Role } from "./nav";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  propertyId: string; // "all" or property id
  setPropertyId: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
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
  return (
    <Ctx.Provider value={{ role, setRole, propertyId, setPropertyId, collapsed, setCollapsed }}>{children}</Ctx.Provider>
  );
}

export function useAppState() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppState must be inside AppStateProvider");
  return c;
}
