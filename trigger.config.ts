import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Your Project ID
  project: process.env.TRIGGER_PROJECT_ID!,

  // ⚠️ REQUIRED: The default timeout for all tasks (in seconds).
  // 3600s = 1 hour. You can override this on individual tasks if needed.
  maxDuration: 3600,

  // Tell Trigger.dev where your tasks are located
  dirs: ["./trigger"],
});