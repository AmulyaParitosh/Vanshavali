"use client";

import React, { useRef } from "react";
import { useWindowedRows } from "../../hooks/useWindowedRows";

export interface RecordsColumn {
  key: string;
  /** Header label; omit for the leading portrait column. */
  label?: string;
  /** Width/flex class shared by the header cell and the matching row cell. */
  className?: string;
}

interface RecordsTableProps<T> {
  columns: RecordsColumn[];
  /** The rows' data — NOT rendered rows. See the note on windowing below. */
  items: readonly T[];
  /** Stable identity for a row. */
  rowKey: (item: T) => string;
  /**
   * Render one row. Called only for rows that are actually on screen, and given
   * the row's index in the FULL list — the row must put that on itself as
   * `aria-rowindex={index + 1}`, and must carry a `data-row` attribute (see the
   * note about measurement below).
   */
  renderRow: (item: T, index: number) => React.ReactNode;
  /** Shown in place of the rows when there are none. */
  empty: React.ReactNode;
  /** Row height used before a real row has been measured (see useWindowedRows). */
  estimatedRowHeight?: number;
  /** Accessible name for the list. */
  ariaLabel: string;
}

/**
 * The shared table structure for Members and Households. One paper card, one
 * sticky column header, and the rows. Every column header renders in the same
 * font (`.records-thead span` in globals.css) — a column's className only
 * carries its width, never its type — so the headers can't drift between pages.
 *
 * It takes `items` + `renderRow` rather than rendered children on purpose. A
 * component can only skip work it was never handed: given children, the caller
 * has already built every row's element tree before this component gets a say,
 * and windowing would save the DOM but not the React. Given the data and a
 * render function, a 2,000-row list builds about twenty rows.
 *
 * Rows that are scrolled away are replaced by two spacers of exactly their
 * height, so the scrollbar and every scroll position are unchanged. Because the
 * DOM no longer holds the whole list, the container states its true length
 * (`aria-rowcount`) and every row its true position (`aria-rowindex`) — without
 * those, assistive tech would report "20 rows" for a tree of two thousand.
 */
export default function RecordsTable<T>({
  columns,
  items,
  rowKey,
  renderRow,
  empty,
  estimatedRowHeight = 61,
  ariaLabel,
}: RecordsTableProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const { start, end, padTop, padBottom } = useWindowedRows(items.length, {
    listRef,
    estimatedRowHeight,
  });

  const slice: React.ReactNode[] = [];
  for (let i = start; i < end; i += 1) {
    const item = items[i];
    if (item === undefined) continue;
    // A keyed Fragment, not a wrapper element: the rows are direct children of
    // the list, and an extra div between them would break the row borders and
    // the height the windowing maths depends on.
    slice.push(<React.Fragment key={rowKey(item)}>{renderRow(item, i)}</React.Fragment>);
  }

  return (
    <div className="records-table" role="grid" aria-label={ariaLabel} aria-rowcount={items.length}>
      <div className="records-thead" role="row">
        {columns.map((c) => (
          <span key={c.key} className={c.className} role="columnheader">
            {c.label ?? ""}
          </span>
        ))}
      </div>
      <div ref={listRef} className="records-body">
        {items.length === 0 ? (
          empty
        ) : (
          <>
            {padTop > 0 && <div style={{ height: padTop }} aria-hidden="true" />}
            {slice}
            {padBottom > 0 && <div style={{ height: padBottom }} aria-hidden="true" />}
          </>
        )}
      </div>
    </div>
  );
}
