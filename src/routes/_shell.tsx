import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/nestly/shell";
import { readSession } from "@/lib/session";

// Mock session lives in the browser, so this gate runs client-side only (UI phases).
export const Route = createFileRoute("/_shell")({
  ssr: false,
  beforeLoad: () => {
    if (!readSession()) throw redirect({ to: "/login", replace: true });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
