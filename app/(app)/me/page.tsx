import { Suspense } from "react"
import { PageSkeleton } from "@/components/app/page-skeleton"
import MyTasksPageClient from "./me-client"

export default function MyTasksPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="My Tasks"
          description="Your personal fellowship checklist."
        />
      }
    >
      <MyTasksPageClient />
    </Suspense>
  )
}
