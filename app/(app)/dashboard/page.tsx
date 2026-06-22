import { Suspense } from "react"
import { DashboardLoadingShell } from "@/components/app/dashboard-skeleton"
import DashboardPageClient from "./dashboard-client"

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingShell />}>
      <DashboardPageClient />
    </Suspense>
  )
}
