"use client"

import { BellIcon } from "lucide-react"
import { PushNotificationToggle } from "@/components/app/push-notification-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BrowserNotificationsCardProps = {
  description?: string
  actions?: React.ReactNode
}

export function BrowserNotificationsCard({
  description = "Get browser alerts when your pod leader sends an update.",
  actions,
}: BrowserNotificationsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellIcon className="size-4" />
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
