"use client";

import { useMemo, useState } from "react";

import type { MockProject } from "@/components/editor/project-types";

type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType;
  project?: MockProject;
}

function slugifyProjectName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-project"
  );
}

export function useProjectDialogs() {
  const [dialogState, setDialogState] = useState<ProjectDialogState | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const slugPreview = useMemo(() => slugifyProjectName(projectName), [projectName]);

  function openCreateDialog() {
    setProjectName("");
    setDialogState({ type: "create" });
  }

  function openRenameDialog(project: MockProject) {
    setProjectName(project.name);
    setDialogState({ type: "rename", project });
  }

  function openDeleteDialog(project: MockProject) {
    setProjectName(project.name);
    setDialogState({ type: "delete", project });
  }

  function closeDialog() {
    if (isLoading) {
      return;
    }

    setDialogState(null);
    setProjectName("");
  }

  function submitDialog() {
    setIsLoading(true);
    setDialogState(null);
    setProjectName("");
    setIsLoading(false);
  }

  return {
    dialogState,
    isLoading,
    projectName,
    slugPreview,
    setProjectName,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitDialog,
  };
}
