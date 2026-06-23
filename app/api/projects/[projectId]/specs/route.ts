import { getCurrentProjectIdentity, getProjectAccessRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sanitizeFilename(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "project-spec"
  );
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
      name: true,
      specs: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  const projectFilename = sanitizeFilename(project.name);

  return Response.json({
    specs: project.specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt.toISOString(),
      filename: `${projectFilename}-${sanitizeFilename(spec.id)}.md`,
    })),
  });
}
