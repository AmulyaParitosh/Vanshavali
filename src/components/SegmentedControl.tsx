"use client";

import React, { useRef } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  /** The options to choose one of. */
  options: SegmentedOption<T>[];
  /** The currently-selected value. */
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group (e.g. "Sex"). */
  ariaLabel: string;
  disabled?: boolean;
  /** Extra class on the track for a variant (e.g. "conflict-choice"). */
  className?: string;
}

/**
 * Select one of N options — the shared segmented control (§ design system). One
 * quiet track (`.segmented`) with a raised selected segment (`.segmented-option`),
 * as a radiogroup. This is the single implementation of the "pick 1 of N" toggle
 * that was hand-copied across the record editor, add-person, tree settings and the
 * conflict dialog — so they can't drift in look, spacing or a11y again.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  // A radiogroup is one tab stop, and the arrows move within it — otherwise every
  // segment is its own stop and the role promises a pattern it doesn't implement.
  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    const opt = options[next];
    if (!opt) return;
    onChange(opt.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    move(index, step);
  };

  return (
    <div
      ref={groupRef}
      className={`segmented${className ? ` ${className}` : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          className={`segmented-option${value === opt.value ? " selected" : ""}`}
          onClick={() => onChange(opt.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
