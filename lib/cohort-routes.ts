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

export function podPath(
  umbrellaProgramCode: string,
  podNumber: number,
  segment?: string,
): string {
  const base = `/cohorts/${programCodeToSlug(umbrellaProgramCode)}/pods/${podNumber}`
  return segment ? `${base}/${segment}` : base
}

export function umbrellaPath(
  umbrellaProgramCode: string,
  segment?: string,
): string {
  const base = `/cohorts/${programCodeToSlug(umbrellaProgramCode)}`
  return segment ? `${base}/${segment}` : base
}

/** Build a workspace path from any program code (umbrella or pod). */
export function cohortPath(programCode: string, segment?: string): string {
  const { umbrellaProgramCode, podNumber } =
    parseProgramCodeForRoute(programCode)
  if (podNumber !== null) {
    return podPath(umbrellaProgramCode, podNumber, segment)
  }
  return umbrellaPath(umbrellaProgramCode, segment)
}

/** Resolve the cohort program code from a pathname (pod or umbrella). */
export function getCohortCodeFromPath(pathname: string): string | null {
  const podMatch = pathname.match(/^\/cohorts\/([^/]+)\/pods\/(\d+)/)
  if (podMatch?.[1] && podMatch[2]) {
    const umbrella = slugToProgramCode(decodeURIComponent(podMatch[1]))
    return buildGroupProgramCode(
      umbrella,
      Number.parseInt(podMatch[2], 10),
    )
  }

  const umbrellaMatch = pathname.match(/^\/cohorts\/([^/]+)/)
  if (umbrellaMatch?.[1]) {
    return slugToProgramCode(decodeURIComponent(umbrellaMatch[1]))
  }

  return null
}

export function getPodRouteFromPath(pathname: string): {
  umbrellaProgramCode: string
  podNumber: number
} | null {
  const podMatch = pathname.match(/^\/cohorts\/([^/]+)\/pods\/(\d+)/)
  if (!podMatch?.[1] || !podMatch[2]) {
    return null
  }
  return {
    umbrellaProgramCode: slugToProgramCode(decodeURIComponent(podMatch[1])),
    podNumber: Number.parseInt(podMatch[2], 10),
  }
}

export const POD_FEATURE_SEGMENTS = [
  "directory",
  "one-on-ones",
  "mentors",
  "demo-days",
  "lightning-talks",
  "settings",
] as const

export function isFeaturePagePath(pathname: string): boolean {
  return new RegExp(
    `^/cohorts/[^/]+/pods/\\d+/(${POD_FEATURE_SEGMENTS.join("|")})`,
  ).test(pathname)
}

export function getFeatureSegmentFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/cohorts\/[^/]+\/pods\/\d+\/([^/?]+)/)
  return match?.[1] ?? null
}

/** Redirect legacy flat slug URLs (26-SUM-B-5-1/directory) to nested pod paths. */
export function legacyCohortPathRedirect(
  pathname: string,
  search: string,
): string | null {
  const match = pathname.match(
    /^\/cohorts\/([^/]+)\/(directory|one-on-ones|mentors|demo-days|lightning-talks|settings)$/,
  )
  if (!match?.[1] || !match[2]) {
    return null
  }
  const programCode = slugToProgramCode(decodeURIComponent(match[1]))
  if (!hasGroupSuffix(programCode)) {
    return null
  }
  return cohortPath(programCode, match[2]) + search
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
