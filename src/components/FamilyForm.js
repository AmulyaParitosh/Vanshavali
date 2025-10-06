import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const FamilyForm = ({ family, people, onSave, onDelete }) => {
  const [formData, setFormData] = useState(family);
  const [selectedChild, setSelectedChild] = useState('');

  useEffect(() => {
    setFormData(family);
    setSelectedChild('');
  }, [family]);

  if (!family) return null;

  const getPersonName = (personId) => {
    const person = people.find(p => p.id === personId);
    return person ? person.name.official_name : 'Unknown';
  };

  const handlePartnerChange = (e) => {
    const { name, value } = e.target;
    const currentPartners = formData.partners || ['', ''];
    let newPartners;
    if (name === 'partner1') {
      newPartners = [value, currentPartners[1]];
    } else {
      newPartners = [currentPartners[0], value];
    }
    setFormData({ ...formData, partners: newPartners });
  };

  const handleAddChild = () => {
    if (selectedChild && !(formData.children || []).includes(selectedChild)) {
      const newChildren = [...(formData.children || []), selectedChild];
      setFormData({ ...formData, children: newChildren });
      setSelectedChild('');
    }
  };

  const handleRemoveChild = (childIdToRemove) => {
    const newChildren = (formData.children || []).filter(childId => childId !== childIdToRemove);
    setFormData({ ...formData, children: newChildren });
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(formData.children || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData({ ...formData, children: items });
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this family? This will not delete the individuals but will remove their connections as a family unit.')) {
      onDelete(family.id);
    }
  };

  const partner1Id = formData.partners ? formData.partners[0] : '';
  const partner2Id = formData.partners ? formData.partners[1] : '';
  const currentChildrenIds = formData.children || [];

  const availableChildren = people.filter(p =>
    p.id !== partner1Id &&
    p.id !== partner2Id &&
    !currentChildrenIds.includes(p.id)
  );

  return (
    <div className="form-container">
      <h2>{family.id ? 'Edit Family' : 'Add New Family'}</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="family-partner1">Partner 1 (Male)</label>
          <select id="family-partner1" name="partner1" value={partner1Id} onChange={handlePartnerChange} required>
            <option value="">Select a person</option>
            {people.filter(p => p.sex === 'M').map(p => (
              <option key={p.id} value={p.id}>{p.name.official_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="family-partner2">Partner 2 (Female)</label>
          <select id="family-partner2" name="partner2" value={partner2Id} onChange={handlePartnerChange} required>
            <option value="">Select a person</option>
            {people.filter(p => p.sex === 'F').map(p => (
              <option key={p.id} value={p.id}>{p.name.official_name}</option>
            ))}
          </select>
        </div>
        
        <h3 className="form-section-heading">Children</h3>
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="children-list">
                {(provided) => (
                    <ol
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="children-list"
                    >
                        {(formData.children || []).map((childId, index) => (
                            <Draggable key={childId} draggableId={childId} index={index}>
                                {(provided) => (
                                    <li
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="child-item"
                                    >
                                        <span>{getPersonName(childId)}</span>
                                        <button
                                            type="button"
                                            className="remove-child-btn"
                                            onClick={() => handleRemoveChild(childId)}
                                        >
                                            &times;
                                        </button>
                                    </li>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </ol>
                )}
            </Droppable>
        </DragDropContext>
        <div className="add-child-container">
          <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
              <option value="">Select a child to add</option>
              {availableChildren.map(p => (
                  <option key={p.id} value={p.id}>{p.name.official_name}</option>
              ))}
          </select>
          <button type="button" className="btn btn-secondary" onClick={handleAddChild}>Add Child</button>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Family</button>
          {family.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Delete Family
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FamilyForm;
