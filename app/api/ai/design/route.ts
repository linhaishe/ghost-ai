import { designAgentTask } from "@/trigger/design-agent";
import { getCurrentProjectIdentity, getProjectAccessRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readDesignRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    prompt?: unknown;
    projectId?: unknown;
    roomId?: unknown;
  } | null;

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";

  return {
    prompt,
    projectId,
    roomId,
  };
}

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return jsonError("Unauthorized", 401);
  }

  const { prompt, projectId, roomId } = await readDesignRequest(request);

  if (!prompt) {
    return jsonError("Prompt is required", 400);
  }

  if (!projectId || !roomId) {
    return jsonError("Project ID and room ID are required", 400);
  }

  const role = await getProjectAccessRole(projectId, identity);

  if (!role) {
    return jsonError("Forbidden", 403);
  }

  const run = await designAgentTask.trigger(
    {
      prompt,
      roomId,
    },
    {
      tags: [`project:${projectId}`, `user:${identity.userId}`],
    },
  );

  await prisma.taskRun.create({
    data: {
      runId: run.id,
      projectId,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: run.id }, { status: 201 });
}
