import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { getCurrentProjectIdentity, getProjectAccessRole } from "@/lib/project-access";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return null;
  }

  return email;
}

async function requireProjectAccess(projectId: string) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return {
      identity: null,
      role: null,
      response: jsonError("Unauthorized", 401),
    };
  }

  const role = await getProjectAccessRole(projectId, identity);

  if (!role) {
    return {
      identity,
      role: null,
      response: jsonError("Forbidden", 403),
    };
  }

  return {
    identity,
    role,
    response: null,
  };
}

async function enrichCollaborators(collaborators: { id: string; email: string; createdAt: Date }[]) {
  const client = await clerkClient();

  const enrichedUsers = await Promise.all(
    collaborators.map(async (collaborator) => {
      try {
        const users = await client.users.getUserList({
          emailAddress: [collaborator.email],
          limit: 1,
        });
        const user = users.data[0];

        if (!user) {
          return [collaborator.email, null] as const;
        }

        return [
          collaborator.email,
          {
            displayName:
              user.fullName ||
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.username ||
              collaborator.email,
            avatarUrl: user.imageUrl,
          },
        ] as const;
      } catch {
        return [collaborator.email, null] as const;
      }
    }),
  );

  const userByEmail = new Map(enrichedUsers);

  return collaborators.map((collaborator) => {
    const user = userByEmail.get(collaborator.email);

    return {
      id: collaborator.id,
      email: collaborator.email,
      createdAt: collaborator.createdAt,
      displayName: user?.displayName ?? collaborator.email,
      avatarUrl: user?.avatarUrl ?? null,
    };
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if (access.response) {
    return access.response;
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return Response.json({
    role: access.role,
    collaborators: await enrichCollaborators(collaborators),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if (access.response) {
    return access.response;
  }

  if (access.role !== "owner") {
    return jsonError("Forbidden", 403);
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = normalizeEmail(body.email);

  if (!email) {
    return jsonError("A valid collaborator email is required.", 400);
  }

  const collaborator = await prisma.projectCollaborator.upsert({
    where: {
      projectId_email: {
        projectId,
        email,
      },
    },
    update: {},
    create: {
      projectId,
      email,
    },
  });

  return Response.json({ collaborator }, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if (access.response) {
    return access.response;
  }

  if (access.role !== "owner") {
    return jsonError("Forbidden", 403);
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown };
  const email = normalizeEmail(body.email);

  if (!email) {
    return jsonError("A valid collaborator email is required.", 400);
  }

  await prisma.projectCollaborator.deleteMany({
    where: {
      projectId,
      email,
    },
  });

  return Response.json({ success: true });
}
