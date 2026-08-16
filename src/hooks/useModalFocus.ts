"use client";

import { useEffect, useRef } from "react";

/**
 * The one modal-focus behaviour (§R9): a surface that claims `aria-modal` must
 * take focus when it opens, keep Tab inside itself while it's open, close on
 * Escape, and hand focus back to whatever opened it. Written once so the four
 * guards/dialogs and the ⌘K panel can't each implement a different half of it.
 *
 * Returns the ref to put on the modal element.
 *
 * ```tsx
 * const ref = useModalFocus<HTMLDivElement>(onCancel);
 * return <div ref={ref} role="dialog" aria-modal="true">…</div>;
 * ```
 */
export function useModalFocus<T extends HTMLElement>(onClose?: () => void) {
  const ref = useRef<T>(null);
  // Keep the latest handler without re-running the effect (and so re-stealing focus).
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const opener = document.activeElement as HTMLElement | null;

    const focusable = (): HTMLElement[] =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Focus the first control, or the surface itself if it has none yet.
    const first = focusable()[0];
    if (first) first.focus();
    else {
      node.setAttribute("tabindex", "-1");
      node.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      const active = document.activeElement;
      // Wrap at both ends so Tab can never leave the modal.
      if (e.shiftKey && (active === firstItem || active === node)) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      // Hand focus back to whatever opened this.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return ref;
}
