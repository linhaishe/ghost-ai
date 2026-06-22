"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/clerk-appearance";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
  centerContent,
  rightContent,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header className="flex h-14 w-full shrink-0 items-center border-b border-surface-border bg-surface px-4 text-copy-primary">
      <div className="flex flex-1 items-center justify-start gap-2">
        <Button
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
        >
          <SidebarIcon className="h-5 w-5" />
        </Button>
        <Link
          href="/editor"
          className="hidden text-sm font-semibold text-copy-primary transition-colors hover:text-brand sm:inline"
        >
          Ghost AI
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center text-sm font-medium text-copy-secondary">
        {centerContent}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {rightContent}
        <div className="flex size-8 shrink-0 items-center justify-center">
          <UserButton appearance={clerkAppearance} />
        </div>
      </div>
    </header>
  );
}
