"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { useToast } from "../../../components/ToastSystem";
import type { Suggestion, SuggestionStatus } from "../../../types/suggestion";

/**
 * Site-level feedback inbox. Pre-multi-tenancy this was gated by the global
 * `admin` role. Post-Phase-8 the global admin is gone; this page is currently
 * accessible to any signed-in user and shows their own suggestions. Phase 15
 * will gate it again behind an env-var allowlisted "site admin" uid.
 */
const SITE_ADMIN_UIDS: string[] = (process.env.NEXT_PUBLIC_SITE_ADMIN_UIDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isSiteAdmin(uid: string | undefined): boolean {
  return !!uid && SITE_ADMIN_UIDS.includes(uid);
}

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; color: string; bgColor: string }> = {
  unread: {
    label: "Unread",
    color: "var(--color-primary-500)",
    bgColor: "var(--color-primary-50)",
  },
  read: { label: "Read", color: "var(--color-accent-500)", bgColor: "#e8f5ec" },
  prioritized: {
    label: "Prioritized",
    color: "var(--color-secondary-500)",
    bgColor: "#fff5e0",
  },
  archived: {
    label: "Archived",
    color: "var(--color-neutral-600)",
    bgColor: "var(--color-neutral-100)",
  },
};

export default function SuggestionsPage() {
  const { user, dataProvider } = useAppContext();
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
  }, [dataProvider]);

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
                    <span className="user-name">{s.userName}</span>
                    <span className="user-email">{s.userEmail}</span>
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
                  <label>Change Status:</label>
                  <select
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
          border-bottom: 1px solid #eee;
        }
        .filter-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--color-node-border);
          background: var(--color-surface);
          cursor: pointer;
          font-family: var(--font-body);
          font-weight: 500;
          transition: all 0.2s;
          color: var(--color-text);
        }
        .filter-btn:hover {
          background: var(--color-bg);
          border-color: var(--color-primary);
        }
        .filter-btn.active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .suggestion-card {
          background: var(--color-surface);
          border: 1px solid var(--color-node-border);
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
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        .user-info {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-weight: bold;
          color: var(--color-primary);
          font-size: 1.1em;
        }
        .user-email {
          font-size: 0.9em;
          color: #666;
        }
        .meta-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
        }
        .timestamp {
          font-size: 0.8em;
          color: #888;
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
          background: var(--color-bg);
          border-radius: var(--border-radius-sm);
          line-height: 1.6;
          color: var(--color-text);
          margin-bottom: 15px;
          white-space: pre-wrap;
        }
        .card-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }
        .card-actions label {
          font-size: 0.85em;
          font-weight: 600;
          color: #555;
        }
        .status-select {
          padding: 6px 12px;
          border-radius: var(--border-radius-sm);
          border: 1px solid #ddd;
          background: var(--color-surface);
          font-family: var(--font-body);
          cursor: pointer;
          outline: none;
        }
        .status-select:focus {
          border-color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
