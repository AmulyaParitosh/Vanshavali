import React, { useMemo, useState } from "react";
import UnifiedSearch from "./UnifiedSearch";
import { Sidebar, SidebarContent } from "./Sidebar";

interface Identified {
  id: string;
}

interface TextListSidebarProps<T extends Identified> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  filterItem: (item: T, query: string) => boolean;
  onSelect: (item: T) => void;
  selectedItem: T | null;
  onAdd?: (() => void) | undefined;
  addButtonLabel?: string;
  canEdit?: boolean;
}

/**
 * Searchable list inside the shared <Sidebar> primitive — used in /people and
 * /family. Active-item styling matches the rest of the sidebar treatment via
 * the `active` class on the `<li>`.
 */
export default function TextListSidebar<T extends Identified>({
  items,
  renderItem,
  filterItem,
  onSelect,
  selectedItem,
  onAdd,
  addButtonLabel = "Add New",
  canEdit = false,
}: TextListSidebarProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(
    () => items.filter((item) => filterItem(item, searchQuery)),
    [items, searchQuery, filterItem]
  );

  return (
    <Sidebar
      footer={
        canEdit && onAdd ? (
          <button type="button" className="btn btn-primary btn-block" onClick={onAdd}>
            {addButtonLabel}
          </button>
        ) : null
      }
    >
      <div className="sidebar-search">
        <UnifiedSearch onSearch={setSearchQuery} placeholder="Search..." />
      </div>
      <SidebarContent>
        <ul className="data-list">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item);
                }
              }}
              tabIndex={0}
              role="button"
              className={selectedItem?.id === item.id ? "active" : ""}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      </SidebarContent>
    </Sidebar>
  );
}
