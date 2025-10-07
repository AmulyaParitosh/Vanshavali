'use client';
import React from 'react';
import FamilyTree from '../components/FamilyTree';

export default function Page({ treeData }) {
  return (
    <FamilyTree
      people={treeData?.people || []}
      families={treeData?.families || []}
    />
  );
}
