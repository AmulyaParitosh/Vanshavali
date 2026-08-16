"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";
import { isSiteAdmin } from "../../../lib/access";
import type { Suggestion, SuggestionStatus } from "../../../types/suggestion";

// Site-level feedback inbox, gated by the NEXT_PUBLIC_SITE_ADMIN_UIDS
// allowlist (see isSiteAdmin). UserSidebar hides the link with the same
// predicate; non-admins who hit the URL directly are bounced home below.

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; bgColor: string }> = {
  unread: {
    label: "Unread",
    color: "var(--color-red-deep)",
    bgColor: "var(--color-red-wash)",
  },
  read: { label: "Read", color: "var(--text-strong)", bgColor: "var(--surface-quiet)" },
  prioritized: {
    label: "Prioritized",
    color: "var(--chip-invited-fg)",
    bgColor: "var(--chip-invited-bg)",
  },
  archived: {
    label: "Archived",
    color: "var(--text-meta)",
    bgColor: "var(--surface-tablehead)",
  },
};

export default function SuggestionsPage() {
  const { user, dataProvider, refreshNonce } = useAppContext();
  const router = useRouter();
  const toast = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<SuggestionStatus | "all">("all");

  useEffect(() => {
    if (user && !isSiteAdmin(user.uid)) {
      router.push("/");
    }
  }, [user, router]);

  useEffect(() => {
    const unsubscribe = dataProvider.subscribeToSuggestions((suggestionsList) => {
      setSuggestions(suggestionsList);
    });

    return () => unsubscribe();
  }, [dataProvider, refreshNonce]);

  const handleStatusChange = async (id: string, newStatus: SuggestionStatus) => {
    try {
      await dataProvider.updateSuggestionStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const filteredSuggestions =
    filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);

  if (!user || !isSiteAdmin(user.uid)) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h2>Feature Requests & Suggestions</h2>
        </div>

        <div className="filter-bar">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({suggestions.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key as SuggestionStatus)}
            >
              {config.label} ({suggestions.filter((s) => s.status === key).length})
            </button>
          ))}
        </div>

        {filteredSuggestions.length === 0 ? (
          <p className="no-data">No suggestions found for this category.</p>
        ) : (
          <div className="suggestions-list">
            {filteredSuggestions.map((s) => (
              <div key={s.id} className="suggestion-card">
                <div className="card-header">
                  <div className="user-info">
                    {/* Only the uid is persisted; resolving it to a name/email
                        needs a server-side lookup. */}
                    <span className="user-name">{s.userId}</span>
                  </div>
                  <div className="meta-info">
                    <span className="timestamp">{new Date(s.timestamp).toLocaleString()}</span>
                    <div
                      className="status-badge"
                      style={{
                        color: STATUS_CONFIG[s.status].color,
                        backgroundColor: STATUS_CONFIG[s.status].bgColor,
                        borderColor: STATUS_CONFIG[s.status].color,
                      }}
                    >
                      {STATUS_CONFIG[s.status].label}
                    </div>
                  </div>
                </div>

                <div className="message-content">{s.message}</div>

                <div className="card-actions">
                  <label className="field-label" htmlFor={`status-${s.id}`}>
                    Change Status
                  </label>
                  <select
                    id={`status-${s.id}`}
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value as SuggestionStatus)}
                    className="status-select"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .filter-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          flex-wrap: wrap;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--line-inner);
        }
        .filter-btn {
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--line-control);
          background: var(--surface-paper);
          cursor: pointer;
          font-family: var(--font-body);
          font-weight: 500;
          transition:
            background var(--dur-panel) var(--ease),
            border-color var(--dur-panel) var(--ease),
            color var(--dur-panel) var(--ease);
          color: var(--text-rail);
        }
        .filter-btn:hover {
          border-color: var(--color-red);
          color: var(--color-red);
        }
        .filter-btn.active {
          background: var(--color-red-wash);
          color: var(--color-red-deep);
          border-color: var(--line-open);
          font-weight: 600;
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: var(--text-prose);
          font-style: italic;
        }
        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .suggestion-card {
          background: var(--surface-paper);
          border: 1px solid var(--line-structure);
          border-radius: var(--border-radius-md);
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s;
        }
        .suggestion-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          border-bottom: 1px solid var(--line-inner);
          padding-bottom: 10px;
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: bold;
          color: var(--color-red);
          font-size: 1.1em;
        }
        .meta-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }
        .timestamp {
          font-size: 0.8em;
          color: var(--text-meta);
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: bold;
          text-transform: uppercase;
          border: 1px solid;
        }
        .message-content {
          padding: 15px;
          background: var(--surface-canvas);
          border-radius: var(--border-radius-sm);
          line-height: 1.6;
          color: var(--text-primary);
          margin-bottom: 15px;
          white-space: pre-wrap;
        }
        .card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--line-inner);
        }
        .card-actions label {
          font-size: 0.85em;
          font-weight: 600;
          color: var(--text-strong);
        }
        .status-select {
          padding: 6px 12px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--line-control);
          background: var(--surface-paper);
          font-family: var(--font-body);
          cursor: pointer;
          outline: none;
        }
        .status-select:focus {
          border-color: var(--color-red);
        }
      `}</style>
    </div>
  );
}
