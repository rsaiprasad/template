import type { Permission } from '../types/permission';

export const hasPermission = (userPermissions: string[], required: Permission): boolean => {
  return userPermissions.includes(required);
};

export const hasAnyPermission = (userPermissions: string[], required: Permission[]): boolean => {
  return required.some((p) => userPermissions.includes(p));
};

export const hasAllPermissions = (userPermissions: string[], required: Permission[]): boolean => {
  return required.every((p) => userPermissions.includes(p));
};

export const filterByPermission = <T>(
  items: T[],
  userPermissions: string[],
  getRequiredPermission: (item: T) => Permission
): T[] => {
  return items.filter((item) => hasPermission(userPermissions, getRequiredPermission(item)));
};
