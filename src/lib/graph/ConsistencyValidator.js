export class ConsistencyValidator {
  /**
   * Run all validation checks.
   * @param {GraphManager} graphManager
   * @returns {Array<{type: 'error'|'warning', message: string, entityId?: string}>}
   */
  static validate(graphManager) {
    const issues = [];
    const people = graphManager.getAllPeople();
    const families = graphManager.getAllFamilies();

    // 1. Check for missing family members (Phantom IDs)
    families.forEach((family) => {
      if (family.partners) {
        family.partners.forEach((partnerId) => {
          if (!graphManager.getPerson(partnerId)) {
            issues.push({
              type: "error",
              message: `Family ${family.id} references missing partner: ${partnerId}`,
              entityId: family.id,
            });
          }
        });
      }
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
        const children = family.children || [];
        
        const intersection = partners.filter(p => children.includes(p));
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
