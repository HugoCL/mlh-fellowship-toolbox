import { Suspense } from "react"
import DashboardPageClient from "./dashboard-client"

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-6 text-sm text-muted-foreground">
          Loading dashboard…
        </div>
      }
    >
      <DashboardPageClient />
    </Suspense>
  )
}
