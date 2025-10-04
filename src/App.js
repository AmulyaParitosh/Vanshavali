import React, { useState, useEffect } from "react";
import FamilyTree from "./components/FamilyTree";
import EditScreen from "./components/EditScreen";
import "./App.css";

const App = () => {
  const [treeData, setTreeData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetch("/data.json")
      .then((response) => response.json())
      .then((data) => setTreeData(data))
      .catch((error) => console.error("Error fetching data: ", error));
  }, []);

  if (!treeData) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`App ${isEditMode ? "edit-mode" : ""}`}>
      <header className="App-header">
        <div className="header-spacer"></div>
        <h1>Family Lineage</h1>
        <button
          className="edit-button"
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? "Back to Tree" : "Edit"}
        </button>
      </header>
      <main>
        {isEditMode ? (
          <EditScreen treeData={treeData} onExit={() => setIsEditMode(false)} />
        ) : (
          <FamilyTree people={treeData.people} families={treeData.families} />
        )}
      </main>
    </div>
  );
};

export default App;
