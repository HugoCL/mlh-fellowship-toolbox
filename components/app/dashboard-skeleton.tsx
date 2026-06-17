import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

export function DashboardLoadingShell() {
  return (
    <>
      <PageHeader title="Dashboard" description="Loading…" />
      <PageBody>
        <DashboardSkeleton />
      </PageBody>
    </>
  )
}
