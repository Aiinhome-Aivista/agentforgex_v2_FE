/* ═══════════════════════════════════════════════════════════
   LAYOUT CONSTANTS
═══════════════════════════════════════════════════════════ */
export const TITLE_W = 46;
export const LABEL_W = 132;
export const CONTENT_X = TITLE_W + LABEL_W;

export const NODE_W = 260;
export const NODE_H = 88;
export const NODE_GAP = 80;
export const LANE_H = 120;
export const ROW_GAP = 36;
export const MAX_COLS = 5;
export const START_R = 20;
export const DIAMOND_S = 35;

export const MARKER_ID = "tip";

/* Node colours */
export const COLORS = {
  blue: "#3B82F6",    // Vibrant Blue
  green: "#10B981",   // Emerald Green
  orange: "#F97316",  // Orange
  yellow: "#EAB308",  // Yellow/Amber
  pink: "#EF4444",    // Red
};

/* Lane background styling presets for layered orchestration view */
export const LANE_STYLES = [
  {
    bg: "linear-gradient(90deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 60%, rgba(59,130,246,0) 100%)",
    badge: "#1D4ED8",
    tint: "rgba(59,130,246,0.08)",
  },
  {
    bg: "linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 60%, rgba(16,185,129,0) 100%)",
    badge: "#047857",
    tint: "rgba(16,185,129,0.08)",
  },
  {
    bg: "linear-gradient(90deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.02) 60%, rgba(249,115,22,0) 100%)",
    badge: "#C2410C",
    tint: "rgba(249,115,22,0.08)",
  },
  {
    bg: "linear-gradient(90deg, rgba(234,179,8,0.08) 0%, rgba(234,179,8,0.02) 60%, rgba(234,179,8,0) 100%)",
    badge: "#A16207",
    tint: "rgba(234,179,8,0.08)",
  },
];

/* Dynamic column position calculator */
export const getColCx = (colIndex) => {
  return 30 + (NODE_W + NODE_GAP) * colIndex + NODE_W / 2;
};

/* Helper to wrap long labels into 2 lines */
export const wrapText = (text, maxLineChars = 22) => {
  if (!text) return [""];
  if (text.includes("\n")) return text.split("\n");
  if (text.length <= maxLineChars) return [text];

  const words = text.split(" ");
  let line1 = "";
  let i = 0;
  while (i < words.length && (line1 + (line1 ? " " : "") + words[i]).length <= maxLineChars) {
    line1 += (line1 ? " " : "") + words[i];
    i++;
  }
  const line2 = words.slice(i).join(" ");
  return line2 ? [line1, line2] : [line1];
};

/* Build node map with optional wrapping */
export const buildWorkflowLayout = (data, opts = {}) => {
  if (!data || !data.lanes) {
    return { nodeMap: {}, laneMeta: [], totalHeight: 0, maxRight: 0 };
  }

  const maxCols = opts.maxCols ?? MAX_COLS;
  const nm = {};
  const laneMeta = [];
  let totalHeight = 0;
  let maxRight = 0;

  data.lanes.forEach((lane, li) => {
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

  return { nodeMap: nm, laneMeta, totalHeight, maxRight };
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
