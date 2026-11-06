import { useAppState } from "./app-state";
import { actingMember, permsFor } from "@/services/admin";
import { readSession } from "./session";
import { allows, type Action, type Module } from "./access-rules";

/** Effective permissions for the signed-in preview role (re-reads after any permission change). */
export function useAccess() {
  const { role, version } = useAppState();
  void version;
  const email = readSession()?.email;
  const perms = permsFor(role, email);
  return { role, perms, member: actingMember(role, email), can: (m: Module, a: Action) => allows(perms, m, a) };
}
