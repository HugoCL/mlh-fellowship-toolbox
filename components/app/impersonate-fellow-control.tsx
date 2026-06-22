"use client"

import { useMutation, useQuery } from "convex/react"
import { UserRoundSearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { shellSwitcherTriggerClass } from "@/components/app/cohort-switcher"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"
import { cn } from "@/lib/utils"

export function ImpersonateFellowControl({
  cohortId,
  programCode,
  disabled,
}: {
  cohortId: Id<"cohorts">
  programCode: string
  disabled?: boolean
}) {
  const router = useRouter()
  const canImpersonate = useQuery(api.impersonation.canImpersonateInCohort, {
    cohortId,
  })
  const targets = useQuery(
    api.impersonation.listImpersonationTargets,
    canImpersonate ? { cohortId } : "skip",
  )
  const startImpersonation = useMutation(api.impersonation.startImpersonation)

  if (!canImpersonate || disabled) {
    return null
  }

  async function handleSelect(fellowId: Id<"fellows">) {
    try {
      const result = await startImpersonation({ fellowId })
      toast.success("Now viewing as fellow.")
      router.push(cohortPath(result.programCode, "directory"))
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start impersonation.",
      )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(shellSwitcherTriggerClass, "justify-start gap-2")}
            aria-label="View as fellow"
            disabled={!targets?.length}
          />
        }
      >
        <UserRoundSearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="block truncate text-sm font-medium leading-tight">
            View as fellow
          </span>
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {targets?.length
              ? `${programCode} · ${targets.length} available`
              : "No fellows in this pod"}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Select fellow</DropdownMenuLabel>
          {(targets ?? []).map((fellow) => (
            <DropdownMenuItem
              key={fellow._id}
              onClick={() => void handleSelect(fellow._id)}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{fellow.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {fellow.email}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
