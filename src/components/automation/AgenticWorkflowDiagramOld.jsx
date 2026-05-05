import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Position,
  Handle,
  ReactFlowProvider,
  useReactFlow,
  ControlButton,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer
} from 'reactflow';
import 'reactflow/dist/style.css';
import { UserCircle, XCircle, Database, Layers, BarChart, CheckSquare, Archive, RefreshCw, ShoppingCart, CheckCircle, Loader2, AlertCircle, Maximize2, Minimize2, Lightbulb, Bot, Workflow, GitBranch, WorkflowIcon, Cog } from 'lucide-react';
import { getProcessFlow } from '../../services/api';
import { getLayoutedElements } from '../layout/Dagre';

const ICON_MAP = {
  UserCircle,
  XCircle,
  Database,
  Layers,
  BarChart,
  CheckSquare,
  Archive,
  RefreshCw,
  ShoppingCart,
  CheckCircle
};

const STEP_TYPE_ACCENT = {
  'higher agentic intervention': '#ef4444', // Red
  'human + ai intervention': '#f59e0b',    // Amber
  'higher human intervention': '#10b981',  // Green
};

const AGENTIC_KEYWORDS_REGEX = /automates|agentic|triggers|checks|validates|analyzes|calculates|continues/i;

function isAgenticEdgeLabel(label = '') {
  return AGENTIC_KEYWORDS_REGEX.test(label);
}

function getStepAccent(stepType = '') {
  const type = stepType.toLowerCase();
  if (type.includes('agentic')) return STEP_TYPE_ACCENT['higher agentic intervention'];
  if (type.includes('human') && type.includes('ai')) return STEP_TYPE_ACCENT['human + ai intervention'];
  if (type.includes('human')) return STEP_TYPE_ACCENT['higher human intervention'];
  return '#10b981'; // Default to green
}

function toDisplayEdgeLabel(label = '') {

  const text = label.toLowerCase().trim();
  if (text === 'conditionally leads to') return 'CONDITIONAL';
  return text.toUpperCase();
}

function getEdgeStyle(label = '') {
  const text = (label || '').toLowerCase();

  if (text.includes('failed') || text.includes('invalid') || text.includes('reject') || text.includes('no') || text.includes('partially')) {
    return {
      stroke: '#ef4444',
      strokeWidth: 2.5,
      strokeDasharray: 'none',
      labelColor: '#ef4444',
      animated: true,
    };
  }

  if (text.includes('valid') || text.includes('approve') || text.includes('yes') || isAgenticEdgeLabel(text)) {
    return {
      stroke: '#10b981',
      strokeWidth: 2.5,
      strokeDasharray: 'none',
      labelColor: '#10b981',
      animated: true,
    };
  }

  if (text.includes('conditionally')) {
    return {
      stroke: '#f59e0b',
      strokeWidth: 2,
      strokeDasharray: 'none',
      labelColor: '#f59e0b',
      animated: true,
    };
  }

  // All other cases including "FLOWS"
  return {
    stroke: '#000000', // Solid Black
    strokeWidth: 2,
    strokeDasharray: 'none',
    labelColor: '#000000',
    animated: true,
  };
}

function transformFlowData(apiData) {
  // Combine everything to be array-agnostic
  const allElements = [
    ...(Array.isArray(apiData?.nodes) ? apiData.nodes : []),
    ...(Array.isArray(apiData?.edges) ? apiData.edges : [])
  ];

  // Separate by structure, not by array home
  const rawNodes = allElements.filter(el => el && !el.source && !el.target);
  const rawEdges = allElements.filter(el => el && el.source && el.target);

  const stepById = new Map(rawNodes.map((n) => [n.id, n]));
  const decisionIds = new Set(
    rawNodes
      .filter((n) => {
        const label = (n.data?.label || '').toLowerCase();
        const type = (n.type || '').toLowerCase();
        return label.includes('decision') || label.includes('?') || type.includes('decision');
      })
      .map((n) => n.id)
  );

  // --- Map Nodes ---
  const mappedNodes = rawNodes.map((node) => {
    const nodeType = (node.type || '').toLowerCase();
    const isAgentId = node.id?.toString().toLowerCase().includes('agent');

    // Automatic Agent Normalization
    if (nodeType.includes('agentnode') || nodeType.includes('bot') || isAgentId) {
      const rawTasks = node.data?.tasks || (node.data?.description ? [node.data.description] : ['Automates related process steps']);
      return {
        ...node,
        type: 'agentNode',
        position: node.position || { x: 0, y: 0 }, // Fallback position
        data: {
          ...node.data,
          icon: ICON_MAP[node.data?.icon] || Bot,
          title: node.data?.title || (nodeType.includes('group') ? 'Agent Group' : 'Automation Agent'),
          tasks: rawTasks,
          accentColor: node.data?.accentColor || '#10b981',
        },
      };
    }

    if (nodeType.includes('agentgroup')) {
      return {
        ...node,
        type: 'agentGroupNode',
        data: {
          ...node.data,
          icon: ICON_MAP[node.data?.icon] || Layers,
          accentColor: node.data?.accentColor || '#6366f1',
        },
      };
    }

    const isDecision = decisionIds.has(node.id);
    const accent = getStepAccent(node.data?.stepType);

    // Find agentic info for tooltips
    const edgeToAgent = rawEdges.find(e => {
      const isAgentSource = stepById.get(e.source)?.type === 'agentNode';
      const isAgentTarget = stepById.get(e.target)?.type === 'agentNode';
      const isProcessSource = stepById.get(e.source)?.type === 'processNode';
      const isProcessTarget = stepById.get(e.target)?.type === 'processNode';

      const connectsProcessAndAgent = (isAgentSource && isProcessTarget) || (isAgentTarget && isProcessSource);
      const hasAgenticLabel = isAgenticEdgeLabel(e.label || '');

      return (e.source === node.id || e.target === node.id) && (connectsProcessAndAgent || hasAgenticLabel);
    });
    let agenticInfo = null;
    if (edgeToAgent) {
      const agentId = edgeToAgent.source === node.id ? edgeToAgent.target : edgeToAgent.source;
      const agentNode = rawNodes.find(n => n.id === agentId && n.type === 'agentNode');
      if (agentNode) {
        agenticInfo = {
          title: agentNode.data?.title || 'Automation Agent',
          tasks: agentNode.data?.tasks || (agentNode.data?.description ? [agentNode.data.description] : ['Automates related process steps']),
          icon: ICON_MAP[agentNode.data?.icon] || UserCircle,
          label: toDisplayEdgeLabel(edgeToAgent.label),
          accentColor: agentNode.data?.accentColor || '#10b981'
        };
      }
    }

    const finalAccent = agenticInfo ? '#ef4444' : '#10b981';

    return {
      ...node,
      type: isDecision ? 'decisionNode' : 'processNode',
      extent: node.parentNode ? 'parent' : undefined,
      data: {
        ...node.data,
        label: node.data?.label || (isDecision ? 'Decision' : 'Process Step'),
        icon: ICON_MAP[node.data?.icon] || (isDecision ? GitBranch : Database),
        accentColor: finalAccent,
        agenticInfo: agenticInfo,
        hasAgenticPotential: !!agenticInfo
      },
    };
  });

  // --- Map Edges ---
  const conditionalBranchIndex = new Map();
  const nodeOutgoingCounts = new Map();
  const mappedEdges = rawEdges.map((edge) => {
    const styleMeta = getEdgeStyle(edge.label);
    const result = {
      ...edge,
      type: 'smoothstep',
      animated: styleMeta.animated,
      label: toDisplayEdgeLabel(edge.label),
      labelStyle: { fill: styleMeta.labelColor, fontWeight: 800, fontSize: 10 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9, padding: 4 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: styleMeta.stroke
      },
      style: {
        stroke: styleMeta.stroke,
        strokeWidth: styleMeta.strokeWidth,
        strokeDasharray: styleMeta.strokeDasharray || 'none',
        zIndex: 10
      },
    };

    const isAgentic = isAgenticEdgeLabel(edge.label || '');

    if (isAgentic) {
      result.type = 'agenticEdge';
      result.markerEnd = undefined;
      result.sourceHandle = 'agentic-out';
      result.targetHandle = 'agentic-in';

      const sourceNode = stepById.get(edge.source);
      result.data = {
        ...result.data,
        bulbAt: sourceNode?.type === 'agentNode' ? 'source' : 'target'
      };
    } else {
      // Flow Distribution for standard edges
      const count = nodeOutgoingCounts.get(edge.source) || 0;
      nodeOutgoingCounts.set(edge.source, count + 1);

      if (count === 0) result.sourceHandle = 'bottom';
      else if (count === 1) result.sourceHandle = 'right';
      else if (count === 2) result.sourceHandle = 'left';
    }

    return result;
  });

  // Apply Dagre Layout - Top-to-Bottom
  // Apply Dagre Layout - Swimlane (Lanes stacked vertically, flow LR)
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(mappedNodes, mappedEdges, 'SWIMLANE');

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
  };
}


// --- Custom Nodes ---

function AgentNode({ data, targetPosition, sourcePosition }) {
  const accentColor = data.accentColor || '#6366f1';
  const hasTasks = Array.isArray(data.tasks) && data.tasks.length > 0;
  return (
    <div
      className={`bg-white border-[3px] rounded-2xl shadow-xl w-80 overflow-hidden ring-1 ring-slate-200/50 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] ${data.isHighlighted ? 'ring-4 ring-offset-4 ring-brand-500 shadow-[0_0_40px_rgba(99,102,241,0.2)] scale-[1.05]' : ''
        } ${data.isDimmed ? 'opacity-30 grayscale-[30%] blur-[0.5px]' : 'opacity-100'}`}
      style={{
        borderColor: data.isHighlighted ? '#10b981' : `${accentColor}`,
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-300 border-2 border-white" />
      <Handle
        type="target"
        position={Position.Left}
        id="agentic-in"
        style={{
          top: '70%',
          opacity: 0
        }}
      />
      <div
        className="text-white p-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
        }}
      >
        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
          {data.icon && <data.icon size={22} className="stroke-[2.5]" />}
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm tracking-tight">{data.title}</span>
        </div>
      </div>
      {hasTasks && (
        <div className="p-4 bg-slate-50/50 backdrop-blur-sm">
          <ul className="space-y-3">
            {data.tasks.map((task, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px] text-slate-700 font-medium leading-relaxed">
                <div
                  className="mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: accentColor }}
                />
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Handle type="source" id="bottom" position={Position.Right} className="w-3 h-3 !bg-slate-300 border-2 border-white" />
      <Handle type="source" id="right" position={Position.Right} className="w-3 h-3 !bg-slate-300 border-2 border-white opacity-0" />
      <Handle type="source" id="left" position={Position.Left} className="w-3 h-3 !bg-slate-300 border-2 border-white opacity-0" />
      <Handle
        type="source"
        position={Position.Right}
        id="agentic-out"
        style={{
          top: '70%',
          opacity: 0
        }}
      />
    </div>
  );
}

function ProcessNode({ data, targetPosition, sourcePosition }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const accentColor = data.accentColor || '#10b981';
  const { hasAgenticPotential, isOpen, toggleAgent, agenticInfo } = data;

  return (
    <div
      className={`border-2 rounded-2xl shadow-xl p-5 flex items-center gap-4 min-w-[260px] max-w-[320px] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 group relative cursor-pointer ${data.isHighlighted ? 'ring-4 ring-offset-2 ring-brand-500 scale-105 shadow-[0_30px_50px_-15px_rgba(0,0,0,0.3)]' : ''
        } ${data.isDimmed ? 'opacity-30 grayscale-[30%] blur-[0.5px]' : 'opacity-100'}`}
      style={{
        backgroundColor: `${accentColor}15`,
        borderColor: data.isHighlighted ? accentColor : `${accentColor}30`,
        transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
      onClick={(e) => {
        if (hasAgenticPotential) {
          e.stopPropagation();
          toggleAgent?.();
        }
      }}
    >
      <div
        className="absolute top-0 left-0 w-1.5 h-full"
        style={{ backgroundColor: accentColor }}
      />
       <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-slate-300 border-2 border-white" />
      <Handle
        type="target"
        position={Position.Left}
        id="agentic-in"
        style={{
          top: '70%',
          opacity: 0
        }}
      />

      {hasAgenticPotential && (
        <div
          className="absolute -top-3 -right-3 z-[100]"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div
            className={`bg-white rounded-full p-2 shadow-xl border-2 border-emerald-600 transition-all duration-500 hover:scale-110 ${isOpen ? 'rotate-90 bg-slate-50 scale-110' : ''}`}

          >
            <GitBranch size={20} className='text-emerald-600' />
          </div>

          {/* Rich Agent Box Popover - On Hover Preview */}
          <div
            className={`absolute bottom-full right-0 mb-4 w-80 bg-white rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] border border-slate-200 overflow-hidden transition-all duration-500 pointer-events-none z-[110] origin-bottom-right ${showTooltip ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
              }`}
          >
            {/* Gradient Header */}
            <div
              className="text-white p-4 flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${agenticInfo?.accentColor}, ${agenticInfo?.accentColor}dd)`
              }}
            >
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                {agenticInfo?.icon && <agenticInfo.icon size={20} className="stroke-[2.5]" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{agenticInfo?.label}</span>
                <span className="font-extrabold text-sm tracking-tight">{agenticInfo?.title}</span>
              </div>
            </div>

            {/* Content Area - Task List */}
            <div className="p-4 bg-slate-50/50 backdrop-blur-sm">
              <ul className="space-y-3">
                {agenticInfo?.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-3 group/item">
                    <div
                      className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: agenticInfo?.accentColor || accentColor, boxShadow: `0 0 8px ${agenticInfo?.accentColor || accentColor}80` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-600 leading-relaxed group-hover/item:text-slate-900 transition-colors">
                      {task}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tooltip Arrow */}
            <div className="absolute top-full right-4 -mt-1 border-[8px] border-transparent border-t-white" />
          </div>
        </div>
      )}

      {data.icon && (
        <div
          className="p-2.5 rounded-xl bg-slate-50 shadow-inner group-hover:scale-110 transition-transform duration-300"
          style={{ color: accentColor }}
        >
          <data.icon size={24} className="stroke-[2.5]" />
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        <span className="font-bold text-sm text-slate-800 leading-tight whitespace-normal overflow-wrap-anywhere">
          {data.label}
        </span>
      </div>
      <Handle type="source" id="bottom" position={Position.Right} className="w-3 h-3 !bg-slate-300 border-2 border-white" />
      <Handle type="source" id="right" position={Position.Right} className="w-3 h-3 !bg-slate-300 border-2 border-white opacity-0" />
      <Handle type="source" id="left" position={Position.Left} className="w-3 h-3 !bg-slate-300 border-2 border-white opacity-0" />
      <Handle
        type="source"
        position={Position.Right}
        id="agentic-out"
        style={{
          top: '70%',
          opacity: 0
        }}
      />
    </div>
  );
}

function DecisionNode({ data, targetPosition }) {
  return (
    <div className={`relative w-36 h-36 flex items-center justify-center group pointer-events-none transition-all duration-700 ${data.isHighlighted ? 'scale-110' : ''} ${data.isDimmed ? 'opacity-20 blur-[1px]' : 'opacity-100'}`}>
      <div className={`absolute inset-2 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-500 shadow-xl transform rotate-45 rounded-2xl group-hover:scale-105 transition-transform duration-500 ${data.isHighlighted ? 'ring-4 ring-amber-500 ring-offset-4 shadow-amber-500/40' : ''}`}></div>
      <div className={`absolute inset-0 border border-amber-500/20 transform rotate-45 rounded-2xl scale-[1.12] ${data.isHighlighted ? 'border-amber-500 opacity-100 animate-pulse' : ''}`}></div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 z-20 !bg-amber-500 border-2 border-white" />
      <Handle
        type="target"
        position={Position.Left}
        id="agentic-in"
        style={{
          top: '70%',
          opacity: 0
        }}
      />

      <div className="relative z-10 text-center flex flex-col items-center pointer-events-auto">

        <div className="text-xs font-bold uppercase tracking-wider text-amber-900 px-4 leading-tight max-w-[90px]">
          {data.label}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="bottom" className="w-3 h-3 z-20 !bg-amber-500 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 z-20 !bg-amber-500 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Left} id="left" className="w-3 h-3 z-20 !bg-amber-500 border-2 border-white shadow-sm" />
      <Handle
        type="source"
        position={Position.Right}
        id="agentic-out"
        style={{
          top: '70%',
          opacity: 0
        }}
      />
    </div>
  );
}

function AgentGroupNode({ data }) {
  const accentColor = data.accentColor || '#6366f1';
  return (
    <div
      className={`w-full h-full border-2 rounded-[2.5rem] relative shadow-inner overflow-hidden transition-all duration-700 ${data.isHighlighted ? 'ring-8 ring-brand-500/20 border-brand-500' : ''
        } ${data.isDimmed ? 'opacity-20 backdrop-grayscale' : 'opacity-100'}`}
      style={{
        backgroundColor: data.isHighlighted ? `${accentColor}15` : `${accentColor}05`,
        borderColor: data.isHighlighted ? accentColor : `${accentColor}20`
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 text-white w-40 flex flex-col items-center justify-center gap-8 shadow-2xl z-10 border-r-2 border-slate-700/50 p-4"
        style={{
          background: 'linear-gradient(180deg, #475569, #334155)'
        }}
      >
        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
          {data.icon && <data.icon size={32} />}
        </div>
        <span 
          className="uppercase tracking-[0.1em] font-black text-lg select-none text-center leading-tight" 
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          {data.label}
        </span>
      </div>
      <Handle type="target" position={Position.Top} id="agentic-in" style={{ left: '70%', opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="agentic-out" style={{ left: '70%', opacity: 0 }} />
    </div>
  );
}

function AgenticEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  animated,
  data
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const bulbX = data?.bulbAt === 'source' ? sourceX : targetX;
  const bulbY = data?.bulbAt === 'source' ? sourceY : targetY;
  const startLabelX = sourceX + (labelX - sourceX) * 0.4;
  const startLabelY = sourceY + (labelY - sourceY) * 0.4;

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${bulbX}px,${bulbY}px)`,
            pointerEvents: 'none',
          }}
          className="z-50"
        >
          <div className="bg-white rounded-full p-1 shadow-md border-2 border-[#10b981] -translate-x-2">
            <Lightbulb
              size={20}
              className="text-[#10b981]"
            />
          </div>
        </div>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: '#ffffff',
              opacity: 1,
              padding: '2px 6px',
              borderRadius: '2px',
              border: '1px solid #e2e8f0',
            }}
            className="nodrag nopan font-extrabold text-[10px] whitespace-nowrap z-[60]"
          >
            <span
              style={{
                ...labelStyle,
                color: '#10b981',
                fill: undefined
              }}
            >
              {label}
            </span>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}


const nodeTypes = {
  agentNode: AgentNode,
  processNode: ProcessNode,
  decisionNode: DecisionNode,
  agentGroupNode: AgentGroupNode,
};

const edgeTypes = {
  agenticEdge: AgenticEdge,
};

// --- Initial Data ---
const initialNodes = [];
const initialEdges = [];

function AgenticFlowContent({ suggestionId }) {
  const [flowData, setFlowData] = useState(null);
  const [openAgentIds, setOpenAgentIds] = useState(new Set());

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!flowData) return { nodes: [], edges: [] };
    return transformFlowData(flowData);
  }, [flowData]);

  const toggleAgent = useCallback((processId) => {
    setOpenAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(processId)) next.delete(processId);
      else next.add(processId);
      return next;
    });
  }, []);

  // Compute final nodes/edges with the 'hidden' property
  const { finalNodes, finalEdges } = useMemo(() => {
    if (!layoutedNodes.length) return { finalNodes: [], finalEdges: [] };
    const nodes = layoutedNodes.map(node => {
      if (node.type === 'agentNode') {
        const edgeToThisAgent = layoutedEdges.find(e =>
          (e.source === node.id || e.target === node.id) &&
          isAgenticEdgeLabel(e.label || '')
        );
        const processId = edgeToThisAgent ? (edgeToThisAgent.source === node.id ? edgeToThisAgent.target : edgeToThisAgent.source) : null;
        return {
          ...node,
          hidden: !openAgentIds.has(processId)
        };
      }

      if (node.type === 'processNode' || node.type === 'decisionNode') {
        return {
          ...node,
          data: {
            ...node.data,
            isOpen: openAgentIds.has(node.id),
            toggleAgent: () => toggleAgent(node.id)
          }
        };
      }

      return node;
    });

    const edges = layoutedEdges.map(edge => {
      const isAgentic = isAgenticEdgeLabel(edge.label || '');
      if (isAgentic) {
        // Find the owner node (the non-agent side)
        const sourceNode = layoutedNodes.find(n => n.id === edge.source);
        const targetNode = layoutedNodes.find(n => n.id === edge.target);

        const processId = sourceNode?.type !== 'agentNode' ? edge.source : edge.target;
        return {
          ...edge,
          hidden: !openAgentIds.has(processId)
        };
      }
      return edge;
    });

    return { finalNodes: nodes, finalEdges: edges };
  }, [layoutedNodes, layoutedEdges, openAgentIds, toggleAgent]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (finalNodes.length) {
      setNodes(finalNodes);
      setEdges(finalEdges);
    }
  }, [finalNodes, finalEdges, setNodes, setEdges]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [selectedEdgeInfo, setSelectedEdgeInfo] = useState(null);
  const { fitView } = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Small delay to let the browser resize before fitting view
      setTimeout(() => fitView({ duration: 800, padding: 0.2 }), 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitView]);


  const lastFetchedId = useRef(null);

  useEffect(() => {
    if (!suggestionId || lastFetchedId.current === suggestionId) return;

    const fetchFlow = async () => {
      setLoading(true);
      setError(null);
      lastFetchedId.current = suggestionId;
      try {
        const data = await getProcessFlow(suggestionId);
        setFlowData(data);
      } catch (err) {
        console.error('Failed to fetch flow:', err);
        setError(err.message);
        lastFetchedId.current = null; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchFlow();
  }, [suggestionId]);



  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onEdgeClick = useCallback((event, edge) => {
    setHighlightedNodes([edge.source, edge.target]);

    // Find node labels for the info overlay
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    setSelectedEdgeInfo({
      id: edge.id,
      label: edge.label || 'Connection',
      source: sourceNode?.data?.label || sourceNode?.data?.title || 'Unknown Source',
      sourceType: sourceNode?.type === 'agentNode' ? 'Agent' : 'Process',
      sourceIcon: sourceNode?.data?.icon,
      target: targetNode?.data?.label || targetNode?.data?.title || 'Unknown Target',
      targetType: targetNode?.type === 'agentNode' ? 'Agent' : 'Process',
      targetIcon: targetNode?.data?.icon,
      accentColor: sourceNode?.data?.accentColor || '#6366f1'
    });
  }, [nodes]);

  const onPaneClick = useCallback(() => {
    setHighlightedNodes([]);
    setSelectedEdgeInfo(null);
  }, []);

  const onNodeClick = useCallback(() => {
    setHighlightedNodes([]);
    setSelectedEdgeInfo(null);
  }, []);

  if (loading) {
    return (
      <div className={`w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 transition-all duration-300 ${isFullscreen ? 'h-screen' : 'h-[600px]'}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading automation workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 transition-all duration-300 ${isFullscreen ? 'h-screen' : 'h-[600px]'}`}>
        <div className="flex flex-col items-center gap-3 text-red-500 p-8 text-center max-w-md">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-medium">Failed to load workflow: {error}</p>
        </div>
      </div>
    );
  }

  if (!loading && nodes.length === 0) {
    return (
      <div className={`w-full border border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 gap-4 transition-all duration-300 ${isFullscreen ? 'h-screen' : 'h-[600px]'}`}>
        <div className="bg-white p-6 rounded-full shadow-inner">
          <Layers className="w-12 h-12 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">No Workflow Detected</p>
          <p className="text-sm text-slate-500 max-w-[300px] mx-auto">This suggestion doesn't have any automated steps assigned yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full border border-slate-200 rounded-3xl overflow-hidden relative bg-slate-50 transition-all duration-500 shadow-2xl ${isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[600px]'
        }`}
    >
      <ReactFlow
        nodes={nodes.map(node => {
          const isHighlighted = highlightedNodes.includes(node.id);
          const isDimmed = highlightedNodes.length > 0 && !isHighlighted;
          return {
            ...node,
            data: { ...node.data, isHighlighted, isDimmed }
          };
        })}
        edges={edges.map(edge => {
          const isSelected = selectedEdgeInfo?.id === edge.id;
          const isDimmed = !!selectedEdgeInfo && !isSelected;

          return {
            ...edge,
            animated: isSelected ? true : edge.animated,
            style: {
              ...edge.style,
              opacity: isDimmed ? 0.15 : 1,
              strokeWidth: isSelected ? 5 : (edge.style?.strokeWidth || 2),
              filter: isSelected ? 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.4))' : 'none',
              transition: 'all 0.4s ease'
            },
            markerEnd: typeof edge.markerEnd === 'object' ? {
              ...edge.markerEnd,
              opacity: isDimmed ? 0.2 : 1
            } : edge.markerEnd
          };
        })}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        attributionPosition="bottom-right"
        className="bg-white border border-slate-200 shadow-lg"
      >
        <Controls className="!bg-white !border-slate-200" showFitView={false}>
          <ControlButton onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <div className="flex items-center justify-center w-full h-full text-slate-700">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </div>
          </ControlButton>
        </Controls>
        <Background color="#94a3b8" gap={20} size={1} style={{ opacity: 0.25 }} />

        {selectedEdgeInfo && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in zoom-in slide-in-from-top-6 duration-300">
            <div className="bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] rounded-2xl px-4 py-3 flex items-center gap-6 border border-white/50 ring-1 ring-slate-900/5">
              {/* Source Node Info */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-50 shadow-inner" style={{ color: selectedEdgeInfo.accentColor }}>
                  {selectedEdgeInfo.sourceIcon && <selectedEdgeInfo.sourceIcon size={20} className="stroke-[2.5]" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{selectedEdgeInfo.sourceType}</span>
                  <span className="text-[13px] font-bold text-slate-800 leading-tight max-w-[140px]">{selectedEdgeInfo.source}</span>
                </div>
              </div>

              {/* Edge/Connection Info */}
              <div className="flex flex-col items-center gap-2">
                <div className="bg-brand-50/50 px-2 py-0.5 rounded-full border border-brand-100 shadow-sm">
                  <span className="text-[9px] font-black text-black uppercase tracking-[0.1em] whitespace-nowrap">
                    {selectedEdgeInfo.label}
                  </span>
                </div>
                <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-brand-500 to-transparent relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)] animate-pulse"></div>
                </div>
              </div>

              {/* Target Node Info - Now Reordered: Icon then Text */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-50 shadow-inner text-brand-500">
                  {selectedEdgeInfo.targetIcon && <selectedEdgeInfo.targetIcon size={20} className="stroke-[2.5]" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{selectedEdgeInfo.targetType}</span>
                  <span className="text-[13px] font-bold text-slate-800 leading-tight max-w-[140px]">{selectedEdgeInfo.target}</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onPaneClick}
                className="p-1.5 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-lg transition-all duration-300 group"
              >
                <XCircle size={18} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
}

export default function AgenticWorkflow(props) {
  return (
    <ReactFlowProvider>
      <AgenticFlowContent {...props} />
    </ReactFlowProvider>
  );
}
