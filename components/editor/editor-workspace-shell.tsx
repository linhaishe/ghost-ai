"use client";

import { Bot, Download, Save, Share2 } from "lucide-react";
import { useState } from "react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { EditorCanvas, EditorRealtimeRoom } from "@/components/editor/editor-canvas";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import type { EditorProject } from "@/components/editor/project-types";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Button } from "@/components/ui/button";
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import { useProjectActions } from "@/hooks/use-project-actions";

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
  const [isStarterTemplatesOpen, setIsStarterTemplatesOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("saved");
  const [saveRequestId, setSaveRequestId] = useState(0);
  const projectActions = useProjectActions({ activeProjectId: roomId });
  const saveStatusLabel =
    saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Save error" : "Saved";

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
              onClick={() => setIsStarterTemplatesOpen(true)}
            >
              <Download className="h-4 w-4" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setSaveRequestId((current) => current + 1)}
              className={saveStatus === "error" ? "text-error hover:text-error" : undefined}
            >
              <Save className="h-4 w-4" />
              {saveStatusLabel}
            </Button>
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
        <EditorRealtimeRoom roomId={roomId}>
          <EditorCanvas
            roomId={roomId}
            isStarterTemplatesOpen={isStarterTemplatesOpen}
            onStarterTemplatesOpenChange={setIsStarterTemplatesOpen}
            saveRequestId={saveRequestId}
            onSaveStatusChange={setSaveStatus}
          />

          <AiSidebar
            isOpen={isAiSidebarOpen}
            onClose={() => setIsAiSidebarOpen(false)}
          />
        </EditorRealtimeRoom>
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
