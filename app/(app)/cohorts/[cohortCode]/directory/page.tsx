"use client"

import { useMutation, useQuery } from "convex/react"
import {
  CalendarIcon,
  CopyIcon,
  HashIcon,
  MailIcon,
  PencilIcon,
  UserPlusIcon,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { DiscordUsernameSetup } from "@/components/app/discord-username-setup"
import { EmptyState } from "@/components/app/empty-state"
import { InfoCallout } from "@/components/app/info-callout"
import { MentorProfileEditDialog } from "@/components/app/mentor-profile-edit-dialog"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { PageSkeleton, SkeletonCardGrid } from "@/components/app/page-skeleton"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { SectionHeader } from "@/components/app/section-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import {
  formatDiscordUsername,
  hasDiscordUsername,
} from "@/lib/discord-username"
import { inviteUrl } from "@/lib/invite-url"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { useActiveCohortContext } from "@/lib/use-active-cohort"
import { useCohortRoute } from "@/lib/use-cohort-route"

function roleBadgeLabel(role: "podLeader" | "fellow" | "mentor"): string {
  switch (role) {
    case "podLeader":
      return "Pod Leader"
    case "fellow":
      return "Fellow"
    case "mentor":
      return "Mentor"
  }
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
  if (parts.length === 0) {
    return "?"
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

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
      <PageSkeleton
        title="Directory"
        description="Loading pod directory…"
        width="wide"
      >
        <SkeletonCardGrid count={6} columns={3} />
      </PageSkeleton>
    )
  }

  if (!cohortData || !cohortId || !isPod) {
    return (
      <>
        <PageHeader
          title="Directory"
          description="Pod directory is available inside a pod."
        />
        <PageBody width="wide">
          <InfoCallout variant="neutral">
            Select a pod from the sidebar to view its directory.
          </InfoCallout>
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
            <DialogTrigger render={<Button />}>
              <UserPlusIcon data-icon="inline-start" />
              Invite to pod
            </DialogTrigger>
          ) : undefined
        }
      />
      <PageBody width="wide">
        <div className="flex w-full flex-col gap-6">
          {needsProfileCompletion ? (
            <section className="flex max-w-xl flex-col gap-4">
              <SectionHeader
                title="Complete your profile"
                description={
                  setupScheduling
                    ? "Welcome — finish onboarding so others in the pod can reach you."
                    : "Add your contact details so others in the pod can find and book time with you."
                }
              />
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
            <div className="rounded-lg border border-border bg-muted/40 p-3">
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
    <section className="flex flex-col gap-4">
      <SectionHeader title="Pending invitations" />
      <div className="overflow-hidden rounded-lg border border-border">
        <ul className="divide-y divide-border">
          {invites.map((invite) => (
            <li
              key={invite._id}
              className="flex flex-wrap items-center gap-3 bg-card px-4 py-3 text-sm"
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

type DirectoryPerson = {
  _id: string
  name: string
  email: string | null
  role: "podLeader" | "fellow" | "mentor"
  calendlyUrl: string | null
  discordUsername: string | null
  imageUrl: string | null
  joined: boolean
  pendingInvite: boolean
}

function DirectoryGrid({
  people,
  canManageMentors,
  onEditMentor,
}: {
  people: Array<DirectoryPerson>
  canManageMentors: boolean
  onEditMentor: (person: DirectoryPerson) => void
}) {
  return (
    <section className="flex w-full flex-col gap-4">
      <SectionHeader title="People" />
      {people.length === 0 ? (
        <EmptyState
          title="No people in this pod yet"
          description="Members will appear here once they join or are invited."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <DirectoryCard
              key={person._id}
              person={person}
              canManageMentors={canManageMentors}
              onEditMentor={onEditMentor}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DirectoryCard({
  person,
  canManageMentors,
  onEditMentor,
}: {
  person: DirectoryPerson
  canManageMentors: boolean
  onEditMentor: (person: DirectoryPerson) => void
}) {
  const showEditMentor = canManageMentors && person.role === "mentor"

  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start gap-4">
        <Avatar size="lg" className="size-12">
          {person.imageUrl ? (
            <AvatarImage src={person.imageUrl} alt={person.name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {getInitials(person.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-heading text-sm font-semibold leading-tight">
              {person.name}
            </p>
            {showEditMentor ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${person.name}'s profile`}
                onClick={() => onEditMentor(person)}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{roleBadgeLabel(person.role)}</Badge>
            {person.pendingInvite ? (
              <Badge
                variant="outline"
                className="border-warning/30 text-warning"
              >
                Invite pending
              </Badge>
            ) : person.joined ? (
              <Badge
                variant="outline"
                className="border-success/25 text-success"
              >
                Active
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <MailIcon className="size-3.5 shrink-0" />
          {person.email ? (
            <a
              href={`mailto:${person.email}`}
              className="truncate text-foreground underline-offset-4 hover:underline"
            >
              {person.email}
            </a>
          ) : (
            <span>No email</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <HashIcon className="size-3.5 shrink-0" />
          {person.discordUsername ? (
            <span className="truncate text-foreground">
              {formatDiscordUsername(person.discordUsername)}
            </span>
          ) : (
            <span>Discord not set</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-3.5 shrink-0" />
          {person.calendlyUrl ? (
            <a
              href={person.calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Open scheduling link
            </a>
          ) : (
            <span>Scheduling link not set</span>
          )}
        </div>
      </div>
    </Card>
  )
}
