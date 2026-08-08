"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import CommandSearch, { type PersonPickerOptions } from "../components/CommandSearch";

/**
 * App-wide person picker. Every "pick a person" surface (add-member anchor,
 * household partners/children, "link me to my record") opens the SAME ⌘K overlay
 * in picker mode through `openPicker`, so the picking experience is identical
 * everywhere. Mounted high enough (in `AppProvider`) that any authenticated page
 * can reach it; the overlay itself renders only while a request is active.
 */
interface PersonPickerContextValue {
  openPicker: (options: PersonPickerOptions) => void;
}

const PersonPickerContext = createContext<PersonPickerContextValue | null>(null);

export function usePersonPicker(): PersonPickerContextValue {
  const ctx = useContext(PersonPickerContext);
  if (!ctx) throw new Error("usePersonPicker must be used within a PersonPickerProvider");
  return ctx;
}

export default function PersonPickerProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<PersonPickerOptions | null>(null);

  const openPicker = useCallback((options: PersonPickerOptions) => setRequest(options), []);
  const close = useCallback(() => setRequest(null), []);

  const value = useMemo<PersonPickerContextValue>(() => ({ openPicker }), [openPicker]);
  // Wrap the caller's onPick so a choice always dismisses the overlay too.
  const picker = useMemo(() => (request ? { ...request, onClose: close } : null), [request, close]);

  return (
    <PersonPickerContext.Provider value={value}>
      {children}
      {picker && <CommandSearch picker={picker} />}
    </PersonPickerContext.Provider>
  );
}
