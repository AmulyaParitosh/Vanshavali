"use client";

import React from "react";

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
  return (
    <div
      className={`segmented${className ? ` ${className}` : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`segmented-option${value === opt.value ? " selected" : ""}`}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
