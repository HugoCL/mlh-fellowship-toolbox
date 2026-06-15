"use client"

import { useConvexAuth, useMutation } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { NotInvitedScreen } from "@/components/app/not-invited-screen"
import { api } from "@/convex/_generated/api"
import { getNotInvitedMessage } from "@/lib/app-access"

export function EnsureUser({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [ready, setReady] = useState(false)
  const [notInvitedMessage, setNotInvitedMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setReady(false)
      setNotInvitedMessage(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await ensureCurrentUser({})
      } catch (error) {
        const message = getNotInvitedMessage(error)
        if (message) {
          if (!cancelled) {
            setNotInvitedMessage(message)
            setReady(false)
          }
          return
        }

        console.error("Failed to ensure user:", error)
        return
      }

      if (!cancelled) {
        setNotInvitedMessage(null)
        setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, ensureCurrentUser])

  if (notInvitedMessage) {
    return <NotInvitedScreen message={notInvitedMessage} />
  }

  if (isLoading || !isAuthenticated || !ready) {
    return null
  }

  return <>{children}</>
}
