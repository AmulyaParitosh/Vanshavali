import React, { useState } from 'react';

interface TextListSidebarProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  filterItem: (item: T, query: string) => boolean;
  onSelect: (item: T) => void;
  selectedItem: T | null;
  onAdd?: (() => void) | undefined;
  addButtonLabel?: string;
  canEdit?: boolean;
}

export default function TextListSidebar<T>({
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

  const filteredItems = items.filter((item) => filterItem(item, searchQuery));

  return (
    <aside className="sidebar">
       <div className="sidebar-search">
            <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#333'
            }}
            />
        </div>
      <div className="sidebar-content">
        <ul className="data-list">
          {filteredItems.map((item, index) => (
             // We can't use item.id here because T is generic. 
             // We'll trust the caller to make sure renderItem is clickable or wrap it.
             // Actually, the existing implementation puts the onClick on the li. 
             // We need a way to key these items. 
             // Let's assume items have an 'id' property or use index as fallback, 
             // BUT simpler generic approach: we render the LI here.
            <li
              key={(item as any).id || index}
              onClick={() => onSelect(item)}
              className={selectedItem && (item as any).id === (selectedItem as any).id ? "active" : ""}
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
