const segment = (value: string) => `/${value}`

export const AUTH_ROUTES = {
  signIn: segment("sign-in"),
  signUp: segment("sign-up"),
  dashboard: segment("dashboard"),
} as const
