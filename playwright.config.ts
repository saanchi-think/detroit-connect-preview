import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5202",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: "NEXT_DIST_DIR=.next-e2e DETROIT_CONNECT_DATA_MODE=local DETROIT_CONNECT_DATA_DIR=.test-data OPENAI_API_KEY= npm run dev -- -p 5202",
    url: "http://127.0.0.1:5202",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
