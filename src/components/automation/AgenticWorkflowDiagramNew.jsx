import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
} from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getProcessFlow } from "../../services/api";
import {
  TITLE_W,
  LABEL_W,
  NODE_W,
  LANE_H,
  TOKENS,
  buildWorkflowLayout,
  LANE_STYLES,
} from "./utils/workflowUtils";
import {
  ProcessNode,
  StartNode,
  EndNode,
  DiamondNode,
  AgentNode,
} from "./components/WorkflowNodes";
import { Defs, renderArrows } from "./components/WorkflowEdges";

/* Sample fallback — replace with real API */
export const sampleDiagramData = {
  title: "Process Flow Diagram",
  lanes: [],
  flow: [],
};

/* Subtle dot grid — Linear / Stripe style */
const GRID_BG =
  "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.07) 1px, transparent 0)";

export default function SwimlaneDiagram({
  data: propData,
  suggestionId,
  forPdf = false,
}) {
  const [diagramData, setDiagramData] = useState(propData || sampleDiagramData);
  const [nodes, setNodes] = useState(
    () => buildWorkflowLayout(diagramData).nodeMap
  );
  const [loading, setLoading] = useState(false);
  const lastFetchedId = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 30, zoom: 0.65 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markerId = useId().replace(/:/g, "");

  const layoutBase = useMemo(
    () => buildWorkflowLayout(diagramData),
    [diagramData]
  );
  const laneMeta = layoutBase.laneMeta;
  const svgH = laneMeta.length
    ? laneMeta.reduce((sum, lane) => sum + lane.height, 0)
    : LANE_H;
  const laneBoundaries = laneMeta.length
    ? [0, ...laneMeta.map((lane) => lane.top + lane.height)]
    : [0, LANE_H];
  const laneRenderMeta = laneMeta.length
    ? laneMeta
    : [{ id: "default", index: 0, top: 0, height: LANE_H }];

  /* Sync internal data when propData changes */
  useEffect(() => {
    if (propData) {
      setDiagramData(propData);
    }
  }, [propData]);

  /* Fetch data if suggestionId is provided */
  useEffect(() => {
    if (!suggestionId || lastFetchedId.current === suggestionId) return;
    setLoading(true);
    lastFetchedId.current = suggestionId;
    getProcessFlow(suggestionId)
      .then((res) => {
        setDiagramData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("SwimlaneDiagram Error:", err);
        setLoading(false);
        lastFetchedId.current = null;
      });
  }, [suggestionId]);

  /* Sync nodes when diagramData changes */
  useEffect(() => {
    setNodes(layoutBase.nodeMap);
  }, [layoutBase]);

  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [draggingAgentId, setDraggingAgentId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [openAgentIds, setOpenAgentIds] = useState(new Set());
  const [agentOffsets, setAgentOffsets] = useState({});
  const containerRef = useRef(null);

  const allNodes = Object.values(nodes);
  const rightmost =
    allNodes.length > 0
      ? Math.max(...allNodes.map((n) => n.cx + NODE_W / 2))
      : 500;
  const svgW = rightmost + 320;

  const toggleAgent = useCallback((id) => {
    setOpenAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleZoom = (factor) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(Math.max(prev.zoom * factor, 0.3), 2.5),
    }));
  };

  const handleReset = () => {
    setViewport({ x: 0, y: 30, zoom: 0.65 });
    setNodes(layoutBase.nodeMap);
    setAgentOffsets({});
  };

  const onMouseDown = (e) => {
    if (e.target.closest("button")) return;

    const agentId = e.target
      .closest(".agent-group")
      ?.getAttribute("data-agent-id");
    const nodeId = e.target
      .closest(".node-group")
      ?.getAttribute("data-node-id");

    if (agentId) {
      setDraggingAgentId(agentId);
    } else if (nodeId) {
      setDraggingNodeId(nodeId);
    } else {
      setIsPanning(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseMove = (e) => {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (draggingAgentId) {
      setAgentOffsets((prev) => {
        const current =
          prev[draggingAgentId] || { x: NODE_W / 2 + 60, y: -110 };
        return {
          ...prev,
          [draggingAgentId]: {
            x: current.x + dx / viewport.zoom,
            y: current.y + dy / viewport.zoom,
          },
        };
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId) {
      setNodes((prev) => ({
        ...prev,
        [draggingNodeId]: {
          ...prev[draggingNodeId],
          cx: prev[draggingNodeId].cx + dx / viewport.zoom,
          cy: prev[draggingNodeId].cy + dy / viewport.zoom,
        },
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setDraggingAgentId(null);
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  /* ─────────────── Loading state ─────────────── */
  if (loading) {
    return (
      <div
        className={`w-full border border-slate-200/80 rounded-2xl flex items-center justify-center bg-white transition-all duration-300 ${
          isFullscreen ? "h-screen" : "h-[600px]"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 tracking-tight">
            Loading workflow…
          </p>
        </div>
      </div>
    );
  }

  /* Helper to render a node by type (shared between PDF + interactive) */
  const renderNode = (n, interactive = true) => {
    const lane = laneMeta[n.laneIndex];
    const laneStyle =
      LANE_STYLES[(lane?.index ?? 0) % LANE_STYLES.length] || LANE_STYLES[0];

    if (n.type === "start")
      return (
        <StartNode
          key={n.id}
          n={n}
          onDragStart={interactive ? onMouseDown : () => {}}
        />
      );
    if (n.type === "end")
      return (
        <EndNode
          key={n.id}
          n={n}
          onDragStart={interactive ? onMouseDown : () => {}}
        />
      );
    if (n.type === "decision")
      return (
        <DiamondNode
          key={n.id}
          n={n}
          onDragStart={interactive ? onMouseDown : () => {}}
        />
      );
    return (
      <ProcessNode
        key={n.id}
        n={n}
        isOpen={interactive ? openAgentIds.has(n.id) : false}
        toggleAgent={interactive ? () => toggleAgent(n.id) : () => {}}
        onDragStart={interactive ? onMouseDown : () => {}}
        laneAccent={laneStyle.dot}
      />
    );
  };

  /* ─────────────── PDF (static) render ─────────────── */
  if (forPdf) {
    const totalW = TITLE_W + LABEL_W + svgW;
    return (
      <div
        className="w-full"
        style={{
          fontFamily:
            "'Inter', 'SF Pro Display', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: totalW,
            height: svgH,
            background: TOKENS.canvas,
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 12,
            overflow: "visible",
            position: "relative",
          }}
        >
          {/* Vertical title strip */}
          <div
            style={{
              width: TITLE_W,
              background: TOKENS.surface,
              borderRight: `1px solid ${TOKENS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontWeight: 600,
              fontSize: 11,
              color: TOKENS.textSecondary,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "20px 0",
            }}
          >
            {diagramData.title}
          </div>

          <div
            style={{
              display: "flex",
              position: "relative",
              backgroundImage: GRID_BG,
              backgroundSize: "20px 20px",
              flex: 1,
            }}
          >
            {/* Lane backgrounds */}
            {laneRenderMeta.map((lane) => {
              const laneStyle =
                LANE_STYLES[lane.index % LANE_STYLES.length];
              return (
                <div
                  key={`lane-bg-pdf-${lane.id ?? lane.index}`}
                  style={{
                    position: "absolute",
                    top: lane.top,
                    left: 0,
                    right: 0,
                    height: lane.height,
                    background: laneStyle.bg,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {laneBoundaries.map((y, i) =>
              i === 0 || i === laneBoundaries.length - 1 ? null : (
                <div
                  key={`lane-line-pdf-${i}`}
                  style={{
                    position: "absolute",
                    top: y,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: TOKENS.border,
                    pointerEvents: "none",
                  }}
                />
              )
            )}

            {/* Lane labels */}
            <div
              style={{
                width: LABEL_W,
                borderRight: `1px solid ${TOKENS.border}`,
                position: "relative",
                background: TOKENS.surface,
              }}
            >
              {diagramData.lanes?.map((lane, idx) => {
                const laneStyle = LANE_STYLES[idx % LANE_STYLES.length];
                const laneHeight = laneMeta[idx]?.height ?? LANE_H;
                return (
                  <div
                    key={lane.id}
                    style={{
                      height: laneHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 14px",
                      borderBottom: `1px solid ${TOKENS.border}`,
                    }}
                  >
                    <LaneBadge label={lane.label} style={laneStyle} />
                  </div>
                );
              })}
            </div>

            <svg
              width={svgW}
              height={svgH}
              style={{ background: "transparent", overflow: "visible" }}
            >
              <Defs markerId={markerId} />
              {renderArrows(diagramData.flow || [], nodes, svgW, markerId)}
              {allNodes.map((n) => renderNode(n, false))}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── Interactive render ─────────────── */
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        style={{
          display: "flex",
          width: "100%",
          height: isFullscreen ? "100vh" : 620,
          background: TOKENS.canvas,
          border: isFullscreen ? "none" : `1px solid ${TOKENS.border}`,
          borderRadius: isFullscreen ? 0 : 14,
          boxShadow: isFullscreen
            ? "none"
            : "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
          overflow: "hidden",
          position: "relative",
          cursor:
            isPanning || draggingNodeId || draggingAgentId
              ? "grabbing"
              : "grab",
          transition: "height 0.3s ease",
          userSelect: "none",
          fontFamily:
            "'Inter', 'SF Pro Display', ui-sans-serif, system-ui, sans-serif",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Floating controls — minimal pill cluster */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 12,
            padding: 4,
            boxShadow: "0 4px 12px -4px rgba(15,23,42,0.08)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { icon: ZoomIn, onClick: () => handleZoom(1.15), title: "Zoom In" },
            {
              icon: ZoomOut,
              onClick: () => handleZoom(0.85),
              title: "Zoom Out",
            },
            { icon: RefreshCw, onClick: handleReset, title: "Reset View" },
            {
              icon: isFullscreen ? Minimize2 : Maximize2,
              onClick: toggleFullscreen,
              title: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
            },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              title={btn.title}
              className="w-8 h-8 flex items-center justify-center bg-transparent rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-slate-600 hover:text-slate-900"
            >
              <btn.icon size={15} strokeWidth={2} />
            </button>
          ))}
        </div>

        {/* Vertical title strip */}
        <div
          style={{
            width: TITLE_W,
            background: TOKENS.surface,
            borderRight: `1px solid ${TOKENS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontWeight: 600,
            fontSize: 11,
            color: TOKENS.textSecondary,
            letterSpacing: "0.14em",
            minHeight: "100%",
            padding: "24px 0",
            textTransform: "uppercase",
            zIndex: 10,
            position: "relative",
          }}
        >
          {diagramData.title}
        </div>

        {/* Canvas */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            background: TOKENS.canvas,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: "0 0",
              transition:
                isPanning || draggingNodeId || draggingAgentId
                  ? "none"
                  : "transform 0.12s ease-out",
            }}
          >
            {/* Dot grid background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: GRID_BG,
                backgroundSize: "20px 20px",
                opacity: 1,
                pointerEvents: "none",
              }}
            />

            {/* Lane background tints */}
            {laneRenderMeta.map((lane) => {
              const laneStyle = LANE_STYLES[lane.index % LANE_STYLES.length];
              return (
                <div
                  key={`lane-bg-${lane.id ?? lane.index}`}
                  style={{
                    position: "absolute",
                    top: lane.top,
                    left: 0,
                    right: -10000,
                    height: lane.height,
                    background: laneStyle.bg,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {/* Lane dividing lines — thin and subtle, skip top and bottom */}
            {laneBoundaries.map((y, i) =>
              i === 0 || i === laneBoundaries.length - 1 ? null : (
                <div
                  key={`lane-line-${i}`}
                  style={{
                    position: "absolute",
                    top: y,
                    left: 0,
                    right: -10000,
                    height: 1,
                    backgroundColor: TOKENS.border,
                    pointerEvents: "none",
                  }}
                />
              )
            )}

            <div style={{ display: "flex" }}>
              {/* Lane label column */}
              <div
                style={{
                  width: LABEL_W,
                  borderRight: `1px solid ${TOKENS.border}`,
                  position: "relative",
                  background: TOKENS.surface,
                }}
              >
                {diagramData.lanes?.map((lane, idx) => {
                  const laneStyle = LANE_STYLES[idx % LANE_STYLES.length];
                  const laneHeight = laneMeta[idx]?.height ?? LANE_H;
                  return (
                    <div
                      key={lane.id}
                      style={{
                        height: laneHeight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 14px",
                        borderBottom: `1px solid ${TOKENS.border}`,
                      }}
                    >
                      <LaneBadge label={lane.label} style={laneStyle} />
                    </div>
                  );
                })}
              </div>

              {/* SVG with nodes + edges */}
              <svg
                width={svgW}
                height={svgH}
                style={{ background: "transparent", overflow: "visible" }}
              >
                <Defs markerId={markerId} />
                {renderArrows(diagramData.flow || [], nodes, svgW, markerId)}
                {allNodes.map((n) => renderNode(n, true))}

                {Array.from(openAgentIds).map((id) => {
                  const n = nodes[id];
                  if (!n) return null;
                  return (
                    <AgentNode
                      key={`agent-${id}`}
                      parentNode={n}
                      offset={agentOffsets[id]}
                      onDragStart={(e) => onMouseDown(e)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LaneBadge — clean pill, accent dot, refined typography
───────────────────────────────────────────────────────── */
function LaneBadge({ label, style }) {
  const lines = (label || "").split("\n");
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: style.dot,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          lineHeight: 1.2,
        }}
      >
        {lines.map((ln, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: style.badge,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily:
                "'Inter', 'SF Pro Display', ui-sans-serif, system-ui, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {ln}
          </span>
        ))}
      </span>
    </div>
  );
}
