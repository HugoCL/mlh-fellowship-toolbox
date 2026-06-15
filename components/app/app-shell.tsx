"use client"

import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import {
  BookUserIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  MicIcon,
  PresentationIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CohortSwitcher } from "@/components/app/cohort-switcher"
import { PodSwitcher } from "@/components/app/pod-switcher"
import { SettingsMenu } from "@/components/app/settings-menu"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import {
  canManagePodWorkspace,
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
import { cn } from "@/lib/utils"
import { useActiveCohortContext } from "@/lib/use-active-cohort"
import { useWorkspacePod } from "@/lib/use-workspace-pod"

function SidebarBrandHeader() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-2",
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

  const canManagePod = pathProgramCode ? pathCanManagePod : shellCanManagePod

  const isCohortAdmin = Boolean(
    shellCohortEntry &&
      isCohortAdminOnUmbrella(shellCohortEntry.role, shellCohortEntry.cohort),
  )

  const showUmbrellaAdminView =
    shellCohortDetails &&
    isUmbrellaAdminView(
      shellCohortDetails.role,
      shellCohortDetails.cohort,
      shellCohortDetails.hasChildPods,
    )

  const { groups, selectedPodId, selectPod } = useWorkspacePod(
    isCohortAdmin ? activeCohortId : undefined,
    isCohortAdmin ? activeProgramCode : undefined,
    Boolean(isCohortAdmin),
  )

  const selectedPodProgramCode = (groups ?? []).find(
    (group) => group.cohort._id === selectedPodId,
  )?.cohort.programCode

  const workspaceProgramCode =
    showUmbrellaAdminView && selectedPodProgramCode
      ? selectedPodProgramCode
      : activeProgramCode

  const showPodWorkspace =
    workspaceProgramCode &&
    role &&
    (canViewPodWorkspace(role, canManagePod) ||
      (showUmbrellaAdminView && Boolean(selectedPodId)))

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
          icon: MicIcon,
        },
      ]
    : []

  const dashboardHref =
    showUmbrellaAdminView && activeProgramCode && selectedPodProgramCode
      ? dashboardPath(activeProgramCode, selectedPodProgramCode)
      : activeProgramCode
        ? dashboardPath(activeProgramCode)
        : "/dashboard"

  const navItems =
    (cohorts?.length ?? 0) > 0 && activeProgramCode
      ? [
          {
            href: dashboardHref,
            label: "Dashboard",
            icon: LayoutDashboardIcon,
          },
          ...(showPodWorkspace ? podWorkspaceItems : []),
          ...(role === "podLeader" && canManagePodWorkspace(role, canManagePod)
            ? [
                {
                  href: cohortPath(activeProgramCode, "settings"),
                  label: showUmbrellaAdminView
                    ? "Cohort Settings"
                    : isActivePod
                      ? "Pod Settings"
                      : "Cohort Settings",
                  icon: SettingsIcon,
                },
              ]
            : []),
          ...(role === "fellow"
            ? [
                {
                  href: myTasksPath(activeProgramCode),
                  label: "My Tasks",
                  icon: UserRoundIcon,
                },
              ]
            : []),
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
      : [
          {
            href: "/cohorts",
            label: "Cohorts",
            icon: CalendarDaysIcon,
          },
        ]

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
        <SidebarHeader className="gap-3 px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <SidebarBrandHeader />
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <CohortSwitcher
              cohorts={cohorts ?? []}
              activeCohortId={activeCohortId}
            />
            {isCohortAdmin ? (
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
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
          <SidebarGroup className="p-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
            <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <SidebarMenu>
                {navItems.map((item) => (
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
