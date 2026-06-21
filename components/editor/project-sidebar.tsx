"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";

import type { MockProject } from "@/components/editor/project-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: MockProject[];
  onCreateProject: () => void;
  onRenameProject: (project: MockProject) => void;
  onDeleteProject: (project: MockProject) => void;
}

function EmptyProjectsState({ label }: { label: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-subtle/40 px-6 text-center">
      <p className="text-sm font-medium text-copy-secondary">{label}</p>
      <p className="mt-2 text-sm text-copy-muted">No projects to show yet.</p>
    </div>
  );
}

function ProjectList({
  emptyLabel,
  projects,
  onRenameProject,
  onDeleteProject,
}: {
  emptyLabel: string;
  projects: MockProject[];
  onRenameProject: (project: MockProject) => void;
  onDeleteProject: (project: MockProject) => void;
}) {
  if (projects.length === 0) {
    return <EmptyProjectsState label={emptyLabel} />;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-subtle/50 px-3 py-3"
        >
          <button className="min-w-0 flex-1 text-left" type="button">
            <span className="block truncate text-sm font-medium text-copy-primary">
              {project.name}
            </span>
            <span className="mt-1 block truncate text-xs text-copy-muted">/{project.slug}</span>
          </button>

          {project.ownerType === "owned" ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label={`Rename ${project.name}`}
                variant="ghost"
                size="icon-xs"
                onClick={() => onRenameProject(project)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                aria-label={`Delete ${project.name}`}
                variant="ghost"
                size="icon-xs"
                onClick={() => onDeleteProject(project)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const ownedProjects = projects.filter((project) => project.ownerType === "owned");
  const sharedProjects = projects.filter((project) => project.ownerType === "shared");

  return (
    <>
      <button
        aria-hidden={!isOpen}
        aria-label="Close project sidebar"
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        type="button"
        onClick={onClose}
      />

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "fixed bottom-4 left-4 top-16 z-40 flex w-80 flex-col rounded-2xl border border-surface-border bg-surface/95 p-4 text-copy-primary shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <h2 className="text-base font-semibold text-copy-primary">Projects</h2>
          <Button aria-label="Close project sidebar" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="mt-4 min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="mt-4">
            <ProjectList
              emptyLabel="My Projects"
              projects={ownedProjects}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-4">
            <ProjectList
              emptyLabel="Shared Projects"
              projects={sharedProjects}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
        </Tabs>

        <Button className="mt-4 w-full" type="button" onClick={onCreateProject}>
          <Plus className="h-5 w-5" />
          New Project
        </Button>
      </aside>
    </>
  );
}
