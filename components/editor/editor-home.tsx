"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorHomeProps {
  onCreateProject: () => void;
}

export function EditorHome({ onCreateProject }: EditorHomeProps) {
  return (
    <div className="flex max-w-xl flex-col items-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-copy-primary">
        Create a project or open an existing one
      </h1>
      <p className="mt-4 text-base leading-7 text-copy-muted">
        Start a new architecture workspace, or choose a project from the sidebar.
      </p>
      <Button className="mt-8" type="button" onClick={onCreateProject}>
        <Plus className="h-5 w-5" />
        New Project
      </Button>
    </div>
  );
}
