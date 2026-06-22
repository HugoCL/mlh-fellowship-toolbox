"use client"

import { EmptyState } from "@/components/app/empty-state"
import { SkeletonTable } from "@/components/app/page-skeleton"
import { SectionHeader } from "@/components/app/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Doc, Id } from "@/convex/_generated/dataModel"

type PodGroup = {
  cohort: Doc<"cohorts">
  leader: { name: string; email: string } | null
  pendingLeaderEmail: string | null
  fellowCount: number
}

type CohortPodsSectionProps = {
  programCode: string
  groups: PodGroup[] | undefined
  isCreatingPod: boolean
  onCreatePod: () => void
  onEditPod: (pod: Doc<"cohorts">) => void
  onInviteLeader: (podId: Id<"cohorts">) => void
}

export function CohortPodsSection({
  programCode,
  groups,
  isCreatingPod,
  onCreatePod,
  onEditPod,
  onInviteLeader,
}: CohortPodsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="Pods in this cohort"
          description={`Create pods, edit each pod's name and dates, then invite a pod leader (e.g. ${programCode}.1, ${programCode}.2). Fellows, mentors, and program activities live at the pod level.`}
          actions={
            <Button disabled={isCreatingPod} onClick={onCreatePod}>
              {isCreatingPod ? "Creating…" : "Add pod"}
            </Button>
          }
        />
      </CardHeader>
      <CardContent className="px-0">
        {groups === undefined ? (
          <div className="border-t border-border px-(--card-spacing) pt-4">
            <SkeletonTable rows={3} columns={5} />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            title="No pods yet"
            description='Click "Add pod" to create one, then invite a pod leader.'
            className="border-t border-border"
          />
        ) : (
          <div className="overflow-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Program code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Pod leader</TableHead>
                  <TableHead>Fellows</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.cohort._id}>
                    <TableCell className="font-medium">
                      {group.cohort.programCode}
                    </TableCell>
                    <TableCell>{group.cohort.name}</TableCell>
                    <TableCell>
                      {group.leader ? (
                        `${group.leader.name} (${group.leader.email})`
                      ) : group.pendingLeaderEmail ? (
                        <span className="text-muted-foreground">
                          Invite pending · {group.pendingLeaderEmail}
                        </span>
                      ) : (
                        <Badge variant="outline">No pod leader assigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{group.fellowCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditPod(group.cohort)}
                        >
                          Edit
                        </Button>
                        {!group.leader && !group.pendingLeaderEmail ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onInviteLeader(group.cohort._id)}
                          >
                            Invite leader
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
