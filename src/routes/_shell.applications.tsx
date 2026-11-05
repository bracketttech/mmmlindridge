import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/nestly/Placeholder";

export const Route = createFileRoute("/_shell/applications")({
  head: () => ({
    meta: [
      { title: "Applications & screening — Nestly" },
      { name: "description", content: "Applicants and the owner screening checklist in Nestly." },
      { property: "og:title", content: "Applications & screening — Nestly" },
      { property: "og:description", content: "Applicants and the owner screening checklist in Nestly." },
    ],
  }),
  component: () => <Placeholder navKey="applications" title="Applications &" muted="screening" sub="Applicants and the owner screening checklist" />,
});
