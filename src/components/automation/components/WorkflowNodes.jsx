import React, { useState } from "react";
import { GitBranch, Bot, Layers, CheckCircle } from "lucide-react";
import {
  COLORS,
  TOKENS,
  NODE_W,
  NODE_H,
  NODE_RX,
  START_W,
  START_H,
  START_RX,
  DIAMOND_S,
  DIAMOND_RX,
  MARKER_ID,
  wrapText,
} from "../utils/workflowUtils";

/* ─────────────────────────────────────────────────────────
   PROCESS NODE — refined white card, centered text, subtle
   border, tiny lane-colored dot. No heavy accent strips.
───────────────────────────────────────────────────────── */
export function ProcessNode({ n, isOpen, toggleAgent, onDragStart, laneAccent }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);

  const agentInfo = n.agentInfo;
  const dotColor = agentInfo?.accentColor || COLORS[n.color] || laneAccent || COLORS.blue;
  const lines = wrapText(n.label, 26, 3);

  const x = n.cx - NODE_W / 2;
  const y = n.cy - NODE_H / 2;

  return (
    <g
      className="node-group"
      data-node-id={n.id}
      onMouseDown={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "grab" }}
    >
      {/* Soft drop-shadow */}
      <rect
        x={x}
        y={y + 2}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_RX}
        fill="rgba(15,23,42,0.06)"
        filter="blur(4px)"
      />

      {/* Main card */}
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={NODE_RX}
        fill={TOKENS.processFill}
        stroke={hovered ? TOKENS.borderStrong : TOKENS.processBorder}
        strokeWidth={1.25}
        style={{ transition: "stroke 160ms ease" }}
      />

      {/* Tiny lane-accent dot — top-left corner */}
      <circle cx={x + 12} cy={y + 12} r={3.2} fill={dotColor} opacity={0.85} />

      {/* Label — centered horizontally and vertically */}
      <g transform={`translate(${n.cx}, ${n.cy})`} pointerEvents="none">
        {lines.map((ln, i) => (
          <text
            key={i}
            x={0}
            y={(i - (lines.length - 1) / 2) * 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={TOKENS.processText}
            fontSize={12.5}
            fontWeight={500}
            fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
            letterSpacing="-0.01em"
          >
            {ln}
          </text>
        ))}
      </g>

      {/* Agent badge — keep functionality, refine styling */}
      {agentInfo && (
        <foreignObject
          x={x + NODE_W - 16}
          y={y - 16}
          width={320}
          height={360}
          style={{ overflow: "visible", pointerEvents: "none", userSelect: "none" }}
        >
          <div style={{ position: "relative", pointerEvents: "all" }}>
            <div
              className={`w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-emerald-400/70 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${
                isOpen ? "rotate-90 bg-emerald-50 border-emerald-500" : ""
              }`}
              onClick={toggleAgent}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <GitBranch size={14} className="text-emerald-600 stroke-[2.5]" />
            </div>

            <div
              className={`absolute bottom-[120%] right-0 mb-3 w-72 bg-white rounded-2xl shadow-[0_24px_50px_-15px_rgba(15,23,42,0.25)] border border-slate-200 overflow-hidden transition-all duration-300 z-[110] origin-bottom-right ${
                showTooltip
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-2"
              }`}
              style={{ pointerEvents: showTooltip ? "auto" : "none" }}
            >
              <div
                className="text-white p-3.5 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, #4F46E5, #6366F1)`,
                }}
              >
                <div className="bg-white/15 p-1.5 rounded-lg backdrop-blur-md">
                  <Bot size={18} className="stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
                    {agentInfo.type}
                  </span>
                  <span className="font-semibold text-[13px] tracking-tight">
                    {agentInfo.title}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <Layers size={12} className="text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.14em]">
                    Key Tasks
                  </span>
                </div>
                <ul className="space-y-2">
                  {(agentInfo.tasks || []).map((task, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={12}
                        className="text-emerald-500 mt-0.5 shrink-0"
                      />
                      <span className="text-[11px] font-medium text-slate-700 leading-relaxed">
                        {task}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="absolute top-full right-4 -mt-1 border-[8px] border-transparent border-t-white" />
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/* ─────────────────────────────────────────────────────────
   START NODE — green pill with "Start" label
───────────────────────────────────────────────────────── */
export function StartNode({ n, onDragStart }) {
  const x = n.cx - START_W / 2;
  const y = n.cy - START_H / 2;
  const label = n.label && n.label.trim() ? n.label : "Start";

  return (
    <g
      className="node-group"
      data-node-id={n.id}
      onMouseDown={onDragStart}
      style={{ cursor: "grab" }}
    >
      <rect
        x={x}
        y={y + 2}
        width={START_W}
        height={START_H}
        rx={START_RX}
        fill="rgba(15,23,42,0.06)"
        filter="blur(4px)"
      />
      <rect
        x={x}
        y={y}
        width={START_W}
        height={START_H}
        rx={START_RX}
        fill={TOKENS.startFill}
        stroke={TOKENS.startBorder}
        strokeWidth={1.25}
      />
      <text
        x={n.cx}
        y={n.cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={TOKENS.startText}
        fontSize={13}
        fontWeight={600}
        fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
        letterSpacing="-0.01em"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────
   END NODE — same shape as start, label "Finish"
───────────────────────────────────────────────────────── */
export function EndNode({ n, onDragStart }) {
  const x = n.cx - START_W / 2;
  const y = n.cy - START_H / 2;
  const label = n.label && n.label.trim() ? n.label : "Finish";

  return (
    <g
      className="node-group"
      data-node-id={n.id}
      onMouseDown={onDragStart}
      style={{ cursor: "grab" }}
    >
      <rect
        x={x}
        y={y + 2}
        width={START_W}
        height={START_H}
        rx={START_RX}
        fill="rgba(15,23,42,0.06)"
        filter="blur(4px)"
      />
      <rect
        x={x}
        y={y}
        width={START_W}
        height={START_H}
        rx={START_RX}
        fill={TOKENS.endFill}
        stroke={TOKENS.endBorder}
        strokeWidth={1.25}
      />
      <text
        x={n.cx}
        y={n.cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={TOKENS.endText}
        fontSize={13}
        fontWeight={600}
        fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
        letterSpacing="-0.01em"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────
   DIAMOND DECISION NODE — lavender, rounded corners,
   text inside if short, above otherwise.
───────────────────────────────────────────────────────── */
export function DiamondNode({ n, onDragStart }) {
  const { cx, cy } = n;
  const s = DIAMOND_S;
  const label = n.label || "?";
  const short = label.length <= 12;
  const lines = wrapText(label, 14, 2);

  return (
    <g
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group"
      style={{ cursor: "grab" }}
    >
      {/* Rotated rounded square = diamond with soft corners */}
      <g transform={`translate(${cx}, ${cy}) rotate(45)`}>
        <rect
          x={-s / Math.SQRT2 - 0}
          y={-s / Math.SQRT2 - 0}
          width={(s / Math.SQRT2) * 2}
          height={(s / Math.SQRT2) * 2}
          rx={DIAMOND_RX}
          fill="rgba(15,23,42,0.06)"
          transform="translate(0, 2)"
          filter="blur(4px)"
        />
        <rect
          x={-s / Math.SQRT2}
          y={-s / Math.SQRT2}
          width={(s / Math.SQRT2) * 2}
          height={(s / Math.SQRT2) * 2}
          rx={DIAMOND_RX}
          fill={TOKENS.decisionFill}
          stroke={TOKENS.decisionBorder}
          strokeWidth={1.25}
        />
      </g>

      {short ? (
        <g pointerEvents="none">
          {lines.map((ln, i) => (
            <text
              key={i}
              x={cx}
              y={cy + (i - (lines.length - 1) / 2) * 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={TOKENS.decisionText}
              fontSize={11}
              fontWeight={600}
              fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
              letterSpacing="-0.01em"
            >
              {ln}
            </text>
          ))}
        </g>
      ) : (
        <text
          x={cx}
          y={cy - s - 10}
          textAnchor="middle"
          fill={TOKENS.textPrimary}
          fontSize={11.5}
          fontWeight={600}
          fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
          letterSpacing="-0.01em"
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/* ─────────────────────────────────────────────────────────
   AGENT NODE — same functional concept, refined visuals
───────────────────────────────────────────────────────── */
export function AgentNode({ parentNode, offset, onDragStart }) {
  const relX = offset?.x ?? (NODE_W / 2 + 60);
  const relY = offset?.y ?? -110;
  const x = parentNode.cx + relX;
  const y = parentNode.cy + relY;
  const width = 280;
  const height = 200;

  return (
    <g
      className="agent-group"
      data-agent-id={parentNode.id}
      onMouseDown={onDragStart}
      style={{ cursor: "grab" }}
    >
      <path
        d={`M ${parentNode.cx + NODE_W / 2} ${parentNode.cy}
           C ${parentNode.cx + NODE_W / 2 + 40} ${parentNode.cy},
             ${x + 10} ${y + height / 2 + 30},
             ${x + 40} ${y + 100}`}
        fill="none"
        stroke="#6366F1"
        strokeWidth={1.5}
        strokeDasharray="5 5"
        opacity={0.7}
        markerEnd={`url(#${MARKER_ID})`}
      />
      <g
        transform={`translate(${parentNode.cx + NODE_W / 2 + 38}, ${
          parentNode.cy + 14
        })`}
      >
        <rect x={-36} y={-9} width={72} height={18} rx={9} fill="#fff" stroke="#E0E7FF" />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8.5}
          fontWeight={700}
          fill="#4338CA"
          letterSpacing="0.15em"
          pointerEvents="none"
        >
          AUTOMATES
        </text>
      </g>

      <foreignObject
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div className="w-[260px] bg-white border border-indigo-200 rounded-2xl shadow-[0_24px_50px_-15px_rgba(79,70,229,0.3)] overflow-hidden scale-95 origin-top-left">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3.5 flex items-center gap-3 text-white">
            <div className="bg-white/15 p-1.5 rounded-lg backdrop-blur-md">
              <Bot size={18} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-80">
                Orchestrator
              </span>
              <span className="font-semibold text-[13px] tracking-tight leading-none">
                Process Agent
              </span>
            </div>
          </div>
          <div className="p-3.5 bg-slate-50/40">
            <ul className="space-y-2">
              {(parentNode.agentInfo?.tasks || [
                "Validates sequence logic",
                "Orchestrates parallel tasks",
                "Verifies data integrity",
              ]).map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[11.5px] font-medium text-slate-700 leading-snug"
                >
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
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
