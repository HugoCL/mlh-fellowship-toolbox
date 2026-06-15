import type { Id } from "@/convex/_generated/dataModel"

type CohortRef = {
  parentCohortId?: Id<"cohorts">
}

export type CohortRole = "podLeader" | "fellow" | "mentor"

type MembershipRef = {
  cohort: CohortRef
  role: CohortRole
}

export function isPodCohort(cohort: CohortRef): boolean {
  return cohort.parentCohortId !== undefined
}

export function isUmbrellaCohort(cohort: CohortRef): boolean {
  return cohort.parentCohortId === undefined
}

export function isUmbrellaAdmin(memberships: MembershipRef[]): boolean {
  return memberships.some(
    (item) => item.role === "podLeader" && isUmbrellaCohort(item.cohort),
  )
}

export function isPodOnlyLeader(memberships: MembershipRef[]): boolean {
  const leadsPod = memberships.some(
    (item) => item.role === "podLeader" && isPodCohort(item.cohort),
  )
  return leadsPod && !isUmbrellaAdmin(memberships)
}

export function canManagePodWorkspace(
  _role: CohortRole,
  canManagePod: boolean,
): boolean {
  return canManagePod
}

export function canViewPodWorkspace(
  role: CohortRole,
  canManagePod: boolean,
): boolean {
  return role === "fellow" || role === "mentor" || canManagePod
}

export function isCohortAdminOnUmbrella(
  role: CohortRole,
  cohort: CohortRef,
): boolean {
  return role === "podLeader" && isUmbrellaCohort(cohort)
}

export function isUmbrellaAdminView(
  role: CohortRole,
  cohort: CohortRef,
  hasChildPods: boolean,
): boolean {
  return isCohortAdminOnUmbrella(role, cohort) && hasChildPods
}
