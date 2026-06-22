import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { BrowserNotificationsCard } from "@/components/app/browser-notifications-card"
import { EmptyState } from "@/components/app/empty-state"
import { SectionHeader } from "@/components/app/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

type FellowNotificationItem = {
  notification: Doc<"notifications">
  recipient: Doc<"notificationRecipients">
}

export function FellowInboxView({
  items,
  unreadCount,
  markingAll,
  onMarkAllRead,
  onMarkRead,
}: {
  items: FellowNotificationItem[]
  unreadCount: number
  markingAll: boolean
  onMarkAllRead: () => void
  onMarkRead: (notificationId: Id<"notifications">) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <BrowserNotificationsCard />

      <SectionHeader
        title="Inbox"
        description={
          unreadCount === 0
            ? "You're caught up."
            : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
        }
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={markingAll}
              onClick={() => void onMarkAllRead()}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When your pod leader sends an update, it will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ notification, recipient }) => (
            <li key={recipient._id}>
              <Card
                className={cn(
                  !recipient.readAt && "border-primary/30 bg-primary/5",
                )}
              >
                <CardHeader className="gap-2 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {notification.title}
                    </CardTitle>
                    {!recipient.readAt ? <Badge>New</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm">{notification.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {notification.linkUrl ? (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link
                            href={notification.linkUrl}
                            target={
                              notification.linkUrl.startsWith("http")
                                ? "_blank"
                                : undefined
                            }
                          />
                        }
                      >
                        Open link
                        <ExternalLinkIcon className="size-3.5" />
                      </Button>
                    ) : null}
                    {!recipient.readAt ? (
                      <Button
                        size="sm"
                        onClick={() => void onMarkRead(notification._id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
