"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import Loading from "../../components/Loading";
import { isOwner, canEdit } from "../../lib/access";
import { portraitTint, personInitials } from "../../utils/portrait";
import CreateTreeForm from "../../components/CreateTreeForm";
import type { TreeCardSummary, TreeRole } from "../../types/tree";

/**
 * My trees (Spec 03) — the picker. Which face renders is decided by a count:
 * exactly one tree skips straight in (a1); two or more show the picker; zero
 * shows the create state. One ordered list (role lives in each card's meta line,
 * a5), with the "Start another tree" card last. The chrome on this route has no
 * switcher and no search (a4, handled in Header).
 */

/** The viewer's role stated in words, never the raw role value (a5). */
function roleWords(role: TreeRole): string {
  if (isOwner(role)) return "kept by you";
  if (canEdit(role)) return "you may add and correct";
  return "read only";
}

function TreeCard({ card }: { card: TreeCardSummary }) {
  const meta = [
    `${card.personCount} ${card.personCount === 1 ? "person" : "people"}`,
    card.place,
    roleWords(card.role),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={`/tree/${card.id}`} className="picker-card">
      <span className="picker-card-name">{card.name}</span>
      <span className="picker-portraits" aria-hidden="true">
        {card.portraits.map((p) => (
          <span key={p.id} className="picker-portrait" style={{ background: portraitTint(p.id) }}>
            {personInitials(p.name)}
          </span>
        ))}
      </span>
      <span className="picker-card-meta">{meta}</span>
    </Link>
  );
}

export default function MyTreesPage() {
  const { user, dataProvider } = useAppContext();
  const router = useRouter();
  const [cards, setCards] = useState<TreeCardSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void dataProvider.listMyTreeCards().then((t) => {
      if (live) setCards(t);
    });
    return () => {
      live = false;
    };
  }, [user, dataProvider]);

  // Exactly one tree → never see the picker (a1); go straight in.
  useEffect(() => {
    if (cards && cards.length === 1) router.replace(`/tree/${cards[0]!.id}`);
  }, [cards, router]);

  if (!user || cards === null) {
    return (
      <div className="picker">
        <div className="picker-skeleton" />
        <div className="picker-skeleton" />
      </div>
    );
  }

  if (cards.length === 1) return <Loading />; // redirect in flight

  if (cards.length === 0) {
    // Empty state (s2) — the create panel is inline, never behind a button (a2).
    return (
      <div className="picker">
        <div className="create-panel">
          <header className="picker-head">
            <h1>Start your family&apos;s record</h1>
            <p className="picker-sub">
              One name is a tree. Everything else can arrive later, a relative at a time.
            </p>
          </header>
          <CreateTreeForm />
        </div>
      </div>
    );
  }

  return (
    <div className="picker">
      <header className="picker-head">
        <h1>Your family records</h1>
        <p className="picker-sub">Open one, or start another.</p>
      </header>
      <div className="picker-grid">
        {cards.map((card) => (
          <TreeCard key={card.id} card={card} />
        ))}
        <Link href="/trees/new" className="picker-card picker-card--new">
          <span className="picker-new-plus" aria-hidden="true">
            +
          </span>
          <span className="picker-new-label">Start another tree</span>
        </Link>
      </div>
    </div>
  );
}
