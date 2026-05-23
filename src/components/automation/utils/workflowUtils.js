/* ═══════════════════════════════════════════════════════════
   LAYOUT CONSTANTS — Premium BPMN-style workflow
═══════════════════════════════════════════════════════════ */
export const TITLE_W = 40;
export const LABEL_W = 120;
export const CONTENT_X = TITLE_W + LABEL_W;

export const NODE_W = 220;
export const NODE_H = 80;
export const NODE_GAP = 120;
export const LANE_H = 160;
export const ROW_GAP = 36;
export const MAX_COLS = 6;
export const START_R = 36;
export const DIAMOND_S = 40;

export const MARKER_ID = "tip";

/* ─── Color Palette ──────────────────────────────────── */
export const COLORS = {
  /* Node */
  node_bg: "#FFFFFF",
  node_border: "#D1D5DB",
  node_text: "#1F2937",
  node_shadow: "rgba(0,0,0,0.04)",

  /* Edges */
  edge: "#475569",
  edge_light: "#94A3B8",

  /* Start / End */
  start_fill: "#D1FAE5",
  start_stroke: "#6EE7B7",
  start_text: "#047857",
  end_fill: "#D1FAE5",
  end_stroke: "#6EE7B7",
  end_text: "#047857",

  /* Decision diamond */
  decision_fill: "#E0E7FF",
  decision_stroke: "#A5B4FC",
  decision_text: "#3730A3",

  /* Labels */
  label_text: "#6B7280",
  label_badge_bg: "#F3F4F6",

  /* Lanes */
  lane_border: "#E5E7EB",

  /* Legacy compat */
  blue: "#3B82F6",
  green: "#10B981",
  orange: "#F97316",
  yellow: "#EAB308",
  pink: "#EF4444",
};

/* ─── Lane accent color palette (cycling) ────────────── */
export const LANE_ACCENTS = [
  { accent: "#3B82F6", bg: "rgba(59,130,246,0.04)",  tint: "rgba(59,130,246,0.06)",
    badge_bg: "rgba(59,130,246,0.10)", badge_fg: "#2563EB",
    node_tint: "rgba(59,130,246,0.05)", node_bar: "#3B82F6" },
  { accent: "#10B981", bg: "rgba(16,185,129,0.04)",  tint: "rgba(16,185,129,0.06)",
    badge_bg: "rgba(16,185,129,0.10)", badge_fg: "#059669",
    node_tint: "rgba(16,185,129,0.05)", node_bar: "#10B981" },
  { accent: "#8B5CF6", bg: "rgba(139,92,246,0.04)",  tint: "rgba(139,92,246,0.06)",
    badge_bg: "rgba(139,92,246,0.10)", badge_fg: "#7C3AED",
    node_tint: "rgba(139,92,246,0.05)", node_bar: "#8B5CF6" },
  { accent: "#F59E0B", bg: "rgba(245,158,11,0.04)",  tint: "rgba(245,158,11,0.06)",
    badge_bg: "rgba(245,158,11,0.10)", badge_fg: "#D97706",
    node_tint: "rgba(245,158,11,0.05)", node_bar: "#F59E0B" },
  { accent: "#F43F5E", bg: "rgba(244,63,94,0.04)",   tint: "rgba(244,63,94,0.06)",
    badge_bg: "rgba(244,63,94,0.10)",  badge_fg: "#E11D48",
    node_tint: "rgba(244,63,94,0.05)", node_bar: "#F43F5E" },
  { accent: "#06B6D4", bg: "rgba(6,182,212,0.04)",   tint: "rgba(6,182,212,0.06)",
    badge_bg: "rgba(6,182,212,0.10)",  badge_fg: "#0891B2",
    node_tint: "rgba(6,182,212,0.05)", node_bar: "#06B6D4" },
  { accent: "#6366F1", bg: "rgba(99,102,241,0.04)",  tint: "rgba(99,102,241,0.06)",
    badge_bg: "rgba(99,102,241,0.10)", badge_fg: "#4F46E5",
    node_tint: "rgba(99,102,241,0.05)", node_bar: "#6366F1" },
];

/* Legacy LANE_STYLES (backwards compat — maps to LANE_ACCENTS) */
export const LANE_STYLES = LANE_ACCENTS;

/* Dynamic column position calculator */
export const getColCx = (colIndex) => {
  return 50 + (NODE_W + NODE_GAP) * colIndex + NODE_W / 2;
};

/* Helper to wrap long labels into multiple lines */
export const wrapText = (text, maxLineChars = 20) => {
  if (!text) return [""];
  if (text.includes("\n")) return text.split("\n");
  if (text.length <= maxLineChars) return [text];

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length <= maxLineChars) {
      currentLine = test;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [""];
};

/* ─────────────────────────────────────────────────────────────────────────
   NEW — ensureStartEndNodes
   Client-side safety net:  even if the backend response somehow ships a
   workflow without a Start or End node, we inject them here so the UI
   always renders the canonical pattern (spec section 4).

   Returns a *new* shallow-cloned data object — does not mutate input.
   ───────────────────────────────────────────────────────────────────────── */
export const ensureStartEndNodes = (data) => {
  if (!data || !Array.isArray(data.lanes) || data.lanes.length === 0) {
    return data;
  }

  // Deep enough clone for safe mutation
  const lanes = data.lanes.map((l) => ({
    ...l,
    nodes: Array.isArray(l.nodes) ? [...l.nodes] : [],
  }));
  const flow = Array.isArray(data.flow) ? [...data.flow] : [];

  // Inspect existing state
  const allNodes = lanes.flatMap((l) => l.nodes);
  const idSet = new Set(allNodes.map((n) => n.id).filter(Boolean));
  const types = allNodes.map((n) => (n.type || "").toLowerCase());
  const hasStart = types.includes("start");
  const hasEnd   = types.includes("end");

  if (hasStart && hasEnd) return data;

  // Compute column range
  const cols = allNodes
    .map((n) => n.column)
    .filter((c) => typeof c === "number");
  const minCol = cols.length ? Math.min(...cols) : 1;
  const maxCol = cols.length ? Math.max(...cols) : 1;

  // Identify entry / exit nodes by edge connectivity
  const inbound  = new Map();
  const outbound = new Map();
  for (const e of flow) {
    if (!e || !e.from || !e.to) continue;
    inbound.set(e.to,    (inbound.get(e.to)    || 0) + 1);
    outbound.set(e.from, (outbound.get(e.from) || 0) + 1);
  }
  const entry = allNodes.find((n) => n.id && !inbound.get(n.id))  || allNodes[0];
  const exit  = [...allNodes].reverse().find((n) => n.id && !outbound.get(n.id)) || allNodes[allNodes.length - 1];

  // Helper — produce a non-colliding id
  const uniqueId = (base) => {
    let id = base;
    let i = 1;
    while (idSet.has(id)) { id = `${base}_${i++}`; }
    idSet.add(id);
    return id;
  };

  if (!hasStart && entry) {
    const startId = uniqueId("__start__");
    lanes[0].nodes.unshift({
      id:     startId,
      type:   "start",
      label:  "Start",
      column: Math.max(0, minCol - 1),
    });
    flow.unshift({ from: startId, to: entry.id });
  }

  if (!hasEnd && exit) {
    const endId = uniqueId("__end__");
    lanes[lanes.length - 1].nodes.push({
      id:     endId,
      type:   "end",
      label:  "End",
      column: maxCol + 1,
    });
    flow.push({ from: exit.id, to: endId });
  }

  return { ...data, lanes, flow };
};

/* Build node map with optional wrapping */
export const buildWorkflowLayout = (data, opts = {}) => {
  // ─── NEW: apply the Start/End safety net before laying out ─────────────
  const safeData = ensureStartEndNodes(data);

  if (!safeData || !safeData.lanes) {
    return { nodeMap: {}, laneMeta: [], totalHeight: 0, maxRight: 0 };
  }

  const maxCols = opts.maxCols ?? MAX_COLS;
  const nm = {};
  const laneMeta = [];
  let totalHeight = 0;
  let maxRight = 0;

  safeData.lanes.forEach((lane, li) => {
    const nodes = lane.nodes || [];
    const maxCol = nodes.reduce((m, n) => Math.max(m, n.column ?? 1), 0);
    const rowCount = Math.floor(maxCol / maxCols) + 1;
    const laneHeight = LANE_H * rowCount + ROW_GAP * (rowCount - 1);
    const laneTop = totalHeight;

    laneMeta.push({
      id: lane.id,
      index: li,
      top: laneTop,
      height: laneHeight,
      rowCount,
    });

    nodes.forEach((node) => {
      const col = node.column ?? 1;
      const row = Math.floor(col / maxCols);
      const colInRow = col % maxCols;
      const cx = getColCx(colInRow);
      const cy = laneTop + row * (LANE_H + ROW_GAP) + LANE_H / 2;
      nm[node.id] = { ...node, cx, cy, laneIndex: li, rowIndex: row };
      maxRight = Math.max(maxRight, cx + NODE_W / 2);
    });

    totalHeight += laneHeight;
  });

  return { nodeMap: nm, laneMeta, totalHeight, maxRight, safeData };
};

/* Build node map from data (backwards compatible) */
export const buildNodeMap = (data) => {
  return buildWorkflowLayout(data).nodeMap;
};

/* Line shortening helper for arrows */
export const shorten = (x1, y1, tx2, ty2, off) => {
  const dx = tx2 - x1;
  const dy = ty2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < off) return [x1, y1, tx2, ty2];
  const ratio = (len - off) / len;
  return [x1, y1, x1 + dx * ratio, y1 + dy * ratio];
};
