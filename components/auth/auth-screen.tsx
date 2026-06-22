import type { ReactNode } from "react"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"

type AuthScreenProps = {
  children: ReactNode
  title?: string
  description?: string
}

export function AuthScreen({ children, title, description }: AuthScreenProps) {
  return (
    <AuthScreenShell title={title} description={description}>
      {children}
    </AuthScreenShell>
  )
}
