import { Suspense } from "react"
import MyTasksPageClient from "./me-client"

export default function MyTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-6 text-sm text-muted-foreground">
          Loading tasks…
        </div>
      }
    >
      <MyTasksPageClient />
    </Suspense>
  )
}
