import path from "node:path"
import { expect, test } from "@playwright/test"
import { AUTH_ROUTES } from "../components/auth/auth-routes"
import { FELLOW_AUTH_STATE } from "../e2e/helpers/constants"
import { waitForAuthenticatedApp } from "../e2e/helpers/wait-for-app"

const ARTIFACTS = "/opt/cursor/artifacts/ui-verify"
// Fellow pod program code 26.SUM.B.5.1 → slug 26-SUM-B-5-1
const COHORT = "26-SUM-B-5-1"

test.describe("sign-in chrome", () => {
  test("dark mode sign-in renders without AI tropes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await page.goto(AUTH_ROUTES.signIn)
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("Sign in to your pod workspace")).toBeVisible()
    await expect(page.locator("img[src*='unsplash']")).toHaveCount(0)

    const html = await page.content()
    expect(html).not.toMatch(/Sparkles|unsplash|glassmorphism/i)
    expect(html).not.toMatch(/bg-gradient-to|from-amber|text-amber/i)

    await page.screenshot({
      path: path.join(ARTIFACTS, "02-sign-in-dark.png"),
      fullPage: true,
    })
  })
})

test.describe("fellow role pages", () => {
  test.use({ storageState: FELLOW_AUTH_STATE })

  test("fellow dashboard, mentors, action-items", async ({ page }) => {
    await page.goto("/")
    await waitForAuthenticatedApp(page)
    await page.waitForLoadState("networkidle")
    await page.screenshot({
      path: path.join(ARTIFACTS, "13-dashboard-fellow.png"),
      fullPage: true,
    })

    await page.goto(`/cohorts/${COHORT}/mentors`)
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).not.toContainText("Application error")
    await page.screenshot({
      path: path.join(ARTIFACTS, "14-fellow-mentors.png"),
      fullPage: true,
    })

    await page.goto(`/cohorts/${COHORT}/action-items`)
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).not.toContainText("Application error")
    await page.screenshot({
      path: path.join(ARTIFACTS, "15-fellow-action-items.png"),
      fullPage: true,
    })
  })
})
