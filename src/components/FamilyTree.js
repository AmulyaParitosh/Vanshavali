import React from "react";
import Tree from "./Tree";

const FamilyTree = ({ people, families }) => {
  // Helper to find a person by their ID
  const findPerson = (id) => people.find((p) => p.id === id);

  const buildHierarchy = () => {
    if (!people || !families) return null;

    const familyMap = {};
    families.forEach((family) => {
      // Create a combined node for partners
      const husband = findPerson(
        family.partners.find((pId) => findPerson(pId)?.sex === "M")
      );
      const wife = findPerson(
        family.partners.find((pId) => findPerson(pId)?.sex === "F")
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
        // Handle single parents or families without clear M/F partners
        const primaryParent = findPerson(family.partners[0]);
        partnerNode = { ...primaryParent, children: [] }; // Treat as a single person node
      }
      familyMap[family.id] = partnerNode;
    });

    // Link children to their families
    families.forEach((family) => {
      const familyNode = familyMap[family.id];
      if (familyNode) {
        const children = family.children || [];
        children.forEach((childId) => {
          // Check if this child is a parent in another family
          const childFamily = families.find((f) =>
            f.partners.includes(childId)
          );
          if (childFamily) {
            familyNode.children.push(familyMap[childFamily.id]);
          } else {
            // Child is a leaf node (for now)
            const childPerson = findPerson(childId);
            if (childPerson) {
              familyNode.children.push({ ...childPerson, children: [] });
            }
          }
        });
      }
    });

    // Find the root of the tree
    const rootPerson = people.find((p) => p.root === true);
    if (!rootPerson) return null;

    const rootFamily = families.find((f) => f.partners.includes(rootPerson.id));
    return rootFamily
      ? familyMap[rootFamily.id]
      : { ...rootPerson, children: [] };
  };

  const hierarchy = buildHierarchy();

  return (
    <div id="tree-container">
      {hierarchy ? <Tree data={hierarchy} /> : "Building hierarchy..."}
    </div>
  );
};

export default FamilyTree;
