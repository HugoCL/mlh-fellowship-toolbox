import { describe, expect, it } from "vitest"
import {
  publicSharePath,
  publicShareUrl,
  shareFeatureFromRouteSegment,
  shareRouteSegment,
} from "./public-share-links"

describe("public share link helpers", () => {
  it("maps share features to public route segments", () => {
    expect(shareRouteSegment("directory")).toBe("directory")
    expect(shareRouteSegment("mentorMeetings")).toBe("mentor-meetings")
  })

  it("parses public route segments back to share features", () => {
    expect(shareFeatureFromRouteSegment("directory")).toBe("directory")
    expect(shareFeatureFromRouteSegment("mentor-meetings")).toBe(
      "mentorMeetings",
    )
    expect(shareFeatureFromRouteSegment("mentors")).toBeNull()
  })

  it("builds public paths and absolute urls", () => {
    expect(publicSharePath("mentorMeetings", "abc123")).toBe(
      "/share/mentor-meetings/abc123",
    )
    expect(publicShareUrl("https://toolbox.example", "directory", "tok")).toBe(
      "https://toolbox.example/share/directory/tok",
    )
    expect(publicShareUrl("https://toolbox.example/", "directory", "tok")).toBe(
      "https://toolbox.example/share/directory/tok",
    )
  })
})
