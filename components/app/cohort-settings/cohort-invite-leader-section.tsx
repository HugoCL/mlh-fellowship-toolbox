"use client"

import { useMutation } from "convex/react"
import { CopyIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { InfoCallout } from "@/components/app/info-callout"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { inviteUrl } from "@/lib/invite-url"

type PodGroup = {
  cohort: Doc<"cohorts">
  leader: { name: string; email: string } | null
  pendingLeaderEmail: string | null
}

type CohortInviteLeaderSectionProps = {
  cohortId: Id<"cohorts">
  groups: PodGroup[] | undefined
  selectedPodId: Id<"cohorts"> | ""
  onSelectedPodIdChange: (podId: Id<"cohorts"> | "") => void
}

export function CohortInviteLeaderSection({
  cohortId,
  groups,
  selectedPodId,
  onSelectedPodIdChange,
}: CohortInviteLeaderSectionProps) {
  const addPodLeader = useMutation(api.cohorts.addPodLeaderByEmail)
  const [leaderEmail, setLeaderEmail] = useState("")
  const [lastLeaderInviteLink, setLastLeaderInviteLink] = useState<
    string | null
  >(null)

  const podsAvailableForInvite = (groups ?? []).filter(
    (group) => !group.leader && !group.pendingLeaderEmail,
  )
  const selectedPodGroup = selectedPodId
    ? (groups ?? []).find((group) => group.cohort._id === selectedPodId)
    : undefined

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Invite pod leaders"
          description="Choose an unassigned pod and send an invite. The pod leader manages that pod only — not the whole cohort."
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!selectedPodId) {
              toast.error("Select a pod first.")
              return
            }
            try {
              const result = await addPodLeader({
                cohortId,
                email: leaderEmail,
                podCohortId: selectedPodId,
              })
              const link = inviteUrl(result.token)
              setLastLeaderInviteLink(link)
              toast.success("Pod leader invite created.")
              setLeaderEmail("")
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to invite pod leader.",
              )
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pod-select">Pod</FieldLabel>
              <Select
                value={selectedPodId || null}
                onValueChange={(value) => {
                  if (value) {
                    onSelectedPodIdChange(value as Id<"cohorts">)
                  }
                }}
              >
                <SelectTrigger
                  id="pod-select"
                  className="w-full"
                  aria-label="Select pod"
                >
                  <SelectValue placeholder="Select an unassigned pod">
                    {selectedPodGroup?.cohort.programCode}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {podsAvailableForInvite.map((group) => (
                      <SelectItem
                        key={group.cohort._id}
                        value={group.cohort._id}
                      >
                        {group.cohort.programCode}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {podsAvailableForInvite.length === 0 ? (
                <InfoCallout variant="neutral">
                  Create a pod or wait for pending invites to be accepted before
                  inviting another leader.
                </InfoCallout>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="leader-email">Pod leader email</FieldLabel>
              <Input
                id="leader-email"
                type="email"
                value={leaderEmail}
                onChange={(e) => setLeaderEmail(e.target.value)}
                spellCheck={false}
                autoComplete="email"
              />
            </Field>
            <Button
              type="submit"
              className="self-start"
              disabled={podsAvailableForInvite.length === 0}
            >
              Send invite
            </Button>
          </FieldGroup>
        </form>
        {lastLeaderInviteLink ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Invitation link</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {lastLeaderInviteLink}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={async () => {
                await navigator.clipboard.writeText(lastLeaderInviteLink)
                toast.success("Link copied.")
              }}
            >
              <CopyIcon data-icon="inline-start" />
              Copy link
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
