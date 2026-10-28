export type PasswordIssue = "length" | "letter" | "number";

/** Sign-up password rules: at least 8 characters with a letter and a number. */
export function passwordIssues(pw: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (pw.length < 8) issues.push("length");
  if (!/[A-Za-z]/.test(pw)) issues.push("letter");
  if (!/\d/.test(pw)) issues.push("number");
  return issues;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 255;
}
