"use client"

import { SignOutButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function NotInvitedScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You haven&apos;t been invited yet</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <SignOutButton>
            <Button variant="outline">Sign out</Button>
          </SignOutButton>
        </CardFooter>
      </Card>
    </div>
  )
}
