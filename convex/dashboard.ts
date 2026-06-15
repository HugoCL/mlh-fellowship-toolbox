import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"
import { getFellowForUser, getMentorForUser } from "./lib/auth"
import { canManagePodAsLeader, parentHasChildPods } from "./lib/cohortScope"
import { cohortQuery } from "./lib/customFunctions"

function hasSchedulingLink(url: string | undefined | null): boolean {
  return Boolean(url?.trim())
}

function podBasePath(programCode: string): string {
  const parts = programCode.split(".")
  const podNumber = parts.at(-1) ?? "1"
  const umbrella = parts.slice(0, -1).join(".")
  const slug = umbrella.replace(/\./g, "-")
  return `/cohorts/${slug}/pods/${podNumber}`
}

const setupTaskValidator = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  href: v.string(),
  priority: v.union(v.literal("high"), v.literal("medium")),
})

const activityModuleValidator = v.object({
  id: v.string(),
  label: v.string(),
  completed: v.number(),
  total: v.number(),
  href: v.string(),
  status: v.union(
    v.literal("notStarted"),
    v.literal("inProgress"),
    v.literal("complete"),
  ),
})

const leaderDashboardValidator = v.object({
  view: v.literal("leader"),
  fellowCount: v.number(),
  mentorCount: v.number(),
  fellowsMissingCalendly: v.number(),
  pendingInvites: v.number(),
  setupTasks: v.array(setupTaskValidator),
  activityModules: v.array(activityModuleValidator),
  programStarted: v.boolean(),
})

const fellowActionItemValidator = v.object({
  id: v.string(),
  title: v.string(),
  subtitle: v.string(),
  href: v.string(),
  status: v.union(v.literal("todo"), v.literal("scheduled"), v.literal("done")),
})

const fellowDashboardValidator = v.object({
  view: v.literal("fellow"),
  needsCalendly: v.boolean(),
  actionItems: v.array(fellowActionItemValidator),
  completedCount: v.number(),
  totalCount: v.number(),
})

const mentorAssignmentItemValidator = v.object({
  id: v.id("mentorMeetingAssignments"),
  fellowName: v.string(),
  roundLabel: v.string(),
  scheduled: v.boolean(),
  completed: v.boolean(),
})

const mentorDashboardValidator = v.object({
  view: v.literal("mentor"),
  needsCalendly: v.boolean(),
  pendingCount: v.number(),
  assignments: v.array(mentorAssignmentItemValidator),
})

export const getDashboardInsights = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(
    leaderDashboardValidator,
    fellowDashboardValidator,
    mentorDashboardValidator,
  ),
  handler: async (ctx, args) => {
    const cohort = ctx.cohortAccess.cohort
    const isUmbrellaViewer = ctx.cohortAccess.kind === "umbrellaViewer"
    const hasChildPods = isUmbrellaViewer
      ? false
      : await parentHasChildPods(ctx, args.cohortId)
    const canManagePod =
      ctx.membership.role === "podLeader" &&
      canManagePodAsLeader(cohort, hasChildPods) &&
      !isUmbrellaViewer

    const basePath = podBasePath(cohort.programCode)

    if (ctx.membership.role === "fellow") {
      return await buildFellowDashboard(ctx, args.cohortId, basePath)
    }

    if (ctx.membership.role === "mentor") {
      return await buildMentorDashboard(ctx, args.cohortId)
    }

    if (canManagePod || isUmbrellaViewer) {
      return await buildLeaderDashboard(ctx, args.cohortId, basePath)
    }

    return await buildFellowDashboard(ctx, args.cohortId, basePath)
  },
})

async function buildLeaderDashboard(
  ctx: QueryCtx & { user: { _id: Id<"users"> } },
  cohortId: Id<"cohorts">,
  basePath: string,
) {
  const fellows = await ctx.db
    .query("fellows")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const mentors = await ctx.db
    .query("mentors")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const activeMentors = mentors.filter((mentor) => mentor.active)

  const peerOneOnOnes = await ctx.db
    .query("peerOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const leaderOneOnOnes = await ctx.db
    .query("leaderOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const mentorAssignments = await ctx.db
    .query("mentorMeetingAssignments")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const mentorRounds = await ctx.db
    .query("mentorMeetingRounds")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const demoDays = await ctx.db
    .query("demoDays")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const lightningSlots = await ctx.db
    .query("lightningTalkSlots")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const lightningTalks = await ctx.db
    .query("lightningTalks")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const invites = await ctx.db
    .query("invites")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const pendingInvites = invites.filter(
    (invite) =>
      invite.status === "pending" &&
      (invite.role === "fellow" || invite.role === "mentor"),
  ).length

  const fellowsMissingCalendly = fellows.filter(
    (fellow) => !fellow.calendlyUrl?.trim(),
  ).length

  const setupTasks: Array<{
    id: string
    title: string
    description: string
    href: string
    priority: "high" | "medium"
  }> = []

  if (fellows.length === 0) {
    setupTasks.push({
      id: "add-fellows",
      title: "Add fellows to the pod",
      description: "Invite or add fellows before running program activities.",
      href: `${basePath}/directory`,
      priority: "high",
    })
  }

  if (activeMentors.length < 2) {
    setupTasks.push({
      id: "add-mentors",
      title: "Add at least 2 mentors",
      description:
        "Mentor meeting assignments need two or more active mentors.",
      href: `${basePath}/directory`,
      priority: "high",
    })
  }

  if (fellows.length >= 2 && peerOneOnOnes.length === 0) {
    setupTasks.push({
      id: "generate-peer-matrix",
      title: "Generate peer 1:1 matrix",
      description: "Create pairings so fellows know who to meet.",
      href: `${basePath}/one-on-ones`,
      priority: "high",
    })
  }

  if (
    fellows.length > 0 &&
    activeMentors.length >= 2 &&
    mentorRounds.length < 2
  ) {
    setupTasks.push({
      id: "create-mentor-rounds",
      title: "Create mentor meeting rounds",
      description:
        "Add at least two meeting rounds before generating assignments.",
      href: `${basePath}/mentors`,
      priority: "high",
    })
  }

  if (
    fellows.length > 0 &&
    activeMentors.length >= 2 &&
    mentorRounds.length >= 2 &&
    mentorAssignments.length === 0
  ) {
    setupTasks.push({
      id: "generate-mentor-assignments",
      title: "Generate mentor assignments",
      description: "Pair fellows with mentors for each round.",
      href: `${basePath}/mentors`,
      priority: "high",
    })
  }

  if (fellows.length > 0 && demoDays.length === 0) {
    setupTasks.push({
      id: "schedule-demo-days",
      title: "Schedule demo days",
      description: "Assign a demo date for each fellow.",
      href: `${basePath}/demo-days`,
      priority: "medium",
    })
  }

  if (lightningSlots.length === 0) {
    setupTasks.push({
      id: "create-lightning-slots",
      title: "Open lightning talk slots",
      description: "Create enrollment slots so fellows can sign up.",
      href: `${basePath}/lightning-talks`,
      priority: "medium",
    })
  }

  if (pendingInvites > 0) {
    setupTasks.push({
      id: "pending-invites",
      title: `${pendingInvites} pending invite${pendingInvites === 1 ? "" : "s"}`,
      description: "Follow up on directory invites that haven't been accepted.",
      href: `${basePath}/directory`,
      priority: "medium",
    })
  }

  if (fellowsMissingCalendly > 0) {
    setupTasks.push({
      id: "missing-calendly",
      title: `${fellowsMissingCalendly} fellow${fellowsMissingCalendly === 1 ? "" : "s"} missing scheduling links`,
      description: "Fellows need Calendly links for peer booking.",
      href: `${basePath}/directory`,
      priority: "medium",
    })
  }

  const activityModules: Array<{
    id: string
    label: string
    completed: number
    total: number
    href: string
    status: "notStarted" | "inProgress" | "complete"
  }> = []

  function moduleStatus(completed: number, total: number) {
    if (total === 0) {
      return "notStarted" as const
    }
    if (completed >= total) {
      return "complete" as const
    }
    return "inProgress" as const
  }

  if (peerOneOnOnes.length > 0) {
    const completed = peerOneOnOnes.filter(
      (item) => item.status === "completed",
    ).length
    activityModules.push({
      id: "peer",
      label: "Peer 1:1s",
      completed,
      total: peerOneOnOnes.length,
      href: `${basePath}/one-on-ones`,
      status: moduleStatus(completed, peerOneOnOnes.length),
    })
  }

  if (leaderOneOnOnes.length > 0) {
    const completed = leaderOneOnOnes.filter(
      (item) => item.status === "completed",
    ).length
    activityModules.push({
      id: "leader",
      label: "Pod leader 1:1s",
      completed,
      total: leaderOneOnOnes.length,
      href: `${basePath}/one-on-ones`,
      status: moduleStatus(completed, leaderOneOnOnes.length),
    })
  }

  if (mentorAssignments.length > 0) {
    const completed = mentorAssignments.filter((item) => item.completed).length
    activityModules.push({
      id: "mentors",
      label: "Mentor meetings",
      completed,
      total: mentorAssignments.length,
      href: `${basePath}/mentors`,
      status: moduleStatus(completed, mentorAssignments.length),
    })
  }

  if (demoDays.length > 0) {
    const completed = demoDays.filter((item) => item.completed).length
    activityModules.push({
      id: "demos",
      label: "Demo days",
      completed,
      total: demoDays.length,
      href: `${basePath}/demo-days`,
      status: moduleStatus(completed, demoDays.length),
    })
  }

  if (lightningTalks.length > 0 || lightningSlots.length > 0) {
    const completed = lightningTalks.filter((item) => item.completed).length
    const total = Math.max(lightningTalks.length, fellows.length)
    activityModules.push({
      id: "talks",
      label: "Lightning talks",
      completed,
      total,
      href: `${basePath}/lightning-talks`,
      status: moduleStatus(completed, total),
    })
  }

  const programStarted =
    peerOneOnOnes.length > 0 ||
    mentorAssignments.length > 0 ||
    demoDays.length > 0 ||
    lightningSlots.length > 0

  return {
    view: "leader" as const,
    fellowCount: fellows.length,
    mentorCount: activeMentors.length,
    fellowsMissingCalendly,
    pendingInvites,
    setupTasks,
    activityModules,
    programStarted,
  }
}

async function buildFellowDashboard(
  ctx: QueryCtx & { user: { _id: Id<"users"> } },
  cohortId: Id<"cohorts">,
  basePath: string,
) {
  const fellow = await getFellowForUser(ctx, cohortId, ctx.user._id)
  const needsCalendly = fellow ? !hasSchedulingLink(fellow.calendlyUrl) : false

  if (!fellow) {
    return {
      view: "fellow" as const,
      needsCalendly: false,
      actionItems: [],
      completedCount: 0,
      totalCount: 0,
    }
  }

  const fellows = await ctx.db
    .query("fellows")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()
  const fellowMap = new Map(fellows.map((item) => [item._id, item]))

  const peerPairs = await ctx.db
    .query("peerOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const myPeerPairs = peerPairs.filter(
    (pair) => pair.fellowAId === fellow._id || pair.fellowBId === fellow._id,
  )

  const instances = await ctx.db
    .query("oneOnOneInstances")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const leaderRecords = await ctx.db
    .query("leaderOneOnOnes")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const myLeaderRecords = leaderRecords.filter(
    (record) => record.fellowId === fellow._id,
  )

  const mentorAssignments = await ctx.db
    .query("mentorMeetingAssignments")
    .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
    .collect()

  const mentors = await ctx.db
    .query("mentors")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()
  const mentorMap = new Map(mentors.map((mentor) => [mentor._id, mentor]))

  const rounds = await ctx.db
    .query("mentorMeetingRounds")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()
  const roundMap = new Map(rounds.map((round) => [round._id, round]))

  const demoDay = await ctx.db
    .query("demoDays")
    .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
    .unique()

  const lightningTalk = await ctx.db
    .query("lightningTalks")
    .withIndex("by_fellow", (q) => q.eq("fellowId", fellow._id))
    .unique()

  const actionItems: Array<{
    id: string
    title: string
    subtitle: string
    href: string
    status: "todo" | "scheduled" | "done"
  }> = []

  if (needsCalendly) {
    actionItems.push({
      id: "calendly",
      title: "Add your scheduling link",
      subtitle: "So podmates can book peer 1:1s with you.",
      href: `${basePath}/directory?setup=scheduling`,
      status: "todo",
    })
  }

  for (const pair of myPeerPairs) {
    if (pair.status === "completed") {
      continue
    }
    const otherId =
      pair.fellowAId === fellow._id ? pair.fellowBId : pair.fellowAId
    const other = fellowMap.get(otherId)
    actionItems.push({
      id: `peer-${pair._id}`,
      title: `Peer 1:1 with ${other?.name ?? "podmate"}`,
      subtitle:
        pair.status === "scheduled"
          ? "Meeting scheduled — mark complete when done."
          : "Schedule and complete your peer check-in.",
      href: `${basePath}/one-on-ones`,
      status: pair.status === "scheduled" ? "scheduled" : "todo",
    })
  }

  for (const record of myLeaderRecords) {
    if (record.status === "completed") {
      continue
    }
    const instance = instances.find((item) => item._id === record.instanceId)
    actionItems.push({
      id: `leader-${record._id}`,
      title: instance?.title ?? "Pod leader 1:1",
      subtitle:
        record.status === "scheduled"
          ? "Scheduled — update when complete."
          : "Book time with your pod leader.",
      href: `${basePath}/one-on-ones`,
      status: record.status === "scheduled" ? "scheduled" : "todo",
    })
  }

  for (const assignment of mentorAssignments) {
    if (assignment.completed) {
      continue
    }
    const mentor = mentorMap.get(assignment.mentorId)
    const round = roundMap.get(assignment.roundId)
    actionItems.push({
      id: `mentor-${assignment._id}`,
      title: `Mentor meeting with ${mentor?.name ?? "mentor"}`,
      subtitle: round?.targetWeekLabel ?? "Complete your mentor check-in.",
      href: `${basePath}/mentors`,
      status: assignment.scheduled ? "scheduled" : "todo",
    })
  }

  if (demoDay && !demoDay.completed) {
    actionItems.push({
      id: "demo-day",
      title: "Prepare for demo day",
      subtitle: "Mark complete after you present.",
      href: `${basePath}/demo-days`,
      status: "todo",
    })
  }

  if (!lightningTalk) {
    actionItems.push({
      id: "lightning-talk",
      title: "Enroll in a lightning talk",
      subtitle: "Pick a slot and topic on the Lightning Talks page.",
      href: `${basePath}/lightning-talks`,
      status: "todo",
    })
  } else if (!lightningTalk.completed) {
    actionItems.push({
      id: "lightning-talk-complete",
      title: "Deliver your lightning talk",
      subtitle: lightningTalk.topic,
      href: `${basePath}/lightning-talks`,
      status: "todo",
    })
  }

  let completedCount = 0
  let totalCount = 0

  for (const pair of myPeerPairs) {
    totalCount += 1
    if (pair.status === "completed") {
      completedCount += 1
    }
  }
  for (const record of myLeaderRecords) {
    totalCount += 1
    if (record.status === "completed") {
      completedCount += 1
    }
  }
  for (const assignment of mentorAssignments) {
    totalCount += 1
    if (assignment.completed) {
      completedCount += 1
    }
  }
  if (demoDay) {
    totalCount += 1
    if (demoDay.completed) {
      completedCount += 1
    }
  }
  if (lightningTalk) {
    totalCount += 1
    if (lightningTalk.completed) {
      completedCount += 1
    }
  }

  return {
    view: "fellow" as const,
    needsCalendly,
    actionItems,
    completedCount,
    totalCount,
  }
}

async function buildMentorDashboard(
  ctx: QueryCtx & { user: { _id: Id<"users"> } },
  cohortId: Id<"cohorts">,
) {
  const mentor = await getMentorForUser(ctx, cohortId, ctx.user._id)
  const needsCalendly = mentor ? !hasSchedulingLink(mentor.calendlyUrl) : false

  if (!mentor) {
    return {
      view: "mentor" as const,
      needsCalendly: false,
      pendingCount: 0,
      assignments: [],
    }
  }

  const fellows = await ctx.db
    .query("fellows")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()
  const fellowMap = new Map(fellows.map((fellow) => [fellow._id, fellow]))

  const rounds = await ctx.db
    .query("mentorMeetingRounds")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()
  const roundMap = new Map(rounds.map((round) => [round._id, round]))

  const assignments = await ctx.db
    .query("mentorMeetingAssignments")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect()

  const myAssignments = assignments
    .filter((assignment) => assignment.mentorId === mentor._id)
    .sort((a, b) => {
      const roundA = roundMap.get(a.roundId)?.roundNumber ?? 0
      const roundB = roundMap.get(b.roundId)?.roundNumber ?? 0
      return roundA - roundB
    })

  const pendingCount = myAssignments.filter(
    (assignment) => !assignment.completed,
  ).length

  return {
    view: "mentor" as const,
    needsCalendly,
    pendingCount,
    assignments: myAssignments.map((assignment) => ({
      id: assignment._id,
      fellowName: fellowMap.get(assignment.fellowId)?.name ?? "Fellow",
      roundLabel: roundMap.get(assignment.roundId)?.targetWeekLabel ?? "Round",
      scheduled: assignment.scheduled,
      completed: assignment.completed,
    })),
  }
}
