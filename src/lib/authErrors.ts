/**
 * A tiny auth-error taxonomy shared by the auth provider and the sign-in UI
 * (Spec 02). Sign-in failures are deliberately NOT enumerated — the UI maps any
 * sign-in rejection to one non-disclosing message (a6 / flow f4), so the only
 * code we need to surface is "this email already has an account" (a7 / f5),
 * which must switch tabs rather than error.
 */
export const AUTH_ERR = {
  EMAIL_EXISTS: "email_exists",
} as const;

export type AuthErrorCode = (typeof AUTH_ERR)[keyof typeof AUTH_ERR];

/** An Error tagged with an AuthErrorCode the UI can branch on. */
export function authError(code: AuthErrorCode, message: string): Error & { code: AuthErrorCode } {
  return Object.assign(new Error(message), { code });
}

/** Whether a thrown value is our tagged auth error with the given code. */
export function isAuthError(error: unknown, code: AuthErrorCode): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === code;
}
