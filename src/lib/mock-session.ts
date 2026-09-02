import type { UserRole } from "@/lib/domain/types";

export const MOCK_ROLE_COOKIE = "sejuk_role";
export const MOCK_ROLES = ["admin", "technician", "manager"] as const;

export function isMockRole(value: string | undefined): value is UserRole {
  return Boolean(value && MOCK_ROLES.includes(value as UserRole));
}

export function hasMockRole(value: string | undefined, expectedRole: UserRole): boolean {
  return value === expectedRole;
}

export function portalPathForRole(role: UserRole): `/${UserRole}` {
  return `/${role}`;
}
