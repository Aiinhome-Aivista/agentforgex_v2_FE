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
  COLORS,
  buildWorkflowLayout,
  LANE_STYLES,
} from "./utils/workflowUtils";
import {
  ProcessNode,
  StartNode,
  DiamondNode,
  AgentNode,
} from "./components/WorkflowNodes";
import { Defs, renderArrows } from "./components/WorkflowEdges";

// Sample JSON - replace with your real API/backend call
export const sampleDiagramData = {
  title: "Process Flow Diagram",
  lanes: [],
  flow: [],
};

const GRID_BG =
  "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)";

export default function SwimlaneDiagram({
  data: propData,
  suggestionId,
  forPdf = false,
}) {
  const [diagramData, setDiagramData] = useState(propData || sampleDiagramData);
  const [nodes, setNodes] = useState(() => buildWorkflowLayout(diagramData).nodeMap);
  const [loading, setLoading] = useState(false);
  const lastFetchedId = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 50, zoom: 0.6 });
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

  // Sync internal data when propData changes
  useEffect(() => {
    if (propData) {
      setDiagramData(propData);
    }
  }, [propData]);

  // Fetch data if suggestionId is provided
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
        lastFetchedId.current = null; // Allow retry
      });
  }, [suggestionId]);

  // Sync nodes when diagramData changes
  useEffect(() => {
    setNodes(layoutBase.nodeMap);
  }, [layoutBase]);

  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [draggingAgentId, setDraggingAgentId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [openAgentIds, setOpenAgentIds] = useState(new Set());
  const [agentOffsets, setAgentOffsets] = useState({}); // { parentId: { x, y } }
  const containerRef = useRef(null);

  const allNodes = Object.values(nodes);
  const rightmost =
    allNodes.length > 0
      ? Math.max(...allNodes.map((n) => n.cx + NODE_W / 2))
      : 500;
  const svgW = rightmost + 300;

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
      zoom: Math.min(Math.max(prev.zoom * factor, 0.4), 3),
    }));
  };

  const handleReset = () => {
    setViewport({ x: 0, y: 50, zoom: 0.6 });
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
        const current = prev[draggingAgentId] || { x: NODE_W / 2 + 50, y: -85 };
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

  /* ═══════════════════════════════════════════════════════
     LOADING STATE
  ═══════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div
        className={`w-full border border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50 transition-all duration-300 ${
          isFullscreen ? "h-screen" : "h-[600px]"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-sm font-medium text-gray-400 tracking-tight">
            Loading workflow…
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     PDF MODE — static render (no interactivity)
  ═══════════════════════════════════════════════════════ */
  if (forPdf) {
    const totalW = TITLE_W + LABEL_W + svgW;
    return (
      <div
        className="w-full"
        style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
      >
        <div
          style={{
            display: "flex",
            width: totalW,
            height: svgH,
            background: "#FAFBFC",
            border: `1px solid ${COLORS.lane_border}`,
            borderRadius: 8,
            overflow: "visible",
            position: "relative",
          }}
        >
          {/* Title column */}
          <div
            style={{
              width: TITLE_W,
              background: "#FAFBFC",
              borderRight: `1px solid ${COLORS.lane_border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              writingMode: "vertical-rl",
              fontWeight: 600,
              fontSize: 10,
              color: COLORS.label_text,
              letterSpacing: "0.04em",
              minHeight: "100%",
              padding: "16px 0",
              textTransform: "capitalize",
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
            }}
          >
            {/* Lane backgrounds */}
            {laneRenderMeta.map((lane) => {
              const laneStyle = LANE_STYLES[lane.index % LANE_STYLES.length];
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

            {/* Lane separator lines */}
            {laneBoundaries.map((y, i) => (
              <div
                key={`lane-line-pdf-${i}`}
                style={{
                  position: "absolute",
                  top: y,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: COLORS.lane_border,
                  pointerEvents: "none",
                }}
              />
            ))}

            {/* Lane labels */}
            <div
              style={{
                width: LABEL_W,
                borderRight: `1px solid ${COLORS.lane_border}`,
                position: "relative",
              }}
            >
              {diagramData.lanes?.map((lane, idx) => {
                const lines = lane.label.split("\n");
                const laneHeight = laneMeta[idx]?.height ?? LANE_H;
                return (
                  <div
                    key={lane.id}
                    style={{
                      height: laneHeight,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 12px",
                      borderBottom: `1px solid ${COLORS.lane_border}`,
                    }}
                  >
                    {lines.map((ln, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 10,
                          lineHeight: "1.4",
                          fontWeight: 600,
                          color: COLORS.label_text,
                          textAlign: "center",
                          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {ln}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* SVG canvas */}
            <svg
              width={svgW}
              height={svgH}
              style={{ background: "transparent", overflow: "visible" }}
            >
              <Defs markerId={markerId} />
              {renderArrows(diagramData.flow || [], nodes, svgW, markerId)}
              {allNodes.map((n) => {
                if (n.type === "start")
                  return <StartNode key={n.id} n={n} onDragStart={() => {}} />;
                if (n.type === "decision")
                  return (
                    <DiamondNode key={n.id} n={n} onDragStart={() => {}} />
                  );
                return (
                  <ProcessNode
                    key={n.id}
                    n={n}
                    isOpen={false}
                    toggleAgent={() => {}}
                    onDragStart={() => {}}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTIVE MODE — main render
  ═══════════════════════════════════════════════════════ */
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        style={{
          display: "flex",
          width: "100%",
          height: isFullscreen ? "100vh" : 600,
          background: "#F8FAFC",
          border: isFullscreen ? "none" : `1px solid ${COLORS.lane_border}`,
          borderRadius: isFullscreen ? 0 : 12,
          boxShadow: isFullscreen
            ? "none"
            : "0 4px 16px -4px rgba(0,0,0,0.06)",
          overflow: "hidden",
          position: "relative",
          cursor:
            isPanning || draggingNodeId || draggingAgentId
              ? "grabbing"
              : "grab",
          transition: "height 0.3s ease",
          userSelect: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* ── Floating Controls ──────────────────────── */}
        <div
          className="floating-controls"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { icon: ZoomIn, onClick: () => handleZoom(1.15), title: "Zoom In" },
            { icon: ZoomOut, onClick: () => handleZoom(0.85), title: "Zoom Out" },
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
              disabled={false}
              className="w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:bg-white hover:shadow-md hover:scale-105 active:scale-95 transition-all text-gray-500 hover:text-gray-700"
            >
              <btn.icon size={16} />
            </button>
          ))}
        </div>

        {/* ── Title Column (vertical) ────────────────── */}
        <div
          style={{
            width: TITLE_W,
            background: "#FAFBFC",
            borderRight: `1px solid ${COLORS.lane_border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontWeight: 600,
            fontSize: 10,
            color: COLORS.label_text,
            letterSpacing: "0.04em",
            minHeight: "100%",
            padding: "16px 0",
            textTransform: "capitalize",
            zIndex: 10,
            position: "relative",
            fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          {diagramData.title}
        </div>

        {/* ── Main Canvas Area ────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            background: "#F8FAFC",
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
                  : "transform 0.1s ease-out",
            }}
          >
            {/* Dot grid background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: GRID_BG,
                backgroundSize: "20px 20px",
                opacity: 0.8,
                pointerEvents: "none",
              }}
            />

            {/* Lane backgrounds — ultra-subtle alternating bands */}
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

            {/* Lane separator lines — thin dashed */}
            {laneBoundaries.map((y, i) => (
              <div
                key={`lane-line-${i}`}
                style={{
                  position: "absolute",
                  top: y,
                  left: 0,
                  right: -10000,
                  height: 1,
                  background: `repeating-linear-gradient(
                    90deg,
                    ${COLORS.lane_border} 0px,
                    ${COLORS.lane_border} 6px,
                    transparent 6px,
                    transparent 12px
                  )`,
                  pointerEvents: "none",
                  opacity: 0.8,
                }}
              />
            ))}

            <div style={{ display: "flex" }}>
              {/* ── Lane Labels ─────────────────────── */}
              <div
                style={{
                  width: LABEL_W,
                  borderRight: `1px dashed ${COLORS.lane_border}`,
                  position: "relative",
                  background: "transparent",
                }}
              >
                {diagramData.lanes?.map((lane, idx) => {
                  const lines = lane.label.split("\n");
                  const laneHeight = laneMeta[idx]?.height ?? LANE_H;
                  return (
                    <div
                      key={lane.id}
                      style={{
                        height: laneHeight,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 12px",
                        borderBottom: `1px dashed ${COLORS.lane_border}`,
                      }}
                    >
                      <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          background: "rgba(255,255,255,0.7)",
                          border: `1px solid ${COLORS.lane_border}`,
                        }}
                      >
                        {lines.map((ln, i) => (
                          <span
                            key={i}
                            style={{
                              display: "block",
                              fontSize: 10,
                              lineHeight: "1.4",
                              fontWeight: 600,
                              color: COLORS.label_text,
                              textAlign: "center",
                              fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {ln}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── SVG Canvas ──────────────────────── */}
              <svg
                width={svgW}
                height={svgH}
                style={{ background: "transparent", overflow: "visible" }}
              >
                <Defs markerId={markerId} />
                {renderArrows(diagramData.flow || [], nodes, svgW, markerId)}
                {allNodes.map((n) => {
                  const isOpen = openAgentIds.has(n.id);
                  if (n.type === "start")
                    return (
                      <StartNode key={n.id} n={n} onDragStart={onMouseDown} />
                    );
                  if (n.type === "decision")
                    return (
                      <DiamondNode key={n.id} n={n} onDragStart={onMouseDown} />
                    );
                  return (
                    <ProcessNode
                      key={n.id}
                      n={n}
                      isOpen={isOpen}
                      toggleAgent={() => toggleAgent(n.id)}
                      onDragStart={onMouseDown}
                    />
                  );
                })}

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