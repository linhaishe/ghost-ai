import { generateSpec, generateSpecRequestSchema } from "@/trigger/generate-spec";
import { getCurrentProjectIdentity, getProjectAccessRole } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readSpecRequest(request: Request) {
  const body = await request.json().catch(() => null);

  return generateSpecRequestSchema.safeParse(body);
}

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return jsonError("Unauthorized", 401);
  }

  const requestResult = await readSpecRequest(request);

  if (!requestResult.success) {
    return jsonError("Invalid spec generation payload", 400);
  }

  const { roomId, chatHistory, nodes, edges } = requestResult.data;
  const projectId = roomId;
  const role = await getProjectAccessRole(projectId, identity);

  if (!role) {
    return jsonError("Forbidden", 403);
  }

  const run = await generateSpec.trigger(
    {
      projectId,
      roomId,
      chatHistory,
      nodes,
      edges,
    },
    {
      tags: [`project:${projectId}`, `user:${identity.userId}`, "type:spec"],
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
