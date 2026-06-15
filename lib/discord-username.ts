export function hasDiscordUsername(
  username: string | undefined | null,
): boolean {
  return Boolean(username?.trim())
}

export function formatDiscordUsername(username: string): string {
  const trimmed = username.trim().replace(/^@+/, "")
  return trimmed ? `@${trimmed}` : ""
}

export function normalizeDiscordUsername(input: string): string {
  const trimmed = input.trim().replace(/^@+/, "")
  if (!trimmed) {
    throw new Error("Enter a Discord username.")
  }
  return trimmed
}
