'use client';
import React from 'react';
import FamilyTree from '../components/FamilyTree';
import { useAppContext } from '../context/AppContext';

export default function Page() {
  const { treeData } = useAppContext();
  return (
    <FamilyTree
      people={treeData?.people || []}
      families={treeData?.families || []}
    />
  );
}
