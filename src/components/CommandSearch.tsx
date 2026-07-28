"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { portraitTint, personInitials } from "../utils/portrait";

/**
 * The ⌘K search palette (§5) — one index over people, places and events,
 * grouped and keyboard-first, opened from anywhere. Selecting a person or an
 * event opens that record on the tree (via ?person=), reusing the inspector.
 */
export default function CommandSearch() {
  const { treeData, currentTreeId } = useAppContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const people = useMemo(() => treeData?.people ?? [], [treeData]);
  const q = query.trim().toLowerCase();

  const { peopleHits, placeHits, eventHits } = useMemo(() => {
    const ppl = people.filter(
      (p) =>
        q === "" ||
        [p.name.official_name, ...(p.name.aliases ?? [])].join(" ").toLowerCase().includes(q)
    );
    const events: { personId: string; primary: string; sub: string }[] = [];
    const placeCounts = new Map<string, number>();
    for (const p of people) {
      for (const e of p.events ?? []) {
        if (e.place) placeCounts.set(e.place, (placeCounts.get(e.place) ?? 0) + 1);
        if (q && `${e.type} ${e.date ?? ""} ${e.place ?? ""}`.toLowerCase().includes(q)) {
          events.push({
            personId: p.id,
            primary: `${e.type} · ${p.name.official_name}`,
            sub: [e.date, e.place].filter(Boolean).join(" · "),
          });
        }
      }
    }
    const places = q
      ? [...placeCounts.entries()]
          .filter(([place]) => place.toLowerCase().includes(q))
          .map(([place, count]) => ({ place, count }))
      : [];
    return { peopleHits: ppl, placeHits: places, eventHits: events };
  }, [people, q]);

  // People and events are keyboard-navigable and open a record; places are
  // informational. The active index runs [people…, events…].
  const navTargets = useMemo(
    () => [...peopleHits.map((p) => p.id), ...eventHits.map((e) => e.personId)],
    [peopleHits, eventHits]
  );

  const openPerson = (personId: string) => {
    if (currentTreeId) router.push(`/tree/${currentTreeId}?person=${encodeURIComponent(personId)}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, navTargets.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = navTargets[active];
      if (target) openPerson(target);
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk-scrim" onClick={() => setOpen(false)}>
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search the tree"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search people, places, events"
            aria-label="Search people, places and events"
          />
          <span className="cmdk-esc">esc</span>
        </div>

        <div className="cmdk-results">
          {peopleHits.length > 0 && <div className="cmdk-group">People · {peopleHits.length}</div>}
          {peopleHits.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`cmdk-row${active === i ? " active" : ""}`}
              onClick={() => openPerson(p.id)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="cmdk-avatar" style={{ background: portraitTint(p.id) }}>
                {personInitials(p.name.official_name)}
              </span>
              <span className="cmdk-row-body">
                <span className="cmdk-row-primary">{p.name.official_name}</span>
                {p.name.aliases && p.name.aliases.length > 0 && (
                  <span className="cmdk-row-sub">{p.name.aliases.join(" · ")}</span>
                )}
              </span>
            </button>
          ))}

          {placeHits.length > 0 && (
            <>
              <div className="cmdk-sep" />
              <div className="cmdk-group">Places · {placeHits.length}</div>
            </>
          )}
          {placeHits.map((pl) => (
            <div key={pl.place} className="cmdk-row cmdk-row--static">
              <span className="cmdk-glyph" aria-hidden="true">
                ⌖
              </span>
              <span className="cmdk-row-body">
                <span className="cmdk-row-primary">{pl.place}</span>
                <span className="cmdk-row-sub">
                  {pl.count} event{pl.count === 1 ? "" : "s"} recorded here
                </span>
              </span>
            </div>
          ))}

          {eventHits.length > 0 && (
            <>
              <div className="cmdk-sep" />
              <div className="cmdk-group">Events · {eventHits.length}</div>
            </>
          )}
          {eventHits.map((e, i) => {
            const idx = peopleHits.length + i;
            return (
              <button
                key={`${e.personId}-${e.primary}-${i}`}
                type="button"
                className={`cmdk-row${active === idx ? " active" : ""}`}
                onClick={() => openPerson(e.personId)}
                onMouseEnter={() => setActive(idx)}
              >
                <span className="cmdk-glyph cmdk-glyph--event" aria-hidden="true">
                  ❀
                </span>
                <span className="cmdk-row-body">
                  <span className="cmdk-row-primary">{e.primary}</span>
                  <span className="cmdk-row-sub">{e.sub}</span>
                </span>
              </button>
            );
          })}

          {q && peopleHits.length === 0 && placeHits.length === 0 && eventHits.length === 0 && (
            <div className="cmdk-empty">Nothing matches “{query}”.</div>
          )}
        </div>

        <div className="cmdk-foot">
          <span>↑↓ move</span>
          <span>↵ open record</span>
          <span style={{ flex: 1 }} />
          <span>{people.length} people indexed</span>
        </div>
      </div>
    </div>
  );
}
