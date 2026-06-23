export const AI_STATUS_FEED_ID = "ai-status-feed";

export const AI_STATUS_FEED_KINDS = ["info", "success", "error"] as const;

export type AiStatusFeedKind = (typeof AI_STATUS_FEED_KINDS)[number];

export interface AiStatusFeedMessage extends Record<string, string> {
  id: string;
  kind: AiStatusFeedKind;
  createdAt: string;
  text: string;
}

interface CreateAiStatusFeedMessageInput {
  kind: AiStatusFeedKind;
  text?: string;
}

function isAiStatusFeedKind(value: unknown): value is AiStatusFeedKind {
  return (
    typeof value === "string" &&
    AI_STATUS_FEED_KINDS.includes(value as AiStatusFeedKind)
  );
}

export function createAiStatusFeedMessage({
  kind,
  text,
}: CreateAiStatusFeedMessageInput): AiStatusFeedMessage {
  return {
    id: `ai-status-${Date.now()}-${crypto.randomUUID()}`,
    kind,
    createdAt: new Date().toISOString(),
    text: text ?? "",
  };
}

export function parseAiStatusFeedMessage(value: unknown): AiStatusFeedMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    !isAiStatusFeedKind(candidate.kind) ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  const text =
    typeof candidate.text === "string"
      ? candidate.text
      : typeof candidate.message === "string"
        ? candidate.message
        : undefined;

  return {
    id: candidate.id,
    kind: candidate.kind,
    createdAt: candidate.createdAt,
    text: text ?? "",
  };
}

export function getLatestAiStatusMessage(
  messages: readonly unknown[] | undefined,
): AiStatusFeedMessage | null {
  if (!messages?.length) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const parsedMessage = parseAiStatusFeedMessage(messages[index]);

    if (parsedMessage) {
      return parsedMessage;
    }
  }

  return null;
}
