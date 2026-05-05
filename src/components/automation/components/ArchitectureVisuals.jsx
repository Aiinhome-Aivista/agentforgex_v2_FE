import React from "react";
import { EDGE_STYLES } from "../utils/architectureHelpers";
import { Server } from "lucide-react";

export function ArchitectureCanvas({ 
  viewBox, 
  height, 
  isRunning, 
  children 
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white/70 overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="absolute top-4 right-6 text-[10px] uppercase font-black tracking-[0.25em] text-slate-400 flex items-center gap-2 z-10">
        <span
          className={`w-2 h-2 rounded-full ${isRunning ? "bg-sky-500 animate-pulse" : "bg-slate-300"}`}
        />
        {isRunning ? "executing" : "idle"}
      </div>

      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="sap-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
          </pattern>

          {Object.entries(EDGE_STYLES).map(([key, s]) => (
            <marker
              key={key}
              id={`arrow-${key.replace(/\s/g, "-")}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={s.color} />
            </marker>
          ))}

          <marker
            id="arrow-idle"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>

          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
          </marker>

          <filter id="sap-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#sap-dots)" opacity="0.5" />
        {children}
      </svg>
    </div>
  );
}

export function ArchitectureLane({ lane, canvasWidth }) {
  return (
    <g>
      <rect
        x={16}
        y={lane.yTop}
        width={canvasWidth - 32}
        height={lane.yBottom - lane.yTop - 8}
        fill={lane.accent}
        opacity="0.04"
        rx="12"
      />
      <line
        x1={16}
        y1={lane.yTop}
        x2={canvasWidth - 16}
        y2={lane.yTop}
        stroke={lane.accent}
        strokeOpacity="0.12"
        strokeDasharray="2 6"
      />
      <g>
        <rect
          x={24}
          y={lane.yTop + 10}
          width={140}
          height={26}
          rx="8"
          fill="black"
          stroke="#cbd5e1"
          strokeOpacity="0.8"
          className="shadow-sm"
        />
        <text
          x={94}
          y={lane.yTop + 27}
          fill="white"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2.5"
          textAnchor="middle"
          opacity="0.9"
        >
          {lane.title}
        </text>
      </g>
    </g>
  );
}

export function ArchitectureEdge({ 
  edge, 
  activeEdges, 
  completedEdges, 
  hoveredEdge, 
  setHoveredEdge 
}) {
  const isActive = activeEdges.has(edge.id);
  const isDone = completedEdges.has(edge.id);
  const isHovered = hoveredEdge === edge.id;
  const baseColor = edge.style.color;
  const color = isActive ? "#22c55e" : isDone ? "#16a34a" : baseColor;
  const opacity = isActive ? 1 : isDone ? 0.5 : isHovered ? 0.95 : 0.8;

  const markerKey = isActive
    ? "arrow-active"
    : `arrow-${(edge.label || "sync API").replace(/\s/g, "-")}`;

  return (
    <g
      onMouseEnter={() => setHoveredEdge(edge.id)}
      onMouseLeave={() => setHoveredEdge(null)}
      style={{ cursor: "pointer" }}
    >
      {/* hit area (invisible, wider) */}
      <path d={edge.d} fill="none" stroke="transparent" strokeWidth="14" />
      
      {/* visible path */}
      <path
        d={edge.d}
        fill="none"
        stroke={color}
        strokeWidth={isActive || isHovered ? 2.5 : 1.8}
        strokeDasharray={edge.style.dashed ? "5 4" : "none"}
        strokeOpacity={opacity}
        markerEnd={`url(#${markerKey})`}
        filter={isActive ? "url(#sap-glow)" : undefined}
        style={{
          transition: "stroke 0.35s ease, stroke-opacity 0.2s ease, stroke-width 0.2s ease",
        }}
      />

      {/* flowing dots on active */}
      {isActive && (
        <path
          d={edge.d}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeDasharray="2 9"
          strokeLinecap="round"
          opacity="0.9"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-22"
            dur="0.6s"
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* hover label */}
      {isHovered && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={edge.mid.x - 42}
            y={edge.mid.y - 10}
            width="84"
            height="20"
            rx="4"
            fill="white"
            stroke={baseColor}
            strokeOpacity="0.7"
          />
          <text
            x={edge.mid.x}
            y={edge.mid.y + 4}
            fill={baseColor}
            fontSize="9"
            fontWeight="600"
            letterSpacing="1.5"
            textAnchor="middle"
          >
            {edge.style.label}
          </text>
        </g>
      )}
    </g>
  );
}

export function ArchitectureNode({ 
  node, 
  pos, 
  icon: Icon, 
  accentColor, 
  isActive, 
  isDone, 
  isHovered, 
  setHoveredNode,
  nodeWidth,
  nodeHeight
}) {
  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onMouseEnter={() => setHoveredNode(node.id)}
      onMouseLeave={() => setHoveredNode(null)}
      style={{ cursor: "pointer", transition: "all 0.3s ease" }}
    >
      <foreignObject width={nodeWidth} height={nodeHeight} className="overflow-visible">
        <div
          className={`w-full h-full border-2 rounded-2xl flex items-center p-3 relative transition-all duration-500 bg-white ${isActive
            ? "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)] scale-[1.03]"
            : isHovered
              ? "shadow-xl -translate-y-1"
              : "shadow-md"
            }`}
          style={{
            backgroundColor: isActive ? "#f0fdf4" : "white",
            borderColor: isActive
              ? "#22c55e"
              : isHovered
                ? accentColor
                : `${accentColor}40`,
          }}
        >
          {/* Left accent bar */}
          <div
            className="absolute top-0 left-0 w-1.5 h-full transition-all"
            style={{ backgroundColor: accentColor }}
          />

          {/* Icon Box */}
          <div
            className={`p-2.5 rounded-xl bg-slate-50 shadow-inner shrink-0 mr-4 transition-transform ${isHovered ? "scale-110" : ""
              }`}
            style={{ color: isActive ? "#16a34a" : accentColor }}
          >
            {Icon && React.createElement(Icon, { size: 22, className: "stroke-[2.5]" })}
          </div>

          {/* Text Content */}
          <div className="flex flex-col flex-1 min-w-0 pr-1">
            <span
              className={`font-bold text-[13px] leading-tight line-clamp-2 ${isActive ? "text-slate-900" : "text-slate-800"
                }`}
            >
              {node.data.label}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 mt-0.5">
              {node.type}
            </span>
          </div>

          {/* Status Indicators */}
          {isActive && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
          {isDone && !isActive && (
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
          )}
        </div>
      </foreignObject>
    </g>
  );
}
