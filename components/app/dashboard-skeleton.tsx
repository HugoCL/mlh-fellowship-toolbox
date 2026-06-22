import { PageBody, PageHeader } from "@/components/app/page-frame"
import { SkeletonCardGrid, SkeletonList } from "@/components/app/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 rounded-lg" />
      <SkeletonList count={2} />
      <SkeletonCardGrid count={4} columns={2} />
    </div>
  )
}

export function DashboardLoadingShell() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your fellowship home base." />
      <PageBody width="wide">
        <DashboardSkeleton />
      </PageBody>
    </>
  )
}
