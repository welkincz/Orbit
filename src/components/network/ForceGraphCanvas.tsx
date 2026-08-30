"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { useReducedMotion } from "motion/react";
import {
  didPointerDrag,
  getGraphNodeScreenRadius,
  getGraphPointerTarget,
  getSolarRayEnd,
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
import { getContinuousParticleCount } from "@/lib/graph-motion";
import {
  FILTER_HALO_COLOR,
  getFilterFocusIds,
  getGraphVisualState,
  getRelationshipFilterIds,
  type RelationshipFilter,
} from "@/lib/graph-filters";
import {
  clearGraphLayout,
  readGraphLayout,
  writeGraphLayout,
  type GraphLayout,
} from "@/lib/graph-layout";
import type { ISODate, PeopleDataset, StrategicRelevance } from "@/types/person";

interface ForceGraphCanvasProps {
  activeFilter: RelationshipFilter;
  currentDate: ISODate;
  dataset: PeopleDataset;
  layoutResetToken: number;
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
const SOLAR_ENTRANCE_DURATION_MS = 650;
const SOLAR_GOLD = "#bd9144";

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

function drawSolarAnchor(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  scale: number,
  entranceProgress: number,
  breath: number,
) {
  const easedProgress = 1 - Math.pow(1 - entranceProgress, 3);
  const sunRadius = radius * (0.78 + easedProgress * 0.22);
  const inheritedAlpha = context.globalAlpha;
  const coronaRadius = sunRadius + (4.8 + breath * 1.1) / scale;

  context.save();

  context.beginPath();
  context.arc(x, y, coronaRadius, 0, Math.PI * 2);
  context.strokeStyle = SOLAR_GOLD;
  context.lineWidth = (1.4 + breath * 0.35) / scale;
  context.globalAlpha = inheritedAlpha * (0.16 + breath * 0.1);
  context.stroke();

  context.strokeStyle = SOLAR_GOLD;
  context.lineCap = "round";
  context.lineWidth = 1.3 / scale;
  context.globalAlpha = inheritedAlpha * (0.5 + easedProgress * 0.42);

  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const rayStart = sunRadius + 3.2 / scale;
    const rayEnd = getSolarRayEnd(
      sunRadius,
      3.2 / scale,
      (index % 2 === 0 ? 7.2 + breath * 0.7 : 5.2 + breath * 0.5) / scale,
      easedProgress,
    );
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * rayStart, y + Math.sin(angle) * rayStart);
    context.lineTo(x + Math.cos(angle) * rayEnd, y + Math.sin(angle) * rayEnd);
    context.stroke();
  }

  context.beginPath();
  context.arc(x, y, sunRadius + 2.1 / scale, 0, Math.PI * 2);
  context.lineWidth = 1.55 / scale;
  context.stroke();

  context.globalAlpha = inheritedAlpha;
  context.beginPath();
  context.arc(x, y, sunRadius, 0, Math.PI * 2);
  context.fillStyle = "#1b1d1e";
  context.fill();

  context.beginPath();
  context.arc(x, y, sunRadius * 0.64, 0, Math.PI * 2);
  context.strokeStyle = "rgba(243, 224, 177, 0.74)";
  context.lineWidth = 1.1 / scale;
  context.stroke();
  context.restore();
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ForceGraphCanvas({
  activeFilter,
  currentDate,
  dataset,
  layoutResetToken,
  selectedId,
  onSelect,
}: ForceGraphCanvasProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const forcesConfiguredRef = useRef(false);
  const hasFittedRef = useRef(false);
  const pointerDownRef = useRef<TooltipCoordinates | null>(null);
  const latestPointerRef = useRef<TooltipCoordinates | null>(null);
  const labelWidthsRef = useRef(new Map<string, number>());
  const draggedRef = useRef(false);
  const layoutRef = useRef<GraphLayout>({});
  const entranceStartedAtRef = useRef<number | null>(null);
  const lastActiveFilterRef = useRef(activeFilter);
  const lastLayoutResetTokenRef = useRef(layoutResetToken);
  const [size, setSize] = useState<GraphSize>({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipCoordinates, setTooltipCoordinates] = useState<TooltipCoordinates>({ x: 0, y: 0 });
  const graphData = useMemo(() => buildGraphModel(dataset), [dataset]);
  const matchingIds = useMemo(
    () => getRelationshipFilterIds(dataset.people, currentDate, activeFilter),
    [activeFilter, currentDate, dataset.people],
  );
  const activeId = selectedId ?? hoveredId;
  const connectedIds = useMemo(
    () => activeId ? getConnectedIds(graphData.links, activeId) : null,
    [activeId, graphData.links],
  );
  const hoveredNode = hoveredId
    ? graphData.nodes.find(({ personId }) => personId === hoveredId)
    : undefined;

  useEffect(() => {
    if (!selectedId || reduceMotion) return;
    const graph = graphRef.current;
    if (!graph) return;

    const motionLinks = graphData.links.filter((link) => {
      if (link.motion !== "selection-direction") return false;
      return endpointId(link.source) === selectedId || endpointId(link.target) === selectedId;
    });
    if (motionLinks.length === 0) return;

    const animationFrame = window.requestAnimationFrame(() => {
      motionLinks.forEach((link) => graph.emitParticle(link));
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [graphData.links, reduceMotion, selectedId]);

  useEffect(() => {
    if (lastActiveFilterRef.current === activeFilter || size.width === 0 || size.height === 0) return;
    lastActiveFilterRef.current = activeFilter;
    const graph = graphRef.current;
    if (!graph) return;

    const focusIds = getFilterFocusIds(dataset.selfId, activeFilter, matchingIds);
    const animationFrame = window.requestAnimationFrame(() => {
      graph.zoomToFit(
        reduceMotion ? 0 : 520,
        activeFilter === "all" ? 58 : 108,
        focusIds ? (node) => focusIds.has(node.personId) : undefined,
      );
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeFilter, dataset.selfId, matchingIds, reduceMotion, size.height, size.width]);

  useLayoutEffect(() => {
    const validIds = new Set(graphData.nodes.map(({ personId }) => personId));
    const layout = readGraphLayout(browserStorage(), validIds);
    layoutRef.current = layout;
    hasFittedRef.current = false;

    graphData.nodes.forEach((node) => {
      const position = layout[node.personId];
      if (!position) return;
      node.x = position.x;
      node.y = position.y;
      node.fx = position.x;
      node.fy = position.y;
    });
  }, [graphData]);

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

  useEffect(() => {
    if (lastLayoutResetTokenRef.current === layoutResetToken) return;
    lastLayoutResetTokenRef.current = layoutResetToken;
    layoutRef.current = {};
    clearGraphLayout(browserStorage());
    graphData.nodes.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
    });
    hasFittedRef.current = false;
    graphRef.current?.d3ReheatSimulation();
  }, [graphData.nodes, layoutResetToken]);

  const isNodeEmphasized = useCallback((node: GraphNode) => {
    if (node.isSelf) return true;
    if (node.personId === selectedId || node.personId === hoveredId) return true;
    const relationshipMatch = connectedIds === null || connectedIds.has(node.personId);
    const visualState = getGraphVisualState(
      node.personId,
      dataset.selfId,
      activeFilter,
      matchingIds,
      activeId,
    );
    return relationshipMatch && visualState !== "dimmed";
  }, [activeFilter, activeId, connectedIds, dataset.selfId, hoveredId, matchingIds, selectedId]);

  const isLinkEmphasized = useCallback((link: GraphLink) => {
    const sourceId = endpointId(link.source);
    const targetId = endpointId(link.target);
    if (sourceId === undefined || targetId === undefined) return false;
    const relationshipMatch = connectedIds === null || (
      connectedIds.has(sourceId) && connectedIds.has(targetId)
    );
    const filterMatch = activeFilter === "all"
      || matchingIds.has(sourceId)
      || matchingIds.has(targetId);
    return relationshipMatch && filterMatch;
  }, [activeFilter, connectedIds, matchingIds]);

  const isSelectedIntroduction = useCallback((link: GraphLink) => {
    if (!selectedId || link.kind !== "introduced_by") return false;
    return endpointId(link.source) === selectedId || endpointId(link.target) === selectedId;
  }, [selectedId]);

  const paintNode = useCallback((node: NodeObject<GraphNode>, context: CanvasRenderingContext2D, globalScale: number) => {
    if (node.x === undefined || node.y === undefined) return;

    const emphasized = isNodeEmphasized(node);
    const selected = node.personId === selectedId;
    const hovered = node.personId === hoveredId;
    const visualState = getGraphVisualState(
      node.personId,
      dataset.selfId,
      activeFilter,
      matchingIds,
      activeId,
    );
    const filterMatch = activeFilter !== "all" && matchingIds.has(node.personId);
    const scale = Math.max(globalScale, 0.001);
    const radius = getGraphNodeScreenRadius(node.strength, node.isSelf) / scale;
    const now = performance.now();
    entranceStartedAtRef.current ??= now;
    const entranceProgress = reduceMotion
      ? 1
      : Math.min(1, (now - entranceStartedAtRef.current) / SOLAR_ENTRANCE_DURATION_MS);
    const filterPhase = (now % 3600) / 3600;
    const filterPulse = reduceMotion ? 0.5 : (Math.sin(filterPhase * Math.PI * 2) + 1) / 2;
    const solarPhase = (now % 5600) / 5600;
    const solarBreath = reduceMotion ? 0.5 : (Math.sin(solarPhase * Math.PI * 2) + 1) / 2;
    const renderedRadius = radius * (hovered ? 1.08 : selected ? 1.04 : 1);
    context.save();

    if (filterMatch && !node.isSelf) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + (7.5 + filterPulse * 1.5) / scale, 0, Math.PI * 2);
      context.fillStyle = FILTER_HALO_COLOR[activeFilter];
      context.globalAlpha = emphasized ? 0.09 + filterPulse * 0.06 : 0.05;
      context.fill();
    }

    context.globalAlpha = emphasized || visualState === "active" || visualState === "anchor" ? 1 : 0.24;

    if (node.strategicRelevance) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + 3.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = relevanceColor[node.strategicRelevance];
      context.lineWidth = (selected || hovered ? 2 : 1.45) / scale;
      context.stroke();
    }

    if (hovered && !selected && !filterMatch) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + 5.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = "#6b6e70";
      context.lineWidth = 1.2 / scale;
      context.stroke();
    }

    if (node.visualRole === "solar-anchor") {
      drawSolarAnchor(
        context,
        node.x,
        node.y,
        renderedRadius,
        scale,
        entranceProgress,
        solarBreath,
      );
    } else {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius, 0, Math.PI * 2);
      context.fillStyle = selected ? "#315f58" : "#faf9f6";
      context.fill();
      context.strokeStyle = selected ? "#315f58" : "#6b6e70";
      context.lineWidth = 1.4 / scale;
      context.stroke();
    }

    const fontSize = 11 / scale;
    context.font = `${node.isSelf ? 700 : 590} ${fontSize}px ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const showLabel = node.isSelf
      || selected
      || hovered
      || visualState === "matching"
      || (activeFilter === "all" ? globalScale >= 0.65 : globalScale >= 1.25);
    if (showLabel) {
      labelWidthsRef.current.set(node.personId, context.measureText(node.name).width * scale);
      context.fillStyle = emphasized ? "#1b1d1e" : "#929594";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(node.name, node.x + renderedRadius + 7 / scale, node.y);
    } else {
      labelWidthsRef.current.set(node.personId, 0);
    }
    context.restore();
  }, [activeFilter, activeId, dataset.selfId, hoveredId, isNodeEmphasized, matchingIds, reduceMotion, selectedId]);

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
        radius: getGraphNodeScreenRadius(node.strength, node.isSelf),
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

  const handleNodeDragEnd = useCallback((node: NodeObject<GraphNode>) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const x = node.x!;
    const y = node.y!;
    node.fx = x;
    node.fy = y;
    layoutRef.current = {
      ...layoutRef.current,
      [node.personId]: { x, y },
    };
    writeGraphLayout(browserStorage(), layoutRef.current);
  }, []);

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
          autoPauseRedraw={activeFilter === "all" || reduceMotion}
          backgroundColor="#f4f3ef"
          cooldownTicks={120}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.34}
          enableNodeDrag
          enablePanInteraction
          enablePointerInteraction
          enableZoomInteraction
          graphData={graphData}
          height={size.height}
          linkColor={(link: LinkObject<GraphNode, GraphLink>) => {
            const emphasized = isLinkEmphasized(link);
            if (link.kind === "introduced_by") return emphasized ? "rgba(116, 132, 104, 0.72)" : "rgba(116, 132, 104, 0.07)";
            if (activeId) return emphasized ? "rgba(49, 95, 88, 0.62)" : "rgba(107, 110, 112, 0.06)";
            if (activeFilter !== "all") return emphasized ? "rgba(49, 95, 88, 0.5)" : "rgba(107, 110, 112, 0.07)";
            return "rgba(107, 110, 112, 0.52)";
          }}
          linkDirectionalArrowColor={(link: LinkObject<GraphNode, GraphLink>) => isLinkEmphasized(link)
            ? "rgba(116, 132, 104, 0.82)"
            : "rgba(116, 132, 104, 0.07)"}
          linkDirectionalArrowLength={(link: LinkObject<GraphNode, GraphLink>) => link.directed ? 6 : 0}
          linkDirectionalArrowRelPos={0.72}
          linkLineDash={(link: LinkObject<GraphNode, GraphLink>) => link.kind === "introduced_by" ? [5, 4] : null}
          linkDirectionalParticles={(link: LinkObject<GraphNode, GraphLink>) => getContinuousParticleCount(
            link,
            activeFilter,
            isLinkEmphasized(link),
            reduceMotion,
          )}
          linkDirectionalParticleColor={(link: LinkObject<GraphNode, GraphLink>) => isSelectedIntroduction(link)
            ? "rgba(190, 143, 59, 0.98)"
            : "rgba(91, 116, 98, 0.96)"}
          linkDirectionalParticleSpeed={(link: LinkObject<GraphNode, GraphLink>) => {
            if (link.motion !== "selection-direction" || reduceMotion) return 0;
            return isSelectedIntroduction(link) ? 0.012 : 0.0035;
          }}
          linkDirectionalParticleWidth={(link: LinkObject<GraphNode, GraphLink>) => {
            if (link.motion !== "selection-direction" || reduceMotion) return 0;
            return isSelectedIntroduction(link) ? 3.2 : 2.6;
          }}
          linkWidth={(link: LinkObject<GraphNode, GraphLink>) => getGraphLinkMetrics(link).width}
          maxZoom={4.5}
          minZoom={0.35}
          nodeCanvasObject={paintNode}
          nodeLabel={() => ""}
          onEngineStop={handleEngineStop}
          onNodeDragEnd={handleNodeDragEnd}
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
