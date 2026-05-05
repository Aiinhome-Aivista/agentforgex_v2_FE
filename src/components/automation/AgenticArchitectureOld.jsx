import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Handle,
    Position,
    ReactFlowProvider,
    MarkerType,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ControlButton,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Mail,
    Database,
    MessageSquare,
    Webhook,
    Cloud,
    Layout,
    Cpu,
    Zap,
    UserCheck,
    FileText,
    Archive,
    RefreshCcw,
    Truck,
    ShieldCheck,
    Brain,
    Settings,
    Search,
    Server,
    Maximize2,
    Minimize2,
    Terminal,
    Smartphone,
    Layers,
    Users,
    ChevronRight,
    SearchCode,
    Bot,
    History,
    Key,
    Lock,
    Globe,
    HardDrive,
    ScrollText,
    Loader2,
    AlertCircle,
    CheckSquare,
    CheckCircle,
    GitBranch,
    XCircle
} from 'lucide-react';
import { getAutomationArchitecture } from '../../services/api';
import { getLayoutedElements } from '../layout/Dagre';

// --- Icon Mapping (Common across components) ---
const ICON_MAP = {
    Database,
    Server,
    Zap,
    Users,
    ShieldCheck,
    CheckSquare,
    Cloud,
    Bot,
    FileText,
    History,
    Key,
    Lock,
    Globe,
    Search,
    Mail,
    Webhook
};

function getEdgeStyle(label = '') {
    // All edges are solid black as per user request
    return {
        stroke: '#000000',
        strokeWidth: 2,
        labelColor: '#000000',
        animated: false,
    };
}

// --- Custom Node Components ---

const TypeGroupNode = ({ data }) => {
    const { label, color = 'indigo' } = data;
    const colors = {
        indigo: 'bg-indigo-50/30 border-indigo-100 ring-indigo-50 text-indigo-700',
        purple: 'bg-purple-50/30 border-purple-100 ring-purple-50 text-purple-700',
        amber: 'bg-amber-50/30 border-amber-100 ring-amber-50 text-amber-700',
        emerald: 'bg-emerald-50/30 border-emerald-100 ring-emerald-50 text-emerald-700',
        sky: 'bg-sky-50/30 border-sky-100 ring-sky-50 text-sky-700',
    };

    const headerColors = {
        indigo: 'bg-indigo-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        emerald: 'bg-emerald-500',
        sky: 'bg-sky-500',
    };

    return (
        <div className={`w-full h-full border-2 rounded-[2.5rem] shadow-sm relative overflow-hidden ${colors[color] || colors.indigo}`}>
            <div className={`absolute top-0 left-0 right-0 h-24 ${headerColors[color] || headerColors.indigo} flex items-center px-10 gap-5 shadow-lg`}>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md ring-1 ring-white/30">
                    {data.icon && <data.icon size={32} className="text-white" />}
                </div>
                <h3 className="text-4xl font-black uppercase tracking-[0.1em] text-white leading-none">
                    {label}
                </h3>
            </div>
            <div className="pt-32 pb-8 px-8 h-full">
                {/* Content will be nested nodes */}
                {data.isDimmed && (
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] pointer-events-none" />
                )}
            </div>
        </div>
    );
};

const ProcessStepNode = ({ data }) => {
    const { title, description, icon: Icon = Database } = data;
    // We use multiple handles to ensure edges are separable and don't merge into a single "trunk"
    const handleOffsets = ['10%', '30%', '50%', '70%', '90%'];

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl flex items-center gap-6 min-w-[420px] max-w-[500px] group transition-all hover:scale-[1.02] hover:shadow-2xl relative border-l-8 border-l-rose-500">
            {/* Multi-Target Handles (Top) */}
            {handleOffsets.map((offset, i) => (
                <Handle
                    key={`t-${i}`}
                    id={`t-${i}`}
                    type="target"
                    position={Position.Top}
                    style={{ left: offset }}
                    className="!w-2 !h-2 !bg-slate-300 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
            ))}


            {/* Selection/Highlight State for Process Nodes */}
            {data.isHighlighted && (
                <div className="absolute inset-0 rounded-2xl ring-4 ring-brand-500 ring-offset-4 animate-pulse pointer-events-none" />
            )}
            {data.isDimmed && (
                <div className="absolute inset-0 rounded-2xl bg-slate-900/5 backdrop-blur-[1px] pointer-events-none" />
            )}

            <Handle
                key={`s-0`}
                id={`s-0`}
                type="source"
                position={Position.Bottom}
                style={{ left: '50%' }}
                className="!w-2 !h-2 !bg-slate-300 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
            />

            <div className="p-4 rounded-2xl bg-slate-50 shadow-inner group-hover:bg-red-50 transition-colors">
                <Icon className="text-rose-500" size={32} strokeWidth={2.5} />
            </div>

            <div className="flex flex-col gap-1 pr-2">
                <h5 className="font-extrabold text-4xl text-slate-950 leading-tight tracking-tight">
                    {title}
                </h5>
                {description && (
                    <p className={`text-2xl font-semibold leading-relaxed line-clamp-2 transition-colors ${data.isDimmed ? 'text-slate-400' : 'text-slate-600'}`}>
                        {description}
                    </p>
                )}
            </div>

            {/* Multi-Source Handles (Bottom) */}
            {handleOffsets.map((offset, i) => (
                <Handle
                    key={`s-${i}`}
                    id={`s-${i}`}
                    type="source"
                    position={Position.Bottom}
                    style={{ left: offset }}
                    className="!w-2 !h-2 !bg-slate-300 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
            ))}
        </div>
    );
};

const nodeTypes = {
    groupNode: TypeGroupNode,
    stepNode: ProcessStepNode,
};

const Library = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" />
    </svg>
)
function ArchitectureFlowContent({ suggestionId }) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [highlightedNodes, setHighlightedNodes] = useState([]);
    const [selectedEdgeInfo, setSelectedEdgeInfo] = useState(null);

    const transformArchitectureData = useCallback((apiData) => {
        const rawNodes = apiData.nodes || [];
        const rawEdges = apiData.edges || [];

        // 1. Group nodes by type
        const nodesByType = rawNodes.reduce((acc, node) => {
            const type = (node.type || 'unknown').toLowerCase();
            if (!acc[type]) acc[type] = [];
            acc[type].push(node);
            return acc;
        }, {});

        const groupConfigs = {
            input: { label: 'EXTERNAL INPUTS', color: 'sky', icon: Layout },
            system: { label: 'ENTERPRISE SYSTEMS', color: 'indigo', icon: Server },
            agent: { label: 'AUTOMATION AGENTS', color: 'purple', icon: Bot },
            human: { label: 'MANUAL REVIEWERS', color: 'amber', icon: Users },
            output: { label: 'FINAL OUTPUTS', color: 'emerald', icon: CheckCircle },
            unknown: { label: 'PROCESS STEPS', color: 'indigo', icon: Layers }
        };

        const finalNodes = [];
        const edgeList = [...rawEdges];

        Object.entries(nodesByType).forEach(([type, nodes]) => {
            const config = groupConfigs[type] || groupConfigs.unknown;
            const groupId = `group_${type}`;

            // Create Group Node
            finalNodes.push({
                id: groupId,
                type: 'groupNode',
                data: {
                    label: type.toUpperCase(),
                    color: config.color,
                    icon: config.icon
                },
                position: { x: 0, y: 0 },
                style: { width: 600, height: 400 },
            });

            // Map Child Nodes
            nodes.forEach(node => {
                const id = node.id.toLowerCase();
                finalNodes.push({
                    ...node,
                    type: 'stepNode',
                    parentNode: groupId,
                    extent: 'parent',
                    data: {
                        title: node.data?.label || node.data?.title || 'Unknown',
                        description: node.data?.description || '',
                        icon: (id.includes('verification') || id.includes('validation') || id.includes('match') || id.includes('check')) ? ShieldCheck :
                            (id.includes('erp') || id.includes('finance')) ? Database :
                                (id.includes('gateway') || id.includes('api')) ? Zap :
                                    (id.includes('ocr') || id.includes('nlp')) ? Brain :
                                        (type === 'input') ? Mail : Bot
                    }
                });
            });
        });

        const sourceCounts = {};
        const targetCounts = {};

        const mappedEdges = edgeList.map(edge => {
            const styleMeta = getEdgeStyle(edge.label || '');

            // Distribute handles to prevent trunking
            const sCount = sourceCounts[edge.source] || 0;
            const tCount = targetCounts[edge.target] || 0;

            const isOrchestration = edge.isOrchestration;

            const edgeResult = {
                ...edge,
                type: 'step',
                sourceHandle: `s-${sCount % 5}`,
                targetHandle: `t-${tCount % 5}`,
                label: (edge.label || '').toUpperCase(),
                labelStyle: {
                    fill: isOrchestration ? '#a855f7' : styleMeta.labelColor,
                    fontWeight: 800,
                    fontSize: 32,
                    letterSpacing: '0.02em'
                },
                labelBgStyle: {
                    fill: '#ffffff',
                    fillOpacity: 0.98,
                    padding: 12,
                    rx: 10,
                },
                labelBgPadding: [16, 12],
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isOrchestration ? '#a855f7' : styleMeta.stroke,
                    width: 20,
                    height: 20,
                },
                style: {
                    stroke: isOrchestration ? '#a855f7' : styleMeta.stroke,
                    strokeWidth: isOrchestration ? 6 : 5,
                    strokeDasharray: isOrchestration ? '5 5' : 'none',
                },
                animated: isOrchestration ? true : styleMeta.animated
            };

            sourceCounts[edge.source] = sCount + 1;
            targetCounts[edge.target] = tCount + 1;

            return edgeResult;
        });

        // Apply Dagre Layout - Top-to-Bottom
        return getLayoutedElements(finalNodes, mappedEdges, 'TB');
    }, []);

    const lastFetchedId = useRef(null);

    useEffect(() => {
        if (!suggestionId || lastFetchedId.current === suggestionId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            lastFetchedId.current = suggestionId;
            try {
                const json = await getAutomationArchitecture(suggestionId);
                const data = json?.agent_cluster_architecture || (json?.nodes ? json : (json?.data?.nodes ? json.data : null));

                if (data && data.nodes) {
                    const { nodes: transformedNodes, edges: transformedEdges } = transformArchitectureData(data);
                    setNodes(transformedNodes);
                    setEdges(transformedEdges);

                    // Trigger a stable fitView after nodes are set and layout is applied
                    setTimeout(() => {
                        fitView({ padding: 0.15, duration: 800, minZoom: 0.01, maxZoom: 1.2 });
                    }, 500);
                } else {
                    setError('No architecture data found for this suggestion');
                }
            } catch (err) {
                console.error('Failed to fetch architecture:', err);
                setError(err.message || 'Failed to load architecture data');
                lastFetchedId.current = null;
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [suggestionId, transformArchitectureData, setNodes, setEdges]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const { fitView } = useReactFlow();

    const onEdgeClick = useCallback((event, edge) => {
        setHighlightedNodes([edge.source, edge.target]);

        // Find node labels for the info overlay
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        setSelectedEdgeInfo({
            id: edge.id,
            label: edge.label || 'Connection',
            source: sourceNode?.data?.title || 'Unknown Source',
            sourceType: sourceNode?.type === 'groupNode' ? 'Cluster' : 'Step',
            sourceIcon: sourceNode?.data?.icon,
            target: targetNode?.data?.title || 'Unknown Target',
            targetType: targetNode?.type === 'groupNode' ? 'Cluster' : 'Step',
            targetIcon: targetNode?.data?.icon,
            accentColor: (sourceNode?.data?.color === 'indigo' ? '#6366f1' :
                sourceNode?.data?.color === 'purple' ? '#a855f7' :
                    sourceNode?.data?.color === 'amber' ? '#f59e0b' :
                        sourceNode?.data?.color === 'emerald' ? '#10b981' : '#6366f1')
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

    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error entering fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setTimeout(() => fitView({ duration: 800, padding: 0.15, minZoom: 0.01 }), 200);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [fitView]);

    if (loading) {
        return (
            <div className={`w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 transition-all duration-300 ${isFullscreen ? 'h-screen' : 'h-[600px]'}`}>
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Loading deployment architecture...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full border border-slate-200 rounded-3xl flex items-center justify-center bg-slate-50 transition-all duration-300 ${isFullscreen ? 'h-screen' : 'h-[600px]'}`}>
                <div className="flex flex-col items-center gap-3 text-red-500 p-8 text-center max-w-md">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-sm font-medium">Failed to load architecture: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`w-full border border-slate-200 rounded-3xl overflow-hidden bg-slate-50 relative transition-all duration-500 shadow-2xl ${isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[600px]'
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
                            opacity: isDimmed ? 0.2 : 1,
                            strokeWidth: isSelected ? 5 : (edge.style?.strokeWidth || 2.5),
                            filter: isSelected ? 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.4))' : 'none',
                            transition: 'all 0.4s ease',
                            stroke: isSelected ? '#6366f1' : (edge.style?.stroke || '#000000')
                        },
                        markerEnd: typeof edge.markerEnd === 'object' ? {
                            ...edge.markerEnd,
                            color: isSelected ? '#6366f1' : (edge.markerEnd?.color || '#000000'),
                            opacity: isDimmed ? 0.2 : 1
                        } : edge.markerEnd
                    };
                })}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.05}
                maxZoom={1.5}
                className="bg-white border border-slate-200 shadow-lg"
                defaultEdgeOptions={{ type: 'smoothstep' }}
            >
                <Background color="#94a3b8" gap={20} size={1} style={{ opacity: 0.25 }} />
                <Controls className="!bg-white !border-slate-200" showFitView={false}>
                    <ControlButton onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                        <div className="flex items-center justify-center w-full h-full text-slate-700">
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </div>
                    </ControlButton>
                </Controls>

                {/* Selection Overlay */}
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

                            {/* Target Node Info */}
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
};


function AgenticDeploymentFlow({ suggestionId }) {
    return (
        <ReactFlowProvider>
            <ArchitectureFlowContent suggestionId={suggestionId} />
        </ReactFlowProvider>
    );
}

export default AgenticDeploymentFlow;
