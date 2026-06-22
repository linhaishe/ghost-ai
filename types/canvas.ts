import type { Edge, Node } from "@xyflow/react";

export const CANVAS_NODE_TYPE = "canvasNode";
export const CANVAS_EDGE_TYPE = "canvasEdge";
export const CANVAS_SHAPE_DRAG_TYPE = "application/ghost-ai-canvas-shape";
export const DEFAULT_CANVAS_NODE_COLOR = "#00c8d4";

export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon";

export interface CanvasShapeSize {
  width: number;
  height: number;
}

export interface CanvasShapeDragPayload {
  shape: CanvasNodeShape;
  size: CanvasShapeSize;
}

export const CANVAS_SHAPE_DEFAULT_SIZES: Record<CanvasNodeShape, CanvasShapeSize> = {
  rectangle: { width: 180, height: 96 },
  diamond: { width: 152, height: 152 },
  circle: { width: 128, height: 128 },
  pill: { width: 180, height: 84 },
  cylinder: { width: 160, height: 112 },
  hexagon: { width: 168, height: 112 },
};

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  shape: CanvasNodeShape;
}

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

export type CanvasEdge = Edge<Record<string, never>, typeof CANVAS_EDGE_TYPE>;
