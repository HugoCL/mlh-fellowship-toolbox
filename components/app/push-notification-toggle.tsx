"use client"

import { useMutation, useQuery } from "convex/react"
import { BellIcon, BellOffIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import {
  getExistingPushSubscription,
  isPushSupported,
  registerServiceWorker,
  serializePushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications"

type PushNotificationToggleProps = {
  compact?: boolean
}

export function PushNotificationToggle({
  compact = false,
}: PushNotificationToggleProps) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const storedSubscription = useQuery(
    api.notifications.getMyPushSubscription,
    {},
  )
  const upsertSubscription = useMutation(
    api.notifications.upsertPushSubscription,
  )
  const disableSubscription = useMutation(
    api.notifications.disablePushSubscription,
  )

  const [supported, setSupported] = useState(false)
  const [browserSubscribed, setBrowserSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!isPushSupported()) {
        if (!cancelled) {
          setSupported(false)
          setLoading(false)
        }
        return
      }

      try {
        await registerServiceWorker()
        const sub = await getExistingPushSubscription()
        if (!cancelled) {
          setSupported(true)
          setBrowserSubscribed(Boolean(sub))
        }
      } catch {
        if (!cancelled) {
          setSupported(false)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const isSubscribed = Boolean(storedSubscription?.enabled && browserSubscribed)

  async function handleEnable() {
    if (!vapidPublicKey) {
      toast.error("Push notifications are not configured on this deployment.")
      return
    }

    setWorking(true)
    try {
      await registerServiceWorker()
      const subscription = await subscribeToPush(vapidPublicKey)
      const serialized = serializePushSubscription(subscription)
      await upsertSubscription({
        ...serialized,
        userAgent: navigator.userAgent,
      })
      setBrowserSubscribed(true)
      toast.success("Browser notifications enabled.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to enable notifications.",
      )
    } finally {
      setWorking(false)
    }
  }

  async function handleDisable() {
    setWorking(true)
    try {
      const subscription = await getExistingPushSubscription()
      if (subscription) {
        await unsubscribeFromPush()
        await disableSubscription({ endpoint: subscription.endpoint })
      } else if (storedSubscription) {
        await disableSubscription({ endpoint: storedSubscription.endpoint })
      }
      setBrowserSubscribed(false)
      toast.success("Browser notifications disabled.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to disable notifications.",
      )
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    if (compact) {
      return null
    }
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Checking browser notification support…
      </p>
    )
  }

  if (!supported) {
    if (compact) {
      return null
    }
    return (
      <p className="text-sm text-muted-foreground">
        Browser push is not supported in this browser.
      </p>
    )
  }

  if (!vapidPublicKey) {
    if (compact) {
      return null
    }
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are not configured yet.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        {isSubscribed ? (
          <BellIcon className="size-4 text-primary" aria-hidden="true" />
        ) : (
          <BellOffIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span>
          {isSubscribed
            ? "Browser notifications are on"
            : "Browser notifications are off"}
        </span>
      </div>
      <Button
        type="button"
        variant={isSubscribed ? "outline" : "default"}
        size="sm"
        disabled={working}
        onClick={() => {
          if (isSubscribed) {
            void handleDisable()
          } else {
            void handleEnable()
          }
        }}
      >
        {working
          ? "Saving…"
          : isSubscribed
            ? "Turn off"
            : "Turn on notifications"}
      </Button>
    </div>
  )
}
