import { expect, test } from "@playwright/test"
import { waitForAuthenticatedApp } from "./helpers/wait-for-app"

test.beforeEach(async ({ page }) => {
  await waitForAuthenticatedApp(page)
})

test("shows fellow dashboard", async ({ page }) => {
  await expect(page.locator("body")).toContainText(/Fellow/)
})

test("shows fellow My Tasks navigation", async ({ page }) => {
  await expect(page.getByRole("link", { name: "My Tasks" })).toBeVisible()
})

test("does not show leader-only settings navigation", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Pod Settings" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Cohort Settings" })).toHaveCount(
    0,
  )
})

test("does not show umbrella admin navigation", async ({ page }) => {
  await expect(page.getByRole("link", { name: "All Cohorts" })).toHaveCount(0)
})
