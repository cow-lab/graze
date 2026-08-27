const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "mail.com",
  "gmx.com",
]);

export function isAutoVerifiedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (domain.endsWith(".edu")) return true;
  return !FREE_EMAIL_DOMAINS.has(domain);
}
