import { createFileRoute, redirect } from "@tanstack/react-router";

// No landing page: the app opens at sign-in.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "MMM Lindridge — Property Management Platform" },
      { name: "description", content: "MMM Lindridge | Property Management Platform" },
      { property: "og:title", content: "MMM Lindridge — Property Management Platform" },
      { property: "og:description", content: "Manage properties, tenants, requests and rent in one calm workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
