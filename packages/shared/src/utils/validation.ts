export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const sanitizeDisplayName = (name: string): string => {
  return name.trim().slice(0, 100);
};

export const getFirstName = (displayName: string): string => {
  const parts = displayName.trim().split(' ');
  return parts[0] ?? displayName;
};
