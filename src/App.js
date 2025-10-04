import React, { useState, useEffect } from "react";
import FamilyTree from "./components/FamilyTree";
import "./App.css";

const App = () => {
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    fetch("/data.json")
      .then((response) => response.json())
      .then((data) => setTreeData(data))
      .catch((error) => console.error("Error fetching data: ", error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Family Lineage</h1>
      </header>
      <main>
        <div className="tree-view">
          {treeData ? (
            <FamilyTree people={treeData.people} families={treeData.families} />
          ) : (
            <p>Loading family data...</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
