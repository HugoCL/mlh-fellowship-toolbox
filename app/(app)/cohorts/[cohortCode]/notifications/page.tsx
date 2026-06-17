"use client"

import { useMutation, useQuery } from "convex/react"
import {
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { BrowserNotificationsCard } from "@/components/app/browser-notifications-card"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
  formatDateTime,
  PROGRAM_TIMEZONE_LABEL,
  programDateTimeInputToTimestamp,
  toProgramDateTimeInputValue,
} from "@/lib/dates"
import {
  formatCadenceLabel,
  minutesToTimeInput,
  timeInputToMinutes,
  WEEKDAY_OPTIONS,
} from "@/lib/notification-schedule"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { cn } from "@/lib/utils"

type TargetMode = "all" | "specific"

type NotificationFormState = {
  title: string
  body: string
  linkUrl: string
  targetMode: TargetMode
  selectedFellowIds: Set<string>
}

type RecurringFormState = NotificationFormState & {
  cadence: "daily" | "weekly" | "monthly"
  weekdays: Set<number>
  timeOfDay: string
  nextRunAt: string
  endAt: string
  enabled: boolean
}

const emptyNotificationForm = (): NotificationFormState => ({
  title: "",
  body: "",
  linkUrl: "",
  targetMode: "all",
  selectedFellowIds: new Set(),
})

const emptyRecurringForm = (): RecurringFormState => ({
  ...emptyNotificationForm(),
  cadence: "weekly",
  weekdays: new Set([1]),
  timeOfDay: "09:00",
  nextRunAt: "",
  endAt: "",
  enabled: true,
})

function notificationFormFromItem(
  item: Pick<
    Doc<"notifications">,
    "title" | "body" | "linkUrl" | "targetAllFellows" | "targetFellowIds"
  >,
): NotificationFormState {
  return {
    title: item.title,
    body: item.body,
    linkUrl: item.linkUrl ?? "",
    targetMode: item.targetAllFellows ? "all" : "specific",
    selectedFellowIds: new Set(item.targetFellowIds ?? []),
  }
}

function recurringFormFromItem(
  item: Doc<"recurringNotifications">,
): RecurringFormState {
  return {
    ...notificationFormFromItem(item),
    cadence: item.cadence,
    weekdays: new Set(item.weekdays ?? []),
    timeOfDay: minutesToTimeInput(item.timeOfDayMinutes),
    nextRunAt: toProgramDateTimeInputValue(item.nextRunAt),
    endAt: item.endAt ? toProgramDateTimeInputValue(item.endAt) : "",
    enabled: item.enabled,
  }
}

function getStatusLabel(status: Doc<"notifications">["status"]): string {
  switch (status) {
    case "pending":
      return "Pending"
    case "sent":
      return "Sent"
    case "partial":
      return "Partial"
    case "failed":
      return "Failed"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export default function NotificationsPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const { isImpersonating } = useIsImpersonating()

  const data = useQuery(
    api.notifications.listNotifications,
    cohortId ? { cohortId } : "skip",
  )

  const createNotification = useMutation(api.notifications.createNotification)
  const createRecurringNotification = useMutation(
    api.notifications.createRecurringNotification,
  )
  const updateRecurringNotification = useMutation(
    api.notifications.updateRecurringNotification,
  )
  const deleteRecurringNotification = useMutation(
    api.notifications.deleteRecurringNotification,
  )
  const markNotificationRead = useMutation(
    api.notifications.markNotificationRead,
  )
  const markAllNotificationsRead = useMutation(
    api.notifications.markAllNotificationsRead,
  )
  const sendTestPushNotification = useMutation(
    api.notifications.sendTestPushNotification,
  )
  const pushSubscription = useQuery(api.notifications.getMyPushSubscription, {})

  const [oneOffDialogOpen, setOneOffDialogOpen] = useState(false)
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [editingRecurringId, setEditingRecurringId] =
    useState<Id<"recurringNotifications"> | null>(null)
  const [oneOffForm, setOneOffForm] = useState<NotificationFormState>(
    emptyNotificationForm,
  )
  const [recurringForm, setRecurringForm] =
    useState<RecurringFormState>(emptyRecurringForm)
  const [submitting, setSubmitting] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  const showLeaderView =
    !isImpersonating && (cohort?.canManagePod || cohort?.isUmbrellaViewer)

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  const fellows = useMemo(
    () => (data?.view === "leader" ? data.fellows : []),
    [data],
  )

  function toggleFellowSelection<T extends NotificationFormState>(
    formSetter: React.Dispatch<React.SetStateAction<T>>,
    fellowId: string,
  ) {
    formSetter((prev) => {
      const next = new Set(prev.selectedFellowIds)
      if (next.has(fellowId)) {
        next.delete(fellowId)
      } else {
        next.add(fellowId)
      }
      return { ...prev, selectedFellowIds: next }
    })
  }

  function toggleWeekday(day: number) {
    setRecurringForm((prev) => {
      const next = new Set(prev.weekdays)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return { ...prev, weekdays: next }
    })
  }

  function buildTargetPayload(form: NotificationFormState) {
    return {
      targetAllFellows: form.targetMode === "all",
      targetFellowIds:
        form.targetMode === "all"
          ? undefined
          : (Array.from(form.selectedFellowIds) as Id<"fellows">[]),
    }
  }

  function validateTargetForm(form: NotificationFormState): boolean {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required.")
      return false
    }
    if (form.targetMode === "specific" && form.selectedFellowIds.size === 0) {
      toast.error("Select at least one fellow.")
      return false
    }
    return true
  }

  async function handleOneOffSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!cohortId || !validateTargetForm(oneOffForm)) {
      return
    }

    setSubmitting(true)
    try {
      await createNotification({
        cohortId,
        title: oneOffForm.title.trim(),
        body: oneOffForm.body.trim(),
        linkUrl: oneOffForm.linkUrl.trim() || undefined,
        ...buildTargetPayload(oneOffForm),
      })
      toast.success("Notification sent.")
      setOneOffDialogOpen(false)
      setOneOffForm(emptyNotificationForm())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send notification.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecurringSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!cohortId || !validateTargetForm(recurringForm)) {
      return
    }
    if (!recurringForm.nextRunAt) {
      toast.error("First run date is required.")
      return
    }
    if (
      recurringForm.cadence === "weekly" &&
      recurringForm.weekdays.size === 0
    ) {
      toast.error("Select at least one weekday.")
      return
    }

    const payload = {
      cohortId,
      title: recurringForm.title.trim(),
      body: recurringForm.body.trim(),
      linkUrl: recurringForm.linkUrl.trim() || undefined,
      ...buildTargetPayload(recurringForm),
      cadence: recurringForm.cadence,
      weekdays:
        recurringForm.cadence === "weekly"
          ? Array.from(recurringForm.weekdays)
          : undefined,
      timeOfDayMinutes: timeInputToMinutes(recurringForm.timeOfDay),
      nextRunAt: programDateTimeInputToTimestamp(recurringForm.nextRunAt),
      endAt: recurringForm.endAt
        ? programDateTimeInputToTimestamp(recurringForm.endAt)
        : undefined,
    }

    setSubmitting(true)
    try {
      if (editingRecurringId) {
        await updateRecurringNotification({
          ...payload,
          recurringNotificationId: editingRecurringId,
          enabled: recurringForm.enabled,
        })
        toast.success("Recurring notification updated.")
      } else {
        await createRecurringNotification(payload)
        toast.success("Recurring notification created.")
      }
      setRecurringDialogOpen(false)
      setEditingRecurringId(null)
      setRecurringForm(emptyRecurringForm())
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save recurring notification.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteRecurring(
    recurringNotificationId: Id<"recurringNotifications">,
  ) {
    if (!cohortId) return
    try {
      await deleteRecurringNotification({ cohortId, recurringNotificationId })
      toast.success("Recurring notification deleted.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete recurring notification.",
      )
    }
  }

  async function handleMarkRead(notificationId: Id<"notifications">) {
    if (!cohortId) return
    try {
      await markNotificationRead({ cohortId, notificationId })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as read.",
      )
    }
  }

  async function handleSendTestPush() {
    if (!cohortId) return
    setSendingTest(true)
    try {
      await sendTestPushNotification({ cohortId })
      toast.success("Test notification sent. Check this browser or device.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send test notification.",
      )
    } finally {
      setSendingTest(false)
    }
  }

  async function handleMarkAllRead() {
    if (!cohortId) return
    setMarkingAll(true)
    try {
      const count = await markAllNotificationsRead({ cohortId })
      toast.success(
        count === 0 ? "You're all caught up." : `Marked ${count} as read.`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark all as read.",
      )
    } finally {
      setMarkingAll(false)
    }
  }

  function openCreateRecurringDialog() {
    setEditingRecurringId(null)
    setRecurringForm(emptyRecurringForm())
    setRecurringDialogOpen(true)
  }

  function openEditRecurringDialog(item: Doc<"recurringNotifications">) {
    setEditingRecurringId(item._id)
    setRecurringForm(recurringFormFromItem(item))
    setRecurringDialogOpen(true)
  }

  function renderTargetFields<T extends NotificationFormState>(
    form: T,
    setForm: React.Dispatch<React.SetStateAction<T>>,
  ) {
    return (
      <>
        <Field>
          <FieldLabel>Audience</FieldLabel>
          <Select
            value={form.targetMode}
            onValueChange={(value) => {
              if (value === "all" || value === "specific") {
                setForm((prev) => ({ ...prev, targetMode: value }))
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {form.targetMode === "all" ? "All fellows" : "Specific fellows"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All fellows</SelectItem>
                <SelectItem value="specific">Specific fellows</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {form.targetMode === "specific" ? (
          <Field>
            <FieldLabel>Fellows</FieldLabel>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {fellows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No fellows in this pod yet.
                </p>
              ) : (
                fellows.map((fellow) => (
                  <div
                    key={fellow._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id={`fellow-${fellow._id}`}
                      checked={form.selectedFellowIds.has(fellow._id)}
                      onCheckedChange={() =>
                        toggleFellowSelection(setForm, fellow._id)
                      }
                    />
                    <label htmlFor={`fellow-${fellow._id}`}>
                      {fellow.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </Field>
        ) : null}
      </>
    )
  }

  if (isLoading || data === undefined) {
    return (
      <>
        <PageHeader
          title="Notifications"
          description="Send updates and manage recurring reminders."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching notifications for this pod."
          />
        </PageBody>
      </>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="Notifications"
          description="Send updates and manage recurring reminders."
        />
        <PageBody>
          <EmptyState
            title="Cohort not found"
            description="This program code does not match a cohort you can access."
          />
        </PageBody>
      </>
    )
  }

  if (isUmbrellaAdminBlocked) {
    return (
      <>
        <PageHeader
          title="Notifications"
          description="Send updates and manage recurring reminders."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send updates and manage recurring reminders."
      />
      <PageBody>
        {showLeaderView && data.view === "leader" ? (
          <div className="flex flex-col gap-6">
            <BrowserNotificationsCard
              description="Turn on browser notifications on this device, then send yourself a test push before messaging fellows."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sendingTest || !pushSubscription?.enabled}
                  onClick={() => void handleSendTestPush()}
                >
                  {sendingTest ? "Sending…" : "Send test to me"}
                </Button>
              }
            />

            <Tabs defaultValue="sent">
              <PageToolbar title="Pod notifications">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setOneOffDialogOpen(true)}>
                    <PlusIcon className="size-4" />
                    Send now
                  </Button>
                  <Button variant="outline" onClick={openCreateRecurringDialog}>
                    <PlusIcon className="size-4" />
                    Add recurring
                  </Button>
                </div>
              </PageToolbar>

              <TabsList>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="recurring">Recurring</TabsTrigger>
              </TabsList>

              <TabsContent value="sent" className="mt-4">
                {data.notifications.length === 0 ? (
                  <EmptyState
                    title="No notifications yet"
                    description="Send a one-off notification or set up a recurring schedule."
                  />
                ) : (
                  <ul className="flex flex-col gap-4">
                    {data.notifications.map(
                      ({
                        notification,
                        recipientStats,
                        readCount,
                        targetCount,
                      }) => (
                        <li key={notification._id}>
                          <Card>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <CardTitle className="text-base">
                                    {notification.title}
                                  </CardTitle>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Sent{" "}
                                    {formatDateTime(notification.createdAt)} ·{" "}
                                    {readCount}/{targetCount} read
                                  </p>
                                </div>
                                <Badge variant="secondary">
                                  {getStatusLabel(notification.status)}
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
                                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
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

              <TabsContent value="recurring" className="mt-4">
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
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base">
                                  {item.title}
                                </CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {formatCadenceLabel(
                                    item.cadence,
                                    item.weekdays,
                                  )}{" "}
                                  at {minutesToTimeInput(item.timeOfDayMinutes)}{" "}
                                  {PROGRAM_TIMEZONE_LABEL} · Next{" "}
                                  {formatDateTime(item.nextRunAt)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Badge
                                  variant={
                                    item.enabled ? "default" : "secondary"
                                  }
                                >
                                  {item.enabled ? "Active" : "Paused"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Edit ${item.title}`}
                                  onClick={() => openEditRecurringDialog(item)}
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
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          void handleDeleteRecurring(item._id)
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
        ) : data.view === "fellow" ? (
          <div className="flex flex-col gap-6">
            <BrowserNotificationsCard />

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">Inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.unreadCount === 0
                    ? "You're caught up."
                    : `${data.unreadCount} unread notification${data.unreadCount === 1 ? "" : "s"}.`}
                </p>
              </div>
              {data.unreadCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={markingAll}
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all read
                </Button>
              ) : null}
            </div>

            {data.items.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="When your pod leader sends an update, it will show up here."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.items.map(({ notification, recipient }) => (
                  <li key={recipient._id}>
                    <Card
                      className={cn(
                        !recipient.readAt && "border-primary/30 bg-primary/5",
                      )}
                    >
                      <CardHeader className="pb-2">
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
                              onClick={() =>
                                void handleMarkRead(notification._id)
                              }
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
        ) : (
          <EmptyState
            title="Notifications unavailable"
            description="You do not have access to notifications in this cohort."
          />
        )}
      </PageBody>

      <Dialog open={oneOffDialogOpen} onOpenChange={setOneOffDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send notification</DialogTitle>
            <DialogDescription>
              Deliver a one-time update to selected fellows.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOneOffSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="oneoff-title">Title</FieldLabel>
                <Input
                  id="oneoff-title"
                  value={oneOffForm.title}
                  onChange={(event) =>
                    setOneOffForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="oneoff-body">Message</FieldLabel>
                <Textarea
                  id="oneoff-body"
                  value={oneOffForm.body}
                  onChange={(event) =>
                    setOneOffForm((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="oneoff-link">Link (optional)</FieldLabel>
                <Input
                  id="oneoff-link"
                  value={oneOffForm.linkUrl}
                  onChange={(event) =>
                    setOneOffForm((prev) => ({
                      ...prev,
                      linkUrl: event.target.value,
                    }))
                  }
                  placeholder="https://… or /cohorts/…"
                />
              </Field>
              {renderTargetFields(oneOffForm, setOneOffForm)}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOneOffDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send now"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recurringDialogOpen}
        onOpenChange={(open) => {
          setRecurringDialogOpen(open)
          if (!open) {
            setEditingRecurringId(null)
            setRecurringForm(emptyRecurringForm())
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecurringId
                ? "Edit recurring notification"
                : "Add recurring notification"}
            </DialogTitle>
            <DialogDescription>
              Schedule automatic reminders in {PROGRAM_TIMEZONE_LABEL}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecurringSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="recurring-title">Title</FieldLabel>
                <Input
                  id="recurring-title"
                  value={recurringForm.title}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-body">Message</FieldLabel>
                <Textarea
                  id="recurring-body"
                  value={recurringForm.body}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-link">
                  Link (optional)
                </FieldLabel>
                <Input
                  id="recurring-link"
                  value={recurringForm.linkUrl}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      linkUrl: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Cadence</FieldLabel>
                <Select
                  value={recurringForm.cadence}
                  onValueChange={(value) => {
                    if (
                      value === "daily" ||
                      value === "weekly" ||
                      value === "monthly"
                    ) {
                      setRecurringForm((prev) => ({ ...prev, cadence: value }))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {recurringForm.cadence === "daily"
                        ? "Daily"
                        : recurringForm.cadence === "weekly"
                          ? "Weekly"
                          : "Monthly"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {recurringForm.cadence === "weekly" ? (
                <Field>
                  <FieldLabel>Weekdays</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <div
                        key={day.value}
                        className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                      >
                        <Checkbox
                          id={`weekday-${day.value}`}
                          checked={recurringForm.weekdays.has(day.value)}
                          onCheckedChange={() => toggleWeekday(day.value)}
                        />
                        <label htmlFor={`weekday-${day.value}`}>
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="recurring-time">Time</FieldLabel>
                <Input
                  id="recurring-time"
                  type="time"
                  value={recurringForm.timeOfDay}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      timeOfDay: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-next">
                  First run ({PROGRAM_TIMEZONE_LABEL})
                </FieldLabel>
                <Input
                  id="recurring-next"
                  type="datetime-local"
                  value={recurringForm.nextRunAt}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      nextRunAt: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="recurring-end">
                  End date (optional)
                </FieldLabel>
                <Input
                  id="recurring-end"
                  type="datetime-local"
                  value={recurringForm.endAt}
                  onChange={(event) =>
                    setRecurringForm((prev) => ({
                      ...prev,
                      endAt: event.target.value,
                    }))
                  }
                />
              </Field>
              {editingRecurringId ? (
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={recurringForm.enabled ? "enabled" : "paused"}
                    onValueChange={(value) => {
                      if (value === "enabled" || value === "paused") {
                        setRecurringForm((prev) => ({
                          ...prev,
                          enabled: value === "enabled",
                        }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {recurringForm.enabled ? "Active" : "Paused"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="enabled">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {renderTargetFields(recurringForm, setRecurringForm)}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecurringDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Saving…"
                  : editingRecurringId
                    ? "Save changes"
                    : "Create schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
