"use client";

import { useMutation, useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { Bot, Download, FileText, Loader2, Send, Sparkles, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  createAiChatFeedMessage,
  getLatestAiStatusMessage,
  getValidAiChatMessages,
  type AiChatFeedMessage,
} from "@/types/tasks";

interface AiSidebarProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

const MAX_CHAT_MESSAGES = 100;
const AI_CHAT_SENDER = {
  id: "ghost-ai-agent",
  name: "Ghost AI",
  avatarUrl: null,
  color: "#62C073",
} satisfies AiChatFeedMessage["sender"];
const FINISHED_RUN_STATUSES = [
  "COMPLETED",
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "EXPIRED",
  "TIMED_OUT",
] as const;

interface ProjectSpecListItem {
  id: string;
  createdAt: string;
  filename: string;
}

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSpecDate(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function parseSpecsPayload(payload: { specs?: unknown }) {
  if (!Array.isArray(payload.specs)) {
    throw new Error("Specs response was invalid.");
  }

  return payload.specs.filter((spec): spec is ProjectSpecListItem => {
    if (!spec || typeof spec !== "object") {
      return false;
    }

    const candidate = spec as Partial<ProjectSpecListItem>;

    return (
      typeof candidate.id === "string" &&
      typeof candidate.createdAt === "string" &&
      typeof candidate.filename === "string"
    );
  });
}

function ChatMessageBubble({
  message,
  currentUserId,
}: {
  message: AiChatFeedMessage;
  currentUserId: string;
}) {
  const isCurrentUser = message.sender.id === currentUserId;

  return (
    <div className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg",
          isCurrentUser
            ? "border border-[#62C073]/45 bg-[#62C073] text-slate-950"
            : "border border-surface-border bg-elevated text-copy-primary",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-copy-faint">
          <span className="truncate">{isCurrentUser ? "You" : message.sender.name}</span>
          <span aria-hidden="true">/</span>
          <time dateTime={message.timestamp}>{formatMessageTime(message.timestamp)}</time>
        </div>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}

function useIsAiGenerationActive() {
  return useOthers((others) => others.some((other) => other.presence.thinking));
}

function useLatestAiStatusText() {
  const latestMessage = useStorage((storage) =>
    getLatestAiStatusMessage(storage[AI_STATUS_FEED_ID] ?? storage.aiStatus),
  );

  return latestMessage?.text || null;
}

function AiSharedStatus({
  isActive,
  statusText,
}: {
  isActive: boolean;
  statusText: string | null;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-surface-border bg-base px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-2.5 shrink-0 rounded-full",
            isActive ? "animate-pulse bg-[#62C073] shadow-[0_0_18px_rgba(98,192,115,0.45)]" : "bg-copy-faint",
          )}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-text">
            Ghost AI
          </p>
          <p className="mt-1 truncate text-sm text-copy-primary">
            {isActive ? statusText ?? "Thinking through the canvas..." : statusText ?? "Ready"}
          </p>
        </div>
        {isActive ? (
          <Loader2 aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 animate-spin text-[#62C073]" />
        ) : null}
      </div>
    </div>
  );
}

function isFinishedRunStatus(status: string | undefined) {
  return FINISHED_RUN_STATUSES.includes(status as (typeof FINISHED_RUN_STATUSES)[number]);
}

function AiArchitectTab({ roomId }: { roomId: string }) {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; publicToken: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const completedRunIdsRef = useRef(new Set<string>());
  const erroredRunIdsRef = useRef(new Set<string>());
  const self = useSelf();
  const chatMessages = useStorage((storage) =>
    getValidAiChatMessages(storage[AI_CHAT_FEED_ID]),
  );
  const hasMessages = chatMessages.length > 0;
  const isGenerationActive = useIsAiGenerationActive();
  const latestStatusText = useLatestAiStatusText();
  const appendChatMessage = useMutation(
    ({ storage }, message: AiChatFeedMessage) => {
      const currentMessages = storage.get(AI_CHAT_FEED_ID) ?? [];
      const nextMessages = [...currentMessages, message].slice(-MAX_CHAT_MESSAGES);

      storage.set(AI_CHAT_FEED_ID, nextMessages);
    },
    [],
  );
  const { run, error: realtimeError } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: Boolean(activeRun),
    onComplete: (completedRun, error) => {
      const completedRunId = completedRun.id;

      if (completedRunIdsRef.current.has(completedRunId)) {
        return;
      }

      completedRunIdsRef.current.add(completedRunId);
      appendChatMessage(
        createAiChatFeedMessage({
          role: "assistant",
          sender: AI_CHAT_SENDER,
          content:
            error || completedRun.status !== "COMPLETED"
              ? "I couldn’t finish the design run. Please try again."
              : "Design run complete. I updated the shared canvas.",
        }),
      );
      setActiveRun(null);
    },
  });
  const isRunActive = Boolean(activeRun) && !isFinishedRunStatus(run?.status);
  const isChatInputDisabled = isSending || isRunActive || isGenerationActive;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    const scrollElement = messagesScrollRef.current;

    if (!scrollElement) {
      return;
    }

    scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [chatMessages.length]);

  useEffect(() => {
    if (!activeRun || !realtimeError || erroredRunIdsRef.current.has(activeRun.runId)) {
      return;
    }

    erroredRunIdsRef.current.add(activeRun.runId);
    appendChatMessage(
      createAiChatFeedMessage({
        role: "assistant",
        sender: AI_CHAT_SENDER,
        content: "I lost the realtime connection for this design run. Please try again.",
      }),
    );
    setActiveRun(null);
  }, [activeRun, appendChatMessage, realtimeError]);

  const submitPrompt = useCallback(
    async (value = prompt) => {
      const trimmedPrompt = value.trim();

      if (!trimmedPrompt || isChatInputDisabled) {
        return;
      }

      setIsSending(true);

      try {
        appendChatMessage(
          createAiChatFeedMessage({
            role: "user",
            content: trimmedPrompt,
            sender: {
              id: self.id,
              name: self.info.name,
              avatarUrl: self.info.avatarUrl,
              color: self.info.cursorColor,
            },
          }),
        );
        setPrompt("");
        window.requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "72px";
          }
        });
        const response = await fetch("/api/ai/design", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            roomId,
          }),
        });

        if (!response.ok) {
          throw new Error("Design task could not be started.");
        }

        const payload = (await response.json()) as {
          runId?: unknown;
          publicToken?: unknown;
        };

        if (typeof payload.runId !== "string" || typeof payload.publicToken !== "string") {
          throw new Error("Design task response was invalid.");
        }

        setActiveRun({
          runId: payload.runId,
          publicToken: payload.publicToken,
        });
      } catch {
        appendChatMessage(
          createAiChatFeedMessage({
            role: "assistant",
            sender: AI_CHAT_SENDER,
            content: "I couldn’t start the design run. Please try again.",
          }),
        );
      } finally {
        setIsSending(false);
      }
    },
    [appendChatMessage, isChatInputDisabled, prompt, roomId, self],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {hasMessages ? (
          <div className="mt-4 space-y-4">
            {chatMessages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} currentUserId={self.id} />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-subtle/40 px-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-semibold text-primary-text">
              Start room chat
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-text">
              Start a room chat with collaborators. AI replies are not enabled yet.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((starterPrompt) => (
                <button
                  key={starterPrompt}
                  type="button"
                  className="rounded-full bg-subtle px-3 py-2 text-xs font-medium text-accent-text transition hover:bg-elevated"
                  onClick={() => {
                    setPrompt(starterPrompt);
                    window.requestAnimationFrame(resizeTextarea);
                  }}
                >
                  {starterPrompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-surface-border bg-base/70 p-5">
        {isRunActive ? (
          <AiSharedStatus
            isActive
            statusText={latestStatusText ?? "Design run is active..."}
          />
        ) : null}
        <div className="rounded-2xl border border-surface-border bg-elevated/70 p-3">
          <Textarea
            ref={textareaRef}
            value={prompt}
            placeholder="Send a message to this workspace..."
            disabled={isChatInputDisabled}
            onChange={(event) => {
              setPrompt(event.target.value);
              resizeTextarea();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitPrompt();
              }
            }}
            className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-copy-primary shadow-none disabled:cursor-not-allowed disabled:opacity-70 focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              className="bg-[#62C073] text-slate-950 hover:bg-[#62C073]/90 disabled:opacity-50"
              onClick={() => submitPrompt()}
              disabled={!prompt.trim() || isChatInputDisabled}
            >
              {isChatInputDisabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Sending" : isRunActive || isGenerationActive ? "Working" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let isCodeBlock = false;

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    const items = listItems;
    const key = blocks.length;

    blocks.push(
      <ul key={`list-${key}`} className="my-4 list-disc space-y-2 pl-5 text-sm leading-6 text-copy-muted">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushCode = () => {
    const code = codeLines.join("\n");
    const key = blocks.length;

    blocks.push(
      <pre
        key={`code-${key}`}
        className="my-4 overflow-x-auto rounded-xl border border-surface-border bg-base p-4 text-xs leading-6 text-copy-primary"
      >
        <code>{code}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (isCodeBlock) {
        flushCode();
        isCodeBlock = false;
      } else {
        flushList();
        isCodeBlock = true;
      }

      return;
    }

    if (isCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      flushList();
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${index}`} className="mb-5 text-2xl font-semibold text-copy-primary">
          {trimmed.slice(2)}
        </h1>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${index}`} className="mb-3 mt-6 text-lg font-semibold text-copy-primary">
          {trimmed.slice(3)}
        </h2>,
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${index}`} className="mb-2 mt-5 text-base font-semibold text-copy-primary">
          {trimmed.slice(4)}
        </h3>,
      );
      return;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-3 text-sm leading-7 text-copy-muted">
        {trimmed}
      </p>,
    );
  });

  flushList();

  if (isCodeBlock) {
    flushCode();
  }

  return <div className="space-y-1">{blocks}</div>;
}

function SpecsTab({ roomId }: { roomId: string }) {
  const { nodes, edges } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: {
      initial: [],
    },
    edges: {
      initial: [],
    },
  });
  const [specs, setSpecs] = useState<ProjectSpecListItem[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecListItem | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [activeSpecRun, setActiveSpecRun] = useState<{ runId: string; publicToken: string } | null>(null);
  const [specStatusText, setSpecStatusText] = useState<string | null>(null);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isStartingSpec, setIsStartingSpec] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const completedSpecRunIdsRef = useRef(new Set<string>());
  const erroredSpecRunIdsRef = useRef(new Set<string>());
  const chatMessages = useStorage((storage) =>
    getValidAiChatMessages(storage[AI_CHAT_FEED_ID]),
  );

  const getDownloadUrl = useCallback(
    (specId: string) => `/api/projects/${roomId}/specs/${specId}/download`,
    [roomId],
  );

  const loadSpecs = useCallback(async () => {
    setIsLoadingSpecs(true);
    setSpecsError(null);

    try {
      const response = await fetch(`/api/projects/${roomId}/specs`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Specs could not be loaded.");
      }

      const payload = (await response.json()) as { specs?: unknown };

      setSpecs(parseSpecsPayload(payload));
    } catch {
      setSpecsError("Specs could not be loaded.");
    } finally {
      setIsLoadingSpecs(false);
    }
  }, [roomId]);

  const { run: specRun, error: specRealtimeError } = useRealtimeRun(activeSpecRun?.runId, {
    accessToken: activeSpecRun?.publicToken,
    enabled: Boolean(activeSpecRun),
    onComplete: (completedRun, error) => {
      const completedRunId = completedRun.id;

      if (completedSpecRunIdsRef.current.has(completedRunId)) {
        return;
      }

      completedSpecRunIdsRef.current.add(completedRunId);

      if (error || completedRun.status !== "COMPLETED") {
        setSpecStatusText("Spec generation failed. Please try again.");
      } else {
        setSpecStatusText("Spec generated. Refreshing list...");
        void loadSpecs();
      }

      setActiveSpecRun(null);
    },
  });
  const isSpecRunActive = Boolean(activeSpecRun) && !isFinishedRunStatus(specRun?.status);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSpecs() {
      try {
        const response = await fetch(`/api/projects/${roomId}/specs`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Specs could not be loaded.");
        }

        const payload = (await response.json()) as { specs?: unknown };

        if (!isMounted) {
          return;
        }

        setSpecs(parseSpecsPayload(payload));
        setSpecsError(null);
      } catch {
        if (isMounted) {
          setSpecsError("Specs could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingSpecs(false);
        }
      }
    }

    void loadInitialSpecs();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const openPreview = useCallback(
    async (spec: ProjectSpecListItem) => {
      setSelectedSpec(spec);
      setPreviewContent("");
      setPreviewError(null);
      setIsLoadingPreview(true);

      try {
        const response = await fetch(getDownloadUrl(spec.id), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Spec content could not be loaded.");
        }

        setPreviewContent(await response.text());
      } catch {
        setPreviewError("Spec content could not be loaded.");
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [getDownloadUrl],
  );

  const downloadSpec = useCallback(
    (specId: string) => {
      window.location.href = getDownloadUrl(specId);
    },
    [getDownloadUrl],
  );

  useEffect(() => {
    if (!activeSpecRun || !specRealtimeError || erroredSpecRunIdsRef.current.has(activeSpecRun.runId)) {
      return;
    }

    erroredSpecRunIdsRef.current.add(activeSpecRun.runId);
    setSpecStatusText("Realtime status disconnected. Check the spec list in a moment.");
    setActiveSpecRun(null);
  }, [activeSpecRun, specRealtimeError]);

  const generateSpec = useCallback(async () => {
    if (isStartingSpec || isSpecRunActive) {
      return;
    }

    setIsStartingSpec(true);
    setSpecsError(null);
    setSpecStatusText("Starting spec generation...");

    try {
      const response = await fetch("/api/ai/spec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          chatHistory: chatMessages.slice(-100),
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
            style: node.style,
            width: node.width,
            height: node.height,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            type: edge.type,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: edge.data,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Spec generation could not be started.");
      }

      const payload = (await response.json()) as { runId?: unknown };

      if (typeof payload.runId !== "string") {
        throw new Error("Spec generation response was invalid.");
      }

      const tokenResponse = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: payload.runId,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Spec run token could not be created.");
      }

      const tokenPayload = (await tokenResponse.json()) as { token?: unknown };

      if (typeof tokenPayload.token !== "string") {
        throw new Error("Spec run token response was invalid.");
      }

      setActiveSpecRun({
        runId: payload.runId,
        publicToken: tokenPayload.token,
      });
      setSpecStatusText("Spec generation is running...");
    } catch {
      setSpecStatusText("Spec generation could not be started. Please try again.");
    } finally {
      setIsStartingSpec(false);
    }
  }, [chatMessages, edges, isSpecRunActive, isStartingSpec, nodes, roomId]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        <Button
          type="button"
          className="bg-ai text-white hover:bg-ai/90"
          onClick={() => void generateSpec()}
          disabled={isStartingSpec || isSpecRunActive}
        >
          {isStartingSpec || isSpecRunActive ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isStartingSpec || isSpecRunActive ? "Generating..." : "Generate Spec"}
        </Button>

        {specStatusText ? (
          <div className="rounded-2xl border border-surface-border bg-base/70 px-4 py-3 text-sm text-copy-primary">
            <div className="flex items-center gap-3">
              {isStartingSpec || isSpecRunActive ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ai-text" />
              ) : (
                <Sparkles className="h-4 w-4 shrink-0 text-ai-text" />
              )}
              <span className="min-w-0 flex-1">{specStatusText}</span>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-surface-border bg-elevated shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-primary-text">Generated Specs</h3>
              <p className="mt-1 text-xs text-muted-text">
                {specs.length === 1 ? "1 saved spec" : `${specs.length} saved specs`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Refresh specs"
              onClick={loadSpecs}
              disabled={isLoadingSpecs}
            >
              {isLoadingSpecs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
              {isLoadingSpecs ? (
                <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-base/60 px-3 py-4 text-sm text-muted-text">
                  <Loader2 className="h-4 w-4 animate-spin text-ai-text" />
                  Loading specs...
                </div>
              ) : null}

              {!isLoadingSpecs && specsError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-4 text-sm text-copy-primary">
                  {specsError}
                </div>
              ) : null}

              {!isLoadingSpecs && !specsError && specs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border bg-base/50 px-4 py-6 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-primary-text">No specs yet</p>
                  <p className="mt-2 text-xs leading-5 text-muted-text">
                    Generated Markdown specs will appear here.
                  </p>
                </div>
              ) : null}

              {!isLoadingSpecs && !specsError
                ? specs.map((spec) => (
                    <div
                      key={spec.id}
                      className="group flex w-full items-center gap-3 rounded-xl border border-surface-border bg-base/55 p-3 text-left transition hover:border-ai/40 hover:bg-subtle"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => openPreview(spec)}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-copy-primary">
                            {spec.filename}
                          </span>
                          <time
                            dateTime={spec.createdAt}
                            className="mt-1 block text-xs text-muted-text"
                          >
                            {formatSpecDate(spec.createdAt)}
                          </time>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-copy-muted transition hover:bg-elevated hover:text-copy-primary"
                        aria-label={`Download ${spec.filename}`}
                        onClick={() => downloadSpec(spec.id)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                : null}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedSpec)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSpec(null);
            setPreviewContent("");
            setPreviewError(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[82vh] max-w-3xl flex-col overflow-hidden border-surface-border bg-base p-0 text-copy-primary">
          <DialogHeader className="border-b border-surface-border px-6 py-5">
            <div className="flex items-start gap-4 pr-8">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-lg font-semibold text-copy-primary">
                  {selectedSpec?.filename ?? "Generated Spec"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-copy-muted">
                  {selectedSpec ? formatSpecDate(selectedSpec.createdAt) : "Markdown preview"}
                </DialogDescription>
              </div>
              {selectedSpec ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-surface-border bg-transparent text-copy-primary"
                  onClick={() => downloadSpec(selectedSpec.id)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">
              {isLoadingPreview ? (
                <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-text">
                  <Loader2 className="h-4 w-4 animate-spin text-ai-text" />
                  Loading preview...
                </div>
              ) : null}

              {!isLoadingPreview && previewError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-copy-primary">
                  {previewError}
                </div>
              ) : null}

              {!isLoadingPreview && !previewError ? (
                <MarkdownPreview content={previewContent} />
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AiSidebar({ isOpen, roomId, onClose }: AiSidebarProps) {
  return (
    <aside
      className={cn(
        "absolute bottom-4 right-4 top-4 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-primary-text">AI Workspace</h2>
            <p className="mt-1 text-sm text-muted-text">Collaborate with Ghost AI</p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close AI sidebar"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="border-b border-surface-border px-5 py-4">
          <TabsList className="grid h-10 w-full grid-cols-2 bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="data-active:bg-accent data-active:text-accent-text text-muted-text"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="data-active:bg-accent data-active:text-accent-text text-muted-text"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="architect"
          className="min-h-0 flex-col overflow-hidden data-active:flex data-inactive:hidden"
        >
          <AiArchitectTab roomId={roomId} />
        </TabsContent>
        <TabsContent
          value="specs"
          className="min-h-0 flex-col overflow-hidden data-active:flex data-inactive:hidden"
        >
          <SpecsTab roomId={roomId} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
