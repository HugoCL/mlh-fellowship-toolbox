"use client"

import { useMutation, useQuery } from "convex/react"
import { EyeIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

export function ImpersonationBanner() {
  const router = useRouter()
  const impersonation = useQuery(api.impersonation.getActiveImpersonation, {})
  const stopImpersonation = useMutation(api.impersonation.stopImpersonation)
  const cleanupStaleImpersonation = useMutation(
    api.impersonation.cleanupStaleImpersonation,
  )

  useEffect(() => {
    void cleanupStaleImpersonation({})
  }, [cleanupStaleImpersonation])

  if (!impersonation) {
    return null
  }

  async function handleStop() {
    try {
      await stopImpersonation({})
      toast.success("Stopped viewing as fellow.")
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not stop impersonation.",
      )
    }
  }

  return (
    <Alert
      className={cn(
        "rounded-none border-x-0 border-t-0 border-b border-warning/30 bg-warning/10 px-4 py-2.5",
        "[&>svg]:text-warning",
      )}
    >
      <EyeIcon />
      <AlertTitle>Viewing as {impersonation.fellow.name}</AlertTitle>
      <AlertDescription>
        You are seeing {impersonation.cohort.programCode} as this fellow would.
        Leader actions are disabled until you exit.
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={() => void handleStop()}>
          Exit view
        </Button>
      </AlertAction>
    </Alert>
  )
}
