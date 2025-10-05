import React, { useState, useEffect } from 'react';
import PersonForm from './PersonForm';
import FamilyForm from './FamilyForm';
import './EditScreen.css';

const EditScreen = ({ treeData, onSave, onExit }) => {
  const [data, setData] = useState(treeData);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState(null);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <div>Loading Editor...</div>;
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
    const updatedPeople = data.people.filter(p => p.id !== personId);
    const updatedFamilies = data.families
      .map(f => ({ ...f, children: f.children.filter(c => c !== personId) }))
      .filter(f => f.partners[0] !== personId && f.partners[1] !== personId);
    
    const newData = { ...data, people: updatedPeople, families: updatedFamilies };
    setData(newData);
    onSave(newData);
    setSelectedPerson(null);
  };

  const handleSaveFamily = (family) => {
    let updatedFamilies;
    if (family.id) {
      updatedFamilies = data.families.map(f => f.id === family.id ? family : f);
    } else {
      const newFamily = { ...family, id: `${family.partners[0]}_${family.partners[1]}_family` };
      updatedFamilies = [...data.families, newFamily];
      setSelectedFamily(newFamily);
    }
    const newData = { ...data, families: updatedFamilies };
    setData(newData);
    onSave(newData);
  };

  const handleDeleteFamily = (familyId) => {
    const updatedFamilies = data.families.filter(f => f.id !== familyId);
    const newData = { ...data, families: updatedFamilies };
    setData(newData);
    onSave(newData);
    setSelectedFamily(null);
  };

  const getPersonName = (personId) => {
    const person = data.people.find(p => p.id === personId);
    return person ? person.name.official_name : '?';
  };

  return (
    <div className="edit-screen-container">
      <div className="main-container">
        <aside className="sidebar">
          <h2>People</h2>
          <ul className="data-list">
            {data.people.map((p) => (
              <li key={p.id} onClick={() => { setSelectedPerson(p); setSelectedFamily(null); }} className={selectedPerson && selectedPerson.id === p.id ? 'active' : ''}>
                {p.name.official_name}
              </li>
            ))}
          </ul>
          <button className="btn-secondary btn-block" onClick={() => { setSelectedPerson({ name: { official_name: '' }, sex: 'M', events: [], custom_fields: {} }); setSelectedFamily(null); }}>Add New Person</button>

          <h2 style={{ marginTop: '30px' }}>Families</h2>
          <ul className="data-list">
            {data.families.map((f) => (
              <li key={f.id} onClick={() => { setSelectedFamily(f); setSelectedPerson(null); }} className={selectedFamily && selectedFamily.id === f.id ? 'active' : ''}>
                {getPersonName(f.partners[0])} & {getPersonName(f.partners[1])}
              </li>
            ))}
          </ul>
          <button className="btn-secondary btn-block" onClick={() => { setSelectedFamily({ partners: ['', ''], children: [] }); setSelectedPerson(null); }}>Add New Family</button>
        </aside>
        <main className="editor-panel">
          {(!selectedPerson && !selectedFamily) && (
            <div className="welcome-message">
              <p>Welcome to the Family Tree Editor!</p>
              <p>Select a person or family to edit, or add new ones using the buttons on the left.</p>
              <p>Your changes will be saved automatically.</p>
            </div>
          )}
          {selectedPerson && (
            <PersonForm person={selectedPerson} onSave={handleSavePerson} onDelete={handleDeletePerson} />
          )}
          {selectedFamily && (
            <FamilyForm family={selectedFamily} people={data.people} onSave={handleSaveFamily} onDelete={handleDeleteFamily} />
          )}
        </main>
      </div>
    </div>
  );
};

export default EditScreen;
