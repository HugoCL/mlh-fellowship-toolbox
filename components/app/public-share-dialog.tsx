"use client"

import { useMutation, useQuery } from "convex/react"
import { CopyIcon, RefreshCwIcon, ShieldOffIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  type PublicShareFeature,
  publicShareUrl,
} from "@/lib/public-share-links"

export function PublicShareDialog({
  cohortId,
  feature,
  title,
  description,
  triggerLabel,
  triggerIcon,
}: {
  cohortId: Id<"cohorts">
  feature: PublicShareFeature
  title: string
  description: string
  triggerLabel: string
  triggerIcon?: ReactNode
}) {
  const share = useQuery(api.publicShares.getForFeature, { cohortId, feature })
  const createOrEnable = useMutation(api.publicShares.createOrEnable)
  const regenerate = useMutation(api.publicShares.regenerate)
  const disable = useMutation(api.publicShares.disable)
  const [isBusy, setIsBusy] = useState(false)

  const shareUrl =
    share?.enabled && typeof window !== "undefined"
      ? publicShareUrl(window.location.origin, feature, share.token)
      : null

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url)
    toast.success("Public link copied.")
  }

  async function handleCreateOrEnable() {
    setIsBusy(true)
    try {
      const result = await createOrEnable({ cohortId, feature })
      const url = publicShareUrl(window.location.origin, feature, result.token)
      await copyLink(url)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create link.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRegenerate() {
    setIsBusy(true)
    try {
      const result = await regenerate({ cohortId, feature })
      const url = publicShareUrl(window.location.origin, feature, result.token)
      await copyLink(url)
      toast.success("Public link regenerated.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate link.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  async function handleDisable() {
    setIsBusy(true)
    try {
      await disable({ cohortId, feature })
      toast.success("Public link disabled.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disable link.",
      )
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-sm font-medium">
              {share?.enabled ? "Public link" : "Public link disabled"}
            </p>
            {shareUrl ? (
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {shareUrl}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Create a link to share this readonly public view.
              </p>
            )}
          </div>

          <DialogFooter className="flex-wrap">
            {shareUrl ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => void copyLink(shareUrl)}
                >
                  <CopyIcon data-icon="inline-start" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => void handleRegenerate()}
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => void handleDisable()}
                >
                  <ShieldOffIcon data-icon="inline-start" />
                  Disable
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => void handleCreateOrEnable()}
              >
                <CopyIcon data-icon="inline-start" />
                Create and copy link
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
