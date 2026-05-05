import dagre from 'dagre';
import { Position } from 'reactflow';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR' || direction === 'SWIMLANE';
  const isSwimlane = direction === 'SWIMLANE';
  
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: isSwimlane ? 'LR' : direction, // Internal flow is LR for swimlanes
    ranksep: 180,
    nodesep: 120,
    marginx: 100,
    marginy: 100
  });

  // 1. Sizing
  const nodeDimensions = {
    stepNode: { width: 300, height: 120 },
    processNode: { width: 300, height: 120 },
    decisionNode: { width: 140, height: 140 },
    agentNode: { width: 340, height: 220 },
    agentGroupNode: { width: 1200, height: 400 },
  };

  nodes.forEach((node) => {
    const dim = nodeDimensions[node.type] || { width: 280, height: 100 };
    dagreGraph.setNode(node.id, { width: dim.width, height: dim.height });
    if (node.parentNode) {
      dagreGraph.setParent(node.id, node.parentNode);
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  // --- Swimlane Stacking Logic ---
  let laneYOffsets = new Map();
  if (isSwimlane) {
    const parentNodes = nodes.filter(n => !n.parentNode && (n.type === 'agentGroupNode' || dagreGraph.children(n.id).length > 0));
    let currentY = 100;
    parentNodes.forEach((parent) => {
      laneYOffsets.set(parent.id, currentY);
      const parentDagre = dagreGraph.node(parent.id);
      currentY += parentDagre.height + 150; // Space between lanes
    });
  }

  // 3. Map back to React Flow
  const layoutedNodes = nodes.map((node) => {
    const nodeData = dagreGraph.node(node.id);
    const parentId = node.parentNode;
    const parentData = parentId ? dagreGraph.node(parentId) : null;

    let x = nodeData.x - nodeData.width / 2;
    let y = nodeData.y - nodeData.height / 2;

    let relativeY = 0;
    if (isSwimlane && parentId && laneYOffsets.has(parentId)) {
      // Keep Dagre's X, but use our stacked Y
      const originalParentY = parentData.y - parentData.height / 2;
      relativeY = y - originalParentY;
      y = laneYOffsets.get(parentId) + relativeY + 60; // Reduced top offset for sidebar layout
    } else if (isSwimlane && !parentId && laneYOffsets.has(node.id)) {
      y = laneYOffsets.get(node.id);
    }

    const res = {
      ...node,
      position: {
        // Offset into group padding - 240 for Wide Sidebar, 60 for consistent TOP margin
        x: parentData ? x - (parentData.x - parentData.width / 2) + (isSwimlane ? 240 : 120) : x,
        y: parentData ? (isSwimlane ? relativeY + 60 : y - (parentData.y - parentData.height / 2) + 120) : y,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    };

    if (dagreGraph.children(node.id).length > 0) {
      res.style = {
        ...node.style,
        width: isSwimlane ? 2400 : nodeData.width + 250, // More width for sidebar
        height: nodeData.height + 160, // Adjusted for less top padding
      };
    }

    return res;
  });

  return { nodes: layoutedNodes, edges };
};
