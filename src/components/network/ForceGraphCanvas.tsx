"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import {
  buildGraphModel,
  getConnectedIds,
  type GraphLink,
  type GraphNode,
} from "@/lib/graph-model";
import type { PeopleDataset, StrategicRelevance } from "@/types/person";

interface ForceGraphCanvasProps {
  dataset: PeopleDataset;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface GraphSize {
  width: number;
  height: number;
}

interface TooltipCoordinates {
  x: number;
  y: number;
}

const TOOLTIP_WIDTH = 240;
const TOOLTIP_HEIGHT = 116;

const relevanceColor: Record<StrategicRelevance, string> = {
  high: "#d97706",
  medium: "#0284c7",
  low: "#94a3b8",
};

function endpointId(endpoint: GraphLink["source"] | undefined): string | undefined {
  if (typeof endpoint === "string") return endpoint;
  return endpoint?.id;
}

function titleCase(value: string): string {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function drawDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  padding: number,
) {
  context.beginPath();
  context.moveTo(x, y - radius - padding);
  context.lineTo(x + radius + padding, y);
  context.lineTo(x, y + radius + padding);
  context.lineTo(x - radius - padding, y);
  context.closePath();
}

export function ForceGraphCanvas({ dataset, selectedId, onSelect }: ForceGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const forcesConfiguredRef = useRef(false);
  const hasFittedRef = useRef(false);
  const pointerDownRef = useRef<TooltipCoordinates | null>(null);
  const draggedRef = useRef(false);
  const [size, setSize] = useState<GraphSize>({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipCoordinates, setTooltipCoordinates] = useState<TooltipCoordinates>({ x: 0, y: 0 });
  const graphData = useMemo(() => buildGraphModel(dataset), [dataset]);
  const activeId = selectedId ?? hoveredId;
  const connectedIds = useMemo(
    () => activeId ? getConnectedIds(graphData.links, activeId) : null,
    [activeId, graphData.links],
  );
  const hoveredNode = hoveredId
    ? graphData.nodes.find(({ personId }) => personId === hoveredId)
    : undefined;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((current) => current.width === width && current.height === height
        ? current
        : { width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || forcesConfiguredRef.current || size.width === 0 || size.height === 0) return;

    const charge = graph.d3Force("charge");
    charge?.strength?.(-170);

    const linkForce = graph.d3Force("link");
    linkForce?.distance?.((link: GraphLink) => link.kind === "introduced_by"
      ? 108
      : 132 - (link.strength ?? 1) * 12);
    linkForce?.strength?.((link: GraphLink) => link.kind === "introduced_by"
      ? 0.2
      : 0.22 + (link.strength ?? 1) * 0.08);
    forcesConfiguredRef.current = true;
  }, [size.height, size.width]);

  const isNodeEmphasized = useCallback((node: GraphNode) => {
    return connectedIds === null || connectedIds.has(node.personId);
  }, [connectedIds]);

  const isLinkEmphasized = useCallback((link: GraphLink) => {
    if (connectedIds === null) return true;
    const sourceId = endpointId(link.source);
    const targetId = endpointId(link.target);
    return sourceId !== undefined
      && targetId !== undefined
      && connectedIds.has(sourceId)
      && connectedIds.has(targetId);
  }, [connectedIds]);

  const paintNode = useCallback((node: NodeObject<GraphNode>, context: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return;

    const emphasized = isNodeEmphasized(node);
    const selected = node.personId === selectedId;
    const hovered = node.personId === hoveredId;
    const scale = Math.max(globalScale, 0.001);
    const radius = Math.min(9, Math.max(5, node.strength)) / scale;
    context.save();
    context.globalAlpha = emphasized ? 1 : 0.2;

    if (node.strategicRelevance) {
      context.beginPath();
      context.arc(node.x, node.y, radius + 3.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = relevanceColor[node.strategicRelevance];
      context.lineWidth = (selected || hovered ? 2.4 : 1.6) / scale;
      context.stroke();
    }

    if (selected || hovered) {
      context.beginPath();
      context.arc(node.x, node.y, radius + 6.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = selected ? "#0f172a" : "#64748b";
      context.lineWidth = 1.5 / scale;
      context.stroke();
    }

    if (node.isSelf) {
      drawDiamond(context, node.x, node.y, radius, 2 / scale);
      context.fillStyle = "#0f172a";
      context.fill();
    } else {
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fillStyle = selected ? "#334155" : "#f8fafc";
      context.fill();
      context.strokeStyle = "#334155";
      context.lineWidth = 1.4 / scale;
      context.stroke();
    }

    const fontSize = 11 / scale;
    context.font = `${node.isSelf ? 650 : 550} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.fillStyle = "#0f172a";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(node.name, node.x + radius + 7 / scale, node.y);
    context.restore();
  }, [hoveredId, isNodeEmphasized, selectedId]);

  const handleEngineStop = useCallback(() => {
    if (hasFittedRef.current) return;
    hasFittedRef.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    graphRef.current?.zoomToFit(reduceMotion ? 0 : 380, 52);
  }, []);

  const findNodeAt = useCallback((coordinates: TooltipCoordinates) => {
    const graph = graphRef.current;
    if (!graph) return undefined;

    return graphData.nodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const screen = graph.graph2ScreenCoords(node.x, node.y);
      const hitRadius = Math.min(9, Math.max(5, node.strength)) + 7;
      return Math.hypot(screen.x - coordinates.x, screen.y - coordinates.y) <= hitRadius;
    });
  }, [graphData.nodes]);

  const getPointerCoordinates = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const coordinates = getPointerCoordinates(event);
    const node = findNodeAt(coordinates);
    const pointerDown = pointerDownRef.current;
    if (pointerDown && Math.hypot(coordinates.x - pointerDown.x, coordinates.y - pointerDown.y) > 4) {
      draggedRef.current = true;
    }
    setHoveredId(node?.personId ?? null);
    if (node) setTooltipCoordinates(coordinates);
  }, [findNodeAt, getPointerCoordinates]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const coordinates = getPointerCoordinates(event);
    const pointerDown = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!pointerDown || draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onSelect(findNodeAt(coordinates)?.personId ?? null);
  }, [findNodeAt, getPointerCoordinates, onSelect]);

  const tooltipX = Math.min(
    Math.max(8, tooltipCoordinates.x + 14),
    Math.max(8, size.width - TOOLTIP_WIDTH - 8),
  );
  const tooltipY = Math.min(
    Math.max(8, tooltipCoordinates.y + 14),
    Math.max(8, size.height - TOOLTIP_HEIGHT - 8),
  );
  const roleAndTeam = hoveredNode
    ? [hoveredNode.role, hoveredNode.team].filter(Boolean).join(" · ")
    : "";

  return (
    <div
      className="relative h-[min(68vh,44rem)] min-h-[28rem] w-full overflow-hidden"
      onPointerDownCapture={(event) => {
        draggedRef.current = false;
        pointerDownRef.current = getPointerCoordinates(event);
      }}
      onPointerLeave={() => {
        pointerDownRef.current = null;
        setHoveredId(null);
      }}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      ref={containerRef}
    >
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D<GraphNode, GraphLink>
          autoPauseRedraw
          cooldownTicks={120}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.34}
          enableNodeDrag={false}
          enablePanInteraction
          enablePointerInteraction={false}
          enableZoomInteraction
          graphData={graphData}
          height={size.height}
          linkColor={(link: LinkObject<GraphNode, GraphLink>) => {
            const emphasized = isLinkEmphasized(link);
            if (link.kind === "introduced_by") return emphasized ? "rgba(2, 132, 199, 0.72)" : "rgba(2, 132, 199, 0.12)";
            return emphasized ? "rgba(71, 85, 105, 0.62)" : "rgba(71, 85, 105, 0.1)";
          }}
          linkDirectionalArrowColor={(link: LinkObject<GraphNode, GraphLink>) => isLinkEmphasized(link)
            ? "rgba(2, 132, 199, 0.8)"
            : "rgba(2, 132, 199, 0.14)"}
          linkDirectionalArrowLength={(link: LinkObject<GraphNode, GraphLink>) => link.directed ? 6 : 0}
          linkDirectionalArrowRelPos={0.72}
          linkLineDash={(link: LinkObject<GraphNode, GraphLink>) => link.kind === "introduced_by" ? [5, 4] : null}
          linkWidth={(link: LinkObject<GraphNode, GraphLink>) => {
            const baseWidth = link.kind === "direct" ? 0.65 + (link.strength ?? 1) * 0.24 : 1.25;
            return isLinkEmphasized(link) ? baseWidth : 0.55;
          }}
          maxZoom={4.5}
          minZoom={0.35}
          nodeCanvasObject={paintNode}
          nodeLabel={() => ""}
          onEngineStop={handleEngineStop}
          ref={graphRef}
          width={size.width}
        />
      )}

      {hoveredNode && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 w-60 rounded-md border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-lg shadow-slate-900/10 backdrop-blur-sm"
          role="tooltip"
          style={{ transform: `translate3d(${tooltipX}px, ${tooltipY}px, 0)` }}
        >
          <p className="font-semibold text-slate-950">{hoveredNode.name}</p>
          {roleAndTeam && <p className="mt-0.5 text-slate-600">{roleAndTeam}</p>}
          {!hoveredNode.isSelf && (
            <div className="mt-2 space-y-0.5 text-slate-700">
              <p>Relationship {hoveredNode.strength - 4}/5</p>
              {hoveredNode.strategicRelevance && (
                <p>Strategic relevance {titleCase(hoveredNode.strategicRelevance)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
