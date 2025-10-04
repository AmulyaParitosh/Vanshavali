import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const Tree = ({ data }) => {
  const svgRef = useRef();

  const getRandomPastelColor = () => {
    return `hsl(${Math.random() * 360}, 70%, 80%)`;
  };

  function createDetailsHtml(person) {
    let html = `<h3>${person.name.official_name}</h3>`;

    if (person.name.aliases && person.name.aliases.length > 0) {
      html += `<div class="aliases">${person.name.aliases.join(", ")}</div>`;
    }

    if (person.events && person.events.length > 0) {
      person.events.forEach((event) => {
        html += `<div class="event"><strong>${event.type}:</strong> ${
          event.date || ""
        }<br/><em>${event.place || ""}</em></div>`;
      });
    }

    if (person.custom_fields) {
      for (const [key, value] of Object.entries(person.custom_fields)) {
        html += `<div class="custom-field"><strong>${
          key.charAt(0).toUpperCase() + key.slice(1)
        }:</strong> ${value}</div>`;
      }
    }
    return html;
  }

  useEffect(() => {
    if (data) {
      const nodeWidth = 800; // Increased to prevent popup overlap
      const nodeHeight = 300;

      const root = d3.hierarchy(data);
      const treeLayout = d3.tree().nodeSize([nodeWidth, nodeHeight]);
      const descendants = treeLayout(root).descendants();

      const svg = d3
        .select(svgRef.current)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("cursor", "grab");

      svg.selectAll("*").remove();
      const g = svg.append("g");

      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 2])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);

      g.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("class", "link")
        .attr(
          "d",
          d3
            .linkVertical()
            .x((d) => d.x)
            .y((d) => d.y)
        );

      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(descendants)
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      const nodeRadius = 50;

      // Partner group nodes
      const partnerGroups = node.filter((d) => d.data.isPartnerGroup);
      partnerGroups.each(function (d) {
        const group = d3.select(this);
        const partnerOffset = 45;

        const husbandNode = group
          .append("g")
          .attr("class", "node")
          .attr("transform", `translate(${-partnerOffset}, 0)`);
        husbandNode
          .append("circle")
          .attr("r", nodeRadius)
          .style("stroke", "var(--color-node-border)")
          .style("stroke-width", "3px")
          .style("fill", "white");
        husbandNode
          .append("image")
          .attr(
            "href",
            d.data.husband.image_url ||
              `https://placehold.co/100x100/${getRandomPastelColor().substring(
                1
              )}/FFFFFF?text=${d.data.husband.name.official_name.substring(
                0,
                2
              )}`
          )
          .attr("x", -nodeRadius)
          .attr("y", -nodeRadius)
          .attr("width", nodeRadius * 2)
          .attr("height", nodeRadius * 2)
          .attr("clip-path", `circle(${nodeRadius - 2}px at center)`);
        const husbandFo = husbandNode
          .append("foreignObject")
          .attr("width", 280)
          .attr("height", 300)
          .attr("x", -nodeRadius - 280 - 10)
          .attr("y", -60)
          .style("overflow", "visible");
        husbandFo
          .append("xhtml:div")
          .attr("class", "details-card")
          .html(createDetailsHtml(d.data.husband));

        const wifeNode = group
          .append("g")
          .attr("class", "node")
          .attr("transform", `translate(${partnerOffset}, 0)`);
        wifeNode
          .append("circle")
          .attr("r", nodeRadius)
          .style("stroke", "var(--color-node-border)")
          .style("stroke-width", "3px")
          .style("fill", "white");
        wifeNode
          .append("image")
          .attr(
            "href",
            d.data.wife.image_url ||
              `https://placehold.co/100x100/${getRandomPastelColor().substring(
                1
              )}/FFFFFF?text=${d.data.wife.name.official_name.substring(0, 2)}`
          )
          .attr("x", -nodeRadius)
          .attr("y", -nodeRadius)
          .attr("width", nodeRadius * 2)
          .attr("height", nodeRadius * 2)
          .attr("clip-path", `circle(${nodeRadius - 2}px at center)`);
        const wifeFo = wifeNode
          .append("foreignObject")
          .attr("width", 280)
          .attr("height", 300)
          .attr("x", nodeRadius + 10)
          .attr("y", -60)
          .style("overflow", "visible");
        wifeFo
          .append("xhtml:div")
          .attr("class", "details-card")
          .html(createDetailsHtml(d.data.wife));

        group
          .append("text")
          .text("♥")
          .attr("class", "heart")
          .attr("text-anchor", "middle")
          .attr("y", 5)
          .style("font-size", "24px")
          .style("fill", "var(--color-primary)");

        group
          .append("text")
          .attr("text-anchor", "middle")
          .attr("y", nodeRadius + 25)
          .html(
            `${d.data.husband.name.official_name} &amp; ${d.data.wife.name.official_name}`
          );
      });

      // Single person nodes
      const singleNodes = node.filter((d) => !d.data.isPartnerGroup);
      singleNodes.attr("class", "node"); // BUG FIX: Add .node class for hover
      singleNodes
        .append("circle")
        .attr("r", nodeRadius)
        .style("stroke", "var(--color-node-border)")
        .style("stroke-width", "3px")
        .style("fill", "white");
      singleNodes
        .append("image")
        .attr(
          "href",
          (d) =>
            d.data.image_url ||
            `https://placehold.co/100x100/${getRandomPastelColor().substring(
              1
            )}/FFFFFF?text=${d.data.name.official_name.substring(0, 2)}`
        )
        .attr("x", -nodeRadius)
        .attr("y", -nodeRadius)
        .attr("width", nodeRadius * 2)
        .attr("height", nodeRadius * 2)
        .attr("clip-path", `circle(${nodeRadius - 2}px at center)`);
      singleNodes
        .append("text")
        .text((d) => d.data.name.official_name)
        .attr("text-anchor", "middle")
        .attr("y", nodeRadius + 25);
      const singleFo = singleNodes
        .append("foreignObject")
        .attr("width", 280)
        .attr("height", 300)
        .attr("x", nodeRadius + 10)
        .attr("y", -60)
        .style("overflow", "visible");
      singleFo
        .append("xhtml:div")
        .attr("class", "details-card")
        .html((d) => createDetailsHtml(d.data));

      const initialX = svg.node().getBoundingClientRect().width / 2 - root.x;
      const initialY = nodeHeight / 2;
      svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY));
    }
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default Tree;
