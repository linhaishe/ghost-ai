"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MiniMap,
  NodeResizeControl,
  Position,
  ResizeControlVariant,
  ReactFlow,
} from "@xyflow/react";
import type { Connection } from "@xyflow/react";
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
  DEFAULT_CANVAS_NODE_TEXT_COLOR,
  CANVAS_NODE_TYPE,
  CANVAS_SHAPE_DEFAULT_SIZES,
  CANVAS_SHAPE_DRAG_TYPE,
  CANVAS_NODE_MIN_SIZE,
  DEFAULT_CANVAS_NODE_COLOR,
  NODE_COLORS,
  type CanvasNodeColorPair,
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

const NODE_HANDLE_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

const NODE_RESIZE_CONTROL_POSITIONS = ["top", "right", "bottom", "left"] as const;

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

function SyncedReactFlowCanvas() {
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
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreviewState | null>(null);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
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
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        data: {},
        interactionWidth: 18,
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
            source: newConnection.source,
            target: newConnection.target,
            sourceHandle: newConnection.sourceHandle,
            targetHandle: newConnection.targetHandle,
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
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable
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
