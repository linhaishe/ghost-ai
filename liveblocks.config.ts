import type { LiveblocksFlow } from "@liveblocks/react-flow";

import type { AiStatusMessage, CanvasEdge, CanvasNode } from "@/types/canvas";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: {
        x: number;
        y: number;
      } | null;
      thinking: boolean;
    };

    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>;
      aiStatus?: AiStatusMessage[];
    };

    UserMeta: {
      id: string;
      info: {
        name: string;
        avatarUrl: string | null;
        cursorColor: string;
      };
    };

    RoomEvent: Record<string, never>;
    ThreadMetadata: Record<string, never>;
    RoomInfo: Record<string, never>;
    GroupInfo: Record<string, never>;
    ActivitiesData: Record<string, never>;
  }
}

export {};
