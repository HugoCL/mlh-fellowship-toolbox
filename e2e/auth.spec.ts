import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test } from "@playwright/test"
import { E2E_CLERK_ADMIN_EMAIL } from "./helpers/constants"
import { signInWithEmailCodeUi } from "./helpers/sign-in-ui"

const protectedRoutes = [
  { path: "/", expectRedirect: "/sign-in" },
  { path: "/dashboard", expectRedirect: "/sign-in" },
  { path: "/cohorts", expectRedirect: "/sign-in" },
]

for (const route of protectedRoutes) {
  test(`redirects ${route.path} to sign-in when unauthenticated`, async ({
    page,
  }) => {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(`${route.expectRedirect}`))
  })
}

test("sign-in page renders without Clerk configuration errors", async ({
  page,
}) => {
  await page.goto("/sign-in")
  await expect(page.locator("body")).not.toContainText("Missing publishableKey")
  await expect(page.locator("body")).toContainText(/sign in|continue|email/i)
})

test("signs in via email code UI with test OTP", async ({ page }) => {
  test.setTimeout(60_000)
  await signInWithEmailCodeUi(page, E2E_CLERK_ADMIN_EMAIL)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText("You haven't been invited yet")).toHaveCount(0)
})

test("sign-in page accepts testing token without bot detection", async ({
  page,
}) => {
  await setupClerkTestingToken({ page })
  await page.goto("/sign-in")
  await expect(page.locator("body")).not.toContainText("Bot detected")
})
