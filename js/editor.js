
            document.addEventListener("DOMContentLoaded", () => {
                const dataPath = "my_tree.yml";

                // Global state
                let people = [];
                let families = [];

                // UI Elements
                const peopleList = document.getElementById("people-list");
                const familiesList = document.getElementById("families-list");
                const editorPanel = document.getElementById("editor-panel");
                const welcomeMessage =
                    document.getElementById("welcome-message");
                const personFormContainer = document.getElementById(
                    "person-form-container"
                );
                const familyFormContainer = document.getElementById(
                    "family-form-container"
                );
                const personForm = document.getElementById("person-form");
                const familyForm = document.getElementById("family-form");

                // --- Data Loading and Initialization ---
                async function loadData() {
                    try {
                        const response = await fetch(dataPath);
                        if (!response.ok) {
                            console.warn(
                                `${dataPath} not found. Starting with a blank slate.`
                            );
                            initializeEditor();
                            return;
                        }
                        const yamlText = await response.text();
                        const data = jsyaml.load(yamlText);
                        people = data.people || [];
                        families = data.families || [];
                        initializeEditor();
                    } catch (error) {
                        console.error("Error loading data:", error);
                        alert(
                            "Could not load family tree data. Starting fresh."
                        );
                        initializeEditor();
                    }
                }

                function initializeEditor() {
                    renderPeopleList();
                    renderFamiliesList();
                    setupEventListeners();
                }

                // --- List Rendering ---
                function renderPeopleList() {
                    people.sort((a, b) =>
                        a.name.official_name.localeCompare(b.name.official_name)
                    );
                    peopleList.innerHTML = "";
                    people.forEach((p) => {
                        const li = document.createElement("li");
                        li.textContent = p.name.official_name;
                        li.dataset.id = p.id;
                        li.addEventListener("click", () => {
                            document
                                .querySelectorAll(".data-list li")
                                .forEach((el) => el.classList.remove("active"));
                            li.classList.add("active");
                            showPersonForm(p.id);
                        });
                        peopleList.appendChild(li);
                    });
                }

                function renderFamiliesList() {
                    familiesList.innerHTML = "";
                    families.forEach((f) => {
                        const p1 = people.find((p) => p.id === f.partners[0]);
                        const p2 = people.find((p) => p.id === f.partners[1]);
                        const li = document.createElement("li");
                        li.textContent = `${p1?.name.official_name || "?"} & ${
                            p2?.name.official_name || "?"
                        }`;
                        li.dataset.id = f.id;
                        li.addEventListener("click", () => {
                            document
                                .querySelectorAll(".data-list li")
                                .forEach((el) => el.classList.remove("active"));
                            li.classList.add("active");
                            showFamilyForm(f.id);
                        });
                        familiesList.appendChild(li);
                    });
                }

                // --- Form Display Logic ---
                function hideAllForms() {
                    welcomeMessage.style.display = "none";
                    personFormContainer.classList.remove("active");
                    familyFormContainer.classList.remove("active");
                }

                function showPersonForm(id = null) {
                    hideAllForms();
                    personFormContainer.classList.add("active");
                    personForm.reset();
                    document.getElementById("events-list").innerHTML = "";
                    document.getElementById("custom-fields-list").innerHTML =
                        "";

                    const person = id ? people.find((p) => p.id === id) : null;

                    document.getElementById("person-form-title").textContent =
                        person ? "Edit Person" : "Add New Person";
                    document.getElementById("delete-person-btn").style.display =
                        person ? "block" : "none";

                    if (person) {
                        document.getElementById("person-id").value = person.id;
                        document.getElementById("person-name").value =
                            person.name.official_name;
                        document.getElementById("person-sex").value =
                            person.sex;
                        document.getElementById("person-image").value =
                            person.image_url || "";
                        document.getElementById("person-root").checked =
                            person.root || false;

                        person.events?.forEach((e) => addEventField(e));
                        if (person.custom_fields) {
                            Object.entries(person.custom_fields).forEach(
                                ([key, value]) => addCustomField({ key, value })
                            );
                        }
                    } else {
                        document.getElementById("person-id").value = ""; // Clear ID for new person
                    }
                }

                function showFamilyForm(id = null) {
                    hideAllForms();
                    familyFormContainer.classList.add("active");
                    familyForm.reset();

                    const family = id
                        ? families.find((f) => f.id === id)
                        : null;

                    document.getElementById("family-form-title").textContent =
                        family ? "Edit Family" : "Add New Family";
                    document.getElementById("delete-family-btn").style.display =
                        family ? "block" : "none";

                    const partner1Select =
                        document.getElementById("family-partner1");
                    const partner2Select =
                        document.getElementById("family-partner2");

                    partner1Select.innerHTML =
                        '<option value="">Select a person</option>';
                    partner2Select.innerHTML =
                        '<option value="">Select a person</option>';

                    people
                        .filter((p) => p.sex === "M")
                        .forEach((p) => {
                            partner1Select.innerHTML += `<option value="${p.id}">${p.name.official_name}</option>`;
                        });
                    people
                        .filter((p) => p.sex === "F")
                        .forEach((p) => {
                            partner2Select.innerHTML += `<option value="${p.id}">${p.name.official_name}</option>`;
                        });

                    if (family) {
                        document.getElementById("family-id").value = family.id;
                        partner1Select.value = family.partners[0];
                        partner2Select.value = family.partners[1];
                        updateChildrenOptions(family.children || []);
                    } else {
                        document.getElementById("family-id").value = ""; // Clear ID for new family
                        updateChildrenOptions([]);
                    }
                }

                // --- Dynamic Form Field Adders ---
                function addEventField(event = {}) {
                    const container = document.getElementById("events-list");
                    const div = document.createElement("div");
                    div.className = "item";
                    div.innerHTML = `
                <button type="button" class="remove-item-btn btn-danger">X</button>
                <div class="form-group"><label>Event Type</label><input type="text" class="event-type" value="${
                    event.type || ""
                }" placeholder="e.g., Birth, Death"></div>
                <div class="form-group"><label>Date</label><input type="text" class="event-date" value="${
                    event.date || ""
                }" placeholder="YYYY-MM-DD"></div>
                <div class="form-group"><label>Place</label><input type="text" class="event-place" value="${
                    event.place || ""
                }"></div>
            `;
                    container.appendChild(div);
                    div.querySelector(".remove-item-btn").addEventListener(
                        "click",
                        () => div.remove()
                    );
                }

                function addCustomField(field = {}) {
                    const container =
                        document.getElementById("custom-fields-list");
                    const div = document.createElement("div");
                    div.className = "item";
                    div.innerHTML = `
                <button type="button" class="remove-item-btn btn-danger">X</button>
                <div class="form-group"><label>Field Name</label><input type="text" class="custom-key" value="${
                    field.key || ""
                }" placeholder="e.g., occupation"></div>
                <div class="form-group"><label>Field Value</label><input type="text" class="custom-value" value="${
                    field.value || ""
                }"></div>
            `;
                    container.appendChild(div);
                    div.querySelector(".remove-item-btn").addEventListener(
                        "click",
                        () => div.remove()
                    );
                }

                function updateChildrenOptions(selectedChildren = []) {
                    const partner1Id =
                        document.getElementById("family-partner1").value;
                    const partner2Id =
                        document.getElementById("family-partner2").value;
                    const childrenSelect =
                        document.getElementById("family-children");
                    childrenSelect.innerHTML = "";
                    people
                        .filter(
                            (p) => p.id !== partner1Id && p.id !== partner2Id
                        )
                        .forEach((p) => {
                            const option = document.createElement("option");
                            option.value = p.id;
                            option.textContent = p.name.official_name;
                            if (selectedChildren.includes(p.id)) {
                                option.selected = true;
                            }
                            childrenSelect.appendChild(option);
                        });
                }

                // --- Data Manipulation ---
                function generateIdFromName(name) {
                    if (!name) return `p_${Date.now()}`;
                    const baseId =
                        "p_" +
                        name
                            .toLowerCase()
                            .replace(/[^a-z0-9\s]/g, "")
                            .trim()
                            .replace(/\s+/g, "_");
                    let finalId = baseId;
                    let counter = 1;
                    while (people.some((p) => p.id === finalId)) {
                        finalId = `${baseId}_${counter}`;
                        counter++;
                    }
                    return finalId;
                }

                function savePerson(e) {
                    e.preventDefault();
                    let id = document.getElementById("person-id").value;
                    const isNewPerson = !id;

                    if (isNewPerson) {
                        id = generateIdFromName(
                            document.getElementById("person-name").value
                        );
                    }

                    const isRoot =
                        document.getElementById("person-root").checked;
                    if (isRoot) {
                        people.forEach((p) => {
                            if (p.id !== id) p.root = false;
                        });
                    }

                    const newPersonData = {
                        id: id,
                        root: isRoot,
                        sex: document.getElementById("person-sex").value,
                        name: {
                            official_name:
                                document.getElementById("person-name").value,
                            aliases: [],
                        },
                        image_url:
                            document.getElementById("person-image").value ||
                            undefined,
                        events: [],
                        custom_fields: {},
                    };

                    document
                        .querySelectorAll("#events-list .item")
                        .forEach((item) => {
                            newPersonData.events.push({
                                type: item.querySelector(".event-type").value,
                                date: item.querySelector(".event-date").value,
                                place: item.querySelector(".event-place").value,
                            });
                        });

                    document
                        .querySelectorAll("#custom-fields-list .item")
                        .forEach((item) => {
                            const key = item.querySelector(".custom-key").value;
                            const value =
                                item.querySelector(".custom-value").value;
                            if (key) newPersonData.custom_fields[key] = value;
                        });

                    if (Object.keys(newPersonData.custom_fields).length === 0) {
                        delete newPersonData.custom_fields;
                    }

                    if (isNewPerson) {
                        people.push(newPersonData);
                    } else {
                        const personIndex = people.findIndex(
                            (p) => p.id === id
                        );
                        people[personIndex] = newPersonData;
                    }

                    renderPeopleList();
                    renderFamiliesList(); // Update in case name changed
                    showPersonForm(id);
                    alert("Person saved!");
                }

                function deletePerson() {
                    const id = document.getElementById("person-id").value;
                    console.log("id", id);
                    if (!id) {
                        alert("No person selected to delete.");
                        return;
                    }
                    if (
                        confirm(
                            "Are you sure you want to delete this person? This will also remove them from any family they are a partner in."
                        )
                    ) {
                        // Remove the person from the main people list
                        people = people.filter((p) => p.id !== id);

                        // Remove any family where this person was a partner
                        families = families.filter(
                            (f) => !f.partners.includes(id)
                        );

                        // Remove the person from any children lists in other families
                        families.forEach((f) => {
                            if (f.children) {
                                f.children = f.children.filter(
                                    (childId) => childId !== id
                                );
                            }
                        });

                        renderPeopleList();
                        renderFamiliesList();
                        hideAllForms();
                        welcomeMessage.style.display = "block";
                    }
                }
                function saveFamily(e) {
                    e.preventDefault();
                    const id = document.getElementById("family-id").value;
                    const isNewFamily = !id;

                    const partner1Id =
                        document.getElementById("family-partner1").value;
                    const partner2Id =
                        document.getElementById("family-partner2").value;

                    if (!partner1Id || !partner2Id) {
                        alert(
                            "Please select both partners to create or save a family."
                        );
                        return;
                    }

                    const newId = `f_${partner1Id}_${partner2Id}`;

                    // Check for conflicts before saving
                    if (isNewFamily && families.some((f) => f.id === newId)) {
                        alert("A family with these partners already exists.");
                        return;
                    }
                    if (
                        !isNewFamily &&
                        id !== newId &&
                        families.some((f) => f.id === newId)
                    ) {
                        alert(
                            "Cannot change partners, because a family with the new partners already exists."
                        );
                        return;
                    }

                    const childrenOptions =
                        document.getElementById("family-children").options;
                    const selectedChildren = [];
                    for (let i = 0; i < childrenOptions.length; i++) {
                        if (childrenOptions[i].selected)
                            selectedChildren.push(childrenOptions[i].value);
                    }

                    const newFamilyData = {
                        id: newId, // Always use the new ID based on partners
                        partners: [partner1Id, partner2Id],
                        children: selectedChildren,
                    };

                    if (isNewFamily) {
                        families.push(newFamilyData);
                    } else {
                        const familyIndex = families.findIndex(
                            (f) => f.id === id
                        );
                        if (familyIndex !== -1) {
                            families[familyIndex] = newFamilyData;
                        }
                    }

                    renderFamiliesList();
                    showFamilyForm(newId); // Show the form with the new/correct ID
                    alert("Family saved!");
                }

                function deleteFamily() {
                    const id = document.getElementById("family-id").value;
                    if (!id) {
                        alert("No family selected to delete.");
                        return;
                    }
                    if (
                        confirm(
                            "Are you sure you want to delete this family relationship?"
                        )
                    ) {
                        families = families.filter((f) => f.id !== id);
                        renderFamiliesList();
                        hideAllForms();
                        welcomeMessage.style.display = "block";
                    }
                }

                // --- Export ---
                function exportYAML() {
                    const dataToExport = {
                        people: people,
                        families: families,
                    };
                    const yamlString = jsyaml.dump(dataToExport, {
                        indent: 4,
                        skipInvalid: true,
                    });

                    const blob = new Blob([yamlString], { type: "text/yaml" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "my_tree.yml";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                // --- Event Listeners ---
                function setupEventListeners() {
                    document
                        .getElementById("add-person-btn")
                        .addEventListener("click", () => showPersonForm());
                    document
                        .getElementById("add-family-btn")
                        .addEventListener("click", () => showFamilyForm());
                    document
                        .getElementById("add-event-btn")
                        .addEventListener("click", () => addEventField());
                    document
                        .getElementById("add-custom-field-btn")
                        .addEventListener("click", () => addCustomField());
                    personForm.addEventListener("submit", savePerson);
                    familyForm.addEventListener("submit", saveFamily);
                    document
                        .getElementById("delete-person-btn")
                        .addEventListener("click", deletePerson);
                    document
                        .getElementById("delete-family-btn")
                        .addEventListener("click", deleteFamily);
                    document
                        .getElementById("export-btn")
                        .addEventListener("click", exportYAML);
                    document
                        .getElementById("family-partner1")
                        .addEventListener("change", () =>
                            updateChildrenOptions()
                        );
                    document
                        .getElementById("family-partner2")
                        .addEventListener("change", () =>
                            updateChildrenOptions()
                        );
                }

                // --- Start App ---
                loadData();
            });
        