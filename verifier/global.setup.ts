import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { clerkSetup } from "@clerk/testing/playwright"
import { test as setup } from "@playwright/test"
import { signInTestUser } from "../e2e/helpers/clerk-auth"
import {
  ADMIN_AUTH_STATE,
  E2E_CLERK_ADMIN_EMAIL,
  E2E_CLERK_FELLOW_EMAIL,
  FELLOW_AUTH_STATE,
} from "../e2e/helpers/constants"
import { waitForAuthenticatedApp } from "../e2e/helpers/wait-for-app"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authDir = path.join(__dirname, "../playwright/.clerk")

setup.describe.configure({ mode: "serial" })
setup.setTimeout(90_000)

setup("global setup", async () => {
  await mkdir(authDir, { recursive: true })
  await clerkSetup({ dotenv: false })

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for E2E tests.")
  }
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required for E2E tests.",
    )
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E tests.")
  }
})

setup("authenticate admin", async ({ page }) => {
  await signInTestUser(page, E2E_CLERK_ADMIN_EMAIL)
  await waitForAuthenticatedApp(page)
  await page.context().storageState({ path: ADMIN_AUTH_STATE })
})

setup("authenticate fellow", async ({ page }) => {
  await signInTestUser(page, E2E_CLERK_FELLOW_EMAIL)
  await waitForAuthenticatedApp(page)
  await page.context().storageState({ path: FELLOW_AUTH_STATE })
})
