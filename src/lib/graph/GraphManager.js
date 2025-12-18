export class GraphManager {
  constructor(people, families) {
    this.people = people || [];
    this.families = families || [];
    this.personMap = new Map(this.people.map(p => [p.id, p]));
    this.familyMap = new Map(this.families.map(f => [f.id, f]));
  }

  getPerson(id) {
    return this.personMap.get(id);
  }

  getAllPeople() {
    return this.people;
  }

  getAllFamilies() {
    return this.families;
  }

  getFamily(id) {
    return this.familyMap.get(id);
  }

  /**
   * Get all ancestors of a person.
   * @param {string} id - Person ID
   * @returns {Array<Person>}
   */
  getAncestors(id) {
    const ancestors = new Set();
    const queue = [id];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find families where this person is a child
      const parentFamilies = this.families.filter(
        (f) => f.children && f.children.includes(currentId)
      );

      parentFamilies.forEach((family) => {
        if (family.partners) {
          family.partners.forEach((parentId) => {
            if (!ancestors.has(parentId)) {
              ancestors.add(parentId);
              queue.push(parentId);
            }
          });
        }
      });
    }

    return Array.from(ancestors).map((id) => this.getPerson(id)).filter(Boolean);
  }

  /**
   * Get all descendants of a person.
   * @param {string} id - Person ID
   * @returns {Array<Person>}
   */
  getDescendants(id) {
    const descendants = new Set();
    const queue = [id];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find families where this person is a partner
      const familiesAsPartner = this.families.filter(
        (f) => f.partners && f.partners.includes(currentId)
      );

      familiesAsPartner.forEach((family) => {
        if (family.children) {
          family.children.forEach((childId) => {
            if (!descendants.has(childId)) {
              descendants.add(childId);
              queue.push(childId);
            }
          });
        }
      });
    }

    return Array.from(descendants).map((id) => this.getPerson(id)).filter(Boolean);
  }

  /**
   * Find the shortest path between two people in the graph.
   * Uses BFS to find the path.
   * @param {string} startId
   * @param {string} endId
   * @returns {Array<{personId: string, relation: string}>} Array describing the steps
   */
  findPath(startId, endId) {
    if (startId === endId) return [{ personId: startId, relation: "Self" }];

    // Adjacency List Construction (Lazy or Cached could be better, but building here for simplicity)
    const adj = new Map();

    const addEdge = (u, v, relation) => {
      if (!adj.has(u)) adj.set(u, []);
      adj.get(u).push({ target: v, relation });
    };

    this.families.forEach((family) => {
      // 1. Spouses (Partner <-> Partner)
      if (family.partners && family.partners.length > 1) {
        addEdge(family.partners[0], family.partners[1], "Spouse");
        addEdge(family.partners[1], family.partners[0], "Spouse");
      }

      // 2. Parent -> Child
      if (family.partners && family.children) {
        family.partners.forEach((pId) => {
          family.children.forEach((cId) => {
            addEdge(pId, cId, "Child");
            addEdge(cId, pId, "Parent");
          });
        });
      }
      
      // 3. Siblings (Child <-> Child)
      if (family.children && family.children.length > 1) {
           for (let i = 0; i < family.children.length; i++) {
               for (let j = i + 1; j < family.children.length; j++) {
                   addEdge(family.children[i], family.children[j], "Sibling");
                   addEdge(family.children[j], family.children[i], "Sibling");
               }
           }
      }
    });

    // BFS
    const queue = [[{ personId: startId, relation: "Start" }]];
    const visited = new Set([startId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const lastStep = path[path.length - 1];
      const currentId = lastStep.personId;

      if (currentId === endId) {
        return path;
      }

      const neighbors = adj.get(currentId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.target)) {
          visited.add(neighbor.target);
          const newPath = [...path, { personId: neighbor.target, relation: neighbor.relation }];
          queue.push(newPath);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Builds the hierarchy object required by D3.js tree layout.
   * This logic replaces the inline buildHierarchy in FamilyTree.js
   */
  buildHierarchy() {
    if (this.people.length === 0 || this.families.length === 0) return null;

    const hierarchyMap = {};

    // 1. Create Partner Nodes for all families
    this.families.forEach((family) => {
      const husband = this.getPerson(
        family.partners.find((pId) => this.getPerson(pId)?.sex === "M")
      );
      const wife = this.getPerson(
        family.partners.find((pId) => this.getPerson(pId)?.sex === "F")
      );

      let partnerNode;
      if (husband && wife) {
        partnerNode = {
          id: family.id,
          isPartnerGroup: true,
          husband,
          wife,
          children: [],
        };
      } else {
        // Fallback for single parents
        const primaryParentId = family.partners[0];
        const primaryParent = this.getPerson(primaryParentId);
        if (primaryParent) {
            // Treat as a single person node, but maintain children array structure
            partnerNode = { ...primaryParent, children: [] }; 
        }
      }
      
      if (partnerNode) {
          hierarchyMap[family.id] = partnerNode;
      }
    });

    // 2. Link Children to Families
    this.families.forEach((family) => {
      const familyNode = hierarchyMap[family.id];
      if (familyNode) {
        const childrenIds = family.children || [];
        childrenIds.forEach((childId) => {
          // Check if this child is a partner in another family (continues the tree)
          const childOwnFamily = this.families.find((f) =>
            f.partners.includes(childId)
          );

          if (childOwnFamily && hierarchyMap[childOwnFamily.id]) {
            // Link to the child's family node
            familyNode.children.push(hierarchyMap[childOwnFamily.id]);
          } else {
            // Child is a leaf node
            const childPerson = this.getPerson(childId);
            if (childPerson) {
              familyNode.children.push({ ...childPerson, children: [] });
            }
          }
        });
      }
    });

    // 3. Find Root
    const rootPerson = this.people.find((p) => p.root === true);
    if (!rootPerson) return null;

    const rootFamily = this.families.find((f) => f.partners.includes(rootPerson.id));
    
    // If root person belongs to a family as a partner, return that family node
    if (rootFamily && hierarchyMap[rootFamily.id]) {
        return hierarchyMap[rootFamily.id];
    }
    
    // Otherwise return just the person (e.g. tree with 1 person)
    return { ...rootPerson, children: [] };
  }
}
