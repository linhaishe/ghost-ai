"use client";

import { Bot, Compass, Share2, Sparkles } from "lucide-react";
import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import type { EditorProject } from "@/components/editor/project-types";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import { useProjectActions } from "@/hooks/use-project-actions";
import { cn } from "@/lib/utils";

interface EditorWorkspaceShellProps {
  roomId: string;
  projectName: string;
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}

export function EditorWorkspaceShell({
  roomId,
  projectName,
  ownedProjects,
  sharedProjects,
}: EditorWorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const projectActions = useProjectActions({ activeProjectId: roomId });

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((current) => !current)}
        centerContent={projectName}
        rightContent={
          <>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              variant={isAiSidebarOpen ? "default" : "ghost"}
              size="sm"
              type="button"
              onClick={() => setIsAiSidebarOpen((current) => !current)}
            >
              <Bot className="h-4 w-4" />
              AI
            </Button>
          </>
        }
      />

      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeProjectId={roomId}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onCreateProject={projectActions.openCreateDialog}
        onRenameProject={projectActions.openRenameDialog}
        onDeleteProject={projectActions.openDeleteDialog}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden bg-base p-4">
        <section className="relative flex h-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-border bg-background px-6 shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-default)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-default)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--accent-primary-dim),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(100,87,249,0.22),transparent_28%)]" />

          <div className="relative flex max-w-2xl flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-surface-border bg-elevated/80 text-brand shadow-xl">
              <Compass className="h-8 w-8" />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-copy-faint">
              Workspace Shell
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-copy-primary md:text-4xl">
              Canvas and collaboration tooling land here next.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-copy-muted">
              This room is ready for the shared architecture canvas, durable AI workflows, and
              real-time presence. For now, the shell is wired with project context and navigation only.
            </p>
          </div>
        </section>

        <aside
          className={cn(
            "absolute bottom-4 right-4 top-4 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
            isAiSidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]",
          )}
        >
          <div className="flex items-center justify-between border-b border-surface-border px-5 py-5">
            <div>
              <p className="text-sm font-semibold text-copy-primary">AI Copilot</p>
              <p className="mt-1 text-sm text-copy-muted">Placeholder panel</p>
            </div>
            <Sparkles className="h-5 w-5 text-ai-text" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-between gap-6 p-5">
            <div className="rounded-2xl border border-surface-border bg-elevated/70 p-5">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ai/20 text-ai-text">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-copy-primary">Chat surface pending</p>
                  <p className="mt-2 text-sm leading-6 text-copy-muted">
                    The toggle is wired. Messaging and generation are intentionally out of scope here.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-surface-border bg-base/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-copy-faint">
                Future Hooks
              </p>
              <p className="mt-5 text-sm leading-7 text-copy-muted">
                Prompt composer, run status, and architecture guidance will attach to this sidebar.
              </p>
            </div>
          </div>
        </aside>
      </main>

      <ProjectDialogs
        dialogState={projectActions.dialogState}
        isLoading={projectActions.isLoading}
        projectName={projectActions.projectName}
        slugPreview={projectActions.slugPreview}
        onProjectNameChange={projectActions.setProjectName}
        onClose={projectActions.closeDialog}
        onSubmit={projectActions.submitDialog}
      />

      <ShareDialog
        isOpen={isShareDialogOpen}
        projectId={roomId}
        projectName={projectName}
        onClose={() => setIsShareDialogOpen(false)}
      />
    </div>
  );
}
