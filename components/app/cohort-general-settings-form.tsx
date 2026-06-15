"use client"

import { useMutation } from "convex/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import {
  PROGRAM_TIMEZONE_LABEL,
  toDateInputValue,
  toTimestamp,
} from "@/lib/dates"

type CohortDoc = Doc<"cohorts">

type CohortGeneralSettingsFormProps = {
  cohortId: Id<"cohorts">
  cohort: CohortDoc
  variant: "umbrella" | "pod"
  layout?: "card" | "plain"
  onSaved?: () => void
}

const statusLabels: Record<CohortDoc["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
}

export function CohortGeneralSettingsForm({
  cohortId,
  cohort,
  variant,
  layout = "card",
  onSaved,
}: CohortGeneralSettingsFormProps) {
  const updateUmbrellaCohort = useMutation(api.cohorts.updateUmbrellaCohort)
  const updatePod = useMutation(api.cohorts.updatePod)

  const [name, setName] = useState(cohort.name)
  const [startDate, setStartDate] = useState(toDateInputValue(cohort.startDate))
  const [endDate, setEndDate] = useState(toDateInputValue(cohort.endDate))
  const [status, setStatus] = useState<CohortDoc["status"]>(cohort.status)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(cohort.name)
    setStartDate(toDateInputValue(cohort.startDate))
    setEndDate(toDateInputValue(cohort.endDate))
    setStatus(cohort.status)
  }, [cohort])

  const isDirty =
    name.trim() !== cohort.name ||
    startDate !== toDateInputValue(cohort.startDate) ||
    endDate !== toDateInputValue(cohort.endDate) ||
    (variant === "umbrella" && status !== cohort.status)

  function resetForm() {
    setName(cohort.name)
    setStartDate(toDateInputValue(cohort.startDate))
    setEndDate(toDateInputValue(cohort.endDate))
    setStatus(cohort.status)
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("Name cannot be empty.")
      return
    }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required.")
      return
    }

    const patch: {
      name?: string
      startDate?: number
      endDate?: number
      status?: CohortDoc["status"]
    } = {}

    if (trimmedName !== cohort.name) {
      patch.name = trimmedName
    }
    const nextStart = toTimestamp(startDate)
    const nextEnd = toTimestamp(endDate)
    if (nextStart !== cohort.startDate) {
      patch.startDate = nextStart
    }
    if (nextEnd !== cohort.endDate) {
      patch.endDate = nextEnd
    }
    if (variant === "umbrella" && status !== cohort.status) {
      patch.status = status
    }

    if (Object.keys(patch).length === 0) {
      toast.message("No changes to save.")
      return
    }

    setIsSaving(true)
    try {
      if (variant === "umbrella") {
        await updateUmbrellaCohort({ cohortId, ...patch })
      } else {
        await updatePod({ cohortId, ...patch })
      }
      toast.success("Settings saved.")
      onSaved?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const form = (
    <form onSubmit={handleSave}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="cohort-settings-name">
            {variant === "umbrella" ? "Cohort name" : "Pod name"}
          </FieldLabel>
          <Input
            id="cohort-settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              variant === "umbrella"
                ? "Summer 2026 Pod B5…"
                : "Pod display name…"
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="cohort-settings-program-code">
            Program code
          </FieldLabel>
          <Input
            id="cohort-settings-program-code"
            value={cohort.programCode}
            readOnly
            disabled
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Program codes cannot be changed after creation.
          </p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cohort-settings-start-date">
              Start date ({PROGRAM_TIMEZONE_LABEL})
            </FieldLabel>
            <Input
              id="cohort-settings-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="cohort-settings-end-date">
              End date ({PROGRAM_TIMEZONE_LABEL})
            </FieldLabel>
            <Input
              id="cohort-settings-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </Field>
        </div>
        {variant === "umbrella" ? (
          <Field>
            <FieldLabel htmlFor="cohort-settings-status">Status</FieldLabel>
            <Select
              value={status}
              onValueChange={(value) => {
                if (
                  value === "draft" ||
                  value === "active" ||
                  value === "archived"
                ) {
                  setStatus(value)
                }
              }}
            >
              <SelectTrigger
                id="cohort-settings-status"
                className="w-full sm:max-w-xs"
                aria-label="Cohort status"
              >
                <SelectValue>{statusLabels[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(
                    Object.entries(statusLabels) as Array<
                      [CohortDoc["status"], string]
                    >
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSaving || !isDirty}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving || !isDirty}
            onClick={resetForm}
          >
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  )

  if (layout === "plain") {
    return form
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">General</CardTitle>
        <CardDescription>
          {variant === "umbrella"
            ? "Cohort name, program dates, and status."
            : "Pod display name and program dates for this pod."}
        </CardDescription>
      </CardHeader>
      <CardContent>{form}</CardContent>
    </Card>
  )
}
