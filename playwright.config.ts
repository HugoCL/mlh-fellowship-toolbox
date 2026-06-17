import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

try {
  process.loadEnvFile(path.join(__dirname, ".env.local"))
} catch {
  // .env.local is optional in CI when env vars are injected directly.
}

const PORT = process.env.PORT ?? "3000"
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  outputDir: "test-results/",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  ...(process.env.CI
    ? {
        webServer: {
          command: "pnpm build && pnpm start",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: "global setup",
      testMatch: /global\.setup\.ts/,
      timeout: 60_000,
    },
    {
      name: "unauthenticated",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["global setup"],
    },
    {
      name: "admin",
      testMatch: /dashboard\.admin\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/admin.json",
      },
      dependencies: ["global setup"],
    },
    {
      name: "fellow",
      testMatch: /dashboard\.fellow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/fellow.json",
      },
      dependencies: ["global setup"],
    },
  ],
})
