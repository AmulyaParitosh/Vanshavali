"use client";

import React from "react";
import { useAppContext } from "../../../context/AppContext";
import Loading from "../../../components/Loading";
import CreateTreeForm from "../../../components/CreateTreeForm";

/**
 * Create a tree (Spec 03 /trees/new) — the create panel as its own route, opened
 * from the picker's "Start another tree" card. No shell chrome switcher/search
 * here (handled in Header for /trees*).
 */
export default function NewTreePage() {
  const { user } = useAppContext();
  if (!user) return <Loading />;
  return (
    <div className="picker">
      <div className="create-panel">
        <header className="picker-head">
          <h1>Start another tree</h1>
          <p className="picker-sub">
            One name is a tree. Everything else can arrive later, a relative at a time.
          </p>
        </header>
        <CreateTreeForm />
      </div>
    </div>
  );
}
