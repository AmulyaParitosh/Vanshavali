import type { Person } from '../../types/person';
import type { Family } from '../../types/family';
import type { GraphNode, PathStep } from '../../types/graph';
import { familyPartners, inferHusbandWife } from '../family';

export class GraphManager {
  private people: Person[];
  private families: Family[];
  private personMap: Map<string, Person>;
  private familyMap: Map<string, Family>;

  constructor(people: Person[], families: Family[]) {
    this.people = people || [];
    this.families = families || [];
    this.personMap = new Map(this.people.map(p => [p.id, p]));
    this.familyMap = new Map(this.families.map(f => [f.id, f]));
  }

  getPerson(id: string): Person | undefined {
    return this.personMap.get(id);
  }

  getAllPeople(): Person[] {
    return this.people;
  }

  getAllFamilies(): Family[] {
    return this.families;
  }

  getFamily(id: string): Family | undefined {
    return this.familyMap.get(id);
  }

  /**
   * Get all ancestors of a person.
   * @param {string} id - Person ID
   * @returns {Array<Person>}
   */
  getAncestors(id: string): Person[] {
    const ancestors = new Set<string>();
    const queue = [id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find families where this person is a child
      const parentFamilies = this.families.filter(
        (f) => f.children && f.children.includes(currentId)
      );

      parentFamilies.forEach((family) => {
        familyPartners(family).forEach((parentId) => {
          if (!ancestors.has(parentId)) {
            ancestors.add(parentId);
            queue.push(parentId);
          }
        });
      });
    }

    return Array.from(ancestors).map((id) => this.getPerson(id)).filter((p): p is Person => !!p);
  }

  /**
   * Get all descendants of a person.
   * @param {string} id - Person ID
   * @returns {Array<Person>}
   */
  getDescendants(id: string): Person[] {
    const descendants = new Set<string>();
    const queue = [id];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find families where this person is a partner (husband, wife, or legacy partners)
      const familiesAsPartner = this.families.filter((f) =>
        familyPartners(f).includes(currentId)
      );

      familiesAsPartner.forEach((family) => {
        if (family.children) {
          family.children.forEach((childId: string) => {
            if (!descendants.has(childId)) {
              descendants.add(childId);
              queue.push(childId);
            }
          });
        }
      });
    }

    return Array.from(descendants).map((id) => this.getPerson(id)).filter((p): p is Person => !!p);
  }

  /**
   * Find the shortest path between two people in the graph.
   * Uses BFS to find the path.
   * @param {string} startId
   * @param {string} endId
   * @returns {Array<{personId: string, relation: string}>} Array describing the steps
   */
  findPath(startId: string, endId: string): PathStep[] | null {
    if (startId === endId) return [{ personId: startId, relation: "Self" }];

    // Adjacency List Construction (Lazy or Cached could be better, but building here for simplicity)
    const adj = new Map<string, Array<{ target: string, relation: string }>>();

    const addEdge = (u: string, v: string, relation: string) => {
      if (!adj.has(u)) adj.set(u, []);
      adj.get(u)!.push({ target: v, relation });
    };

    this.families.forEach((family) => {
      const partners = familyPartners(family);

      // 1. Spouses — all pairs, not just the first two (the legacy code missed
      // edges when a family had 3+ entries via legacy `partners[]`).
      for (let i = 0; i < partners.length; i++) {
        for (let j = i + 1; j < partners.length; j++) {
          const p1 = partners[i]!;
          const p2 = partners[j]!;
          addEdge(p1, p2, "Spouse");
          addEdge(p2, p1, "Spouse");
        }
      }

      // 2. Parent -> Child
      if (partners.length > 0 && family.children) {
        partners.forEach((pId) => {
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
            const child1 = family.children[i];
            const child2 = family.children[j];
            if (child1 && child2) {
              addEdge(child1, child2, "Sibling");
              addEdge(child2, child1, "Sibling");
            }
          }
        }
      }
    });

    // BFS
    const queue: PathStep[][] = [[{ personId: startId, relation: "Start" }]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) continue;
      const lastStep = path[path.length - 1];
      if (!lastStep) continue;
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
  buildHierarchy(): GraphNode | null {
    // A tree with only a root person (no families yet) is valid; render a single
    // node. Only bail out when there are no people at all.
    if (this.people.length === 0) return null;

    const hierarchyMap: Record<string, GraphNode> = {};

    // 1. Create Partner Nodes for all families
    this.families.forEach((family) => {
      const { husbandId, wifeId } = inferHusbandWife(family, (id) =>
        this.getPerson(id)?.sex
      );

      const husband = husbandId ? this.getPerson(husbandId) : undefined;
      const wife = wifeId ? this.getPerson(wifeId) : undefined;

      let partnerNode: GraphNode | undefined;
      
      if (husband && wife) {
        partnerNode = {
          id: family.id,
          name: { official_name: `${husband.name.official_name} & ${wife.name.official_name}` }, // Dummy name for group
          sex: 'M', // Dummy sex
          isPartnerGroup: true,
          husband,
          wife,
          children: [],
        };
      } else {
        // Fallback for single parents
        const primaryParentId = familyPartners(family)[0];
        const primaryParent = primaryParentId ? this.getPerson(primaryParentId) : undefined;
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
        childrenIds.forEach((childId: string) => {
          // Check if this child is a partner in another family (continues the tree)
          const childOwnFamily = this.families.find((f) =>
            familyPartners(f).includes(childId)
          );

          if (childOwnFamily && hierarchyMap[childOwnFamily.id]) {
            // Link to the child's family node
            const childNode = hierarchyMap[childOwnFamily.id]!;
            childNode.lineageMemberId = childId;
            familyNode.children.push(childNode);
          } else {
            // Child is a leaf node
            const childPerson = this.getPerson(childId);
            if (childPerson) {
              const leafNode: GraphNode = { ...childPerson, children: [], lineageMemberId: childPerson.id };
              familyNode.children.push(leafNode);
            }
          }
        });
      }
    });

    // 3. Find Root
    const rootPerson = this.people.find((p) => p.root === true);
    if (!rootPerson) return null;

    const rootFamily = this.families.find((f) =>
      familyPartners(f).includes(rootPerson.id)
    );
    
    // If root person belongs to a family as a partner, return that family node
    if (rootFamily && hierarchyMap[rootFamily.id]) {
        const rootNode = hierarchyMap[rootFamily.id]!;
        rootNode.lineageMemberId = rootPerson.id;
        return rootNode;
    }
    
    // Otherwise return just the person
    const rootNode: GraphNode = { ...rootPerson, children: [], lineageMemberId: rootPerson.id };
    return rootNode;
  }
}
