import type { Id } from "@/convex/_generated/dataModel"

export function getCohortIdFromPath(pathname: string): Id<"cohorts"> | null {
  const match = pathname.match(/^\/cohorts\/([^/]+)/)
  return match?.[1] ? (match[1] as Id<"cohorts">) : null
}

export function isFeaturePagePath(pathname: string): boolean {
  return /^\/cohorts\/[^/]+\/(one-on-ones|mentors|demo-days|lightning-talks)/.test(
    pathname,
  )
}
