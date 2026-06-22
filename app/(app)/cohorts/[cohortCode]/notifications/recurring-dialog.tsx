import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { PROGRAM_TIMEZONE_LABEL } from "@/lib/dates"
import { WEEKDAY_OPTIONS } from "@/lib/notification-schedule"
import { NotificationTargetFields } from "./notification-target-fields"
import type { RecurringFormState } from "./notification-types"

export function RecurringNotificationDialog({
  open,
  onOpenChange,
  form,
  setForm,
  fellows,
  editingRecurringId,
  submitting,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: RecurringFormState
  setForm: React.Dispatch<React.SetStateAction<RecurringFormState>>
  fellows: Doc<"fellows">[]
  editingRecurringId: Id<"recurringNotifications"> | null
  submitting: boolean
  onSubmit: (event: React.FormEvent) => void
}) {
  function toggleWeekday(day: number) {
    setForm((prev) => {
      const next = new Set(prev.weekdays)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return { ...prev, weekdays: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="recurring-title">Title</FieldLabel>
              <Input
                id="recurring-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({
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
                value={form.body}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    body: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="recurring-link">Link (optional)</FieldLabel>
              <Input
                id="recurring-link"
                value={form.linkUrl}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    linkUrl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Cadence</FieldLabel>
              <Select
                value={form.cadence}
                onValueChange={(value) => {
                  if (
                    value === "daily" ||
                    value === "weekly" ||
                    value === "monthly"
                  ) {
                    setForm((prev) => ({ ...prev, cadence: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {form.cadence === "daily"
                      ? "Daily"
                      : form.cadence === "weekly"
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
            {form.cadence === "weekly" ? (
              <Field>
                <FieldLabel>Weekdays</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <div
                      key={day.value}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm"
                    >
                      <Checkbox
                        id={`weekday-${day.value}`}
                        checked={form.weekdays.has(day.value)}
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
                value={form.timeOfDay}
                onChange={(event) =>
                  setForm((prev) => ({
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
                value={form.nextRunAt}
                onChange={(event) =>
                  setForm((prev) => ({
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
                value={form.endAt}
                onChange={(event) =>
                  setForm((prev) => ({
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
                  value={form.enabled ? "enabled" : "paused"}
                  onValueChange={(value) => {
                    if (value === "enabled" || value === "paused") {
                      setForm((prev) => ({
                        ...prev,
                        enabled: value === "enabled",
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {form.enabled ? "Active" : "Paused"}
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
            <NotificationTargetFields
              form={form}
              setForm={setForm}
              fellows={fellows}
            />
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  )
}

export function validateRecurringForm(form: RecurringFormState): boolean {
  if (!form.title.trim() || !form.body.trim()) {
    toast.error("Title and message are required.")
    return false
  }
  if (form.targetMode === "specific" && form.selectedFellowIds.size === 0) {
    toast.error("Select at least one fellow.")
    return false
  }
  if (!form.nextRunAt) {
    toast.error("First run date is required.")
    return false
  }
  if (form.cadence === "weekly" && form.weekdays.size === 0) {
    toast.error("Select at least one weekday.")
    return false
  }
  return true
}
