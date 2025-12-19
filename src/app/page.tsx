'use client';
import React, { useState, useEffect, useMemo } from "react";
import { useAppContext } from '../context/AppContext';
import Tree from '../components/Tree';
import { GraphManager } from "../lib/graph/GraphManager";
import { ConsistencyValidator } from "../lib/graph/ConsistencyValidator";
import type { ConsistencyIssue } from "../types/graph";

import { UI_CONFIG } from "../constants";

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
             background: UI_CONFIG.COLORS.ERROR_BG_LIGHT, 
             padding: '10px', 
             fontSize: UI_CONFIG.STYLES?.TEXT?.FONT_SIZE || '10px',
             zIndex: UI_CONFIG.Z_INDEX.OVERLAY,
             pointerEvents: 'none',
             borderRadius: 'var(--border-radius-sm)',
         }}>
             {validationIssues.length} {UI_CONFIG.MESSAGES.DATA_ISSUES_DETECTED}
         </div>
      )}
      {hierarchy ? <Tree data={hierarchy} /> : UI_CONFIG.MESSAGES.BUILDING_HIERARCHY}
    </div>
  );
}
