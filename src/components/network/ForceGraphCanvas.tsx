"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import {
  didPointerDrag,
  getGraphPointerTarget,
  isPrimaryPointerActivation,
  type GraphPoint,
  type ScreenGraphLink,
  type ScreenGraphNode,
} from "@/lib/graph-geometry";
import {
  buildGraphModel,
  getConnectedIds,
  getGraphLinkMetrics,
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
  high: "#b65f43",
  medium: "#748468",
  low: "#969895",
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
  const latestPointerRef = useRef<TooltipCoordinates | null>(null);
  const labelWidthsRef = useRef(new Map<string, number>());
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
    linkForce?.distance?.((link: GraphLink) => getGraphLinkMetrics(link).distance);
    linkForce?.strength?.((link: GraphLink) => getGraphLinkMetrics(link).forceStrength);
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
      context.strokeStyle = selected ? "#315f58" : "#6b6e70";
      context.lineWidth = 1.5 / scale;
      context.stroke();
    }

    if (node.isSelf) {
      drawDiamond(context, node.x, node.y, radius, 2 / scale);
      context.fillStyle = "#1b1d1e";
      context.fill();
    } else {
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fillStyle = selected ? "#315f58" : "#faf9f6";
      context.fill();
      context.strokeStyle = selected ? "#315f58" : "#6b6e70";
      context.lineWidth = 1.4 / scale;
      context.stroke();
    }

    const fontSize = 11 / scale;
    context.font = `${node.isSelf ? 700 : 590} ${fontSize}px ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    labelWidthsRef.current.set(node.personId, context.measureText(node.name).width * scale);
    context.fillStyle = emphasized ? "#1b1d1e" : "#929594";
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

  const getPointerTargetAt = useCallback((coordinates: TooltipCoordinates) => {
    const graph = graphRef.current;
    if (!graph) return { kind: "background" } as const;

    const nodes = graphData.nodes.flatMap((node): ScreenGraphNode[] => {
      if (node.x === undefined || node.y === undefined) return [];
      const screen = graph.graph2ScreenCoords(node.x, node.y);
      return [{
        personId: node.personId,
        x: screen.x,
        y: screen.y,
        radius: Math.min(9, Math.max(5, node.strength)),
        labelWidth: labelWidthsRef.current.get(node.personId) ?? node.name.length * 6.2,
      }];
    });
    const nodesById = new Map(nodes.map((node) => [node.personId, node]));
    const links = graphData.links.flatMap((link): ScreenGraphLink[] => {
      const source = nodesById.get(endpointId(link.source) ?? "");
      const target = nodesById.get(endpointId(link.target) ?? "");
      if (!source || !target) return [];
      return [{
        id: link.id,
        source: { x: source.x, y: source.y },
        target: { x: target.x, y: target.y },
        width: getGraphLinkMetrics(link).width,
      }];
    });

    return getGraphPointerTarget(coordinates, nodes, links);
  }, [graphData.links, graphData.nodes]);

  const updateHoverAt = useCallback((coordinates: GraphPoint) => {
    const target = getPointerTargetAt(coordinates);
    setHoveredId(target.kind === "node" ? target.personId : null);
    if (target.kind === "node") setTooltipCoordinates(coordinates);
  }, [getPointerTargetAt]);

  const getPointerCoordinates = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const coordinates = getPointerCoordinates(event);
    latestPointerRef.current = coordinates;
    const pointerDown = pointerDownRef.current;
    if (pointerDown && didPointerDrag(pointerDown, coordinates)) {
      draggedRef.current = true;
    }
    updateHoverAt(coordinates);
  }, [getPointerCoordinates, updateHoverAt]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointerActivation(event)) {
      pointerDownRef.current = null;
      draggedRef.current = false;
      return;
    }
    const coordinates = getPointerCoordinates(event);
    const pointerDown = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!pointerDown || draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    const target = getPointerTargetAt(coordinates);
    if (target.kind === "node") onSelect(target.personId);
    if (target.kind === "background") onSelect(null);
  }, [getPointerCoordinates, getPointerTargetAt, onSelect]);

  const handleZoom = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleZoomEnd = useCallback(() => {
    const latestPointer = latestPointerRef.current;
    if (latestPointer) updateHoverAt(latestPointer);
  }, [updateHoverAt]);

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
      className="orbit-graph-canvas"
      onPointerDownCapture={(event) => {
        draggedRef.current = false;
        pointerDownRef.current = isPrimaryPointerActivation(event)
          ? getPointerCoordinates(event)
          : null;
      }}
      onPointerLeave={() => {
        pointerDownRef.current = null;
        latestPointerRef.current = null;
        setHoveredId(null);
      }}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      ref={containerRef}
    >
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D<GraphNode, GraphLink>
          autoPauseRedraw
          backgroundColor="#f4f3ef"
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
            if (link.kind === "introduced_by") return emphasized ? "rgba(116, 132, 104, 0.72)" : "rgba(116, 132, 104, 0.12)";
            if (activeId) return emphasized ? "rgba(49, 95, 88, 0.62)" : "rgba(107, 110, 112, 0.1)";
            return "rgba(107, 110, 112, 0.52)";
          }}
          linkDirectionalArrowColor={(link: LinkObject<GraphNode, GraphLink>) => isLinkEmphasized(link)
            ? "rgba(116, 132, 104, 0.82)"
            : "rgba(116, 132, 104, 0.14)"}
          linkDirectionalArrowLength={(link: LinkObject<GraphNode, GraphLink>) => link.directed ? 6 : 0}
          linkDirectionalArrowRelPos={0.72}
          linkLineDash={(link: LinkObject<GraphNode, GraphLink>) => link.kind === "introduced_by" ? [5, 4] : null}
          linkWidth={(link: LinkObject<GraphNode, GraphLink>) => getGraphLinkMetrics(link).width}
          maxZoom={4.5}
          minZoom={0.35}
          nodeCanvasObject={paintNode}
          nodeLabel={() => ""}
          onEngineStop={handleEngineStop}
          onZoom={handleZoom}
          onZoomEnd={handleZoomEnd}
          ref={graphRef}
          width={size.width}
        />
      )}

      {hoveredNode && (
        <div
          className="graph-tooltip"
          role="tooltip"
          style={{ transform: `translate3d(${tooltipX}px, ${tooltipY}px, 0)` }}
        >
          <p className="graph-tooltip__name">{hoveredNode.name}</p>
          {roleAndTeam && <p className="graph-tooltip__context">{roleAndTeam}</p>}
          {!hoveredNode.isSelf && (
            <div className="graph-tooltip__meta">
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
