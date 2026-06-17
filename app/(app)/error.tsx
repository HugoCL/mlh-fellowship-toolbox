"use client"

import { useEffect } from "react"
import { ErrorFallbackPanel } from "@/components/app/error-fallback-panel"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorFallbackPanel
      layout="app"
      error={error}
      reset={reset}
      homeHref="/dashboard"
      description="We hit an unexpected error while loading this part of the app. Your data is safe."
    />
  )
}
