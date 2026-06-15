import { GraphManager } from './GraphManager';
import type { ConsistencyIssue } from '../../types/graph';
import { familyPartners } from '../family';

export class ConsistencyValidator {
  /**
   * Run all validation checks against the tree.
   */
  static validate(graphManager: GraphManager): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const people = graphManager.getAllPeople();
    const families = graphManager.getAllFamilies();

    // 1. Phantom IDs — families referencing nonexistent people.
    families.forEach((family) => {
      familyPartners(family).forEach((partnerId) => {
        if (!graphManager.getPerson(partnerId)) {
          issues.push({
            type: "error",
            message: `Family ${family.id} references missing partner: ${partnerId}`,
            entityId: family.id,
          });
        }
      });

      if (family.children) {
        family.children.forEach((childId) => {
          if (!graphManager.getPerson(childId)) {
            issues.push({
              type: "error",
              message: `Family ${family.id} references missing child: ${childId}`,
              entityId: family.id,
            });
          }
        });
      }
    });

    // 2. Missing gender — hierarchy logic falls back unpredictably without it.
    people.forEach((person) => {
      if (!person.sex) {
        issues.push({
          type: "warning",
          message: `Person ${person.name?.official_name || person.id} has no sex defined. Defaulting behavior may occur.`,
          entityId: person.id,
        });
      }
    });

    // 3. Circular: a person appearing as both partner and child of the same family.
    families.forEach((family) => {
      const partners = familyPartners(family);
      const children = family.children || [];
      const intersection = partners.filter((p) => children.includes(p));
      if (intersection.length > 0) {
        issues.push({
          type: "error",
          message: `Circular relationship detected in family ${family.id}: Person ${intersection.join(", ")} is both a partner and a child.`,
          entityId: family.id,
        });
      }
    });

    // 4. Root invariant: at most one Person.root === true per tree. Under
    // multi-tenancy this is enforced at the schema level (partial unique index);
    // until then this surfaces accidental double-roots from manual edits or
    // botched imports.
    const roots = people.filter((p) => p.root === true);
    if (roots.length > 1) {
      issues.push({
        type: "error",
        message: `Multiple root persons detected (${roots
          .map((p) => p.id)
          .join(", ")}). Exactly one person should have root: true.`,
      });
    }

    return issues;
  }
}
