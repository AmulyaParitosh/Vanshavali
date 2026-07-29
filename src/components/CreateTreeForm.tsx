"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";

/**
 * Create a tree (Spec 03 c3) — two fields and nothing else. "Create the record"
 * stays disabled until the name has a non-space character (a2 / flow f3). On
 * success the service creates the tree, the keeper membership and the user's own
 * root person in one transaction (reusing their record if they have one, a3),
 * then we route into the new tree (first run). Reused inline in the empty state
 * and on /trees/new.
 */
export default function CreateTreeForm() {
  const { dataProvider, user } = useAppContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = !!name.trim() && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const tree = await dataProvider.createTree(
        user?.uid ?? "",
        name.trim(),
        place.trim() || undefined
      );
      router.push(`/tree/${tree.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create the record.");
      setSubmitting(false);
    }
  };

  return (
    <form className="create-tree" onSubmit={submit}>
      <div className="form-group">
        <label htmlFor="create-name">What should this record be called?</label>
        <input
          id="create-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mishra Parivār"
          autoComplete="off"
          readOnly={submitting}
        />
      </div>
      <div className="form-group">
        <label htmlFor="create-place">Where is the family from?</label>
        <input
          id="create-place"
          className="input"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Madhubani, Bihar · optional"
          autoComplete="off"
          readOnly={submitting}
        />
      </div>
      {error && (
        <p className="auth-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary create-submit" disabled={!canCreate}>
        {submitting && <span className="auth-spinner" aria-hidden="true" />}
        Create the record
      </button>
    </form>
  );
}
