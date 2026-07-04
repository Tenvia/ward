export const TENANTS = {
  acme: "tenant_acme",
  globex: "tenant_globex",
} as const;

export type TenantKey = keyof typeof TENANTS;
