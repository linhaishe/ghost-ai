"use client";

import { useState } from "react";

import { EditorHome } from "@/components/editor/editor-home";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { ProjectDialogs } from "@/components/editor/project-dialogs";
import type { MockProject } from "@/components/editor/project-types";
import { useProjectDialogs } from "@/components/editor/use-project-dialogs";

const mockProjects: MockProject[] = [
  {
    id: "owned-payments",
    name: "Payments Platform",
    slug: "payments-platform",
    ownerType: "owned",
  },
  {
    id: "owned-analytics",
    name: "Analytics Pipeline",
    slug: "analytics-pipeline",
    ownerType: "owned",
  },
  {
    id: "shared-marketplace",
    name: "Marketplace Redesign",
    slug: "marketplace-redesign",
    ownerType: "shared",
  },
];

export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const projectDialogs = useProjectDialogs();

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
        projects={mockProjects}
        onCreateProject={projectDialogs.openCreateDialog}
        onRenameProject={projectDialogs.openRenameDialog}
        onDeleteProject={projectDialogs.openDeleteDialog}
      />

      <main className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <EditorHome onCreateProject={projectDialogs.openCreateDialog} />
      </main>

      <ProjectDialogs
        dialogState={projectDialogs.dialogState}
        isLoading={projectDialogs.isLoading}
        projectName={projectDialogs.projectName}
        slugPreview={projectDialogs.slugPreview}
        onProjectNameChange={projectDialogs.setProjectName}
        onClose={projectDialogs.closeDialog}
        onSubmit={projectDialogs.submitDialog}
      />
    </div>
  );
}
