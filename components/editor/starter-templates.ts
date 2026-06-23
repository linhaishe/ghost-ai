import { MarkerType } from "@xyflow/react";

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorPair,
  type CanvasNodeShape,
  type CanvasShapeSize,
} from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const SHAPE_SIZES = {
  rectangle: { width: 180, height: 80 },
  pill: { width: 168, height: 64 },
  diamond: { width: 112, height: 112 },
  circle: { width: 96, height: 96 },
  cylinder: { width: 132, height: 96 },
  hexagon: { width: 136, height: 112 },
} satisfies Record<CanvasNodeShape, CanvasShapeSize>;

function color(name: CanvasNodeColorPair["name"]) {
  return NODE_COLORS.find((colorPair) => colorPair.name === name) ?? NODE_COLORS[0];
}

function node(
  id: string,
  label: string,
  shape: CanvasNodeShape,
  x: number,
  y: number,
  colorName: CanvasNodeColorPair["name"],
): CanvasNode {
  const colorPair = color(colorName);
  const size = SHAPE_SIZES[shape];

  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    data: {
      label,
      color: colorPair.color,
      textColor: colorPair.textColor,
      shape,
    },
    style: {
      width: size.width,
      height: size.height,
    },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle = "right",
  targetHandle = "left",
): CanvasEdge {
  return {
    id,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    sourceHandle,
    targetHandle,
    data: {
      label: "",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#f8fafc",
    },
    interactionWidth: 24,
    reconnectable: true,
  };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "API Gateway routes traffic to isolated services, each backed by a dedicated database and connected via a shared message bus.",
    nodes: [
      node("api-gateway", "API Gateway", "pill", 0, 180, "Blue"),
      node("message-bus", "Message Bus", "rectangle", 250, 174, "Teal"),
      node("orders-service", "Orders", "rectangle", 520, 20, "Purple"),
      node("billing-service", "Billing", "rectangle", 520, 150, "Purple"),
      node("inventory-service", "Inventory", "rectangle", 520, 280, "Purple"),
      node("notifications-service", "Notifications", "rectangle", 520, 410, "Purple"),
      node("worker", "Worker", "hexagon", 260, 350, "Purple"),
      node("orders-db", "Orders DB", "cylinder", 780, 6, "Neutral"),
      node("billing-db", "Billing DB", "cylinder", 780, 136, "Neutral"),
      node("inventory-db", "Inventory DB", "cylinder", 780, 266, "Neutral"),
      node("notifications-db", "Notify DB", "cylinder", 780, 396, "Neutral"),
    ],
    edges: [
      edge("api-to-bus", "api-gateway", "message-bus"),
      edge("bus-to-orders", "message-bus", "orders-service"),
      edge("bus-to-billing", "message-bus", "billing-service"),
      edge("bus-to-inventory", "message-bus", "inventory-service"),
      edge("bus-to-worker", "message-bus", "worker", "bottom", "top"),
      edge("worker-to-billing", "worker", "billing-service", "top", "bottom"),
      edge("worker-to-inventory", "worker", "inventory-service", "top", "bottom"),
      edge("orders-to-db", "orders-service", "orders-db"),
      edge("billing-to-db", "billing-service", "billing-db"),
      edge("inventory-to-db", "inventory-service", "inventory-db"),
      edge("notify-to-db", "notifications-service", "notifications-db"),
    ],
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "End-to-end delivery from source commit through build, test, containerisation, and staged deployment to production.",
    nodes: [
      node("source", "Source", "rectangle", 0, 180, "Blue"),
      node("build", "Build", "rectangle", 180, 188, "Teal"),
      node("test", "Test", "rectangle", 360, 188, "Green"),
      node("package", "Package", "rectangle", 540, 188, "Purple"),
      node("registry", "Registry", "cylinder", 720, 172, "Purple"),
      node("staging", "Staging", "rectangle", 900, 188, "Orange"),
      node("approval", "Approval", "diamond", 1080, 164, "Red"),
      node("production", "Production", "pill", 1260, 188, "Green"),
    ],
    edges: [
      edge("source-build", "source", "build"),
      edge("build-test", "build", "test"),
      edge("test-package", "test", "package"),
      edge("package-registry", "package", "registry"),
      edge("registry-staging", "registry", "staging"),
      edge("staging-approval", "staging", "approval"),
      edge("approval-production", "approval", "production"),
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description:
      "Producers publish events to a central bus. Independent consumers handle emails, push notifications, analytics, and error queues.",
    nodes: [
      node("web-app", "Web App", "pill", 0, 40, "Blue"),
      node("mobile-app", "Mobile App", "pill", 0, 220, "Blue"),
      node("partner-api", "Partner API", "pill", 0, 400, "Blue"),
      node("event-bus", "Event Bus", "hexagon", 330, 190, "Purple"),
      node("email-worker", "Email Worker", "rectangle", 650, 20, "Teal"),
      node("push-worker", "Push Worker", "rectangle", 650, 170, "Teal"),
      node("analytics-worker", "Analytics", "rectangle", 650, 320, "Teal"),
      node("dead-letter", "Dead Letter", "rectangle", 650, 470, "Red"),
      node("email-db", "Email DB", "cylinder", 900, 6, "Neutral"),
      node("analytics-db", "Analytics DB", "cylinder", 900, 296, "Neutral"),
    ],
    edges: [
      edge("web-to-bus", "web-app", "event-bus"),
      edge("mobile-to-bus", "mobile-app", "event-bus"),
      edge("partner-to-bus", "partner-api", "event-bus"),
      edge("bus-to-email", "event-bus", "email-worker"),
      edge("bus-to-push", "event-bus", "push-worker"),
      edge("bus-to-analytics", "event-bus", "analytics-worker"),
      edge("bus-to-dead-letter", "event-bus", "dead-letter"),
      edge("email-to-db", "email-worker", "email-db"),
      edge("analytics-to-db", "analytics-worker", "analytics-db"),
    ],
  },
];
