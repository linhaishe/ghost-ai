"use client";

import type { ReactNode } from "react";

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface EditorDialogContentProps {
  title: ReactNode;
  description?: ReactNode;
  footerActions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EditorDialogContent({
  title,
  description,
  footerActions,
  children,
  className,
}: EditorDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "gap-6 rounded-3xl border border-surface-border bg-elevated p-6 text-copy-primary shadow-2xl backdrop-blur",
        className,
      )}
    >
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-copy-primary">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-sm leading-6 text-copy-muted">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>

      {children}

      {footerActions ? (
        <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-surface-border bg-subtle/70 px-6 py-4">
          {footerActions}
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}
