"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { hasSchedulingLink } from "@/lib/scheduling-link"

type SchedulingLinkSetupProps = {
  cohortId: Id<"cohorts">
  role: "podLeader" | "fellow" | "mentor"
  calendlyUrl?: string | null
  variant?: "default" | "action"
}

export function SchedulingLinkSetup({
  cohortId,
  role,
  calendlyUrl,
  variant = "default",
}: SchedulingLinkSetupProps) {
  const updateFellowCalendly = useMutation(api.fellows.updateMyCalendly)
  const updateMentorCalendly = useMutation(api.mentors.updateMyCalendly)
  const updateLeaderSchedulingLink = useMutation(
    api.users.updateMySchedulingLink,
  )
  const [url, setUrl] = useState(calendlyUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const missing = !hasSchedulingLink(calendlyUrl)
  const showAction = variant === "action" && missing

  return (
    <section
      className={
        showAction
          ? "rounded-lg border border-primary/30 bg-primary/5 p-4"
          : "rounded-lg border border-border/70 p-4"
      }
    >
      {showAction ? (
        <Alert className="mb-4 border-0 bg-transparent p-0">
          <AlertDescription>
            Add your scheduling link so podmates can book time with you. This is
            required to complete onboarding.
          </AlertDescription>
        </Alert>
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
            if (role === "fellow") {
              await updateFellowCalendly({ cohortId, calendlyUrl: trimmed })
            } else if (role === "mentor") {
              await updateMentorCalendly({ cohortId, calendlyUrl: trimmed })
            } else {
              await updateLeaderSchedulingLink({ calendlyUrl: trimmed })
            }
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
            <FieldLabel htmlFor={`scheduling-link-${role}`}>
              {missing ? "Your scheduling link" : "Update scheduling link"}
            </FieldLabel>
            <Input
              id={`scheduling-link-${role}`}
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
