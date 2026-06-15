import React, { useMemo, useState } from 'react';
import UnifiedSearch from './UnifiedSearch';

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

  // Memoize — list filtering re-ran on every keystroke before and was an O(n)
  // walk through potentially thousands of people.
  const filteredItems = useMemo(
    () => items.filter((item) => filterItem(item, searchQuery)),
    [items, searchQuery, filterItem]
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <UnifiedSearch
          onSearch={setSearchQuery}
          placeholder="Search..."
        />
      </div>
      <div className="sidebar-content">
        <ul className="data-list">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              onClick={() => onSelect(item)}
              className={selectedItem?.id === item.id ? "active" : ""}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      </div>
      {canEdit && onAdd && (
        <div className="sidebar-actions">
          <button
            className="btn btn-primary btn-block"
            onClick={onAdd}
          >
            {addButtonLabel}
          </button>
        </div>
      )}
    </aside>
  );
}
