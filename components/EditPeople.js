import React, { useState, useEffect } from 'react';
import PersonForm from './PersonForm';

const EditPeople = ({ treeData, onSave, canEdit }) => {
  const [data, setData] = useState(treeData);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <div className="loading-editor">Loading...</div>;
  }

  const generateIdFromName = (name) => {
    if (!name) return `p_${Date.now()}`;
    const baseId = "p_" + name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    let finalId = baseId;
    let counter = 1;
    while (data.people.some(p => p.id === finalId)) {
      finalId = `${baseId}_${counter}`;
      counter++;
    }
    return finalId;
  };

  const handleSavePerson = (person) => {
    if (!canEdit) return;
    let updatedPeople;
    if (person.id) {
      updatedPeople = data.people.map(p => p.id === person.id ? person : p);
    } else {
      const newPerson = { ...person, id: generateIdFromName(person.name.official_name) };
      updatedPeople = [...data.people, newPerson];
      setSelectedPerson(newPerson);
    }
    const newData = { ...data, people: updatedPeople };
    setData(newData);
    onSave(newData);
  };

  const handleDeletePerson = (personId) => {
    if (!canEdit) return;
    const updatedPeople = data.people.filter(p => p.id !== personId);
    const updatedFamilies = data.families
      .map(f => ({ ...f, children: (f.children || []).filter(c => c !== personId) }))
      .filter(f => f.partners[0] !== personId && f.partners[1] !== personId);
    
    const newData = { ...data, people: updatedPeople, families: updatedFamilies };
    setData(newData);
    onSave(newData);
    setSelectedPerson(null);
  };

  const handleAddNewPerson = () => {
    if (!canEdit) return;
    setSelectedPerson({ name: { official_name: '' }, sex: 'M', events: [], custom_fields: {} });
  };

  const renderSidebarList = () => {
    return (
      <ul className="data-list">
        {data.people.map((p) => (
          <li key={p.id} onClick={() => setSelectedPerson(p)} className={selectedPerson && selectedPerson.id === p.id ? 'active' : ''}>
            {p.name.official_name}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="edit-screen">
      <aside className="sidebar">
        <div className="sidebar-content">
            {renderSidebarList()}
        </div>
        {canEdit && (
          <div className="sidebar-actions">
              <button className="btn btn-primary btn-block" onClick={handleAddNewPerson}>Add New Person</button>
          </div>
        )}
      </aside>
      <main className="editor-panel">
        {!selectedPerson && (
          <div className="welcome-message">
            <h2>Select a person to view details</h2>
            {canEdit && <p>You can add a new person using the button at the bottom of the sidebar.</p>}
          </div>
        )}
        {selectedPerson && (
          <PersonForm person={selectedPerson} onSave={handleSavePerson} onDelete={handleDeletePerson} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
};

export default EditPeople;
