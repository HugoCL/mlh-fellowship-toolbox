"use client"

import Link from "next/link"
import { SectionHeader } from "@/components/app/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cohortPath } from "@/lib/cohort-routes"

type PodDirectoryCardProps = {
  programCode: string
}

export function PodDirectoryCard({ programCode }: PodDirectoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Directory"
          description="Invite fellows and mentors from the Directory. Mentor meeting rounds and assignments are managed on the Mentor Meetings page."
        />
      </CardHeader>
      <CardContent>
        <Button
          render={<Link href={cohortPath(programCode, "directory")} />}
          nativeButton={false}
          className="self-start"
        >
          Open Directory
        </Button>
      </CardContent>
    </Card>
  )
}
