import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <>
      <PageHeader title="Loading…" description="Fetching your workspace…" />
      <PageBody>
        <div className="flex max-w-3xl flex-col gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </PageBody>
    </>
  )
}
