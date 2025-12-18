'use client';
import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from '../context/AppContext';
import Tree from '../components/Tree';
import { GraphManager } from "../lib/graph/GraphManager";
import { ConsistencyValidator } from "../lib/graph/ConsistencyValidator";
import type { ConsistencyIssue } from "../types/graph";

export default function HomePage() {
  const { treeData } = useAppContext();
  const [graphManager, setGraphManager] = useState<GraphManager | null>(null);
  const [validationIssues, setValidationIssues] = useState<ConsistencyIssue[]>([]);

  const people = treeData?.people || [];
  const families = treeData?.families || [];

  useEffect(() => {
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

  const hierarchy = useMemo(() => {
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
}
