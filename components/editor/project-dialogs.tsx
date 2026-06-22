"use client";

import { FormEvent } from "react";

import { EditorDialogContent } from "@/components/editor/editor-dialog";
import type { EditorProject } from "@/components/editor/project-types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProjectDialogType = "create" | "rename" | "delete";

interface ProjectDialogState {
  type: ProjectDialogType;
  project?: EditorProject;
}

interface ProjectDialogsProps {
  dialogState: ProjectDialogState | null;
  isLoading: boolean;
  projectName: string;
  slugPreview: string;
  onProjectNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}

export function ProjectDialogs({
  dialogState,
  isLoading,
  projectName,
  slugPreview,
  onProjectNameChange,
  onClose,
  onSubmit,
}: ProjectDialogsProps) {
  const isOpen = dialogState !== null;

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {dialogState?.type === "create" ? (
        <EditorDialogContent
          title="Create Project"
          description="Name the architecture workspace you want to start."
          footerActions={
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" form="create-project-form" disabled={isLoading}>
                Create Project
              </Button>
            </>
          }
        >
          <form id="create-project-form" className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-copy-secondary" htmlFor="project-name">
                Project name
              </label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                placeholder="Payments Platform"
              />
            </div>
            <div className="rounded-xl border border-surface-border bg-subtle px-3 py-2 text-sm text-copy-muted">
              Room ID preview: <span className="font-medium text-brand">{slugPreview}</span>
            </div>
          </form>
        </EditorDialogContent>
      ) : null}

      {dialogState?.type === "rename" && dialogState.project ? (
        <EditorDialogContent
          title="Rename Project"
          description={`Current project name: ${dialogState.project.name}`}
          footerActions={
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" form="rename-project-form" disabled={isLoading}>
                Save Rename
              </Button>
            </>
          }
        >
          <form id="rename-project-form" className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-copy-secondary" htmlFor="rename-project-name">
                Project name
              </label>
              <Input
                id="rename-project-name"
                value={projectName}
                onChange={(event) => onProjectNameChange(event.target.value)}
                autoFocus
                className="text-copy-primary"
              />
            </div>
          </form>
        </EditorDialogContent>
      ) : null}

      {dialogState?.type === "delete" && dialogState.project ? (
        <EditorDialogContent
          title="Delete Project"
          description={`Delete "${dialogState.project.name}"? This project will be permanently removed.`}
          footerActions={
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void onSubmit()} disabled={isLoading}>
                Delete Project
              </Button>
            </>
          }
        />
      ) : null}
    </Dialog>
  );
}
