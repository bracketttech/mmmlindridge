// Mock auth service. Same signatures will be backed by Lovable Cloud later.
import * as fx from "@/mocks/auth";
import { findSentLink, markRegistered } from "./index";
import type { Role } from "@/lib/nav";
import { writeSession, type MockSession } from "@/lib/session";

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
export class AuthError extends Error {}

export type LoginResult = { status: "ok"; session: MockSession } | { status: "2fa"; email: string; role: Role };

const nameFromEmail = (email: string) =>
  email.split("@")[0]!.split(/[._-]/).filter(Boolean).map((p) => p[0]!.toUpperCase() + p.slice(1)).join(" ") || "Nestly user";

function startSession(email: string, role: Role, name = nameFromEmail(email)): MockSession {
  const s = { email, name, role, signedInAt: new Date().toISOString() };
  writeSession(s);
  return s;
}

export const authService = {
  async login(email: string, password: string, role: Role): Promise<LoginResult> {
    await wait();
    if (password === fx.DEMO_WRONG_PASSWORD) throw new AuthError("invalid");
    if (email.toLowerCase().includes("2fa")) return { status: "2fa", email, role };
    return { status: "ok", session: startSession(email, role) };
  },
  async verifyOtp(code: string, email: string, role: Role) {
    await wait(500);
    if (code === fx.DEMO_BAD_OTP) throw new AuthError("otp");
    return startSession(email, role);
  },
  async signup(email: string) {
    await wait();
    if (email.toLowerCase() === fx.DEMO_TAKEN_EMAIL) throw new AuthError("taken");
    return { email };
  },
  async confirmEmail(email: string, name?: string) {
    await wait(400);
    return startSession(email, "owner", name);
  },
  async resendVerification() {
    await wait(400);
  },
  async requestReset(_email: string) {
    await wait();
  },
  async resetPassword(token: string, _password: string) {
    await wait();
    if (token === fx.DEMO_EXPIRED_RESET) throw new AuthError("expired");
  },
  async getStaffInvite(token: string): Promise<{ status: fx.InviteStatus; invite?: fx.StaffInvite }> {
    await wait(500);
    const invite = fx.staffInvites.find((i) => i.token === token);
    return invite ? { status: invite.status, invite } : { status: "invalid" };
  },
  async acceptStaffInvite(invite: fx.StaffInvite, name: string) {
    await wait();
    return startSession(invite.email, invite.role, name);
  },
  async getTenantLink(token: string): Promise<{ status: fx.InviteStatus; link?: fx.TenantLink }> {
    await wait(500);
    const link = fx.tenantLinks.find((l) => l.token === token) ?? findSentLink(token);
    return link ? { status: link.status, link } : { status: "invalid" };
  },
  async registerTenant(link: fx.TenantLink) {
    await wait();
    markRegistered(link.token);
    return startSession(link.email, "tenant", link.name);
  },
  async completeOnboarding(_data: unknown) {
    await wait(600);
  },
};
