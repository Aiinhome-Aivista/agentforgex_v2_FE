/**
 * workflowRenderer.js
 *
 * Shared swimlane workflow layout engine. Consumed by pdfGenerator,
 * docxGenerator, and pptxGenerator so they all draw the SAME real
 * business swimlane (the Procure-to-Pay flow returned by /processes/:id/flow).
 *
 * The output is pure data (positions in mm) — each generator scales it to
 * its own unit (mm for PDF, twips/EMU for DOCX, inches for PPTX).
 *
 * Input shape (matches getProcessFlow API response):
 * {
 *   title: "Procure-to-Pay …",
 *   lanes: [
 *     { id, label,
 *       nodes: [{ id, type, label, column }, ...] },
 *     ...
 *   ],
 *   flow: [{ from, to, label? }, ...]
 * }
 */

// ─── Enterprise palette (white-background swimlane) ──────────────────────────
export const PALETTE = {
  bg:            "#FFFFFF",
  paper:         "#F8FAFC",
  ink:           "#0F172A",
  inkSoft:       "#475569",
  border:        "#E2E8F0",
  edge:          "#475569",
  edgeLight:     "#94A3B8",
  startFill:     "#D1FAE5",
  startStroke:   "#6EE7B7",
  startText:     "#047857",
  diamondFill:   "#E0E7FF",
  diamondStroke: "#A5B4FC",
  diamondText:   "#3730A3",
  nodeFill:      "#FFFFFF",
  nodeStroke:    "#D1D5DB",
  nodeText:      "#1F2937",
};

export const LANE_ACCENTS = [
  { accent: "#3B82F6", tint: "#EFF6FF", text: "#1E40AF" }, // Blue
  { accent: "#8B5CF6", tint: "#F5F3FF", text: "#5B21B6" }, // Violet
  { accent: "#10B981", tint: "#ECFDF5", text: "#065F46" }, // Emerald
  { accent: "#F59E0B", tint: "#FFFBEB", text: "#92400E" }, // Amber
  { accent: "#F43F5E", tint: "#FFF1F2", text: "#9F1239" }, // Rose
  { accent: "#06B6D4", tint: "#ECFEFF", text: "#155E75" }, // Cyan
  { accent: "#6366F1", tint: "#EEF2FF", text: "#3730A3" }, // Indigo
];

/** Detect whether flow data has the structure we can render. */
export function hasFlowData(flow) {
  return !!(
    flow &&
    Array.isArray(flow.lanes) &&
    flow.lanes.length > 0 &&
    flow.lanes.some((l) => Array.isArray(l.nodes) && l.nodes.length > 0)
  );
}

/**
 * Client-side safety net: even if the backend response somehow ships a
 * workflow without a Start or End node, we inject them here so the layout
 * always renders the canonical pattern (spec section 4), matching the UI.
 */
export function ensureStartEndNodes(data) {
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

  if (hasStart) return data;

  // Compute column range
  const cols = allNodes
    .map((n) => n.column)
    .filter((c) => typeof c === "number");
  const minCol = cols.length ? Math.min(...cols) : 1;

  // Identify entry nodes by edge connectivity
  const inbound  = new Map();
  for (const e of flow) {
    if (!e || !e.from || !e.to) continue;
    inbound.set(e.to, (inbound.get(e.to) || 0) + 1);
  }
  const entry = allNodes.find((n) => n.id && !inbound.get(n.id)) || allNodes[0];

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

  return { ...data, lanes, flow };
}

/**
 * Compute a pure-data layout in millimetres. Each lane occupies one row;
 * all columns used across all lanes share a single horizontal grid so the
 * diagram reads as a true swimlane (BPMN-style).
 */
export function layoutWorkflow(flow, opts = {}) {
  const safeFlow = ensureStartEndNodes(flow);

  const cfg = {
    nodeW:          opts.nodeW          ?? 48,
    nodeH:          opts.nodeH          ?? 18,
    colGap:         opts.colGap         ?? 14,
    laneHeight:     opts.laneHeight     ?? 30,
    laneLabelWidth: opts.laneLabelWidth ?? 32,
    titleHeight:    opts.titleHeight    ?? 10,
    padding:        opts.padding        ?? 4,
    maxCols:        opts.maxCols        ?? 6,
    rowGap:         opts.rowGap         ?? 8,
  };
  const { nodeW, nodeH, colGap, laneHeight, laneLabelWidth, titleHeight, padding, maxCols, rowGap } = cfg;

  if (!hasFlowData(safeFlow)) {
    return { title: safeFlow?.title || "", width: 0, height: 0, lanes: [], nodes: [], edges: [] };
  }

  const occupied = new Set();
  const lanes = [];
  const nodesById = {};
  const allNodes = [];
  let cursorY = padding + titleHeight;

  // 1. Resolve overlaps and shift columns dynamically exactly like the UI's buildWorkflowLayout
  const resolvedLanes = safeFlow.lanes.map((lane, li) => {
    const nodes = lane.nodes || [];
    const resolvedNodes = nodes.map((node) => {
      let col = node.column ?? 1;
      let row = Math.floor(col / maxCols);
      let colInRow = col % maxCols;
      let key = `${li}-${row}-${colInRow}`;
      
      while (occupied.has(key)) {
        col++;
        row = Math.floor(col / maxCols);
        colInRow = col % maxCols;
        key = `${li}-${row}-${colInRow}`;
      }
      occupied.add(key);
      return { ...node, resolvedCol: col, resolvedRow: row, resolvedColInRow: colInRow };
    });
    return { ...lane, nodes: resolvedNodes };
  });

  // 2. Collect used resolved columns to densify the horizontal layout for reports
  const usedColsSet = new Set();
  resolvedLanes.forEach((lane) => {
    (lane.nodes || []).forEach((n) => usedColsSet.add(n.resolvedColInRow));
  });
  const usedCols = Array.from(usedColsSet).sort((a, b) => a - b);
  const nCols = Math.max(1, usedCols.length);
  const colIndexMap = new Map();
  usedCols.forEach((c, i) => colIndexMap.set(c, i));

  const contentW = nCols * nodeW + (nCols - 1) * colGap;
  const totalW   = padding * 2 + laneLabelWidth + contentW;

  const colLeftX = (logicalCol) => {
    const idx = colIndexMap.get(logicalCol) ?? 0;
    return padding + laneLabelWidth + idx * (nodeW + colGap);
  };

  // 3. Lay out each lane and its resolved nodes
  resolvedLanes.forEach((lane, li) => {
    const accent = LANE_ACCENTS[li % LANE_ACCENTS.length];
    const laneTop = cursorY;

    // Calculate maximum column index inside this lane to determine the row count
    const maxCol = (lane.nodes || []).reduce((m, n) => Math.max(m, n.resolvedCol ?? 1), 0);
    const rowCount = Math.floor(maxCol / maxCols) + 1;
    const currentLaneH = rowCount * laneHeight + (rowCount - 1) * rowGap;

    lanes.push({
      id:     lane.id,
      label:  lane.label || "",
      top:    laneTop,
      height: currentLaneH,
      accent: accent.accent,
      tint:   accent.tint,
      text:   accent.text,
      index:  li,
      rowCount,
    });

    (lane.nodes || []).forEach((node) => {
      const type = (node.type || "process").toLowerCase();
      const col  = node.resolvedCol;
      const row  = node.resolvedRow;
      const colInRow = node.resolvedColInRow;

      const x    = colLeftX(colInRow);
      // Vertically center the node inside its specific row of the lane
      const y    = laneTop + row * (laneHeight + rowGap) + (laneHeight - nodeH) / 2;
      let fill, stroke, text;

      if (type === "start" || type === "end") {
        fill = PALETTE.startFill;
        stroke = PALETTE.startStroke;
        text = PALETTE.startText;
      } else if (type === "decision") {
        fill = PALETTE.diamondFill;
        stroke = PALETTE.diamondStroke;
        text = PALETTE.diamondText;
      } else {
        fill = PALETTE.nodeFill;
        stroke = accent.accent;
        text = PALETTE.nodeText;
      }

      const laidNode = {
        ...node,
        id:        node.id,
        type,
        label:     node.label || (type === "start" ? "Start" : type === "end" ? "End" : ""),
        x, y,
        w:         nodeW,
        h:         nodeH,
        cx:        x + nodeW / 2,
        cy:        y + nodeH / 2,
        fill, stroke, text,
        accent:    accent.accent,
        laneIndex: li,
        rowIndex:  row,
        col,
      };
      nodesById[node.id] = laidNode;
      allNodes.push(laidNode);
    });

    cursorY += currentLaneH;
  });

  // 3. Compute edge endpoints using physical relative positions for maximum accuracy
  const edges = (safeFlow.flow || []).map((e) => {
    const a = nodesById[e.from];
    const b = nodesById[e.to];
    if (!a || !b) return null;

    let fromX, fromY, toX, toY;
    let routing = "horizontal";

    const isInline = a.laneIndex === b.laneIndex && a.rowIndex === b.rowIndex;

    if (isInline) {
      routing = "horizontal";
      if (b.cx > a.cx) {
        fromX = a.x + a.w; fromY = a.cy;
        toX   = b.x;       toY   = b.cy;
      } else {
        fromX = a.x;       fromY = a.cy;
        toX   = b.x + b.w; toY   = b.cy;
      }
    } else {
      routing = "vertical";
      if (b.cy > a.cy) {
        fromX = a.cx; fromY = a.y + a.h;
        toX   = b.cx; toY   = b.y;
      } else {
        fromX = a.cx; fromY = a.y;
        toX   = b.cx; toY   = b.y + b.h;
      }
    }

    return {
      fromId: e.from,
      toId:   e.to,
      fromX, fromY, toX, toY,
      kind:   a.laneIndex === b.laneIndex ? "intralane" : "interlane",
      label:  e.label || "",
      routing,
    };
  }).filter(Boolean);

  return {
    title:  safeFlow.title || "Process Workflow",
    width:  totalW,
    height: cursorY + padding,
    lanes,
    nodes:  allNodes,
    edges,
  };
}
