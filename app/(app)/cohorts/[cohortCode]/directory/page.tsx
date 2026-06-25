"use client"

import { useMutation, useQuery } from "convex/react"
import { CopyIcon, Share2Icon, UserPlusIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import {
  DirectoryGrid,
  type DirectoryPerson,
  roleBadgeLabel,
} from "@/components/app/directory-grid"
import { DiscordUsernameSetup } from "@/components/app/discord-username-setup"
import { MentorProfileEditDialog } from "@/components/app/mentor-profile-edit-dialog"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PublicShareDialog } from "@/components/app/public-share-dialog"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import type { Id } from "@/convex/_generated/dataModel"
import { hasDiscordUsername } from "@/lib/discord-username"
import { inviteUrl } from "@/lib/invite-url"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { useActiveCohortContext } from "@/lib/use-active-cohort"
import { useCohortRoute } from "@/lib/use-cohort-route"

export default function DirectoryPage() {
  const { programCode, cohortId } = useCohortRoute()
  const searchParams = useSearchParams()
  const { cohort: cohortData, isLoading } = useActiveCohortContext(programCode)
  const directory = useQuery(
    api.directory.getDirectory,
    cohortId ? { cohortId } : "skip",
  )
  const inviteMember = useMutation(api.directory.inviteDirectoryMember)
  const updateFellowCalendly = useMutation(api.fellows.updateMyCalendly)
  const updateMentorCalendly = useMutation(api.mentors.updateMyCalendly)
  const updateMentorDiscordUsername = useMutation(
    api.mentors.updateMyDiscordUsername,
  )
  const updateMentorProfile = useMutation(api.mentors.updateMentorProfile)
  const updateLeaderSchedulingLink = useMutation(
    api.users.updateMySchedulingLink,
  )

  const [editingMentor, setEditingMentor] = useState<DirectoryPerson | null>(
    null,
  )

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState<"fellow" | "mentor">("fellow")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPod = Boolean(cohortData?.cohort.parentCohortId)
  const setupScheduling = searchParams.get("setup") === "scheduling"
  const isImpersonating = cohortData?.impersonation != null
  const canInvite = directory?.canInvite === true && !isImpersonating

  const needsOwnSchedulingLink =
    cohortData && !hasSchedulingLink(cohortData.calendlyUrl)
  const needsOwnDiscordUsername =
    cohortData && !hasDiscordUsername(cohortData.discordUsername)
  const needsProfileCompletion =
    needsOwnSchedulingLink || needsOwnDiscordUsername

  function resetInviteForm() {
    setInviteRole("fellow")
    setName("")
    setEmail("")
    setLastInviteLink(null)
  }

  function handleInviteDialogChange(open: boolean) {
    setInviteDialogOpen(open)
    if (!open) {
      resetInviteForm()
    }
  }

  if (isLoading || directory === undefined) {
    return (
      <>
        <PageHeader title="Directory" description="Loading pod directory…" />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (!cohortData || !cohortId || !isPod) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Pod directory is available inside a pod."
        />
        <PageBody>
          <Alert>
            <AlertDescription>
              Select a pod from the sidebar to view its directory.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    )
  }

  const pageContent = (
    <>
      <PageHeader
        title="Directory"
        description={`Members of pod ${directory.cohortProgramCode}.`}
        actions={
          canInvite ? (
            <>
              <PublicShareDialog
                cohortId={cohortId}
                feature="directory"
                title="Share public directory"
                description="Anyone with this link can view the pod contact directory."
                triggerLabel="Share public directory"
                triggerIcon={<Share2Icon data-icon="inline-start" />}
              />
              <DialogTrigger render={<Button />}>
                <UserPlusIcon data-icon="inline-start" />
                Invite to pod
              </DialogTrigger>
            </>
          ) : undefined
        }
      />
      <PageBody>
        <div className="flex w-full flex-col gap-8">
          {needsProfileCompletion ? (
            <section className="flex max-w-xl flex-col gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Complete your profile
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {setupScheduling
                    ? "Welcome — finish onboarding so others in the pod can reach you."
                    : "Add your contact details so others in the pod can find and book time with you."}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {needsOwnSchedulingLink ? (
                  <SchedulingLinkSetup
                    key={`scheduling-${cohortData.calendlyUrl ?? ""}`}
                    fieldId={`scheduling-link-${cohortData.role}`}
                    calendlyUrl={cohortData.calendlyUrl}
                    variant="action"
                    onSave={async (url) => {
                      if (cohortData.role === "fellow") {
                        await updateFellowCalendly({
                          cohortId,
                          calendlyUrl: url,
                        })
                      } else if (cohortData.role === "mentor") {
                        await updateMentorCalendly({
                          cohortId,
                          calendlyUrl: url,
                        })
                      } else {
                        await updateLeaderSchedulingLink({ calendlyUrl: url })
                      }
                    }}
                  />
                ) : null}
                {needsOwnDiscordUsername ? (
                  <DiscordUsernameSetup
                    key={`discord-${cohortData.discordUsername ?? ""}`}
                    discordUsername={cohortData.discordUsername}
                    variant="action"
                    onSave={
                      cohortData.role === "mentor"
                        ? async (discordUsername) => {
                            await updateMentorDiscordUsername({
                              cohortId,
                              discordUsername,
                            })
                          }
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <DirectoryGrid
            people={directory.people}
            canManageMentors={canInvite}
            showMemberStatus
            onEditMentor={setEditingMentor}
          />

          {canInvite && directory.pendingInvites.length > 0 ? (
            <PendingInvitesList invites={directory.pendingInvites} />
          ) : null}

          {editingMentor && cohortId ? (
            <MentorProfileEditDialog
              open={editingMentor != null}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingMentor(null)
                }
              }}
              mentorName={editingMentor.name}
              calendlyUrl={editingMentor.calendlyUrl}
              discordUsername={editingMentor.discordUsername}
              onSave={async (values) => {
                await updateMentorProfile({
                  cohortId,
                  mentorId: editingMentor._id as Id<"mentors">,
                  calendlyUrl: values.calendlyUrl,
                  discordUsername: values.discordUsername,
                })
              }}
            />
          ) : null}
        </div>
      </PageBody>
    </>
  )

  if (!canInvite) {
    return pageContent
  }

  return (
    <Dialog open={inviteDialogOpen} onOpenChange={handleInviteDialogChange}>
      {pageContent}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to pod</DialogTitle>
          <DialogDescription>
            Send an invitation link. They&apos;ll sign in with Clerk and confirm
            before joining.
          </DialogDescription>
        </DialogHeader>

        {lastInviteLink ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-sm font-medium">Invitation link</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {lastInviteLink}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleInviteDialogChange(false)}
              >
                Done
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(lastInviteLink)
                  toast.success("Link copied.")
                }}
              >
                <CopyIcon data-icon="inline-start" />
                Copy link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setIsSubmitting(true)
              try {
                const result = await inviteMember({
                  cohortId,
                  role: inviteRole,
                  name,
                  email,
                })
                setLastInviteLink(inviteUrl(result.token))
                toast.success("Invitation created.")
                setName("")
                setEmail("")
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to create invitation.",
                )
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => {
                    if (value === "fellow" || value === "mentor") {
                      setInviteRole(value)
                    }
                  }}
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue>
                      {inviteRole === "fellow" ? "Fellow" : "Mentor"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="fellow">Fellow</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-name">Name</FieldLabel>
                <Input
                  id="invite-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  spellCheck={false}
                  autoComplete="email"
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleInviteDialogChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PendingInvitesList({
  invites,
}: {
  invites: Array<{
    _id: Id<"invites">
    email: string
    role: "fellow" | "mentor"
    token: string
  }>
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">
        Pending invitations
      </h2>
      <div className="rounded-lg border border-border/70">
        <ul className="divide-y divide-border/70">
          {invites.map((invite) => (
            <li
              key={invite._id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium">{invite.email}</span>
              <Badge variant="outline">{roleBadgeLabel(invite.role)}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={async () => {
                  const link = inviteUrl(invite.token)
                  await navigator.clipboard.writeText(link)
                  toast.success("Link copied.")
                }}
              >
                <CopyIcon data-icon="inline-start" />
                Copy link
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
