import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger, metadata, task } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { generateText } from "ai";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { aiChatFeedMessageSchema } from "@/types/tasks";

const canvasPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const canvasNodeSnapshotSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().optional(),
    position: canvasPositionSchema,
    data: z.record(z.string(), z.unknown()).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const canvasEdgeSnapshotSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().optional(),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const generateSpecRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(aiChatFeedMessageSchema).max(100),
  nodes: z.array(canvasNodeSnapshotSchema).max(200),
  edges: z.array(canvasEdgeSnapshotSchema).max(400),
});

export const generateSpecPayloadSchema = generateSpecRequestSchema.extend({
  projectId: z.string().min(1),
});

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;

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

function getGoogleModel() {
  const google = createGoogleGenerativeAI({
    apiKey:
      optionalEnv(process.env.GEMINI_API_KEY) ??
      optionalEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    baseURL: optionalEnv(process.env.GOOGLE_GENERATIVE_AI_BASE_URL),
    fetch: getGoogleFetch(),
  });

  return google("gemini-2.5-flash");
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function serializeNode(node: GenerateSpecPayload["nodes"][number]) {
  return {
    id: node.id,
    type: node.type,
    label:
      typeof node.data?.label === "string" && node.data.label.trim()
        ? node.data.label
        : node.id,
    shape: typeof node.data?.shape === "string" ? node.data.shape : undefined,
    position: node.position,
    size: {
      width: typeof node.style?.width === "number" ? node.style.width : undefined,
      height: typeof node.style?.height === "number" ? node.style.height : undefined,
    },
  };
}

function serializeEdge(edge: GenerateSpecPayload["edges"][number]) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.data?.label === "string" ? edge.data.label : "",
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  };
}

function buildSpecPrompt(payload: GenerateSpecPayload) {
  return [
    "Generate a complete Markdown technical specification for this system design workspace.",
    "",
    "Project context:",
    `- Project ID: ${payload.projectId}`,
    `- Room ID: ${payload.roomId}`,
    "",
    "Canvas nodes:",
    JSON.stringify(payload.nodes.map(serializeNode), null, 2),
    "",
    "Canvas edges:",
    JSON.stringify(payload.edges.map(serializeEdge), null, 2),
    "",
    "Relevant sidebar chat history:",
    JSON.stringify(
      payload.chatHistory.map((message) => ({
        role: message.role,
        sender: message.sender.name,
        content: message.content,
        timestamp: message.timestamp,
      })),
      null,
      2,
    ),
    "",
    "Markdown requirements:",
    "- Start with an H1 title.",
    "- Include sections for Overview, Goals, Architecture Diagram Summary, Components, Data Flow, APIs/Interfaces, Data Stores, Operational Concerns, Risks, and Open Questions.",
    "- Infer only from the provided canvas and chat. If details are missing, call them out under Open Questions.",
    "- Keep the spec useful to engineers who will implement the system.",
    "- Return only Markdown. Do not wrap the result in code fences.",
  ].join("\n");
}

async function persistSpec(projectId: string, content: string) {
  const specId = crypto.randomUUID();
  const pathname = `specs/${projectId}/${specId}.md`;
  const blob = await put(pathname, content, {
    access: "private",
    allowOverwrite: false,
    contentType: "text/markdown; charset=utf-8",
    cacheControlMaxAge: 60,
  });

  await prisma.projectSpec.create({
    data: {
      id: specId,
      projectId,
      filePath: blob.url,
    },
  });

  return {
    specId,
    filePath: blob.url,
  };
}

export const generateSpec = task({
  id: "generate-spec",
  run: async (rawPayload: GenerateSpecPayload) => {
    const payload = generateSpecPayloadSchema.parse(rawPayload);

    logger.info("Spec generation task started", {
      projectId: payload.projectId,
      roomId: payload.roomId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      chatMessageCount: payload.chatHistory.length,
    });

    await metadata
      .set("status", "planning")
      .set("progress", 0.15)
      .set("roomId", payload.roomId)
      .flush();

    try {
      await metadata.set("status", "generating").set("progress", 0.45).flush();

      const result = await generateText({
        model: getGoogleModel(),
        system:
          "You are Ghost AI, a senior software architect. Write concise, accurate Markdown technical specifications from architecture diagrams and collaboration notes.",
        prompt: buildSpecPrompt(payload),
        temperature: 0.2,
        maxOutputTokens: 8192,
      });

      const content = result.text.trim();

      await metadata.set("status", "persisting").set("progress", 0.8).flush();

      const persistedSpec = await persistSpec(payload.projectId, content);

      await metadata
        .set("status", "completed")
        .set("progress", 1)
        .set("outputLength", content.length)
        .set("specId", persistedSpec.specId)
        .flush();

      logger.info("Spec generation task completed", {
        projectId: payload.projectId,
        roomId: payload.roomId,
        outputLength: content.length,
      });

      return {
        ok: true,
        content,
        specId: persistedSpec.specId,
        filePath: persistedSpec.filePath,
      };
    } catch (error) {
      const message = formatError(error);

      logger.error("Spec generation task failed", {
        projectId: payload.projectId,
        roomId: payload.roomId,
        error: message,
      });

      await metadata.set("status", "failed").set("error", message).flush();

      throw error;
    }
  },
});
