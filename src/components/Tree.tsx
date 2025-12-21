import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { stringToColor, getNameInitials } from "../utils/colorUtils";
import type { GraphNode } from "../types/graph";
import type { Person } from "../types/person";
import { TREE_CONFIG } from "../constants";
import TreeSearch from "./TreeSearch";
import { useAppContext } from "../context/AppContext";

interface TreeProps {
  data: GraphNode | null;
}

const Tree: React.FC<TreeProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { treeData, user } = useAppContext();
  const [lockedNodeId, setLockedNodeId] = useState<string | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const nodesRef = useRef<d3.HierarchyPointNode<GraphNode>[]>([]);


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

    const canEdit = user?.role === 'admin' || user?.role === 'editor';
    if (canEdit) {
        html += `<div class="card-actions" style="margin-top: 15px; text-align: right; border-top: 1px solid #eee; padding-top: 10px;">
          <a href="/people?id=${person.id}" class="btn-edit-card" style="display: inline-block; padding: 6px 12px; background: var(--color-primary); color: white; text-decoration: none; border-radius: 20px; font-size: 12px; font-weight: 600;">EDIT INFO</a>
        </div>`;
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

      // Capture current transform before clearing
      const currentTransform = d3.zoomTransform(svgRef.current);

      svg.selectAll("*").remove();
      const g = svg.append("g");

      // Traditional Tree Trunk Background Motif
      g.append("path")
        .attr("d", "M-20,600 Q0,300 20,600 Z M-10,300 Q0,0 10,300 Z")
        .attr("fill", "var(--color-primary)")
        .attr("fill-opacity", "0.03")
        .attr("transform", "translate(0, 100)");

      // Decorative Corners (Mithila Patterns)
      const corners = [
        "M0,50 L50,0 M10,50 L50,10 M20,50 L50,20", // Top Left
      ];
      
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 2])
        .on("zoom", (event) => {
          g.attr("transform", event.transform.toString());
        });

      svg.call(zoom);
      zoomRef.current = zoom;
      gRef.current = g;

      const linkGroup = g.append("g")
        .attr("class", "links");

      const links = linkGroup.selectAll("path")
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

      // Add leafy motifs along the paths
      links.each(function() {
        const path = this as SVGPathElement;
        const length = path.getTotalLength();
        const leavesGroup = linkGroup.append("g").attr("class", "leaves");
      });

      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(descendants)
        .join("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("key", (d) => d.data.id)
        .on("mouseenter", function() {
          d3.select(this).raise();
        });

      nodesRef.current = descendants;

      // Partner group nodes
      const partnerGroups = node.filter((d) => !!d.data.isPartnerGroup);
      partnerGroups.each(function (d) {
        const group = d3.select(this);
        const isWifeLineage = d.data.lineageMemberId === d.data.wife?.id;

        const renderHusband = () => {
             // Husband Node
             if (d.data.husband) {
                 const husbandNode = group
                .append("g")
                .attr("class", "node")
                .attr("transform", `translate(${-PARTNER_OFFSET}, 0)`);
                const isLineage = d.data.lineageMemberId === d.data.husband.id;
                const hasParent = isLineage && d.depth > 0;

                // Border Image
                husbandNode.append("image")
                    .attr("href", "/node_border.png")
                    .attr("x", -NODE_RADIUS * 1.3)
                    .attr("y", -NODE_RADIUS * 1.3)
                    .attr("width", NODE_RADIUS * 2.6)
                    .attr("height", NODE_RADIUS * 2.6);

                husbandNode
                .append("circle")
                .attr("r", NODE_RADIUS)
                .style("stroke", "none")
                .style("fill", STYLES.COLORS.FILL);
                husbandNode
                .append("image")
                .attr(
                    "href",
                    d.data.husband.image_url ||
                    TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                        stringToColor(d.data.husband.id || d.data.husband.name.official_name).substring(1),
                        getNameInitials(d.data.husband.name.official_name)
                    )
                )
                .attr("x", -NODE_RADIUS)
                .attr("y", -NODE_RADIUS)
                .attr("width", NODE_RADIUS * 2)
                .attr("height", NODE_RADIUS * 2)
                .attr("clip-path", `circle(${NODE_RADIUS}px at center)`);
                
                // Profile Border Ring (Overlay)
                husbandNode.append("circle")
                    .attr("r", NODE_RADIUS)
                    .style("fill", "none")
                    .style("stroke", hasParent ? "var(--color-primary)" : "var(--color-secondary)") // Primary vs Secondary
                    .style("stroke-width", "4px");
                const husbandFo = husbandNode
                .append("foreignObject")
                .attr("width", DETAILS_CARD.WIDTH)
                .attr("height", DETAILS_CARD.HEIGHT)
                .attr("x", -NODE_RADIUS - 335 - 20)
                .attr("y", -50)
                .style("overflow", "visible")
                .style("pointer-events", "none");
                husbandFo
                .append("xhtml:div")
                .attr("class", "details-card")
                .html(createDetailsHtml(d.data.husband));

                // Bridge Rect
                husbandNode.append("rect")
                    .attr("x", -NODE_RADIUS - 335 - 20 + DETAILS_CARD.WIDTH)
                    .attr("y", -50)
                    .attr("width", (-NODE_RADIUS) - (-NODE_RADIUS - 335 - 20 + DETAILS_CARD.WIDTH)) // from card end to node start
                    .attr("height", DETAILS_CARD.HEIGHT)
                    .attr("fill", "transparent");

                husbandNode.attr("data-id", d.data.husband.id);
                husbandNode.on("click", (e) => {
                    e.stopPropagation();
                    const id = d.data.husband?.id;
                    if(id) setLockedNodeId(prev => prev === id ? null : id);
                });

                const husbandText = group
                .append("text")
                .attr("class", "node-text-style")
                .attr("text-anchor", "middle")
                .attr("x", 0)
                .attr("y", NODE_RADIUS + 50)
                .text(d.data.husband.name.official_name)
                .style("font-weight", "600")
                .style("fill", "#333");

                husbandText.each(function() {
                    const bbox = this.getBBox();
                    const paddingX = 10;
                    const paddingY = 4;
                    group.insert("rect", "text")
                         .attr("x", bbox.x - paddingX)
                         .attr("y", bbox.y - paddingY)
                         .attr("width", bbox.width + paddingX * 2)
                         .attr("height", bbox.height + paddingY * 2)
                         .attr("rx", 10)
                         .attr("ry", 10)
                         .attr("fill", "rgba(255, 255, 255, 0.9)");
                });
            }
        };

        const renderWife = () => {
             // Wife Node
             if (d.data.wife) {
                 const wifeNode = group
                 .append("g")
                 .attr("class", "node")
                 .attr("transform", `translate(${PARTNER_OFFSET}, 0)`);
                 const isLineage = d.data.lineageMemberId === d.data.wife.id;
                 const hasParent = isLineage && d.depth > 0;

                 // Border Image
                 wifeNode.append("image")
                     .attr("href", "/node_border.png")
                     .attr("x", -NODE_RADIUS * 1.3)
                     .attr("y", -NODE_RADIUS * 1.3)
                     .attr("width", NODE_RADIUS * 2.6)
                     .attr("height", NODE_RADIUS * 2.6);

                 wifeNode
                 .append("circle")
                 .attr("r", NODE_RADIUS)
                 .style("stroke", "none")
                 .style("fill", STYLES.COLORS.FILL);
                 wifeNode
                 .append("image")
                 .attr(
                     "href",
                     d.data.wife.image_url ||
                     TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                         stringToColor(d.data.wife.id || d.data.wife.name.official_name).substring(1),
                         getNameInitials(d.data.wife.name.official_name)
                     )
                 )
                 .attr("x", -NODE_RADIUS)
                 .attr("y", -NODE_RADIUS)
                 .attr("width", NODE_RADIUS * 2)
                 .attr("height", NODE_RADIUS * 2)
                 .attr("clip-path", `circle(${NODE_RADIUS}px at center)`);

                 // Profile Border Ring (Overlay)
                 wifeNode.append("circle")
                     .attr("r", NODE_RADIUS)
                     .style("fill", "none")
                     .style("stroke", hasParent ? "var(--color-primary)" : "var(--color-secondary)") // Primary vs Secondary
                     .style("stroke-width", "4px");
                 const wifeFo = wifeNode
                 .append("foreignObject")
                 .attr("width", DETAILS_CARD.WIDTH)
                 .attr("height", DETAILS_CARD.HEIGHT)
                 .attr("x", NODE_RADIUS + 10)
                 .attr("y", -50)
                 .style("overflow", "visible")
                 .style("pointer-events", "none");
                 wifeFo
                 .append("xhtml:div")
                 .attr("class", "details-card")
                 .html(createDetailsHtml(d.data.wife));
                 
                 // Bridge Rect
                 wifeNode.append("rect")
                     .attr("x", NODE_RADIUS)
                     .attr("y", -50)
                     .attr("width", 10)
                     .attr("height", DETAILS_CARD.HEIGHT)
                     .attr("fill", "transparent");

                 wifeNode.attr("data-id", d.data.wife.id);
                 wifeNode.on("click", (e) => {
                     e.stopPropagation();
                     const id = d.data.wife?.id;
                     if(id) setLockedNodeId(prev => prev === id ? null : id);
                 });

                   const wifeText = group
                  .append("text")
                  .attr("class", "node-text-style")
                  .attr("text-anchor", "middle")
                  .attr("x", 0)
                  .attr("y", NODE_RADIUS + 72)
                  .text(d.data.wife.name.official_name)
                  .style("font-weight", "600")
                  .style("fill", "#333");

                  wifeText.each(function() {
                    const bbox = this.getBBox();
                    const paddingX = 10;
                    const paddingY = 4;
                    group.insert("rect", "text")
                         .attr("x", bbox.x - paddingX)
                         .attr("y", bbox.y - paddingY)
                         .attr("width", bbox.width + paddingX * 2)
                         .attr("height", bbox.height + paddingY * 2)
                         .attr("rx", 10)
                         .attr("ry", 10)
                         .attr("fill", "rgba(255, 255, 255, 0.9)");
                  });
             }
         };

         // If Wife is lineage (has parent), she should be ON TOP.
         // In SVG, the last appended element is on top.
         // So if isWifeLineage is TRUE, we render Husband FIRST, then Wife.
         // If isWifeLineage is FALSE (Husband is lineage), we render Wife FIRST, then Husband.
         
         if (isWifeLineage) {
             renderHusband();
             renderWife();
         } else {
             renderWife();
             renderHusband();
         }
      });

      // Single person nodes
      const singleNodes = node.filter((d) => !d.data.isPartnerGroup);
      singleNodes.attr("class", "node"); // BUG FIX: Add .node class for hover
      singleNodes.attr("data-id", (d) => d.data.id);
      singleNodes.on("click", (event, d) => {
          event.stopPropagation();
          setLockedNodeId(prev => prev === d.data.id ? null : d.data.id);
      });

      singleNodes.each(function(d) {
         const nodeGroup = d3.select(this);
         const isLineage = d.data.lineageMemberId === d.data.id;
         const hasParent = isLineage && d.depth > 0;
         
         // Border Image
         nodeGroup.append("image")
            .attr("href", "/node_border.png")
            .attr("x", -NODE_RADIUS * 1.3)
            .attr("y", -NODE_RADIUS * 1.3)
            .attr("width", NODE_RADIUS * 2.6)
            .attr("height", NODE_RADIUS * 2.6);
            
         nodeGroup.append("circle")
            .attr("r", NODE_RADIUS)
            .style("stroke", "none")
            .style("fill", STYLES.COLORS.FILL);

         nodeGroup.append("image")
            .attr(
            "href",
            d.data.image_url ||
            TREE_CONFIG.PLACEHOLDER_IMAGE_URL(
                stringToColor(d.data.id || d.data.name.official_name).substring(1),
                getNameInitials(d.data.name.official_name)
            )
            )
            .attr("x", -NODE_RADIUS)
            .attr("y", -NODE_RADIUS)
            .attr("width", NODE_RADIUS * 2)
            .attr("height", NODE_RADIUS * 2)
            .attr("clip-path", `circle(${NODE_RADIUS}px at center)`);

         // Profile Border Ring (Overlay)
         nodeGroup.append("circle")
            .attr("r", NODE_RADIUS)
            .style("fill", "none")
            .style("stroke", hasParent ? "var(--color-primary)" : "var(--color-secondary)") // Primary vs Secondary
            .style("stroke-width", "4px");
      });
       const singleText = singleNodes
        .append("text")
        .attr("text-anchor", "middle")
        .attr("y", NODE_RADIUS + 50)
        .text((d) => d.data.name.official_name)
        .style("font-weight", "600")
        .style("fill", "#333");
       
       singleText.each(function(d) {
           const bbox = this.getBBox();
           const paddingX = 10;
           const paddingY = 4;
           d3.select(this.parentNode as any).insert("rect", "text")
                .attr("x", bbox.x - paddingX)
                .attr("y", bbox.y - paddingY)
                .attr("width", bbox.width + paddingX * 2)
                .attr("height", bbox.height + paddingY * 2)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("fill", "rgba(255, 255, 255, 0.9)");
       });
      
      // Bridge Rect
      singleNodes.append("rect")
        .attr("x", NODE_RADIUS)
        .attr("y", -50)
        .attr("width", 10)
        .attr("height", DETAILS_CARD.HEIGHT)
        .attr("fill", "transparent");

      const singleFo = singleNodes
        .append("foreignObject")
        .attr("width", DETAILS_CARD.WIDTH)
        .attr("height", DETAILS_CARD.HEIGHT)
        .attr("x", NODE_RADIUS + 10)
        .attr("y", -50)
        .style("overflow", "visible")
        .style("pointer-events", "none");
      singleFo
        .append("xhtml:div")
        .attr("class", "details-card")
        .html((d) => createDetailsHtml(d.data));

      // Apply previous transform or initial center
      if (currentTransform && (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0)) {
        svg.call(zoom.transform, currentTransform);
      } else {
        const initialX = svg.node()!.getBoundingClientRect().width / 2 - (root.x || 0);
        const initialY = NODE_HEIGHT / 2;
        svg.call(zoom.transform, d3.zoomIdentity.translate(initialX, initialY));
      }
    }
  }, [data, user]); // Depend on user for createDetailsHtml

  useEffect(() => {
      // Update locked state on nodes
      if (svgRef.current) {
          d3.select(svgRef.current).selectAll(".node").each(function() {
             const node = d3.select(this);
             const id = node.attr("data-id");
             node.classed("locked", id === lockedNodeId);
          });
      }
  }, [lockedNodeId, data]);

  const handleSelectPerson = (person: Person) => {
    if (!svgRef.current || !zoomRef.current || !gRef.current || !nodesRef.current.length) return;

    // Find the node that contains this person
    const targetNode = nodesRef.current.find(d => {
      if (d.data.isPartnerGroup) {
        return d.data.husband?.id === person.id || d.data.wife?.id === person.id;
      }
      return d.data.id === person.id;
    });

    if (targetNode) {
      const svg = d3.select(svgRef.current);
      const width = svgRef.current.getBoundingClientRect().width;
      const height = svgRef.current.getBoundingClientRect().height;

      // Calculate offset if it's a partner in a partner group
      let xOffset = 0;
      if (targetNode.data.isPartnerGroup) {
        if (targetNode.data.husband?.id === person.id) {
          xOffset = -TREE_CONFIG.PARTNER_OFFSET;
        } else if (targetNode.data.wife?.id === person.id) {
          xOffset = TREE_CONFIG.PARTNER_OFFSET;
        }
      }

      const x = targetNode.x + xOffset;
      const y = targetNode.y;


      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(1.2) // Zoom in a bit on the person
        .translate(-x, -y);

      svg.transition()
        .duration(750)
        .call(zoomRef.current.transform, transform);
      
      // Optionally highlight the node briefly (standard d3 way)
      // We could add a temporary class or style but let's keep it simple first
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TreeSearch 
        people={treeData?.people || []} 
        onSelectPerson={handleSelectPerson} 
      />
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }}></svg>
    </div>
  );
};

export default Tree;
