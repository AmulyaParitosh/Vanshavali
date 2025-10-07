"use client";
import React from "react";
import EditFamily from "../../components/EditFamily";
import { useAppContext } from "../../context/AppContext";

export default function Page() {
  const { treeData, user, onSave } = useAppContext();
  return (
    <EditFamily
      treeData={treeData}
      onSave={onSave}
      canEdit={user?.role === "admin" || user?.role === "editor"}
    />
  );
}
