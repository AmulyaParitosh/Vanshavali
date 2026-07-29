"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "../../context/AppContext";

/** Loose email check that accepts internationalised addresses (Spec 02 e5). */
const emailValid = (e: string): boolean => /.+@.+\..+/.test(e.trim());

/**
 * Password-reset REQUEST page (Spec 02 flow 6) — the same card as /signin with a
 * single field. On submit it confirms the link was sent and offers nothing else.
 * Distinct from /auth/reset-password, which is the landing after the link is clicked.
 */
export default function ResetPage() {
  const { authProvider } = useAppContext();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailError = touched && email.trim() !== "" && !emailValid(email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid(email)) return;
    setSubmitting(true);
    try {
      await authProvider.sendPasswordReset(email.trim());
      setSent(true); // Same confirmation whether or not the address exists (non-disclosing).
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
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
          <h1 className="login-title">Reset your password</h1>
          <p className="login-lede">
            {sent
              ? "Follow the link in your email to set a new one."
              : "We'll email you a link to set a new password."}
          </p>
        </div>

        {sent ? (
          <p className="auth-form-note" role="status">
            Check your email — we sent a link to {email.trim()}
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="text"
                inputMode="email"
                className={`input${emailError ? " is-error" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                autoComplete="email"
                readOnly={submitting}
                aria-invalid={emailError}
              />
              {emailError && <span className="auth-field-error">Enter a valid email address.</span>}
            </div>
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={!email.trim() || submitting}
            >
              {submitting && <span className="auth-spinner" aria-hidden="true" />}
              Send reset link
            </button>
          </form>
        )}
      </div>

      <p className="login-privacy">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </div>
  );
}
