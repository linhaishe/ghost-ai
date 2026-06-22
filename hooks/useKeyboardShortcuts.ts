"use client";

import type { ReactFlowInstance } from "@xyflow/react";
import { useEffect } from "react";

import type { CanvasEdge, CanvasNode } from "@/types/canvas";

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: ReactFlowInstance<CanvasNode, CanvasEdge> | null;
  onUndo: () => void;
  onRedo: () => void;
}

const ZOOM_DURATION = 160;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

export function useKeyboardShortcuts({
  reactFlowInstance,
  onUndo,
  onRedo,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isModKey = event.metaKey || event.ctrlKey;

      if (!isModKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        void reactFlowInstance?.zoomIn({ duration: ZOOM_DURATION });
        return;
      }

      if (!isModKey && event.key === "-") {
        event.preventDefault();
        void reactFlowInstance?.zoomOut({ duration: ZOOM_DURATION });
        return;
      }

      if (isModKey && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }

        return;
      }

      if (isModKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onRedo, onUndo, reactFlowInstance]);
}
