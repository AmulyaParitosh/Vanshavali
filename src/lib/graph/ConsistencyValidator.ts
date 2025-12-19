import { GraphManager } from './GraphManager';
import type { ConsistencyIssue } from '../../types/graph';

export class ConsistencyValidator {
  /**
   * Run all validation checks.
   * @param {GraphManager} graphManager
   * @returns {Array<ConsistencyIssue>}
   */
  static validate(graphManager: GraphManager): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    const people = graphManager.getAllPeople();
    const families = graphManager.getAllFamilies();

    // 1. Check for missing family members (Phantom IDs)
    families.forEach((family) => {
      const partners = family.partners || [];
      const familyPartners = [family.husband, family.wife, ...partners].filter((p): p is string => !!p);

      familyPartners.forEach((partnerId: string) => {
        if (!graphManager.getPerson(partnerId)) {
          issues.push({
            type: "error",
            message: `Family ${family.id} references missing partner: ${partnerId}`,
            entityId: family.id,
          });
        }
      });

      if (family.children) {
        family.children.forEach((childId: string) => {
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

    // 2. Check for missing gender (Critical for hierarchy building logic)
    people.forEach((person) => {
      if (!person.sex) {
        issues.push({
          type: "warning",
          message: `Person ${person.name?.official_name || person.id} has no sex defined. Defaulting behavior may occur.`,
          entityId: person.id,
        });
      }
    });

    // 3. Simple Circular Reference Check (Parent is their own Child)
    families.forEach((family) => {
        const partners = family.partners || [];
        const familyPartners = [family.husband, family.wife, ...partners].filter((p): p is string => !!p);
        const children = family.children || [];
        
        const intersection = familyPartners.filter((p: string) => children.includes(p));
        if (intersection.length > 0) {
            issues.push({
                type: "error",
                message: `Circular relationship detected in family ${family.id}: Person ${intersection.join(', ')} is both a partner and a child.`,
                entityId: family.id
            })
        }
    })


    return issues;
  }
}
