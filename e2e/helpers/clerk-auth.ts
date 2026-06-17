import { clerk } from "@clerk/testing/playwright"
import type { Page } from "@playwright/test"

export async function signInTestUser(page: Page, email: string) {
  await page.goto("/sign-in")
  await clerk.loaded({ page })

  await clerk.signIn({
    page,
    signInParams: {
      strategy: "email_code",
      identifier: email,
    },
  })

  await page.waitForFunction(
    () =>
      window.Clerk?.user !== null &&
      window.Clerk?.session !== null &&
      window.Clerk?.session?.status === "active",
    { timeout: 15_000 },
  )
}
