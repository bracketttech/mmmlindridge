import { Link } from "@tanstack/react-router";
import { Clock, LinkIcon, UserCheck } from "lucide-react";
import { t } from "@/lib/strings";
import type { InviteStatus } from "@/mocks/auth";
import { AuthHeading } from "./auth";

/** Friendly screen for expired / used / unknown invite and registration links. */
export function LinkStatusScreen({ status }: { status: Exclude<InviteStatus, "valid"> }) {
  const l = t.auth.link;
  const map = {
    expired: { title: l.expiredTitle, muted: l.expiredMuted, body: l.expiredBody, Icon: Clock },
    used: { title: l.usedTitle, muted: l.usedMuted, body: l.usedBody, Icon: UserCheck },
    invalid: { title: l.invalidTitle, muted: l.invalidMuted, body: l.invalidBody, Icon: LinkIcon },
  }[status];
  return (
    <div>
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-full bg-olive-200 text-olive-900 animate-rise">
        <map.Icon className="h-7 w-7" aria-hidden />
      </div>
      <AuthHeading title={map.title} muted={map.muted} sub={map.body} />
      <Link to="/login" className="inline-flex h-12 items-center rounded-full bg-olive-700 px-6 text-sm font-medium text-primary-foreground hover:bg-olive-800">
        {t.auth.forgot.back}
      </Link>
    </div>
  );
}
