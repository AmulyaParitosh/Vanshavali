import type { Person } from "../../types/person";
import type { Family } from "../../types/family";
import type { GraphNode, PathStep } from "../../types/graph";
import { familyPartners, inferHusbandWife } from "../family";

/** One edge out of a person: who it leads to, and what they are to them. */
interface Neighbour {
  target: string;
  relation: string;
}

/** How a person was first reached during a search. */
interface Reached {
  from: string;
  relation: string;
}

export class GraphManager {
  private people: Person[];
  private families: Family[];
  private personMap: Map<string, Person>;
  /** Built on first use by getAdjacency(); see the note there on why caching is safe. */
  private adjacency: Map<string, Neighbour[]> | null = null;

  constructor(people: Person[], families: Family[]) {
    this.people = people || [];
    this.families = families || [];
    this.personMap = new Map(this.people.map((p) => [p.id, p]));
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

    return Array.from(ancestors)
      .map((id) => this.getPerson(id))
      .filter((p): p is Person => !!p);
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

      // Find families where this person is a partner (husband or wife)
      const familiesAsPartner = this.families.filter((f) => familyPartners(f).includes(currentId));

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

    return Array.from(descendants)
      .map((id) => this.getPerson(id))
      .filter((p): p is Person => !!p);
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
    return this.reconstruct(startId, endId, this.search(startId, endId));
  }

  /**
   * The shortest path from one person to **everyone** reachable, in a single
   * traversal.
   *
   * Naming every row's relation used to mean one `findPath` per row, and each of
   * those rebuilt the whole adjacency list before it started walking — quadratic
   * twice over, and the reason a 2,000-person Members list took over a second to
   * re-render on every keystroke. The graph is the same for all of them, so walk
   * it once.
   */
  pathsFrom(startId: string): Map<string, PathStep[]> {
    const cameFrom = this.search(startId);
    const paths = new Map<string, PathStep[]>();
    for (const id of cameFrom.keys()) {
      const path = this.reconstruct(startId, id, cameFrom);
      if (path) paths.set(id, path);
    }
    return paths;
  }

  /**
   * The kinship graph as a neighbour list, built once and kept.
   *
   * Safe to cache because a GraphManager is immutable by construction: callers
   * build a new one when the tree's people or families change (every consumer
   * does so from a `useMemo` over exactly those two arrays).
   */
  private getAdjacency(): Map<string, Neighbour[]> {
    if (this.adjacency) return this.adjacency;
    const adj = new Map<string, Neighbour[]>();

    const addEdge = (u: string, v: string, relation: string) => {
      const list = adj.get(u);
      if (list) list.push({ target: v, relation });
      else adj.set(u, [{ target: v, relation }]);
    };

    for (const family of this.families) {
      const partners = familyPartners(family);

      // 1. Spouses — pairwise over the partner list.
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
        for (const pId of partners) {
          for (const cId of family.children) {
            addEdge(pId, cId, "Child");
            addEdge(cId, pId, "Parent");
          }
        }
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
    }

    this.adjacency = adj;
    return adj;
  }

  /**
   * Breadth-first from `startId`, recording how each person was first reached.
   *
   * Parent pointers rather than whole paths: carrying a copied array per queue
   * entry made the search allocate O(V × depth) arrays to answer a question
   * about one of them. The queue is an array read by a moving head index, not
   * `shift()`, which re-indexes the whole queue on every step.
   */
  private search(startId: string, stopAt?: string): Map<string, Reached> {
    const adj = this.getAdjacency();
    const cameFrom = new Map<string, Reached>();
    const seen = new Set<string>([startId]);
    const queue: string[] = [startId];

    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]!;
      if (current === stopAt) break;
      for (const neighbour of adj.get(current) ?? []) {
        if (seen.has(neighbour.target)) continue;
        seen.add(neighbour.target);
        cameFrom.set(neighbour.target, { from: current, relation: neighbour.relation });
        queue.push(neighbour.target);
      }
    }
    return cameFrom;
  }

  /** Walk the parent pointers back from `endId` to build the path forwards. */
  private reconstruct(
    startId: string,
    endId: string,
    cameFrom: Map<string, Reached>
  ): PathStep[] | null {
    if (endId === startId) return [{ personId: startId, relation: "Start" }];
    if (!cameFrom.has(endId)) return null;
    const steps: PathStep[] = [];
    let id = endId;
    while (id !== startId) {
      const link = cameFrom.get(id);
      if (!link) return null; // unreachable in practice; a broken chain, not a path
      steps.push({ personId: id, relation: link.relation });
      id = link.from;
    }
    steps.push({ personId: startId, relation: "Start" });
    return steps.reverse();
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
      const { husbandId, wifeId } = inferHusbandWife(family);

      const husband = husbandId ? this.getPerson(husbandId) : undefined;
      const wife = wifeId ? this.getPerson(wifeId) : undefined;

      let partnerNode: GraphNode | undefined;

      if (husband && wife) {
        partnerNode = {
          id: family.id,
          name: { official_name: `${husband.name.official_name} & ${wife.name.official_name}` }, // Dummy name for group
          sex: "M", // Dummy sex
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
          const childOwnFamily = this.families.find((f) => familyPartners(f).includes(childId));

          if (childOwnFamily && hierarchyMap[childOwnFamily.id]) {
            // Link to the child's family node
            const childNode = hierarchyMap[childOwnFamily.id]!;
            childNode.lineageMemberId = childId;
            familyNode.children.push(childNode);
          } else {
            // Child is a leaf node
            const childPerson = this.getPerson(childId);
            if (childPerson) {
              const leafNode: GraphNode = {
                ...childPerson,
                children: [],
                lineageMemberId: childPerson.id,
              };
              familyNode.children.push(leafNode);
            }
          }
        });
      }
    });

    // 3. Find Root
    const rootPerson = this.people.find((p) => p.root === true);
    if (!rootPerson) return null;

    const rootFamily = this.families.find((f) => familyPartners(f).includes(rootPerson.id));

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
