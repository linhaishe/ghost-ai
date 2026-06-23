"use client";

import { useMutation, useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import { Bot, Download, FileText, Loader2, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  onClose: () => void;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

const MAX_CHAT_MESSAGES = 100;

function formatMessageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
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
            ? "border-2 border-brand/50 bg-brand/15 text-copy-primary"
            : "border border-surface-border bg-elevated text-accent-text",
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
    <div className="rounded-2xl border border-surface-border bg-subtle/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-2.5 shrink-0 rounded-full",
            isActive ? "bg-ai-text shadow-[0_0_18px_rgba(106,77,255,0.65)]" : "bg-copy-faint",
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
          <Loader2 aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 animate-spin text-ai-text" />
        ) : null}
      </div>
    </div>
  );
}

function AiArchitectTab() {
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const self = useSelf();
  const chatMessages = useStorage((storage) =>
    getValidAiChatMessages(storage[AI_CHAT_FEED_ID]),
  );
  const hasMessages = chatMessages.length > 0;
  const isGenerationActive = useIsAiGenerationActive();
  const latestStatusText = useLatestAiStatusText();
  const isChatInputDisabled = isSending || isGenerationActive;
  const sendChatMessage = useMutation(
    ({ storage, self: roomSelf }, content: string) => {
      const trimmedContent = content.trim();

      if (!trimmedContent) {
        return;
      }

      const message = createAiChatFeedMessage({
        role: "user",
        content: trimmedContent,
        sender: {
          id: roomSelf.id,
          name: roomSelf.info.name,
          avatarUrl: roomSelf.info.avatarUrl,
          color: roomSelf.info.cursorColor,
        },
      });
      const currentMessages = storage.get(AI_CHAT_FEED_ID) ?? [];
      const nextMessages = [...currentMessages, message].slice(-MAX_CHAT_MESSAGES);

      storage.set(AI_CHAT_FEED_ID, nextMessages);
    },
    [],
  );

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [chatMessages.length]);

  const submitPrompt = useCallback(
    (value = prompt) => {
      const trimmedPrompt = value.trim();

      if (!trimmedPrompt || isChatInputDisabled) {
        return;
      }

      setIsSending(true);
      setSendError(null);

      try {
        sendChatMessage(trimmedPrompt);
        setPrompt("");
        window.requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "72px";
          }
        });
      } catch {
        setSendError("Message could not be sent. Please try again.");
      } finally {
        setIsSending(false);
      }
    },
    [isChatInputDisabled, prompt, sendChatMessage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <AiSharedStatus isActive={isGenerationActive} statusText={latestStatusText} />

        {hasMessages ? (
          <div className="mt-4 space-y-4">
            {chatMessages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} currentUserId={self.id} />
            ))}
            <div ref={messagesEndRef} />
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

      <div className="border-t border-surface-border bg-base/70 p-5">
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
              className="bg-ai text-white hover:bg-ai/90"
              onClick={() => submitPrompt()}
              disabled={!prompt.trim() || isChatInputDisabled}
            >
              {isChatInputDisabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSending ? "Sending" : isGenerationActive ? "Working" : "Send"}
            </Button>
          </div>
          {sendError ? <p className="mt-3 text-xs text-error">{sendError}</p> : null}
        </div>
      </div>
    </div>
  );
}

function SpecsTab() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 p-5">
      <Button type="button" className="bg-ai text-white hover:bg-ai/90">
        <Sparkles className="h-4 w-4" />
        Generate Spec
      </Button>

      <div className="rounded-2xl border border-surface-border bg-elevated p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-primary-text">
              System Architecture Spec
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-text">
              A generated technical specification will summarize services, data flow,
              dependencies, and deployment notes from the current canvas.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled
          className="mt-5 w-full border-surface-border bg-transparent text-copy-muted"
        >
          <Download className="h-4 w-4" />
          Download unavailable
        </Button>
      </div>
    </div>
  );
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
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

      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-0">
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

        <TabsContent value="architect" className="min-h-0 data-inactive:hidden">
          <AiArchitectTab />
        </TabsContent>
        <TabsContent value="specs" className="min-h-0 data-inactive:hidden">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
