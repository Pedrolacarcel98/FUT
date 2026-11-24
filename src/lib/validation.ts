/**
 * Strict RFC-aligned email regex requiring a valid domain and at least a 2-letter TLD.
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Filters out synthetic local demo addresses (e.g. *.local, *.demo) before sending real SMTP emails.
 */
export function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) return false;
  if (trimmed.endsWith(".local") || trimmed.endsWith(".demo") || trimmed.endsWith(".test")) {
    return false;
  }
  return true;
}
