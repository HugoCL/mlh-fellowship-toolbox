import { expect, type Page } from "@playwright/test"

export async function waitForAuthenticatedApp(page: Page) {
  await page.goto("/dashboard")
  await expect(page).not.toHaveURL(/\/sign-in/)
  await expect(page.getByText("You haven't been invited yet")).toHaveCount(0)
  await expect(page.locator("body")).not.toContainText("Missing publishableKey")
  await expect(page.locator('[data-slot="sidebar"]')).toBeVisible({
    timeout: 30_000,
  })
}
