import { SignIn } from "@clerk/nextjs"
import { AuthScreen } from "@/components/auth/auth-screen"

export default function SignInPage() {
  return (
    <AuthScreen>
      <SignIn signUpUrl="/sign-up" />
    </AuthScreen>
  )
}
