"use client";

import { Bot, Download, FileText, Send, Sparkles, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: "Tell me what you want to design, and I’ll help shape it into an architecture.",
  },
];

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg",
          isUser
            ? "border-2 border-brand/50 bg-brand/15 text-copy-primary"
            : "border border-surface-border bg-elevated text-accent-text",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function AiArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasMessages = messages.length > 0;

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, []);

  const submitPrompt = useCallback(
    (value = prompt) => {
      const trimmedPrompt = value.trim();

      if (!trimmedPrompt) {
        return;
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmedPrompt,
        },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Got it. Generation is not connected yet, but this prompt is ready for the AI workflow.",
        },
      ]);
      setPrompt("");

      window.requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "72px";
        }
      });
    },
    [prompt],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {hasMessages ? (
          <div className="space-y-4">
            {[...DEMO_MESSAGES, ...messages].map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-subtle/40 px-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-ai/20 text-ai-text">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-base font-semibold text-primary-text">
              Start with a prompt
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-text">
              Describe the system you want to design and Ghost AI will help shape the workspace.
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
            placeholder="Ask Ghost AI to design, critique, or refine this architecture..."
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
            className="max-h-40 min-h-[72px] resize-none border-0 bg-transparent px-1 py-1 text-sm leading-6 text-copy-primary shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              className="bg-ai text-white hover:bg-ai/90"
              onClick={() => submitPrompt()}
              disabled={!prompt.trim()}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
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
