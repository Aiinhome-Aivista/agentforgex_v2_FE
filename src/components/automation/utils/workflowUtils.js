/* ═══════════════════════════════════════════════════════════
   WORKFLOW LAYOUT — refined minimal orchestration aesthetic
   Inspired by Linear / Stripe / Vercel / Temporal style.
   All sizing tuned for clean rhythm + clean orthogonal edges.
═══════════════════════════════════════════════════════════ */

export const TITLE_W = 44;
export const LABEL_W = 148;
export const CONTENT_X = TITLE_W + LABEL_W;

/* Node geometry — slimmer, more refined than before */
export const NODE_W = 220;
export const NODE_H = 72;
export const NODE_RX = 14;          // corner radius for process cards
export const NODE_GAP = 110;        // generous horizontal breathing room
export const LANE_H = 132;          // taller swimlanes → less crowded
export const ROW_GAP = 28;
export const MAX_COLS = 5;

/* Start/End pill geometry */
export const START_W = 110;
export const START_H = 48;
export const START_RX = 24;         // pill radius

/* Decision diamond (rotated rounded square) */
export const DIAMOND_S = 54;        // half-diagonal
export const DIAMOND_RX = 10;       // rounded corners on the rotated square

/* Edge routing */
export const EDGE_RADIUS = 12;      // rounded corner radius on elbows
export const EDGE_STUB = 24;        // length of straight stub before turning

export const MARKER_ID = "wf-arrow";

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS — refined palette, low-saturation, pastel
───────────────────────────────────────────────────────── */
export const TOKENS = {
  // Surfaces
  canvas: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F6F8",

  // Text
  textPrimary: "#1F2937",
  textSecondary: "#4B5563",
  textMuted: "#94A3B8",

  // Borders / strokes
  border: "#E5E7EB",
  borderStrong: "#CBD5E1",

  // Edge stroke
  edge: "#94A3B8",
  edgeStrong: "#64748B",

  // Node accents (refined, not loud)
  startFill: "#86EFAC",       // soft green pill
  startBorder: "#22C55E",
  startText: "#14532D",

  endFill: "#86EFAC",
  endBorder: "#22C55E",
  endText: "#14532D",

  decisionFill: "#C7D2FE",    // lavender diamond
  decisionBorder: "#818CF8",
  decisionText: "#312E81",

  processFill: "#FFFFFF",
  processBorder: "#E5E7EB",
  processText: "#1F2937",

  // Edge label chip
  chipBg: "#FFFFFF",
  chipBorder: "#E5E7EB",
  chipText: "#475569",
};

/* Backwards-compat color export (used by ProcessNode if data sets n.color) */
export const COLORS = {
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F97316",
  yellow: "#EAB308",
  pink: "#EF4444",
  violet: "#8B5CF6",
};

/* ─────────────────────────────────────────────────────────
   LANE STYLES — extremely subtle tint, ribbon style left badges
───────────────────────────────────────────────────────── */
export const LANE_STYLES = [
  { bg: "rgba(99,102,241,0.035)",  tint: "rgba(99,102,241,0.06)",  badge: "#4338CA", dot: "#6366F1" },
  { bg: "rgba(16,185,129,0.035)",  tint: "rgba(16,185,129,0.06)",  badge: "#047857", dot: "#10B981" },
  { bg: "rgba(249,115,22,0.035)",  tint: "rgba(249,115,22,0.06)",  badge: "#C2410C", dot: "#F97316" },
  { bg: "rgba(234,179,8,0.035)",   tint: "rgba(234,179,8,0.06)",   badge: "#A16207", dot: "#EAB308" },
  { bg: "rgba(14,165,233,0.035)",  tint: "rgba(14,165,233,0.06)",  badge: "#0369A1", dot: "#0EA5E9" },
  { bg: "rgba(236,72,153,0.035)",  tint: "rgba(236,72,153,0.06)",  badge: "#9D174D", dot: "#EC4899" },
  { bg: "rgba(20,184,166,0.035)",  tint: "rgba(20,184,166,0.06)",  badge: "#0F766E", dot: "#14B8A6" },
];

/* ─────────────────────────────────────────────────────────
   LAYOUT HELPERS
───────────────────────────────────────────────────────── */
export const getColCx = (colIndex) =>
  40 + (NODE_W + NODE_GAP) * colIndex + NODE_W / 2;

/* Wrap long labels into 2–3 lines, preserving manual \n */
export const wrapText = (text, maxLineChars = 24, maxLines = 3) => {
  if (!text) return [""];
  if (text.includes("\n")) return text.split("\n").slice(0, maxLines);
  if (text.length <= maxLineChars) return [text];

  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (trial.length <= maxLineChars) {
      current = trial;
    } else {
      if (current) lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const remaining = words.slice(lines.join(" ").split(" ").length).join(" ");
    if (remaining) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] =
        (last + " " + remaining).slice(0, maxLineChars - 1) + "…";
    }
  }
  return lines;
};

/* Build the node map + lane metadata */
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
      const baseCx = getColCx(colInRow);
      const isPill = node.type === "start" || node.type === "end";
      const cx = isPill ? baseCx - (NODE_W / 2 - START_W / 2) : baseCx;
      const cy = laneTop + row * (LANE_H + ROW_GAP) + LANE_H / 2;
      nm[node.id] = { ...node, cx, cy, laneIndex: li, rowIndex: row };
      maxRight = Math.max(maxRight, cx + NODE_W / 2);
    });

    totalHeight += laneHeight;
  });

  return { nodeMap: nm, laneMeta, totalHeight, maxRight };
};

/* Backwards-compat */
export const buildNodeMap = (data) => buildWorkflowLayout(data).nodeMap;

/* Shorten a line a tiny bit so arrowhead doesn't overlap node border */
export const shorten = (x1, y1, x2, y2, off) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < off) return [x1, y1, x2, y2];
  const r = (len - off) / len;
  return [x1, y1, x1 + dx * r, y1 + dy * r];
};

/* Half-width of a node by type (for edge anchoring) */
export const halfWidth = (n) => {
  if (n.type === "start" || n.type === "end") return START_W / 2;
  if (n.type === "decision") return DIAMOND_S;
  return NODE_W / 2;
};
export const halfHeight = (n) => {
  if (n.type === "start" || n.type === "end") return START_H / 2;
  if (n.type === "decision") return DIAMOND_S;
  return NODE_H / 2;
};

/* Remove duplicate consecutive points and collinear interior points.
   This is essential — without it, degenerate "corners" (zero-length
   or perfectly straight) produce broken SVG arcs. */
export const simplifyPath = (pts) => {
  if (!pts || pts.length <= 2) return pts || [];
  // 1. dedupe consecutive identical points
  const deduped = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = deduped[deduped.length - 1];
    const [cx, cy] = pts[i];
    if (Math.abs(px - cx) > 0.5 || Math.abs(py - cy) > 0.5) {
      deduped.push(pts[i]);
    }
  }
  if (deduped.length <= 2) return deduped;

  // 2. remove interior points that are collinear with their neighbours
  const result = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const [px, py] = result[result.length - 1];
    const [cx, cy] = deduped[i];
    const [nx, ny] = deduped[i + 1];
    const dxA = cx - px, dyA = cy - py;
    const dxB = nx - cx, dyB = ny - cy;
    const cross = dxA * dyB - dyA * dxB;
    const dot = dxA * dxB + dyA * dyB;
    if (Math.abs(cross) < 0.5 && dot >= 0) continue; // same line, same dir
    result.push(deduped[i]);
  }
  result.push(deduped[deduped.length - 1]);
  return result;
};

/* Build an orthogonal path string with rounded corners.
   pts: array of [x,y]. Inserts arcs at each interior corner. */
export const orthogonalPath = (pts, radius = EDGE_RADIUS) => {
  const clean = simplifyPath(pts);
  if (!clean || clean.length < 2) return "";
  if (clean.length === 2) {
    return `M ${clean[0][0]} ${clean[0][1]} L ${clean[1][0]} ${clean[1][1]}`;
  }
  pts = clean;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];

    // distance from corner that we still need to keep the line straight
    const distIn  = Math.hypot(cx - px, cy - py);
    const distOut = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, distIn / 2, distOut / 2);

    // unit vector from prev → corner
    const inUx = (cx - px) / (distIn || 1);
    const inUy = (cy - py) / (distIn || 1);
    // unit vector from corner → next
    const outUx = (nx - cx) / (distOut || 1);
    const outUy = (ny - cy) / (distOut || 1);

    const sx = cx - inUx * r;
    const sy = cy - inUy * r;
    const ex = cx + outUx * r;
    const ey = cy + outUy * r;

    // determine sweep direction (1 = clockwise)
    const cross = inUx * outUy - inUy * outUx;
    const sweep = cross > 0 ? 1 : 0;

    d += ` L ${sx} ${sy} A ${r} ${r} 0 0 ${sweep} ${ex} ${ey}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
};
