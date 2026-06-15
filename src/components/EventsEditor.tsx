import React from "react";
import type { PersonEvent } from "../types/person";

interface EventsEditorProps {
  events: PersonEvent[];
  onChange: (events: PersonEvent[]) => void;
  canEdit: boolean;
}

const EventsEditor: React.FC<EventsEditorProps> = ({ events, onChange, canEdit }) => {
  const handleEventChange = (index: number, field: keyof PersonEvent, value: string) => {
    const current = events[index];
    if (!current) return;
    const newEvents = [...events];
    newEvents[index] = { ...current, [field]: value };
    onChange(newEvents);
  };

  const removeEvent = (index: number) => {
    const newEvents = events.filter((_, i) => i !== index);
    onChange(newEvents);
  };

  return (
    <div className="dynamic-list">
      {events.map((event, index) => (
        <div key={index} className="item">
          <div className="form-group">
            <label>Event Type</label>
            <input
              type="text"
              value={event.type}
              onChange={(e) => handleEventChange(index, "type", e.target.value)}
              placeholder="e.g., Birth, Death"
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="text"
              value={event.date || ""}
              onChange={(e) => handleEventChange(index, "date", e.target.value)}
              placeholder="YYYY-MM-DD"
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label>Place</label>
            <input
              type="text"
              value={event.place || ""}
              onChange={(e) => handleEventChange(index, "place", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-icon-remove small"
              onClick={() => removeEvent(index)}
              title="Remove Event"
            >
              &times;
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default EventsEditor;
