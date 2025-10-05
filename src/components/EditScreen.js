import React, { useState, useEffect } from 'react';
import PersonForm from './PersonForm';
import FamilyForm from './FamilyForm';
import './EditScreen.css';

const EditScreen = ({ treeData, onSave, onExit }) => {
  const [data, setData] = useState(treeData);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [activeTab, setActiveTab] = useState('people'); // 'people' or 'families'

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <div className="loading-editor">Loading Editor...</div>;
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
        const newFamilyId = `${family.partners[0]}_${family.partners[1]}_family`;
        if (data.families.some(f => f.id === newFamilyId)) {
            alert('A family with these partners already exists.');
            return;
        }
      const newFamily = { ...family, id: newFamilyId };
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

  const handleAddNewPerson = () => {
    setSelectedPerson({ name: { official_name: '' }, sex: 'M', events: [], custom_fields: {} });
    setSelectedFamily(null);
  };

  const handleAddNewFamily = () => {
    setSelectedFamily({ partners: ['', ''], children: [] });
    setSelectedPerson(null);
  };

  const renderSidebarList = () => {
    if (activeTab === 'people') {
      return (
        <ul className="data-list">
          {data.people.map((p) => (
            <li key={p.id} onClick={() => { setSelectedPerson(p); setSelectedFamily(null); }} className={selectedPerson && selectedPerson.id === p.id ? 'active' : ''}>
              {p.name.official_name}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="data-list">
        {data.families.map((f) => (
          <li key={f.id} onClick={() => { setSelectedFamily(f); setSelectedPerson(null); }} className={selectedFamily && selectedFamily.id === f.id ? 'active' : ''}>
            {getPersonName(f.partners[0])} & {getPersonName(f.partners[1])}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="edit-screen">
      <aside className="sidebar">
        <div className="sidebar-tabs">
            <button onClick={() => setActiveTab('people')} className={activeTab === 'people' ? 'active' : ''}>People</button>
            <button onClick={() => setActiveTab('families')} className={activeTab === 'families' ? 'active' : ''}>Families</button>
        </div>
        <div className="sidebar-content">
            {renderSidebarList()}
        </div>
        <div className="sidebar-actions">
            {activeTab === 'people' ? 
                <button className="btn-primary btn-block" onClick={handleAddNewPerson}>Add New Person</button> : 
                <button className="btn-primary btn-block" onClick={handleAddNewFamily}>Add New Family</button>
            }
        </div>
      </aside>
      <main className="editor-panel">
        {(!selectedPerson && !selectedFamily) && (
          <div className="welcome-message">
            <h2>Welcome to the Family Tree Editor</h2>
            <p>Select an item from the sidebar to begin editing.</p>
            <p>You can add new people or families using the buttons at the bottom of the sidebar.</p>
            <p>All your changes are saved automatically.</p>
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
  );
};

export default EditScreen;
