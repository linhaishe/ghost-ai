"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  centerContent?: ReactNode;
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
  centerContent,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header className="flex h-14 w-full shrink-0 items-center border-b border-surface-border bg-surface px-4 text-copy-primary">
      <div className="flex flex-1 items-center justify-start">
        <Button
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
        >
          <SidebarIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center text-sm font-medium text-copy-secondary">
        {centerContent}
      </div>

      <div className="flex flex-1 items-center justify-end" />
    </header>
  );
}
