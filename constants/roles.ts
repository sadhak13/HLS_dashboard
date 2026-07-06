export const ROLES = {
  ADMIN: 'ADMIN',
  COACH: 'COACH',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
