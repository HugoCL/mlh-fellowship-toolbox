"use client"

import { useState } from "react"
import { toast } from "sonner"
import { InfoCallout } from "@/components/app/info-callout"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { cn } from "@/lib/utils"

type SchedulingLinkSetupProps = {
  calendlyUrl?: string | null
  variant?: "default" | "action"
  fieldId?: string
  onSave: (url: string) => Promise<void>
}

export function SchedulingLinkSetup({
  calendlyUrl,
  variant = "default",
  fieldId = "scheduling-link",
  onSave,
}: SchedulingLinkSetupProps) {
  const [url, setUrl] = useState(calendlyUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const missing = !hasSchedulingLink(calendlyUrl)
  const showAction = variant === "action" && missing

  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        showAction ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      )}
    >
      {showAction ? (
        <InfoCallout variant="info" className="mb-4">
          Add your scheduling link so podmates can book time with you. This is
          required to complete onboarding.
        </InfoCallout>
      ) : null}

      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const trimmed = url.trim()
          if (!trimmed) {
            toast.error("Enter a scheduling link.")
            return
          }
          setIsSaving(true)
          try {
            await onSave(trimmed)
            toast.success("Scheduling link saved.")
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to save scheduling link.",
            )
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={fieldId}>
              {missing ? "Your scheduling link" : "Update scheduling link"}
            </FieldLabel>
            <Input
              id={fieldId}
              name="calendlyUrl"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://your-scheduling-link.example"
              required
            />
          </Field>
          <Button type="submit" className="self-start" disabled={isSaving}>
            {isSaving ? "Saving…" : missing ? "Add scheduling link" : "Save"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  )
}
