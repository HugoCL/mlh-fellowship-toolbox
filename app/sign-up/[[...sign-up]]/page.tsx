import { SignUp } from "@clerk/nextjs"
import { AuthScreen } from "@/components/auth/auth-screen"
import { clerkAppearance } from "@/components/auth/clerk-appearance"
import { AUTH_ROUTES } from "@/components/auth/auth-routes"

export default function SignUpPage() {
  return (
    <AuthScreen
      title="Create your account"
      description="Sign up with the email address on your fellowship invite."
    >
      <SignUp appearance={clerkAppearance} signInUrl={AUTH_ROUTES.signIn} />
    </AuthScreen>
  )
}
