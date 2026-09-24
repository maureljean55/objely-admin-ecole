import type { StaffMember } from "./types";

export type Permission = "write" | "delete" | "manage_staff" | "manage_settings" | "manage_kiosks";

// admin: everything · vie_scolaire: day-to-day work, no deletes or configuration · lecture: read-only.
const MATRIX: Record<StaffMember["role"], Permission[]> = {
  admin: ["write", "delete", "manage_staff", "manage_settings", "manage_kiosks"],
  vie_scolaire: ["write"],
  lecture: [],
};

export const can = (user: StaffMember | undefined, permission: Permission) =>
  Boolean(user?.active && MATRIX[user.role].includes(permission));
