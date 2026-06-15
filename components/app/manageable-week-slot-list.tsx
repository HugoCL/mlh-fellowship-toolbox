"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDate,
  formatWeekDateRange,
  PROGRAM_TIMEZONE_LABEL,
  parseProgramDate,
  toDateInputValue,
} from "@/lib/dates"

export type ManageableWeekSlot = {
  id: string
  label: string
  date: number
}

type ManageableWeekSlotListProps = {
  title: string
  description: string
  slots: ManageableWeekSlot[]
  showLabelField?: boolean
  dateDisplay?: "single" | "weekRange"
  onUpdate: (
    id: string,
    values: { label?: string; date: number },
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  deleteDescription?: string
}

export function ManageableWeekSlotList({
  title,
  description,
  slots,
  showLabelField = true,
  dateDisplay = "single",
  onUpdate,
  onDelete,
  deleteDescription = "This removes the slot. You can add it back manually or regenerate program weeks later.",
}: ManageableWeekSlotListProps) {
  const [editingSlot, setEditingSlot] = useState<ManageableWeekSlot | null>(
    null,
  )
  const [editLabel, setEditLabel] = useState("")
  const [editDate, setEditDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  function openEdit(slot: ManageableWeekSlot) {
    setEditingSlot(slot)
    setEditLabel(slot.label)
    setEditDate(toDateInputValue(slot.date))
  }

  async function handleSaveEdit() {
    if (!editingSlot || !editDate) {
      toast.error("Enter a date.")
      return
    }

    setIsSaving(true)
    try {
      await onUpdate(editingSlot.id, {
        label: showLabelField ? editLabel : undefined,
        date: parseProgramDate(editDate),
      })
      toast.success("Slot updated.")
      setEditingSlot(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.")
    } finally {
      setIsSaving(false)
    }
  }

  if (slots.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-auto border-t border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  {showLabelField ? <TableHead>Week</TableHead> : null}
                  <TableHead>
                    {dateDisplay === "weekRange" ? "Dates" : "Date"}
                  </TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    {showLabelField ? (
                      <TableCell className="font-medium">
                        {slot.label}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {dateDisplay === "weekRange"
                        ? formatWeekDateRange(slot.date)
                        : formatDate(slot.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${slot.label}`}
                          onClick={() => openEdit(slot)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${slot.label}`}
                              />
                            }
                          >
                            <Trash2Icon className="size-4 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this slot?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {deleteDescription}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  void onDelete(slot.id).then(
                                    () => toast.success("Slot deleted."),
                                    (error: unknown) =>
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Delete failed.",
                                      ),
                                  )
                                }
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editingSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSlot(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit slot</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {showLabelField ? (
              <Field>
                <FieldLabel htmlFor="edit-slot-label">Week label</FieldLabel>
                <Input
                  id="edit-slot-label"
                  value={editLabel}
                  onChange={(event) => setEditLabel(event.target.value)}
                />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="edit-slot-date">
                {dateDisplay === "weekRange"
                  ? `Week start (${PROGRAM_TIMEZONE_LABEL})`
                  : `Date (${PROGRAM_TIMEZONE_LABEL})`}
              </FieldLabel>
              <Input
                id="edit-slot-date"
                type="date"
                value={editDate}
                onChange={(event) => setEditDate(event.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSlot(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={isSaving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export async function runGenerateAllWeeks(
  action: () => Promise<{ created: number; skipped: number }>,
  entityLabel: string,
) {
  try {
    const result = await action()
    if (result.created === 0 && result.skipped === 0) {
      toast.message(
        `No ${entityLabel} to generate. Check cohort dates in settings.`,
      )
      return
    }
    const parts: string[] = []
    if (result.created > 0) {
      parts.push(
        `Created ${result.created} ${entityLabel}${result.created === 1 ? "" : "s"}`,
      )
    }
    if (result.skipped > 0) {
      parts.push(
        `Skipped ${result.skipped} existing ${result.skipped === 1 ? "week" : "weeks"}`,
      )
    }
    toast.success(parts.join(". "))
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : `Failed to generate ${entityLabel}s.`,
    )
  }
}
