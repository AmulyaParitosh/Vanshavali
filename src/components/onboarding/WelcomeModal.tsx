"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "vanshavali.welcome.dismissed";

interface WelcomeModalProps {
  /** Name to greet the user with — typically `profile.name || user.displayName`. */
  displayName: string | null;
  /** Active tree id, used to deep-link the "Add your family" CTA. */
  treeId: string;
  /** True only when this is the user's very first session (e.g. tree has just one person). */
  shouldShow: boolean;
}

/**
 * One-time welcome banner shown after a user's tree has been auto-provisioned.
 * Tracks "seen" state in localStorage so it disappears on subsequent visits.
 *
 * Intentionally a banner card (not a `<dialog>`) — heritage-styled, dismissible
 * with one click, doesn't trap focus.
 */
const WelcomeModal: React.FC<WelcomeModalProps> = ({ displayName, treeId, shouldShow }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
  };

  if (dismissed || !shouldShow) return null;

  const firstName = (displayName || "").split(/\s+/)[0] || displayName || "there";

  return (
    <div role="dialog" aria-labelledby="welcome-title" aria-modal="false" className="welcome-modal">
      <button
        type="button"
        className="welcome-modal-close"
        onClick={dismiss}
        aria-label="Dismiss welcome message"
      >
        ✕
      </button>
      <h2 id="welcome-title">Welcome, {firstName}!</h2>
      <p>
        We&apos;ve started your family tree with you as the root. Add your parents, siblings, and
        children to start filling it in — every connection grows the picture.
      </p>
      <div className="welcome-modal-actions">
        <Link href={`/tree/${treeId}/people`} className="btn btn-primary" onClick={dismiss}>
          Add your first family member
        </Link>
        <Link href={`/tree/${treeId}/members`} className="btn btn-secondary" onClick={dismiss}>
          Invite relatives
        </Link>
        <button type="button" className="auth-link" onClick={dismiss}>
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
