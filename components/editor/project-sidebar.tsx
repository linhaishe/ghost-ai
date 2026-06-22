"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { EditorProject } from "@/components/editor/project-types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  ownedProjects: EditorProject[];
  sharedProjects: EditorProject[];
  onCreateProject: () => void;
  onRenameProject: (project: EditorProject) => void;
  onDeleteProject: (project: EditorProject) => void;
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
  activeProjectId,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: {
  emptyLabel: string;
  projects: EditorProject[];
  activeProjectId?: string;
  onOpenProject: (project: EditorProject) => void;
  onRenameProject: (project: EditorProject) => void;
  onDeleteProject: (project: EditorProject) => void;
}) {
  if (projects.length === 0) {
    return <EmptyProjectsState label={emptyLabel} />;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors",
            project.id === activeProjectId
              ? "border-brand/40 bg-brand/15 shadow-[0_0_0_1px_var(--accent-primary-dim)]"
              : "border-surface-border bg-subtle/50 hover:bg-subtle",
          )}
        >
          <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onOpenProject(project)}>
            <span className="flex items-center gap-2 truncate text-sm font-medium text-copy-primary">
              {project.id === activeProjectId ? (
                <span className="size-2 shrink-0 rounded-full bg-brand" />
              ) : null}
              <span className="truncate">{project.name}</span>
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
  activeProjectId,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  const router = useRouter();

  function openProject(project: EditorProject) {
    router.push(`/editor/${project.id}`);
    onClose();
  }

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
          "fixed bottom-4 left-4 top-[4.5rem] z-40 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 text-copy-primary shadow-2xl backdrop-blur transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]",
        )}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-4">
          <h2 className="text-base font-semibold text-copy-primary">Projects</h2>
          <Button aria-label="Close project sidebar" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="my-projects" className="min-h-0 flex-1 px-3 py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>
          <TabsContent value="my-projects" className="mt-4">
            <ProjectList
              emptyLabel="My Projects"
              projects={ownedProjects}
              activeProjectId={activeProjectId}
              onOpenProject={openProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-4">
            <ProjectList
              emptyLabel="Shared Projects"
              projects={sharedProjects}
              activeProjectId={activeProjectId}
              onOpenProject={openProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
        </Tabs>

        <div className="border-t border-surface-border p-4">
          <Button className="w-full" type="button" onClick={onCreateProject}>
            <Plus className="h-5 w-5" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  );
}
