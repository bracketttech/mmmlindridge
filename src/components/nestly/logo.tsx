import { t } from "@/lib/strings";
import publicLogo from "@/assets/mmm-logo-public.svg.asset.json";
import appLogo from "@/assets/mmm-logo-app.svg.asset.json";
import appIcon from "@/assets/mmm-favi-white.png.asset.json";

export function Logo({ showText = true, variant = "public" }: { showText?: boolean; variant?: "public" | "app" }) {
  const src = variant === "app" ? showText ? appLogo.url : appIcon.url : publicLogo.url;
  return <img src={src} alt={t.app.name} className="h-7 w-auto max-w-full shrink-0 object-contain" />;
}
