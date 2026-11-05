// Placeholder pricing tiers (per active tenants per property). Final prices TBC — see DOCS pricing notes.
export type Plan = { id: "starter" | "standard" | "pro" | "custom"; name: string; maxTenants: number | null; monthly: number | null; features: string[] };

export const plans: Plan[] = [
  { id: "starter", name: "Starter", maxTenants: 5, monthly: 199, features: ["Requests & invoices", "Tenant app", "1 staff seat"] },
  { id: "standard", name: "Standard", maxTenants: 20, monthly: 499, features: ["Everything in Starter", "Leases & e-signature", "5 staff seats"] },
  { id: "pro", name: "Pro", maxTenants: 50, monthly: 999, features: ["Everything in Standard", "Reports & exports", "Unlimited staff"] },
  { id: "custom", name: "Custom", maxTenants: null, monthly: null, features: ["Portfolios over 50 tenants", "Dedicated onboarding", "Custom terms"] },
];

export const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"] as const;
