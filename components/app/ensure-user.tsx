"use client"

import { useConvexAuth, useMutation } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { NotInvitedScreen } from "@/components/app/not-invited-screen"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SkeletonList } from "@/components/app/page-skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuSkeleton,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { getNotInvitedMessage } from "@/lib/app-access"

function navSkeletonKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `nav-skeleton-${index}`)
}

export function AppBootstrapSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <div className="flex w-full items-center justify-between gap-2">
            <Skeleton className="h-7 w-36 max-w-full rounded-md" />
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
          <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
        </SidebarHeader>
        <SidebarContent className="gap-2 px-2 pt-1 pb-2">
          <div className="flex flex-col gap-1 px-0.5">
            <Skeleton className="mb-1 h-3 w-16 rounded-sm" />
            {navSkeletonKeys(5).map((key) => (
              <SidebarMenuSkeleton key={key} showIcon />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border px-3 pt-3 pb-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <Skeleton className="h-8 w-full rounded-md group-data-[collapsible=icon]:size-8" />
        </SidebarFooter>
      </Sidebar>
      <main
        id="main-content"
        className="flex min-h-svh flex-1 flex-col overflow-hidden"
      >
        <PageHeader title="Loading…" description="Fetching your workspace…" />
        <PageBody>
          <SkeletonList count={3} />
        </PageBody>
      </main>
    </SidebarProvider>
  )
}

export function EnsureUser({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [ready, setReady] = useState(false)
  const [notInvitedMessage, setNotInvitedMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setReady(false)
      setNotInvitedMessage(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await ensureCurrentUser({})
      } catch (error) {
        const message = getNotInvitedMessage(error)
        if (message) {
          if (!cancelled) {
            setNotInvitedMessage(message)
            setReady(false)
          }
          return
        }

        console.error("Failed to ensure user:", error)
        return
      }

      if (!cancelled) {
        setNotInvitedMessage(null)
        setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, ensureCurrentUser])

  if (notInvitedMessage) {
    return <NotInvitedScreen message={notInvitedMessage} />
  }

  if (isLoading || !isAuthenticated || !ready) {
    return <AppBootstrapSkeleton />
  }

  return <>{children}</>
}
