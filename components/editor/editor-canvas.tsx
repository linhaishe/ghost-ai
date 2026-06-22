"use client";

import { useUser } from "@clerk/nextjs";
import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useOthers,
  useRedo,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  NodeResizeControl,
  Position,
  ResizeControlVariant,
  ReactFlow,
  getSmoothStepPath,
} from "@xyflow/react";
import type { Connection } from "@xyflow/react";
import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Database,
  Diamond,
  Maximize2,
  Hexagon,
  Redo2,
  RectangleHorizontal,
  SquareRoundCorner,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { useCanvasAutosave, type CanvasSaveStatus } from "@/hooks/use-canvas-autosave";
import type { CanvasEdge, CanvasNode, CanvasNodeShape, CanvasShapeDragPayload } from "@/types/canvas";
import {
  DEFAULT_CANVAS_NODE_TEXT_COLOR,
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  CANVAS_SHAPE_DEFAULT_SIZES,
  CANVAS_SHAPE_DRAG_TYPE,
  CANVAS_NODE_MIN_SIZE,
  DEFAULT_CANVAS_NODE_COLOR,
  NODE_COLORS,
  type CanvasNodeColorPair,
} from "@/types/canvas";
import type { NodeProps, ReactFlowInstance } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

interface EditorCanvasProps {
  roomId: string;
  isStarterTemplatesOpen: boolean;
  onStarterTemplatesOpenChange: (isOpen: boolean) => void;
  saveRequestId: number;
  onSaveStatusChange: (status: CanvasSaveStatus) => void;
}

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

interface ShapePreviewState extends CanvasShapeDragPayload {
  x: number;
  y: number;
}

const SHAPE_TOOLS = [
  { shape: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { shape: "diamond", label: "Diamond", icon: Diamond },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "pill", label: "Pill", icon: SquareRoundCorner },
  { shape: "cylinder", label: "Cylinder", icon: Database },
  { shape: "hexagon", label: "Hexagon", icon: Hexagon },
] satisfies {
  shape: CanvasNodeShape;
  label: string;
  icon: typeof RectangleHorizontal;
}[];

const NODE_HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

const NODE_RESIZE_CONTROL_POSITIONS = ["top", "right", "bottom", "left"] as const;

const DEFAULT_EDGE_LABEL = "";
const CANVAS_VIEWPORT_ANIMATION_DURATION = 160;
const MAX_COLLABORATOR_AVATARS = 5;

function CanvasLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-sm text-copy-muted">
      Loading shared canvas...
    </div>
  );
}

function CanvasErrorState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-copy-primary">Canvas connection issue</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-copy-muted">
          The shared canvas could not connect. Check the Liveblocks room access and try again.
        </p>
      </div>
    </div>
  );
}

function getRestingStroke(textColor: string) {
  return `color-mix(in srgb, ${textColor} 48%, transparent)`;
}

function getShapeStyle(color: string, textColor: string, selected = false): CSSProperties {
  return {
    "--shape-fill": color,
    "--shape-text": textColor,
    "--shape-stroke": selected ? textColor : getRestingStroke(textColor),
  } as CSSProperties;
}

function getNodeTextColor(data: CanvasNode["data"]) {
  return data.textColor || DEFAULT_CANVAS_NODE_TEXT_COLOR;
}

function hideNativeDragPreview(dataTransfer: DataTransfer) {
  const dragImage = document.createElement("div");
  dragImage.style.height = "1px";
  dragImage.style.left = "-9999px";
  dragImage.style.opacity = "0";
  dragImage.style.position = "fixed";
  dragImage.style.top = "-9999px";
  dragImage.style.width = "1px";
  document.body.appendChild(dragImage);
  dataTransfer.setDragImage(dragImage, 0, 0);
  window.setTimeout(() => dragImage.remove(), 0);
}

function ShapeLabel({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  const displayLabel = label || placeholder || "";

  return (
    <span
      className="relative z-10 max-w-[calc(100%-1.5rem)] truncate text-center text-sm font-medium text-[color:var(--shape-text)] data-[placeholder=true]:opacity-55"
      data-placeholder={!label && Boolean(placeholder)}
    >
      {displayLabel}
    </span>
  );
}

function SvgShapeShell({
  children,
  label,
  placeholder,
  color,
  textColor,
  selected,
}: {
  children: ReactNode;
  label: string;
  placeholder?: string;
  color: string;
  textColor: string;
  selected?: boolean;
}) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center drop-shadow-lg"
      style={getShapeStyle(color, textColor, selected)}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {children}
      </svg>
      <ShapeLabel label={label} placeholder={placeholder} />
    </div>
  );
}

function CanvasShape({
  shape,
  label,
  placeholder,
  color,
  textColor,
  selected,
}: {
  shape: CanvasNodeShape;
  label: string;
  placeholder?: string;
  color: string;
  textColor: string;
  selected?: boolean;
}) {
  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className="flex h-full w-full items-center justify-center border shadow-lg"
        style={{
          ...getShapeStyle(color, textColor, selected),
          background: "var(--shape-fill)",
          borderColor: "var(--shape-stroke)",
          borderRadius:
            shape === "circle" ? "9999px" : shape === "pill" ? "9999px" : "0.75rem",
        }}
      >
        <ShapeLabel label={label} placeholder={placeholder} />
      </div>
    );
  }

  if (shape === "diamond") {
    return (
      <SvgShapeShell
        label={label}
        placeholder={placeholder}
        color={color}
        textColor={textColor}
        selected={selected}
      >
        <polygon
          points="50 2 98 50 50 98 2 50"
          fill="var(--shape-fill)"
          stroke="var(--shape-stroke)"
          strokeLinejoin="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </SvgShapeShell>
    );
  }

  if (shape === "hexagon") {
    return (
      <SvgShapeShell
        label={label}
        placeholder={placeholder}
        color={color}
        textColor={textColor}
        selected={selected}
      >
        <polygon
          points="25 3 75 3 98 50 75 97 25 97 2 50"
          fill="var(--shape-fill)"
          stroke="var(--shape-stroke)"
          strokeLinejoin="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </SvgShapeShell>
    );
  }

  return (
    <SvgShapeShell
      label={label}
      placeholder={placeholder}
      color={color}
      textColor={textColor}
      selected={selected}
    >
      <path
        d="M8 18 C8 10 92 10 92 18 L92 82 C92 90 8 90 8 82 Z"
        fill="var(--shape-fill)"
        stroke="var(--shape-stroke)"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <ellipse
        cx="50"
        cy="18"
        rx="42"
        ry="10"
        fill="var(--shape-fill)"
        stroke="var(--shape-stroke)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M8 82 C8 74 92 74 92 82"
        fill="none"
        stroke="var(--shape-stroke)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </SvgShapeShell>
  );
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <CanvasErrorState />;
    }

    return this.props.children;
  }
}

function CanvasNodeRenderer({
  id,
  data,
  selected,
  onLabelChange,
  onColorChange,
}: NodeProps<CanvasNode> & {
  onLabelChange: (nodeId: string, label: string) => void;
  onColorChange: (nodeId: string, colorPair: CanvasNodeColorPair) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const textColor = getNodeTextColor(data);
  const closeEditing = useCallback(() => {
    setIsEditing(false);
  }, []);
  const handleEditKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();

    if (event.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  return (
    <div className="group/node relative h-full w-full">
      {selected ? (
        <NodeColorToolbar
          activeColor={data.color}
          activeTextColor={textColor}
          onColorSelect={(colorPair) => onColorChange(id, colorPair)}
        />
      ) : null}
      <ShapeConnectionHandles textColor={textColor} />
      <ShapeResizeControls isVisible={selected} textColor={textColor} />
      <div
        className="h-full w-full"
        onDoubleClick={(event) => {
          event.stopPropagation();
          setIsEditing(true);
        }}
      >
        <CanvasShape
          shape={data.shape}
          label={isEditing ? "" : data.label}
          placeholder={isEditing ? undefined : "Label"}
          color={data.color}
          textColor={textColor}
          selected={selected}
        />
      </div>
      {isEditing ? (
        <textarea
          value={data.label}
          autoFocus
          aria-label="Edit node label"
          placeholder="Label"
          onBlur={closeEditing}
          onChange={(event) => onLabelChange(id, event.target.value)}
          onKeyDown={handleEditKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          className="nodrag nopan absolute left-1/2 top-1/2 z-20 max-h-[calc(100%-1rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 resize-none overflow-hidden border-none bg-transparent p-0 text-center text-sm font-medium leading-5 placeholder:opacity-55 outline-none"
          style={{
            color: textColor,
          }}
          rows={2}
        />
      ) : null}
    </div>
  );
}

function ShapeConnectionHandles({ textColor }: { textColor: string }) {
  return (
    <>
      {NODE_HANDLE_POSITIONS.map((position) => (
        <Handle
          key={position}
          id={position}
          type="source"
          position={position}
          className="!h-2.5 !w-2.5 !border !border-background !bg-copy-primary !opacity-0 !transition group-hover/node:!opacity-100"
          style={{
            boxShadow: `0 0 0 1px ${textColor}`,
          }}
        />
      ))}
    </>
  );
}

function ShapeResizeControls({
  isVisible,
  textColor,
}: {
  isVisible: boolean;
  textColor: string;
}) {
  if (!isVisible) {
    return null;
  }

  return (
    <>
      {NODE_RESIZE_CONTROL_POSITIONS.map((position) => (
        <NodeResizeControl
          key={position}
          position={position}
          variant={ResizeControlVariant.Handle}
          minWidth={CANVAS_NODE_MIN_SIZE.width}
          minHeight={CANVAS_NODE_MIN_SIZE.height}
          className="nodrag nopan !h-2.5 !w-2.5 !rounded-full !border !border-background !bg-elevated"
          style={{
            boxShadow: `0 0 0 1px ${textColor}`,
          }}
        />
      ))}
    </>
  );
}

function NodeColorToolbar({
  activeColor,
  activeTextColor,
  onColorSelect,
}: {
  activeColor: string;
  activeTextColor: string;
  onColorSelect: (colorPair: CanvasNodeColorPair) => void;
}) {
  return (
    <div
      className="nodrag nopan absolute bottom-full left-1/2 z-30 mb-3 flex -translate-x-1/2 items-center gap-1 rounded-full border border-surface-border bg-surface/95 px-2 py-1.5 shadow-xl backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {NODE_COLORS.map((colorPair) => {
        const isActive =
          colorPair.color === activeColor && colorPair.textColor === activeTextColor;

        return (
          <button
            key={colorPair.name}
            type="button"
            aria-label={`Use ${colorPair.name} node color`}
            title={colorPair.name}
            onClick={(event) => {
              event.stopPropagation();
              onColorSelect(colorPair);
            }}
            className="group flex size-6 items-center justify-center rounded-full transition"
            style={{
              boxShadow: isActive ? `0 0 0 2px ${colorPair.textColor}` : undefined,
            }}
          >
            <span
              className="block size-4 rounded-full border transition group-hover:shadow-[0_0_0_3px_var(--swatch-glow)]"
              style={
                {
                  "--swatch-glow": `color-mix(in srgb, ${colorPair.textColor} 28%, transparent)`,
                  background: colorPair.color,
                  borderColor: colorPair.textColor,
                } as CSSProperties
              }
            />
          </button>
        );
      })}
    </div>
  );
}

function CanvasEdgeRenderer({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  onLabelChange,
}: EdgeProps<CanvasEdge> & {
  onLabelChange: (edgeId: string, label: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data?.label ?? DEFAULT_EDGE_LABEL);
  const isActive = selected || isHovered || isEditing;
  const savedLabel = data?.label ?? DEFAULT_EDGE_LABEL;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
    offset: 28,
  });

  const beginEditing = useCallback(() => {
    setDraftLabel(savedLabel);
    setIsEditing(true);
  }, [savedLabel]);
  const saveLabel = useCallback(() => {
    onLabelChange(id, draftLabel.trim());
    setIsEditing(false);
  }, [draftLabel, id, onLabelChange]);
  const handleLabelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();

      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        saveLabel();
      }
    },
    [saveLabel],
  );

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        beginEditing();
      }}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          stroke: isActive ? "var(--text-primary)" : "rgba(248, 250, 252, 0.42)",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: isActive ? 2 : 1.5,
          transition: "stroke 120ms ease, stroke-width 120ms ease",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation();
            beginEditing();
          }}
        >
          {isEditing ? (
            <input
              autoFocus
              aria-label="Edit edge label"
              value={draftLabel}
              onBlur={saveLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={handleLabelKeyDown}
              className="nodrag nopan h-7 rounded-full border border-surface-border bg-surface px-2 text-center text-xs font-medium text-copy-primary outline-none ring-1 ring-brand/50"
              style={{
                width: `${Math.max(6, draftLabel.length + 2)}ch`,
              }}
            />
          ) : savedLabel ? (
            <button
              type="button"
              className="rounded-full border border-surface-border bg-surface/95 px-2 py-1 text-xs font-medium text-copy-primary shadow-lg backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              {savedLabel}
            </button>
          ) : isActive ? (
            <button
              type="button"
              className="rounded-full border border-dashed border-surface-border bg-surface/70 px-2 py-1 text-xs font-medium text-copy-faint backdrop-blur"
              onClick={(event) => {
                event.stopPropagation();
                beginEditing();
              }}
            >
              Label
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

function ShapeDragPreview({ preview }: { preview: ShapePreviewState | null }) {
  if (!preview) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 opacity-70"
      style={{
        transform: `translate(${preview.x + 14}px, ${preview.y + 14}px)`,
        width: preview.size.width,
        height: preview.size.height,
      }}
    >
      <CanvasShape
        shape={preview.shape}
        label=""
        color={DEFAULT_CANVAS_NODE_COLOR}
        textColor={DEFAULT_CANVAS_NODE_TEXT_COLOR}
        selected
      />
    </div>
  );
}

function ShapePanel({
  onPreviewStart,
  onPreviewMove,
  onPreviewEnd,
}: {
  onPreviewStart: (payload: CanvasShapeDragPayload, x: number, y: number) => void;
  onPreviewMove: (x: number, y: number) => void;
  onPreviewEnd: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-surface-border bg-surface/95 px-3 py-2 shadow-2xl backdrop-blur">
      {SHAPE_TOOLS.map(({ shape, label, icon: Icon }) => (
        <button
          key={shape}
          type="button"
          draggable
          aria-label={`Drag ${label}`}
          title={label}
          onDragStart={(event) => {
            const payload: CanvasShapeDragPayload = {
              shape,
              size: CANVAS_SHAPE_DEFAULT_SIZES[shape],
            };

            event.dataTransfer.effectAllowed = "copy";
            event.dataTransfer.setData(CANVAS_SHAPE_DRAG_TYPE, JSON.stringify(payload));
            event.dataTransfer.setData("text/plain", shape);
            hideNativeDragPreview(event.dataTransfer);
            onPreviewStart(payload, event.clientX, event.clientY);
          }}
          onDrag={(event) => {
            if (event.clientX === 0 && event.clientY === 0) {
              return;
            }

            onPreviewMove(event.clientX, event.clientY);
          }}
          onDragEnd={() => {
            onPreviewEnd();
          }}
          className="flex size-10 cursor-grab items-center justify-center rounded-full text-copy-muted transition hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

function CanvasControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="nodrag nopan flex size-9 items-center justify-center rounded-full text-copy-muted transition hover:bg-elevated hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-copy-muted"
    >
      {children}
    </button>
  );
}

function CanvasControlBar({
  canZoom,
  canUndo,
  canRedo,
  onZoomOut,
  onFitView,
  onZoomIn,
  onUndo,
  onRedo,
}: {
  canZoom: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onZoomOut: () => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-5 z-10 flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 px-2 py-2 shadow-2xl backdrop-blur">
      <CanvasControlButton label="Zoom out" disabled={!canZoom} onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </CanvasControlButton>
      <CanvasControlButton label="Fit view" disabled={!canZoom} onClick={onFitView}>
        <Maximize2 className="h-4 w-4" />
      </CanvasControlButton>
      <CanvasControlButton label="Zoom in" disabled={!canZoom} onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </CanvasControlButton>
      <div className="mx-1 h-6 w-px bg-surface-border" />
      <CanvasControlButton label="Undo" disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </CanvasControlButton>
      <CanvasControlButton label="Redo" disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </CanvasControlButton>
    </div>
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function CollaboratorAvatar({
  name,
  avatarUrl,
  color,
  index,
}: {
  name: string;
  avatarUrl: string | null;
  color: string;
  index: number;
}) {
  return (
    <div
      aria-label={name}
      title={name}
      className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-background bg-elevated text-xs font-semibold text-copy-primary shadow-lg ring-2"
      style={{
        marginLeft: index === 0 ? 0 : -8,
        boxShadow: `0 0 0 2px ${color}`,
        zIndex: MAX_COLLABORATOR_AVATARS - index,
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

function ParticipantAvatarGroup() {
  const { user } = useUser();
  const others = useOthers();
  const collaborators = others.filter((other) => other.id !== user?.id);
  const visibleCollaborators = collaborators.slice(0, MAX_COLLABORATOR_AVATARS);
  const overflowCount = Math.max(collaborators.length - MAX_COLLABORATOR_AVATARS, 0);

  if (!visibleCollaborators.length) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute right-5 top-5 z-10 flex items-center rounded-full border border-surface-border bg-surface/95 px-2 py-2 shadow-2xl backdrop-blur">
      <div className="flex items-center pl-1">
        {visibleCollaborators.map((collaborator, index) => (
          <CollaboratorAvatar
            key={collaborator.connectionId}
            name={collaborator.info.name}
            avatarUrl={collaborator.info.avatarUrl}
            color={collaborator.info.cursorColor}
            index={index}
          />
        ))}
        {overflowCount ? (
          <div
            className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-background bg-elevated text-xs font-semibold text-copy-primary shadow-lg ring-2 ring-surface-border"
            style={{
              marginLeft: -8,
              zIndex: 0,
            }}
          >
            +{overflowCount}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RemoteCursors() {
  const { user } = useUser();
  const others = useOthers();
  const collaborators = others.filter(
    (other) => other.id !== user?.id && other.presence.cursor,
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {collaborators.map((collaborator) => {
        const cursor = collaborator.presence.cursor;

        if (!cursor) {
          return null;
        }

        const color = collaborator.info.cursorColor;

        return (
          <div
            key={collaborator.connectionId}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5 drop-shadow-lg"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M3 2 L16 10 L10 12 L7 18 Z"
                fill={color}
                stroke="rgba(2,6,23,0.78)"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            <div
              className="ml-4 mt-1 rounded-full px-2.5 py-1 text-xs font-semibold text-background shadow-lg"
              style={{
                background: color,
              }}
            >
              {collaborator.info.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function cloneTemplateNode(node: CanvasNode): CanvasNode {
  return {
    ...node,
    selected: false,
    position: {
      ...node.position,
    },
    data: {
      ...node.data,
    },
    style: {
      ...node.style,
    },
  };
}

function cloneTemplateEdge(edge: CanvasEdge): CanvasEdge {
  return {
    ...edge,
    selected: false,
    data: {
      label: edge.data?.label ?? DEFAULT_EDGE_LABEL,
    },
    markerEnd:
      typeof edge.markerEnd === "object" && edge.markerEnd
        ? {
            ...edge.markerEnd,
          }
        : edge.markerEnd,
  };
}

function SyncedReactFlowCanvas({
  isStarterTemplatesOpen,
  onStarterTemplatesOpenChange,
  roomId,
  saveRequestId,
  onSaveStatusChange,
}: Pick<
  EditorCanvasProps,
  "isStarterTemplatesOpen" | "onStarterTemplatesOpenChange" | "roomId" | "saveRequestId" | "onSaveStatusChange"
>) {
  const { nodes, edges, onNodesChange, onEdgesChange, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: {
        initial: [],
      },
      edges: {
        initial: [],
      },
    });
  const nodeCounterRef = useRef(0);
  const edgeCounterRef = useRef(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedSavedCanvasRef = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreviewState | null>(null);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);
  const updateMyPresence = useUpdateMyPresence();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { status: saveStatus, saveNow } = useCanvasAutosave({
    projectId: roomId,
    nodes,
    edges,
    enabled: isAutosaveEnabled,
  });
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    onSaveStatusChange(saveStatus);
  }, [onSaveStatusChange, saveStatus]);
  useEffect(() => {
    if (saveRequestId === 0) {
      return;
    }

    void saveNow();
  }, [saveNow, saveRequestId]);
  useEffect(() => {
    if (hasLoadedSavedCanvasRef.current) {
      return;
    }

    hasLoadedSavedCanvasRef.current = true;

    if (nodesRef.current.length > 0 || edgesRef.current.length > 0) {
      setIsAutosaveEnabled(true);
      return;
    }

    let isCancelled = false;

    async function loadSavedCanvas() {
      try {
        const response = await fetch(`/api/projects/${roomId}/canvas`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          canvas?: {
            nodes?: CanvasNode[];
            edges?: CanvasEdge[];
          } | null;
        };
        const savedCanvas = payload.canvas;

        if (
          isCancelled ||
          !savedCanvas ||
          nodesRef.current.length > 0 ||
          edgesRef.current.length > 0
        ) {
          return;
        }

        if (savedCanvas.edges?.length) {
          onEdgesChange(savedCanvas.edges.map((edge) => ({ type: "add" as const, item: edge })));
        }

        if (savedCanvas.nodes?.length) {
          onNodesChange(savedCanvas.nodes.map((node) => ({ type: "add" as const, item: node })));
        }

        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            void reactFlowInstance?.fitView({
              duration: CANVAS_VIEWPORT_ANIMATION_DURATION,
              padding: 0.2,
            });
          });
        });
      } finally {
        if (!isCancelled) {
          setIsAutosaveEnabled(true);
        }
      }
    }

    void loadSavedCanvas();

    return () => {
      isCancelled = true;
    };
  }, [onEdgesChange, onNodesChange, reactFlowInstance, roomId]);
  const renderedEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: edge.type ?? CANVAS_EDGE_TYPE,
        data: {
          label: edge.data?.label ?? DEFAULT_EDGE_LABEL,
        },
        markerEnd: edge.markerEnd ?? {
          type: MarkerType.ArrowClosed,
          color: "#f8fafc",
        },
        interactionWidth: edge.interactionWidth ?? 24,
        reconnectable: true,
      })),
    [edges],
  );
  const replaceNodeData = useCallback(
    (nodeId: string, dataPatch: Partial<CanvasNode["data"]>) => {
      const currentNode = nodesRef.current.find((node) => node.id === nodeId);

      if (!currentNode) {
        return;
      }

      onNodesChange([
        {
          type: "replace",
          id: nodeId,
          item: {
            ...currentNode,
            data: {
              ...currentNode.data,
              ...dataPatch,
            },
          },
        },
      ]);
    },
    [onNodesChange],
  );
  const handleNodeLabelChange = useCallback(
    (nodeId: string, label: string) => {
      replaceNodeData(nodeId, { label });
    },
    [replaceNodeData],
  );
  const handleNodeColorChange = useCallback(
    (nodeId: string, colorPair: CanvasNodeColorPair) => {
      replaceNodeData(nodeId, {
        color: colorPair.color,
        textColor: colorPair.textColor,
      });
    },
    [replaceNodeData],
  );
  const nodeTypes = useMemo(
    () => ({
      [CANVAS_NODE_TYPE]: (props: NodeProps<CanvasNode>) => (
        <CanvasNodeRenderer
          {...props}
          onLabelChange={handleNodeLabelChange}
          onColorChange={handleNodeColorChange}
        />
      ),
    }),
    [handleNodeColorChange, handleNodeLabelChange],
  );
  const handleEdgeLabelChange = useCallback(
    (edgeId: string, label: string) => {
      const currentEdge = edgesRef.current.find((edge) => edge.id === edgeId);

      if (!currentEdge) {
        return;
      }

      onEdgesChange([
        {
          type: "replace",
          id: edgeId,
          item: {
            ...currentEdge,
            type: currentEdge.type ?? CANVAS_EDGE_TYPE,
            data: {
              label,
            },
          },
        },
      ]);
    },
    [onEdgesChange],
  );
  const edgeTypes = useMemo(
    () => ({
      [CANVAS_EDGE_TYPE]: (props: EdgeProps<CanvasEdge>) => (
        <CanvasEdgeRenderer {...props} onLabelChange={handleEdgeLabelChange} />
      ),
    }),
    [handleEdgeLabelChange],
  );
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    if (event.clientX !== 0 || event.clientY !== 0) {
      setShapePreview((current) =>
        current ? { ...current, x: event.clientX, y: event.clientY } : current,
      );
    }
  }, []);
  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setShapePreview(null);

      if (!reactFlowInstance) {
        return;
      }

      const payloadJson = event.dataTransfer.getData(CANVAS_SHAPE_DRAG_TYPE);

      if (!payloadJson) {
        return;
      }

      const payload = JSON.parse(payloadJson) as CanvasShapeDragPayload;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      nodeCounterRef.current += 1;

      const newNode: CanvasNode = {
        id: `${payload.shape}-${Date.now()}-${nodeCounterRef.current}`,
        type: CANVAS_NODE_TYPE,
        position: {
          x: position.x - payload.size.width / 2,
          y: position.y - payload.size.height / 2,
        },
        data: {
          label: "",
          color: DEFAULT_CANVAS_NODE_COLOR,
          textColor: DEFAULT_CANVAS_NODE_TEXT_COLOR,
          shape: payload.shape,
        },
        style: {
          width: payload.size.width,
          height: payload.size.height,
        },
      };

      onNodesChange([{ type: "add", item: newNode }]);
    },
    [onNodesChange, reactFlowInstance],
  );
  const handleConnect = useCallback(
    (connection: Connection) => {
      edgeCounterRef.current += 1;

      const newEdge: CanvasEdge = {
        id: `edge-${Date.now()}-${edgeCounterRef.current}`,
        type: CANVAS_EDGE_TYPE,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        data: {
          label: DEFAULT_EDGE_LABEL,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f8fafc",
        },
        interactionWidth: 24,
        reconnectable: true,
      };

      onEdgesChange([{ type: "add", item: newEdge }]);
    },
    [onEdgesChange],
  );
  const handleReconnect = useCallback(
    (oldEdge: CanvasEdge, newConnection: Connection) => {
      onEdgesChange([
        {
          type: "replace",
          id: oldEdge.id,
          item: {
            ...oldEdge,
            type: oldEdge.type ?? CANVAS_EDGE_TYPE,
            source: newConnection.source,
            target: newConnection.target,
            sourceHandle: newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
            data: {
              label: oldEdge.data?.label ?? DEFAULT_EDGE_LABEL,
            },
          },
        },
      ]);
    },
    [onEdgesChange],
  );
  const startShapePreview = useCallback((payload: CanvasShapeDragPayload, x: number, y: number) => {
    setShapePreview({ ...payload, x, y });
  }, []);
  const moveShapePreview = useCallback((x: number, y: number) => {
    setShapePreview((current) => (current ? { ...current, x, y } : current));
  }, []);
  const endShapePreview = useCallback(() => {
    setShapePreview(null);
  }, []);
  const handleZoomOut = useCallback(() => {
    void reactFlowInstance?.zoomOut({ duration: CANVAS_VIEWPORT_ANIMATION_DURATION });
  }, [reactFlowInstance]);
  const handleFitView = useCallback(() => {
    void reactFlowInstance?.fitView({
      duration: CANVAS_VIEWPORT_ANIMATION_DURATION,
      padding: 0.2,
    });
  }, [reactFlowInstance]);
  const handleZoomIn = useCallback(() => {
    void reactFlowInstance?.zoomIn({ duration: CANVAS_VIEWPORT_ANIMATION_DURATION });
  }, [reactFlowInstance]);
  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
    }
  }, [canUndo, undo]);
  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
    }
  }, [canRedo, redo]);
  const handleTemplateImport = useCallback(
    (template: CanvasTemplate) => {
      const removeEdgeChanges = edgesRef.current.map((edge) => ({
        type: "remove" as const,
        id: edge.id,
      }));
      const removeNodeChanges = nodesRef.current.map((node) => ({
        type: "remove" as const,
        id: node.id,
      }));
      const addNodeChanges = template.nodes.map((node) => ({
        type: "add" as const,
        item: cloneTemplateNode(node),
      }));
      const addEdgeChanges = template.edges.map((edge) => ({
        type: "add" as const,
        item: cloneTemplateEdge(edge),
      }));

      if (removeEdgeChanges.length || addEdgeChanges.length) {
        onEdgesChange([...removeEdgeChanges, ...addEdgeChanges]);
      }

      if (removeNodeChanges.length || addNodeChanges.length) {
        onNodesChange([...removeNodeChanges, ...addNodeChanges]);
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          void reactFlowInstance?.fitView({
            duration: CANVAS_VIEWPORT_ANIMATION_DURATION,
            padding: 0.2,
          });
        });
      });
    },
    [onEdgesChange, onNodesChange, reactFlowInstance],
  );
  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent) => {
      const bounds = canvasViewportRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      updateMyPresence({
        cursor: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
      });
    },
    [updateMyPresence],
  );
  const handleCanvasMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  useKeyboardShortcuts({
    reactFlowInstance,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return (
    <div
      ref={canvasViewportRef}
      className="relative h-full w-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<CanvasNode, CanvasEdge>
        className="h-full w-full bg-background"
        nodes={nodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setReactFlowInstance}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onDelete={onDelete}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--border-default)"
        />
      </ReactFlow>
      <RemoteCursors />
      <ParticipantAvatarGroup />
      <CanvasControlBar
        canZoom={Boolean(reactFlowInstance)}
        canUndo={canUndo}
        canRedo={canRedo}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onZoomIn={handleZoomIn}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <ShapePanel
        onPreviewStart={startShapePreview}
        onPreviewMove={moveShapePreview}
        onPreviewEnd={endShapePreview}
      />
      <ShapeDragPreview preview={shapePreview} />
      <StarterTemplatesModal
        isOpen={isStarterTemplatesOpen}
        onClose={() => onStarterTemplatesOpenChange(false)}
        onImport={handleTemplateImport}
      />
    </div>
  );
}

export function EditorCanvas({
  roomId,
  isStarterTemplatesOpen,
  onStarterTemplatesOpenChange,
  saveRequestId,
  onSaveStatusChange,
}: EditorCanvasProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-surface-border bg-background shadow-2xl">
      <CanvasErrorBoundary>
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
          <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
            <ClientSideSuspense fallback={<CanvasLoadingState />}>
              <SyncedReactFlowCanvas
                roomId={roomId}
                isStarterTemplatesOpen={isStarterTemplatesOpen}
                onStarterTemplatesOpenChange={onStarterTemplatesOpenChange}
                saveRequestId={saveRequestId}
                onSaveStatusChange={onSaveStatusChange}
              />
            </ClientSideSuspense>
          </RoomProvider>
        </LiveblocksProvider>
      </CanvasErrorBoundary>
    </div>
  );
}
