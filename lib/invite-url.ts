export function inviteUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/invite/${token}`
  }
  return `/invite/${token}`
}
