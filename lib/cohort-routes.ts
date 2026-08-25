import {
  baseProgramCode,
  buildGroupProgramCode,
  hasGroupSuffix,
} from "@/convex/lib/programCode"

/** URL slug for program codes. Next.js treats dots in path segments as file extensions. */
export function programCodeToSlug(programCode: string): string {
  return programCode.replace(/\./g, "-")
}

export function slugToProgramCode(slug: string): string {
  return slug.replace(/-/g, ".")
}

export function parseProgramCodeForRoute(programCode: string): {
  umbrellaProgramCode: string
  podNumber: number | null
} {
  if (hasGroupSuffix(programCode)) {
    const parts = programCode.split(".")
    const podNumber = Number.parseInt(parts.at(-1) ?? "", 10)
    if (!Number.isFinite(podNumber)) {
      return { umbrellaProgramCode: programCode, podNumber: null }
    }
    return {
      umbrellaProgramCode: parts.slice(0, -1).join("."),
      podNumber,
    }
  }
  return { umbrellaProgramCode: programCode, podNumber: null }
}

/** Build a workspace path from any program code (umbrella or pod). */
export function cohortPath(programCode: string, segment?: string): string {
  const base = `/cohorts/${programCodeToSlug(programCode)}`
  return segment ? `${base}/${segment}` : base
}

/** @deprecated Use cohortPath — kept for call sites that split umbrella + pod number. */
export function podPath(
  umbrellaProgramCode: string,
  podNumber: number,
  segment?: string,
): string {
  return cohortPath(
    buildGroupProgramCode(umbrellaProgramCode, podNumber),
    segment,
  )
}

/** @deprecated Use cohortPath — kept for umbrella-only paths. */
export function umbrellaPath(
  umbrellaProgramCode: string,
  segment?: string,
): string {
  return cohortPath(umbrellaProgramCode, segment)
}

/** Resolve the cohort program code from a pathname (pod or umbrella). */
export function getCohortCodeFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/cohorts\/([^/]+)/)
  if (match?.[1]) {
    return slugToProgramCode(decodeURIComponent(match[1]))
  }
  return null
}

export function getPodRouteFromPath(pathname: string): {
  umbrellaProgramCode: string
  podNumber: number
} | null {
  const programCode = getCohortCodeFromPath(pathname)
  if (!programCode || !hasGroupSuffix(programCode)) {
    return null
  }
  const { umbrellaProgramCode, podNumber } =
    parseProgramCodeForRoute(programCode)
  if (podNumber === null) {
    return null
  }
  return { umbrellaProgramCode, podNumber }
}

export const POD_FEATURE_SEGMENTS = [
  "directory",
  "one-on-ones",
  "mentors",
  "demo-days",
  "lightning-talks",
  "action-items",
  "notes-viewer",
  "progress-report",
  "attendance-report",
  "notifications",
  "settings",
] as const

export type PodFeatureSegment = (typeof POD_FEATURE_SEGMENTS)[number]

function isPodFeatureSegment(segment: string): segment is PodFeatureSegment {
  return (POD_FEATURE_SEGMENTS as readonly string[]).includes(segment)
}

export function isFeaturePagePath(pathname: string): boolean {
  const segment = getFeatureSegmentFromPath(pathname)
  return segment !== null && segment !== "settings"
}

export function getFeatureSegmentFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/cohorts\/[^/]+\/([^/?]+)/)
  const segment = match?.[1]
  if (segment && isPodFeatureSegment(segment)) {
    return segment
  }
  return null
}

/** Redirect legacy nested pod URLs (/cohorts/{umbrella}/pods/{n}/…) to flat slugs. */
export function legacyCohortPathRedirect(
  pathname: string,
  search: string,
): string | null {
  const nestedMatch = pathname.match(
    /^\/cohorts\/([^/]+)\/pods\/(\d+)(?:\/([^/?]+))?$/,
  )
  if (nestedMatch?.[1] && nestedMatch[2]) {
    const umbrella = slugToProgramCode(decodeURIComponent(nestedMatch[1]))
    const programCode = buildGroupProgramCode(
      umbrella,
      Number.parseInt(nestedMatch[2], 10),
    )
    const segment = nestedMatch[3]
    return cohortPath(programCode, segment) + search
  }

  return null
}

/** Dashboard URL with optional umbrella + pod program codes in query params. */
export function dashboardPath(
  cohortProgramCode: string,
  podProgramCode?: string,
): string {
  const params = new URLSearchParams({ cohort: cohortProgramCode })
  if (podProgramCode) {
    params.set("pod", podProgramCode)
  }
  return `/dashboard?${params.toString()}`
}

/** My Tasks URL scoped to a cohort program code. */
export function myTasksPath(cohortProgramCode: string): string {
  return `/me?cohort=${encodeURIComponent(cohortProgramCode)}`
}

export { baseProgramCode, hasGroupSuffix }
