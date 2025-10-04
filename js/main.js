document.addEventListener("DOMContentLoaded", async () => {
    const dataPath = "family_tree.yml";

    try {
        const response = await fetch(dataPath);
        const yamlText = await response.text();
        const data = jsyaml.load(yamlText);

        const hierarchy = buildHierarchy(data);
        if (!hierarchy) {
            console.error(
                "Could not build a valid hierarchy from the data."
            );
            return;
        }

        renderTree(hierarchy);
    } catch (error) {
        console.error(
            "Error loading or processing family tree data:",
            error
        );
    }
});

function buildHierarchy(data) {
    const peopleMap = new Map(
        data.people.map((p) => [
            p.id,
            JSON.parse(JSON.stringify(p)),
        ])
    );
    const familyMap = new Map(); // Maps person ID to their family of origin
    const childrenIds = new Set();

    // First pass: identify children and their parents
    data.families.forEach((family) => {
        if (family.children) {
            const parent1 = peopleMap.get(family.partners[0]);
            const parent2 = peopleMap.get(family.partners[1]);
            const parentNames = `${parent1.name.official_name} & ${parent2.name.official_name}`;

            family.children.forEach((childId) => {
                childrenIds.add(childId);
                familyMap.set(childId, parentNames);
            });
        }
    });

    // Second pass: build the hierarchy, creating clones for complex cases
    const hierarchyMap = new Map(
        data.people.map((p) => [
            p.id,
            { ...peopleMap.get(p.id), children: [] },
        ])
    );

    data.families.forEach((family) => {
        const p1 = hierarchyMap.get(family.partners[0]);
        let p2 = hierarchyMap.get(family.partners[1]);

        // Handle cousin marriage: if partner is also a child, clone them
        if (p2 && childrenIds.has(p2.id)) {
            p2 = JSON.parse(JSON.stringify(p2)); // Deep clone
            p2.id = `${p2.id}_clone_${family.id}`; // Unique ID for the clone
            p2.isClone = true;
            p2.parents_info = familyMap.get(family.partners[1]);
            hierarchyMap.set(p2.id, p2); // Add clone to map to be found as a partner
        }

        if (p1 && p2) {
            p1.partner = p2;
            p2.partner = p1;
        }

        if (family.children) {
            family.children.forEach((childId) => {
                const child = hierarchyMap.get(childId);
                if (p1 && child) {
                    p1.children.push(child);
                }
            });
        }
    });

    // Find the single explicit root
    const rootPerson = Array.from(hierarchyMap.values()).find(
        (p) => p.root === true
    );

    if (!rootPerson) {
        console.error(
            "No person with 'root: true' found in the data."
        );
        return null;
    }

    // For consistency, if the root is part of a couple, ensure the male is the primary node in the hierarchy
    if (rootPerson.partner && rootPerson.sex === "F") {
        return hierarchyMap.get(rootPerson.partner.id);
    }

    return rootPerson;
}

function renderTree(rootData) {
    const svgElement = d3.select("#tree-container");
    const width = svgElement.node().clientWidth;
    const height = svgElement.node().clientHeight;
    const margin = { top: 80, right: 20, bottom: 80, left: 20 };

    const treeLayout = d3.tree().nodeSize([780, 220]); // Adjusted vertical spacing for new labels

    const root = d3.hierarchy(rootData);
    treeLayout(root);

    const g = svgElement.append("g");

    g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr(
            "d",
            d3
                .linkVertical()
                .x((d) => d.x)
                .y((d) => d.y)
        );

    const familyUnit = g
        .selectAll(".family-unit")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "family-unit")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    const nodeRadius = 40;
    const partnerOffset = 45;

    const couples = familyUnit.filter(
        (d) => d.data.partner && d.data.sex === "M"
    );
    couples
        .append("line")
        .attr("class", "partner-link")
        .attr("x1", -partnerOffset)
        .attr("y1", 0)
        .attr("x2", partnerOffset)
        .attr("y2", 0);

    couples
        .append("path")
        .attr("class", "heart")
        .attr(
            "d",
            "M0, -5C-10, -20, -25, -10, 0, 10C25, -10, 10, -20, 0, -5Z"
        );

    familyUnit.each(function (d) {
        const unit = d3.select(this);
        let peopleToRender = [d.data];
        if (d.data.partner && d.data.sex === "F" && !d.data.isClone)
            return;
        if (d.data.partner && d.data.sex === "M")
            peopleToRender.push(d.data.partner);

        const node = unit
            .selectAll(".node")
            .data(peopleToRender)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (p) => {
                if (p.partner) {
                    return `translate(${
                        p.sex === "M"
                            ? -partnerOffset
                            : partnerOffset
                    }, 0)`;
                }
                return `translate(0,0)`;
            })
            .on("click", (event, p) => {
                const personNode = event.currentTarget;
                const isShowing = d3
                    .select(personNode)
                    .classed("show-details");
                d3.selectAll(".node").classed(
                    "show-details",
                    false
                );
                d3.select(personNode).classed(
                    "show-details",
                    !isShowing
                );
                event.stopPropagation();
            });

        node.append("circle").attr("r", nodeRadius);

        node.append("clipPath")
            .attr("id", (p) => `clip-${p.id}`)
            .append("circle")
            .attr("r", nodeRadius - 4);

        node.append("image")
            .attr("class", "person-image")
            .attr(
                "xlink:href",
                (p) =>
                    p.image_url ||
                    "https://placehold.co/100x100/CCCCCC/FFFFFF?text=?"
            )
            .attr("clip-path", (p) => `url(#clip-${p.id})`)
            .attr("x", -nodeRadius + 4)
            .attr("y", -nodeRadius + 4)
            .attr("width", (nodeRadius - 4) * 2)
            .attr("height", (nodeRadius - 4) * 2);

        // --- REMOVED individual text nodes ---

        const foreignObject = node
            .append("foreignObject")
            .attr("width", 280)
            .attr("height", 300)
            .attr("x", (p) => {
                const gap = 15; // Increased gap from 15 to 25 for more space
                if (p.partner && p.sex === "M")
                    return -nodeRadius - 310 - gap;
                return nodeRadius + gap;
            })
            .attr("y", -60)
            .style("overflow", "visible");

        foreignObject
            .append("xhtml:div")
            .attr("class", "details-card")
            .html((p) => createDetailsHtml(p));
    });

    // --- ADDED new unified labels for singles and couples ---
    familyUnit
        .append("text")
        .attr("y", nodeRadius + 25) // Position below the node circle
        .attr("text-anchor", "middle")
        .each(function (d) {
            const textLabel = d3.select(this);
            if (d.data.partner && d.data.sex === "M") {
                const husband = d.data;
                const wife = d.data.partner;

                textLabel
                    .append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1em")
                    .text(husband.name.official_name);

                textLabel
                    .append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .style("font-family", "sans-serif")
                    .style("fill", "var(--color-primary)")
                    .text("♥");

                textLabel
                    .append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text(wife.name.official_name);
            } else if (!d.data.partner) {
                textLabel.text(d.data.name.official_name);
            }
            // Female partners are handled by the male's unit, so no 'else' is needed.
        });

    const zoom = d3
        .zoom()
        .scaleExtent([0.2, 2])
        .on("zoom", (event) =>
            g.attr("transform", event.transform)
        );

    svgElement.call(zoom);

    const initialX = width / 2 - root.x;
    const initialY = margin.top;

    const initialTransform = d3.zoomIdentity.translate(
        initialX,
        initialY
    );

    svgElement.call(zoom.transform, initialTransform);

    svgElement.on("click", () =>
        d3.selectAll(".node").classed("show-details", false)
    );
}

function createDetailsHtml(person) {
    let html = `<h3>${person.name.official_name}</h3>`;

    if (person.parents_info) {
        html += `<div class="parents-info"><strong>Parents:</strong> ${person.parents_info}</div>`;
    }

    if (person.name.aliases && person.name.aliases.length > 0) {
        html += `<div class="aliases">${person.name.aliases.join(
            ", "
        )}</div>`;
    }
    if (person.events && person.events.length > 0) {
        person.events.forEach((event) => {
            html += `<div class="event"><strong>${
                event.type
            }:</strong> ${event.date || ""}<br/><em>${
                event.place || ""
            }</em></div>`;
        });
    }
    if (person.custom_fields) {
        for (const [key, value] of Object.entries(
            person.custom_fields
        )) {
            html += `<div class="custom-field"><strong>${
                key.charAt(0).toUpperCase() + key.slice(1)
            }:</strong> ${value}</div>`;
        }
    }
    return html;
}
