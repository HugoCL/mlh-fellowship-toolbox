import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(__dirname, "test-results"),
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "verify",
      testMatch: /ui-smoke\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
})
