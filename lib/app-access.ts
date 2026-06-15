export const NOT_INVITED_PREFIX = "NOT_INVITED"

export function getNotInvitedMessage(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null
  }
  if (!error.message.startsWith(`${NOT_INVITED_PREFIX}:`)) {
    return null
  }
  return error.message.slice(`${NOT_INVITED_PREFIX}: `.length)
}

export function notInvitedMessageText(): string {
  return "You haven't been invited yet. Reach out to your Pod Leader to request access."
}
