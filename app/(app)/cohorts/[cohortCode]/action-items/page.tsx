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
import { PageSkeleton, SkeletonList } from "@/components/app/page-skeleton"
import { SectionHeader } from "@/components/app/section-header"
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
import { Card } from "@/components/ui/card"
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
      <PageSkeleton
        title="Action Items"
        description="Assign tasks and track completion."
      >
        <SkeletonList count={4} />
      </PageSkeleton>
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
          <div className="flex flex-col gap-6">
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
                action={
                  <Button onClick={openCreateDialog}>
                    <PlusIcon className="size-4" />
                    Create action item
                  </Button>
                }
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
                        <Card className="gap-4 p-5">
                          <SectionHeader
                            title={item.title}
                            description={`Due ${formatDateTime(item.dueAt)} · ${completedCount}/${targetCount} complete`}
                            actions={
                              <>
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
                              </>
                            }
                          />
                          <p className="text-sm">{item.message}</p>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="flex flex-col gap-3">
                              <SectionHeader
                                title={`Completed (${completed.length})`}
                              />
                              {completed.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No one yet
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {completed.map((status) => (
                                    <li
                                      key={status.fellowId}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                                      <span className="font-medium">
                                        {status.name}
                                      </span>
                                      {status.completedAt ? (
                                        <span className="text-muted-foreground">
                                          · {formatDateTime(status.completedAt)}
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="flex flex-col gap-3">
                              <SectionHeader
                                title={`Not completed (${pending.length})`}
                              />
                              {pending.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Everyone done
                                </p>
                              ) : (
                                <ul className="space-y-2">
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
                        </Card>
                      </li>
                    )
                  },
                )}
              </ul>
            )}
          </div>
        ) : data.view === "fellow" ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <SectionHeader
                title="Open"
                description={
                  data.openItems.length === 0
                    ? "You're caught up on action items."
                    : `${data.openItems.length} item${data.openItems.length === 1 ? "" : "s"} waiting on you.`
                }
              />

              {data.openItems.length === 0 ? (
                <EmptyState
                  title="No open action items"
                  description="You're all caught up for now."
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {data.openItems.map(({ item, isOverdue }) => (
                    <li key={item._id}>
                      <Card
                        className={cn(
                          "gap-4 p-5",
                          isOverdue && "border-destructive/40 bg-destructive/5",
                        )}
                      >
                        <SectionHeader
                          title={item.title}
                          description={`Due ${formatDateTime(item.dueAt)}`}
                          actions={
                            isOverdue ? (
                              <Badge variant="destructive">Overdue</Badge>
                            ) : undefined
                          }
                        />
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
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <SectionHeader
                title="Completed"
                description={
                  data.completedItems.length === 0
                    ? "Completed items will appear here."
                    : `${data.completedItems.length} completed item${data.completedItems.length === 1 ? "" : "s"}.`
                }
              />

              {data.completedItems.length === 0 ? (
                <EmptyState
                  title="Nothing completed yet"
                  description="Finished action items will show up here."
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {data.completedItems.map(({ item, completedAt }) => (
                    <li key={item._id}>
                      <Card className="gap-4 p-5 opacity-80">
                        <SectionHeader
                          title={item.title}
                          description={`Completed ${formatDateTime(completedAt)}`}
                          className="[&_h2]:text-muted-foreground"
                        />
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
