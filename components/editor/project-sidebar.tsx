"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function EmptyProjectsState({ label }: { label: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-subtle/40 px-6 text-center">
      <p className="text-sm font-medium text-copy-secondary">{label}</p>
      <p className="mt-2 text-sm text-copy-muted">No projects to show yet.</p>
    </div>
  );
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
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
          <EmptyProjectsState label="My Projects" />
        </TabsContent>
        <TabsContent value="shared" className="mt-4">
          <EmptyProjectsState label="Shared Projects" />
        </TabsContent>
      </Tabs>

      <Button className="mt-4 w-full" type="button">
        <Plus className="h-5 w-5" />
        New Project
      </Button>
    </aside>
  );
}
