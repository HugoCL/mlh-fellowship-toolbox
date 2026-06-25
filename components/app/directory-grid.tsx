"use client"

import { CalendarIcon, HashIcon, MailIcon, PencilIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDiscordUsername } from "@/lib/discord-username"

export type DirectoryPerson = {
  _id: string
  name: string
  email: string | null
  role: "podLeader" | "fellow" | "mentor"
  calendlyUrl: string | null
  discordUsername: string | null
  imageUrl?: string | null
  joined?: boolean
  pendingInvite?: boolean
}

export function roleBadgeLabel(role: DirectoryPerson["role"]): string {
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

export function DirectoryGrid({
  people,
  canManageMentors = false,
  showMemberStatus = true,
  onEditMentor,
}: {
  people: Array<DirectoryPerson>
  canManageMentors?: boolean
  showMemberStatus?: boolean
  onEditMentor?: (person: DirectoryPerson) => void
}) {
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
            <DirectoryCard
              key={person._id}
              person={person}
              canManageMentors={canManageMentors}
              showMemberStatus={showMemberStatus}
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
  showMemberStatus,
  onEditMentor,
}: {
  person: DirectoryPerson
  canManageMentors: boolean
  showMemberStatus: boolean
  onEditMentor?: (person: DirectoryPerson) => void
}) {
  const showEditMentor =
    canManageMentors && person.role === "mentor" && onEditMentor

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
            {showMemberStatus ? (
              person.pendingInvite ? (
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
              ) : null
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
