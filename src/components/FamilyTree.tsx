import React from "react";
import Tree from "./Tree";
import { GraphManager } from "../lib/graph/GraphManager";
import { ConsistencyValidator } from "../lib/graph/ConsistencyValidator";
import type { Person } from "../types/person";
import type { Family } from "../types/family";
import type { ConsistencyIssue } from "../types/graph";

interface FamilyTreeProps {
  people: Person[];
  families: Family[];
}

const FamilyTree: React.FC<FamilyTreeProps> = ({ people, families }) => {
  const [graphManager, setGraphManager] = React.useState<GraphManager | null>(null);
  const [validationIssues, setValidationIssues] = React.useState<ConsistencyIssue[]>([]);

  React.useEffect(() => {
    if (people && families) {
      const gm = new GraphManager(people, families);
      setGraphManager(gm);
      
      const issues = ConsistencyValidator.validate(gm);
      if (issues.length > 0) {
        console.warn("Graph Consistency Issues:", issues);
        setValidationIssues(issues);
      }
    }
  }, [people, families]);

  const hierarchy = React.useMemo(() => {
    return graphManager ? graphManager.buildHierarchy() : null;
  }, [graphManager]);

  return (
    <div id="tree-container">
      {validationIssues.length > 0 && (
         <div style={{
             position: 'absolute', 
             top: 0, 
             right: 0, 
             background: 'rgba(255, 0, 0, 0.1)', 
             padding: '10px', 
             fontSize: '10px',
             zIndex: 1000,
             pointerEvents: 'none'
         }}>
             {validationIssues.length} Data Issues Detect (Check Console)
         </div>
      )}
      {hierarchy ? <Tree data={hierarchy} /> : "Building hierarchy..."}
    </div>
  );
};

export default FamilyTree;
