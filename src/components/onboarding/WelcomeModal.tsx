"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "vanshavali.welcome.dismissed";

interface WelcomeModalProps {
  /** Name to greet the user with — typically `profile.name || user.displayName`. */
  displayName: string | null;
  /** Active tree id, used to deep-link the CTAs. */
  treeId: string;
  /** True only when this is the user's very first session (tree has just them). */
  shouldShow: boolean;
}

/**
 * First-session welcome (§ Welcome-in) — a centered card over the tree with the
 * marigold→red ornament bar, a greeting, and the first two things worth doing.
 * Dismissal is remembered in localStorage so it appears once.
 */
const WelcomeModal: React.FC<WelcomeModalProps> = ({ displayName, treeId, shouldShow }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
  };

  if (dismissed || !shouldShow) return null;

  const firstName = (displayName || "").split(/\s+/)[0] || displayName || "there";

  return (
    <div className="welcome-scrim" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-modal">
        <div className="welcome-bar" aria-hidden="true" />
        <button
          type="button"
          className="welcome-modal-close"
          onClick={dismiss}
          aria-label="Dismiss welcome"
        >
          ✕
        </button>
        <div className="welcome-body">
          <div className="welcome-head">
            <span className="welcome-ornament" aria-hidden="true">
              ✧ ❀ ✧
            </span>
            <h2 id="welcome-title">Welcome, {firstName}</h2>
            <p className="welcome-lead">
              Your family tree starts with you at the root. Add the people you remember, or invite
              the relatives who remember more — every connection grows the picture.
            </p>
          </div>
          <div className="welcome-modal-actions">
            <Link href={`/tree/${treeId}/people`} className="welcome-action" onClick={dismiss}>
              <span className="welcome-action-glyph" aria-hidden="true">
                ＋
              </span>
              <span className="welcome-action-body">
                <span className="welcome-action-title">Add your first family member</span>
                <span className="welcome-action-sub">
                  A parent, a sibling, a child — start where it&apos;s easy
                </span>
              </span>
              <span className="welcome-action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href={`/tree/${treeId}/members`} className="welcome-action" onClick={dismiss}>
              <span className="welcome-action-glyph" aria-hidden="true">
                ❦
              </span>
              <span className="welcome-action-body">
                <span className="welcome-action-title">Invite relatives</span>
                <span className="welcome-action-sub">
                  Give someone who remembers writing access and build it together
                </span>
              </span>
              <span className="welcome-action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
          <button type="button" className="btn btn-primary welcome-dismiss" onClick={dismiss}>
            Just let me look around
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
