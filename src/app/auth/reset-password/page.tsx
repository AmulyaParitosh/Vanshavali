"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";

/**
 * Password-recovery landing. The email link Supabase sends (see
 * SupabaseAuthProvider.sendPasswordReset) redirects here with a recovery token
 * in the URL fragment; supabase-js (detectSessionInUrl) exchanges it for a
 * session before this page renders, so the user arrives signed in and we just
 * collect the new password. Unsigned visitors hitting this URL directly see
 * the login screen via AppProvider's auth gate.
 */
export default function ResetPasswordPage() {
  const { authProvider } = useAppContext();
  const router = useRouter();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setFormError("Those passwords don't match.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authProvider.updatePassword(password);
      toast.success("Password updated. You're signed in.");
      router.replace("/");
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Couldn't update the password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <Link href="/" className="login-wordmark" aria-label="Vanshavali home">
        <span className="login-wordmark-latin">Vanshavali</span>
        <span className="login-wordmark-deva">वंशावली</span>
      </Link>

      <div className="login-card">
        <div className="login-head">
          <h1 className="login-title">Choose a new password</h1>
          <p className="login-lede">Enter a new password for your account to finish the reset.</p>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              readOnly={isSubmitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              className={`input${formError ? " is-error" : ""}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              readOnly={isSubmitting}
              aria-invalid={!!formError}
            />
          </div>

          {formError && (
            <p className="auth-form-error" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={!password || !confirm || isSubmitting}
          >
            {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
            {isSubmitting ? "Working…" : "Set new password"}
          </button>
        </form>
      </div>

      <p className="login-privacy">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </div>
  );
}
