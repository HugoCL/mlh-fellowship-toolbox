"use client"

import { useMutation, useQuery } from "convex/react"
import {
  CheckCircle2Icon,
  CircleIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
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
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
  dateTimeLocalToTimestamp,
  formatDateTime,
  PROGRAM_TIMEZONE_LABEL,
  toDateTimeLocalValue,
} from "@/lib/dates"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { cn } from "@/lib/utils"

type TargetMode = "all" | "specific"

type FormState = {
  title: string
  message: string
  linkUrl: string
  dueAt: string
  targetMode: TargetMode
  selectedFellowIds: Set<string>
}

const emptyFormState = (): FormState => ({
  title: "",
  message: "",
  linkUrl: "",
  dueAt: "",
  targetMode: "all",
  selectedFellowIds: new Set(),
})

function formFromItem(item: Doc<"actionItems">): FormState {
  return {
    title: item.title,
    message: item.message,
    linkUrl: item.linkUrl ?? "",
    dueAt: toDateTimeLocalValue(item.dueAt),
    targetMode: item.targetAllFellows ? "all" : "specific",
    selectedFellowIds: new Set(item.targetFellowIds ?? []),
  }
}

export default function ActionItemsPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const { isImpersonating } = useIsImpersonating()
  const now = useMemo(() => Date.now(), [])

  const data = useQuery(
    api.actionItems.listActionItems,
    cohortId ? { cohortId, now } : "skip",
  )

  const createActionItem = useMutation(api.actionItems.createActionItem)
  const updateActionItem = useMutation(api.actionItems.updateActionItem)
  const deleteActionItem = useMutation(api.actionItems.deleteActionItem)
  const setCompletion = useMutation(api.actionItems.setCompletion)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<Id<"actionItems"> | null>(
    null,
  )
  const [form, setForm] = useState<FormState>(emptyFormState)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<Id<"actionItems"> | null>(null)

  const showLeaderView =
    !isImpersonating && (cohort?.canManagePod || cohort?.isUmbrellaViewer)

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  function openCreateDialog() {
    setEditingItemId(null)
    setForm(emptyFormState())
    setDialogOpen(true)
  }

  function openEditDialog(item: Doc<"actionItems">) {
    setEditingItemId(item._id)
    setForm(formFromItem(item))
    setDialogOpen(true)
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingItemId(null)
      setForm(emptyFormState())
    }
  }

  function toggleFellowSelection(fellowId: string) {
    setForm((prev) => {
      const next = new Set(prev.selectedFellowIds)
      if (next.has(fellowId)) {
        next.delete(fellowId)
      } else {
        next.add(fellowId)
      }
      return { ...prev, selectedFellowIds: next }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!cohortId) return

    if (!form.title.trim() || !form.message.trim() || !form.dueAt) {
      toast.error("Title, message, and due date are required.")
      return
    }

    if (form.targetMode === "specific" && form.selectedFellowIds.size === 0) {
      toast.error("Select at least one fellow.")
      return
    }

    const payload = {
      cohortId,
      title: form.title.trim(),
      message: form.message.trim(),
      linkUrl: form.linkUrl.trim() || undefined,
      dueAt: dateTimeLocalToTimestamp(form.dueAt),
      targetAllFellows: form.targetMode === "all",
      targetFellowIds:
        form.targetMode === "all"
          ? undefined
          : (Array.from(form.selectedFellowIds) as Id<"fellows">[]),
    }

    setSubmitting(true)
    try {
      if (editingItemId) {
        await updateActionItem({ ...payload, actionItemId: editingItemId })
        toast.success("Action item updated.")
      } else {
        await createActionItem(payload)
        toast.success("Action item created.")
      }
      handleDialogChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save action item.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(actionItemId: Id<"actionItems">) {
    if (!cohortId) return
    try {
      await deleteActionItem({ cohortId, actionItemId })
      toast.success("Action item deleted.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete action item.",
      )
    }
  }

  async function handleCompletionToggle(
    actionItemId: Id<"actionItems">,
    completed: boolean,
  ) {
    if (!cohortId) return
    setTogglingId(actionItemId)
    try {
      await setCompletion({ cohortId, actionItemId, completed })
      toast.success(completed ? "Marked complete." : "Marked incomplete.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status.",
      )
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading || data === undefined) {
    return (
      <>
        <PageHeader
          title="Action Items"
          description="Assign tasks and track completion."
        />
        <PageBody>
          <EmptyState
            title="Loading…"
            description="Fetching action items for this pod."
          />
        </PageBody>
      </>
    )
  }

  if (!cohortId || !cohort) {
    return (
      <>
        <PageHeader
          title="Action Items"
          description="Assign tasks and track completion."
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
          title="Action Items"
          description="Assign tasks and track completion."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  const fellows = data.view === "leader" ? data.fellows : []

  return (
    <>
      <PageHeader
        title="Action Items"
        description="Assign tasks and track completion."
      />
      <PageBody>
        {showLeaderView && data.view === "leader" ? (
          <>
            <PageToolbar title="Pod action items">
              <Button onClick={openCreateDialog}>
                <PlusIcon className="size-4" />
                Create action item
              </Button>
            </PageToolbar>

            {data.items.length === 0 ? (
              <EmptyState
                title="No action items yet"
                description="Create an action item to assign work to fellows in your pod."
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {data.items.map(
                  ({ item, completedCount, targetCount, fellowStatuses }) => {
                    const completed = fellowStatuses.filter(
                      (status) => status.completed,
                    )
                    const pending = fellowStatuses.filter(
                      (status) => !status.completed,
                    )

                    return (
                      <li key={item._id}>
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base">
                                  {item.title}
                                </CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Due {formatDateTime(item.dueAt)} ·{" "}
                                  {completedCount}/{targetCount} complete
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Edit ${item.title}`}
                                  onClick={() => openEditDialog(item)}
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
                                        Delete action item?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This removes the item and all completion
                                        records. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          void handleDelete(item._id)
                                        }
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <p className="text-sm">{item.message}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Completed ({completed.length})
                                </p>
                                {completed.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No one yet
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {completed.map((status) => (
                                      <li
                                        key={status.fellowId}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                                        <span className="font-medium">
                                          {status.name}
                                        </span>
                                        {status.completedAt ? (
                                          <span className="text-muted-foreground">
                                            ·{" "}
                                            {formatDateTime(status.completedAt)}
                                          </span>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Not completed ({pending.length})
                                </p>
                                {pending.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    Everyone done
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {pending.map((status) => (
                                      <li
                                        key={status.fellowId}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <CircleIcon className="size-4 shrink-0 text-muted-foreground" />
                                        <span>{status.name}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </li>
                    )
                  },
                )}
              </ul>
            )}
          </>
        ) : data.view === "fellow" ? (
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">Open</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.openItems.length === 0
                    ? "You're caught up on action items."
                    : `${data.openItems.length} item${data.openItems.length === 1 ? "" : "s"} waiting on you.`}
                </p>
              </div>

              {data.openItems.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center gap-3 py-6">
                    <CheckCircle2Icon className="size-5 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      No open action items right now.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.openItems.map(({ item, isOverdue }) => (
                    <li key={item._id}>
                      <Card
                        className={cn(
                          isOverdue && "border-destructive/40 bg-destructive/5",
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-base">
                              {item.title}
                            </CardTitle>
                            {isOverdue ? (
                              <Badge variant="destructive">Overdue</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDateTime(item.dueAt)}
                          </p>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                          <p className="text-sm">{item.message}</p>
                          <div className="flex flex-wrap items-center gap-3">
                            {item.linkUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                nativeButton={false}
                                render={
                                  <Link
                                    href={item.linkUrl}
                                    target={
                                      item.linkUrl.startsWith("http")
                                        ? "_blank"
                                        : undefined
                                    }
                                    rel={
                                      item.linkUrl.startsWith("http")
                                        ? "noopener noreferrer"
                                        : undefined
                                    }
                                  />
                                }
                              >
                                Open link
                                <ExternalLinkIcon className="size-3.5" />
                              </Button>
                            ) : null}
                            <div className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox
                                checked={false}
                                disabled={togglingId === item._id}
                                aria-label={`Mark ${item.title} complete`}
                                onCheckedChange={(checked) => {
                                  if (checked === true) {
                                    void handleCompletionToggle(item._id, true)
                                  }
                                }}
                              />
                              Mark complete
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Completed
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.completedItems.length === 0
                    ? "Completed items will appear here."
                    : `${data.completedItems.length} completed item${data.completedItems.length === 1 ? "" : "s"}.`}
                </p>
              </div>

              {data.completedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing completed yet.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.completedItems.map(({ item, completedAt }) => (
                    <li key={item._id}>
                      <Card className="opacity-80">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base text-muted-foreground">
                            {item.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Completed {formatDateTime(completedAt)}
                          </p>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                          <p className="text-sm text-muted-foreground">
                            {item.message}
                          </p>
                          <div className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked
                              disabled={togglingId === item._id}
                              aria-label={`Mark ${item.title} incomplete`}
                              onCheckedChange={(checked) => {
                                if (checked === false) {
                                  void handleCompletionToggle(item._id, false)
                                }
                              }}
                            />
                            Completed
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <EmptyState
            title="Unable to load action items"
            description="Your role does not have access to this view."
          />
        )}
      </PageBody>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItemId ? "Edit action item" : "Create action item"}
            </DialogTitle>
            <DialogDescription>
              Assign a task to all fellows or specific people in your pod.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleSubmit(event)}>
            <FieldGroup className="gap-4 py-2">
              <Field>
                <FieldLabel htmlFor="action-title">Title</FieldLabel>
                <Input
                  id="action-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Submit weekly reflection"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="action-message">Message</FieldLabel>
                <Textarea
                  id="action-message"
                  value={form.message}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Share what you learned this week…"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="action-due">
                  Due date & time ({PROGRAM_TIMEZONE_LABEL})
                </FieldLabel>
                <Input
                  id="action-due"
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueAt: event.target.value }))
                  }
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="action-link">Link (optional)</FieldLabel>
                <Input
                  id="action-link"
                  type="url"
                  value={form.linkUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      linkUrl: event.target.value,
                    }))
                  }
                  placeholder="https://…"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="action-audience">People</FieldLabel>
                <Select
                  value={form.targetMode}
                  onValueChange={(value) => {
                    if (value === "all" || value === "specific") {
                      setForm((prev) => ({ ...prev, targetMode: value }))
                    }
                  }}
                >
                  <SelectTrigger id="action-audience">
                    <SelectValue>
                      {form.targetMode === "all"
                        ? "All fellows"
                        : "Specific people"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All fellows</SelectItem>
                      <SelectItem value="specific">Specific people</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {form.targetMode === "specific" ? (
                <Field>
                  <FieldLabel>Select fellows</FieldLabel>
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                    {fellows.map((fellow) => (
                      <li key={fellow._id}>
                        <div className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.selectedFellowIds.has(fellow._id)}
                            aria-label={`Assign to ${fellow.name}`}
                            onCheckedChange={() =>
                              toggleFellowSelection(fellow._id)
                            }
                          />
                          {fellow.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Field>
              ) : null}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {editingItemId ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
