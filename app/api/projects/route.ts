import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_PROJECT_NAME = "Untitled Project";

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

async function readProjectName(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown; name?: unknown };
    const id = typeof body.id === "string" ? body.id.trim() : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    return {
      id,
      name: name || DEFAULT_PROJECT_NAME,
    };
  } catch {
    return {
      id: undefined,
      name: DEFAULT_PROJECT_NAME,
    };
  }
}

export async function GET() {
  const userId = await requireUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const userId = await requireUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const { id, name } = await readProjectName(request);

  const project = await prisma.project.create({
    data: {
      id,
      ownerId: userId,
      name,
    },
  });

  return Response.json({ project }, { status: 201 });
}
