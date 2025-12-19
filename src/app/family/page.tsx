'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import Loading from '../../components/Loading';
import type { Family } from "../../types/family";
import type { TreeData } from "../../context/AppContext";
import type { Person } from "../../types/person";
// @ts-ignore
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import TextListSidebar from "../../components/TextListSidebar";
import { useToast } from "../../components/ToastSystem";
import SearchItem from "../../components/SearchItem";
  
  export default function FamilyPage() {
    const { treeData, user, onSave } = useAppContext();
    const canEdit = user?.role === 'admin' || user?.role === 'editor';
    const toast = useToast();
  
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
        const newFamilyId = `family_${family.husband || 'none'}_${family.wife || 'none'}_${Date.now()}`;
        if (data.families.some((f) => f.id === newFamilyId)) {
          toast.error("A family with these partners already exists.");
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
    setSelectedFamily({ id: "", husband: "", wife: "", children: [] });
  };



  return (
    <div className="edit-screen">
      <TextListSidebar
        items={data.families}
        renderItem={(f: Family) => (
          <SearchItem type="family" item={f} people={data.people} />
        )}
        filterItem={(f: Family, query: string) => {
             const q = query.toLowerCase();
             const hId = f.husband || f.partners?.[0];
             const wId = f.wife || f.partners?.[1];

             const p1 = data.people.find(p => p.id === hId);
             const p2 = data.people.find(p => p.id === wId);
             
             const p1NameMatch = p1?.name.official_name.toLowerCase().includes(q);
             const p1AliasMatch = p1?.name.aliases?.some(alias => alias.toLowerCase().includes(q));
             
             const p2NameMatch = p2?.name.official_name.toLowerCase().includes(q);
             const p2AliasMatch = p2?.name.aliases?.some(alias => alias.toLowerCase().includes(q));

             return !!(p1NameMatch || p1AliasMatch || p2NameMatch || p2AliasMatch);
        }}
        onSelect={setSelectedFamily}
        selectedItem={selectedFamily}
        onAdd={canEdit ? handleAddNewFamily : undefined}
        addButtonLabel="Add New Family"
        canEdit={canEdit}
      />
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
  const toast = useToast();

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
    if (name === "husband") {
      setFormData({ ...formData, husband: value });
    } else {
      setFormData({ ...formData, wife: value });
    }
  };

  const handleAddChild = () => {
    if (!formData) return;
    if (selectedChild && !(formData.children || []).includes(selectedChild)) {
      const newChildren = [...(formData.children || []), selectedChild];
      setFormData({ ...formData, children: newChildren });
      setSelectedChild("");
      toast.success("Child added (unsaved)");
    }
  };

  const handleRemoveChild = (childIdToRemove: string) => {
    if (!formData) return;
    const newChildren = (formData.children || []).filter(
      (childId: string) => childId !== childIdToRemove
    );
    setFormData({ ...formData, children: newChildren });
    toast.success("Child removed (unsaved)");
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !canEdit || !formData) {
      return;
    }

    const items = Array.from(formData.children || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    
    if (reorderedItem) {
        items.splice(result.destination.index, 0, reorderedItem);
        setFormData({ ...formData, children: items as string[] });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
        onSave(formData);
        toast.success("Family saved successfully");
    }
  };

  const handleDelete = () => {
    toast.confirm(
        "Are you sure you want to delete this family? This will not delete the individuals but will remove their connections as a family unit.",
        () => {
             if (family.id) {
                 onDelete(family.id);
                 toast.success("Family deleted");
             }
        }
    );
  };

  const husbandId = formData.husband || (formData.partners ? formData.partners[0] : "");
  const wifeId = formData.wife || (formData.partners ? formData.partners[1] : "");
  const currentChildrenIds = formData.children || [];

  const availableChildren = people.filter(
    (p) =>
      p.id !== husbandId &&
      p.id !== wifeId &&
      !currentChildrenIds.includes(p.id)
  );

  return (
    <div className="form-container">
      <h2>{getPersonName(husbandId || "") || "Husband"} & {getPersonName(wifeId || "") || "Wife"}</h2>
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="family-husband">Husband (Male)</label>
          <select
            id="family-husband"
            name="husband"
            value={husbandId}
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
          <label htmlFor="family-wife">Wife (Female)</label>
          <select
            id="family-wife"
            name="wife"
            value={wifeId}
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
          <Droppable droppableId="children-list" isDropDisabled={!canEdit} isCombineEnabled={false} ignoreContainerClipping={false}>
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
