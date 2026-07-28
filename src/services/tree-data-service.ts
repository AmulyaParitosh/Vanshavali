import type { TreeData } from "./types";
import { getPool, transaction } from "../repositories/db";
import { PersonRepository } from "../repositories/PersonRepository";
import { FamilyRepository } from "../repositories/FamilyRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { requireView, requireEdit } from "./authz";
import { HttpError } from "../lib/api";

/**
 * Business logic for a tree's people + families. Every entry point authorizes
 * first (the pg connection bypasses RLS), then delegates to the repositories.
 * saveTreeData runs the whole diff in one transaction — an improvement over the
 * old client path, which issued the upserts and deletes as separate requests.
 */

export async function getTreeData(treeId: string, uid: string): Promise<TreeData> {
  await requireView(treeId, uid);
  const db = getPool();
  const people = await PersonRepository.listByTree(db, treeId);
  const families = await FamilyRepository.listByTree(db, treeId);
  return { people, families };
}

export async function saveTreeData(treeId: string, uid: string, data: TreeData): Promise<void> {
  await requireEdit(treeId, uid);
  await transaction(async (tx) => {
    // A single pg client runs statements sequentially — no Promise.all on `tx`.
    const existingPeopleIds = await PersonRepository.listIdsByTree(tx, treeId);
    const existingFamilyIds = await FamilyRepository.listIdsByTree(tx, treeId);

    const peopleToDelete = existingPeopleIds.filter((id) => !data.people.some((p) => p.id === id));
    const familiesToDelete = existingFamilyIds.filter(
      (id) => !data.families.some((f) => f.id === id)
    );

    // People before families: a family row FKs husband_id/wife_id to people.
    for (const person of data.people) {
      await PersonRepository.upsert(tx, treeId, person);
    }
    for (const family of data.families) {
      await FamilyRepository.upsert(tx, treeId, family);
    }
    await PersonRepository.deleteByIds(tx, treeId, peopleToDelete);
    await FamilyRepository.deleteByIds(tx, treeId, familiesToDelete);
  });
}

export async function linkUserToPerson(
  treeId: string,
  personId: string,
  uid: string
): Promise<void> {
  // Any member may link themselves to a person in a tree they belong to; the
  // atomic user_id-null check is what prevents claiming someone else's node.
  await requireView(treeId, uid);
  await transaction(async (tx) => {
    const linked = await PersonRepository.linkUser(tx, treeId, personId, uid);
    if (!linked) {
      throw new HttpError("Person not found or already linked to another user.", 409);
    }
    await MembershipRepository.setPersonId(tx, treeId, uid, personId);
  });
}
