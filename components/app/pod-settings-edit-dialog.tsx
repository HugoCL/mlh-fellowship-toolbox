"use client"

import { CohortGeneralSettingsForm } from "@/components/app/cohort-general-settings-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Doc } from "@/convex/_generated/dataModel"

type PodSettingsEditDialogProps = {
  pod: Doc<"cohorts"> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PodSettingsEditDialog({
  pod,
  open,
  onOpenChange,
}: PodSettingsEditDialogProps) {
  if (!pod) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit pod</DialogTitle>
          <DialogDescription>
            Update the display name and program dates for {pod.programCode}.
          </DialogDescription>
        </DialogHeader>
        <CohortGeneralSettingsForm
          key={pod._id}
          cohortId={pod._id}
          cohort={pod}
          variant="pod"
          layout="plain"
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
