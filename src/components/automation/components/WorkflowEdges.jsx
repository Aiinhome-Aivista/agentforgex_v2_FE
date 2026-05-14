import React from "react";
import {
  MARKER_ID,
  NODE_W,
  NODE_H,
  START_W,
  START_H,
  DIAMOND_S,
  EDGE_RADIUS,
  EDGE_STUB,
  TOKENS,
  shorten,
  orthogonalPath,
  halfWidth,
  halfHeight,
} from "../utils/workflowUtils";

/* ─────────────────────────────────────────────────────────
   SVG defs — refined arrowhead + soft glow
───────────────────────────────────────────────────────── */
export function Defs({ markerId = MARKER_ID }) {
  return (
    <defs>
      <marker
        id={markerId}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 9 5 L 0 10 z" fill={TOKENS.edgeStrong} />
      </marker>
    </defs>
  );
}

/* ─────────────────────────────────────────────────────────
   EdgeLabel chip — small pill with "Yes" / "No" / etc.
───────────────────────────────────────────────────────── */
function EdgeLabel({ x, y, text }) {
  if (!text) return null;
  const charW = 6.5;
  const padX = 8;
  const w = Math.max(28, text.length * charW + padX * 2);
  const h = 18;
  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`} pointerEvents="none">
      <rect
        width={w}
        height={h}
        rx={9}
        fill={TOKENS.chipBg}
        stroke={TOKENS.chipBorder}
        strokeWidth={1}
      />
      <text
        x={w / 2}
        y={h / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10.5}
        fontWeight={600}
        fill={TOKENS.chipText}
        fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
        letterSpacing="-0.005em"
      >
        {text}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────
   Anchor helpers — find the connection point on each side
───────────────────────────────────────────────────────── */
const anchor = {
  right: (n)  => [n.cx + halfWidth(n),  n.cy],
  left:  (n)  => [n.cx - halfWidth(n),  n.cy],
  top:   (n)  => [n.cx,                 n.cy - halfHeight(n)],
  bottom:(n)  => [n.cx,                 n.cy + halfHeight(n)],
};

/* Smooth orthogonal path builder.
   Routes from one node side to another using two stubs + an
   elbow. The orthogonalPath() helper adds rounded corners. */
function buildEdgePath({ from, to, fromSide, toSide, stub = EDGE_STUB }) {
  const [fx, fy] = anchor[fromSide](from);
  const [tx, ty] = anchor[toSide](to);

  // Stub vectors based on side
  const stubVec = {
    right:  [ stub, 0],
    left:   [-stub, 0],
    top:    [ 0, -stub],
    bottom: [ 0,  stub],
  };
  const [fsx, fsy] = stubVec[fromSide];
  const [tsx, tsy] = stubVec[toSide];

  const p0 = [fx, fy];
  const p1 = [fx + fsx, fy + fsy];
  const p4 = [tx + tsx, ty + tsy];
  const p5 = [tx, ty];

  // Build interior corners depending on side combination
  const horizontal = (s) => s === "left" || s === "right";

  let mid = [];
  if (horizontal(fromSide) && horizontal(toSide)) {
    // H → H : go to mid-x, down, then to target
    const midX = (p1[0] + p4[0]) / 2;
    mid = [
      [midX, p1[1]],
      [midX, p4[1]],
    ];
  } else if (!horizontal(fromSide) && !horizontal(toSide)) {
    // V → V : go to mid-y, across, then to target
    const midY = (p1[1] + p4[1]) / 2;
    mid = [
      [p1[0], midY],
      [p4[0], midY],
    ];
  } else if (horizontal(fromSide) && !horizontal(toSide)) {
    // H → V : turn once
    mid = [[p4[0], p1[1]]];
  } else {
    // V → H : turn once
    mid = [[p1[0], p4[1]]];
  }

  return { points: [p0, p1, ...mid, p4, p5], fromAnchor: p0, toAnchor: p5 };
}

function midOf(points) {
  // best mid point = around the middle of the polyline
  const idx = Math.floor(points.length / 2);
  const a = points[idx - 1] || points[0];
  const b = points[idx] || points[points.length - 1];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/* ─────────────────────────────────────────────────────────
   EdgePath — renders one routed connection
───────────────────────────────────────────────────────── */
function EdgePath({ points, label, markerId, dashed = false }) {
  // shorten the last segment so arrowhead doesn't overlap the border
  const pts = [...points];
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const [sx, sy, ex, ey] = shorten(prev[0], prev[1], last[0], last[1], 5);
  pts[pts.length - 2] = [sx, sy];
  pts[pts.length - 1] = [ex, ey];

  const d = orthogonalPath(pts, EDGE_RADIUS);
  const [mx, my] = midOf(pts);

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={TOKENS.edge}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "4 4" : undefined}
        markerEnd={`url(#${markerId})`}
      />
      {label && <EdgeLabel x={mx} y={my} text={label} />}
    </g>
  );
}

/* Pick anchor sides based on relative geometry — produces
   the most natural orthogonal route between two nodes.
   The connection `type` is treated as a hint only; geometry wins
   when they disagree (e.g. data labels a cross-lane connection
   "inline" but the nodes are actually vertically stacked). */
function pickSides(f, t, type) {
  const dx = t.cx - f.cx;
  const dy = t.cy - f.cy;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const sameRow = ady < 20;
  const sameCol = adx < 20;

  // Strong "inline" hint AND same row → horizontal
  if (type === "inline" && sameRow) {
    return { fromSide: "right", toSide: "left" };
  }

  // Strong "down/diagonal_down" hint → vertical
  if ((type === "down" || type === "diagonal_down") && !sameRow) {
    return dy >= 0
      ? { fromSide: "bottom", toSide: "top" }
      : { fromSide: "top", toSide: "bottom" };
  }

  // Otherwise use pure geometry — pick whichever axis is dominant
  if (ady > adx * 1.2 || sameCol) {
    return dy >= 0
      ? { fromSide: "bottom", toSide: "top" }
      : { fromSide: "top", toSide: "bottom" };
  }
  if (adx > ady * 1.2 || sameRow) {
    return dx >= 0
      ? { fromSide: "right", toSide: "left" }
      : { fromSide: "left", toSide: "right" };
  }
  // Roughly diagonal → exit horizontally, enter vertically (looks cleaner)
  return dy >= 0
    ? { fromSide: "right", toSide: "top" }
    : { fromSide: "right", toSide: "bottom" };
}

/* Detect a loop-back: target is in an earlier (smaller) lane index
   AND positioned to the upper-left of the source. Routes around the
   right wall back to the target's right side. */
function isLoopBack(f, t) {
  if (typeof f.laneIndex === "number" && typeof t.laneIndex === "number") {
    if (t.laneIndex < f.laneIndex && t.cx <= f.cx + 4) return true;
  } else if (t.cy < f.cy - 20 && t.cx <= f.cx + 4) {
    return true;
  }
  return false;
}

/* ─────────────────────────────────────────────────────────
   renderArrows — entry point, handles connection types
───────────────────────────────────────────────────────── */
export function renderArrows(flow, nm, svgW, markerId = MARKER_ID) {
  return flow.map((conn, i) => {
    const f = nm[conn.from];
    const t = nm[conn.to];
    if (!f || !t) return null;

    // Auto-label yes / no if not provided
    let label = conn.label || "";
    if (!label) {
      if (conn.type === "yes") label = "Yes";
      else if (conn.type === "no") label = "No";
    }

    // Loop-back routing for genuine back-edges
    if (isLoopBack(f, t)) {
      return renderLoopBack(f, t, label, i, markerId);
    }

    const { fromSide, toSide } = pickSides(f, t, conn.type);
    const built = buildEdgePath({ from: f, to: t, fromSide, toSide });

    return (
      <EdgePath
        key={i}
        points={built.points}
        label={label}
        markerId={markerId}
      />
    );
  });
}

/* Loop-back routing — out the top of source, around the right
   side, back down into the top of target (clean upside-down U). */
function renderLoopBack(from, to, label, i, markerId) {
  const [fx, fy] = anchor.top(from);
  const [tx, ty] = anchor.top(to);

  // Rise high enough above both nodes to clear them
  const ceiling = Math.min(fy, ty) - 56;

  const pts = [
    [fx, fy],
    [fx, ceiling],
    [tx, ceiling],
    [tx, ty],
  ];

  // shorten end so arrow doesn't overlap target border
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const [sx, sy, ex, ey] = shorten(prev[0], prev[1], last[0], last[1], 5);
  pts[pts.length - 2] = [sx, sy];
  pts[pts.length - 1] = [ex, ey];

  const d = orthogonalPath(pts, EDGE_RADIUS);
  const midX = (fx + tx) / 2;

  return (
    <g key={i}>
      <path
        d={d}
        fill="none"
        stroke={TOKENS.edge}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
      />
      {label && <EdgeLabel x={midX} y={ceiling} text={label} />}
    </g>
  );
}

/* Backwards-compat helpers (kept in case anything still imports them) */
export function Seg({ x1, y1, x2, y2, label, markerId = MARKER_ID }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={TOKENS.edge}
        strokeWidth={1.5}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        fill="none"
      />
      {label && <EdgeLabel x={mx} y={my} text={label} />}
    </g>
  );
}

export function Elbow({ pts, label, markerId = MARKER_ID }) {
  const d = orthogonalPath(pts, EDGE_RADIUS);
  const [mx, my] = midOf(pts);
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={TOKENS.edge}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
      />
      {label && <EdgeLabel x={mx} y={my} text={label} />}
    </g>
  );
}
