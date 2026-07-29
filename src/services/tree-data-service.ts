import type { TreeData } from "./types";
import type { Person } from "../types/person";
import { getPool, transaction } from "../repositories/db";
import { PersonRepository } from "../repositories/PersonRepository";
import { FamilyRepository } from "../repositories/FamilyRepository";
import { MembershipRepository } from "../repositories/MembershipRepository";
import { TreeRepository } from "../repositories/TreeRepository";
import { requireView, requireEdit, requireEditOrSelf } from "./authz";
import { projectPeopleForReader } from "../lib/readerDates";
import { HttpError } from "../lib/api";

/**
 * Business logic for a tree's people + families. Every entry point authorizes
 * first (the pg connection bypasses RLS), then delegates to the repositories.
 * saveTreeData runs the whole diff in one transaction — an improvement over the
 * old client path, which issued the upserts and deletes as separate requests.
 */

export async function getTreeData(treeId: string, uid: string): Promise<TreeData> {
  const role = await requireView(treeId, uid);
  const db = getPool();
  const tree = await TreeRepository.findMeta(db, treeId);
  const people = await PersonRepository.listByTree(db, treeId);
  const families = await FamilyRepository.listByTree(db, treeId);
  // Reader date privacy (Spec 11 a4): hide living relatives' exact dates from a
  // reader unless the keeper turned the setting on. Default off = year only.
  const projected = projectPeopleForReader(people, role, tree?.readersSeeDates ?? false, uid);
  return { people: projected, families };
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

/**
 * Save one person with optimistic locking (Spec 13 flow 7). Authorizes the edit
 * (editor/keeper, or the reader's own linked record), then writes only if the
 * caller's `baseVersion` is still current. A stale base throws 409 carrying the
 * fresh stored record so the client can run its three-way merge; the person
 * having vanished throws 404. Returns the freshly-written record on success.
 */
export async function patchPerson(
  treeId: string,
  uid: string,
  personId: string,
  data: Person,
  baseVersion: number
): Promise<Person> {
  const existing = await PersonRepository.find(getPool(), treeId, personId);
  if (!existing) throw new HttpError("That record no longer exists.", 404);
  await requireEditOrSelf(treeId, uid, existing.userId);

  const saved = await PersonRepository.patch(getPool(), treeId, personId, data, baseVersion);
  if (!saved) {
    // The base was stale — hand back what's stored now for the client's merge.
    const current = await PersonRepository.find(getPool(), treeId, personId);
    throw new HttpError("This record was changed while you were editing.", 409, {
      stored: current,
    });
  }
  return saved;
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
