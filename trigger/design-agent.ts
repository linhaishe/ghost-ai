import { logger, task } from "@trigger.dev/sdk/v3";

export interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    logger.info("Design agent task received payload", {
      prompt: payload.prompt,
      roomId: payload.roomId,
    });

    return {
      prompt: payload.prompt,
      roomId: payload.roomId,
    };
  },
});
