/** Build a group program code from a parent base code and group number (e.g. 26.SUM.B + 1 → 26.SUM.B.1). */
export function buildGroupProgramCode(
  parentProgramCode: string,
  groupNumber: number,
): string {
  return `${parentProgramCode}.${groupNumber}`
}

/** True when the code already ends with a numeric group segment (e.g. 26.SUM.B.1). */
export function hasGroupSuffix(programCode: string): boolean {
  const lastSegment = programCode.split(".").at(-1)
  return lastSegment !== undefined && /^\d+$/.test(lastSegment)
}

/** Strip a trailing numeric group segment if present (26.SUM.B.1 → 26.SUM.B). */
export function baseProgramCode(programCode: string): string {
  if (!hasGroupSuffix(programCode)) {
    return programCode
  }
  return programCode.split(".").slice(0, -1).join(".")
}

/** Nested workspace path: /cohorts/{umbrella}/pods/{n}/{segment} or umbrella settings. */
export function cohortWorkspacePath(
  programCode: string,
  segment: string,
): string {
  if (hasGroupSuffix(programCode)) {
    const parts = programCode.split(".")
    const podNumber = parts.at(-1)!
    const umbrella = parts.slice(0, -1).join(".")
    return `/cohorts/${programCodeToSlug(umbrella)}/pods/${podNumber}/${segment}`
  }
  return `/cohorts/${programCodeToSlug(programCode)}/${segment}`
}

/** URL slug — dots break Next.js dynamic routes (treated as file extensions). */
export function programCodeToSlug(programCode: string): string {
  return programCode.replace(/\./g, "-")
}
