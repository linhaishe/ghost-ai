import { get, put } from "@vercel/blob";

import { getCurrentProjectIdentity, getProjectAccessRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { CanvasState } from "@/types/canvas";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isCanvasState(value: unknown): value is CanvasState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CanvasState>;

  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

async function requireProjectAccess(projectId: string) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return { error: jsonError("Unauthorized", 401) };
  }

  const role = await getProjectAccessRole(projectId, identity);

  if (!role) {
    return { error: jsonError("Forbidden", 403) };
  }

  return { identity, role };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if ("error" in access) {
    return access.error;
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      canvasJsonPath: true,
    },
  });

  if (!project?.canvasJsonPath) {
    return Response.json({ canvas: null });
  }

  const blob = await get(project.canvasJsonPath, {
    access: "private",
    useCache: false,
  });

  if (!blob?.stream) {
    return jsonError("Saved canvas could not be loaded", 502);
  }

  const canvas = (await new Response(blob.stream).json()) as unknown;

  if (!isCanvasState(canvas)) {
    return jsonError("Saved canvas is invalid", 502);
  }

  return Response.json({ canvas });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json().catch(() => null)) as unknown;

  if (!isCanvasState(body)) {
    return jsonError("Canvas state with nodes and edges is required", 400);
  }

  const pathname = `projects/${projectId}/canvas.json`;
  const blob = await put(pathname, JSON.stringify(body), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      canvasJsonPath: blob.url,
    },
  });

  return Response.json({
    canvasJsonPath: blob.url,
    savedAt: new Date().toISOString(),
  });
}
