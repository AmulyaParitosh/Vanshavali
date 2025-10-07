"use client";
import React from "react";
import EditPeople from "../../components/EditPeople";
import { useAppContext } from "../../context/AppContext";

export default function Page() {
  const { treeData, user, onSave } = useAppContext();
  return (
    <EditPeople
      treeData={treeData}
      onSave={onSave}
      canEdit={user?.role === "admin" || user?.role === "editor"}
    />
  );
}
