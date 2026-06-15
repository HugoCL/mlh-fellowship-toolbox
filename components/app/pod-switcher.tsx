"use client"

import { ChevronsUpDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Id } from "@/convex/_generated/dataModel"

type PodGroup = {
  cohort: {
    _id: Id<"cohorts">
    name: string
    programCode: string
  }
  leader: {
    name: string
    email: string
  } | null
  pendingLeaderEmail?: string | null
  fellowCount: number
}

export function PodSwitcher({
  groups,
  selectedPodId,
  onSelectPod,
}: {
  groups: PodGroup[]
  selectedPodId?: Id<"cohorts">
  onSelectPod: (podId: Id<"cohorts">) => void
}) {
  const active = groups.find((group) => group.cohort._id === selectedPodId)

  if (groups.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-auto min-h-6 w-full justify-between gap-2 py-1.5"
              aria-label="Active pod"
              disabled
            />
          }
        >
          <span className="min-w-0 flex-1 truncate text-left">
            <span className="block truncate font-medium leading-tight">
              No pods yet
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              Add a pod in Cohort Settings
            </span>
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-auto min-h-6 w-full justify-between gap-2 py-1.5"
            aria-label="Switch active pod"
          />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="block truncate font-medium leading-tight">
            {active?.cohort.programCode ?? "Select pod"}
          </span>
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {active?.leader
              ? `${active.leader.name} · ${active.fellowCount} fellow${active.fellowCount === 1 ? "" : "s"}`
              : active?.pendingLeaderEmail
                ? `Invite pending · ${active.pendingLeaderEmail}`
                : "No pod leader assigned"}
          </span>
        </span>
        <ChevronsUpDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>View pod</DropdownMenuLabel>
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.cohort._id}
              onClick={() => onSelectPod(group.cohort._id)}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {group.cohort.programCode}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {group.leader
                    ? `${group.leader.name} · ${group.fellowCount} fellow${group.fellowCount === 1 ? "" : "s"}`
                    : group.pendingLeaderEmail
                      ? `Invite pending · ${group.pendingLeaderEmail}`
                      : "No pod leader assigned"}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
