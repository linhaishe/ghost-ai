"use client";

import { Download, X } from "lucide-react";

import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CanvasNode } from "@/types/canvas";

interface StarterTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (template: CanvasTemplate) => void;
}

const PREVIEW_WIDTH = 520;
const PREVIEW_HEIGHT = 260;
const PREVIEW_PADDING = 44;

function getNodeSize(node: CanvasNode) {
  const width = Number(node.style?.width ?? 140);
  const height = Number(node.style?.height ?? 80);

  return {
    width: Number.isFinite(width) ? width : 140,
    height: Number.isFinite(height) ? height : 80,
  };
}

function getTemplateBounds(nodes: CanvasNode[]) {
  const firstNode = nodes[0];

  if (!firstNode) {
    return { minX: 0, minY: 0, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };
  }

  let minX = firstNode.position.x;
  let minY = firstNode.position.y;
  let maxX = firstNode.position.x + getNodeSize(firstNode).width;
  let maxY = firstNode.position.y + getNodeSize(firstNode).height;

  for (const node of nodes) {
    const size = getNodeSize(node);

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

function createPreviewMapper(template: CanvasTemplate) {
  const bounds = getTemplateBounds(template.nodes);
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / bounds.width,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / bounds.height,
  );
  const fittedWidth = bounds.width * scale;
  const fittedHeight = bounds.height * scale;
  const offsetX = (PREVIEW_WIDTH - fittedWidth) / 2;
  const offsetY = (PREVIEW_HEIGHT - fittedHeight) / 2;

  return (x: number, y: number) => ({
    x: offsetX + (x - bounds.minX) * scale,
    y: offsetY + (y - bounds.minY) * scale,
  });
}

function getNodeCenter(node: CanvasNode) {
  const size = getNodeSize(node);

  return {
    x: node.position.x + size.width / 2,
    y: node.position.y + size.height / 2,
  };
}

function TemplatePreviewNode({ node, mapPoint }: {
  node: CanvasNode;
  mapPoint: (x: number, y: number) => { x: number; y: number };
}) {
  const size = getNodeSize(node);
  const origin = mapPoint(node.position.x, node.position.y);
  const end = mapPoint(node.position.x + size.width, node.position.y + size.height);
  const width = end.x - origin.x;
  const height = end.y - origin.y;
  const cx = origin.x + width / 2;
  const cy = origin.y + height / 2;
  const fill = node.data.color;
  const stroke = node.data.textColor;

  if (node.data.shape === "circle") {
    return (
      <ellipse
        cx={cx}
        cy={cy}
        rx={width / 2}
        ry={height / 2}
        fill={fill}
        stroke={stroke}
        strokeOpacity="0.4"
      />
    );
  }

  if (node.data.shape === "diamond") {
    return (
      <polygon
        points={`${cx},${origin.y} ${end.x},${cy} ${cx},${end.y} ${origin.x},${cy}`}
        fill={fill}
        stroke={stroke}
        strokeOpacity="0.4"
      />
    );
  }

  if (node.data.shape === "hexagon") {
    const left = origin.x;
    const right = end.x;
    const top = origin.y;
    const bottom = end.y;
    const inset = width * 0.24;

    return (
      <polygon
        points={`${left + inset},${top} ${right - inset},${top} ${right},${cy} ${right - inset},${bottom} ${left + inset},${bottom} ${left},${cy}`}
        fill={fill}
        stroke={stroke}
        strokeOpacity="0.4"
      />
    );
  }

  if (node.data.shape === "cylinder") {
    return (
      <g>
        <path
          d={`M${origin.x},${origin.y + height * 0.18} C${origin.x},${origin.y} ${end.x},${origin.y} ${end.x},${origin.y + height * 0.18} L${end.x},${end.y - height * 0.18} C${end.x},${end.y} ${origin.x},${end.y} ${origin.x},${end.y - height * 0.18} Z`}
          fill={fill}
          stroke={stroke}
          strokeOpacity="0.4"
        />
        <ellipse
          cx={cx}
          cy={origin.y + height * 0.18}
          rx={width / 2}
          ry={height * 0.18}
          fill={fill}
          stroke={stroke}
          strokeOpacity="0.4"
        />
      </g>
    );
  }

  return (
    <rect
      x={origin.x}
      y={origin.y}
      width={width}
      height={height}
      rx={node.data.shape === "pill" ? height / 2 : 9}
      fill={fill}
      stroke={stroke}
      strokeOpacity="0.4"
    />
  );
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const mapPoint = createPreviewMapper(template);
  const nodeMap = new Map(template.nodes.map((node) => [node.id, node]));

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
    >
      <rect width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill="#050505" />
      {template.edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (!source || !target) {
          return null;
        }

        const sourceCenter = mapPoint(getNodeCenter(source).x, getNodeCenter(source).y);
        const targetCenter = mapPoint(getNodeCenter(target).x, getNodeCenter(target).y);

        return (
          <line
            key={edge.id}
            x1={sourceCenter.x}
            y1={sourceCenter.y}
            x2={targetCenter.x}
            y2={targetCenter.y}
            stroke="rgba(237,237,237,0.24)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      {template.nodes.map((node) => (
        <TemplatePreviewNode key={node.id} node={node} mapPoint={mapPoint} />
      ))}
    </svg>
  );
}

export function StarterTemplatesModal({
  isOpen,
  onClose,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex !h-[calc(100dvh-2rem)] !max-h-[calc(100dvh-2rem)] !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] flex-col gap-8 overflow-hidden rounded-[2rem] border border-surface-border bg-elevated p-7 text-copy-primary shadow-2xl backdrop-blur md:!h-[88dvh] md:!max-h-[88dvh] md:!w-[70vw] md:!max-w-[70vw] sm:p-9"
      >
        <DialogClose asChild>
          <button
            type="button"
            className="absolute right-6 top-6 flex size-12 items-center justify-center rounded-full border border-surface-border bg-surface/70 text-copy-muted transition hover:bg-surface hover:text-copy-primary"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </DialogClose>

        <div className="pr-16">
          <DialogTitle className="text-3xl font-semibold tracking-normal text-copy-primary">
            Import Template
          </DialogTitle>
          <DialogDescription className="mt-4 text-base leading-7 text-copy-muted">
            Choose a starter template to pre-populate your canvas. Any existing nodes will be
            replaced - use <kbd className="rounded-md border border-surface-border bg-surface px-1.5 py-0.5 text-sm text-copy-secondary">⌘Z</kbd> to undo.
          </DialogDescription>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-3">
          {CANVAS_TEMPLATES.map((template) => (
            <article
              key={template.id}
              className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-surface-border bg-surface shadow-xl"
            >
              <div className="h-[42%] min-h-52 border-b border-surface-border bg-black">
                <TemplatePreview template={template} />
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold text-copy-primary">{template.name}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-copy-muted">
                  {template.description}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 h-12 w-full border-surface-border bg-transparent text-base font-semibold text-copy-primary hover:bg-elevated"
                  onClick={() => {
                    onImport(template);
                    onClose();
                  }}
                >
                  <Download className="h-5 w-5" />
                  Import
                </Button>
              </div>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
