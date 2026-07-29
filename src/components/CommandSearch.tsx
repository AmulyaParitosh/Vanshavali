"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import { portraitTint, personInitials } from "../utils/portrait";
import { GraphManager } from "../lib/graph/GraphManager";
import { describeRelation } from "../lib/lineage";
import { generationMap, roman } from "../lib/generations";
import type { Person } from "../types/person";

/** Result caps (Spec 09 §02): headers show the true total, lists show at most these. */
const CAP = { people: 6, places: 3, events: 4 } as const;

/** A person's search sub-line: "born Patna, 1989 · generation III" (Spec 09). */
function personSub(p: Person, gen: number | undefined): string {
  const birth = (p.events ?? []).find((e) => /birth|born/i.test(e.type));
  const year = birth?.date?.match(/\d{4}/)?.[0];
  const bornStr = birth ? `born ${[birth.place, year].filter(Boolean).join(", ")}` : null;
  const genStr = gen !== undefined ? `generation ${roman(gen)}` : null;
  return [bornStr, genStr].filter(Boolean).join(" · ");
}

/** Coarse event kind for the place counts line (Spec 09 §03). */
function eventKind(type: string): "birth" | "marriage" | "death" | "other" {
  if (/birth|born/i.test(type)) return "birth";
  if (/marriage|married|wed/i.test(type)) return "marriage";
  if (/death|died|passed|expired/i.test(type)) return "death";
  return "other";
}

interface PlaceCount {
  births: number;
  marriages: number;
  deaths: number;
  total: number;
}

/** "7 births · 2 marriages · 1 death recorded here" — broken out by kind (Spec 09). */
function placeCountsLine(c: PlaceCount): string {
  const parts: string[] = [];
  if (c.births) parts.push(`${c.births} birth${c.births === 1 ? "" : "s"}`);
  if (c.marriages) parts.push(`${c.marriages} marriage${c.marriages === 1 ? "" : "s"}`);
  if (c.deaths) parts.push(`${c.deaths} death${c.deaths === 1 ? "" : "s"}`);
  if (!parts.length) return `${c.total} event${c.total === 1 ? "" : "s"} recorded here`;
  return `${parts.join(" · ")} recorded here`;
}

/** Whether a keyboard event landed in an editable control (so `/` shouldn't hijack it). */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * The ⌘K search palette (Spec 09) — one index over people, places and events,
 * grouped and keyboard-first, opened from anywhere in a tree. Selecting a person
 * or event opens that record on the tree (via ?person=), reusing the inspector.
 */
export default function CommandSearch() {
  const { treeData, currentTreeId, user } = useAppContext();
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
      } else if (e.key === "/" && !isEditableTarget(e.target)) {
        // `/` opens search when no field is focused (a1 / e5 — never one trigger).
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("vanshavali:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("vanshavali:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const people = useMemo(() => treeData?.people ?? [], [treeData]);
  const families = useMemo(() => treeData?.families ?? [], [treeData]);
  const gm = useMemo(() => new GraphManager(people, families), [people, families]);
  const gens = useMemo(() => generationMap(people, families), [people, families]);
  const viewerPersonId = useMemo(
    () => people.find((p) => !!user && p.userId === user.uid)?.id ?? null,
    [people, user]
  );
  const q = query.trim().toLowerCase();

  // Every person result carries their relation to the viewer (a3); null (or self) → no label.
  const relationOf = (personId: string): string | null =>
    viewerPersonId === personId
      ? "you"
      : viewerPersonId
        ? describeRelation(viewerPersonId, personId, gm)
        : null;

  const { peopleHits, placeHits, eventHits } = useMemo(() => {
    // The empty state suggests nothing (a9) — no query, no results.
    const ppl = q
      ? people.filter((p) =>
          [p.name.official_name, ...(p.name.aliases ?? [])].join(" ").toLowerCase().includes(q)
        )
      : [];
    const events: { personId: string; primary: string; sub: string }[] = [];
    const placeCounts = new Map<string, PlaceCount>();
    for (const p of people) {
      for (const e of p.events ?? []) {
        if (e.place) {
          const c = placeCounts.get(e.place) ?? { births: 0, marriages: 0, deaths: 0, total: 0 };
          const kind = eventKind(e.type);
          if (kind === "birth") c.births += 1;
          else if (kind === "marriage") c.marriages += 1;
          else if (kind === "death") c.deaths += 1;
          c.total += 1;
          placeCounts.set(e.place, c);
        }
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
          .map(([place, counts]) => ({ place, line: placeCountsLine(counts) }))
      : [];
    return { peopleHits: ppl, placeHits: places, eventHits: events };
  }, [people, q]);

  // Only the capped rows are on screen and keyboard-navigable; headers still show
  // the true total. People and events open a record; places filter the canvas (S-C).
  const shownPeople = peopleHits.slice(0, CAP.people);
  const shownPlaces = placeHits.slice(0, CAP.places);
  const shownEvents = eventHits.slice(0, CAP.events);

  const navTargets = useMemo(
    () => [...shownPeople.map((p) => p.id), ...shownEvents.map((e) => e.personId)],
    [shownPeople, shownEvents]
  );

  const openPerson = (personId: string) => {
    if (currentTreeId) router.push(`/tree/${currentTreeId}?person=${encodeURIComponent(personId)}`);
    setOpen(false);
  };

  const seeAllInMembers = () => {
    if (currentTreeId)
      router.push(`/tree/${currentTreeId}/members?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  // A place filters the canvas (a6), it never opens a page: push ?place= onto the
  // canvas route and let the tree dim everyone not connected to it.
  const openPlace = (place: string) => {
    if (currentTreeId) router.push(`/tree/${currentTreeId}?place=${encodeURIComponent(place)}`);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = navTargets.length - 1;
    if (navTargets.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a >= last ? 0 : a + 1)); // wraps at the end (a5)
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? last : a - 1)); // wraps at the start (a5)
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(last);
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
            placeholder="People, places, events"
            aria-label="Search people, places and events"
          />
          <span className="cmdk-esc">esc</span>
        </div>

        <div className="cmdk-results">
          {peopleHits.length > 0 && <div className="cmdk-group">People · {peopleHits.length}</div>}
          {shownPeople.map((p, i) => (
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
                {personSub(p, gens.get(p.id)) && (
                  <span className="cmdk-row-sub">{personSub(p, gens.get(p.id))}</span>
                )}
              </span>
              {relationOf(p.id) && <span className="cmdk-row-relation">{relationOf(p.id)}</span>}
            </button>
          ))}
          {peopleHits.length > CAP.people && (
            <button type="button" className="cmdk-more" onClick={seeAllInMembers}>
              {peopleHits.length - CAP.people} more people — see all in Members
            </button>
          )}

          {placeHits.length > 0 && (
            <>
              <div className="cmdk-sep" />
              <div className="cmdk-group">Places · {placeHits.length}</div>
            </>
          )}
          {shownPlaces.map((pl) => (
            <button
              key={pl.place}
              type="button"
              className="cmdk-row cmdk-row--place"
              onClick={() => openPlace(pl.place)}
            >
              <span className="cmdk-glyph" aria-hidden="true">
                ⌖
              </span>
              <span className="cmdk-row-body">
                <span className="cmdk-row-primary">{pl.place}</span>
                <span className="cmdk-row-sub">{pl.line}</span>
              </span>
            </button>
          ))}

          {eventHits.length > 0 && (
            <>
              <div className="cmdk-sep" />
              <div className="cmdk-group">Events · {eventHits.length}</div>
            </>
          )}
          {shownEvents.map((e, i) => {
            const idx = shownPeople.length + i;
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
            <div className="cmdk-empty">Nothing in this record matches “{query}”</div>
          )}
        </div>

        <div className="cmdk-foot">
          <span>↑↓ move · ↵ open record · ⌘↵ focus in tree</span>
          <span style={{ flex: 1 }} />
          <span>{people.length} people indexed</span>
        </div>
      </div>
    </div>
  );
}
