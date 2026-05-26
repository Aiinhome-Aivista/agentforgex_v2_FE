import React, { useState } from "react";
import { GitBranch, Bot, Layers, CheckCircle } from "lucide-react";
import {
  COLORS,
  NODE_W,
  NODE_H,
  START_R,
  DIAMOND_S,
  MARKER_ID,
  LANE_ACCENTS,
  wrapText,
} from "../utils/workflowUtils";

const getNodeAccent = (n) => {
  if (n.agentInfo) {
    return LANE_ACCENTS[4]; // Rose (Red)
  }
  return LANE_ACCENTS[1]; // Emerald (Green)
};

/* ═══════════════════════════════════════════════════════════
   PROCESS NODE — Clean card with colored left accent bar
═══════════════════════════════════════════════════════════ */
export function ProcessNode({ n, isOpen, toggleAgent, onDragStart }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const agentInfo = n.agentInfo;
  const laneAccent = getNodeAccent(n);
  const suggestionAccent = LANE_ACCENTS[0]; // Blue
  const lines = wrapText(n.label);
  const x = n.cx - NODE_W / 2;
  const y = n.cy - NODE_H / 2;
  const rx = 8;
  const barW = 4;

  return (
    <g
      className="node-group"
      data-node-id={n.id}
      onMouseDown={onDragStart}
    >
      {/* Subtle drop shadow */}
      <rect
        x={x + 1} y={y + 2}
        width={NODE_W} height={NODE_H} rx={rx}
        fill="rgba(0,0,0,0.05)"
      />

      {/* Main card — white fill, soft border */}
      <rect
        x={x} y={y}
        width={NODE_W} height={NODE_H} rx={rx}
        fill={COLORS.node_bg}
        stroke={laneAccent.accent + "30"}
        strokeWidth={1}
      />

      {/* Subtle tinted background */}
      <rect
        x={x} y={y}
        width={NODE_W} height={NODE_H} rx={rx}
        fill={laneAccent.node_tint}
      />

      {/* Left accent bar */}
      <rect
        x={x} y={y + 6}
        width={barW} height={NODE_H - 12} rx={2}
        fill={laneAccent.node_bar}
      />

      {/* Text — left-aligned after accent bar */}
      <g transform={`translate(${x + barW + 14}, ${n.cy})`}>
        {lines.map((ln, i) => (
          <text
            key={i}
            x={0}
            y={(i - (lines.length - 1) / 2) * 18}
            textAnchor="start"
            dominantBaseline="middle"
            fill={COLORS.node_text}
            fontSize={14}
            fontWeight={700}
            fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
          >
            {ln}
          </text>
        ))}
      </g>

      {/* Agent badge — subtle indicator */}
      {agentInfo && (
        <foreignObject
          x={x + NODE_W - 14}
          y={y - 14}
          width={300}
          height={350}
          style={{ overflow: "visible", pointerEvents: "none", userSelect: "none" }}
        >
          <div style={{ position: "relative", pointerEvents: "all" }}>
            {/* Badge dot */}
            <div
              className={`w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${isOpen ? "ring-2 ring-offset-1" : ""}`}
              style={{
                borderColor: LANE_ACCENTS[1].accent + "60",
                borderWidth: 1.5,
                ...(isOpen ? { ringColor: LANE_ACCENTS[1].accent } : {}),
              }}
              onClick={toggleAgent}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <GitBranch size={13} style={{ color: LANE_ACCENTS[1].accent }} className="stroke-[2]" />
            </div>

            {/* Agent tooltip card */}
            <div
              className={`absolute bottom-[120%] right-0 mb-3 w-64 bg-white rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-200 overflow-hidden transition-all duration-300 z-[110] origin-bottom-right ${showTooltip ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-3 pointer-events-none"}`}
            >
              {/* Header */}
              <div
                className="text-white p-3 flex items-center gap-2.5"
                style={{ background: `linear-gradient(135deg, ${suggestionAccent.accent}, ${suggestionAccent.accent}dd)` }}
              >
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
                  <Bot size={16} className="stroke-[2]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">
                    {agentInfo.type}
                  </span>
                  <span className="font-bold text-xs tracking-tight">
                    {agentInfo.title}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 bg-gray-50/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Layers size={12} className="text-gray-400" />
                  <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                    Key Tasks
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {(agentInfo.tasks || []).map((task, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-[10px] font-medium text-gray-600 leading-snug">
                        {task}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   START NODE — Green rounded pill with "Start" label
═══════════════════════════════════════════════════════════ */
export function StartNode({ n, onDragStart }) {
  const w = START_R * 2.4;
  const h = START_R * 1.3;
  const rx = h / 2;

  return (
    <g
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group cursor-grab active:cursor-grabbing"
    >
      {/* Subtle shadow */}
      <rect
        x={n.cx - w / 2 + 1} y={n.cy - h / 2 + 1.5}
        width={w} height={h} rx={rx}
        fill="rgba(0,0,0,0.04)"
      />

      {/* Pill shape */}
      <rect
        x={n.cx - w / 2} y={n.cy - h / 2}
        width={w} height={h} rx={rx}
        fill={COLORS.start_fill}
        stroke={COLORS.start_stroke}
        strokeWidth={1.5}
      />

      {/* "Start" label */}
      <text
        x={n.cx} y={n.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLORS.start_text}
        fontSize={15}
        fontWeight={800}
        fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
      >
        Start
      </text>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   END NODE — Burgundy/red rounded pill with "End" label
   Mirrors StartNode visually so the canonical pattern reads
   left-to-right: green Start → process steps → red End.
═══════════════════════════════════════════════════════════ */
export function EndNode({ n, onDragStart }) {
  const w = START_R * 2.4;
  const h = START_R * 1.3;
  const rx = h / 2;
  const label = (n && n.label) || "End";

  return (
    <g
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group cursor-grab active:cursor-grabbing"
    >
      {/* Subtle shadow */}
      <rect
        x={n.cx - w / 2 + 1} y={n.cy - h / 2 + 1.5}
        width={w} height={h} rx={rx}
        fill="rgba(0,0,0,0.04)"
      />

      {/* Pill shape — uses end_* color tokens */}
      <rect
        x={n.cx - w / 2} y={n.cy - h / 2}
        width={w} height={h} rx={rx}
        fill={COLORS.end_fill || "#FEE2E2"}
        stroke={COLORS.end_stroke || "#FCA5A5"}
        strokeWidth={1.5}
      />

      {/* "End" label */}
      <text
        x={n.cx} y={n.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLORS.end_text || "#991B1B"}
        fontSize={15}
        fontWeight={800}
        fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   DIAMOND NODE — Lavender/indigo decision diamond
═══════════════════════════════════════════════════════════ */
export function DiamondNode({ n, onDragStart }) {
  const { cx, cy } = n;
  const s = DIAMOND_S;

  const lines = wrapText(n.label, 14);

  return (
    <g
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group cursor-grab active:cursor-grabbing"
    >
      {/* Diamond shape */}
      <polygon
        points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
        fill={COLORS.decision_fill}
        stroke={COLORS.decision_stroke}
        strokeWidth={1.5}
      />

      {/* Text centered inside */}
      {lines.map((ln, i) => (
        <text
          key={i}
          x={cx}
          y={cy + (i - (lines.length - 1) / 2) * 15}
          textAnchor="middle"
          dominantBaseline="central"
          fill={COLORS.decision_text}
          fontSize={12}
          fontWeight={800}
          fontFamily="Inter, 'Segoe UI', system-ui, sans-serif"
          pointerEvents="none"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT NODE — Floating agent detail card
═══════════════════════════════════════════════════════════ */
export function AgentNode({ parentNode, offset, onDragStart }) {
  const relX = offset?.x ?? (NODE_W / 2 + 50);
  const relY = offset?.y ?? -85;
  const x = parentNode.cx + relX;
  const y = parentNode.cy + relY;
  const width = 260;
  const height = 180;
  const laneAccent = LANE_ACCENTS[0]; // Blue

  return (
    <g
      className="agent-group cursor-grab active:cursor-grabbing"
      data-agent-id={parentNode.id}
      onMouseDown={onDragStart}
    >
      {/* Connector line */}
      <path
        d={`M ${parentNode.cx + NODE_W / 2} ${parentNode.cy}
           C ${parentNode.cx + NODE_W / 2 + 25} ${parentNode.cy},
             ${x + 15} ${y + height / 2 + 20},
             ${x + 30} ${y + 80}`}
        fill="none"
        stroke={laneAccent.accent}
        strokeWidth={1.2}
        strokeDasharray="4 4"
        markerEnd={`url(#${MARKER_ID})`}
      />
      <g transform={`translate(${parentNode.cx + NODE_W / 2 + 30}, ${parentNode.cy + 10})`}>
        <rect x={-30} y={-7} width={60} height={14} rx={7} fill="#fff" stroke="#E5E7EB" strokeWidth={0.8} />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fontWeight={700}
          fill={laneAccent.accent}
          letterSpacing="0.8px"
          pointerEvents="none"
        >
          AUTOMATES
        </text>
      </g>

      <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: "visible", pointerEvents: "none" }}>
        <div
          className="w-[240px] bg-white rounded-xl overflow-hidden scale-90 origin-top-left"
          style={{
            border: `1.5px solid ${laneAccent.accent}40`,
            boxShadow: `0 12px 32px -8px ${laneAccent.accent}25`,
          }}
        >
          <div
            className="p-3 flex items-center gap-2.5 text-white"
            style={{ background: `linear-gradient(135deg, ${laneAccent.accent}, ${laneAccent.accent}cc)` }}
          >
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
              <Bot size={16} className="stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-80">
                Orchestrator
              </span>
              <span className="font-bold text-xs tracking-tight leading-none">
                Process Agent
              </span>
            </div>
          </div>
          <div className="p-3 bg-gray-50/50">
            <ul className="space-y-2">
              {(parentNode.agentInfo?.tasks || [
                "Validates sequence logic",
                "Orchestrates parallel tasks",
                "Verifies data integrity",
              ]).map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] font-medium text-gray-600 leading-tight"
                >
                  <div
                    className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: laneAccent.accent }}
                  />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
