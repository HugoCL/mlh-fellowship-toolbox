"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatWeekDateRange } from "@/lib/dates"

export type PublicMentorScheduleRound = {
  _id: string
  targetWeekLabel: string
  targetWeekStart: number
  roundNumber: number
}

export type PublicMentorScheduleAssignment = {
  _id: string
  fellowName: string
  mentorName: string
  mentorCalendlyUrl: string | null
  roundId: string
}

export function PublicMentorSchedule({
  rounds,
  assignments,
}: {
  rounds: Array<PublicMentorScheduleRound>
  assignments: Array<PublicMentorScheduleAssignment>
}) {
  const roundMap = new Map(rounds.map((round) => [round._id, round]))

  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No mentor meetings yet"
        description="Mentor assignments have not been published for this pod."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mentor meeting schedule</CardTitle>
        <CardDescription>
          Fellow mentor pairings by program round.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-auto border-t border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Round</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Fellow</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Scheduling link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const round = roundMap.get(assignment.roundId)
                return (
                  <TableRow key={assignment._id}>
                    <TableCell className="font-medium">
                      {round?.targetWeekLabel ?? "Program round"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {round ? formatWeekDateRange(round.targetWeekStart) : "—"}
                    </TableCell>
                    <TableCell>{assignment.fellowName}</TableCell>
                    <TableCell>{assignment.mentorName}</TableCell>
                    <TableCell>
                      {assignment.mentorCalendlyUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={
                            <Link
                              href={assignment.mentorCalendlyUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open scheduling link for ${assignment.mentorName}`}
                            />
                          }
                        >
                          Open scheduling link
                          <ExternalLink aria-hidden="true" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
