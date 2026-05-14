import React, { useState, useRef, useCallback, useEffect, useId } from "react";
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
  LANE_H,
  NODE_W,
  buildNodeMap,
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

const BORDER = "#000000";
const WHITE = "#ffffff";
const GRID_BG =
  "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.10) 1px, transparent 0)";

export default function SwimlaneDiagram({
  data: propData,
  suggestionId,
  forPdf = false,
}) {
  const [diagramData, setDiagramData] = useState(propData || sampleDiagramData);
  const [nodes, setNodes] = useState(() => buildNodeMap(diagramData));
  const [loading, setLoading] = useState(false);
  const lastFetchedId = useRef(null);
  const [viewport, setViewport] = useState({ x: 0, y: 50, zoom: 0.6 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markerId = useId().replace(/:/g, "");

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
    setNodes(buildNodeMap(diagramData));
  }, [diagramData]);

  const [isPanning, setIsPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [draggingAgentId, setDraggingAgentId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [openAgentIds, setOpenAgentIds] = useState(new Set());
  const [agentOffsets, setAgentOffsets] = useState({}); // { parentId: { x, y } }
  const containerRef = useRef(null);

  const allNodes = Object.values(nodes);
  const laneCount = diagramData.lanes?.length || 1;
  const svgH = laneCount * LANE_H;

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
    setNodes(buildNodeMap(diagramData));
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

  if (loading) {
    return (
      <div
        className={`w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 transition-all duration-300 ${
          isFullscreen ? "h-screen" : "h-[600px]"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 tracking-tight">
            Loading automation workflow...
          </p>
        </div>
      </div>
    );
  }

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
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            overflow: "visible",
            position: "relative",
          }}
        >
          <div
            style={{
              width: TITLE_W,
              background: WHITE,
              borderRight: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              writingMode: "vertical-rl",
              fontWeight: 700,
              fontSize: 11,
              color: "#111",
              letterSpacing: "0.05em",
              minHeight: "100%",
              padding: "20px 0",
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
              backgroundSize: "18px 18px",
            }}
          >
            {Array.from({ length: laneCount }).map((_, i) => {
              const laneStyle = LANE_STYLES[i % LANE_STYLES.length];
              return (
                <div
                  key={`lane-bg-pdf-${i}`}
                  style={{
                    position: "absolute",
                    top: i * LANE_H,
                    left: 0,
                    right: 0,
                    height: LANE_H,
                    background: laneStyle.bg,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {Array.from({ length: laneCount + 1 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * LANE_H,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: BORDER,
                  pointerEvents: "none",
                }}
              />
            ))}

            <div
              style={{
                width: LABEL_W,
                borderRight: `1px solid ${BORDER}`,
                position: "relative",
              }}
            >
              {diagramData.lanes?.map((lane, idx) => {
                const lines = lane.label.split("\n");
                const laneStyle = LANE_STYLES[idx % LANE_STYLES.length];
                return (
                  <div
                    key={lane.id}
                    style={{
                      height: LANE_H,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 15px",
                      background: laneStyle.tint,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {lines.map((ln, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          lineHeight: "1.4",
                          fontWeight: 700,
                          color: laneStyle.badge,
                          textAlign: "center",
                          fontFamily: "Manrope, Segoe UI, Arial, sans-serif",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {ln}
                      </span>
                    ))}
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

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        style={{
          display: "flex",
          width: "100%",
          height: isFullscreen ? "100vh" : 600,
          background:
            "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)",
          border: isFullscreen ? "none" : `1px solid ${BORDER}`,
          borderRadius: isFullscreen ? 0 : 8,
          boxShadow: isFullscreen
            ? "none"
            : "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)",
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
        <div
          className="floating-controls"
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 8,
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
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all text-slate-700"
            >
              <btn.icon size={18} className={btn.spin ? "animate-spin" : ""} />
            </button>
          ))}
        </div>

        <div
          style={{
            width: TITLE_W,
            background: WHITE,
            borderRight: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            writingMode: "vertical-rl",
            fontWeight: 700,
            fontSize: 11,
            color: "#111",
            letterSpacing: "0.05em",
            minHeight: "100%",
            padding: "20px 0",
            textTransform: "capitalize",
            zIndex: 10,
            position: "relative",
          }}
        >
          {diagramData.title}
        </div>

        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            background: WHITE,
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
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: GRID_BG,
                backgroundSize: "18px 18px",
                opacity: 0.9,
                pointerEvents: "none",
              }}
            />

            {Array.from({ length: laneCount }).map((_, i) => {
              const laneStyle = LANE_STYLES[i % LANE_STYLES.length];
              return (
                <div
                  key={`lane-bg-${i}`}
                  style={{
                    position: "absolute",
                    top: i * LANE_H,
                    left: 0,
                    right: -10000,
                    height: LANE_H,
                    background: laneStyle.bg,
                    pointerEvents: "none",
                  }}
                />
              );
            })}

            {Array.from({ length: laneCount + 1 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * LANE_H,
                  left: 0,
                  right: -10000,
                  height: 1,
                  backgroundColor: BORDER,
                  pointerEvents: "none",
                  opacity: 1,
                }}
              />
            ))}

            <div style={{ display: "flex" }}>
              <div
                style={{
                  width: LABEL_W,
                  borderRight: `1px solid ${BORDER}`,
                  position: "relative",
                  background: "transparent",
                }}
              >
                {diagramData.lanes?.map((lane, idx) => {
                  const lines = lane.label.split("\n");
                  const laneStyle = LANE_STYLES[idx % LANE_STYLES.length];
                  return (
                    <div
                      key={lane.id}
                      style={{
                        height: LANE_H,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 15px",
                        background: laneStyle.tint,
                        borderBottom: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.85)",
                          border: "1px solid rgba(15,23,42,0.08)",
                          boxShadow: "0 6px 14px -8px rgba(15,23,42,0.35)",
                        }}
                      >
                        {lines.map((ln, i) => (
                          <span
                            key={i}
                            style={{
                              display: "block",
                              fontSize: 10,
                              lineHeight: "1.4",
                              fontWeight: 800,
                              color: laneStyle.badge,
                              textAlign: "center",
                              fontFamily: "Manrope, Segoe UI, Arial, sans-serif",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
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