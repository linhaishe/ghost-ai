import "server-only";

import { Liveblocks } from "@liveblocks/node";

const CURSOR_COLORS = [
  "#00c8d4",
  "#8b82ff",
  "#34d399",
  "#fbbf24",
  "#ff4d4f",
  "#38bdf8",
  "#f472b6",
  "#a3e635",
] as const;

function createLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required to initialize Liveblocks.");
  }

  return new Liveblocks({
    secret,
  });
}

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocks?: Liveblocks;
};

export function getLiveblocksClient() {
  if (process.env.NODE_ENV === "production") {
    return createLiveblocksClient();
  }

  return (globalForLiveblocks.liveblocks ??= createLiveblocksClient());
}

export function getCursorColorForUser(userId: string) {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
