import type { FunctionReturnType } from "convex/server"
import {
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { BrowserNotificationsCard } from "@/components/app/browser-notifications-card"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import { PageToolbar } from "@/components/app/page-frame"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { formatDateTime, PROGRAM_TIMEZONE_LABEL } from "@/lib/dates"
import {
  formatCadenceLabel,
  minutesToTimeInput,
} from "@/lib/notification-schedule"
import { getNotificationStatusLabel } from "./notification-types"

type LeaderNotificationData = Extract<
  FunctionReturnType<typeof api.notifications.listNotifications>,
  { view: "leader" }
>

export function LeaderNotificationsView({
  data,
  pushEnabled,
  sendingTest,
  onSendTest,
  onOpenOneOff,
  onOpenRecurring,
  onEditRecurring,
  onDeleteRecurring,
}: {
  data: LeaderNotificationData
  pushEnabled: boolean
  sendingTest: boolean
  onSendTest: () => void
  onOpenOneOff: () => void
  onOpenRecurring: () => void
  onEditRecurring: (item: Doc<"recurringNotifications">) => void
  onDeleteRecurring: (id: Id<"recurringNotifications">) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <BrowserNotificationsCard
        description="Turn on browser notifications on this device, then send yourself a test push before messaging fellows."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sendingTest || !pushEnabled}
            onClick={() => void onSendTest()}
          >
            {sendingTest ? "Sending…" : "Send test to me"}
          </Button>
        }
      />

      <InfoCallout variant="info">
        One-off sends deliver immediately. Recurring schedules run in{" "}
        {PROGRAM_TIMEZONE_LABEL}.
      </InfoCallout>

      <Tabs defaultValue="sent" className="gap-4">
        <PageToolbar title="Pod notifications">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onOpenOneOff}>
              <PlusIcon className="size-4" />
              Send now
            </Button>
            <Button variant="outline" onClick={onOpenRecurring}>
              <PlusIcon className="size-4" />
              Add recurring
            </Button>
          </div>
        </PageToolbar>

        <TabsList>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-0">
          {data.notifications.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="Send a one-off notification or set up a recurring schedule."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {data.notifications.map(
                ({ notification, recipientStats, readCount, targetCount }) => (
                  <li key={notification._id}>
                    <Card>
                      <CardHeader className="gap-3 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base">
                              {notification.title}
                            </CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Sent {formatDateTime(notification.createdAt)} ·{" "}
                              {readCount}/{targetCount} read
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {getNotificationStatusLabel(notification.status)}
                          </Badge>
                        </div>
                        <p className="text-sm">{notification.body}</p>
                        {notification.linkUrl ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
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
                      </CardHeader>
                      <CardContent>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {recipientStats.map((status) => (
                            <li
                              key={status.fellowId}
                              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                            >
                              <span>{status.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {status.pushStatus}
                                </Badge>
                                {status.readAt ? (
                                  <span className="text-xs text-muted-foreground">
                                    Read
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </li>
                ),
              )}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="recurring" className="mt-0">
          {data.recurring.length === 0 ? (
            <EmptyState
              title="No recurring notifications"
              description="Create a schedule to send reminders automatically."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {data.recurring.map((item) => (
                <li key={item._id}>
                  <Card>
                    <CardHeader className="gap-3 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base">
                            {item.title}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatCadenceLabel(item.cadence, item.weekdays)} at{" "}
                            {minutesToTimeInput(item.timeOfDayMinutes)}{" "}
                            {PROGRAM_TIMEZONE_LABEL} · Next{" "}
                            {formatDateTime(item.nextRunAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge
                            variant={item.enabled ? "default" : "secondary"}
                          >
                            {item.enabled ? "Active" : "Paused"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => onEditRecurring(item)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${item.title}`}
                                />
                              }
                            >
                              <Trash2Icon className="size-4 text-destructive" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete recurring notification?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Future scheduled sends will stop. Past
                                  notifications stay in the sent list.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    void onDeleteRecurring(item._id)
                                  }
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <p className="text-sm">{item.body}</p>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
