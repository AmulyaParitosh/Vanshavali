"use client";

import React from "react";

interface RecordsScreenProps {
  title: string;
  subtitle?: React.ReactNode;
  /** The single primary action / reader note, right-aligned in the header band. */
  action?: React.ReactNode;
  /** The search field plus any filters — laid out in one row. */
  search?: React.ReactNode;
  /** True while a record/editor drawer is open — the column gives up room so the
   *  fixed drawer never covers the list. */
  inspectorOpen: boolean;
  /** The table, the record drawer, and any panels/dialogs. */
  children: React.ReactNode;
}

/**
 * The shared table-page shell for Members and Households (design consistency).
 * Both pages get the same centred column with its padding/margins, the same
 * header band (title · subtitle · one action), the same search row, and the same
 * right-side drawer behaviour — the page narrows via `.inspector-open` so the
 * fixed record dock opens beside the list rather than over it. One implementation,
 * so the two pages can never drift in padding, margin or panel behaviour again.
 */
export default function RecordsScreen({
  title,
  subtitle,
  action,
  search,
  inspectorOpen,
  children,
}: RecordsScreenProps) {
  return (
    <div className={`records-page${inspectorOpen ? " inspector-open" : ""}`}>
      <header className="records-header">
        <div>
          <h1>{title}</h1>
          {subtitle != null && <div className="records-subtitle">{subtitle}</div>}
        </div>
        <div className="records-header-spacer" />
        {action}
      </header>
      {search != null && <div className="records-searchrow">{search}</div>}
      {children}
    </div>
  );
}
