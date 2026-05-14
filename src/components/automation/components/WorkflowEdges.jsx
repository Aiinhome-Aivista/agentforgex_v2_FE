import React from "react";
import {
  MARKER_ID,
  COLORS,
  NODE_W,
  NODE_H,
  START_R,
  DIAMOND_S,
  shorten,
} from "../utils/workflowUtils";

/* ═══════════════════════════════════════════════════════════
   SVG DEFS — refined arrowhead marker
═══════════════════════════════════════════════════════════ */
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
        <path d="M 0 1 L 8 5 L 0 9 z" fill={COLORS.edge} />
      </marker>
    </defs>
  );
}

/* ─── Edge label pill ────────────────────────────────── */
function EdgeLabel({ x, y, label }) {
  if (!label) return null;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fontWeight={600}
        fill={COLORS.edge}
        fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

/* ─── Straight segment ───────────────────────────────── */
export function Seg({ x1, y1, x2, y2, label, markerId = MARKER_ID }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={COLORS.edge}
        strokeWidth={1.2}
        markerEnd={`url(#${markerId})`}
        fill="none"
      />
      <EdgeLabel x={mx} y={my - 8} label={label} />
    </g>
  );
}

/* ─── Orthogonal elbow with rounded corners ──────────── */
export function Elbow({ pts, label, markerId = MARKER_ID }) {
  if (!pts || pts.length < 2) return null;

  const R = 10; // corner radius

  let d = `M ${pts[0][0]},${pts[0][1]}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    // Direction vectors
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];

    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const r = Math.min(R, len1 / 2, len2 / 2);

    // Point before the corner
    const bx = curr[0] - (dx1 / len1) * r;
    const by = curr[1] - (dy1 / len1) * r;

    // Point after the corner
    const ax = curr[0] + (dx2 / len2) * r;
    const ay = curr[1] + (dy2 / len2) * r;

    // Determine sweep direction
    const cross = dx1 * dy2 - dy1 * dx2;
    const sweep = cross > 0 ? 1 : 0;

    d += ` L ${bx},${by}`;
    d += ` A ${r},${r} 0 0 ${sweep} ${ax},${ay}`;
  }

  // Final point
  const last = pts[pts.length - 1];
  d += ` L ${last[0]},${last[1]}`;

  // Label at midpoint
  const midIdx = Math.floor(pts.length / 2);
  const mid = pts[midIdx];

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={COLORS.edge}
        strokeWidth={1.2}
        markerEnd={`url(#${markerId})`}
      />
      <EdgeLabel x={mid[0]} y={mid[1] - 8} label={label} />
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   RENDER ALL ARROWS — orthogonal routing for every type
═══════════════════════════════════════════════════════════ */
export function renderArrows(flow, nm, svgW, markerId = MARKER_ID) {
  const GAP = 6; // padding from node border

  return flow.map((conn, i) => {
    const f = nm[conn.from];
    const t = nm[conn.to];
    if (!f || !t) return null;

    const edgeLabel = conn.label || "";

    switch (conn.type) {
      /* ── Horizontal within lane ─────────────────────── */
      case "inline": {
        // Source right edge
        let x1, y1;
        if (f.type === "start") {
          // Start pill: right edge
          const pillW = START_R * 2.4;
          x1 = f.cx + pillW / 2;
          y1 = f.cy;
        } else if (f.type === "decision") {
          x1 = f.cx + DIAMOND_S;
          y1 = f.cy;
        } else {
          x1 = f.cx + NODE_W / 2;
          y1 = f.cy;
        }

        // Target left edge
        let x2, y2;
        if (t.type === "decision") {
          x2 = t.cx - DIAMOND_S;
          y2 = t.cy;
        } else {
          x2 = t.cx - NODE_W / 2;
          y2 = t.cy;
        }

        // If same row — straight horizontal
        if (Math.abs(y1 - y2) < 5) {
          return (
            <Seg
              key={i}
              x1={x1 + GAP} y1={y1}
              x2={x2 - GAP} y2={y2}
              label={edgeLabel}
              markerId={markerId}
            />
          );
        }

        // Different row — orthogonal elbow: right → down/up → right
        const midX = (x1 + x2) / 2;
        return (
          <Elbow
            key={i}
            pts={[
              [x1 + GAP, y1],
              [midX, y1],
              [midX, y2],
              [x2 - GAP, y2],
            ]}
            label={edgeLabel}
            markerId={markerId}
          />
        );
      }

      /* ── Straight down (next lane) ──────────────────── */
      case "down": {
        const x1 = f.type === "start" ? f.cx : f.cx;
        const y1 = f.type === "start"
          ? f.cy + (START_R * 1.3) / 2
          : f.cy + NODE_H / 2;

        const x2 = t.cx;
        const y2 = t.type === "decision"
          ? t.cy - DIAMOND_S
          : t.cy - NODE_H / 2;

        // Same column — straight vertical
        if (Math.abs(x1 - x2) < 5) {
          return (
            <Seg
              key={i}
              x1={x1} y1={y1 + GAP}
              x2={x2} y2={y2 - GAP}
              label={edgeLabel}
              markerId={markerId}
            />
          );
        }

        // Different column — orthogonal: down → across → down
        const midY = (y1 + y2) / 2;
        return (
          <Elbow
            key={i}
            pts={[
              [x1, y1 + GAP],
              [x1, midY],
              [x2, midY],
              [x2, y2 - GAP],
            ]}
            label={edgeLabel}
            markerId={markerId}
          />
        );
      }

      /* ── YES — from diamond bottom to target top ────── */
      case "yes": {
        const x1 = f.cx;
        const y1 = f.cy + DIAMOND_S;
        const x2 = t.cx;
        const y2 = t.cy - NODE_H / 2;

        // Label position
        const labelX = x1 + 14;
        const labelY = y1 + 4;

        // Same column — straight down
        if (Math.abs(x1 - x2) < 5) {
          return (
            <g key={i}>
              <Seg
                x1={x1} y1={y1 + GAP}
                x2={x2} y2={y2 - GAP}
                markerId={markerId}
              />
              <EdgeLabel x={labelX} y={labelY} label={edgeLabel || "Yes"} />
            </g>
          );
        }

        // Different column — orthogonal routing
        const midY = (y1 + y2) / 2;
        return (
          <g key={i}>
            <Elbow
              pts={[
                [x1, y1 + GAP],
                [x1, midY],
                [x2, midY],
                [x2, y2 - GAP],
              ]}
              markerId={markerId}
            />
            <EdgeLabel x={labelX} y={labelY} label={edgeLabel || "Yes"} />
          </g>
        );
      }

      /* ── NO — from diamond right to target ─────────── */
      case "no": {
        const x1 = f.cx + DIAMOND_S;
        const y1 = f.cy;
        const x2 = t.cx;
        const y2 = t.cy - NODE_H / 2;

        // Label position
        const labelX = x1 + 14;
        const labelY = y1 - 4;

        // Route: right from diamond → down to target top
        return (
          <g key={i}>
            <Elbow
              pts={[
                [x1 + GAP, y1],
                [x2, y1],
                [x2, y2 - GAP],
              ]}
              markerId={markerId}
            />
            <EdgeLabel x={labelX} y={labelY} label={edgeLabel || "No"} />
          </g>
        );
      }

      /* ── Diagonal down ─────────────────────────────── */
      case "diagonal_down": {
        const x1 = f.cx;
        const y1 = f.cy + NODE_H / 2;
        const x2 = t.cx;
        const y2 = t.cy - NODE_H / 2;

        // Use orthogonal routing instead of true diagonal
        const midY = (y1 + y2) / 2;
        return (
          <Elbow
            key={i}
            pts={[
              [x1, y1 + GAP],
              [x1, midY],
              [x2, midY],
              [x2, y2 - GAP],
            ]}
            label={edgeLabel}
            markerId={markerId}
          />
        );
      }

      default:
        return null;
    }
  });
}
