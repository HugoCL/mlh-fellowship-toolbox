import { expect, test } from "@playwright/test"
import { waitForAuthenticatedApp } from "./helpers/wait-for-app"

test.beforeEach(async ({ page }) => {
  await waitForAuthenticatedApp(page)
})

test("shows cohort administrator dashboard", async ({ page }) => {
  await expect(page.locator("body")).toContainText(
    /Cohort administrator|viewing pod/i,
  )
})

test("shows umbrella admin navigation", async ({ page }) => {
  await expect(page.getByRole("link", { name: "All Cohorts" })).toBeVisible()
})

test("does not show fellow-only My Tasks nav", async ({ page }) => {
  await expect(page.getByRole("link", { name: "My Tasks" })).toHaveCount(0)
})

test("may show umbrella overview when no pod is selected", async ({ page }) => {
  const umbrellaCopy = page.getByText("You manage the cohort umbrella")
  if ((await umbrellaCopy.count()) > 0) {
    await expect(umbrellaCopy).toBeVisible()
  }
})
