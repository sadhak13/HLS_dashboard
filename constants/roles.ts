export const ROLES = {
  ADMIN: 'ADMIN',
  COACH: 'COACH',
  MANAGER: 'MANAGER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  COACH: 'Coach',
  MANAGER: 'Manager',
};

export const ROLE_HOME_ROUTE: Record<Role, string> = {
  ADMIN: '/dashboard',
  COACH: '/coach-dashboard',
  MANAGER: '/coach-dashboard',
};

/** Roles that share the coach-side route group/UI (scoped to branch/batch data, not admin). */
export const STAFF_ROLES: Role[] = [ROLES.COACH, ROLES.MANAGER];
