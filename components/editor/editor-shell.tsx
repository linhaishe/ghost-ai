"use client";

import { useState } from "react";

import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import type { EditorProject } from "@/components/editor/project-types";
import { useProjectActions } from "@/hooks/use-project-actions";

interface EditorShellProps {
  activeProjectId?: string;
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
}

export function EditorShell({ activeProjectId, ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectActions = useProjectActions({ activeProjectId });

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((current) => !current)}
        centerContent="Ghost AI"
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onCreateProject={projectActions.openCreateDialog}
        onRenameProject={projectActions.openRenameDialog}
        onDeleteProject={projectActions.openDeleteDialog}
      />

      <main className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <EditorHome onCreateProject={projectActions.openCreateDialog} />
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
    </div>
  );
}
