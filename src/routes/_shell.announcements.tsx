import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Nestly" },
      { name: "description", content: "Messages sent to your buildings in Nestly." },
      { property: "og:title", content: "Announcements — Nestly" },
      { property: "og:description", content: "Messages sent to your buildings in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="announcements" title="Tenant" muted="announcements" sub="Messages sent to your buildings" />,
});
