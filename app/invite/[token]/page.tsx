"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"
import { AUTH_ROUTES } from "@/components/auth/auth-routes"
import { AuthScreenShell } from "@/components/auth/auth-screen-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"

function roleLabel(role: "podLeader" | "fellow" | "mentor"): string {
  switch (role) {
    case "podLeader":
      return "Pod Leader"
    case "fellow":
      return "Fellow"
    case "mentor":
      return "Mentor"
  }
}

function InviteLoadingState() {
  return (
    <AuthScreenShell
      title="Review your invitation"
      description="Confirm the cohort details before joining."
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </AuthScreenShell>
  )
}

function InviteCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <AuthScreenShell
      title="Review your invitation"
      description="Confirm the cohort details before joining."
    >
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children}
      </Card>
    </AuthScreenShell>
  )
}

export default function InviteConfirmationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const invite = useQuery(api.invites.getInviteByToken, { token })
  const acceptInvite = useMutation(api.invites.acceptInviteByToken)
  const [isAccepting, setIsAccepting] = useState(false)

  if (invite === undefined) {
    return <InviteLoadingState />
  }

  if (!invite) {
    return (
      <InviteCard
        title="Invitation not found"
        description="This link may be invalid or expired. Ask your pod leader to send a new invitation."
      >
        <CardFooter className="px-0 pb-0">
          <Button
            render={<Link href={AUTH_ROUTES.dashboard} />}
            nativeButton={false}
          >
            Go to dashboard
          </Button>
        </CardFooter>
      </InviteCard>
    )
  }

  if (invite.status !== "pending") {
    return (
      <InviteCard
        title="Invitation already used"
        description="This invitation has already been accepted or revoked."
      >
        <CardFooter className="px-0 pb-0">
          <Button
            render={<Link href={AUTH_ROUTES.dashboard} />}
            nativeButton={false}
          >
            Go to dashboard
          </Button>
        </CardFooter>
      </InviteCard>
    )
  }

  const cohortLabel =
    invite.podProgramCode ?? invite.cohort.programCode ?? invite.cohort.name
  const requiresEmailMatch =
    invite.role === "fellow" || invite.role === "podLeader"
  const canAccept =
    Boolean(invite.userEmail) &&
    (!requiresEmailMatch || invite.emailMatchesUser)

  return (
    <InviteCard
      title="Accept invitation"
      description={`You've been invited to join ${cohortLabel} as a ${roleLabel(invite.role).toLowerCase()}.`}
    >
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Invited email:</span>{" "}
            <span className="font-medium">{invite.email}</span>
          </p>
          {invite.userEmail ? (
            <p className="mt-2">
              <span className="text-muted-foreground">Signed in as:</span>{" "}
              <span className="font-medium">{invite.userEmail}</span>
            </p>
          ) : null}
        </div>

        {requiresEmailMatch && !invite.emailMatchesUser && invite.userEmail ? (
          <Alert>
            <AlertDescription>
              This invitation was sent to{" "}
              <span className="font-medium">{invite.email}</span>. Sign out and
              sign in with that email to accept.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 px-0 pb-0">
        <Button
          disabled={!canAccept || isAccepting}
          onClick={async () => {
            setIsAccepting(true)
            try {
              const result = await acceptInvite({ token })
              toast.success("Invitation accepted.")
              router.push(result.redirectPath)
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to accept invitation.",
              )
            } finally {
              setIsAccepting(false)
            }
          }}
        >
          {isAccepting ? "Accepting…" : "Accept invitation"}
        </Button>
        <Button
          variant="outline"
          render={<Link href={AUTH_ROUTES.dashboard} />}
          nativeButton={false}
        >
          Cancel
        </Button>
      </CardFooter>
    </InviteCard>
  )
}
