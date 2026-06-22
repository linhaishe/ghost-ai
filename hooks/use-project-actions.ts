"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { EditorProject } from "@/components/editor/project-types";

type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType;
  project?: EditorProject;
}

interface UseProjectActionsOptions {
  activeProjectId?: string;
}

const DEFAULT_PROJECT_NAME = "Untitled Project";

function slugifyProjectName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-project"
  );
}

function createShortSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function getProjectName(value: string) {
  return value.trim() || DEFAULT_PROJECT_NAME;
}

export function useProjectActions({ activeProjectId }: UseProjectActionsOptions = {}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<ProjectDialogState | null>(null);
  const [projectName, setProjectName] = useState("");
  const [roomIdSuffix, setRoomIdSuffix] = useState(createShortSuffix);
  const [isLoading, setIsLoading] = useState(false);

  const slugPreview = useMemo(() => {
    return `${slugifyProjectName(getProjectName(projectName))}-${roomIdSuffix}`;
  }, [projectName, roomIdSuffix]);

  function openCreateDialog() {
    setProjectName("");
    setRoomIdSuffix(createShortSuffix());
    setDialogState({ type: "create" });
  }

  function openRenameDialog(project: EditorProject) {
    setProjectName(project.name);
    setDialogState({ type: "rename", project });
  }

  function openDeleteDialog(project: EditorProject) {
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

async function createProject() {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: slugPreview,
        name: getProjectName(projectName),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create project.");
    }

    const { project } = (await response.json()) as { project: { id: string } };
    router.push(`/editor/${project.id}`);
  }

  async function renameProject(project: EditorProject) {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: getProjectName(projectName),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to rename project.");
    }

    router.refresh();
  }

  async function deleteProject(project: EditorProject) {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete project.");
    }

    if (activeProjectId === project.id) {
      router.push("/editor");
      return;
    }

    router.refresh();
  }

  async function submitDialog() {
    if (!dialogState || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      if (dialogState.type === "create") {
        await createProject();
      }

      if (dialogState.type === "rename" && dialogState.project) {
        await renameProject(dialogState.project);
      }

      if (dialogState.type === "delete" && dialogState.project) {
        await deleteProject(dialogState.project);
      }

      setDialogState(null);
      setProjectName("");
    } finally {
      setIsLoading(false);
    }
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
