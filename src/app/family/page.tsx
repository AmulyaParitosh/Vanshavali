'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import Loading from '../../components/Loading';
import type { Family } from "../../types/family";
import type { TreeData } from "../../context/AppContext";
import type { Person } from "../../types/person";
// @ts-ignore
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";

export default function FamilyPage() {
  const { treeData, user, onSave } = useAppContext();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const [data, setData] = useState<TreeData | null>(treeData);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  useEffect(() => {
    setData(treeData);
  }, [treeData]);

  if (!data) {
    return <Loading />;
  }

  const handleSaveFamily = (family: Family) => {
    if (!canEdit) return;
    let updatedFamilies;
    if (family.id) {
      updatedFamilies = data.families.map((f) =>
        f.id === family.id ? family : f
      );
    } else {
      const newFamilyId = `${family.partners[0]}_${family.partners[1]}_family`;
      if (data.families.some((f) => f.id === newFamilyId)) {
        alert("A family with these partners already exists.");
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

  const handleDeleteFamily = (familyId: string) => {
    if (!canEdit) return;
    const updatedFamilies = data.families.filter((f) => f.id !== familyId);
    const newData = { ...data, families: updatedFamilies };
    setData(newData);
    onSave(newData);
    setSelectedFamily(null);
  };

  const getPersonName = (personId: string) => {
    const person = data.people.find((p) => p.id === personId);
    return person ? person.name.official_name : "?";
  };

  const handleAddNewFamily = () => {
    if (!canEdit) return;
    // @ts-ignore
    setSelectedFamily({ partners: ["", ""], children: [] });
  };

  const renderSidebarList = () => {
    return (
      <ul className="data-list">
        {data.families.map((f) => (
          <li
            key={f.id}
            onClick={() => setSelectedFamily(f)}
            className={
              selectedFamily && selectedFamily.id === f.id ? "active" : ""
            }
          >
            {getPersonName(f.partners[0] || "")} & {getPersonName(f.partners[1] || "")}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="edit-screen">
      <aside className="sidebar">
        <div className="sidebar-content">{renderSidebarList()}</div>
        {canEdit && (
          <div className="sidebar-actions">
            <button
              className="btn btn-primary btn-block"
              onClick={handleAddNewFamily}
            >
              Add New Family
            </button>
          </div>
        )}
      </aside>
      <main className="editor-panel">
        {!selectedFamily && (
          <div className="welcome-message">
            <h2>Select a family to view details</h2>
            {canEdit && (
              <p>
                You can add a new family using the button at the bottom of the
                sidebar.
              </p>
            )}
          </div>
        )}
        {selectedFamily && (
          <FamilyForm
            family={selectedFamily}
            people={data.people}
            onSave={handleSaveFamily}
            onDelete={handleDeleteFamily}
            canEdit={canEdit}
          />
        )}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------
// Local Component: FamilyForm
// ----------------------------------------------------------------------

interface FamilyFormProps {
  family: Family | null;
  people: Person[];
  onSave: (data: Family) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

const FamilyForm: React.FC<FamilyFormProps> = ({ family, people, onSave, onDelete, canEdit }) => {
  const [formData, setFormData] = useState<Family | null>(family);
  const [selectedChild, setSelectedChild] = useState<string>("");

  useEffect(() => {
    setFormData(family);
    setSelectedChild("");
  }, [family]);

  if (!formData || !family) return null;

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.name.official_name : "Unknown";
  };

  const handlePartnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    // @ts-ignore
    const currentPartners = formData.partners || ["", ""];
    let newPartners: [string, string];
    if (name === "partner1") {
      newPartners = [value, currentPartners[1] || ""];
    } else {
      newPartners = [currentPartners[0] || "", value];
    }
    setFormData({ ...formData, partners: newPartners });
  };

  const handleAddChild = () => {
    if (!formData) return;
    if (selectedChild && !(formData.children || []).includes(selectedChild)) {
      // @ts-ignore
      const newChildren = [...(formData.children || []), selectedChild];
      setFormData({ ...formData, children: newChildren });
      setSelectedChild("");
    }
  };

  const handleRemoveChild = (childIdToRemove: string) => {
    if (!formData) return;
    // @ts-ignore
    const newChildren = (formData.children || []).filter(
      (childId: string) => childId !== childIdToRemove
    );
    setFormData({ ...formData, children: newChildren });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !canEdit || !formData) {
      return;
    }

    // @ts-ignore
    const items = Array.from(formData.children || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    
    if (reorderedItem) {
        items.splice(result.destination.index, 0, reorderedItem);
        setFormData({ ...formData, children: items as string[] });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onSave(formData);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this family? This will not delete the individuals but will remove their connections as a family unit."
      )
    ) {
      if (family.id) onDelete(family.id);
    }
  };

  // @ts-ignore
  const partner1Id = formData.partners ? formData.partners[0] : "";
  // @ts-ignore
  const partner2Id = formData.partners ? formData.partners[1] : "";
  // @ts-ignore
  const currentChildrenIds = formData.children || [];

  const availableChildren = people.filter(
    (p) =>
      p.id !== partner1Id &&
      p.id !== partner2Id &&
      !currentChildrenIds.includes(p.id)
  );

  return (
    <div className="form-container">
      <h2>Family Details</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="family-partner1">Partner 1 (Male)</label>
          <select
            id="family-partner1"
            name="partner1"
            value={partner1Id}
            onChange={handlePartnerChange}
            required
            disabled={!canEdit}
          >
            <option value="">Select a person</option>
            {people
              .filter((p) => p.sex === "M")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.official_name}
                </option>
              ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="family-partner2">Partner 2 (Female)</label>
          <select
            id="family-partner2"
            name="partner2"
            value={partner2Id}
            onChange={handlePartnerChange}
            required
            disabled={!canEdit}
          >
            <option value="">Select a person</option>
            {people
              .filter((p) => p.sex === "F")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.official_name}
                </option>
              ))}
          </select>
        </div>

        <h3 className="form-section-heading">Children</h3>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="children-list" isDropDisabled={!canEdit}>
            {(provided: any) => (
              <ol
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="children-list"
              >
                {(formData.children || []).map((childId: string, index: number) => (
                  <Draggable
                    key={childId}
                    draggableId={childId}
                    index={index}
                    isDragDisabled={!canEdit}
                  >
                    {(provided: any) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="child-item"
                      >
                        <span>{getPersonName(childId)}</span>
                        {canEdit && (
                          <button
                            type="button"
                            className="remove-child-btn"
                            onClick={() => handleRemoveChild(childId)}
                          >
                            &times;
                          </button>
                        )}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ol>
            )}
          </Droppable>
        </DragDropContext>
        {canEdit && (
          <div className="add-child-container">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              disabled={!canEdit}
            >
              <option value="">Select a child to add</option>
              {availableChildren.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.official_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddChild}
              disabled={!canEdit}
            >
              Add Child
            </button>
          </div>
        )}

        {canEdit && (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Family
            </button>
            {family.id && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Family
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
