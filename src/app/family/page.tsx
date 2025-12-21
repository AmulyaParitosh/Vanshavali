'use client';
import React, { useState, useEffect } from "react";
import { useAppContext } from '../../context/AppContext';
import Loading from '../../components/Loading';
import type { Family } from "../../types/family";
import type { TreeData } from "../../context/AppContext";
import type { Person } from "../../types/person";

import TextListSidebar from "../../components/TextListSidebar";
import { useToast } from "../../components/ToastSystem";
import SearchItem from "../../components/SearchItem";
import PersonSearch from "../../components/PersonSearch";
import { stringToColor } from "../../utils/colorUtils";
import { TREE_CONFIG } from "../../constants";
  
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
  const [showAddChild, setShowAddChild] = useState(false);
  const toast = useToast();

  const getPlaceholderUrl = (person: Person) => {
    return TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
      stringToColor(person.id || person.name.official_name).substring(1),
      person.name.official_name.substring(0, 2)
    );
  };

  useEffect(() => {
    setFormData(family);
    setSelectedChild("");
    setShowAddChild(false);
  }, [family]);

  if (!formData || !family) return null;

  const getPersonName = (personId: string) => {
    const person = people.find((p) => p.id === personId);
    return person ? person.name.official_name : "Unknown";
  };

  const handlePartnerChange = (name: string, value: string) => {
    if (!formData) return;
    if (name === "husband") {
      setFormData({ ...formData, husband: value });
    } else {
      setFormData({ ...formData, wife: value });
    }
  };

  const handleAddChild = (personId: string) => {
    if (!formData || !personId) return;
    
    // Check if child is already in the list
    if (formData.children?.includes(personId)) {
        toast.error("This person is already a child in this family.");
        return;
    }

    const currentChildren = formData?.children || [];
    setFormData({ ...formData, children: [...currentChildren, personId] });
    setShowAddChild(false); // Close the inline add row
    toast.success("Child added to list");
  };

  const handleRemoveChild = (childIdToRemove: string) => {
    if (!formData) return;
    const newChildren = (formData.children || []).filter(
      (childId: string) => childId !== childIdToRemove
    );
    setFormData({ ...formData, children: newChildren });
    toast.success("Child removed (unsaved)");
  };

  const handleMoveChild = (index: number, direction: 'up' | 'down') => {
    if (!formData || !formData.children) return;
    const items = [...formData.children];
    if (direction === 'up') {
        if (index === 0) return;
        const temp = items[index - 1];
        if (typeof temp === 'string' && typeof items[index] === 'string') {
             items[index - 1] = items[index] as string;
             items[index] = temp;
        }
    } else {
        if (index === items.length - 1) return;
        const temp = items[index + 1];
        if (typeof temp === 'string' && typeof items[index] === 'string') {
             items[index + 1] = items[index] as string;
             items[index] = temp;
        }
    }
    setFormData({ ...formData, children: items });
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

  const husbandId = formData.husband || formData.partners?.[0] || "";
  const wifeId = formData.wife || formData.partners?.[1] || "";
  const currentChildrenIds = formData.children || [];

  const availableChildren = people.filter(
    (p) =>
      p.id !== husbandId &&
      p.id !== wifeId &&
      !currentChildrenIds.includes(p.id)
  );

  return (
    <div className="form-container" style={{ backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }}>


      <form onSubmit={handleSave}>
        {/* Parents Section - Side by Side */}
        <div className="section-card">
          <h3>Parents</h3>
          <div className="form-row">
            <div className="form-col">
                {(() => {
                   const husband = people.find(p => p.id === husbandId);
                   return (
                     <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                       <img
                         src={husband?.image_url || (husband ? getPlaceholderUrl(husband) : TREE_CONFIG.PLACEHOLDER_IMAGE_URL('cccccc', 'H'))}
                         alt={husband?.name.official_name || "Husband"}
                         style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--color-primary)' }}
                       />
                     </div>
                   );
                })()}
                <div className="form-group">
                <label htmlFor="family-husband">Husband (Male)</label>
                <PersonSearch
                    people={people}
                    selectedPersonId={husbandId}
                    onSelect={(id) => handlePartnerChange("husband", id)}
                    placeholder="Search for husband..."
                    filterSex="M"
                    disabled={!canEdit}
                />
                </div>
            </div>
            <div className="form-col">
                {(() => {
                   const wife = people.find(p => p.id === wifeId);
                   return (
                     <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                       <img
                         src={wife?.image_url || (wife ? getPlaceholderUrl(wife) : TREE_CONFIG.PLACEHOLDER_IMAGE_URL('cccccc', 'W'))}
                         alt={wife?.name.official_name || "Wife"}
                         style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--color-primary)' }}
                       />
                     </div>
                   );
                })()}
                <div className="form-group">
                <label htmlFor="family-wife">Wife (Female)</label>
                <PersonSearch
                    people={people}
                    selectedPersonId={wifeId}
                    onSelect={(id) => handlePartnerChange("wife", id)}
                    placeholder="Search for wife..."
                    filterSex="F"
                    disabled={!canEdit}
                />
                </div>
            </div>
          </div>
        </div>

        {/* Children Section */}
        <div className="section-card">
            <div className="section-header-row">
                <h3>Children</h3>
                 {canEdit && (
                  <button
                    type="button"
                    className="btn-icon-add"
                    onClick={() => setShowAddChild(!showAddChild)}
                    title={showAddChild ? "Cancel Adding" : "Add Child"}
                    style={showAddChild ? { backgroundColor: '#777', transform: 'rotate(45deg)' } : {}}
                  >
                    +
                  </button>
                )}
            </div>
            <div className="info-note" role="note" aria-label="Information about children ordering">
                The order of children determines their age in the family tree. The first child in the list is the eldest and appears on the left in the tree, while the last child is the youngest and appears on the right.
            </div>
            <ul className="children-list">
                {(formData.children || []).map((childId: string, index: number) => (
                    <li key={childId} className="child-item">
                        {canEdit && (
                            <div className="order-controls">
                                <button 
                                    type="button" 
                                    className="order-btn up" 
                                    onClick={() => handleMoveChild(index, 'up')}
                                    disabled={index === 0}
                                    title="Move Up"
                                >
                                    &#9650;
                                </button>
                                <button 
                                    type="button" 
                                    className="order-btn down" 
                                    onClick={() => handleMoveChild(index, 'down')}
                                    disabled={index === (formData.children?.length || 0) - 1}
                                    title="Move Down"
                                >
                                    &#9660;
                                </button>
                            </div>
                        )}
                        <div className="child-content" style={{ display: 'flex', alignItems: 'center' }}>
                            {(() => {
                                const child = people.find(p => p.id === childId);
                                return (
                                    <img
                                        src={child?.image_url || (child ? getPlaceholderUrl(child) : TREE_CONFIG.PLACEHOLDER_IMAGE_URL('cccccc', 'C'))}
                                        alt={child?.name.official_name || "Child"}
                                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }}
                                    />
                                );
                            })()}
                            <span>{getPersonName(childId)}</span>
                            {canEdit && (
                                <button
                                    type="button"
                                    className="btn-icon-remove small"
                                    onClick={() => handleRemoveChild(childId)}
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </li>
                ))}
                
                {/* Inline Add Child Row */}
                {canEdit && showAddChild && (
                    <li className="child-item new-child-input" style={{ border: '2px dashed var(--color-primary)', backgroundColor: 'transparent', padding: '10px' }}>
                        <div style={{ width: '100%' }}>
                             <PersonSearch
                                people={people}
                                selectedPersonId=""
                                onSelect={(id) => {
                                    handleAddChild(id);
                                }}
                                placeholder="Search to add a child..."
                                disabled={!canEdit}
                                excludeIds={[husbandId, wifeId, ...currentChildrenIds]}
                                autoFocus={true}
                            />
                        </div>
                         <button
                            type="button"
                            className="btn-icon-remove"
                            onClick={() => setShowAddChild(false)}
                            title="Cancel"
                        >
                            &times;
                        </button>
                    </li>
                )}
            </ul>
        </div>

        {canEdit && (
          <div className="form-actions">
             {family.id && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                style={{ marginRight: 'auto' }}
              >
                Delete Family
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              Save Family
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
