import {
  aiChatFeedMessageSchema,
  createGoogleGenerativeAI,
  external_exports,
  generateText,
  require_undici
} from "../../../../chunk-ZAAIQKO6.mjs";
import "../../../../chunk-6GABWK6E.mjs";
import {
  logger,
  metadata,
  task
} from "../../../../chunk-CP3ARUYA.mjs";
import "../../../../chunk-SZ6GL6S4.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../../chunk-3VTTNDYQ.mjs";

// trigger/generate-spec.ts
init_esm();
var import_undici = __toESM(require_undici());
var canvasPositionSchema = external_exports.object({
  x: external_exports.number(),
  y: external_exports.number()
});
var canvasNodeSnapshotSchema = external_exports.object({
  id: external_exports.string().min(1),
  type: external_exports.string().optional(),
  position: canvasPositionSchema,
  data: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  style: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
}).passthrough();
var canvasEdgeSnapshotSchema = external_exports.object({
  id: external_exports.string().min(1),
  type: external_exports.string().optional(),
  source: external_exports.string().min(1),
  target: external_exports.string().min(1),
  sourceHandle: external_exports.string().nullable().optional(),
  targetHandle: external_exports.string().nullable().optional(),
  data: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
}).passthrough();
var generateSpecRequestSchema = external_exports.object({
  roomId: external_exports.string().min(1),
  chatHistory: external_exports.array(aiChatFeedMessageSchema).max(100),
  nodes: external_exports.array(canvasNodeSnapshotSchema).max(200),
  edges: external_exports.array(canvasEdgeSnapshotSchema).max(400)
});
var generateSpecPayloadSchema = generateSpecRequestSchema.extend({
  projectId: external_exports.string().min(1)
});
function optionalEnv(value) {
  const trimmedValue = value?.trim();
  return trimmedValue || void 0;
}
__name(optionalEnv, "optionalEnv");
function getGoogleProxyUrl() {
  return optionalEnv(process.env.GOOGLE_GENERATIVE_AI_PROXY_URL) ?? optionalEnv(process.env.HTTPS_PROXY) ?? optionalEnv(process.env.https_proxy) ?? optionalEnv(process.env.HTTP_PROXY) ?? optionalEnv(process.env.http_proxy) ?? optionalEnv(process.env.ALL_PROXY) ?? optionalEnv(process.env.all_proxy);
}
__name(getGoogleProxyUrl, "getGoogleProxyUrl");
function getGoogleFetch() {
  const proxyUrl = getGoogleProxyUrl();
  if (!proxyUrl) {
    return void 0;
  }
  const dispatcher = new import_undici.ProxyAgent(proxyUrl);
  return (input, init) => (0, import_undici.fetch)(input, {
    ...init,
    dispatcher
  });
}
__name(getGoogleFetch, "getGoogleFetch");
function getGoogleModel() {
  const google = createGoogleGenerativeAI({
    apiKey: optionalEnv(process.env.GEMINI_API_KEY) ?? optionalEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    baseURL: optionalEnv(process.env.GOOGLE_GENERATIVE_AI_BASE_URL),
    fetch: getGoogleFetch()
  });
  return google("gemini-2.5-flash");
}
__name(getGoogleModel, "getGoogleModel");
function formatError(error) {
  return error instanceof Error ? error.message : "Unknown error";
}
__name(formatError, "formatError");
function serializeNode(node) {
  return {
    id: node.id,
    type: node.type,
    label: typeof node.data?.label === "string" && node.data.label.trim() ? node.data.label : node.id,
    shape: typeof node.data?.shape === "string" ? node.data.shape : void 0,
    position: node.position,
    size: {
      width: typeof node.style?.width === "number" ? node.style.width : void 0,
      height: typeof node.style?.height === "number" ? node.style.height : void 0
    }
  };
}
__name(serializeNode, "serializeNode");
function serializeEdge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: typeof edge.data?.label === "string" ? edge.data.label : "",
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle
  };
}
__name(serializeEdge, "serializeEdge");
function buildSpecPrompt(payload) {
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
        timestamp: message.timestamp
      })),
      null,
      2
    ),
    "",
    "Markdown requirements:",
    "- Start with an H1 title.",
    "- Include sections for Overview, Goals, Architecture Diagram Summary, Components, Data Flow, APIs/Interfaces, Data Stores, Operational Concerns, Risks, and Open Questions.",
    "- Infer only from the provided canvas and chat. If details are missing, call them out under Open Questions.",
    "- Keep the spec useful to engineers who will implement the system.",
    "- Return only Markdown. Do not wrap the result in code fences."
  ].join("\n");
}
__name(buildSpecPrompt, "buildSpecPrompt");
var generateSpec = task({
  id: "generate-spec",
  run: /* @__PURE__ */ __name(async (rawPayload) => {
    const payload = generateSpecPayloadSchema.parse(rawPayload);
    logger.info("Spec generation task started", {
      projectId: payload.projectId,
      roomId: payload.roomId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      chatMessageCount: payload.chatHistory.length
    });
    await metadata.set("status", "planning").set("progress", 0.15).set("roomId", payload.roomId).flush();
    try {
      await metadata.set("status", "generating").set("progress", 0.45).flush();
      const result = await generateText({
        model: getGoogleModel(),
        system: "You are Ghost AI, a senior software architect. Write concise, accurate Markdown technical specifications from architecture diagrams and collaboration notes.",
        prompt: buildSpecPrompt(payload),
        temperature: 0.2,
        maxOutputTokens: 8192
      });
      const content = result.text.trim();
      await metadata.set("status", "completed").set("progress", 1).set("outputLength", content.length).flush();
      logger.info("Spec generation task completed", {
        projectId: payload.projectId,
        roomId: payload.roomId,
        outputLength: content.length
      });
      return {
        ok: true,
        content
      };
    } catch (error) {
      const message = formatError(error);
      logger.error("Spec generation task failed", {
        projectId: payload.projectId,
        roomId: payload.roomId,
        error: message
      });
      await metadata.set("status", "failed").set("error", message).flush();
      throw error;
    }
  }, "run")
});
export {
  generateSpec,
  generateSpecPayloadSchema,
  generateSpecRequestSchema
};
//# sourceMappingURL=generate-spec.mjs.map
