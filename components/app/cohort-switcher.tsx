"use client"

import { ChevronsUpDownIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Id } from "@/convex/_generated/dataModel"
import { isPodCohort, isUmbrellaCohort } from "@/lib/cohort-access"
import { dashboardPath } from "@/lib/cohort-routes"
import { cn } from "@/lib/utils"

export const shellSwitcherTriggerClass =
  "h-auto min-h-8 w-full justify-between gap-2 rounded-md border-border bg-background py-2 text-left font-normal shadow-none hover:bg-muted/50"

type CohortOption = {
  cohort: {
    _id: Id<"cohorts">
    name: string
    programCode: string
    parentCohortId?: Id<"cohorts">
  }
  role: "podLeader" | "fellow" | "mentor"
}

export function CohortSwitcher({
  cohorts,
  activeCohortId,
}: {
  cohorts: CohortOption[]
  activeCohortId?: Id<"cohorts">
}) {
  const router = useRouter()
  const active =
    cohorts.find((item) => item.cohort._id === activeCohortId) ?? cohorts[0]
  const activeIsPod = active ? isPodCohort(active.cohort) : false

  function roleLabel(item: CohortOption) {
    if (item.role === "fellow") {
      return "Fellow"
    }
    if (item.role === "mentor") {
      return "Mentor"
    }
    return isPodCohort(item.cohort) ? "Pod Leader" : "Cohort Admin"
  }

  if (!active) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(shellSwitcherTriggerClass, "justify-start")}
        nativeButton={false}
        render={<Link href="/cohorts" />}
      >
        Create your first cohort
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={shellSwitcherTriggerClass}
            aria-label={
              activeIsPod ? "Switch active pod" : "Switch active cohort"
            }
          />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="block truncate text-sm font-medium leading-tight">
            {active.cohort.name}
          </span>
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {active.cohort.programCode} · {roleLabel(active)}
          </span>
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {activeIsPod ? "Active pod" : "Active cohort"}
          </DropdownMenuLabel>
          {cohorts.map((item) => (
            <DropdownMenuItem
              key={item.cohort._id}
              onClick={() =>
                router.push(dashboardPath(item.cohort.programCode))
              }
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{item.cohort.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.cohort.programCode} · {roleLabel(item)}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/cohorts" />}>
            {cohorts.some(
              (item) =>
                item.role === "podLeader" && isUmbrellaCohort(item.cohort),
            )
              ? "Manage cohorts"
              : "Your pods"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
