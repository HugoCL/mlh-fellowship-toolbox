"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import {
  isPodCohort,
  isPodOnlyLeader,
  isUmbrellaAdmin,
} from "@/lib/cohort-access"
import { formatDate } from "@/lib/dates"

export default function CohortsPage() {
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const createCohort = useMutation(api.cohorts.createCohort)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [programCode, setProgramCode] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canCreateCohort =
    cohorts === undefined || isUmbrellaAdmin(cohorts) || cohorts.length === 0
  const podOnlyLeader = cohorts ? isPodOnlyLeader(cohorts) : false

  function resetForm() {
    setName("")
    setProgramCode("")
    setStartDate("")
    setEndDate("")
  }

  function handleOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open && !isSubmitting) {
      resetForm()
    }
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name || !programCode || !startDate || !endDate) {
      toast.error("Fill in all cohort fields.")
      return
    }

    setIsSubmitting(true)
    try {
      const cohortId = await createCohort({
        name,
        programCode,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
      })
      toast.success("Cohort created.")
      resetForm()
      setDialogOpen(false)
      window.location.href = `/cohorts/${cohortId}/settings`
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create cohort.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <PageHeader
        title="Cohorts"
        description={
          podOnlyLeader
            ? "Pods you lead within fellowship cohorts."
            : "Create and manage program versions for your fellowship pods."
        }
        actions={
          canCreateCohort ? (
            <DialogTrigger render={<Button />}>Create cohort</DialogTrigger>
          ) : undefined
        }
      />
      <PageBody>
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">
            {podOnlyLeader ? "Your pods" : "Your cohorts"}
          </h2>
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {(cohorts ?? []).map((item) => (
              <div
                key={item.cohort._id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.cohort.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.cohort.programCode}
                    {isPodCohort(item.cohort) ? " · Pod" : " · Cohort"}
                    {" · "}
                    {formatDate(item.cohort.startDate)} –{" "}
                    {formatDate(item.cohort.endDate)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link href={`/dashboard?cohort=${item.cohort._id}`} />
                  }
                >
                  {isPodCohort(item.cohort) ? "Open pod" : "Open"}
                </Button>
              </div>
            ))}
            {cohorts?.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {podOnlyLeader
                  ? "No pods yet. Accept a pod leader invite to get started."
                  : "No cohorts yet. Create one to get started."}
              </p>
            ) : null}
          </div>
        </section>
      </PageBody>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create cohort</DialogTitle>
          <DialogDescription>
            Create a cohort umbrella (e.g. 26.SUM.B). Pod leaders you invite
            will each manage their own pod (26.SUM.B.1, 26.SUM.B.2, …).
          </DialogDescription>
        </DialogHeader>
        <form id="create-cohort-form" onSubmit={handleCreate}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cohort-name">Cohort name</FieldLabel>
              <Input
                id="cohort-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer 2026 Pod B5…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="program-code">Program code</FieldLabel>
              <Input
                id="program-code"
                name="programCode"
                value={programCode}
                onChange={(e) => setProgramCode(e.target.value)}
                placeholder="26.SUM.B"
                spellCheck={false}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="start-date">Start date</FieldLabel>
              <Input
                id="start-date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="end-date">End date</FieldLabel>
              <Input
                id="end-date"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form="create-cohort-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create Cohort"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
