"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { useTreeCanvas, type Attention } from "../context/TreeCanvasContext";
import { canEdit } from "../lib/access";
import type { Person } from "../types/person";

/** The three "needs attention" lenses (Spec 05 a8) and whether a person has each. */
const ATTENTION: { key: Attention; label: string }[] = [
  { key: "dates", label: "Missing dates" },
  { key: "account", label: "No account linked" },
  { key: "photo", label: "No photograph" },
];
function personNeeds(p: Person, a: Attention): boolean {
  if (a === "dates") return !(p.events ?? []).some((e) => /birth|born/i.test(e.type) && e.date);
  if (a === "account") return !p.userId;
  return !p.image_url;
}

/**
 * The rail's "what's unfinished" zone (Spec 00 §02). While a member is onboarding
 * it is the four-item getting-started checklist (Spec 10): Join is ticked by
 * arriving; the rest link to where the one thing is done, blocking nothing (a2);
 * a reader is offered three steps (a8); it disappears with no congratulation once
 * every offered step is done (a9). Once the checklist is finished (or hidden) the
 * same slot becomes the attention filter (Spec 05 a8): the counts of what the
 * tree still needs, each a toggle that dims the non-matching households on the
 * canvas through the shared canvas context.
 */
export default function GettingStarted() {
  const { currentTreeId, treeData, membership, user } = useAppContext();
  const router = useRouter();
  const canvas = useTreeCanvas();
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

  // Every offered step done → the checklist is finished; the slot becomes the
  // attention filter (Spec 05 a8), or nothing if the tree needs nothing.
  if (dismissed || doneCount === total) {
    const counts = {
      dates: treeData.people.filter((p) => personNeeds(p, "dates")).length,
      account: treeData.people.filter((p) => personNeeds(p, "account")).length,
      photo: treeData.people.filter((p) => personNeeds(p, "photo")).length,
    };
    const rows = ATTENTION.filter(({ key }) => counts[key] > 0);
    // Only on the canvas route (the filter acts on the canvas) and only when
    // something needs attention.
    if (!canvas || rows.length === 0) return null;
    return (
      <div className="rail-attention" role="group" aria-label="Needs attention">
        <span className="eyebrow">Needs attention</span>
        {rows.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`rail-attention-row${canvas.attention === key ? " active" : ""}`}
            aria-pressed={canvas.attention === key}
            onClick={() => canvas.setAttention((cur) => (cur === key ? null : key))}
          >
            <span className="rail-attention-label">{label}</span>
            <span className="rail-attention-count">{counts[key]}</span>
          </button>
        ))}
      </div>
    );
  }

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
