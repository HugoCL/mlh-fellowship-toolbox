"use client"

import { BellIcon } from "lucide-react"
import type { ReactNode } from "react"
import { PushNotificationToggle } from "@/components/app/push-notification-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BrowserNotificationsCardProps = {
  description?: string
  actions?: ReactNode
}

export function BrowserNotificationsCard({
  description = "Get browser alerts when your pod leader sends an update.",
  actions,
}: BrowserNotificationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          Browser notifications
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PushNotificationToggle />
        {actions}
      </CardContent>
    </Card>
  )
}
