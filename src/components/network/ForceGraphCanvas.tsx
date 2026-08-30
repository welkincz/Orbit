"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { useReducedMotion } from "motion/react";
import { titleCase } from "@/lib/format";
import {
  createScreenSceneCache,
  didPointerDrag,
  getGraphNodeScreenRadius,
  getGraphPointerTarget,
  getSolarRayEnd,
  isPrimaryPointerActivation,
  type GraphPoint,
  type ScreenGraphLink,
  type ScreenGraphNode,
  type ScreenGraphScene,
} from "@/lib/graph-geometry";
import {
  buildGraphModel,
  getConnectedIds,
  getGraphLinkMetrics,
  type GraphLink,
  type GraphNode,
} from "@/lib/graph-model";
import {
  HOME_BEACON_ACTIVE_MS,
  HOME_BEACON_CYCLE_MS,
  getContinuousParticleCount,
  getHomeBeaconFrame,
  shouldContinuouslyRedrawGraph,
  type BeaconFrame,
} from "@/lib/graph-motion";
import {
  getFilterFocusIds,
  getGraphVisualState,
  getRelationshipFilterIds,
  type RelationshipFilter,
} from "@/lib/graph-filters";
import {
  clearGraphLayout,
  readGraphLayout,
  selectGraphLayout,
  writeGraphLayout,
  type GraphLayout,
} from "@/lib/graph-layout";
import { getGraphPalette, type GraphPalette } from "@/lib/graph-theme";
import type { ThemeName } from "@/lib/theme";
import type { ISODate, PeopleDataset } from "@/types/person";

interface ForceGraphCanvasProps {
  activeFilter: RelationshipFilter;
  currentDate: ISODate;
  dataset: PeopleDataset;
  layoutResetToken: number;
  selectedId: string | null;
  theme: ThemeName;
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

function endpointId(endpoint: GraphLink["source"] | undefined): string | undefined {
  if (typeof endpoint === "string") return endpoint;
  return endpoint?.id;
}

function drawSolarAnchor(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  scale: number,
  entranceProgress: number,
  breath: number,
  colors: GraphPalette["solarAnchor"],
) {
  const easedProgress = 1 - Math.pow(1 - entranceProgress, 3);
  const sunRadius = radius * (0.78 + easedProgress * 0.22);
  const inheritedAlpha = context.globalAlpha;
  const coronaRadius = sunRadius + (4.8 + breath * 1.1) / scale;

  context.save();

  context.beginPath();
  context.arc(x, y, coronaRadius, 0, Math.PI * 2);
  context.strokeStyle = colors.corona;
  context.lineWidth = (1.4 + breath * 0.35) / scale;
  context.globalAlpha = inheritedAlpha * (0.16 + breath * 0.1);
  context.stroke();

  context.strokeStyle = colors.ray;
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
  context.fillStyle = colors.core;
  context.fill();

  context.beginPath();
  context.arc(x, y, sunRadius * 0.64, 0, Math.PI * 2);
  context.strokeStyle = colors.innerRing;
  context.lineWidth = 1.1 / scale;
  context.stroke();
  context.restore();
}

function drawHomeWorld(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  scale: number,
  entranceProgress: number,
  beacon: BeaconFrame,
  colors: GraphPalette["homeWorld"],
) {
  const easedProgress = 1 - Math.pow(1 - entranceProgress, 3);
  const worldRadius = radius * (0.82 + easedProgress * 0.18);
  const inheritedAlpha = context.globalAlpha;
  const beaconX = x + worldRadius * 0.34;
  const beaconY = y - worldRadius * 0.38;

  context.save();

  context.beginPath();
  context.arc(x, y, worldRadius + (3.8 + beacon.intensity * 1.8) / scale, 0, Math.PI * 2);
  context.strokeStyle = colors.limb;
  context.lineWidth = (1.15 + beacon.intensity * 0.28) / scale;
  context.globalAlpha = inheritedAlpha * (0.18 + beacon.intensity * 0.08);
  context.stroke();

  context.globalAlpha = inheritedAlpha;
  context.beginPath();
  context.arc(x, y, worldRadius, 0, Math.PI * 2);
  context.fillStyle = colors.ocean;
  context.fill();
  context.strokeStyle = colors.limb;
  context.lineWidth = 1.35 / scale;
  context.stroke();

  context.save();
  context.beginPath();
  context.arc(x, y, worldRadius - 0.5 / scale, 0, Math.PI * 2);
  context.clip();
  context.beginPath();
  context.moveTo(x - worldRadius * 0.72, y - worldRadius * 0.16);
  context.bezierCurveTo(
    x - worldRadius * 0.4,
    y - worldRadius * 0.62,
    x - worldRadius * 0.02,
    y - worldRadius * 0.48,
    x + worldRadius * 0.12,
    y - worldRadius * 0.12,
  );
  context.bezierCurveTo(
    x + worldRadius * 0.28,
    y + worldRadius * 0.16,
    x - worldRadius * 0.12,
    y + worldRadius * 0.58,
    x - worldRadius * 0.54,
    y + worldRadius * 0.34,
  );
  context.closePath();
  context.fillStyle = colors.land;
  context.globalAlpha = inheritedAlpha * 0.9;
  context.fill();
  context.restore();

  context.globalAlpha = inheritedAlpha * 0.7;
  context.beginPath();
  context.arc(x, y, worldRadius * 0.66, 0, Math.PI * 2);
  context.strokeStyle = colors.innerRing;
  context.lineWidth = 0.9 / scale;
  context.stroke();

  if (beacon.active) {
    context.globalAlpha = inheritedAlpha * (0.16 + beacon.intensity * 0.22);
    context.beginPath();
    context.arc(beaconX, beaconY, (3.2 + beacon.progress * 5.4) / scale, 0, Math.PI * 2);
    context.strokeStyle = colors.beacon;
    context.lineWidth = 1 / scale;
    context.stroke();
  }

  context.globalAlpha = inheritedAlpha * 0.9;
  context.beginPath();
  context.arc(beaconX, beaconY, 1.2 / scale, 0, Math.PI * 2);
  context.fillStyle = colors.beacon;
  context.fill();
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
  theme,
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
  const sceneCacheRef = useRef(createScreenSceneCache());
  const sceneVersionRef = useRef(0);
  const draggedRef = useRef(false);
  const layoutRef = useRef<GraphLayout>({});
  const entranceStartedAtRef = useRef<number | null>(null);
  const darkSessionStartedRef = useRef(false);
  const lastActiveFilterRef = useRef(activeFilter);
  const lastLayoutResetTokenRef = useRef(layoutResetToken);
  const [size, setSize] = useState<GraphSize>({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipCoordinates, setTooltipCoordinates] = useState<TooltipCoordinates>({ x: 0, y: 0 });
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  const [beaconStartedAt, setBeaconStartedAt] = useState<number | null>(null);
  const palette = getGraphPalette(theme);
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
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (theme !== "dark") {
      darkSessionStartedRef.current = false;
      return;
    }
    if (reduceMotion || !pageVisible) return;

    let endTimer: number | undefined;
    let nextTimer: number | undefined;
    let cancelled = false;

    const beginPulse = () => {
      if (cancelled) return;
      setBeaconStartedAt(performance.now());
      endTimer = window.setTimeout(() => {
        setBeaconStartedAt(null);
        nextTimer = window.setTimeout(
          beginPulse,
          HOME_BEACON_CYCLE_MS - HOME_BEACON_ACTIVE_MS,
        );
      }, HOME_BEACON_ACTIVE_MS);
    };

    if (darkSessionStartedRef.current) {
      nextTimer = window.setTimeout(beginPulse, HOME_BEACON_CYCLE_MS);
    } else {
      darkSessionStartedRef.current = true;
      beginPulse();
    }

    return () => {
      cancelled = true;
      if (endTimer !== undefined) window.clearTimeout(endTimer);
      if (nextTimer !== undefined) window.clearTimeout(nextTimer);
    };
  }, [pageVisible, reduceMotion, theme]);

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
    // Keep the full stored layout so people who are not loaded right now keep
    // their positions the next time a drag writes the map back.
    const layout = readGraphLayout(browserStorage());
    const applicable = selectGraphLayout(layout, validIds);
    layoutRef.current = layout;
    hasFittedRef.current = false;
    sceneVersionRef.current += 1;

    graphData.nodes.forEach((node) => {
      const position = applicable[node.personId];
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
    sceneVersionRef.current += 1;
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

  const hasActiveSignal = graphData.links.some((link) => getContinuousParticleCount(
    link,
    activeFilter,
    isLinkEmphasized(link),
    reduceMotion,
  ) > 0);
  const beaconActive = theme === "dark"
    && beaconStartedAt !== null
    && !reduceMotion
    && pageVisible;
  const continuouslyRedraw = shouldContinuouslyRedrawGraph({
    hasActiveSignal,
    beaconActive,
    filterActive: activeFilter !== "all",
    pageVisible,
    reduceMotion,
  });

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
    const animated = !reduceMotion && continuouslyRedraw;
    const filterPhase = (now % 3600) / 3600;
    const filterPulse = animated ? (Math.sin(filterPhase * Math.PI * 2) + 1) / 2 : 0.5;
    const solarPhase = (now % 5600) / 5600;
    const solarBreath = animated ? (Math.sin(solarPhase * Math.PI * 2) + 1) / 2 : 0.5;
    const beaconFrame = getHomeBeaconFrame(
      beaconStartedAt === null ? HOME_BEACON_ACTIVE_MS : now - beaconStartedAt,
      reduceMotion,
      pageVisible,
    );
    const renderedRadius = radius * (hovered ? 1.08 : selected ? 1.04 : 1);
    context.save();

    if (filterMatch && !node.isSelf) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + (7.5 + filterPulse * 1.5) / scale, 0, Math.PI * 2);
      context.fillStyle = palette.filterHalo[activeFilter];
      context.globalAlpha = emphasized ? 0.09 + filterPulse * 0.06 : 0.05;
      context.fill();
    }

    context.globalAlpha = emphasized || visualState === "active" || visualState === "anchor"
      ? 1
      : palette.planet.dimmedAlpha;

    if (node.strategicRelevance) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + 3.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = palette.relevance[node.strategicRelevance];
      context.lineWidth = (selected || hovered ? 2 : 1.45) / scale;
      context.stroke();
    }

    if (hovered && !selected && !filterMatch) {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius + 5.5 / scale, 0, Math.PI * 2);
      context.strokeStyle = palette.planet.hoverStroke;
      context.lineWidth = 1.2 / scale;
      context.stroke();
    }

    if (node.visualRole === "self-anchor") {
      if (theme === "dark") {
        drawHomeWorld(
          context,
          node.x,
          node.y,
          renderedRadius,
          scale,
          entranceProgress,
          beaconFrame,
          palette.homeWorld,
        );
      } else {
        drawSolarAnchor(
          context,
          node.x,
          node.y,
          renderedRadius,
          scale,
          entranceProgress,
          solarBreath,
          palette.solarAnchor,
        );
      }
    } else {
      context.beginPath();
      context.arc(node.x, node.y, renderedRadius, 0, Math.PI * 2);
      context.fillStyle = selected ? palette.planet.selectedFill : palette.planet.fill;
      context.fill();
      context.strokeStyle = selected ? palette.planet.selectedStroke : palette.planet.stroke;
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
      const measured = context.measureText(node.name).width * scale;
      if (labelWidthsRef.current.get(node.personId) !== measured) {
        labelWidthsRef.current.set(node.personId, measured);
        sceneVersionRef.current += 1;
      }
      context.fillStyle = emphasized ? palette.label.primary : palette.label.dimmed;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(node.name, node.x + renderedRadius + 7 / scale, node.y);
    } else if (labelWidthsRef.current.get(node.personId) !== 0) {
      labelWidthsRef.current.set(node.personId, 0);
      sceneVersionRef.current += 1;
    }
    context.restore();
  }, [activeFilter, activeId, beaconStartedAt, continuouslyRedraw, dataset.selfId, hoveredId, isNodeEmphasized, matchingIds, pageVisible, palette, reduceMotion, selectedId, theme]);

  const handleEngineStop = useCallback(() => {
    if (hasFittedRef.current) return;
    hasFittedRef.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    graphRef.current?.zoomToFit(reduceMotion ? 0 : 380, 52);
  }, []);

  const invalidateScene = useCallback(() => {
    sceneVersionRef.current += 1;
  }, []);

  const buildScene = useCallback((): ScreenGraphScene => {
    const graph = graphRef.current;
    if (!graph) return { nodes: [], links: [] };

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

    return { nodes, links };
  }, [graphData.links, graphData.nodes]);

  const getPointerTargetAt = useCallback((coordinates: TooltipCoordinates) => {
    if (!graphRef.current) return { kind: "background" } as const;
    const scene = sceneCacheRef.current.read(sceneVersionRef.current, buildScene);
    return getGraphPointerTarget(coordinates, scene.nodes, scene.links);
  }, [buildScene]);

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
    invalidateScene();
    setHoveredId(null);
  }, [invalidateScene]);

  const handleEngineTick = useCallback(() => {
    invalidateScene();
  }, [invalidateScene]);

  const handleZoomEnd = useCallback(() => {
    const latestPointer = latestPointerRef.current;
    if (latestPointer) updateHoverAt(latestPointer);
  }, [updateHoverAt]);

  const handleNodeDrag = useCallback(() => {
    invalidateScene();
  }, [invalidateScene]);

  const handleNodeDragEnd = useCallback((node: NodeObject<GraphNode>) => {
    invalidateScene();
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
  }, [invalidateScene]);

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
          autoPauseRedraw={!continuouslyRedraw}
          backgroundColor={palette.canvas}
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
            if (link.kind === "introduced_by") {
              return emphasized
                ? palette.introducedLink.active
                : palette.introducedLink.dimmed;
            }
            if (activeId) {
              return emphasized
                ? palette.directLink.active
                : palette.directLink.activeDimmed;
            }
            if (activeFilter !== "all") {
              return emphasized
                ? palette.directLink.filtered
                : palette.directLink.filteredDimmed;
            }
            return palette.directLink.idle;
          }}
          linkDirectionalArrowColor={(link: LinkObject<GraphNode, GraphLink>) => isLinkEmphasized(link)
            ? palette.introducedLink.arrowActive
            : palette.introducedLink.arrowDimmed}
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
            ? palette.particle.selected
            : palette.particle.ambient}
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
          onEngineTick={handleEngineTick}
          onNodeDrag={handleNodeDrag}
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
              {hoveredNode.relationshipStrength !== undefined && (
                <p>Relationship {hoveredNode.relationshipStrength}/5</p>
              )}
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
