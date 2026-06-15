"use client"

import { useConvexAuth } from "convex/react"
import type { ReactNode } from "react"

/** Waits for Clerk + Convex auth without provisioning an app user. */
export function EnsureAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading || !isAuthenticated) {
    return null
  }

  return <>{children}</>
}
