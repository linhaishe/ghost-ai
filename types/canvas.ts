import type { Edge, Node } from "@xyflow/react";

export const CANVAS_NODE_TYPE = "canvasNode";
export const CANVAS_EDGE_TYPE = "canvasEdge";
export const CANVAS_SHAPE_DRAG_TYPE = "application/ghost-ai-canvas-shape";
export const DEFAULT_CANVAS_NODE_COLOR = "#1F1F1F";
export const DEFAULT_CANVAS_NODE_TEXT_COLOR = "#EDEDED";
export const CANVAS_NODE_MIN_SIZE: CanvasShapeSize = { width: 96, height: 56 };

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

export interface CanvasNodeColorPair {
  name: string;
  color: string;
  textColor: string;
}

export const NODE_COLORS = [
  { name: "Neutral", color: "#1F1F1F", textColor: "#EDEDED" },
  { name: "Blue", color: "#10233D", textColor: "#52A8FF" },
  { name: "Purple", color: "#2E1938", textColor: "#BF7AF0" },
  { name: "Orange", color: "#331B00", textColor: "#FF990A" },
  { name: "Red", color: "#3C1618", textColor: "#FF6166" },
  { name: "Pink", color: "#3A1726", textColor: "#F75F8F" },
  { name: "Green", color: "#0F2E18", textColor: "#62C073" },
  { name: "Teal", color: "#062822", textColor: "#0AC7B4" },
] satisfies CanvasNodeColorPair[];

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
  textColor: string;
  shape: CanvasNodeShape;
}

export interface CanvasEdgeData extends Record<string, unknown> {
  label: string;
}

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
