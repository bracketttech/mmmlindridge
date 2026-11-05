import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Nestly" },
      { name: "description", content: "Photo, contact details and security in Nestly." },
      { property: "og:title", content: "Profile — Nestly" },
      { property: "og:description", content: "Photo, contact details and security in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="profile" title="Your" muted="profile" sub="Photo, contact details and security" />,
});
