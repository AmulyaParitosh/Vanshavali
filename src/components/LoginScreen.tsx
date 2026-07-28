"use client";

import React, { useState } from "react";
import type { AuthProvider } from "../services/types";
import { useToast } from "./ToastSystem";

type Mode = "sign-in" | "sign-up" | "reset";

interface LoginScreenProps {
  /**
   * Auth provider passed in from AppProvider rather than read via context — the
   * login screen renders before the user is signed in, when other downstream
   * context guarantees don't yet hold.
   */
  authProvider: AuthProvider;
}

/**
 * Heritage-flavored auth surface. Tabs across sign-in / sign-up / password
 * reset; Google OAuth always available below the form. Errors surface via
 * toast — the user gets a single ergonomic feedback channel.
 */
const LoginScreen: React.FC<LoginScreenProps> = ({ authProvider }) => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === "sign-in") {
        await authProvider.signInWithEmail(email.trim(), password);
      } else if (mode === "sign-up") {
        await authProvider.signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
        toast.success("Check your inbox to confirm your email.");
      } else {
        await authProvider.sendPasswordReset(email.trim());
        toast.success("Password reset link sent. Check your email.");
        setMode("sign-in");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await authProvider.signInWithGoogle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast.error(message);
    }
  };

  const submitLabel =
    mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link";
  const title =
    mode === "sign-in"
      ? "Welcome back"
      : mode === "sign-up"
        ? "Start your family record"
        : "Reset your password";
  const subtitle =
    mode === "reset"
      ? "We'll email you a link to set a new password."
      : "Open your family's record, or start one in a minute.";

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-head">
          <h2 className="login-title">{title}</h2>
          <p className="login-lede">{subtitle}</p>
        </div>

        <div role="tablist" aria-label="Authentication mode" className="auth-tabs">
          <button
            role="tab"
            type="button"
            aria-selected={mode === "sign-in"}
            className={`auth-tab${mode === "sign-in" ? " active" : ""}`}
            onClick={() => setMode("sign-in")}
          >
            Sign in
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === "sign-up"}
            className={`auth-tab${mode === "sign-up" ? " active" : ""}`}
            onClick={() => setMode("sign-up")}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "sign-up" && (
            <div className="form-group">
              <label htmlFor="auth-name">Your name</label>
              <input
                id="auth-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder="How your relatives know you"
                disabled={isSubmitting}
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />
          </div>
          {mode !== "reset" && (
            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
                minLength={mode === "sign-up" ? 8 : 1}
                disabled={isSubmitting}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : submitLabel}
          </button>

          {mode === "sign-in" && (
            <button
              type="button"
              className="auth-link"
              onClick={() => setMode("reset")}
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="auth-link"
              onClick={() => setMode("sign-in")}
              disabled={isSubmitting}
            >
              Back to sign in
            </button>
          )}
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button type="button" className="btn btn-secondary auth-google" onClick={handleGoogle}>
          <span className="login-google-g" aria-hidden="true">
            G
          </span>
          Continue with Google
        </button>

        <p className="login-privacy">
          Nothing you add is public. <a href="/about">How we handle your family&apos;s data</a>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
