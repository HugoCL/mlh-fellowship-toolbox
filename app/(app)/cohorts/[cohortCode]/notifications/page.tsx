"use client"

import { useMutation, useQuery } from "convex/react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PageSkeleton } from "@/components/app/page-skeleton"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { programDateTimeInputToTimestamp } from "@/lib/dates"
import { timeInputToMinutes } from "@/lib/notification-schedule"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { FellowInboxView } from "./fellow-inbox-view"
import { LeaderNotificationsView } from "./leader-notifications-view"
import {
  buildTargetPayload,
  emptyNotificationForm,
  emptyRecurringForm,
  recurringFormFromItem,
} from "./notification-types"
import { OneOffNotificationDialog, validateOneOffForm } from "./one-off-dialog"
import {
  RecurringNotificationDialog,
  validateRecurringForm,
} from "./recurring-dialog"

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
  const [oneOffForm, setOneOffForm] = useState(emptyNotificationForm)
  const [recurringForm, setRecurringForm] = useState(emptyRecurringForm)
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

  async function handleOneOffSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!cohortId || !validateOneOffForm(oneOffForm)) {
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
    if (!cohortId || !validateRecurringForm(recurringForm)) {
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

  if (isLoading || data === undefined) {
    return (
      <PageSkeleton
        title="Notifications"
        description="Send updates and manage recurring reminders."
      />
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
          <LeaderNotificationsView
            data={data}
            pushEnabled={pushSubscription?.enabled ?? false}
            sendingTest={sendingTest}
            onSendTest={() => void handleSendTestPush()}
            onOpenOneOff={() => setOneOffDialogOpen(true)}
            onOpenRecurring={openCreateRecurringDialog}
            onEditRecurring={openEditRecurringDialog}
            onDeleteRecurring={(id) => void handleDeleteRecurring(id)}
          />
        ) : data.view === "fellow" ? (
          <FellowInboxView
            items={data.items}
            unreadCount={data.unreadCount}
            markingAll={markingAll}
            onMarkAllRead={() => void handleMarkAllRead()}
            onMarkRead={(id) => void handleMarkRead(id)}
          />
        ) : (
          <EmptyState
            title="Notifications unavailable"
            description="You do not have access to notifications in this cohort."
          />
        )}
      </PageBody>

      <OneOffNotificationDialog
        open={oneOffDialogOpen}
        onOpenChange={setOneOffDialogOpen}
        form={oneOffForm}
        setForm={setOneOffForm}
        fellows={fellows}
        submitting={submitting}
        onSubmit={handleOneOffSubmit}
      />

      <RecurringNotificationDialog
        open={recurringDialogOpen}
        onOpenChange={(open) => {
          setRecurringDialogOpen(open)
          if (!open) {
            setEditingRecurringId(null)
            setRecurringForm(emptyRecurringForm())
          }
        }}
        form={recurringForm}
        setForm={setRecurringForm}
        fellows={fellows}
        editingRecurringId={editingRecurringId}
        submitting={submitting}
        onSubmit={handleRecurringSubmit}
      />
    </>
  )
}
