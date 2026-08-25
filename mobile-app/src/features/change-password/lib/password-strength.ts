export type PasswordStrength = 0 | 1 | 2 | 3;

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.max(1, score) as PasswordStrength;
}