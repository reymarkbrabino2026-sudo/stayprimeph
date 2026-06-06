import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000" },
  webServer: {
    command: process.platform === "win32" ? "npm.cmd run dev" : "npm run dev",
    env: { ...process.env, STAYPRIMEPH_E2E: "1", PERSISTENCE_DRIVER: "json", BLOB_READ_WRITE_TOKEN: "" },
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: true,
    timeout: 180000,
  },
});
