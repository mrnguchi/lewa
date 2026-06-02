import type { AdminScopeParams, AdminUser } from "@/lib/admin-api";

import type { DashboardScope } from "../types";

const normalizeAdminRole = (role: string) =>
  role.trim().toLowerCase().replace(/\s+/g, "_");

export const canSelectDashboardScope = (admin: AdminUser) =>
  ["central_admin", "super_admin"].includes(normalizeAdminRole(admin.admin_role));

export const toAdminScopeParams = (scope: DashboardScope): AdminScopeParams => ({
  faculty: scope.faculty || undefined,
  department: scope.department || undefined,
});

export const getDashboardScopeLabel = (
  scope: DashboardScope,
  admin?: AdminUser | null,
) => {
  if (scope.department) {
    return scope.department;
  }

  if (scope.faculty) {
    return scope.faculty;
  }

  if (admin?.department) {
    return admin.department;
  }

  if (admin?.faculty) {
    return admin.faculty;
  }

  return "General UB Data";
};
