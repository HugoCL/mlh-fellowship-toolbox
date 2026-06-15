"use client"

import { useMutation, useQuery } from "convex/react"
import { CopyIcon } from "lucide-react"
import Link from "next/link"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useState } from "react"
import { toast } from "sonner"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"
import { inviteUrl } from "@/lib/invite-url"

export function CohortSettingsPage() {
  const { cohortId, cohortData, isLoading } = useCohortRoute()

  const isPod = Boolean(cohortData?.cohort.parentCohortId)
  const groups = useQuery(
    api.cohorts.listGroupsForParent,
    !isPod && cohortData?.role === "podLeader" && cohortId
      ? { cohortId }
      : "skip",
  )
  const invites = useQuery(
    api.invites.listPendingForCohort,
    !isPod && cohortData?.role === "podLeader" && cohortId
      ? { cohortId }
      : "skip",
  )

  const addPodLeader = useMutation(api.cohorts.addPodLeaderByEmail)
  const createPod = useMutation(api.cohorts.createPod)
  const generatePeerMatrix = useMutation(api.oneOnOnes.generatePeerMatrix)

  const [leaderEmail, setLeaderEmail] = useState("")
  const [selectedPodId, setSelectedPodId] = useState<Id<"cohorts"> | "">("")
  const [isCreatingPod, setIsCreatingPod] = useState(false)
  const [lastLeaderInviteLink, setLastLeaderInviteLink] = useState<
    string | null
  >(null)

  const podsAvailableForInvite = (groups ?? []).filter(
    (group) => !group.leader && !group.pendingLeaderEmail,
  )

  if (isLoading || cohortData === undefined) {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Loading cohort settings…"
        />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (!cohortId) {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Cohort not found."
        />
        <PageBody>
          <Alert>
            <AlertDescription>
              This program code does not match a cohort you can access.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    )
  }

  if (cohortData.role !== "podLeader") {
    return (
      <>
        <PageHeader
          title={isPod ? "Pod Settings" : "Cohort Settings"}
          description="Administrator or pod leader access required."
        />
        <PageBody>
          <Alert>
            <AlertDescription>
              You need administrator or pod leader access to manage settings.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    )
  }

  if (isPod && !cohortData.canManagePod) {
    return (
      <>
        <PageHeader
          title="Pod Settings"
          description="Pod leader access required."
        />
        <PageBody>
          <Alert>
            <AlertDescription>
              Pod leaders manage their own pod. Switch to your pod in the
              sidebar.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    )
  }

  if (isPod) {
    return (
      <>
        <PageHeader
          title="Pod Settings"
          description={`Program setup for ${cohortData.cohort.programCode}.`}
          actions={
            <Button
              onClick={async () => {
                try {
                  const created = await generatePeerMatrix({ cohortId })
                  toast.success(`Generated ${created} peer 1:1 pairs.`)
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to generate matrix.",
                  )
                }
              }}
            >
              Generate Peer Matrix
            </Button>
          }
        />
        <PageBody>
          <div className="flex max-w-2xl flex-col gap-6">
            <Alert>
              <AlertDescription>
                Invite fellows and mentors from the{" "}
                <Link
                  href={cohortPath(cohortData.cohort.programCode, "directory")}
                  className="font-medium underline"
                >
                  Directory
                </Link>
                . Mentor meeting rounds and assignments are managed on the
                Mentor Meetings page.
              </AlertDescription>
            </Alert>
            <Button
              render={
                <Link
                  href={cohortPath(cohortData.cohort.programCode, "directory")}
                />
              }
              nativeButton={false}
              className="self-start"
            >
              Open Directory
            </Button>
          </div>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Cohort Settings"
        description="Create pods, assign pod leaders, and view pod status. Fellows, mentors, and activities are managed inside each pod."
      />
      <PageBody>
        <div className="flex max-w-3xl flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Pods in this cohort
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create pods first, then invite a pod leader for each one (e.g.{" "}
                  {cohortData.cohort.programCode}.1,{" "}
                  {cohortData.cohort.programCode}.2). Roster and program
                  activities live at the pod level.
                </p>
              </div>
              <Button
                disabled={isCreatingPod}
                onClick={async () => {
                  setIsCreatingPod(true)
                  try {
                    const podId = await createPod({ cohortId })
                    toast.success("Pod created.")
                    setSelectedPodId(podId)
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to create pod.",
                    )
                  } finally {
                    setIsCreatingPod(false)
                  }
                }}
              >
                {isCreatingPod ? "Creating…" : "Add pod"}
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program code</TableHead>
                  <TableHead>Pod leader</TableHead>
                  <TableHead>Fellows</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(groups ?? []).map((group) => (
                  <TableRow key={group.cohort._id}>
                    <TableCell className="font-medium">
                      {group.cohort.programCode}
                    </TableCell>
                    <TableCell>
                      {group.leader ? (
                        `${group.leader.name} (${group.leader.email})`
                      ) : group.pendingLeaderEmail ? (
                        <span className="text-muted-foreground">
                          Invite pending · {group.pendingLeaderEmail}
                        </span>
                      ) : (
                        <Badge variant="outline">No pod leader assigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{group.fellowCount}</TableCell>
                    <TableCell>
                      {!group.leader && !group.pendingLeaderEmail ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPodId(group.cohort._id)}
                        >
                          Invite leader
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {groups?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No pods yet. Click &ldquo;Add pod&rdquo; to create one,
                      then invite a pod leader.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Invite pod leaders
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose an unassigned pod and send an invite. The pod leader
                manages that pod only — not the whole cohort.
              </p>
            </div>
            <form
              className="rounded-lg border border-border/70 p-4"
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
                  setLastLeaderInviteLink(inviteUrl(result.token))
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
                        setSelectedPodId(value as Id<"cohorts">)
                      }
                    }}
                  >
                    <SelectTrigger
                      id="pod-select"
                      className="w-full"
                      aria-label="Select pod"
                    >
                      <SelectValue placeholder="Select an unassigned pod" />
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
                    <p className="text-xs text-muted-foreground">
                      Create a pod or wait for pending invites to be accepted
                      before inviting another leader.
                    </p>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="leader-email">
                    Pod leader email
                  </FieldLabel>
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
              <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
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
          </section>

          <section className="rounded-lg border border-border/70 p-4">
            <p className="font-medium">Pod leader invites</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {(invites ?? []).map((invite) => (
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
                  <span>
                    {invite.status === "pending"
                      ? "Pending confirmation"
                      : invite.status === "accepted"
                        ? "Leader assigned"
                        : invite.status}
                  </span>
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
              {invites?.length === 0 ? (
                <li className="text-muted-foreground">
                  No pod leader invites yet.
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </PageBody>
    </>
  )
}
