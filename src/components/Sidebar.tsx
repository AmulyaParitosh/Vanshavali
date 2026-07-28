import React from "react";

interface SidebarProps {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, className = "", footer }) => {
  return (
    <aside className={`sidebar ${className}`}>
      {children}
      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  );
};

export const SidebarContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return <div className={`sidebar-content ${className}`}>{children}</div>;
};
