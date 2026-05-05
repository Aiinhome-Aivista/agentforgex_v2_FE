import React from "react";
import {
  Network,
  Bot,
  Server,
  GitBranch,
  Database,
  Activity,
  Bell,
  FileCheck,
  ScrollText,
  Box,
} from "lucide-react";

// Canvas Constants
export const LANE_HEIGHT = 170;
export const LANE_PADDING_TOP = 48;
export const NODE_W = 210;
export const NODE_H = 84;
export const CANVAS_W = 1400;

// Edge transport styling
export const EDGE_STYLES = {
  "sync API": { color: "#38bdf8", dashed: false, label: "SYNC API" },
  "async event": { color: "#a78bfa", dashed: true, label: "ASYNC EVENT" },
  "DB write": { color: "#fb923c", dashed: false, label: "DB WRITE" },
  "DB read/write": { color: "#fb923c", dashed: false, label: "DB READ/WRITE" },
};

export function getIcon(label = "", id = "") {
  const text = (label + " " + id).toLowerCase();
  if (text.includes("sap") || text.includes("erp") || text.includes("connector")) return Network;
  if (text.includes("agent") || text.includes("validation") || text.includes("conversion") || text.includes("handler")) return Bot;
  if (text.includes("gateway") || text.includes("kong") || text.includes("nginx")) return Server;
  if (text.includes("orchestrator") || text.includes("stateful")) return GitBranch;
  if (text.includes("redis") || text.includes("postgres") || text.includes("sql") || text.includes("db") || text.includes("database")) return Database;
  if (text.includes("kafka") || text.includes("stream") || text.includes("activity") || text.includes("event")) return Activity;
  if (text.includes("notification") || text.includes("bell") || text.includes("alert")) return Bell;
  if (text.includes("update") || text.includes("file") || text.includes("check")) return FileCheck;
  if (text.includes("audit") || text.includes("scroll") || text.includes("log")) return ScrollText;
  if (text.includes("kubernetes") || text.includes("cluster") || text.includes("box") || text.includes("container")) return Box;
  return Server;
}

export function transformData(apiData) {
  const nodes = apiData.nodes || [];
  const edges = apiData.edges || [];

  const layers = [
    { id: "ingress", title: "INGRESS", accent: "#38bdf8", nodes: [] },
    { id: "orchestration", title: "ORCHESTRATION", accent: "#a78bfa", nodes: [] },
    { id: "agents", title: "AGENTS", accent: "#f472b6", nodes: [] },
    { id: "data", title: "DATA & INFRA", accent: "#fb923c", nodes: [] },
    { id: "output", title: "OUTPUT", accent: "#22c55e", nodes: [] },
  ];

  const nodeMeta = {};
  const runSequence = [];
  const processedNodes = new Set();
  const edgesByTarget = {};
  edges.forEach(e => {
    if (!edgesByTarget[e.target]) edgesByTarget[e.target] = [];
    edgesByTarget[e.target].push(e);
  });

  nodes.forEach(node => {
    const type = node.type?.toLowerCase();
    const id = node.id?.toLowerCase();
    const label = node.data?.label || "";

    // Map Layers
    let layerId = "data";
    if (type === "input" || id.includes("gateway")) layerId = "ingress";
    else if (id.includes("orchestrator")) layerId = "orchestration";
    else if (type === "agent" || label.toLowerCase().includes("agent")) layerId = "agents";
    else if (type === "output") layerId = "output";
    else if (type === "system") {
      if (id.includes("kafka") || id.includes("redis") || id.includes("postgres") || id.includes("kubernetes") || id.includes("db")) layerId = "data";
      else layerId = "ingress"; // Fallback for other system nodes
    }

    const layer = layers.find(l => l.id === layerId);
    if (layer) layer.nodes.push(node.id);

    // Map Meta
    nodeMeta[node.id] = { icon: getIcon(label, node.id) };
  });

  // Simple Run Sequence Heuristic
  const layersOrder = ["ingress", "orchestration", "agents", "data", "output"];
  layersOrder.forEach(lId => {
    const layer = layers.find(l => l.id === lId);
    layer.nodes.forEach(nodeId => {
      if (processedNodes.has(nodeId)) return;

      const incomingEdges = edgesByTarget[nodeId] || [];
      const edgeId = incomingEdges[0]?.id || null;

      runSequence.push({ node: nodeId, edge: edgeId });
      processedNodes.add(nodeId);
    });
  });

  return { workflow: apiData, layers: layers.filter(l => l.nodes.length > 0), nodeMeta, runSequence };
}

export function computeLayout(layers) {
  const positions = {};
  const laneBounds = [];

  layers.forEach((layer, laneIdx) => {
    const y = laneIdx * LANE_HEIGHT + LANE_PADDING_TOP;
    const count = layer.nodes.length;
    // distribute evenly across canvas width
    const horizontalPadding = 100;
    const usable = CANVAS_W - horizontalPadding * 2;
    const step = count === 1 ? 0 : usable / (count - 1);

    layer.nodes.forEach((nodeId, i) => {
      const x = count === 1 ? CANVAS_W / 2 - NODE_W / 2 : horizontalPadding + i * step - NODE_W / 2;
      positions[nodeId] = { x, y, laneIdx };
    });

    laneBounds.push({
      id: layer.id,
      title: layer.title,
      accent: layer.accent,
      yTop: laneIdx * LANE_HEIGHT + 8,
      yBottom: (laneIdx + 1) * LANE_HEIGHT + 8,
    });
  });

  return { positions, laneBounds, canvasHeight: layers.length * LANE_HEIGHT + 32 };
}

export function getPorts(pos) {
  return {
    top: { x: pos.x + NODE_W / 2, y: pos.y },
    bottom: { x: pos.x + NODE_W / 2, y: pos.y + NODE_H },
    left: { x: pos.x, y: pos.y + NODE_H / 2 },
    right: { x: pos.x + NODE_W, y: pos.y + NODE_H / 2 },
  };
}

export function buildEdgePath(edge, positions, edgeIndex, totalSameDirection) {
  const src = positions[edge.source];
  const tgt = positions[edge.target];
  if (!src || !tgt) return { d: "", mid: { x: 0, y: 0 } };

  const srcPorts = getPorts(src);
  const tgtPorts = getPorts(tgt);

  // Decide port sides based on relative position
  const verticalDiff = tgt.y - src.y;
  const horizontalDiff = tgt.x - src.x;

  let p1, p2;

  if (Math.abs(verticalDiff) > LANE_HEIGHT * 0.5) {
    // crossing lanes — use vertical ports
    if (verticalDiff > 0) {
      p1 = srcPorts.bottom;
      p2 = tgtPorts.top;
    } else {
      p1 = srcPorts.top;
      p2 = tgtPorts.bottom;
    }
  } else {
    // same lane — use horizontal ports
    if (horizontalDiff >= 0) {
      p1 = srcPorts.right;
      p2 = tgtPorts.left;
    } else {
      p1 = srcPorts.left;
      p2 = tgtPorts.right;
    }
  }

  // Offset parallel edges between same pair to avoid overlap
  const offset = (edgeIndex - (totalSameDirection - 1) / 2) * 18;

  let d;
  let mid;

  if (p1.y === srcPorts.bottom?.y || p1.y === srcPorts.top?.y) {
    // vertical routing
    const midY = (p1.y + p2.y) / 2;
    const cx1 = p1.x + offset;
    const cx2 = p2.x + offset;
    d = `M ${p1.x} ${p1.y} C ${cx1} ${midY}, ${cx2} ${midY}, ${p2.x} ${p2.y}`;
    mid = { x: (p1.x + p2.x) / 2 + offset, y: midY };
  } else {
    // horizontal routing
    const midX = (p1.x + p2.x) / 2;
    const cy1 = p1.y + offset;
    const cy2 = p2.y + offset;
    d = `M ${p1.x} ${p1.y} C ${midX} ${cy1}, ${midX} ${cy2}, ${p2.x} ${p2.y}`;
    mid = { x: midX, y: (p1.y + p2.y) / 2 + offset };
  }

  return { d, mid, p1, p2 };
}
