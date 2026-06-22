import { currentUser } from "@clerk/nextjs/server";

import { getCurrentProjectIdentity, getAccessibleProject } from "@/lib/project-access";
import { getCursorColorForUser, getLiveblocksClient } from "@/lib/liveblocks";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function readRoomId(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    room?: unknown;
    roomId?: unknown;
  };

  const roomId =
    typeof body.room === "string"
      ? body.room.trim()
      : typeof body.roomId === "string"
        ? body.roomId.trim()
        : "";

  return roomId || null;
}

export async function POST(request: Request) {
  const [roomId, identity, user] = await Promise.all([
    readRoomId(request),
    getCurrentProjectIdentity(),
    currentUser(),
  ]);

  if (!identity) {
    return jsonError("Unauthorized", 401);
  }

  if (!roomId) {
    return jsonError("Liveblocks room ID is required.", 400);
  }

  const project = await getAccessibleProject(roomId, identity);

  if (!project) {
    return jsonError("Forbidden", 403);
  }

  const liveblocks = getLiveblocksClient();

  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: [],
    metadata: {
      projectId: project.id,
      projectName: project.name,
    },
  });

  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    identity.primaryEmail ||
    "Ghost AI User";

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      name,
      avatarUrl: user?.imageUrl ?? null,
      cursorColor: getCursorColorForUser(identity.userId),
    },
  });

  session.allow(roomId, ["*:write"]);

  const { status, body } = await session.authorize();

  return new Response(body, { status });
}
