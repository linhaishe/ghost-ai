"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  NodeResizer,
  ReactFlow,
} from "@xyflow/react";
import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from "react";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  Database,
  Diamond,
  Hexagon,
  RectangleHorizontal,
  SquareRoundCorner,
} from "lucide-react";

import type { CanvasEdge, CanvasNode, CanvasNodeShape, CanvasShapeDragPayload } from "@/types/canvas";
import {
  CANVAS_NODE_TYPE,
  CANVAS_SHAPE_DEFAULT_SIZES,
  CANVAS_SHAPE_DRAG_TYPE,
  CANVAS_NODE_MIN_SIZE,
  DEFAULT_CANVAS_NODE_COLOR,
} from "@/types/canvas";
import type { NodeProps, ReactFlowInstance } from "@xyflow/react";

interface EditorCanvasProps {
  roomId: string;
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

function getRestingStroke(color: string) {
  return `color-mix(in srgb, ${color} 48%, transparent)`;
}

function getShapeStyle(color: string, selected = false): CSSProperties {
  return {
    "--shape-color": color,
    "--shape-stroke": selected ? color : getRestingStroke(color),
  } as CSSProperties;
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
      className="relative z-10 max-w-[calc(100%-1.5rem)] truncate text-center text-sm font-medium text-copy-primary data-[placeholder=true]:text-copy-faint"
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
  selected,
}: {
  children: ReactNode;
  label: string;
  placeholder?: string;
  color: string;
  selected?: boolean;
}) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center text-copy-primary drop-shadow-lg"
      style={getShapeStyle(color, selected)}
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
  selected,
}: {
  shape: CanvasNodeShape;
  label: string;
  placeholder?: string;
  color: string;
  selected?: boolean;
}) {
  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className="flex h-full w-full items-center justify-center border bg-surface shadow-lg"
        style={{
          ...getShapeStyle(color, selected),
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
      <SvgShapeShell label={label} placeholder={placeholder} color={color} selected={selected}>
        <polygon
          points="50 2 98 50 50 98 2 50"
          fill="var(--bg-surface)"
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
      <SvgShapeShell label={label} placeholder={placeholder} color={color} selected={selected}>
        <polygon
          points="25 3 75 3 98 50 75 97 25 97 2 50"
          fill="var(--bg-surface)"
          stroke="var(--shape-stroke)"
          strokeLinejoin="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </SvgShapeShell>
    );
  }

  return (
    <SvgShapeShell label={label} placeholder={placeholder} color={color} selected={selected}>
      <path
        d="M8 18 C8 10 92 10 92 18 L92 82 C92 90 8 90 8 82 Z"
        fill="var(--bg-surface)"
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
        fill="var(--bg-surface)"
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
}: NodeProps<CanvasNode> & {
  onLabelChange: (nodeId: string, label: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
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
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={CANVAS_NODE_MIN_SIZE.width}
        minHeight={CANVAS_NODE_MIN_SIZE.height}
        color="var(--accent-primary)"
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          border: "1px solid var(--border-default)",
          background: "var(--bg-elevated)",
        }}
        lineStyle={{
          borderColor: "color-mix(in srgb, var(--accent-primary) 70%, transparent)",
        }}
      />
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
          className="nodrag nopan absolute left-1/2 top-1/2 z-20 max-h-[calc(100%-1rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 resize-none overflow-hidden border-none bg-transparent p-0 text-center text-sm font-medium leading-5 text-copy-primary placeholder:text-copy-faint outline-none"
          rows={2}
        />
      ) : null}
    </div>
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

function SyncedReactFlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
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
  const nodesRef = useRef(nodes);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreviewState | null>(null);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  const handleNodeLabelChange = useCallback(
    (nodeId: string, label: string) => {
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
              label,
            },
          },
        },
      ]);
    },
    [onNodesChange],
  );
  const nodeTypes = useMemo(
    () => ({
      [CANVAS_NODE_TYPE]: (props: NodeProps<CanvasNode>) => (
        <CanvasNodeRenderer {...props} onLabelChange={handleNodeLabelChange} />
      ),
    }),
    [handleNodeLabelChange],
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
  const startShapePreview = useCallback((payload: CanvasShapeDragPayload, x: number, y: number) => {
    setShapePreview({ ...payload, x, y });
  }, []);
  const moveShapePreview = useCallback((x: number, y: number) => {
    setShapePreview((current) => (current ? { ...current, x, y } : current));
  }, []);
  const endShapePreview = useCallback(() => {
    setShapePreview(null);
  }, []);

  return (
    <div className="relative h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow<CanvasNode, CanvasEdge>
        className="h-full w-full bg-background"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <MiniMap
          className="!border !border-surface-border !bg-surface/90"
          maskColor="rgba(2, 6, 23, 0.64)"
          nodeColor="var(--accent-primary)"
          nodeStrokeColor="var(--border-default)"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--border-default)"
        />
      </ReactFlow>
      <ShapePanel
        onPreviewStart={startShapePreview}
        onPreviewMove={moveShapePreview}
        onPreviewEnd={endShapePreview}
      />
      <ShapeDragPreview preview={shapePreview} />
    </div>
  );
}

export function EditorCanvas({ roomId }: EditorCanvasProps) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-surface-border bg-background shadow-2xl">
      <CanvasErrorBoundary>
        <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
          <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
            <ClientSideSuspense fallback={<CanvasLoadingState />}>
              <SyncedReactFlowCanvas />
            </ClientSideSuspense>
          </RoomProvider>
        </LiveblocksProvider>
      </CanvasErrorBoundary>
    </div>
  );
}
