export type PublicShareFeature = "directory" | "mentorMeetings"

const featureRouteSegments: Record<PublicShareFeature, string> = {
  directory: "directory",
  mentorMeetings: "mentor-meetings",
}

export function shareRouteSegment(feature: PublicShareFeature): string {
  return featureRouteSegments[feature]
}

export function shareFeatureFromRouteSegment(
  segment: string,
): PublicShareFeature | null {
  if (segment === "directory") return "directory"
  if (segment === "mentor-meetings") return "mentorMeetings"
  return null
}

export function publicSharePath(
  feature: PublicShareFeature,
  token: string,
): string {
  return `/share/${shareRouteSegment(feature)}/${encodeURIComponent(token)}`
}

export function publicShareUrl(
  origin: string,
  feature: PublicShareFeature,
  token: string,
): string {
  return `${origin.replace(/\/+$/, "")}${publicSharePath(feature, token)}`
}
