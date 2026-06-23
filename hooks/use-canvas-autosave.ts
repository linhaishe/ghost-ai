"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CanvasEdge, CanvasNode, CanvasState } from "@/types/canvas";

export type CanvasSaveStatus = "saving" | "saved" | "error";

interface UseCanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  enabled: boolean;
  debounceMs?: number;
}

interface UseCanvasAutosaveResult {
  status: CanvasSaveStatus;
  saveNow: () => Promise<void>;
}

const DEFAULT_DEBOUNCE_MS = 1200;

function createCanvasState(nodes: CanvasNode[], edges: CanvasEdge[]): CanvasState {
  return {
    nodes,
    edges,
  };
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<CanvasSaveStatus>("saved");
  const latestCanvasRef = useRef(createCanvasState(nodes, edges));
  const latestSaveIdRef = useRef(0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    latestCanvasRef.current = createCanvasState(nodes, edges);
  }, [edges, nodes]);

  const saveNow = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const saveId = latestSaveIdRef.current + 1;
    latestSaveIdRef.current = saveId;
    setStatus("saving");

    try {
      const response = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(latestCanvasRef.current),
      });

      if (!response.ok) {
        throw new Error("Canvas save failed");
      }

      if (latestSaveIdRef.current === saveId) {
        setStatus("saved");
      }
    } catch {
      if (latestSaveIdRef.current === saveId) {
        setStatus("error");
      }
    }
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveNow();
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, edges, enabled, nodes, saveNow]);

  return {
    status,
    saveNow,
  };
}
