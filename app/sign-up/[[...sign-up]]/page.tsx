import { SignUp } from "@clerk/nextjs"
import { AuthScreen } from "@/components/auth/auth-screen"

export default function SignUpPage() {
  return (
    <AuthScreen>
      <SignUp signInUrl="/sign-in" />
    </AuthScreen>
  )
}
