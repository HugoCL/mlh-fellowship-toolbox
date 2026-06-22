import { SignIn } from "@clerk/nextjs"
import { AUTH_ROUTES } from "@/components/auth/auth-routes"
import { AuthScreen } from "@/components/auth/auth-screen"
import { clerkAppearance } from "@/components/auth/clerk-appearance"

export default function SignInPage() {
  return (
    <AuthScreen
      title="Sign in to your pod workspace"
      description="Use the email address on your fellowship invite."
    >
      <SignIn appearance={clerkAppearance} signUpUrl={AUTH_ROUTES.signUp} />
    </AuthScreen>
  )
}
