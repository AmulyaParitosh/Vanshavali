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

/** Picker mode shows at most this many people (the overlay scrolls past it). */
const PICKER_CAP = 50;

/**
 * Picker-mode options (the shared person-picker API — see `PersonPickerProvider`).
 * A picker reuses the ⌘K overlay chrome but shows only people, optionally filtered,
 * and hands the chosen id back through `onPick` instead of routing.
 */
export interface PersonPickerOptions {
  /** Accessible heading for the dialog; also the placeholder fallback. */
  title?: string;
  /** Input placeholder; defaults to the title, then "Search people". */
  placeholder?: string;
  /** Restrict to one sex (partner pickers). */
  filterSex?: "M" | "F";
  /** People to omit (e.g. the couple + existing children). */
  excludeIds?: string[];
  /** Hide people already linked to an account (the "link me" flow). */
  hideLinked?: boolean;
  /** The already-chosen person, marked current on open. */
  selectedPersonId?: string | null;
  /** Called with the chosen person's id; the overlay closes itself after. */
  onPick: (personId: string) => void;
}

/** The picker prop CommandSearch receives — the options plus a close callback. */
type PickerMode = PersonPickerOptions & { onClose: () => void };

interface CommandSearchProps {
  /**
   * When set, the palette runs in picker mode instead of the ⌘K navigate
   * singleton: people-only, filtered, and a choice calls back rather than
   * routing. Absent (the default) → the global navigate palette.
   */
  picker?: PickerMode | undefined;
}

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

/**
 * Diacritic-insensitive fold for matching (Spec 09 §07): lower-case and strip
 * combining marks. Precomposed accents map 1:1 to their base letter, so folded
 * indices still line up with the original string for highlighting.
 */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Render `text` with the folded query `q` highlighted where it occurs (§07). */
function Highlight({ text, q }: { text: string; q: string }): React.ReactElement {
  const i = q ? fold(text).indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="cmdk-highlight">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
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
 *
 * The same overlay doubles as the app-wide person picker: given a `picker` prop
 * it runs people-only + filtered and calls back on a choice (see
 * `PersonPickerProvider`), so every "pick a person" surface shares this chrome.
 */
export default function CommandSearch({ picker }: CommandSearchProps = {}) {
  const { treeData, currentTreeId, user } = useAppContext();
  const router = useRouter();
  const isPicker = picker != null;
  // A picker instance is rendered only while active, so it starts open; the
  // navigate singleton opens on ⌘K / `/` / the open-search event.
  const [open, setOpen] = useState(isPicker);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Global triggers belong to the navigate singleton only; a picker is opened
    // imperatively through the picker context, never by ⌘K / `/`.
    if (isPicker) return undefined;
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
  }, [isPicker]);

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
  const q = fold(query.trim());

  // Every person result carries their relation to the viewer (a3); null (or self) → no label.
  const relationOf = (personId: string): string | null =>
    viewerPersonId === personId
      ? "you"
      : viewerPersonId
        ? describeRelation(viewerPersonId, personId, gm)
        : null;

  const { peopleHits, placeHits, eventHits } = useMemo(() => {
    // Navigate index only; a picker computes its own people list below.
    if (isPicker) return { peopleHits: [], placeHits: [], eventHits: [] };
    // The empty state suggests nothing (a9) — no query, no results.
    const ppl = q
      ? people.filter((p) =>
          fold([p.name.official_name, ...(p.name.aliases ?? [])].join(" ")).includes(q)
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
        if (q && fold(`${e.type} ${e.date ?? ""} ${e.place ?? ""}`).includes(q)) {
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
          .filter(([place]) => fold(place).includes(q))
          .map(([place, counts]) => ({ place, line: placeCountsLine(counts) }))
      : [];
    return { peopleHits: ppl, placeHits: places, eventHits: events };
  }, [people, q, isPicker]);

  // Picker index (people only, filtered). Unlike navigate, an empty query lists
  // everyone eligible so the user can browse — the old dropdown did the same.
  const pickerHits = useMemo(() => {
    if (!picker) return [];
    const base = people.filter((p) => {
      if (picker.filterSex && p.sex !== picker.filterSex) return false;
      if (picker.excludeIds?.includes(p.id)) return false;
      if (picker.hideLinked && p.userId) return false;
      return true;
    });
    return q
      ? base.filter((p) =>
          fold([p.name.official_name, ...(p.name.aliases ?? [])].join(" ")).includes(q)
        )
      : base;
  }, [picker, people, q]);

  // Only the capped rows are on screen and keyboard-navigable; headers still show
  // the true total. People and events open a record; places filter the canvas (S-C).
  const shownPeople = peopleHits.slice(0, CAP.people);
  const shownPlaces = placeHits.slice(0, CAP.places);
  const shownEvents = eventHits.slice(0, CAP.events);
  const shownPicker = pickerHits.slice(0, PICKER_CAP);

  const navTargets = useMemo(
    () =>
      isPicker
        ? shownPicker.map((p) => p.id)
        : [...shownPeople.map((p) => p.id), ...shownEvents.map((e) => e.personId)],
    [isPicker, shownPicker, shownPeople, shownEvents]
  );

  const close = () => {
    if (picker) picker.onClose();
    else setOpen(false);
  };

  const openPerson = (personId: string) => {
    if (currentTreeId) router.push(`/tree/${currentTreeId}?person=${encodeURIComponent(personId)}`);
    setOpen(false);
  };

  // In picker mode a choice hands the id back and closes; it never routes.
  const activate = (personId: string) => {
    if (picker) {
      picker.onPick(personId);
      picker.onClose();
    } else {
      openPerson(personId);
    }
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
    // The picker has no global Escape listener; close it from the field instead.
    if (isPicker && e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
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
      if (target) activate(target);
    }
  };

  if (!open) return null;

  // One overlay, two modes. The scrim/panel/input chrome is shared verbatim so
  // the picker looks identical to ⌘K; only the results list and the foot differ.
  const placeholder = picker
    ? (picker.placeholder ?? picker.title ?? "Search people")
    : "People, places, events";
  const dialogLabel = picker
    ? (picker.title ?? picker.placeholder ?? "Choose a person")
    : "Search the tree";
  const inputLabel = picker ? placeholder : "Search people, places and events";

  return (
    <div className="cmdk-scrim" onClick={close}>
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
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
            placeholder={placeholder}
            aria-label={inputLabel}
          />
          <span className="cmdk-esc">esc</span>
        </div>

        {/* Picker mode: people-only, filtered, and a choice calls back. */}
        {picker ? (
          <div className="cmdk-results">
            {shownPicker.length > 0 && (
              <div className="eyebrow cmdk-group">People · {pickerHits.length}</div>
            )}
            {shownPicker.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`cmdk-row${active === i ? " active" : ""}`}
                aria-current={p.id === picker.selectedPersonId ? true : undefined}
                onClick={() => activate(p.id)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="cmdk-avatar" style={{ background: portraitTint(p.id) }}>
                  {personInitials(p.name.official_name)}
                </span>
                <span className="cmdk-row-body">
                  <span className="cmdk-row-primary">
                    <Highlight text={p.name.official_name} q={q} />
                  </span>
                  {personSub(p, gens.get(p.id)) && (
                    <span className="cmdk-row-sub">{personSub(p, gens.get(p.id))}</span>
                  )}
                </span>
                {relationOf(p.id) && <span className="cmdk-row-relation">{relationOf(p.id)}</span>}
              </button>
            ))}
            {shownPicker.length === 0 && (
              <div className="cmdk-empty">
                {q ? `No one matches “${query}”` : "No one to choose from"}
              </div>
            )}
          </div>
        ) : (
          <div className="cmdk-results">
            {peopleHits.length > 0 && (
              <div className="eyebrow cmdk-group">People · {peopleHits.length}</div>
            )}
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
                  <span className="cmdk-row-primary">
                    <Highlight text={p.name.official_name} q={q} />
                  </span>
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
                <div className="eyebrow cmdk-group">Places · {placeHits.length}</div>
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
                  ✧
                </span>
                <span className="cmdk-row-body">
                  <span className="cmdk-row-primary">
                    <Highlight text={pl.place} q={q} />
                  </span>
                  <span className="cmdk-row-sub">{pl.line}</span>
                </span>
              </button>
            ))}

            {eventHits.length > 0 && (
              <>
                <div className="cmdk-sep" />
                <div className="eyebrow cmdk-group">Events · {eventHits.length}</div>
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
        )}

        {picker ? (
          <div className="cmdk-foot">
            <span>↑↓ move · ↵ choose · esc cancel</span>
          </div>
        ) : (
          <div className="cmdk-foot">
            <span>↑↓ move · ↵ open record · ⌘↵ focus in tree</span>
            <span style={{ flex: 1 }} />
            <span>{people.length} people indexed</span>
          </div>
        )}
      </div>
    </div>
  );
}
