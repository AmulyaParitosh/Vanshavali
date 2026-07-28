"use client";

import React, { useState } from "react";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await authProvider.updatePassword(password);
      toast.success("Password updated. You're signed in.");
      router.replace("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Couldn't update the password";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-content">
        <h2>Choose a new password</h2>
        <p>Enter a new password for your account to finish the reset.</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSubmitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
