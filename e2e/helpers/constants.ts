export const E2E_CLERK_ADMIN_EMAIL =
  process.env.E2E_CLERK_ADMIN_EMAIL ?? "hugo.castro+clerk_test@mlh.io"

export const E2E_CLERK_FELLOW_EMAIL =
  process.env.E2E_CLERK_FELLOW_EMAIL ??
  "hugo.castro.fellow-test+clerk_test@mlh.io"

export const E2E_CLERK_TEST_CODE = process.env.E2E_CLERK_TEST_CODE ?? "424242"

export const ADMIN_AUTH_STATE = "playwright/.clerk/admin.json"
export const FELLOW_AUTH_STATE = "playwright/.clerk/fellow.json"
