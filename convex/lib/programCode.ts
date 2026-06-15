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
