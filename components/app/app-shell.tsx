"use client"

import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import {
  BookUserIcon,
  CalendarDaysIcon,
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
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import {
  canManagePodWorkspace,
  canViewPodWorkspace,
  isCohortAdminOnUmbrella,
  isUmbrellaAdmin,
  isUmbrellaAdminView,
} from "@/lib/cohort-access"
import { useActiveCohortContext } from "@/lib/use-active-cohort"
import { useWorkspacePod } from "@/lib/use-workspace-pod"
import { getCohortIdFromPath } from "@/lib/workspace-pod"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const cohortId = getCohortIdFromPath(pathname)
  const cohorts = useQuery(api.cohorts.listMyCohorts, {})
  const currentUser = useQuery(api.users.getCurrentUserProfile, {})
  const activeCohort =
    cohorts?.find((item) => item.cohort._id === cohortId) ?? cohorts?.[0]
  const role = activeCohort?.role
  const activeCohortId = activeCohort?.cohort._id
  const isActivePod = Boolean(activeCohort?.cohort.parentCohortId)
  const { cohort: activeCohortDetails, canManagePod } = useActiveCohortContext(
    activeCohortId ?? null,
  )

  const isCohortAdmin = Boolean(
    activeCohort &&
      isCohortAdminOnUmbrella(activeCohort.role, activeCohort.cohort),
  )

  const showUmbrellaAdminView =
    activeCohortDetails &&
    isUmbrellaAdminView(
      activeCohortDetails.role,
      activeCohortDetails.cohort,
      activeCohortDetails.hasChildPods,
    )

  const { groups, selectedPodId, selectPod } = useWorkspacePod(
    isCohortAdmin ? activeCohortId : undefined,
    Boolean(isCohortAdmin),
  )

  const workspaceCohortId =
    showUmbrellaAdminView && selectedPodId ? selectedPodId : activeCohortId

  const showPodWorkspace =
    workspaceCohortId &&
    role &&
    (canViewPodWorkspace(role, canManagePod) ||
      (showUmbrellaAdminView && Boolean(selectedPodId)))

  const podWorkspaceItems = workspaceCohortId
    ? [
        {
          href: `/cohorts/${workspaceCohortId}/directory`,
          label: "Directory",
          icon: BookUserIcon,
        },
        {
          href: `/cohorts/${workspaceCohortId}/one-on-ones`,
          label: "1:1 Tracker",
          icon: MessagesSquareIcon,
        },
        {
          href: `/cohorts/${workspaceCohortId}/mentors`,
          label: "Mentor Meetings",
          icon: UsersIcon,
        },
        {
          href: `/cohorts/${workspaceCohortId}/demo-days`,
          label: "Demo Days",
          icon: PresentationIcon,
        },
        {
          href: `/cohorts/${workspaceCohortId}/lightning-talks`,
          label: "Lightning Talks",
          icon: MicIcon,
        },
      ]
    : []

  const dashboardHref =
    showUmbrellaAdminView && activeCohortId && selectedPodId
      ? `/dashboard?cohort=${activeCohortId}&pod=${selectedPodId}`
      : `/dashboard?cohort=${activeCohortId}`

  const navItems = activeCohortId
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
                href: `/cohorts/${activeCohortId}/settings`,
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
                href: `/me?cohort=${activeCohortId}`,
                label: "My Tasks",
                icon: UserRoundIcon,
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

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="border-b border-sidebar-border/70">
          <div className="flex flex-col gap-3 px-2 py-3">
            <div>
              <p className="font-heading text-lg font-semibold tracking-tight">
                Fellowship Toolbox
              </p>
            </div>
            <CohortSwitcher
              cohorts={cohorts ?? []}
              activeCohortId={activeCohortId}
            />
            {isCohortAdmin ? (
              <div className="flex flex-col gap-1">
                <p className="px-0.5 text-xs font-medium text-muted-foreground">
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
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname.startsWith(
                        item.href.split("?")[0] ?? item.href,
                      )}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {isUmbrellaAdmin(cohorts ?? []) ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href="/cohorts" />}
                        isActive={pathname === "/cohorts"}
                      >
                        <CalendarDaysIcon />
                        <span>All Cohorts</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>
        <SidebarFooter className="gap-0 border-t border-sidebar-border/70">
          <div className="flex w-full min-w-0 items-center gap-2 rounded-[calc(var(--radius-sm)+2px)] p-1.5 transition-colors hover:bg-sidebar-accent/60">
            <div className="flex size-8 shrink-0 items-center justify-center">
              <UserButton />
            </div>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground">
              {currentUser?.name ?? "Account"}
            </span>
            <SettingsMenu />
          </div>
        </SidebarFooter>
        <SidebarRail />
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
