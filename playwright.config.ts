import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

if (existsSync(".env.local")) loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Avoid recording authentication tokens or generated test passwords.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
