import React, { useState } from "react";
import { GitBranch, Bot, Layers, CheckCircle } from "lucide-react";
import { 
  COLORS, 
  NODE_W, 
  NODE_H, 
  START_R, 
  DIAMOND_S, 
  MARKER_ID, 
  wrapText 
} from "../utils/workflowUtils";

export function ProcessNode({ n, isOpen, toggleAgent, onDragStart }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const agentInfo = n.agentInfo;
  const accent = agentInfo ? (COLORS[n.color] || COLORS.pink) : COLORS.green; 
  const bg = accent + "10"; // 10% opacity
  const iconColor = agentInfo ? COLORS.green : accent; // Icon is green if agentic
  const lines = wrapText(n.label);
  const x = n.cx - NODE_W / 2;
  const y = n.cy - NODE_H / 2;

  return (
    <g
      className="node-group"
      data-node-id={n.id}
      onMouseDown={onDragStart}
    >
      {/* Soft Shadow */}
      <rect x={x + 2} y={y + 2} width={NODE_W} height={NODE_H} rx={14}
        fill="rgba(0,0,0,0.06)" />

      {/* Main Card - White base to block underlying lines */}
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={14}
        fill="#ffffff" />
      {/* Tinted Overlay */}
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={14}
        fill={bg} stroke={accent + "30"} strokeWidth={1} />

      {/* Left Accent Bar */}
      <path d={`M ${x + 8} ${y} 
                H ${x + 6} 
                A 6 6 0 0 0 ${x} ${y + 6} 
                V ${y + NODE_H - 6} 
                A 6 6 0 0 0 ${x + 6} ${y + NODE_H} 
                H ${x + 8} Z`}
        fill={accent} />

      {/* Icon Container (White Circle) */}
      <rect x={x + 18} y={n.cy - 16} width={32} height={32} rx={10}
        fill="#fff" stroke="rgba(0,0,0,0.05)" strokeWidth={0.5} />

      {/* Database/Process Icon */}
      <g transform={`translate(${x + 24}, ${n.cy - 10})`} fill="none" stroke={iconColor} strokeWidth={1.5}>
        <ellipse cx="10" cy="5" rx="7" ry="3" />
        <path d="M 3 5 v 8 c 0 1.65 3.13 3 7 3 s 7 -1.35 7 -3 v -8" />
      </g>

      {/* Text Content */}
      <g transform={`translate(${x + 62}, ${n.cy})`}>
        {lines.map((ln, i) => (
          <text key={i} x={0}
            y={(i - (lines.length - 1) / 2) * 16}
            textAnchor="start" dominantBaseline="middle"
            fill="#1F2937" fontSize={11.5} fontWeight={700}
            fontFamily="Inter, Segoe UI, sans-serif">{ln}</text>
        ))}
      </g>

      {/* Interactive Badge Area - Only if Agentic Info exists */}
      {agentInfo && (
        <foreignObject
          x={x + NODE_W - 18}
          y={y - 18}
          width={300}
          height={350}
          style={{ overflow: "visible", pointerEvents: "none", userSelect: "none" }}
        >
          <div style={{ position: "relative", pointerEvents: "all" }}>
            {/* Badge Icon */}
            <div
              className={`w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-emerald-500 transition-all duration-500 cursor-pointer hover:scale-110 active:scale-95 ${isOpen ? "rotate-90 bg-emerald-50" : ""}`}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <GitBranch size={16} className="text-emerald-600 stroke-[2.5]" />
            </div>

            {/* Rich Agent Card Tooltip */}
            <div
              className={`absolute bottom-[120%] right-0 mb-4 w-72 bg-white rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden transition-all duration-500 z-[110] origin-bottom-right ${showTooltip ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"}`}
              style={{ pointerEvents: showTooltip ? "auto" : "none" }}
            >
              {/* Card Header - Now Blue as requested */}
              <div
                className="text-white p-4 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.blue}, #2563eb)`
                }}
              >
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <Bot size={20} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{agentInfo.type}</span>
                  <span className="font-extrabold text-sm tracking-tight">{agentInfo.title}</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 bg-slate-50/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Tasks</span>
                </div>
                <ul className="space-y-2.5">
                  {(agentInfo.tasks || []).map((task, i) => (
                    <li key={i} className="flex items-start gap-3 group/item">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                      <span className="text-[11px] font-semibold text-slate-600 leading-relaxed group-hover/item:text-slate-900 transition-colors">
                        {task}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tooltip Arrow */}
              <div className="absolute top-full right-4 -mt-1 border-[10px] border-transparent border-t-white" />
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export function StartNode({ n, onDragStart }) {
  return (
    <circle
      cx={n.cx} cy={n.cy} r={START_R}
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group cursor-grab active:cursor-grabbing"
      fill={COLORS.pink} stroke="rgba(0,0,0,0.08)" strokeWidth={0.8} />
  );
}

export function DiamondNode({ n, onDragStart }) {
  const { cx, cy } = n;
  const s = DIAMOND_S;
  return (
    <g
      data-node-id={n.id}
      onMouseDown={onDragStart}
      className="node-group cursor-grab active:cursor-grabbing"
    >
      {/* Outer Glow effect - simple approach using a larger polygon */}
      <polygon
        points={`${cx},${cy - s - 4} ${cx + s + 4},${cy} ${cx},${cy + s + 4} ${cx - s - 4},${cy}`}
        fill="rgba(234, 179, 8, 0.15)" />

      <polygon
        points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
        fill={COLORS.yellow} stroke="rgba(0,0,0,0.1)" strokeWidth={0.8} />

      <text x={cx} y={cy - s - 10} textAnchor="middle"
        fill="#1F2937" fontSize={11} fontWeight={800} fontFamily="Inter, Segoe UI, sans-serif"
        pointerEvents="none"
      >
        {n.label}
      </text>
    </g>
  );
}

export function AgentNode({ parentNode, offset, onDragStart }) {
  const relX = offset?.x ?? (NODE_W / 2 + 50);
  const relY = offset?.y ?? -85;
  const x = parentNode.cx + relX;
  const y = parentNode.cy + relY;
  const width = 280;
  const height = 200;

  return (
    <g className="agent-group cursor-grab active:cursor-grabbing"
      data-agent-id={parentNode.id}
      onMouseDown={onDragStart}
    >
      {/* Automates Edge - Bezier curve that adjusts to agent position */}
      <path
        d={`M ${parentNode.cx + NODE_W / 2} ${parentNode.cy} 
           C ${parentNode.cx + NODE_W / 2 + 30} ${parentNode.cy}, 
             ${x + 20} ${y + height / 2 + 30}, 
             ${x + 40} ${y + 100}`}
        fill="none" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5"
        markerEnd={`url(#${MARKER_ID})`}
      />
      <g transform={`translate(${parentNode.cx + NODE_W / 2 + 35}, ${parentNode.cy + 12})`}>
        <rect x={-35} y={-8} width={70} height={16} rx={4} fill="#fff" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fontWeight={900} fill="#10B981" letterSpacing="1px" pointerEvents="none">
          AUTOMATES
        </text>
      </g>

      <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: "visible", pointerEvents: "none" }}>
        <div className="w-[260px] bg-white border-2 border-violet-500 rounded-3xl shadow-[0_20px_50px_-12px_rgba(139,92,246,0.3)] overflow-hidden scale-90 origin-top-left animate-in zoom-in fade-in duration-500">
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-4 flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Bot size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Orchestrator</span>
              <span className="font-extrabold text-sm tracking-tight leading-none">Process Agent</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50/50">
            <ul className="space-y-3">
              {(parentNode.agentInfo?.tasks || [
                "Validates sequence logic",
                "Orchestrates parallel tasks",
                "Verifies data integrity"
              ]).map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-[12px] font-bold text-slate-700 leading-tight">
                  <div className="mt-1 w-2 h-2 rounded-full bg-violet-500 shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
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
