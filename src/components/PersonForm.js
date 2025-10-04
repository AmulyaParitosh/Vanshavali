import React, { useState } from "react";

const PersonForm = ({ onSubmit }) => {
  const [name, setName] = useState("");
  const [spouse, setSpouse] = useState("");
  const [children, setChildren] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      spouse,
      children: children.split(",").map((c) => c.trim()),
    });
    setName("");
    setSpouse("");
    setChildren("");
    
  };

  return (
    <form onSubmit={handleSubmit} className="person-form">
      <h2>Add/Edit Person</h2>
      <div className="form-group">
        <label htmlFor="name">Name</label>
          
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="spouse">Spouse</label>
        <input
          type="text"
          id="spouse"
          value={spouse}
          onChange={(e) => setSpouse(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="children">Children (comma-separated)</label>
        <input
          type="text"
          id="children"
          value={children}
          onChange={(e) => setChildren(e.target.value)}
        />
      </div>
      <button type="submit">Save</button>
    </form>
  );
};

export default PersonForm;
