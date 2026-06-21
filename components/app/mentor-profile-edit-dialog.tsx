"use client"

import { useEffect, useState } from "react"
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
import { normalizeDiscordUsername } from "@/lib/discord-username"

type MentorProfileEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mentorName: string
  calendlyUrl: string | null
  discordUsername: string | null
  onSave: (values: {
    calendlyUrl: string
    discordUsername: string
  }) => Promise<void>
}

export function MentorProfileEditDialog({
  open,
  onOpenChange,
  mentorName,
  calendlyUrl,
  discordUsername,
  onSave,
}: MentorProfileEditDialogProps) {
  const [schedulingLink, setSchedulingLink] = useState(calendlyUrl ?? "")
  const [discord, setDiscord] = useState(discordUsername ?? "")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSchedulingLink(calendlyUrl ?? "")
      setDiscord(discordUsername ?? "")
    }
  }, [open, calendlyUrl, discordUsername])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit mentor profile</DialogTitle>
          <DialogDescription>
            Update contact details for {mentorName}. Mentors usually do not sign
            in, so pod leaders maintain this information.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const trimmedLink = schedulingLink.trim()
            if (!trimmedLink) {
              toast.error("Enter a scheduling link.")
              return
            }

            setIsSaving(true)
            try {
              await onSave({
                calendlyUrl: trimmedLink,
                discordUsername: normalizeDiscordUsername(discord),
              })
              toast.success("Mentor profile updated.")
              onOpenChange(false)
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to update mentor profile.",
              )
            } finally {
              setIsSaving(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="mentor-scheduling-link">
                Scheduling link
              </FieldLabel>
              <Input
                id="mentor-scheduling-link"
                type="url"
                value={schedulingLink}
                onChange={(event) => setSchedulingLink(event.target.value)}
                placeholder="https://your-scheduling-link.example"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="mentor-discord-username">
                Discord username
              </FieldLabel>
              <Input
                id="mentor-discord-username"
                type="text"
                value={discord}
                onChange={(event) => setDiscord(event.target.value)}
                placeholder="username"
                autoComplete="off"
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
