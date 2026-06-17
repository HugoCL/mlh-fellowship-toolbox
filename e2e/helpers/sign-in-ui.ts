import { createPageObjects } from "@clerk/testing/playwright/unstable"
import { expect, type Page } from "@playwright/test"
import { E2E_CLERK_TEST_CODE } from "./constants"
import { waitForAuthenticatedApp } from "./wait-for-app"

function getBaseUrl() {
  const port = process.env.PORT ?? "3000"
  return process.env.BASE_URL ?? `http://localhost:${port}`
}

async function enterOtpCode(page: Page, code: string) {
  const digitInputs = page.getByRole("textbox", {
    name: "Enter verification code. Digit 1",
  })
  if (await digitInputs.isVisible().catch(() => false)) {
    await digitInputs.click()
    await page.keyboard.type(code, { delay: 100 })
    return
  }

  await page.getByRole("textbox", { name: /verification code/i }).fill(code)
}

export async function signInWithEmailCodeUi(page: Page, email: string) {
  const { signIn } = createPageObjects({
    page,
    baseURL: getBaseUrl(),
    useTestingToken: true,
  })

  await signIn.goTo()
  await expect(page.locator("body")).not.toContainText("Missing publishableKey")

  await signIn.setIdentifier(email)
  await signIn.continue()

  await expect(page.getByRole("heading", { name: /password/i })).toBeVisible({
    timeout: 15_000,
  })
  await page.getByRole("link", { name: "Use another method" }).click()

  const emailCodeButton = signIn
    .getAltMethodsEmailCodeButton()
    .or(page.getByRole("button", { name: /email code/i }))
  await expect(emailCodeButton.first()).toBeVisible({ timeout: 15_000 })
  await emailCodeButton.first().click()

  await expect(
    page.getByRole("heading", { name: /check your email/i }),
  ).toBeVisible({ timeout: 15_000 })

  const resendButton = page.getByRole("button", { name: /resend/i })
  if (await resendButton.isVisible().catch(() => false)) {
    await resendButton.click()
  }

  await enterOtpCode(page, E2E_CLERK_TEST_CODE)

  const continueButton = page.getByRole("button", {
    name: "Continue",
    exact: true,
  })
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
  } else {
    await page.waitForFunction(
      () => window.Clerk?.session?.status === "active",
      { timeout: 30_000 },
    )
  }

  await waitForAuthenticatedApp(page)
}
