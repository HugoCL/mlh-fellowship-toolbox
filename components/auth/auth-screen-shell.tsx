import type { ReactNode } from "react"
import { AuthBrandMark } from "@/components/auth/auth-brand-mark"
import { cn } from "@/lib/utils"

type AuthScreenShellProps = {
  children: ReactNode
  title?: string
  description?: string
  className?: string
}

export function AuthScreenShell({
  children,
  title,
  description,
  className,
}: AuthScreenShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-6 py-8 md:px-10">
        <header>
          <AuthBrandMark />
        </header>

        <main
          id="main-content"
          className={cn(
            "flex flex-1 flex-col justify-center py-10 lg:flex-row lg:items-center lg:gap-16",
            className,
          )}
        >
          <section className="mb-8 max-w-md lg:mb-0 lg:flex-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {title ?? "Sign in to your pod workspace"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {description ??
                "Track mentors, schedules, and cohort progress in one place."}
            </p>
          </section>

          <section className="w-full max-w-sm lg:max-w-md">
            <div className="rounded-lg border border-border bg-card p-6">
              {children}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
