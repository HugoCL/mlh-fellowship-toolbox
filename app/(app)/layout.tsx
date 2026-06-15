import { AppShell } from "@/components/app/app-shell"
import { EnsureUser } from "@/components/app/ensure-user"
import { ImpersonationBanner } from "@/components/app/impersonation-banner"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <EnsureUser>
      <AppShell>
        <SidebarInset>
          <div className="flex h-14 items-center gap-2 border-b border-border/70 px-4 lg:hidden">
            <SidebarTrigger aria-label="Open navigation" />
            <span className="font-heading text-sm font-semibold">
              Fellowship Toolbox
            </span>
          </div>
          <ImpersonationBanner />
          {children}
        </SidebarInset>
      </AppShell>
    </EnsureUser>
  )
}
