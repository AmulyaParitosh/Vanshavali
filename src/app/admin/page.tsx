'use client';
import React from 'react';
import AdminDashboard from '../../components/AdminDashboard';
import { useAppContext } from '../../context/AppContext';

export default function Page() {
  const { user } = useAppContext();
  return (
    <AdminDashboard user={user} />
  );
}
