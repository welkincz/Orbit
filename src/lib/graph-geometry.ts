export interface GraphPoint {
  x: number;
  y: number;
}

export interface ScreenGraphNode extends GraphPoint {
  personId: string;
  radius: number;
  labelWidth: number;
}

export interface ScreenGraphLink {
  id: string;
  source: GraphPoint;
  target: GraphPoint;
  width: number;
}

export type GraphPointerTarget =
  | { kind: "node"; personId: string }
  | { kind: "link"; linkId: string }
  | { kind: "background" };

interface PointerActivation {
  button: number;
  isPrimary: boolean;
}

const NODE_HIT_PADDING = 7;
const LABEL_GAP = 7;
const LABEL_HIT_PADDING = 3;
const LABEL_HALF_HEIGHT = 9;
const LINK_HIT_PADDING = 4;

export function isPrimaryPointerActivation(event: PointerActivation): boolean {
  return event.isPrimary && event.button === 0;
}

export function didPointerDrag(start: GraphPoint, end: GraphPoint, threshold = 4): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) > threshold;
}

export function getSolarRayEnd(
  radius: number,
  gap: number,
  length: number,
  progress: number,
): number {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  return radius + gap + length * boundedProgress;
}

export function getGraphNodeScreenRadius(strength: number, isSelf: boolean): number {
  const planetRadius = Math.min(9, Math.max(5, strength));
  return isSelf ? Math.max(8, planetRadius) * 1.6 : planetRadius;
}

function hitsNode(point: GraphPoint, node: ScreenGraphNode): boolean {
  if (Math.hypot(point.x - node.x, point.y - node.y) <= node.radius + NODE_HIT_PADDING) {
    return true;
  }

  const labelStart = node.x + node.radius + LABEL_GAP;
  return point.x >= labelStart - LABEL_HIT_PADDING
    && point.x <= labelStart + node.labelWidth + LABEL_HIT_PADDING
    && point.y >= node.y - LABEL_HALF_HEIGHT
    && point.y <= node.y + LABEL_HALF_HEIGHT;
}

function distanceToSegment(point: GraphPoint, start: GraphPoint, end: GraphPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);

  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
  ));
  const closest = {
    x: start.x + projection * dx,
    y: start.y + projection * dy,
  };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

function hitsLink(point: GraphPoint, link: ScreenGraphLink): boolean {
  return distanceToSegment(point, link.source, link.target)
    <= Math.max(5, link.width / 2 + LINK_HIT_PADDING);
}

export function getGraphPointerTarget(
  point: GraphPoint,
  nodes: ScreenGraphNode[],
  links: ScreenGraphLink[],
): GraphPointerTarget {
  const node = nodes.find((candidate) => hitsNode(point, candidate));
  if (node) return { kind: "node", personId: node.personId };

  const link = links.find((candidate) => hitsLink(point, candidate));
  if (link) return { kind: "link", linkId: link.id };

  return { kind: "background" };
}
