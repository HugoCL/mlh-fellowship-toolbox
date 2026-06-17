"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import "./globals.css"

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground antialiased">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A critical error occurred while loading the app. Try again or return
            home.
          </p>
          {error.digest ? (
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => reset()}>Try again</Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="/">Go to home</a>}
            />
          </div>
        </div>
      </body>
    </html>
  )
}
