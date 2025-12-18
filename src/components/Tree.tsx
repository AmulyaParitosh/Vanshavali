import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { GraphNode } from "../types/graph";
import type { Person } from "../types/person";
import { TREE_CONFIG } from "../constants";

interface TreeProps {
  data: GraphNode | null;
}

const Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const getRandomPastelColor = () => {
    return d3.hsl(Math.random() * 360, 0.7, 0.8).hex();
  };

  function createDetailsHtml(person: Person) {
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
    if (data && svgRef.current) {
      const { NODE_WIDTH, NODE_HEIGHT, NODE_RADIUS, PARTNER_OFFSET, DETAILS_CARD, STYLES } = TREE_CONFIG;

      const root = d3.hierarchy<GraphNode>(data);
      const treeLayout = d3.tree<GraphNode>().nodeSize([NODE_WIDTH, NODE_HEIGHT]);
      const descendants = treeLayout(root).descendants();

      const svg = d3
        .select(svgRef.current)
        .attr("width", "100%")
        .attr("height", "100%")
        .style("cursor", "grab");

      svg.selectAll("*").remove();
      const g = svg.append("g");

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 2])
        .on("zoom", (event) => {
          g.attr("transform", event.transform.toString());
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
            .linkVertical<d3.HierarchyLink<GraphNode>, d3.HierarchyPointNode<GraphNode>>()
            .x((d) => d.x)
            .y((d) => d.y)
        );

      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(descendants)
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("key", (d) => d.data.id);

      // Partner group nodes
      const partnerGroups = node.filter((d) => !!d.data.isPartnerGroup);
      partnerGroups.each(function (d) {
        const group = d3.select(this);

        // Husband Node
        if (d.data.husband) {
             const husbandNode = group
            .append("g")
            .attr("class", "node")
            .attr("transform", `translate(${-PARTNER_OFFSET}, 0)`);
            const isLineage = d.data.lineageMemberId === d.data.husband.id;
             husbandNode
            .append("circle")
            .attr("r", NODE_RADIUS)
            .style("stroke", isLineage ? STYLES.COLORS.PRIMARY : STYLES.COLORS.NODE_BORDER)
            .style("stroke-width", isLineage ? STYLES.STROKE_WIDTH.LINEAGE : STYLES.STROKE_WIDTH.DEFAULT)
            .style("fill", STYLES.COLORS.FILL);
            husbandNode
            .append("image")
            .attr(
                "href",
                d.data.husband.image_url ||
                TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                    getRandomPastelColor().substring(1),
                    d.data.husband.name.official_name.substring(0, 2)
                )
            )
            .attr("x", -NODE_RADIUS)
            .attr("y", -NODE_RADIUS)
            .attr("width", NODE_RADIUS * 2)
            .attr("height", NODE_RADIUS * 2)
            .attr("clip-path", `circle(${NODE_RADIUS - 2}px at center)`);
            const husbandFo = husbandNode
            .append("foreignObject")
            .attr("width", DETAILS_CARD.WIDTH)
            .attr("height", DETAILS_CARD.HEIGHT)
            .attr("x", -NODE_RADIUS - DETAILS_CARD.WIDTH - 20 - 35) // Approximate calculation from original: -50 - 335 - 20 = -405. Details card width is 280. 335 seems large? Original was 280 width. Let's use logic: -r - 20 - width
            // Original: .attr("x", -nodeRadius - 335 - 20) with width 280.
            // 335 - 280 = 55 extra padding?
            // Let's stick to literal replacement or close to it.
            // -NODE_RADIUS - 335 - 20
            .attr("x", -NODE_RADIUS - 335 - 20)
            .attr("y", -50)
            .style("overflow", "visible");
            husbandFo
            .append("xhtml:div")
            .attr("class", "details-card")
            .html(createDetailsHtml(d.data.husband));
             group
            .append("text")
            .attr("class", "node-text-style")
            .attr("text-anchor", "middle")
            .attr("y", NODE_RADIUS + 25)
            .text(d.data.husband.name.official_name);
        }

        // Wife Node
        if (d.data.wife) {
            const wifeNode = group
            .append("g")
            .attr("class", "node")
            .attr("transform", `translate(${PARTNER_OFFSET}, 0)`);
            const isLineage = d.data.lineageMemberId === d.data.wife.id;
            wifeNode
            .append("circle")
            .attr("r", NODE_RADIUS)
            .style("stroke", isLineage ? STYLES.COLORS.PRIMARY : STYLES.COLORS.NODE_BORDER)
            .style("stroke-width", isLineage ? STYLES.STROKE_WIDTH.LINEAGE : STYLES.STROKE_WIDTH.DEFAULT)
            .style("fill", STYLES.COLORS.FILL);
            wifeNode
            .append("image")
            .attr(
                "href",
                d.data.wife.image_url ||
                TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                    getRandomPastelColor().substring(1),
                    d.data.wife.name.official_name.substring(0, 2)
                )
            )
            .attr("x", -NODE_RADIUS)
            .attr("y", -NODE_RADIUS)
            .attr("width", NODE_RADIUS * 2)
            .attr("height", NODE_RADIUS * 2)
            .attr("clip-path", `circle(${NODE_RADIUS - 2}px at center)`);
            const wifeFo = wifeNode
            .append("foreignObject")
            .attr("width", DETAILS_CARD.WIDTH)
            .attr("height", DETAILS_CARD.HEIGHT)
            .attr("x", NODE_RADIUS + 10)
            .attr("y", -50)
            .style("overflow", "visible");
            wifeFo
            .append("xhtml:div")
            .attr("class", "details-card")
            .html(createDetailsHtml(d.data.wife));
            group
            .append("text")
            .attr("class", "node-text-style")
            .attr("text-anchor", "middle")
            .attr("y", NODE_RADIUS + 45) // Original was +45
            .text(d.data.wife.name.official_name);
        }
      });

      // Single person nodes
      const singleNodes = node.filter((d) => !d.data.isPartnerGroup);
      singleNodes.attr("class", "node"); // BUG FIX: Add .node class for hover
      singleNodes
        .append("circle")
        .attr("r", NODE_RADIUS)
        .style("stroke", (d) =>
          d.data.lineageMemberId === d.data.id
            ? STYLES.COLORS.PRIMARY
            : STYLES.COLORS.NODE_BORDER
        )
        .style("stroke-width", (d) =>
          d.data.lineageMemberId === d.data.id ? STYLES.STROKE_WIDTH.LINEAGE : STYLES.STROKE_WIDTH.DEFAULT
        )
        .style("fill", STYLES.COLORS.FILL);
      singleNodes
        .append("image")
        .attr(
          "href",
          (d) =>
            d.data.image_url ||
            TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                getRandomPastelColor().substring(1),
                d.data.name.official_name.substring(0, 2)
            )
        )
        .attr("x", -NODE_RADIUS)
        .attr("y", -NODE_RADIUS)
        .attr("width", NODE_RADIUS * 2)
        .attr("height", NODE_RADIUS * 2)
        .attr("clip-path", `circle(${NODE_RADIUS - 2}px at center)`);
      singleNodes
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", NODE_RADIUS + 25)
        .text((d) => d.data.name.official_name);
      const singleFo = singleNodes
        .append("foreignObject")
        .attr("width", DETAILS_CARD.WIDTH)
        .attr("height", DETAILS_CARD.HEIGHT)
        .attr("x", NODE_RADIUS + 10)
        .attr("y", -50)
        .style("overflow", "visible");
      singleFo
        .append("xhtml:div")
        .attr("class", "details-card")
        .html((d) => createDetailsHtml(d.data));

      const initialX = svg.node()!.getBoundingClientRect().width / 2 - (root.x || 0);
      const initialY = NODE_HEIGHT / 2;
      svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY));
    }
  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default Tree;
