"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/AppContext";
import Tree from "../components/Tree";
import { GraphManager } from "../lib/graph/GraphManager";
import { ConsistencyValidator } from "../lib/graph/ConsistencyValidator";

import { UI_CONFIG } from "../constants";
import { useEffect } from "react";

export default function HomePage() {
  const { treeData, membership } = useAppContext();
  const router = useRouter();

  // If the active member has no linked person yet, send them to profile.
  // Triggered only once tree data + membership are both loaded.
  useEffect(() => {
    if (treeData && membership && !membership.personId) {
      router.push("/user/profile");
    }
  }, [treeData, membership, router]);

  const people = treeData?.people || [];
  const families = treeData?.families || [];

  const graphManager = useMemo(() => new GraphManager(people, families), [people, families]);
  const validationIssues = useMemo(
    () => ConsistencyValidator.validate(graphManager),
    [graphManager]
  );
  const hierarchy = useMemo(() => graphManager.buildHierarchy(), [graphManager]);

  return (
    <div id="tree-container">
      {validationIssues.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: UI_CONFIG.COLORS.ERROR_BG_LIGHT,
            padding: "10px",
            fontSize: UI_CONFIG.STYLES?.TEXT?.FONT_SIZE || "10px",
            zIndex: UI_CONFIG.Z_INDEX.OVERLAY,
            pointerEvents: "none",
            borderRadius: "var(--radius-md)",
          }}
        >
          {validationIssues.length} {UI_CONFIG.MESSAGES.DATA_ISSUES_DETECTED}
        </div>
      )}
      {hierarchy ? <Tree data={hierarchy} /> : UI_CONFIG.MESSAGES.BUILDING_HIERARCHY}
    </div>
  );
}
