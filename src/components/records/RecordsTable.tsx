"use client";

import React from "react";

export interface RecordsColumn {
  key: string;
  /** Header label; omit for the leading portrait column. */
  label?: string;
  /** Width/flex class shared by the header cell and the matching row cell. */
  className?: string;
}

interface RecordsTableProps {
  columns: RecordsColumn[];
  /** The rows, or an empty-state node. */
  children: React.ReactNode;
}

/**
 * The shared table structure for Members and Households. One paper card, one
 * sticky column header, and the rows the caller supplies. Every column header
 * renders in the same font (`.records-thead span` in globals.css) — a column's
 * className only carries its width, never its type — so the headers can't drift
 * between pages the way they had.
 */
export default function RecordsTable({ columns, children }: RecordsTableProps) {
  return (
    <div className="records-table">
      <div className="records-thead" role="row">
        {columns.map((c) => (
          <span key={c.key} className={c.className} role="columnheader">
            {c.label ?? ""}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
