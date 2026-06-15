"use client"

import { useConvexAuth, useMutation } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"

export function EnsureUser({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setReady(false)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await ensureCurrentUser({})
      } catch (error) {
        console.error("Failed to ensure user:", error)
        return
      }

      if (!cancelled) {
        setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, ensureCurrentUser])

  if (isLoading || !isAuthenticated || !ready) {
    return null
  }

  return <>{children}</>
}
