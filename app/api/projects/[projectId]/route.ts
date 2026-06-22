import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function requireUserId() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  return userId;
}

async function readRenameProjectName(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    return name || null;
  } catch {
    return null;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await requireUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!project || project.ownerId !== userId) {
    return jsonError("Forbidden", 403);
  }

  const name = await readRenameProjectName(request);

  if (!name) {
    return jsonError("Project name is required", 400);
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      name,
    },
  });

  return Response.json({ project: updatedProject });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await requireUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!project || project.ownerId !== userId) {
    return jsonError("Forbidden", 403);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return Response.json({ success: true });
}
