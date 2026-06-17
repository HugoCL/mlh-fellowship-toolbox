"use client"

import { useEffect } from "react"
import { ErrorFallbackPanel } from "@/components/app/error-fallback-panel"

export default function RootError({
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
      layout="segment"
      error={error}
      reset={reset}
      homeHref="/"
      homeLabel="Go to home"
    />
  )
}
