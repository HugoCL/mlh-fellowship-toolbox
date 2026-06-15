import { v } from "convex/values"
import { generatePeerPairs } from "./lib/assignments"
import {
  canonicalPair,
  getFellowForUser,
  requireFellowForUser,
} from "./lib/auth"
import {
  cohortMutation,
  cohortQuery,
  podManagementMutation,
} from "./lib/customFunctions"
import { fellowValidator, oneOnOneStatusValidator } from "./lib/validators"

const instanceValidator = v.object({
  _id: v.id("oneOnOneInstances"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  title: v.string(),
  sortOrder: v.number(),
  createdAt: v.number(),
})

const peerOneOnOneValidator = v.object({
  _id: v.id("peerOneOnOnes"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  fellowAId: v.id("fellows"),
  fellowBId: v.id("fellows"),
  status: oneOnOneStatusValidator,
  updatedAt: v.number(),
  updatedByUserId: v.optional(v.id("users")),
})

const leaderOneOnOneValidator = v.object({
  _id: v.id("leaderOneOnOnes"),
  _creationTime: v.number(),
  cohortId: v.id("cohorts"),
  fellowId: v.id("fellows"),
  instanceId: v.id("oneOnOneInstances"),
  status: oneOnOneStatusValidator,
  updatedAt: v.number(),
  updatedByUserId: v.optional(v.id("users")),
})

export const listInstances = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(instanceValidator),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("oneOnOneInstances")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return instances.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const createInstance = podManagementMutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
  },
  returns: v.id("oneOnOneInstances"),
  handler: async (ctx, args) => {
    const instances = await ctx.db
      .query("oneOnOneInstances")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const instanceId = await ctx.db.insert("oneOnOneInstances", {
      cohortId: args.cohortId,
      title: args.title.trim(),
      sortOrder: instances.length,
      createdAt: Date.now(),
    })

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const fellow of fellows) {
      await ctx.db.insert("leaderOneOnOnes", {
        cohortId: args.cohortId,
        fellowId: fellow._id,
        instanceId,
        status: "notStarted",
        updatedAt: Date.now(),
      })
    }

    return instanceId
  },
})

export const generatePeerMatrix = podManagementMutation({
  args: { cohortId: v.id("cohorts") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const existing = await ctx.db
      .query("peerOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const existingKeys = new Set(
      existing.map((item) => `${item.fellowAId}:${item.fellowBId}`),
    )

    const pairs = generatePeerPairs(fellows.map((fellow) => fellow._id))
    let created = 0

    for (const [fellowAId, fellowBId] of pairs) {
      const key = `${fellowAId}:${fellowBId}`
      if (existingKeys.has(key)) {
        continue
      }

      await ctx.db.insert("peerOneOnOnes", {
        cohortId: args.cohortId,
        fellowAId,
        fellowBId,
        status: "notStarted",
        updatedAt: Date.now(),
      })
      created += 1
    }

    const instances = await ctx.db
      .query("oneOnOneInstances")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    for (const fellow of fellows) {
      for (const instance of instances) {
        const existingLeader = await ctx.db
          .query("leaderOneOnOnes")
          .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
          .collect()

        const alreadyExists = existingLeader.some(
          (item) =>
            item.fellowId === fellow._id && item.instanceId === instance._id,
        )

        if (!alreadyExists) {
          await ctx.db.insert("leaderOneOnOnes", {
            cohortId: args.cohortId,
            fellowId: fellow._id,
            instanceId: instance._id,
            status: "notStarted",
            updatedAt: Date.now(),
          })
        }
      }
    }

    return created
  },
})

export const listPeerOneOnOnes = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellows: v.array(fellowValidator),
    pairs: v.array(peerOneOnOneValidator),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const pairs = await ctx.db
      .query("peerOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    return { fellows, pairs }
  },
})

export const listLeaderOneOnOnes = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    fellows: v.array(fellowValidator),
    instances: v.array(instanceValidator),
    records: v.array(leaderOneOnOneValidator),
    podLeaderSchedulingLink: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const instances = await ctx.db
      .query("oneOnOneInstances")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const records = await ctx.db
      .query("leaderOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const memberships = await ctx.db
      .query("cohortMemberships")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    let podLeaderSchedulingLink: string | null = null
    for (const membership of memberships) {
      if (membership.role !== "podLeader") {
        continue
      }
      const user = await ctx.db.get("users", membership.userId)
      podLeaderSchedulingLink = user?.calendlyUrl?.trim() || null
      break
    }

    return {
      fellows,
      instances: instances.sort((a, b) => a.sortOrder - b.sortOrder),
      records,
      podLeaderSchedulingLink,
    }
  },
})

export const updatePeerStatus = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    fellowAId: v.id("fellows"),
    fellowBId: v.id("fellows"),
    status: oneOnOneStatusValidator,
  },
  returns: peerOneOnOneValidator,
  handler: async (ctx, args) => {
    const [fellowAId, fellowBId] = canonicalPair(args.fellowAId, args.fellowBId)

    const pair = await ctx.db
      .query("peerOneOnOnes")
      .withIndex("by_cohort_and_pair", (q) =>
        q
          .eq("cohortId", args.cohortId)
          .eq("fellowAId", fellowAId)
          .eq("fellowBId", fellowBId),
      )
      .unique()

    if (!pair) {
      throw new Error("Peer 1:1 not found")
    }

    if (ctx.membership.role === "fellow") {
      const fellow = await requireFellowForUser(
        ctx,
        args.cohortId,
        ctx.user._id,
      )
      if (fellow._id !== fellowAId && fellow._id !== fellowBId) {
        throw new Error("You can only update your own peer 1:1s")
      }
    }

    await ctx.db.patch("peerOneOnOnes", pair._id, {
      status: args.status,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const updated = await ctx.db.get("peerOneOnOnes", pair._id)
    if (!updated) {
      throw new Error("Peer 1:1 not found")
    }
    return updated
  },
})

export const updateLeaderStatus = cohortMutation({
  args: {
    cohortId: v.id("cohorts"),
    fellowId: v.id("fellows"),
    instanceId: v.id("oneOnOneInstances"),
    status: oneOnOneStatusValidator,
  },
  returns: leaderOneOnOneValidator,
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("leaderOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const record = records.find(
      (item) =>
        item.fellowId === args.fellowId && item.instanceId === args.instanceId,
    )

    if (!record) {
      throw new Error("Leader 1:1 not found")
    }

    if (ctx.membership.role === "fellow") {
      const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
      if (!fellow || fellow._id !== args.fellowId) {
        throw new Error("You can only update your own leader 1:1s")
      }
    }

    await ctx.db.patch("leaderOneOnOnes", record._id, {
      status: args.status,
      updatedAt: Date.now(),
      updatedByUserId: ctx.user._id,
    })

    const updated = await ctx.db.get("leaderOneOnOnes", record._id)
    if (!updated) {
      throw new Error("Leader 1:1 not found")
    }
    return updated
  },
})

export const getMyOneOnOnes = cohortQuery({
  args: { cohortId: v.id("cohorts") },
  returns: v.object({
    peerPairs: v.array(peerOneOnOneValidator),
    leaderRecords: v.array(leaderOneOnOneValidator),
    instances: v.array(instanceValidator),
    peers: v.array(fellowValidator),
  }),
  handler: async (ctx, args) => {
    const fellow = await getFellowForUser(ctx, args.cohortId, ctx.user._id)
    if (!fellow) {
      return {
        peerPairs: [],
        leaderRecords: [],
        instances: [],
        peers: [],
      }
    }

    const fellows = await ctx.db
      .query("fellows")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const pairs = await ctx.db
      .query("peerOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const peerPairs = pairs.filter(
      (pair) => pair.fellowAId === fellow._id || pair.fellowBId === fellow._id,
    )

    const instances = await ctx.db
      .query("oneOnOneInstances")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const records = await ctx.db
      .query("leaderOneOnOnes")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect()

    const leaderRecords = records.filter(
      (record) => record.fellowId === fellow._id,
    )

    const peers = fellows.filter((item) => item._id !== fellow._id)

    return {
      peerPairs,
      leaderRecords,
      instances: instances.sort((a, b) => a.sortOrder - b.sortOrder),
      peers,
    }
  },
})
