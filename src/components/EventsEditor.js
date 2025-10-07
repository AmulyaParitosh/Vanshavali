import React from "react";

const EventsEditor = ({ events, onChange, canEdit }) => {
  const handleEventChange = (index, field, value) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    onChange(newEvents);
  };

  const addEvent = () => {
    onChange([...events, { type: "", date: "", place: "" }]);
  };

  const removeEvent = (index) => {
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
              value={event.date}
              onChange={(e) => handleEventChange(index, "date", e.target.value)}
              placeholder="YYYY-MM-DD"
              disabled={!canEdit}
            />
          </div>
          <div className="form-group">
            <label>Place</label>
            <input
              type="text"
              value={event.place}
              onChange={(e) =>
                handleEventChange(index, "place", e.target.value)
              }
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeEvent(index)}
            >
              Remove Event
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <button type="button" className="btn btn-secondary" onClick={addEvent}>
          Add Event
        </button>
      )}
    </div>
  );
};

export default EventsEditor;
