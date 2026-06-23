import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_ghost_ai",
  dirs: ["trigger"],
  maxDuration: 300,
  enableConsoleLogging: true,
  runtime: 'node'
});
