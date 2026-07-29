"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AuthProvider } from "../services/types";
import { AUTH_ERR, isAuthError } from "../lib/authErrors";

type Tab = "signin" | "create";

interface LoginScreenProps {
  /**
   * Auth provider passed in from AppProvider rather than read via context — the
   * login screen renders before the user is signed in, when other downstream
   * context guarantees don't yet hold.
   */
  authProvider: AuthProvider;
  /** Which tab opens selected — `create` when arriving from "Start a tree" (?intent). */
  initialTab?: Tab;
}

/** Loose email check that accepts internationalised addresses (Spec 02 e5). */
const emailValid = (e: string): boolean => /.+@.+\..+/.test(e.trim());

/** The real multi-colour Google mark — 18px, never recoloured (Spec 02 c4). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Sign in (Spec 02) — two jobs on one card: let a keeper back into their record,
 * and let a stranger start one. `Sign in` / `Create account` are two tabs on the
 * same card (email + password only); one filled red button; Google is a neutral
 * outline below the divider. Errors are inline above the button (never a toast),
 * non-disclosing, and a failed sign-in clears only the password and refocuses it.
 */
const LoginScreen: React.FC<LoginScreenProps> = ({ authProvider, initialTab = "signin" }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNote, setFormNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const signinTabRef = useRef<HTMLButtonElement>(null);
  const createTabRef = useRef<HTMLButtonElement>(null);

  // Email is autofocused on Sign in, never on Create (a new user reads first).
  useEffect(() => {
    if (tab === "signin") emailRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTab = (next: Tab) => {
    // a4: switching tabs preserves the typed email; clear per-attempt messaging.
    setTab(next);
    setFormError(null);
    setEmailTouched(false);
  };

  const emailError = emailTouched && email.trim() !== "" && !emailValid(email);
  const canSubmit = !!email.trim() && !!password && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormNote(null);
    setEmailTouched(true);
    if (!emailValid(email) || !password) return; // a5: validate on submit
    setSubmitting(true);
    try {
      if (tab === "signin") {
        await authProvider.signInWithEmail(email.trim(), password);
      } else {
        await authProvider.signUpWithEmail(email.trim(), password);
      }
    } catch (error: unknown) {
      if (tab === "signin") {
        // a6 / f4: never disclose whether the email exists — one message, clear
        // the password, return focus to it. The card does not shake.
        setFormError("That password does not match this email.");
        setPassword("");
        passwordRef.current?.focus();
      } else if (isAuthError(error, AUTH_ERR.EMAIL_EXISTS)) {
        // a7 / f5: switch to Sign in, carry the email, note it — do not error.
        setTab("signin");
        setPassword("");
        setFormNote("You already have an account with this email.");
        setTimeout(() => passwordRef.current?.focus(), 0);
      } else {
        setFormError(error instanceof Error ? error.message : "Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: Tab = tab === "signin" ? "create" : "signin";
      selectTab(next);
      (next === "signin" ? signinTabRef : createTabRef).current?.focus();
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
          <h1 className="login-title">Welcome back</h1>
          <p className="login-lede">Open your family&apos;s record, or start one in a minute.</p>
        </div>

        <div role="tablist" aria-label="Sign in or create account" className="auth-tabs">
          <button
            ref={signinTabRef}
            role="tab"
            type="button"
            aria-selected={tab === "signin"}
            tabIndex={tab === "signin" ? 0 : -1}
            className={`auth-tab${tab === "signin" ? " active" : ""}`}
            onClick={() => selectTab("signin")}
            onKeyDown={onTabKey}
          >
            Sign in
          </button>
          <button
            ref={createTabRef}
            role="tab"
            type="button"
            aria-selected={tab === "create"}
            tabIndex={tab === "create" ? 0 : -1}
            className={`auth-tab${tab === "create" ? " active" : ""}`}
            onClick={() => selectTab("create")}
            onKeyDown={onTabKey}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              ref={emailRef}
              id="auth-email"
              type="text"
              inputMode="email"
              className={`input${emailError ? " is-error" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              readOnly={submitting}
              aria-invalid={emailError}
            />
            {emailError && <span className="auth-field-error">Enter a valid email address.</span>}
          </div>

          <div className="form-group">
            <div className="auth-label-row">
              <label htmlFor="auth-password">
                {tab === "signin" ? "Password" : "Choose a password"}
              </label>
              {tab === "signin" ? (
                <Link
                  href={`/reset${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                  className="auth-forgot"
                >
                  Forgot?
                </Link>
              ) : (
                <span className="auth-hint">at least 8 characters</span>
              )}
            </div>
            <div className="auth-password-wrap">
              <input
                ref={passwordRef}
                id="auth-password"
                type={reveal ? "text" : "password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "create" ? "new-password" : "current-password"}
                readOnly={submitting}
              />
              <button
                type="button"
                className="auth-reveal"
                aria-pressed={reveal}
                aria-label={reveal ? "Hide password" : "Show password"}
                onClick={() => setReveal((r) => !r)}
              >
                {reveal ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {formNote && <p className="auth-form-note">{formNote}</p>}
          {formError && (
            <p className="auth-form-error" role="alert">
              {formError}
            </p>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={!canSubmit}>
            {submitting && <span className="auth-spinner" aria-hidden="true" />}
            {tab === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={() => void authProvider.signInWithGoogle()}
          disabled={submitting}
        >
          <GoogleMark />
          Continue with Google
        </button>
      </div>

      <p className="login-privacy">
        Nothing you add is public.
        <Link href="/privacy">How we handle your family&apos;s data</Link>
      </p>
    </div>
  );
};

export default LoginScreen;
