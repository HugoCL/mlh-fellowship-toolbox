"use client"

import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import {
  BellIcon,
  BookUserIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  type LucideIcon,
  MessagesSquareIcon,
  NotebookPenIcon,
  PresentationIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CohortSwitcher } from "@/components/app/cohort-switcher"
import { ImpersonateFellowControl } from "@/components/app/impersonate-fellow-control"
import { PodSwitcher } from "@/components/app/pod-switcher"
import { SettingsMenu } from "@/components/app/settings-menu"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import {
  canViewPodWorkspace,
  isCohortAdminOnUmbrella,
  isUmbrellaAdmin,
  isUmbrellaAdminView,
} from "@/lib/cohort-access"
import {
  cohortPath,
  dashboardPath,
  getCohortCodeFromPath,
  getPodRouteFromPath,
  myTasksPath,
} from "@/lib/cohort-routes"
import { useActiveCohortContext } from "@/lib/use-active-cohort"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { useWorkspacePod } from "@/lib/use-workspace-pod"
import { cn } from "@/lib/utils"

function SidebarBrandHeader() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        collapsed
          ? "flex-col items-center gap-3 pb-1"
          : "items-center justify-between gap-2",
      )}
    >
      {collapsed ? (
        <Link
          href="/dashboard"
          className="flex size-10 items-center justify-center rounded-full bg-sidebar-primary/10 font-heading text-sm font-semibold text-sidebar-primary transition-colors hover:bg-sidebar-primary/15"
        >
          FT
        </Link>
      ) : (
        <Link
          href="/dashboard"
          className="min-w-0 truncate font-heading text-base font-semibold tracking-tight text-sidebar-foreground transition-colors hover:text-sidebar-primary"
        >
          Fellowship Toolbox
        </Link>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleSidebar}
        className="shrink-0 text-muted-foreground hover:text-sidebar-foreground"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </Button>
    </div>
  )
}

function SidebarUserFooter({ name }: { name: string }) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  if (collapsed) {
    return (
      <div className="flex justify-center py-1">
        <UserButton />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2 px-1 py-1">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">
        {name}
      </span>
      <SettingsMenu />
      <UserButton />
    </div>
  )
}

type SidebarNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

function SidebarNavGroup({
  label,
  items,
  isNavActive,
  variant = "default",
}: {
  label?: string
  items: SidebarNavItem[]
  isNavActive: (href: string) => boolean
  variant?: "default" | "admin"
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <SidebarGroup
      className={cn(
        "p-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0",
        variant === "default" && "pt-0.5 group-data-[collapsible=icon]:pt-0",
        variant === "admin" &&
          "mt-1 border-t border-sidebar-border/60 pt-3 group-data-[collapsible=icon]:mt-0.5 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:pt-1",
      )}
    >
      {label ? (
        <SidebarGroupLabel className="mb-1.5 h-auto px-0.5 group-data-[collapsible=icon]:mb-0">
          <span className="inline-flex items-center rounded-md bg-sidebar-accent/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={isNavActive(item.href)}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const pathProgramCode = getCohortCodeFromPath(pathname)
  const podRoute = getPodRouteFromPath(pathname)
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const currentUser = useQuery(api.users.getCurrentUserProfile, {})
  const { cohort: pathCohortDetails, canManagePod: pathCanManagePod } =
    useActiveCohortContext(pathProgramCode)

  const shellCohortEntry = (() => {
    if (!cohorts?.length) {
      return undefined
    }

    const directMatch = pathProgramCode
      ? cohorts.find((item) => item.cohort.programCode === pathProgramCode)
      : undefined
    if (directMatch) {
      return directMatch
    }

    if (podRoute) {
      const umbrellaFromPath = cohorts.find(
        (item) => item.cohort.programCode === podRoute.umbrellaProgramCode,
      )
      if (umbrellaFromPath) {
        return umbrellaFromPath
      }
    }

    if (
      pathCohortDetails?.isUmbrellaViewer &&
      pathCohortDetails.parentProgramCode
    ) {
      const umbrellaMatch = cohorts.find(
        (item) =>
          item.cohort.programCode === pathCohortDetails.parentProgramCode,
      )
      if (umbrellaMatch) {
        return umbrellaMatch
      }
    }

    const umbrellaAdmin = cohorts.find((item) =>
      isCohortAdminOnUmbrella(item.role, item.cohort),
    )
    return umbrellaAdmin ?? cohorts[0]
  })()

  const role = shellCohortEntry?.role
  const activeCohortId = shellCohortEntry?.cohort._id
  const activeProgramCode = shellCohortEntry?.cohort.programCode
  const isActivePod = Boolean(shellCohortEntry?.cohort.parentCohortId)

  const { cohort: shellCohortDetails, canManagePod: shellCanManagePod } =
    useActiveCohortContext(activeProgramCode ?? null)

  const effectiveRole =
    pathCohortDetails?.role ?? shellCohortDetails?.role ?? role

  const canManagePod = pathProgramCode ? pathCanManagePod : shellCanManagePod

  const isCohortAdmin = Boolean(
    shellCohortEntry &&
      isCohortAdminOnUmbrella(shellCohortEntry.role, shellCohortEntry.cohort),
  )

  const showUmbrellaAdminView =
    shellCohortDetails &&
    isUmbrellaAdminView(
      shellCohortDetails.realRole ?? shellCohortDetails.role,
      shellCohortDetails.cohort,
      shellCohortDetails.hasChildPods,
    )

  const { isImpersonating, impersonation } = useIsImpersonating()
  const umbrellaAdminActive = Boolean(showUmbrellaAdminView && !isImpersonating)

  const { groups, selectedPodId, selectPod } = useWorkspacePod(
    isCohortAdmin ? activeCohortId : undefined,
    isCohortAdmin ? activeProgramCode : undefined,
    Boolean(isCohortAdmin),
  )

  const selectedPodProgramCode = (groups ?? []).find(
    (group) => group.cohort._id === selectedPodId,
  )?.cohort.programCode

  const workspaceProgramCode =
    isImpersonating && impersonation
      ? impersonation.cohort.programCode
      : umbrellaAdminActive && selectedPodProgramCode
        ? selectedPodProgramCode
        : activeProgramCode

  const impersonationCohortId =
    isImpersonating && impersonation
      ? impersonation.cohort._id
      : umbrellaAdminActive && selectedPodId
        ? selectedPodId
        : isActivePod
          ? activeCohortId
          : pathCohortDetails?.cohort._id

  const impersonationProgramCode =
    isImpersonating && impersonation
      ? impersonation.cohort.programCode
      : umbrellaAdminActive && selectedPodProgramCode
        ? selectedPodProgramCode
        : (pathCohortDetails?.cohort.programCode ?? workspaceProgramCode)

  const showPodWorkspace =
    workspaceProgramCode &&
    effectiveRole &&
    (canViewPodWorkspace(effectiveRole, canManagePod) ||
      (umbrellaAdminActive && Boolean(selectedPodId)))

  const podWorkspaceItems = workspaceProgramCode
    ? [
        {
          href: cohortPath(workspaceProgramCode, "directory"),
          label: "Directory",
          icon: BookUserIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "one-on-ones"),
          label: "1:1 Tracker",
          icon: MessagesSquareIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "mentors"),
          label: "Mentor Meetings",
          icon: UsersIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "demo-days"),
          label: "Demo Days",
          icon: PresentationIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "lightning-talks"),
          label: "Lightning Talks",
          icon: ZapIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "action-items"),
          label: "Action Items",
          icon: ListTodoIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "notes-viewer"),
          label: "Notes Viewer",
          icon: NotebookPenIcon,
        },
        {
          href: cohortPath(workspaceProgramCode, "notifications"),
          label: "Notifications",
          icon: BellIcon,
        },
      ]
    : []

  const dashboardHref =
    umbrellaAdminActive && activeProgramCode && selectedPodProgramCode
      ? dashboardPath(activeProgramCode, selectedPodProgramCode)
      : activeProgramCode
        ? dashboardPath(activeProgramCode)
        : "/dashboard"

  const settingsNavItems =
    !isImpersonating && effectiveRole === "podLeader" && activeProgramCode
      ? [
          ...(isCohortAdmin
            ? [
                {
                  href: cohortPath(activeProgramCode, "settings"),
                  label: "Cohort Settings",
                  icon: SettingsIcon,
                },
              ]
            : []),
          ...((isCohortAdmin && selectedPodProgramCode) ||
          (!isCohortAdmin && canManagePod)
            ? [
                {
                  href: cohortPath(
                    isCohortAdmin && selectedPodProgramCode
                      ? selectedPodProgramCode
                      : activeProgramCode,
                    "settings",
                  ),
                  label: "Pod Settings",
                  icon: SettingsIcon,
                },
              ]
            : []),
        ]
      : []

  const hasCohortContext =
    (cohorts?.length ?? 0) > 0 && Boolean(activeProgramCode)

  const workspaceNavItems: SidebarNavItem[] =
    hasCohortContext && activeProgramCode
      ? [
          {
            href: dashboardHref,
            label: "Dashboard",
            icon: LayoutDashboardIcon,
          },
          ...(effectiveRole === "fellow"
            ? [
                {
                  href: myTasksPath(activeProgramCode),
                  label: "My Tasks",
                  icon: UserRoundIcon,
                },
              ]
            : []),
          ...(showPodWorkspace ? podWorkspaceItems : []),
        ]
      : [
          {
            href: "/cohorts",
            label: "Cohorts",
            icon: CalendarDaysIcon,
          },
        ]

  const adminNavItems: SidebarNavItem[] =
    hasCohortContext && !isImpersonating
      ? [
          ...settingsNavItems,
          ...(isUmbrellaAdmin(cohorts ?? [])
            ? [
                {
                  href: "/cohorts",
                  label: "All Cohorts",
                  icon: CalendarDaysIcon,
                },
              ]
            : []),
        ]
      : []

  function isNavActive(href: string) {
    const path = href.split("?")[0] ?? href
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    if (path === "/cohorts") {
      return pathname === "/cohorts"
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:pb-4">
          <SidebarBrandHeader />
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <CohortSwitcher
              cohorts={cohorts ?? []}
              activeCohortId={activeCohortId}
            />
            {isCohortAdmin && !isImpersonating ? (
              <div className="flex flex-col gap-1">
                <p className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Active Pod
                </p>
                <PodSwitcher
                  groups={groups ?? []}
                  selectedPodId={selectedPodId ?? undefined}
                  onSelectPod={selectPod}
                />
              </div>
            ) : null}
            {impersonationCohortId && impersonationProgramCode ? (
              <ImpersonateFellowControl
                cohortId={impersonationCohortId}
                programCode={impersonationProgramCode}
                disabled={isImpersonating}
              />
            ) : null}
          </div>
        </SidebarHeader>
        <SidebarContent className="flex flex-col gap-2 px-2 pt-1 pb-2 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-3">
          <SidebarNavGroup
            label={hasCohortContext ? "Workspace" : undefined}
            items={workspaceNavItems}
            isNavActive={isNavActive}
          />
          <SidebarNavGroup
            label="Admin"
            items={adminNavItems}
            isNavActive={isNavActive}
            variant="admin"
          />
        </SidebarContent>
        <SidebarFooter className="px-3 pt-2 pb-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:items-center">
          <SidebarUserFooter name={currentUser?.name ?? "Account"} />
        </SidebarFooter>
      </Sidebar>
      <main
        id="main-content"
        className="flex min-h-svh flex-1 flex-col overflow-hidden"
      >
        {children}
      </main>
    </SidebarProvider>
  )
}
