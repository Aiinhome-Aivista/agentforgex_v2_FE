import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Loader2, AlertCircle, Box, Server } from "lucide-react";
import { getAutomationArchitecture, runAutomationArchitecture } from "../../services/api";

// Components
import { ArchitectureHeader, ExecutionLog } from "./components/ArchitectureUI";
import { 
  ArchitectureCanvas, 
  ArchitectureLane, 
  ArchitectureEdge, 
  ArchitectureNode 
} from "./components/ArchitectureVisuals";
import CompletionModal from "./components/CompletionModal";

// Utils
import {
  transformData,
  computeLayout,
  buildEdgePath,
  EDGE_STYLES,
  CANVAS_W,
  NODE_W,
  NODE_H,
} from "./utils/architectureHelpers";

const STEP_DELAY = 650;

export default function SapValidationWorkflow({ suggestionId, stepKey, analysisId, onComplete }) {
  const [workflow, setWorkflow] = useState(null);
  const [layers, setLayers] = useState([]);
  const [nodeMeta, setNodeMeta] = useState({});
  const [runSequence, setRunSequence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeNodes, setActiveNodes] = useState(new Set());
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const [activeEdges, setActiveEdges] = useState(new Set());
  const [completedEdges, setCompletedEdges] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [log, setLog] = useState([]);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  
  const cancelRef = useRef(false);
  const lastFetchedId = useRef(null);
  const logRef = useRef(null);

  // Fetch Architecture Data
  useEffect(() => {
    if (!suggestionId || lastFetchedId.current === suggestionId) return;

    const fetchArchitecture = async () => {
      setLoading(true);
      setError(null);
      lastFetchedId.current = suggestionId;
      try {
        const data = await getAutomationArchitecture(suggestionId);
        const transformed = transformData(data);
        setWorkflow(transformed.workflow);
        setLayers(transformed.layers);
        setNodeMeta(transformed.nodeMeta);
        setRunSequence(transformed.runSequence);
      } catch (err) {
        console.error("Failed to fetch architecture:", err);
        setError(err.message);
        lastFetchedId.current = null;
      } finally {
        setLoading(false);
      }
    };

    fetchArchitecture();
  }, [suggestionId]);

  // Derived State
  const nodesById = useMemo(() => {
    if (!workflow) return {};
    return Object.fromEntries(workflow.nodes.map((n) => [n.id, n]));
  }, [workflow]);

  const edgesById = useMemo(() => {
    if (!workflow) return {};
    return Object.fromEntries(workflow.edges.map((e) => [e.id, e]));
  }, [workflow]);

  const { positions, laneBounds, canvasHeight } = useMemo(() => {
    if (!layers.length) return { positions: {}, laneBounds: [], canvasHeight: 400 };
    return computeLayout(layers);
  }, [layers]);

  const edgePaths = useMemo(() => {
    if (!workflow || !Object.keys(positions).length) return [];
    const pairCounts = {};
    workflow.edges.forEach((e) => {
      const key = `${e.source}->${e.target}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });
    const pairSeen = {};
    return workflow.edges.map((e) => {
      const key = `${e.source}->${e.target}`;
      const idx = (pairSeen[key] = (pairSeen[key] || 0) + 1) - 1;
      const total = pairCounts[key];
      const routed = buildEdgePath(e, positions, idx, total);
      return { ...e, ...routed, style: EDGE_STYLES[e.label] || EDGE_STYLES["sync API"] };
    });
  }, [workflow, positions]);

  // Auto-scroll log
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const reset = useCallback(() => {
    cancelRef.current = true;
    setActiveNodes(new Set());
    setCompletedNodes(new Set());
    setActiveEdges(new Set());
    setCompletedEdges(new Set());
    setCurrentStep(-1);
    setIsRunning(false);
    setLog([]);
    setApiResponse(null);
  }, []);

  const runFlow = async () => {
    if (isRunning || !runSequence.length) return;
    reset();
    await new Promise((r) => setTimeout(r, 60));
    cancelRef.current = false;
    setIsRunning(true);

    const activeN = new Set();
    const completedN = new Set();
    const activeE = new Set();
    const completedE = new Set();
    const lines = [];

    for (let i = 0; i < runSequence.length; i++) {
      if (cancelRef.current) return;
      const step = runSequence[i];
      setCurrentStep(i);

      if (step.edge) {
        activeE.forEach((e) => completedE.add(e));
        activeE.clear();
        activeE.add(step.edge);
        setActiveEdges(new Set(activeE));
        setCompletedEdges(new Set(completedE));
        const e = edgesById[step.edge];
        if (e) {
          lines.push(`↳ ${e.label?.padEnd(12) || "FLOW"} ${e.source} → ${e.target}`);
          setLog([...lines]);
        }
        await wait(STEP_DELAY * 0.5);
        if (cancelRef.current) return;
      }

      activeN.forEach((n) => {
        if (n !== step.node) completedN.add(n);
      });
      activeN.clear();
      activeN.add(step.node);
      setActiveNodes(new Set(activeN));
      setCompletedNodes(new Set(completedN));

      const n = nodesById[step.node];
      if (n) {
        lines.push(`● ${n.data.label}`);
        setLog([...lines]);
      }

      await wait(STEP_DELAY);
    }

    activeN.forEach((n) => completedN.add(n));
    activeE.forEach((e) => completedE.add(e));
    setActiveNodes(new Set());
    setCompletedNodes(new Set(completedN));
    setActiveEdges(new Set());
    setCompletedEdges(new Set(completedE));
    lines.push(`◆ pipeline complete — ${runSequence.length} services validated`);
    setLog([...lines]);

    // Actual API call
    try {
      if (stepKey) {
        const sessionId = localStorage.getItem('session_id');
        const payload = {
          step_key: stepKey,
          session_id: sessionId
        };
        const response = await runAutomationArchitecture(payload);
        setApiResponse(response);

        // Update localStorage to reflect 0% potential
        const updateStorage = (key, sId, sKey) => {
          const raw = localStorage.getItem(`${key}_${sId}`);
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            let updated = false;

            if (parsed.steps) {
              const idx = parsed.steps.findIndex(s => s.id === sKey || s._key === sKey);
              if (idx !== -1) {
                parsed.steps[idx].automation_potential = 0;
                updated = true;
              }
            }

            if (parsed.top_automation_targets) {
              const idx = parsed.top_automation_targets.findIndex(t => t.id === sKey || t._key === sKey);
              if (idx !== -1) {
                parsed.top_automation_targets[idx].automation_potential = 0;
                updated = true;
              }
            }

            if (parsed.id === sKey || parsed._key === sKey || parsed.step_key === sKey) {
              parsed.automation_potential = 0;
              if (parsed.metrics) parsed.metrics.automation_potential = 0;
              updated = true;
            }

            if (updated) {
              localStorage.setItem(`${key}_${sId}`, JSON.stringify(parsed));
            }
          } catch (e) {
            console.error(`Failed to update ${key} storage:`, e);
          }
        };

        if (analysisId) updateStorage('analysis', analysisId, stepKey);
        if (suggestionId) updateStorage('suggestion', suggestionId, stepKey);
      }
    } catch (apiErr) {
      console.error("API Step Run Failed:", apiErr);
      lines.push(`✖ Agent execution failed: ${apiErr.message}`);
      setLog([...lines]);
      setApiResponse({ status: 'error', message: apiErr.message });
    }

    setIsRunning(false);
    setTimeout(() => {
      setShowCompleteModal(true);
      if (onComplete) onComplete();
    }, 500);
  };

  const hoveredNodeData = hoveredNode ? nodesById[hoveredNode] : null;

  if (loading) {
    return (
      <div className="w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 h-[820px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
          <p className="text-sm font-medium text-slate-500">loading agent Architecture...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 h-[820px]">
        <div className="flex flex-col items-center gap-3 text-red-500 p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-medium">Failed to load architecture: {error}</p>
        </div>
      </div>
    );
  }

  if (!workflow || !workflow.nodes.length) {
    return (
      <div className="w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 h-[820px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Box className="w-8 h-8 opacity-20" />
          <p className="text-sm font-medium">No architecture data available for this suggestion.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
      className="w-full bg-white relative min-h-[860px] flex flex-col p-6"
    >
      <div className="relative h-full flex flex-col">
        <ArchitectureHeader 
          isRunning={isRunning} 
          activeNodes={activeNodes} 
          completedNodes={completedNodes} 
          onReset={reset} 
          onRun={runFlow} 
        />

        <div className="flex flex-col gap-6">
          <ArchitectureCanvas
            viewBox={`0 0 ${CANVAS_W} ${canvasHeight}`}
            height="min(78vh, 820px)"
            isRunning={isRunning}
          >
            {/* Lane Backgrounds */}
            {laneBounds.map((lane) => (
              <ArchitectureLane key={lane.id} lane={lane} canvasWidth={CANVAS_W} />
            ))}

            {/* Edges */}
            {edgePaths.map((edge) => (
              <ArchitectureEdge
                key={edge.id}
                edge={edge}
                activeEdges={activeEdges}
                completedEdges={completedEdges}
                hoveredEdge={hoveredEdge}
                setHoveredEdge={setHoveredEdge}
              />
            ))}

            {/* Nodes */}
            {workflow.nodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;
              const Icon = nodeMeta[node.id]?.icon || Server;
              const lane = layers[pos.laneIdx];
              return (
                <ArchitectureNode
                  key={node.id}
                  node={node}
                  pos={pos}
                  icon={Icon}
                  accentColor={lane.accent || "#10b981"}
                  isActive={activeNodes.has(node.id)}
                  isDone={completedNodes.has(node.id)}
                  isHovered={hoveredNode === node.id}
                  setHoveredNode={setHoveredNode}
                  nodeWidth={NODE_W}
                  nodeHeight={NODE_H}
                />
              );
            })}
          </ArchitectureCanvas>

          {/* Hover info card */}
          {hoveredNodeData && (
            <div
              className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md rounded-xl border border-slate-200 bg-white/95 backdrop-blur-xl p-4 pointer-events-none shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.15)", zIndex: 50 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-[10px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-full"
                  style={{
                    color: layers[positions[hoveredNodeData.id].laneIdx].accent,
                    backgroundColor: layers[positions[hoveredNodeData.id].laneIdx].accent + "15",
                  }}
                >
                  {hoveredNodeData.type}
                </span>
                <span className="text-sm font-black text-slate-800">
                  {hoveredNodeData.data.label}
                </span>
              </div>
              <div className="text-[12px] text-slate-500 leading-relaxed font-medium">
                {hoveredNodeData.data.description}
              </div>
            </div>
          )}

          <ExecutionLog 
            log={log} 
            logRef={logRef} 
            currentStep={currentStep} 
            totalSteps={runSequence.length} 
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <CompletionModal 
        isOpen={showCompleteModal} 
        onClose={() => setShowCompleteModal(false)} 
        apiResponse={apiResponse} 
      />
    </div>
  );
}
