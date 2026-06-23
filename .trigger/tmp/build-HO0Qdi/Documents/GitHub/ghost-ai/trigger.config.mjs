import {
  defineConfig
} from "../../../chunk-UILCMSYH.mjs";
import "../../../chunk-SZ6GL6S4.mjs";
import {
  init_esm
} from "../../../chunk-3VTTNDYQ.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_ghost_ai",
  dirs: ["trigger"],
  maxDuration: 300,
  enableConsoleLogging: true,
  runtime: "node",
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
