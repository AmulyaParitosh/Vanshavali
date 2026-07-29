"use client";

import React from "react";
import { useRouter } from "next/navigation";

/**
 * First run (Spec 03 c2 / state s3) — the tree has exactly one person: you. A
 * card floats over the one-node canvas with one heading, one paragraph, two
 * buttons and a quiet link. The canvas behind shows a single node with a
 * connector stub and no floating Add button (a7).
 */
export default function FirstRunCard({ treeId }: { treeId: string }) {
  const router = useRouter();
  // The add-person and invite panels live on Members; father→mother prefill
  // (f5) and invite-write preselect (f6) are refined there.
  const members = `/tree/${treeId}/members`;
  return (
    <div className="firstrun-card" role="dialog" aria-label="Your tree starts with you">
      <h2 className="firstrun-h1">Your tree starts with you.</h2>
      <p className="firstrun-body">
        One name is a tree. Add your parents next — Vanshavali will draw the generation above you,
        and the rest arrives a relative at a time.
      </p>
      <button
        type="button"
        className="btn btn-primary firstrun-primary"
        onClick={() => router.push(members)}
      >
        Add my parents
      </button>
      <button type="button" className="firstrun-secondary" onClick={() => router.push(members)}>
        Invite the relative who remembers
      </button>
      <button type="button" className="firstrun-quiet" onClick={() => router.push("/user/record")}>
        Fill in your own dates first —{" "}
        <span className="firstrun-quiet-link">complete your record</span>
      </button>
    </div>
  );
}
