import React from 'react';

const EventsEditor = ({ events, onChange }) => {
  const handleEventChange = (index, field, value) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    onChange(newEvents);
  };

  const addEvent = () => {
    onChange([...events, { type: '', date: '', place: '' }]);
  };

  const removeEvent = (index) => {
    const newEvents = events.filter((_, i) => i !== index);
    onChange(newEvents);
  };

  return (
    <div className="dynamic-list">
      <h3>Events</h3>
      {events.map((event, index) => (
        <div key={index} className="item">
          <button type="button" className="remove-item-btn btn-danger" onClick={() => removeEvent(index)}>X</button>
          <div className="form-group">
            <label>Event Type</label>
            <input type="text" value={event.type} onChange={(e) => handleEventChange(index, 'type', e.target.value)} placeholder="e.g., Birth, Death" />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="text" value={event.date} onChange={(e) => handleEventChange(index, 'date', e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div className="form-group">
            <label>Place</label>
            <input type="text" value={event.place} onChange={(e) => handleEventChange(index, 'place', e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addEvent}>Add Event</button>
    </div>
  );
};

export default EventsEditor;
