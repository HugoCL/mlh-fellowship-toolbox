"use client"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { SkeletonList } from "@/components/app/page-skeleton"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel"
import { inviteUrl } from "@/lib/invite-url"

type PodLeaderInvite = {
  _id: Id<"invites">
  email: string
  podProgramCode?: string | null
  status: string
  token: string
}

type CohortPodLeaderInvitesSectionProps = {
  invites: PodLeaderInvite[] | undefined
}

function inviteStatusLabel(status: string): string {
  if (status === "pending") {
    return "Pending confirmation"
  }
  if (status === "accepted") {
    return "Leader assigned"
  }
  return status
}

export function CohortPodLeaderInvitesSection({
  invites,
}: CohortPodLeaderInvitesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Pod leader invites"
          description="Pending and accepted invites for pod leaders in this cohort."
        />
      </CardHeader>
      <CardContent>
        {invites === undefined ? (
          <SkeletonList count={3} />
        ) : invites.length === 0 ? (
          <EmptyState title="No pod leader invites yet" />
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {invites.map((invite) => (
              <li
                key={invite._id}
                className="flex flex-wrap items-center gap-x-2 text-muted-foreground"
              >
                <span className="text-foreground">{invite.email}</span>
                {invite.podProgramCode ? (
                  <>
                    <span>·</span>
                    <span>{invite.podProgramCode}</span>
                  </>
                ) : null}
                <span>·</span>
                <span>{inviteStatusLabel(invite.status)}</span>
                {invite.status === "pending" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const link = inviteUrl(invite.token)
                      await navigator.clipboard.writeText(link)
                      toast.success("Link copied.")
                    }}
                  >
                    <CopyIcon data-icon="inline-start" />
                    Copy link
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
