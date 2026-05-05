import React from "react";
import { 
  MARKER_ID, 
  NODE_W, 
  NODE_H, 
  START_R, 
  DIAMOND_S, 
  shorten 
} from "../utils/workflowUtils";

export function Defs() {
  return (
    <defs>
      <marker id={MARKER_ID} viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#444" />
      </marker>
    </defs>
  );
}

export function Seg({ x1, y1, x2, y2, label }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#444" strokeWidth={1.4}
        markerEnd={`url(#${MARKER_ID})`} fill="none" />
      {label && (
        <g transform={`translate(${mx}, ${my})`}>
          <rect x={-18} y={-7} width={36} height={14} rx={4} fill="#fff" />
          <text textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontWeight={900} fill="#111" letterSpacing="0.05em">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

export function Elbow({ pts, label }) {
  const d = "M " + pts.map(([x, y]) => `${x},${y}`).join(" L ");
  // Approximate midpoint for label
  const mid = pts[Math.floor(pts.length / 2)];
  return (
    <g>
      <path d={d} fill="none" stroke="#444" strokeWidth={1.4}
        markerEnd={`url(#${MARKER_ID})`} />
      {label && mid && (
        <g transform={`translate(${mid[0]}, ${mid[1]})`}>
          <rect x={-18} y={-7} width={36} height={14} rx={4} fill="#fff" />
          <text textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontWeight={900} fill="#111" letterSpacing="0.05em">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

export function renderArrows(flow, nm, svgW) {
  const OFFSET = 4; // Stop line slightly before border

  return flow.map((conn, i) => {
    const f = nm[conn.from];
    const t = nm[conn.to];
    if (!f || !t) return null;

    const edgeLabel = conn.label || "";

    switch (conn.type) {
      /* horizontal within lane */
      case "inline": {
        const x1 = f.type === "start" ? f.cx + START_R
          : f.type === "decision" ? f.cx + DIAMOND_S
            : f.cx + NODE_W / 2;
        const tx2 = t.type === "decision" ? t.cx - DIAMOND_S
          : t.cx - NODE_W / 2;
        const [sx1, sy1, sx2, sy2] = shorten(x1, f.cy, tx2, t.cy, OFFSET);
        return <Seg key={i} x1={sx1} y1={sy1} x2={sx2} y2={sy2} label={edgeLabel} />;
      }

      /* straight down (same column, next lane) */
      case "down": {
        const tx2 = t.cx, ty2 = t.cy - NODE_H / 2;
        const [sx1, sy1, sx2, sy2] = shorten(f.cx, f.cy + NODE_H / 2, tx2, ty2, OFFSET);
        return <Seg key={i} x1={sx1} y1={sy1} x2={sx2} y2={sy2} label={edgeLabel} />;
      }

      /* YES — diagonal from bottom of diamond to top of target */
      case "yes": {
        const x1 = f.cx, y1 = f.cy + DIAMOND_S;
        const tx2 = t.cx, ty2 = t.cy - NODE_H / 2;
        const [sx1, sy1, sx2, sy2] = shorten(x1, y1, tx2, ty2, OFFSET);
        return (
          <g key={i}>
            <Seg x1={sx1} y1={sy1} x2={sx2} y2={sy2} />
            <text x={x1 + (tx2 - x1) * 0.3} y={y1 + (ty2 - y1) * 0.3 - 5}
              fontSize={11} fontWeight="bold" fill="#444"
              fontFamily="Segoe UI, Arial, sans-serif">{edgeLabel}</text>
          </g>
        );
      }

      /* NO — right tip of diamond → far-right wall → up → enter target from right */
      case "no": {
        const fx = f.cx + DIAMOND_S, fy = f.cy;
        const wallX = svgW - 18;
        const ty = t.cy;
        const tx = t.cx + NODE_W / 2;
        const [sx1, sy1, sx2, sy2] = shorten(wallX, ty, tx, ty, OFFSET);
        return (
          <g key={i}>
            <Elbow pts={[[fx, fy], [wallX, fy], [wallX, ty], [sx2, sy2]]} label={edgeLabel} />
            <text x={fx + 8} y={fy - 6} fontSize={11} fill="#444"
              fontFamily="Segoe UI, Arial, sans-serif">{edgeLabel}</text>
          </g>
        );
      }

      /* diagonal_down — straight diagonal from bottom of source to top middle of target */
      case "diagonal_down": {
        const x1 = f.cx, y1 = f.cy + NODE_H / 2;
        const tx2 = t.cx, ty2 = t.cy - NODE_H / 2;
        const [sx1, sy1, sx2, sy2] = shorten(x1, y1, tx2, ty2, OFFSET);
        return <Seg key={i} x1={sx1} y1={sy1} x2={sx2} y2={sy2} label={edgeLabel} />;
      }

      default: return null;
    }
  });
}
