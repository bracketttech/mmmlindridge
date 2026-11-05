import { createFileRoute, redirect } from "@tanstack/react-router";

// No landing page: the app opens at sign-in.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Nestly — Property management for SA landlords" },
      { name: "description", content: "Nestly helps South African landlords manage properties, tenants, requests and rent." },
      { property: "og:title", content: "Nestly — Property management" },
      { property: "og:description", content: "Manage properties, tenants, requests and rent in one calm workspace." },
    ],
  }),
});
