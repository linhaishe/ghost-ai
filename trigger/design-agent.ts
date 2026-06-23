import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { logger, task } from "@trigger.dev/sdk/v3";
import { generateObject, jsonSchema } from "ai";
import { ProxyAgent, fetch as undiciFetch } from "undici";

import { getLiveblocksClient } from "@/lib/liveblocks";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  CANVAS_SHAPE_DEFAULT_SIZES,
  DEFAULT_CANVAS_NODE_COLOR,
  DEFAULT_CANVAS_NODE_TEXT_COLOR,
  NODE_COLORS,
  type AiStatusKind,
  type AiStatusMessage,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas";

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

type LiveblocksClient = ReturnType<typeof getLiveblocksClient>;
type CanvasHandle = "top" | "right" | "bottom" | "left";

type DesignAction =
  | {
      type: "addNode";
      id: string;
      label: string;
      shape: CanvasNodeShape;
      x: number;
      y: number;
      width?: number;
      height?: number;
      colorName?: string;
    }
  | {
      type: "moveNode";
      id: string;
      x: number;
      y: number;
    }
  | {
      type: "resizeNode";
      id: string;
      width: number;
      height: number;
    }
  | {
      type: "updateNodeData";
      id: string;
      label?: string;
      shape?: CanvasNodeShape;
      colorName?: string;
    }
  | {
      type: "deleteNode";
      id: string;
    }
  | {
      type: "addEdge";
      id: string;
      source: string;
      target: string;
      sourceHandle?: CanvasHandle;
      targetHandle?: CanvasHandle;
      label?: string;
    }
  | {
      type: "deleteEdge";
      id: string;
    };

interface DesignPlan {
  summary: string;
  actions: DesignAction[];
}

const AI_USER_ID = "ghost-ai-agent";
const AI_USER_NAME = "Ghost AI";
const AI_CURSOR_COLOR = "#8b82ff";
const MAX_STATUS_MESSAGES = 8;
const MAX_NODE_WIDTH = 280;
const MAX_NODE_HEIGHT = 180;
const CANVAS_HANDLE_VALUES = ["top", "right", "bottom", "left"] as const;
const CANVAS_SHAPE_VALUES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const satisfies CanvasNodeShape[];

function optionalEnv(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue || undefined;
}

function getGoogleProxyUrl() {
  return (
    optionalEnv(process.env.GOOGLE_GENERATIVE_AI_PROXY_URL) ??
    optionalEnv(process.env.HTTPS_PROXY) ??
    optionalEnv(process.env.https_proxy) ??
    optionalEnv(process.env.HTTP_PROXY) ??
    optionalEnv(process.env.http_proxy) ??
    optionalEnv(process.env.ALL_PROXY) ??
    optionalEnv(process.env.all_proxy)
  );
}

function getGoogleFetch() {
  const proxyUrl = getGoogleProxyUrl();

  if (!proxyUrl) {
    return undefined;
  }

  const dispatcher = new ProxyAgent(proxyUrl);

  return (((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...init,
      dispatcher,
    } as Parameters<typeof undiciFetch>[1])) as unknown) as typeof fetch;
}

const designPlanSchema = jsonSchema<DesignPlan>({
  type: "object",
  additionalProperties: false,
  required: ["summary", "actions"],
  properties: {
    summary: {
      type: "string",
      description: "A short human-readable summary of the design updates.",
    },
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 24,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id", "label", "shape", "x", "y"],
            properties: {
              type: { const: "addNode" },
              id: { type: "string" },
              label: { type: "string" },
              shape: { enum: CANVAS_SHAPE_VALUES },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              colorName: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id", "x", "y"],
            properties: {
              type: { const: "moveNode" },
              id: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id", "width", "height"],
            properties: {
              type: { const: "resizeNode" },
              id: { type: "string" },
              width: { type: "number" },
              height: { type: "number" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id"],
            properties: {
              type: { const: "updateNodeData" },
              id: { type: "string" },
              label: { type: "string" },
              shape: { enum: CANVAS_SHAPE_VALUES },
              colorName: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id"],
            properties: {
              type: { const: "deleteNode" },
              id: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id", "source", "target"],
            properties: {
              type: { const: "addEdge" },
              id: { type: "string" },
              source: { type: "string" },
              target: { type: "string" },
              sourceHandle: { enum: [...CANVAS_HANDLE_VALUES] },
              targetHandle: { enum: [...CANVAS_HANDLE_VALUES] },
              label: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "id"],
            properties: {
              type: { const: "deleteEdge" },
              id: { type: "string" },
            },
          },
        ],
      },
    },
  },
});

function getGoogleModel() {
  const google = createGoogleGenerativeAI({
    apiKey:
      optionalEnv(process.env.GEMINI_API_KEY) ??
      optionalEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    // Optional proxy/gateway endpoint for local networks that cannot reach Google directly.
    baseURL: optionalEnv(process.env.GOOGLE_GENERATIVE_AI_BASE_URL),
    fetch: getGoogleFetch(),
  });

  return google("gemini-2.5-flash");
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function createStatusMessage(kind: AiStatusKind, message: string): AiStatusMessage {
  return {
    id: `ai-status-${Date.now()}-${crypto.randomUUID()}`,
    kind,
    message,
    createdAt: new Date().toISOString(),
  };
}

async function appendStatus(
  client: LiveblocksClient,
  roomId: string,
  kind: AiStatusKind,
  message: string,
) {
  const statusMessage = createStatusMessage(kind, message);

  await client.mutateStorage(roomId, ({ root }) => {
    const current = root.get("aiStatus") ?? [];
    const nextMessages = [...current, statusMessage].slice(-MAX_STATUS_MESSAGES);

    root.set("aiStatus", nextMessages);
  });
}

async function setAiPresence(
  client: LiveblocksClient,
  roomId: string,
  presence: { cursor: { x: number; y: number } | null; thinking: boolean },
  ttl = 60,
) {
  await client.setPresence(roomId, {
    userId: AI_USER_ID,
    data: presence,
    userInfo: {
      name: AI_USER_NAME,
      avatarUrl: null,
      cursorColor: AI_CURSOR_COLOR,
    },
    ttl,
  });
}

function summarizeCanvas(nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.data.label,
      shape: node.data.shape,
      position: node.position,
      size: {
        width: Number(node.style?.width ?? CANVAS_SHAPE_DEFAULT_SIZES[node.data.shape].width),
        height: Number(node.style?.height ?? CANVAS_SHAPE_DEFAULT_SIZES[node.data.shape].height),
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? "",
    })),
  };
}

async function getCurrentCanvas(client: LiveblocksClient, roomId: string) {
  let snapshot = {
    nodes: [] as CanvasNode[],
    edges: [] as CanvasEdge[],
  };

  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    snapshot = {
      nodes: [...flow.nodes],
      edges: [...flow.edges],
    };
  });

  return snapshot;
}

function buildPrompt(payload: DesignAgentPayload, snapshot: Awaited<ReturnType<typeof getCurrentCanvas>>) {
  return [
    `User prompt: ${payload.prompt}`,
    "",
    "Current canvas snapshot:",
    JSON.stringify(summarizeCanvas(snapshot.nodes, snapshot.edges), null, 2),
    "",
    "Design rules:",
    `- Allowed node shapes: ${CANVAS_SHAPE_VALUES.join(", ")}.`,
    `- Allowed color palette names: ${NODE_COLORS.map((color) => color.name).join(", ")}.`,
    "- Prefer 4 to 8 nodes for a new architecture unless the prompt clearly needs fewer.",
    "- Keep spacing readable: use about 220 to 280 px horizontal spacing and 140 to 180 px vertical spacing.",
    "- Use cylinders only for databases/storage, diamonds for decision/routing concepts, and circles sparingly for external actors.",
    "- Use concise labels. Avoid duplicate node IDs.",
    "- If the canvas is empty, create an initial architecture. If it already has content, extend or refine it instead of replacing everything.",
    "- Return only actions that are needed to update the shared React Flow canvas.",
  ].join("\n");
}

async function planDesign(payload: DesignAgentPayload, snapshot: Awaited<ReturnType<typeof getCurrentCanvas>>) {
  const result = await generateObject({
    model: getGoogleModel(),
    schema: designPlanSchema,
    schemaName: "GhostAIDesignPlan",
    schemaDescription: "A structured list of React Flow canvas actions for a collaborative system design diagram.",
    system:
      "You are Ghost AI, a senior system architecture designer. Convert user requests into clear canvas updates for a collaborative React Flow diagram. Use only the provided action schema.",
    prompt: buildPrompt(payload, snapshot),
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  return result.object;
}

function slugifyId(value: string, fallback: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || fallback;
}

function getUniqueId(baseId: string, existingIds: Set<string>) {
  let candidate = slugifyId(baseId, "ai-node");
  let suffix = 1;

  while (existingIds.has(candidate)) {
    candidate = `${slugifyId(baseId, "ai-node")}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(candidate);
  return candidate;
}

function getColorPair(colorName?: string) {
  if (!colorName) {
    return NODE_COLORS[0];
  }

  return (
    NODE_COLORS.find((color) => color.name.toLowerCase() === colorName.toLowerCase()) ??
    NODE_COLORS[0]
  );
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function normalizeShape(shape: CanvasNodeShape | undefined): CanvasNodeShape {
  return shape && CANVAS_SHAPE_VALUES.includes(shape) ? shape : "rectangle";
}

function normalizeHandle(handle: CanvasHandle | undefined) {
  return handle && CANVAS_HANDLE_VALUES.includes(handle) ? handle : undefined;
}

function getFallbackPlan(prompt: string): DesignPlan {
  return {
    summary: "Created a starter architecture from the prompt.",
    actions: [
      {
        type: "addNode",
        id: "client",
        label: "Client",
        shape: "circle",
        x: 0,
        y: 120,
        colorName: "Blue",
      },
      {
        type: "addNode",
        id: "api",
        label: "API Service",
        shape: "rectangle",
        x: 260,
        y: 120,
        colorName: "Purple",
      },
      {
        type: "addNode",
        id: "data-store",
        label: prompt.toLowerCase().includes("event") ? "Event Store" : "Database",
        shape: "cylinder",
        x: 520,
        y: 120,
        colorName: "Green",
      },
      {
        type: "addEdge",
        id: "client-to-api",
        source: "client",
        target: "api",
        sourceHandle: "right",
        targetHandle: "left",
        label: "request",
      },
      {
        type: "addEdge",
        id: "api-to-data-store",
        source: "api",
        target: "data-store",
        sourceHandle: "right",
        targetHandle: "left",
        label: "persist",
      },
    ],
  };
}

function normalizePlan(plan: DesignPlan, prompt: string) {
  if (!Array.isArray(plan.actions) || plan.actions.length === 0) {
    return getFallbackPlan(prompt);
  }

  return {
    summary: plan.summary || "Updated the architecture canvas.",
    actions: plan.actions.slice(0, 24),
  };
}

async function applyDesignPlan(
  client: LiveblocksClient,
  roomId: string,
  plan: DesignPlan,
) {
  await mutateFlow<CanvasNode, CanvasEdge>({ client, roomId }, (flow) => {
    const nodeIdMap = new Map<string, string>();
    const existingNodeIds = new Set(flow.nodes.map((node) => node.id));
    const existingEdgeIds = new Set(flow.edges.map((edge) => edge.id));

    for (const action of plan.actions) {
      if (action.type === "deleteEdge") {
        flow.removeEdge(action.id);
        existingEdgeIds.delete(action.id);
        continue;
      }

      if (action.type === "deleteNode") {
        const nodeId = nodeIdMap.get(action.id) ?? action.id;
        const connectedEdgeIds = flow.edges
          .filter((edge) => edge.source === nodeId || edge.target === nodeId)
          .map((edge) => edge.id);

        flow.removeEdges(connectedEdgeIds);
        flow.removeNode(nodeId);
        existingNodeIds.delete(nodeId);
        continue;
      }

      if (action.type === "addNode") {
        const shape = normalizeShape(action.shape);
        const defaultSize = CANVAS_SHAPE_DEFAULT_SIZES[shape];
        const colorPair = getColorPair(action.colorName);
        const width = clampNumber(action.width ?? defaultSize.width, 96, MAX_NODE_WIDTH);
        const height = clampNumber(action.height ?? defaultSize.height, 56, MAX_NODE_HEIGHT);
        const nodeId = getUniqueId(action.id || action.label, existingNodeIds);

        nodeIdMap.set(action.id, nodeId);
        flow.addNode({
          id: nodeId,
          type: CANVAS_NODE_TYPE,
          position: {
            x: Math.round(action.x),
            y: Math.round(action.y),
          },
          data: {
            label: action.label.trim() || "Untitled",
            color: colorPair.color ?? DEFAULT_CANVAS_NODE_COLOR,
            textColor: colorPair.textColor ?? DEFAULT_CANVAS_NODE_TEXT_COLOR,
            shape,
          },
          style: {
            width,
            height,
          },
        });
        continue;
      }

      if (action.type === "moveNode") {
        const nodeId = nodeIdMap.get(action.id) ?? action.id;

        flow.updateNode(nodeId, {
          position: {
            x: Math.round(action.x),
            y: Math.round(action.y),
          },
        });
        continue;
      }

      if (action.type === "resizeNode") {
        const nodeId = nodeIdMap.get(action.id) ?? action.id;
        const node = flow.getNode(nodeId);

        if (!node) {
          continue;
        }

        flow.updateNode(nodeId, {
          style: {
            ...node.style,
            width: clampNumber(action.width, 96, MAX_NODE_WIDTH),
            height: clampNumber(action.height, 56, MAX_NODE_HEIGHT),
          },
        });
        continue;
      }

      if (action.type === "updateNodeData") {
        const nodeId = nodeIdMap.get(action.id) ?? action.id;
        const node = flow.getNode(nodeId);

        if (!node) {
          continue;
        }

        const shape = normalizeShape(action.shape ?? node.data.shape);
        const colorPair = getColorPair(action.colorName);

        flow.updateNode(nodeId, {
          data: {
            ...node.data,
            ...(action.label ? { label: action.label.trim() } : {}),
            ...(action.shape ? { shape } : {}),
            ...(action.colorName
              ? {
                  color: colorPair.color,
                  textColor: colorPair.textColor,
                }
              : {}),
          },
        });
        continue;
      }

      if (action.type === "addEdge") {
        const source = nodeIdMap.get(action.source) ?? action.source;
        const target = nodeIdMap.get(action.target) ?? action.target;

        if (!flow.getNode(source) || !flow.getNode(target)) {
          continue;
        }

        const edgeId = getUniqueId(action.id || `${source}-to-${target}`, existingEdgeIds);

        flow.addEdge({
          id: edgeId,
          type: CANVAS_EDGE_TYPE,
          source,
          target,
          sourceHandle: normalizeHandle(action.sourceHandle),
          targetHandle: normalizeHandle(action.targetHandle),
          data: {
            label: action.label?.trim() ?? "",
          },
          interactionWidth: 24,
          reconnectable: true,
        });
      }
    }
  });
}

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const liveblocks = getLiveblocksClient();

    logger.info("Design agent task started", {
      prompt: payload.prompt,
      roomId: payload.roomId,
    });

    await appendStatus(liveblocks, payload.roomId, "info", "Ghost AI started designing.");
    await setAiPresence(liveblocks, payload.roomId, {
      cursor: { x: 180, y: 120 },
      thinking: true,
    });

    try {
      const snapshot = await getCurrentCanvas(liveblocks, payload.roomId);

      await appendStatus(liveblocks, payload.roomId, "info", "Reading the current canvas.");
      await setAiPresence(liveblocks, payload.roomId, {
        cursor: { x: 360, y: 180 },
        thinking: true,
      });

      const rawPlan = await planDesign(payload, snapshot);
      const plan = normalizePlan(rawPlan, payload.prompt);

      await appendStatus(liveblocks, payload.roomId, "info", "Applying architecture updates.");
      await setAiPresence(liveblocks, payload.roomId, {
        cursor: { x: 560, y: 260 },
        thinking: true,
      });

      await applyDesignPlan(liveblocks, payload.roomId, plan);

      await appendStatus(
        liveblocks,
        payload.roomId,
        "success",
        plan.summary || "Ghost AI updated the canvas.",
      );

      logger.info("Design agent task completed", {
        roomId: payload.roomId,
        actionCount: plan.actions.length,
      });

      return {
        ok: true,
        summary: plan.summary,
        actionCount: plan.actions.length,
      };
    } catch (error) {
      const message = formatError(error);

      logger.error("Design agent task failed", {
        roomId: payload.roomId,
        error: message,
      });

      await appendStatus(
        liveblocks,
        payload.roomId,
        "error",
        "Ghost AI could not finish the design. Please try again.",
      );

      return {
        ok: false,
        error: message,
      };
    } finally {
      await setAiPresence(
        liveblocks,
        payload.roomId,
        {
          cursor: null,
          thinking: false,
        },
        2,
      );
    }
  },
});
