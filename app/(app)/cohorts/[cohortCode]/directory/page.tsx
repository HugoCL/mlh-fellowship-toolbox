"use client"

import { useMutation, useQuery } from "convex/react"
import { CalendarIcon, CopyIcon, HashIcon, MailIcon, UserPlusIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { DiscordUsernameSetup } from "@/components/app/discord-username-setup"
import { SchedulingLinkSetup } from "@/components/app/scheduling-link-setup"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { inviteUrl } from "@/lib/invite-url"
import { formatDiscordUsername, hasDiscordUsername } from "@/lib/discord-username"
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
  const needsProfileCompletion = needsOwnSchedulingLink || needsOwnDiscordUsername

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
            <DialogTrigger render={<Button />}>
              <UserPlusIcon data-icon="inline-start" />
              Invite to pod
            </DialogTrigger>
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
                    key={cohortData.calendlyUrl}
                    cohortId={cohortId}
                    role={cohortData.role}
                    calendlyUrl={cohortData.calendlyUrl}
                    variant="action"
                  />
                ) : null}
                {needsOwnDiscordUsername ? (
                  <DiscordUsernameSetup
                    key={cohortData.discordUsername}
                    discordUsername={cohortData.discordUsername}
                    variant="action"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <DirectoryGrid people={directory.people} />

          {canInvite && directory.pendingInvites.length > 0 ? (
            <PendingInvitesList invites={directory.pendingInvites} />
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
                    <SelectValue />
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

function DirectoryGrid({ people }: { people: Array<DirectoryPerson> }) {
  return (
    <section className="flex w-full flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">People</h2>
      </div>
      {people.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          No people in this pod yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => (
            <DirectoryCard key={person._id} person={person} />
          ))}
        </div>
      )}
    </section>
  )
}

function DirectoryCard({ person }: { person: DirectoryPerson }) {
  return (
    <Card className="gap-0 p-5 transition-shadow hover:ring-foreground/20 hover:shadow-sm">
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
          <p className="truncate font-heading text-sm font-semibold leading-tight">
            {person.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{roleBadgeLabel(person.role)}</Badge>
            {person.pendingInvite ? (
              <Badge
                variant="outline"
                className="text-amber-600 dark:text-amber-400"
              >
                Invite pending
              </Badge>
            ) : person.joined ? (
              <Badge
                variant="outline"
                className="text-emerald-600 dark:text-emerald-400"
              >
                Active
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 text-xs/relaxed text-muted-foreground">
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
