"use client";
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import Tree from "../../../components/Tree";
import WelcomeModal from "../../../components/onboarding/WelcomeModal";
import EmptyTreeBanner from "../../../components/onboarding/EmptyTreeBanner";
import { GraphManager } from "../../../lib/graph/GraphManager";
import { ConsistencyValidator } from "../../../lib/graph/ConsistencyValidator";

import { UI_CONFIG } from "../../../constants";

export default function TreeViewPage() {
  const { treeData, membership, currentTreeId, user, profile } = useAppContext();
  const router = useRouter();

  // Nudge a member to link themselves to a person — but only if they aren't
  // represented in the tree at all. The owner of an auto-provisioned tree IS
  // the root person (person.userId === their uid) even before the realtime
  // membership row's personId syncs, so keying only off membership.personId
  // would bounce the owner out of their own tree on every visit.
  useEffect(() => {
    if (!treeData || !membership) return;
    const linkedViaMembership = !!membership.personId;
    const linkedViaPerson = !!user && treeData.people.some((p) => p.userId === user.uid);
    if (!linkedViaMembership && !linkedViaPerson) {
      router.push("/user/profile");
    }
  }, [treeData, membership, user, router]);

  const people = treeData?.people || [];
  const families = treeData?.families || [];

  const graphManager = useMemo(() => new GraphManager(people, families), [people, families]);
  const validationIssues = useMemo(
    () => ConsistencyValidator.validate(graphManager),
    [graphManager]
  );
  const hierarchy = useMemo(() => graphManager.buildHierarchy(), [graphManager]);

  // First-time experience signals: tree has just the user.
  const isFirstSession =
    !!treeData && people.length === 1 && !!user && people[0]?.userId === user.uid;

  return (
    <div id="tree-container" data-tree-id={currentTreeId ?? undefined}>
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

      {currentTreeId && (
        <>
          <WelcomeModal
            displayName={profile?.name ?? user?.displayName ?? null}
            treeId={currentTreeId}
            shouldShow={isFirstSession}
          />
          {isFirstSession && <EmptyTreeBanner treeId={currentTreeId} />}
        </>
      )}
    </div>
  );
}
