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
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getProcessFlow } from "../../services/api";
import {
  TITLE_W,
  LABEL_W,
  NODE_W,
  NODE_H,
  LANE_H,
  COLORS,
  buildWorkflowLayout,
  LANE_STYLES,
  START_R,
  DIAMOND_S,
} from "./utils/workflowUtils";
import {
  ProcessNode,
  StartNode,
  EndNode,
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

const getElementBox = (node, offset, isOpen) => {
  let w = NODE_W;
  let h = NODE_H;
  if (node.type === "start" || node.type === "end") {
    w = START_R * 2.4;
    h = START_R * 1.3;
  } else if (node.type === "decision") {
    w = DIAMOND_S * 2;
    h = DIAMOND_S * 2;
  }
  
  const boxes = [];
  // Base node box
  boxes.push({
    id: node.id,
    type: "node",
    left: node.cx - w / 2,
    right: node.cx + w / 2,
    top: node.cy - h / 2,
    bottom: node.cy + h / 2,
  });
  
  // Agent card box
  if (isOpen) {
    const relX = offset?.x ?? (NODE_W / 2 + 50);
    const relY = offset?.y ?? -85;
    const ax = node.cx + relX;
    const ay = node.cy + relY;
    const aw = 240 * 0.9;
    const ah = 180 * 0.9;
    boxes.push({
      id: `agent-${node.id}`,
      parentId: node.id,
      type: "agent",
      left: ax,
      right: ax + aw,
      top: ay,
      bottom: ay + ah,
    });
  }
  
  return boxes;
};

export default function SwimlaneDiagram({
  data: propData,
  suggestionId,
  forPdf = false,
}) {
  const [diagramData, setDiagramData] = useState(propData || sampleDiagramData);
  const [nodes, setNodes] = useState(() => buildWorkflowLayout(diagramData).nodeMap);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    setError(null);
    lastFetchedId.current = suggestionId;
    getProcessFlow(suggestionId)
      .then((res) => {
        if (res && res.error) {
          setError(res.error);
        } else {
          setDiagramData(res || sampleDiagramData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("SwimlaneDiagram Error:", err);
        setError(err.message || "Failed to load workflow");
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

  const overlaps = useMemo(() => {
    const allBoxes = [];
    const nodeValues = Object.values(nodes);
    nodeValues.forEach((n) => {
      const isOpen = openAgentIds.has(n.id);
      allBoxes.push(...getElementBox(n, agentOffsets[n.id], isOpen));
    });
    
    const overlappingIds = new Set();
    const overlappingPairs = [];
    
    const isOverlapping = (box1, box2) => {
      return !(
        box1.right < box2.left ||
        box1.left > box2.right ||
        box1.bottom < box2.top ||
        box1.top > box2.bottom
      );
    };
    
    for (let i = 0; i < allBoxes.length; i++) {
      for (let j = i + 1; j < allBoxes.length; j++) {
        const b1 = allBoxes[i];
        const b2 = allBoxes[j];
        if (b1.parentId === b2.id || b2.parentId === b1.id) continue;
        
        if (isOverlapping(b1, b2)) {
          overlappingIds.add(b1.id);
          overlappingIds.add(b2.id);
          overlappingPairs.push([b1, b2]);
        }
      }
    }
    
    return {
      ids: overlappingIds,
      pairs: overlappingPairs,
    };
  }, [nodes, agentOffsets, openAgentIds]);

  const handleResolveOverlaps = () => {
    let newNodes = { ...nodes };
    let newAgentOffsets = { ...agentOffsets };
    
    const maxIterations = 5;
    
    const isOverlapping = (box1, box2) => {
      return !(
        box1.right < box2.left ||
        box1.left > box2.right ||
        box1.bottom < box2.top ||
        box1.top > box2.bottom
      );
    };
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const allBoxes = [];
      Object.values(newNodes).forEach((n) => {
        const isOpen = openAgentIds.has(n.id);
        allBoxes.push(...getElementBox(n, newAgentOffsets[n.id], isOpen));
      });
      
      let overlapFound = false;
      
      for (let i = 0; i < allBoxes.length; i++) {
        for (let j = i + 1; j < allBoxes.length; j++) {
          const b1 = allBoxes[i];
          const b2 = allBoxes[j];
          if (b1.parentId === b2.id || b2.parentId === b1.id) continue;
          
          if (isOverlapping(b1, b2)) {
            overlapFound = true;
            
            // Case A: Two process/base nodes overlap
            if (b1.type === "node" && b2.type === "node") {
              const nodeA = newNodes[b1.id];
              const nodeB = newNodes[b2.id];
              if (nodeA.laneIndex === nodeB.laneIndex) {
                if (nodeA.cx < nodeB.cx) {
                  newNodes[b1.id] = { ...nodeA, cx: nodeA.cx - 80 };
                  newNodes[b2.id] = { ...nodeB, cx: nodeB.cx + 80 };
                } else if (nodeA.cx > nodeB.cx) {
                  newNodes[b1.id] = { ...nodeA, cx: nodeA.cx + 80 };
                  newNodes[b2.id] = { ...nodeB, cx: nodeB.cx - 80 };
                } else {
                  newNodes[b1.id] = { ...nodeA, cx: nodeA.cx - 160 };
                  newNodes[b2.id] = { ...nodeB, cx: nodeB.cx + 160 };
                }
              } else {
                if (nodeA.cy < nodeB.cy) {
                  newNodes[b1.id] = { ...nodeA, cy: nodeA.cy - 45 };
                  newNodes[b2.id] = { ...nodeB, cy: nodeB.cy + 45 };
                } else {
                  newNodes[b1.id] = { ...nodeA, cy: nodeA.cy + 45 };
                  newNodes[b2.id] = { ...nodeB, cy: nodeB.cy - 45 };
                }
              }
            }
            
            // Case B: An agent card overlaps a node
            else if (b1.type === "agent" && b2.type === "node") {
              const currentOffset = newAgentOffsets[b1.parentId] || { x: NODE_W / 2 + 50, y: -85 };
              const leftX = -(NODE_W / 2 + 240 * 0.9 + 50);
              const leftY = -85;
              const topX = 0;
              const topY = -(NODE_H / 2 + 180 * 0.9 + 40);
              const bottomX = 0;
              const bottomY = (NODE_H / 2 + 40);
              
              if (currentOffset.x > 0) {
                newAgentOffsets[b1.parentId] = { x: leftX, y: leftY };
              } else if (currentOffset.y === -85) {
                newAgentOffsets[b1.parentId] = { x: topX, y: topY };
              } else {
                newAgentOffsets[b1.parentId] = { x: bottomX, y: bottomY };
              }
            }
            
            // Case C: An agent card overlaps another agent card
            else if (b1.type === "agent" && b2.type === "agent") {
              const offsetA = newAgentOffsets[b1.parentId] || { x: NODE_W / 2 + 50, y: -85 };
              newAgentOffsets[b1.parentId] = { x: offsetA.x, y: offsetA.y - 75 };
            }
          }
        }
      }
      
      if (!overlapFound) break;
    }
    
    setNodes(newNodes);
    setAgentOffsets(newAgentOffsets);
  };

  // Automatically and dynamically resolve overlaps as soon as agent cards are opened
  useEffect(() => {
    if (openAgentIds.size > 0) {
      handleResolveOverlaps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAgentIds]);

  const onMouseDown = (e) => {
    if (error) return;
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
    if (error) return;
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
    if (error) {
      return (
        <div
          className="w-full p-6 border rounded-xl"
          style={{
            borderColor: COLORS.lane_border,
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
            backgroundColor: "#FAFBFC"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#EF4444" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
              {error}
            </span>
          </div>
        </div>
      );
    }
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
                if (n.type === "end")
                  return <EndNode key={n.id} n={n} onDragStart={() => {}} />;
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
            error
              ? "default"
              : isPanning || draggingNodeId || draggingAgentId
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
        {!error && (
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
              ...(overlaps.pairs.length > 0 ? [{
                icon: Sparkles,
                onClick: handleResolveOverlaps,
                title: "Resolve Overlaps",
                className: "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border-amber-200 animate-pulse",
              }] : []),
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
                className={`w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm hover:bg-white hover:shadow-md hover:scale-105 active:scale-95 transition-all text-gray-500 hover:text-gray-700 ${btn.className || ""}`}
              >
                <btn.icon size={16} />
              </button>
            ))}
          </div>
        )}

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
          {diagramData?.title || "Process Flow Diagram"}
        </div>

        {/* ── Main Canvas Area ────────────────────────── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            background: "#F8FAFC",
            overflow: "hidden",
            alignItems: error ? "center" : "stretch",
            justifyContent: error ? "center" : "stretch",
          }}
        >
          {overlaps.pairs.length > 0 && !error && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl shadow-lg animate-bounce"
              style={{ animationDuration: "3s" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span className="text-xs font-semibold text-amber-800">
                {overlaps.pairs.length === 1
                  ? "1 layout overlap detected"
                  : `${overlaps.pairs.length} layout overlaps detected`}
              </span>
              <button
                onClick={handleResolveOverlaps}
                className="px-2.5 py-1 text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={10} />
                Resolve
              </button>
            </div>
          )}
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
              <div className="w-12 h-12 mb-4 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                <AlertCircle className="w-6 h-6" />
              </div>
            
              <p className="text-xs font-mono bg-red-50/50 border border-red-100 rounded-lg py-2 px-3 text-red-600 mb-5 w-full max-w-[280px] break-all">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  lastFetchedId.current = null;
                  getProcessFlow(suggestionId)
                    .then((res) => {
                      if (res && res.error) {
                        setError(res.error);
                      } else {
                        setDiagramData(res || sampleDiagramData);
                      }
                      setLoading(false);
                    })
                    .catch((err) => {
                      console.error("SwimlaneDiagram Error:", err);
                      setError(err.message || "Failed to load workflow");
                      setLoading(false);
                      lastFetchedId.current = null;
                    });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Loading
              </button>
            </div>
          ) : (
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
                    const isOverlapping = overlaps.ids.has(n.id);
                    if (n.type === "start")
                      return (
                        <StartNode key={n.id} n={n} onDragStart={onMouseDown} isOverlapping={isOverlapping} />
                      );
                    if (n.type === "end")
                      return (
                        <EndNode key={n.id} n={n} onDragStart={onMouseDown} isOverlapping={isOverlapping} />
                      );
                    if (n.type === "decision")
                      return (
                        <DiamondNode key={n.id} n={n} onDragStart={onMouseDown} isOverlapping={isOverlapping} />
                      );
                    return (
                      <ProcessNode
                        key={n.id}
                        n={n}
                        isOpen={isOpen}
                        toggleAgent={() => toggleAgent(n.id)}
                        onDragStart={onMouseDown}
                        isOverlapping={isOverlapping}
                      />
                    );
                  })}

                  {Array.from(openAgentIds).map((id) => {
                    const n = nodes[id];
                    if (!n) return null;
                    const isOverlapping = overlaps.ids.has(`agent-${id}`);
                    return (
                      <AgentNode
                        key={`agent-${id}`}
                        parentNode={n}
                        offset={agentOffsets[id]}
                        onDragStart={(e) => onMouseDown(e)}
                        isOverlapping={isOverlapping}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}