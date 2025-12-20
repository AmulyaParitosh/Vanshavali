import React from 'react';
import UserSidebar from '../../components/UserSidebar';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="user-layout">
      <UserSidebar />
      <div className="user-content">
        {children}
      </div>
    </div>
  );
}
