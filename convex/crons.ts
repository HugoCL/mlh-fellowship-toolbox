import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval(
  "materialize recurring notifications",
  { minutes: 1 },
  internal.notifications.materializeRecurringNotifications,
  {},
)

crons.interval(
  "retry stale notification deliveries",
  { minutes: 5 },
  internal.notifications.retryStalePendingDeliveries,
  {},
)

export default crons
