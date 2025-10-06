import React, { useState, useEffect } from 'react';
import FamilyForm from './FamilyForm';

const EditFamily = ({ treeData, onSave, canEdit }) => {
  const [data, setData] = useState(treeData);
  const [selectedFamily, setSelectedFamily] = useState(null);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <div className="loading-editor">Loading...</div>;
  }

  const handleSaveFamily = (family) => {
    if (!canEdit) return;
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
    if (!canEdit) return;
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

  const handleAddNewFamily = () => {
    if (!canEdit) return;
    setSelectedFamily({ partners: ['', ''], children: [] });
  };

  const renderSidebarList = () => {
    return (
      <ul className="data-list">
        {data.families.map((f) => (
          <li key={f.id} onClick={() => setSelectedFamily(f)} className={selectedFamily && selectedFamily.id === f.id ? 'active' : ''}>
            {getPersonName(f.partners[0])} & {getPersonName(f.partners[1])}
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
                <button className="btn-primary btn-block" onClick={handleAddNewFamily}>Add New Family</button>
            </div>
        )}
      </aside>
      <main className="editor-panel">
        {!selectedFamily && (
          <div className="welcome-message">
            <h2>Select a family to view details</h2>
            {canEdit && <p>You can add a new family using the button at the bottom of the sidebar.</p>}
          </div>
        )}
        {selectedFamily && (
          <FamilyForm family={selectedFamily} people={data.people} onSave={handleSaveFamily} onDelete={handleDeleteFamily} canEdit={canEdit} />
        )}
      </main>
    </div>
  );
};

export default EditFamily;
