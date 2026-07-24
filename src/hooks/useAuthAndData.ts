"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { TreeData } from "../services/types";
import type { TreeMembership } from "../types/tree";
import { canEdit, canViewTree } from "../lib/access";
import { formatError } from "../lib/formatError";
import { useProviders } from "./useProviders";
import { useAuthUser } from "./useAuthUser";
import { useUserProfile } from "./useUserProfile";
import { useMyTrees } from "./useMyTrees";
import { useTreeMembership } from "./useTreeMembership";
import { useTreeSubscription } from "./useTreeSubscription";

/**
 * Top-level app data hook. Composes the multi-tenant pieces:
 *
 *   useProviders         → backend implementations
 *   useAuthUser          → AuthUser
 *   useUserProfile       → name / email / photo (no role anymore)
 *   useMyTrees           → owned + invited trees
 *   useTreeMembership    → role + personId for the active tree
 *   useTreeSubscription  → live people / families for the active tree
 *
 * Auto-creates a first tree on sign-in when the user has none. Selects the
 * user's first owned tree as the active tree until the UI lets them choose.
 */
export function useAuthAndData() {
  const { auth: authProvider, data: dataProvider, storage: storageProvider } = useProviders();

  const { user, isLoaded: authLoaded } = useAuthUser(authProvider);
  const {
    profile,
    isLoaded: profileLoaded,
    refresh: refreshProfile,
  } = useUserProfile(user, dataProvider);
  const { myTrees, isLoaded: myTreesLoaded } = useMyTrees(user?.uid ?? null, dataProvider);

  const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
  const [isProvisioningTree, setIsProvisioningTree] = useState(false);

  // Auto-select the user's first owned tree as the active one. Once Phase 9
  // lands real routing, currentTreeId will come from the URL instead.
  useEffect(() => {
    if (!myTreesLoaded || !myTrees) return;
    if (!currentTreeId && myTrees.owned.length > 0) {
      setCurrentTreeId(myTrees.owned[0]!.id);
    } else if (currentTreeId && myTrees.owned.every((t) => t.id !== currentTreeId)) {
      // Active tree is no longer accessible (deleted, role revoked). Pick another.
      setCurrentTreeId(myTrees.owned[0]?.id ?? null);
    }
  }, [myTrees, myTreesLoaded, currentTreeId]);

  // First-sign-in: if the user has zero owned trees AND zero memberships,
  // provision a tree with themselves as owner + root person.
  useEffect(() => {
    if (!user || !profile || !myTreesLoaded || !myTrees) return;
    if (myTrees.owned.length > 0 || myTrees.member.length > 0) return;
    if (isProvisioningTree) return;

    let cancelled = false;
    setIsProvisioningTree(true);
    (async () => {
      try {
        const meta = await dataProvider.createTree(user.uid, `${profile.name || "My"} family tree`);
        if (cancelled) return;

        // Seed a single root person representing the user themselves. We leave
        // userId unset here and let linkUserToPerson set it, because that call
        // also populates the membership's personId — doing both in one atomic
        // step. (linkUserToPerson requires the person's user_id to still be
        // null, so we must NOT pre-set it above.)
        const rootPersonId = `p_${user.uid}`;
        const rootPerson = {
          id: rootPersonId,
          name: { official_name: profile.name || "Me" },
          sex: "M" as const,
          events: [],
          custom_fields: {},
          root: true,
        };
        await dataProvider.saveTreeData(meta.id, {
          people: [rootPerson],
          families: [],
        });
        if (cancelled) return;

        // Link owner → root person so the tree view knows "this node is me"
        // and the membership carries personId. Non-fatal: if it fails, the
        // tree still exists and the user can link manually from their profile.
        try {
          await dataProvider.linkUserToPerson(meta.id, rootPersonId, user.uid);
        } catch (linkError) {
          console.error(
            "Auto-link owner to root person failed (non-fatal):",
            formatError(linkError)
          );
        }
        if (cancelled) return;
        setCurrentTreeId(meta.id);
      } catch (error) {
        console.error("Auto-provision tree failed:", formatError(error));
        toast.error("Couldn't create your tree. Try refreshing.");
      } finally {
        if (!cancelled) setIsProvisioningTree(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile, myTrees, myTreesLoaded, isProvisioningTree, dataProvider]);

  const { membership, isLoaded: membershipLoaded } = useTreeMembership(
    currentTreeId,
    user?.uid ?? null,
    dataProvider
  );
  const { treeData, isLoaded: treeLoaded } = useTreeSubscription(
    canViewTree(membership?.role) ? currentTreeId : null,
    dataProvider
  );

  const isLoading =
    !authLoaded ||
    (!!user && !profileLoaded) ||
    (!!user && !myTreesLoaded) ||
    (!!user && isProvisioningTree) ||
    (!!user && !!currentTreeId && !membershipLoaded) ||
    (!!user && !!currentTreeId && canViewTree(membership?.role) && !treeLoaded);

  const handleLogin = useCallback(() => {
    authProvider.signInWithGoogle().catch((error: unknown) => {
      console.error("Auth error:", error);
      const message = error instanceof Error ? error.message : "Sign-in failed";
      toast.error(message);
    });
  }, [authProvider]);

  const handleLogout = useCallback(() => {
    authProvider.signOut().catch((error: unknown) => {
      console.error("Sign out error:", error);
      const message = error instanceof Error ? error.message : "Sign-out failed";
      toast.error(message);
    });
  }, [authProvider]);

  const handleSaveData = useCallback(
    (newData: TreeData): Promise<void> => {
      if (!currentTreeId) {
        return Promise.reject(new Error("No active tree."));
      }
      if (!canEdit(membership?.role)) {
        return Promise.reject(new Error("Permission Denied"));
      }
      return dataProvider.saveTreeData(currentTreeId, newData);
    },
    [currentTreeId, membership?.role, dataProvider]
  );

  return {
    user,
    profile,
    myTrees,
    currentTreeId,
    setCurrentTreeId,
    membership,
    treeData,
    isLoading,
    handleLogin,
    handleLogout,
    onSave: handleSaveData,
    refreshProfile,
    auth: authProvider,
    data: dataProvider,
    storage: storageProvider,
  };
}

// Re-export the membership type so consumers don't have to dig into types/tree.
export type { TreeMembership };
