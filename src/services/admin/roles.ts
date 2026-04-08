import type { UserRole } from "@/src/auth/types";

export function assertRole(actual: UserRole | null, allowed: UserRole[]) {
  if (!actual || !allowed.includes(actual)) {
    const allowedText = allowed.join(", ");
    throw new Error(`Forbidden: role must be one of [${allowedText}]`);
  }
}

