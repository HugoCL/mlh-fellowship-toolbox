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
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.97_0.01_90),_transparent_55%),linear-gradient(180deg,oklch(0.985_0.002_90),oklch(0.97_0.004_80))] p-6">
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
