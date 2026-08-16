"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { TreeData } from "../services/types";
import { canEdit } from "../lib/access";
import { formatError } from "../lib/formatError";
import { withRefresh } from "../services/withRefresh";
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
export function useAuthAndData(routeTreeId: string | null = null) {
  const { auth: authProvider, data: rawDataProvider, storage: storageProvider } = useProviders();

  // No live updates: mutations bump a nonce that every subscribe* hook depends
  // on, so the user's own writes trigger a re-fetch. The wrapped provider does
  // the bumping automatically for every mutating method.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const bumpRefresh = useCallback(() => setRefreshNonce((n) => n + 1), []);
  const dataProvider = useMemo(
    () => withRefresh(rawDataProvider, bumpRefresh),
    [rawDataProvider, bumpRefresh]
  );

  const { user, isLoaded: authLoaded } = useAuthUser(authProvider);
  const {
    profile,
    isLoaded: profileLoaded,
    refresh: refreshProfile,
  } = useUserProfile(user, dataProvider);
  const { myTrees, isLoaded: myTreesLoaded } = useMyTrees(
    user?.uid ?? null,
    dataProvider,
    refreshNonce
  );

  // Seeded from the URL when we're already on a tree route. The `[id]` layout
  // binds this too, but it can only do so in an effect after its first render —
  // which meant the membership and data fetches waited for a round trip they
  // never needed, since the id was sitting in the address bar the whole time.
  const [currentTreeId, setCurrentTreeId] = useState<string | null>(routeTreeId);
  const [isProvisioningTree, setIsProvisioningTree] = useState(false);
  // One-shot latch guarding auto-provision against re-entry. A ref (not state)
  // so setting it never re-runs the effect below — the previous state-based
  // guard cancelled its own in-flight work the moment it flipped.
  const hasProvisionedRef = useRef(false);

  // Auto-select the user's first owned tree as the active one. On /tree/[id]
  // routes the layout overrides this from the URL param — including trees the
  // user is a *member* of but doesn't own, so accessibility here must span both
  // lists. (Checking only `owned` bounced a member off a tree they'd deep-linked
  // to: the layout re-bound it from the URL, this reset it, and the two thrashed
  // forever on a "Loading" screen — QUESTIONS Q15.)
  useEffect(() => {
    if (!myTreesLoaded || !myTrees) return;
    const accessible = [...myTrees.owned, ...myTrees.member];
    if (!currentTreeId && myTrees.owned.length > 0) {
      setCurrentTreeId(myTrees.owned[0]!.id);
    } else if (currentTreeId && accessible.every((t) => t.id !== currentTreeId)) {
      // Active tree is no longer accessible (deleted, role revoked). Pick another,
      // preferring an owned tree, then any membership.
      setCurrentTreeId(myTrees.owned[0]?.id ?? myTrees.member[0]?.id ?? null);
    }
  }, [myTrees, myTreesLoaded, currentTreeId]);

  // First-sign-in: if the user has zero owned trees AND zero memberships,
  // provision a tree with themselves as owner + root person.
  useEffect(() => {
    if (!user || !profile || !myTreesLoaded || !myTrees) return;
    if (myTrees.owned.length > 0 || myTrees.member.length > 0) return;
    if (hasProvisionedRef.current) return;

    // Latch synchronously so a concurrent effect run can't provision twice.
    hasProvisionedRef.current = true;
    let cancelled = false;
    setIsProvisioningTree(true);
    (async () => {
      try {
        // createTree now seeds the keeper's root person + link in the same
        // transaction (Spec 03 f4), so first-run provisioning is one call —
        // no separate saveTreeData/linkUserToPerson (which would collide with
        // the root the service just created).
        const meta = await dataProvider.createTree(user.uid, `${profile.name || "My"} family tree`);
        if (!cancelled) setCurrentTreeId(meta.id);
      } catch (error) {
        // Failed before completion — release the latch so a later run can retry.
        hasProvisionedRef.current = false;
        console.error("Auto-provision tree failed:", formatError(error));
        toast.error("Couldn't create your tree. Try refreshing.");
      } finally {
        if (!cancelled) setIsProvisioningTree(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile, myTrees, myTreesLoaded, dataProvider]);

  const { membership, isLoaded: membershipLoaded } = useTreeMembership(
    currentTreeId,
    user?.uid ?? null,
    dataProvider,
    refreshNonce
  );
  // Fetched alongside the membership rather than after it. Waiting for the role
  // first made two round trips out of one, and bought nothing: the route itself
  // authorises the read (`requireView`), so a viewer who shouldn't see this tree
  // gets a 403 whatever the client believed.
  const { treeData } = useTreeSubscription(currentTreeId, dataProvider, refreshNonce);

  // The gate covers identity and access — who you are, and whether this tree is
  // yours to see. It deliberately does NOT cover the tree's contents: blocking
  // on those held the whole app behind the largest fetch it makes, and (because
  // the gate swaps the page out for a spinner) remounted every page the moment
  // the data arrived, making each of them fetch twice. Pages render with
  // `treeData` still null and say so themselves.
  const isLoading =
    !authLoaded ||
    (!!user && !profileLoaded) ||
    (!!user && !myTreesLoaded) ||
    (!!user && isProvisioningTree) ||
    (!!user && !!currentTreeId && !membershipLoaded);

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
    handleLogout,
    onSave: handleSaveData,
    refreshProfile,
    refreshNonce,
    auth: authProvider,
    data: dataProvider,
    storage: storageProvider,
  };
}
