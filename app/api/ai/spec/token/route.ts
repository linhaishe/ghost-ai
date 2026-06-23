import { auth as triggerAuth } from "@trigger.dev/sdk/v3";

import { getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readTokenRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as { runId?: unknown } | null;

  return typeof body?.runId === "string" ? body.runId.trim() : "";
}

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity();

  if (!identity) {
    return jsonError("Unauthorized", 401);
  }

  const runId = await readTokenRequest(request);

  if (!runId) {
    return jsonError("Run ID is required", 400);
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: {
      runId,
    },
    select: {
      userId: true,
    },
  });

  if (!taskRun || taskRun.userId !== identity.userId) {
    return jsonError("Forbidden", 403);
  }

  const token = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        runs: runId,
      },
    },
    expirationTime: "1h",
  });

  return Response.json({ token });
}
