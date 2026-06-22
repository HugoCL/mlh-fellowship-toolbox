"use client"

import { useConvexAuth } from "convex/react"
import type { ReactNode } from "react"
import { PageSkeleton } from "@/components/app/page-skeleton"

/** Waits for Clerk + Convex auth without provisioning an app user. */
export function EnsureAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <PageSkeleton title="Loading…" width="narrow" />
      </div>
    )
  }

  return <>{children}</>
}
