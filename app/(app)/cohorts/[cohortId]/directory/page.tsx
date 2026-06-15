"use client"

import { useMutation, useQuery } from "convex/react"
import { CopyIcon, UserPlusIcon } from "lucide-react"
import { useParams, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { PageBody, PageHeader } from "@/components/app/page-frame"
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
import { inviteUrl } from "@/lib/invite-url"
import { hasSchedulingLink } from "@/lib/scheduling-link"
import { useActiveCohortContext } from "@/lib/use-active-cohort"

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

export default function DirectoryPage() {
  const params = useParams<{ cohortId: string }>()
  const searchParams = useSearchParams()
  const cohortId = params.cohortId as Id<"cohorts">
  const { cohort: cohortData, isLoading } = useActiveCohortContext(cohortId)
  const directory = useQuery(api.directory.getDirectory, { cohortId })
  const inviteMember = useMutation(api.directory.inviteDirectoryMember)

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState<"fellow" | "mentor">("fellow")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPod = Boolean(cohortData?.cohort.parentCohortId)
  const setupScheduling = searchParams.get("setup") === "scheduling"
  const needsOwnSchedulingLink =
    cohortData &&
    ((cohortData.role === "fellow" &&
      !hasSchedulingLink(cohortData.fellow?.calendlyUrl)) ||
      (cohortData.role === "mentor" &&
        !hasSchedulingLink(cohortData.mentor?.calendlyUrl)))

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

  if (!cohortData || !isPod) {
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
        description={`People in pod ${directory.cohortProgramCode}. Fellows and mentors can view this list; pod leaders and cohort admins can invite new members.`}
        actions={
          directory.canInvite ? (
            <DialogTrigger render={<Button />}>
              <UserPlusIcon data-icon="inline-start" />
              Invite to pod
            </DialogTrigger>
          ) : undefined
        }
      />
      <PageBody>
        <div className="flex w-full flex-col gap-8">
          {needsOwnSchedulingLink &&
          (cohortData.role === "fellow" || cohortData.role === "mentor") ? (
            <section className="flex max-w-xl flex-col gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  Complete your profile
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {setupScheduling
                    ? "Welcome — add your scheduling link to finish onboarding."
                    : "Add your scheduling link so others in the pod can book time with you."}
                </p>
              </div>
              <SchedulingLinkSetup
                key={
                  cohortData.role === "fellow"
                    ? cohortData.fellow?.calendlyUrl
                    : cohortData.mentor?.calendlyUrl
                }
                cohortId={cohortId}
                role={cohortData.role}
                calendlyUrl={
                  cohortData.role === "fellow"
                    ? cohortData.fellow?.calendlyUrl
                    : cohortData.mentor?.calendlyUrl
                }
                variant="action"
              />
            </section>
          ) : null}

          <DirectoryTable
            people={directory.people}
            readOnly={!directory.canInvite}
          />

          {directory.canInvite && directory.pendingInvites.length > 0 ? (
            <PendingInvitesList invites={directory.pendingInvites} />
          ) : null}
        </div>
      </PageBody>
    </>
  )

  if (!directory.canInvite) {
    return pageContent
  }

  return (
    <Dialog open={inviteDialogOpen} onOpenChange={handleInviteDialogChange}>
      {pageContent}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to pod</DialogTitle>
          <DialogDescription>
            Send an invitation link. They&apos;ll sign in with Clerk and
            confirm before joining.
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

function DirectoryTable({
  people,
  readOnly,
}: {
  people: Array<{
    _id: string
    name: string
    email: string | null
    role: "podLeader" | "fellow" | "mentor"
    calendlyUrl: string | null
    joined: boolean
    pendingInvite: boolean
  }>
  readOnly: boolean
}) {
  return (
    <section className="flex w-full flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">People</h2>
        {!readOnly ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Members who haven&apos;t accepted yet show as pending.
          </p>
        ) : null}
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-border/70">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[18%]">Name</TableHead>
              <TableHead className="w-[12%]">Role</TableHead>
              <TableHead className="w-[22%]">Email</TableHead>
              <TableHead className="w-[36%]">Scheduling</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person._id}>
                <TableCell className="font-medium">{person.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {roleBadgeLabel(person.role)}
                  </Badge>
                </TableCell>
                <TableCell>{person.email ?? "—"}</TableCell>
                <TableCell className="max-w-0 text-muted-foreground">
                  {person.calendlyUrl ? (
                    <a
                      href={person.calendlyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-foreground underline-offset-4 hover:underline"
                    >
                      {person.calendlyUrl}
                    </a>
                  ) : person.role === "podLeader" ? (
                    "—"
                  ) : (
                    "Not set"
                  )}
                </TableCell>
                <TableCell>
                  {person.joined ? (
                    <span className="text-muted-foreground">Joined</span>
                  ) : person.pendingInvite ? (
                    <Badge variant="outline">Invite pending</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No people in this pod yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
