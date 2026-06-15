"use client"

import { useMutation, useQuery } from "convex/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
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

export default function InviteConfirmationPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const invite = useQuery(api.invites.getInviteByToken, { token })
  const acceptInvite = useMutation(api.invites.acceptInviteByToken)
  const [isAccepting, setIsAccepting] = useState(false)

  if (invite === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading invitation…</p>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              This link may be invalid or expired. Ask your pod leader to send a
              new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<Link href="/dashboard" />} nativeButton={false}>
              Go to dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (invite.status !== "pending") {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation already used</CardTitle>
            <CardDescription>
              This invitation has already been accepted or revoked.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<Link href="/dashboard" />} nativeButton={false}>
              Go to dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const cohortLabel =
    invite.podProgramCode ?? invite.cohort.programCode ?? invite.cohort.name

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <span className="font-medium text-foreground">{cohortLabel}</span>{" "}
            as a {roleLabel(invite.role).toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-border/70 p-3 text-sm">
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

          {!invite.emailMatchesUser && invite.userEmail ? (
            <Alert>
              <AlertDescription>
                This invitation was sent to{" "}
                <span className="font-medium">{invite.email}</span>. Sign out
                and sign in with that email to accept.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            disabled={!invite.emailMatchesUser || isAccepting}
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
            render={<Link href="/dashboard" />}
            nativeButton={false}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
