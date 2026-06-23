import { get } from "@vercel/blob";

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
  context: { params: Promise<{ projectId: string; specId: string }> },
) {
  const { projectId, specId } = await context.params;
  const access = await requireProjectAccess(projectId);

  if ("error" in access) {
    return access.error;
  }

  const spec = await prisma.projectSpec.findFirst({
    where: {
      id: specId,
      projectId,
    },
    select: {
      id: true,
      filePath: true,
      project: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!spec) {
    return jsonError("Spec not found", 404);
  }

  const blob = await get(spec.filePath, {
    access: "private",
    useCache: false,
  });

  if (!blob?.stream) {
    return jsonError("Spec file could not be loaded", 502);
  }

  const filename = `${sanitizeFilename(spec.project.name)}-${sanitizeFilename(spec.id)}.md`;

  return new Response(blob.stream, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
