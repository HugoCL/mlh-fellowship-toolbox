"use client"

import { useMutation, useQuery } from "convex/react"
import {
  CalendarCheckIcon,
  ClipboardPasteIcon,
  FileSpreadsheetIcon,
  PlayIcon,
  RotateCcwIcon,
  UploadIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import {
  ATTENDANCE_REQUIREMENT_PERCENT,
  getAttendanceSummary,
  type ParsedAttendanceReport,
  parseLmsAttendanceReportCsv,
  parseLmsAttendanceReportUpload,
  sortAttendanceFellows,
} from "@/lib/lms-attendance-report"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { cn } from "@/lib/utils"

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function AttendanceReportPage() {
  const {
    cohortId,
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const { isImpersonating } = useIsImpersonating()

  const isLeader =
    !isImpersonating &&
    cohort?.role === "podLeader" &&
    (cohort.canManagePod || cohort.isUmbrellaViewer)
  const canView = isLeader || cohort?.role === "fellow"

  const savedReport = useQuery(
    api.attendanceReports.getAttendanceReport,
    cohortId && canView ? { cohortId } : "skip",
  )
  const saveAttendanceReport = useMutation(
    api.attendanceReports.saveAttendanceReport,
  )

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  const [rawInput, setRawInput] = useState("")
  const [parsed, setParsed] = useState<ParsedAttendanceReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const savedReportData: ParsedAttendanceReport | null = savedReport
    ? {
        fellows: savedReport.fellows,
        sessionNames: savedReport.sessions,
        sessionCount: savedReport.sessions.length,
        sourceRowCount: savedReport.sourceRowCount,
      }
    : null
  const report = parsed ?? savedReportData

  const applyParseResult = useCallback(
    (result: ReturnType<typeof parseLmsAttendanceReportCsv>) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setParsed(result.data)
      setShowImporter(false)
    },
    [],
  )

  const handleLoad = useCallback(() => {
    applyParseResult(parseLmsAttendanceReportCsv(rawInput))
  }, [applyParseResult, rawInput])

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text()
        setRawInput(content)
        setUploadName(file.name)
        applyParseResult(
          parseLmsAttendanceReportUpload({ fileName: file.name, content }),
        )
      } catch {
        setError("Couldn't read that file. Try downloading the export again.")
      }
    },
    [applyParseResult],
  )

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      void handleFile(file)
      event.target.value = ""
    },
    [handleFile],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      setIsDraggingFile(false)
      const file = event.dataTransfer.files?.[0]
      if (!file) return
      void handleFile(file)
    },
    [handleFile],
  )

  const handleClearInput = useCallback(() => {
    setRawInput("")
    setUploadName(null)
    setError(null)
  }, [])

  const handleUnload = useCallback(() => {
    setParsed(null)
    setShowImporter(true)
    setRawInput("")
    setUploadName(null)
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!report || !cohortId) return
    setIsSaving(true)
    try {
      await saveAttendanceReport({
        cohortId,
        sessions: report.sessionNames,
        fellows: report.fellows,
        sourceRowCount: report.sourceRowCount,
      })
      toast.success("Attendance report saved for fellows.")
      setParsed(null)
      setShowImporter(false)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save the attendance report.",
      )
    } finally {
      setIsSaving(false)
    }
  }, [cohortId, report, saveAttendanceReport])

  if (isLoading || cohort === undefined) {
    return (
      <>
        <PageHeader title="Attendance Report" description="Loading…" />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (isUmbrellaAdminBlocked) {
    return (
      <>
        <PageHeader
          title="Attendance Report"
          description="Review attendance days and the 90% requirement."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  if (!canView) {
    return (
      <>
        <PageHeader
          title="Attendance Report"
          description="Attendance Report is available to fellows and pod leaders."
        />
        <PageBody>
          <EmptyState
            title="No access"
            description="Attendance Report is available to fellows and pod leaders."
          />
        </PageBody>
      </>
    )
  }

  if (savedReport === undefined) {
    return (
      <>
        <PageHeader title="Attendance Report" description="Loading…" />
        <PageBody>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageBody>
      </>
    )
  }

  if (!isLeader && savedReport === null) {
    return (
      <>
        <PageHeader
          title="Attendance Report"
          description="Your attendance against the 90% requirement."
        />
        <PageBody>
          <EmptyState
            title="No attendance report yet"
            description="Your pod leader has not saved an LMS attendance report yet."
          />
        </PageBody>
      </>
    )
  }

  if (isLeader && (showImporter || !report)) {
    return (
      <>
        <PageHeader
          title="Attendance Report"
          description="Import the latest LMS report so fellows can see their attendance."
        />
        <PageBody>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon data-icon="inline-start" />
                    Import attendance report
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setIsDraggingFile(true)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setIsDraggingFile(true)
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault()
                      setIsDraggingFile(false)
                    }}
                    onDrop={handleDrop}
                    className={cn(
                      "group flex min-h-80 cursor-pointer flex-col justify-between rounded-lg border border-dashed p-5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                      isDraggingFile
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex size-11 items-center justify-center rounded-md bg-background text-foreground ring-1 ring-border/70">
                          <FileSpreadsheetIcon />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-heading text-xl font-semibold tracking-tight">
                            Drop a CSV export
                          </p>
                          <p className="max-w-sm text-sm text-muted-foreground">
                            Use the LMS Attendance report for the selected pod.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">.csv</Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {uploadName ?? "No file selected"}
                      </span>
                      <span className="inline-flex h-7 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium">
                        Choose file
                      </span>
                    </div>
                  </button>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardPasteIcon data-icon="inline-start" />
                    Paste report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="attendance-report-csv">
                        LMS attendance export
                      </FieldLabel>
                      <FieldDescription>
                        Dated session columns are counted; unmarked days are
                        ignored.
                      </FieldDescription>
                      <Textarea
                        id="attendance-report-csv"
                        value={rawInput}
                        onChange={(event) => {
                          setRawInput(event.target.value)
                          setUploadName(null)
                        }}
                        placeholder="First name / Last name,Email address,Jun 15,..."
                        className="min-h-72 font-mono text-xs"
                        spellCheck={false}
                        aria-invalid={Boolean(error)}
                      />
                      <FieldError>{error}</FieldError>
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheckIcon />
                Excused absences are removed from the 90% denominator.
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleClearInput}
                  disabled={rawInput.length === 0 && !uploadName && !error}
                >
                  Clear
                </Button>
                <Button
                  size="lg"
                  onClick={handleLoad}
                  disabled={rawInput.trim().length === 0}
                >
                  <PlayIcon data-icon="inline-start" />
                  Load report
                </Button>
              </div>
            </div>
          </div>
        </PageBody>
      </>
    )
  }

  if (!report) {
    return null
  }

  const fellows = sortAttendanceFellows(report.fellows)
  const belowRequirement = fellows.filter(
    (fellow) => !getAttendanceSummary(fellow).meetsRequirement,
  ).length

  return (
    <>
      <PageHeader
        title="Attendance Report"
        description={
          isLeader
            ? `${fellows.length} fellows · ${report.sessionCount} LMS days counted`
            : "Your attendance against the 90% requirement."
        }
      />
      <PageBody>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <CalendarCheckIcon />
                {report.sessionCount} LMS days counted
              </Badge>
              <Badge variant="outline">
                {ATTENDANCE_REQUIREMENT_PERCENT}% required
              </Badge>
              {isLeader ? (
                <Badge
                  variant={belowRequirement > 0 ? "destructive" : "secondary"}
                >
                  {belowRequirement} below requirement
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {isLeader && parsed ? (
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <UploadIcon data-icon="inline-start" />
                  {isSaving ? "Saving…" : "Save for fellows"}
                </Button>
              ) : null}
              {isLeader ? (
                <Button variant="ghost" size="sm" onClick={handleUnload}>
                  <RotateCcwIcon data-icon="inline-start" />
                  {parsed ? "Load another report" : "Import updated report"}
                </Button>
              ) : null}
            </div>
          </div>

          <Card className="border-border/70 bg-card/80">
            <CardHeader>
              <CardTitle>
                {isLeader ? "Fellow attendance" : "Your attendance"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fellow</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Eligible days</TableHead>
                      <TableHead>Absences</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fellows.map((fellow) => {
                      const summary = getAttendanceSummary(fellow)
                      return (
                        <TableRow key={`${fellow.email}-${fellow.name}`}>
                          <TableCell className="align-top font-medium">
                            {fellow.name}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant={
                                  summary.meetsRequirement
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {formatPercentage(summary.percentage)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {summary.attendedSessionCount}/
                                {summary.eligibleSessionCount} attended
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top tabular-nums">
                            <span className="text-sm">
                              {summary.eligibleSessionCount}
                            </span>
                            {fellow.excusedCount > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {fellow.excusedCount} excused excluded
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="min-w-64 align-top">
                            {fellow.absenceDates.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">
                                  {fellow.absenceDates.join(", ")}
                                </span>
                                {fellow.excusedDates.length > 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    Excused: {fellow.excusedDates.join(", ")}
                                  </span>
                                ) : null}
                              </div>
                            ) : fellow.excusedDates.length > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                Excused: {fellow.excusedDates.join(", ")}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                None
                              </span>
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

          <div className="flex items-center gap-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
            <FileSpreadsheetIcon />
            Present and Late count as attended. Excused days are excluded;
            unmarked LMS days are not counted.
          </div>
        </div>
      </PageBody>
    </>
  )
}
