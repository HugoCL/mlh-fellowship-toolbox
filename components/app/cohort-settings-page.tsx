"use client"

import { useMutation, useQuery } from "convex/react"
import { CopyIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { CohortDateMigrationCard } from "@/components/app/cohort-date-migration-card"
import { CohortGeneralSettingsForm } from "@/components/app/cohort-general-settings-form"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PodSettingsEditDialog } from "@/components/app/pod-settings-edit-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { cohortPath } from "@/lib/cohort-routes"
import { inviteUrl } from "@/lib/invite-url"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"

export function CohortSettingsPage() {
  const { cohortId, cohortData, isLoading } = useCohortRoute()
  const { isImpersonating, isLoading: isImpersonationLoading } =
    useIsImpersonating()

  const isPod = Boolean(cohortData?.cohort.parentCohortId)
  const canAccessPodSettings =
    !isImpersonating &&
    Boolean(cohortData?.canManagePod || cohortData?.isUmbrellaViewer)
  const canLoadUmbrellaLeaderData =
    !isPod &&
    cohortData?.role === "podLeader" &&
    cohortId &&
    !isImpersonationLoading &&
    !isImpersonating

  const groups = useQuery(
    api.cohorts.listGroupsForParent,
    canLoadUmbrellaLeaderData ? { cohortId } : "skip",
  )
  const invites = useQuery(
    api.invites.listPendingForCohort,
    canLoadUmbrellaLeaderData ? { cohortId } : "skip",
  )

  const addPodLeader = useMutation(api.cohorts.addPodLeaderByEmail)
  const createPod = useMutation(api.cohorts.createPod)

  const [leaderEmail, setLeaderEmail] = useState("")
  const [selectedPodId, setSelectedPodId] = useState<Id<"cohorts"> | "">("")
  const [isCreatingPod, setIsCreatingPod] = useState(false)
  const [lastLeaderInviteLink, setLastLeaderInviteLink] = useState<
    string | null
  >(null)
  const [editingPod, setEditingPod] = useState<Doc<"cohorts"> | null>(null)

  const podsAvailableForInvite = (groups ?? []).filter(
    (group) => !group.leader && !group.pendingLeaderEmail,
  )
  const selectedPodGroup = selectedPodId
    ? (groups ?? []).find((group) => group.cohort._id === selectedPodId)
    : undefined

  if (isLoading || cohortData === undefined) {
    return (
      <>
        <PageHeader title="Settings" description="Loading cohort settings…" />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (!cohortId) {
    return (
      <>
        <PageHeader title="Settings" description="Cohort not found." />
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

  if (isPod && !canAccessPodSettings) {
    return (
      <>
        <PageHeader
          title="Pod Settings"
          description={
            isImpersonating
              ? "Stop impersonating to manage pod settings."
              : "Pod leader or cohort admin access required."
          }
        />
        <PageBody>
          <Alert>
            <AlertDescription>
              {isImpersonating
                ? "Pod settings are not available while viewing as a fellow."
                : "Pod leaders manage their own pod. Switch to your pod in the sidebar."}
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
        />
        <PageBody>
          <div className="flex max-w-2xl flex-col gap-6">
            <CohortGeneralSettingsForm
              cohortId={cohortId}
              cohort={cohortData.cohort}
              variant="pod"
            />
            <CohortDateMigrationCard cohortId={cohortId} scope="pod" />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Directory</CardTitle>
                <CardDescription>
                  Invite fellows and mentors from the Directory. Mentor meeting
                  rounds and assignments are managed on the Mentor Meetings
                  page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <Link
                      href={cohortPath(
                        cohortData.cohort.programCode,
                        "directory",
                      )}
                    />
                  }
                  nativeButton={false}
                  className="self-start"
                >
                  Open Directory
                </Button>
              </CardContent>
            </Card>
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
        <div className="flex max-w-3xl flex-col gap-6">
          <CohortGeneralSettingsForm
            cohortId={cohortId}
            cohort={cohortData.cohort}
            variant="umbrella"
          />
          <CohortDateMigrationCard cohortId={cohortId} scope="umbrella" />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pods in this cohort</CardTitle>
              <CardDescription>
                Create pods, edit each pod&apos;s name and dates, then invite a
                pod leader (e.g. {cohortData.cohort.programCode}.1,{" "}
                {cohortData.cohort.programCode}.2). Fellows, mentors, and
                program activities live at the pod level.
              </CardDescription>
              <CardAction>
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
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-auto border-t border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Program code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Pod leader</TableHead>
                      <TableHead>Fellows</TableHead>
                      <TableHead className="w-36" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(groups ?? []).map((group) => (
                      <TableRow key={group.cohort._id}>
                        <TableCell className="font-medium">
                          {group.cohort.programCode}
                        </TableCell>
                        <TableCell>{group.cohort.name}</TableCell>
                        <TableCell>
                          {group.leader ? (
                            `${group.leader.name} (${group.leader.email})`
                          ) : group.pendingLeaderEmail ? (
                            <span className="text-muted-foreground">
                              Invite pending · {group.pendingLeaderEmail}
                            </span>
                          ) : (
                            <Badge variant="outline">
                              No pod leader assigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{group.fellowCount}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingPod(group.cohort)}
                            >
                              Edit
                            </Button>
                            {!group.leader && !group.pendingLeaderEmail ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSelectedPodId(group.cohort._id)
                                }
                              >
                                Invite leader
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {groups?.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-muted-foreground"
                        >
                          No pods yet. Click &ldquo;Add pod&rdquo; to create
                          one, then invite a pod leader.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <PodSettingsEditDialog
            pod={editingPod}
            open={editingPod !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingPod(null)
              }
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite pod leaders</CardTitle>
              <CardDescription>
                Choose an unassigned pod and send an invite. The pod leader
                manages that pod only — not the whole cohort.
              </CardDescription>
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
                <div className="rounded-lg bg-muted/30 p-4 ring-1 ring-foreground/10">
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pod leader invites</CardTitle>
              <CardDescription>
                Pending and accepted invites for pod leaders in this cohort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
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
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}
