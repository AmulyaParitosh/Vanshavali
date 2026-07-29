"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { canEdit } from "../lib/access";

/**
 * Getting started (Spec 10) — a four-item checklist that lives in the tree rail,
 * not a modal (a1). Join is ticked by arriving; the rest each link to where the
 * one thing is done, in any order, blocking nothing (a2). A reader is offered
 * three steps, not four (a8). When every offered step is done the checklist
 * disappears with no congratulation (a9). Done-states are derived from the
 * viewer's own record; the bespoke task screens (crop, date-precision, household
 * preview) and their new models are tracked in IMPLEMENTATION.md.
 */
export default function GettingStarted() {
  const { currentTreeId, treeData, membership, user } = useAppContext();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!currentTreeId || !treeData || !membership || !user) return null;

  const me = treeData.people.find((p) => p.userId === user.uid) ?? null;
  const hasPhoto = !!me?.image_url;
  const birth = (me?.events ?? []).find((e) => /birth|born/i.test(e.type));
  const hasDate = !!birth?.date?.match(/\d{4}/);
  const writer = canEdit(membership.role);
  const base = `/tree/${currentTreeId}`;
  const recordHref = me ? `${base}?person=${encodeURIComponent(me.id)}` : base;

  const steps = [
    { key: "join", label: "Join the tree", done: true, href: base },
    { key: "photo", label: "Add a photograph", done: hasPhoto, href: recordHref },
    { key: "dates", label: "Confirm your dates", done: hasDate, href: recordHref },
    // Add who's missing is a write action — a reader is offered three steps (a8).
    ...(writer
      ? [{ key: "who", label: "Add who's missing", done: false, href: `${base}/members` }]
      : []),
  ];
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const firstUndone = steps.findIndex((s) => !s.done);

  // Every offered step done → the checklist is finished; show nothing (a9).
  if (dismissed || doneCount === total) return null;

  return (
    <div className="rail-checklist" aria-label="Getting started">
      <div className="rail-checklist-head">
        <span className="eyebrow">Getting started</span>
        <span className="rail-checklist-count">
          {doneCount} / {total}
        </span>
      </div>
      <ul className="rail-checklist-items">
        {steps.map((s, i) => {
          const mark = s.done
            ? "check-mark check-mark--done"
            : i === firstUndone
              ? "check-mark check-mark--current"
              : "check-mark check-mark--later";
          const rowClass = `rail-checklist-item${s.done ? " done" : i === firstUndone ? " current" : ""}`;
          return (
            <li key={s.key} className={rowClass}>
              <button type="button" onClick={() => router.push(s.href)} disabled={s.done}>
                <span className={mark} aria-hidden="true">
                  {s.done ? "✓" : ""}
                </span>
                <span className="rail-checklist-label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="rail-checklist-record"
        onClick={() => router.push(recordHref)}
      >
        Open my record
      </button>
      <button type="button" className="rail-checklist-dismiss" onClick={() => setDismissed(true)}>
        Hide this
      </button>
    </div>
  );
}
