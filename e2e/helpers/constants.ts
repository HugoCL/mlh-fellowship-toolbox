export const E2E_CLERK_ADMIN_EMAIL =
  process.env.E2E_CLERK_ADMIN_EMAIL ?? "admin+clerk_test@example.com"

export const E2E_CLERK_FELLOW_EMAIL =
  process.env.E2E_CLERK_FELLOW_EMAIL ?? "fellow+clerk_test@example.com"

export const E2E_CLERK_TEST_CODE = process.env.E2E_CLERK_TEST_CODE ?? "424242"

export const ADMIN_AUTH_STATE = "playwright/.clerk/admin.json"
export const FELLOW_AUTH_STATE = "playwright/.clerk/fellow.json"
