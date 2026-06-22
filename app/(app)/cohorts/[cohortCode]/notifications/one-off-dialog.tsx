import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import type { Doc } from "@/convex/_generated/dataModel"
import { NotificationTargetFields } from "./notification-target-fields"
import type { NotificationFormState } from "./notification-types"

export function OneOffNotificationDialog({
  open,
  onOpenChange,
  form,
  setForm,
  fellows,
  submitting,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: NotificationFormState
  setForm: React.Dispatch<React.SetStateAction<NotificationFormState>>
  fellows: Doc<"fellows">[]
  submitting: boolean
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription>
            Deliver a one-time update to selected fellows.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="oneoff-title">Title</FieldLabel>
              <Input
                id="oneoff-title"
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
              <FieldLabel htmlFor="oneoff-body">Message</FieldLabel>
              <Textarea
                id="oneoff-body"
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
              <FieldLabel htmlFor="oneoff-link">Link (optional)</FieldLabel>
              <Input
                id="oneoff-link"
                value={form.linkUrl}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    linkUrl: event.target.value,
                  }))
                }
                placeholder="https://… or /cohorts/…"
              />
            </Field>
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
              {submitting ? "Sending…" : "Send now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function validateOneOffForm(form: NotificationFormState): boolean {
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
