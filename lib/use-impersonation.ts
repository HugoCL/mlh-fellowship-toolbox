"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useIsImpersonating() {
  const impersonation = useQuery(api.impersonation.getActiveImpersonation, {})

  return {
    isImpersonating: impersonation != null,
    isLoading: impersonation === undefined,
    impersonation: impersonation ?? null,
  }
}
