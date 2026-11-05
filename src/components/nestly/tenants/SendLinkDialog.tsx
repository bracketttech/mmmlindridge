import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, ExternalLink, Mail, MessageCircle, Send, Smartphone } from "lucide-react";
import { Modal } from "../composites";
import { PillButton, SegmentedChips } from "../primitives";
import { linkExpiry, linkTokenFor, tenantService, type Tenant } from "@/services";
import { registrationMessage, type LinkChannel } from "@/lib/tenancy-rules";
import { formatDate } from "@/lib/format";
import { t } from "@/lib/strings";
import { fill } from "../properties/shared";

export function SendLinkDialog({ tenant, place, onClose }: { tenant: Tenant | null; place: { property: string; unit: string }; onClose: () => void }) {
  const l = t.tenants.link;
  const [channel, setChannel] = useState<LinkChannel>("email");
  const [busy, setBusy] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);
  if (!tenant) return null;
  const token = linkTokenFor(tenant.id);
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/register/${token}`;
  const expires = formatDate(linkExpiry());
  const msg = registrationMessage(channel, { name: tenant.name, property: place.property, unit: place.unit, url, owner: l.owner, expires });
  const to = channel === "email" ? tenant.email : tenant.phone;
  const icons = { copy: Copy, email: Mail, whatsapp: MessageCircle, sms: Smartphone } as const;
  const Icon = icons[channel];

  const go = async () => {
    setBusy(true);
    try {
      const tok = await tenantService.sendLink(tenant.id, l.channels[channel]);
      setSentToken(tok);
      if (channel === "copy") { await navigator.clipboard?.writeText(url).catch(() => undefined); toast.success(l.copied); }
      else toast.success(fill(l.sent, { channel: l.channels[channel] }));
    } catch { toast.error(t.common.errorBody); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={l.title} wide
      footer={<>
        {sentToken && <Link to="/register/$token" params={{ token: sentToken }} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium text-olive-700 hover:bg-olive-100"><ExternalLink className="h-4 w-4" />{l.open}</Link>}
        <PillButton variant="secondary" onClick={onClose}>{t.common.close}</PillButton>
        <PillButton onClick={go} disabled={busy} icon={channel === "copy" ? <Copy className="h-4 w-4" /> : <Send className="h-4 w-4" />}>{channel === "copy" ? l.copy : fill(l.send, { channel: l.channels[channel] })}</PillButton>
      </>}>
      <p className="-mt-2 mb-4 truncate text-[13px] text-ink-500">{fill(l.sub, { name: tenant.name, property: place.property, unit: place.unit })}</p>
      <SegmentedChips label={l.title} value={channel} onChange={setChannel} wrap options={(["email", "whatsapp", "sms", "copy"] as const).map((c) => ({ value: c, label: l.channels[c] }))} />
      <div className="mt-4 space-y-2">
        <p className="text-overline text-ink-500">{l.preview}</p>
        <div className="rounded-[5px] border border-border-soft bg-surface-solid p-4">
          {channel !== "copy" && (
            <p className="mb-2 flex min-w-0 items-center gap-2 text-[13px] text-ink-500"><Icon aria-hidden className="h-4 w-4 shrink-0" /><span className="shrink-0">{l.to}:</span><span className="truncate text-ink-900">{to}</span></p>
          )}
          {channel === "email" && <p className="mb-2 truncate text-[13px] text-ink-500">{l.subject}: <span className="text-ink-900">{fill(l.subjectText, { property: place.property })}</span></p>}
          {channel === "copy"
            ? <p className="break-all font-mono text-[13px] text-ink-900">{url}</p>
            : <p className={channel === "whatsapp" ? "whitespace-pre-line rounded-[5px] bg-olive-100 p-3 text-[14px] text-ink-900" : "whitespace-pre-line break-words text-[14px] text-ink-900"}>{msg}</p>}
        </div>
        <p className="text-[12px] text-ink-500">{fill(l.expires, { date: expires })}</p>
      </div>
    </Modal>
  );
}
