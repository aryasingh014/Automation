import React, { useState, useEffect, useCallback } from 'react';
import { 
  Circle, 
  Search, 
  Server,
  Database,
  HardDrive,
  Radio,
  Globe,
  AlertCircle,
  CheckCircle,
  MinusCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface ServiceNode {
  id: string;
  name: string;
  type: 'application' | 'database' | 'cache' | 'queue' | 'gateway' | 'external';
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  group: string;
  x?: number;
  y?: number;
}

interface ServiceEdge {
  source: string;
  target: string;
  type: 'sync' | 'async' | 'http' | 'grpc' | 'database' | 'cache' | 'queue';
  latency?: number;
  errorRate?: number;
}

interface TopologyData {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
}

const nodeIcons: Record<string, React.ReactNode> = {
  application: <Server size={20} />,
  database: <Database size={20} />,
  cache: <HardDrive size={20} />,
  queue: <Radio size={20} />,
  gateway: <Globe size={20} />,
  external: <Globe size={20} />,
};

const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  application: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  database: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  cache: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  queue: { bg: 'bg-pink-500/20', border: 'border-pink-500/50', text: 'text-pink-400' },
  gateway: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400' },
  external: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
};

export default function ServiceTopology() {
  const [topology, setTopology] = useState<TopologyData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchTopology = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/discovery/topology');
      if (!response.ok) throw new Error('Failed to fetch topology');
      const data = await response.json();
      setTopology(data);
    } catch (error) {
      console.error('Topology error:', error);
      toast.error('Failed to load service topology');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 30000);
    return () => clearInterval(interval);
  }, [fetchTopology]);

  const getNodePosition = (index: number, total: number, nodes: ServiceNode[]) => {
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const centerX = 400;
    const centerY = 250;
    const spacing = 120;

    return {
      x: centerX + (col - cols / 2) * spacing + (Math.random() - 0.5) * 40,
      y: centerY + (row - Math.floor(nodes.filter(n => n.type === 'gateway').length / 2) / 2) * spacing,
    };
  };

  const filteredNodes = filter === 'all' 
    ? topology.nodes 
    : topology.nodes.filter(n => n.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-mono font-bold text-text-secondary uppercase tracking-wider">
            Service Topology Map
          </h3>
          <button 
            onClick={fetchTopology}
            className="p-1.5 hover:bg-border-main rounded transition-colors"
          >
            <RefreshCw size={14} className={cn("text-text-muted", isLoading && "animate-spin")} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-surface border border-border-main p-1 rounded-lg">
            {['all', 'gateway', 'application', 'database', 'cache', 'queue'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  "px-2 py-1 text-[10px] font-mono rounded",
                  filter === type ? "bg-inverse-bg text-inverse-text" : "text-text-secondary hover:text-text-main"
                )}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative bg-bg-surface border border-border-main rounded-xl overflow-hidden" style={{ height: 500 }}>
        {isLoading && topology.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 800 500">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="20"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--border-main)" />
              </marker>
            </defs>

            {topology.edges.map((edge, i) => {
              const sourceNode = topology.nodes.find(n => n.id === edge.source || n.name === edge.source);
              const targetNode = topology.nodes.find(n => n.id === edge.target || n.name === edge.target);
              
              if (!sourceNode || !targetNode) return null;

              const sourceIdx = topology.nodes.indexOf(sourceNode);
              const targetIdx = topology.nodes.indexOf(targetNode);
              const sourcePos = getNodePosition(sourceIdx, topology.nodes.length, topology.nodes);
              const targetPos = getNodePosition(targetIdx, topology.nodes.length, topology.nodes);

              const edgeColor = edge.errorRate && edge.errorRate > 1 
                ? '#ef4444' 
                : edge.latency && edge.latency > 100 
                  ? '#f59e0b' 
                  : '#3b82f6';

              return (
                <line
                  key={`edge-${i}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={edgeColor}
                  strokeWidth={edge.errorRate && edge.errorRate > 1 ? 2 : 1}
                  strokeOpacity={0.5}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

            {filteredNodes.map((node, i) => {
              const pos = getNodePosition(
                topology.nodes.indexOf(node),
                topology.nodes.length,
                topology.nodes
              );
              const colors = nodeColors[node.type] || nodeColors.application;
              const statusIcon = node.status === 'healthy' 
                ? <CheckCircle size={12} className="text-green-400" />
                : node.status === 'degraded'
                  ? <MinusCircle size={12} className="text-amber-400" />
                  : node.status === 'down'
                    ? <AlertCircle size={12} className="text-red-400" />
                    : null;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedNode(node)}
                >
                  <motion.circle
                    r="28"
                    className={cn(
                      "fill-bg-surface stroke-2",
                      colors.border
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                  />
                  <foreignObject x="-12" y="-12" width="24" height="24">
                    <div className={cn("flex items-center justify-center", colors.text)}>
                      {nodeIcons[node.type]}
                    </div>
                  </foreignObject>
                  <text
                    y="45"
                    textAnchor="middle"
                    className="text-[10px] fill-current text-text-secondary font-mono"
                  >
                    {node.name}
                  </text>
                  {statusIcon && (
                    <g transform="translate(15, -15)">
                      {statusIcon}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-text-secondary">Application</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-text-secondary">Database</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-text-secondary">Cache</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="text-text-secondary">Queue</span>
        </div>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNode(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-bg-surface border border-border-main rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-border-main flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", nodeColors[selectedNode.type]?.bg)}>
                    {nodeIcons[selectedNode.type]}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedNode.name}</h3>
                    <p className="text-[10px] text-text-muted font-mono uppercase">{selectedNode.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted text-xs block">Status</span>
                    <span className={cn(
                      "font-medium",
                      selectedNode.status === 'healthy' ? "text-green-500" :
                      selectedNode.status === 'degraded' ? "text-amber-500" : "text-red-500"
                    )}>
                      {selectedNode.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs block">Type</span>
                    <span className="font-medium capitalize">{selectedNode.type}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-main">
                  <h4 className="text-xs font-mono text-text-muted uppercase mb-2">Dependencies</h4>
                  <div className="space-y-1">
                    {topology.edges
                      .filter(e => e.source === selectedNode.name || e.target === selectedNode.name)
                      .slice(0, 5)
                      .map((dep, i) => {
                        const isSource = dep.source === selectedNode.name;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">
                              {isSource ? `→ ${dep.target}` : `← ${dep.source}`}
                            </span>
                            <span className="font-mono text-text-secondary">
                              {dep.latency}ms
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}