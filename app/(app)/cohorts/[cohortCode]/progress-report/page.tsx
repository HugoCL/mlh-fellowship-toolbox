"use client"

import { useMutation, useQuery } from "convex/react"
import {
  ArrowDownAZIcon,
  ClipboardPasteIcon,
  FileSpreadsheetIcon,
  ListChecksIcon,
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
import { Checkbox } from "@/components/ui/checkbox"
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
  filterProgressFellowsByTasks,
  type ParsedProgressReport,
  parseLmsProgressReportCsv,
  parseLmsProgressReportUpload,
  sortProgressFellows,
} from "@/lib/lms-progress-report"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { cn } from "@/lib/utils"

type SortMode = "name" | "pending"

export default function ProgressReportPage() {
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
  const canView = !isImpersonating && (isLeader || cohort?.role === "fellow")

  const savedReport = useQuery(
    api.progressReports.getProgressReport,
    cohortId && canView ? { cohortId } : "skip",
  )
  const saveProgressReport = useMutation(api.progressReports.saveProgressReport)

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  const [rawInput, setRawInput] = useState("")
  const [parsed, setParsed] = useState<ParsedProgressReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("pending")
  const [excludedTasks, setExcludedTasks] = useState<Set<string>>(new Set())
  const [showImporter, setShowImporter] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const savedReportData: ParsedProgressReport | null = savedReport
    ? {
        fellows: savedReport.fellows,
        taskNames: savedReport.taskNames,
        taskCount: savedReport.taskNames.length,
        sourceRowCount: savedReport.sourceRowCount,
      }
    : null
  const report = parsed ?? savedReportData

  const applyParseResult = useCallback(
    (result: ReturnType<typeof parseLmsProgressReportCsv>) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setParsed(result.data)
      setShowImporter(false)
      setSortMode("pending")
      setExcludedTasks(new Set())
    },
    [],
  )

  const handleLoad = useCallback(() => {
    applyParseResult(parseLmsProgressReportCsv(rawInput))
  }, [applyParseResult, rawInput])

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text()
        setRawInput(content)
        setUploadName(file.name)
        applyParseResult(
          parseLmsProgressReportUpload({ fileName: file.name, content }),
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
    setSortMode("pending")
    setExcludedTasks(new Set())
  }, [])

  const toggleExcludedTask = useCallback((task: string, excluded: boolean) => {
    setExcludedTasks((previous) => {
      const next = new Set(previous)
      if (excluded) {
        next.add(task)
      } else {
        next.delete(task)
      }
      return next
    })
  }, [])

  const clearExcludedTasks = useCallback(() => {
    setExcludedTasks(new Set())
  }, [])

  const excludeAllTasks = useCallback(() => {
    setExcludedTasks(new Set(report?.taskNames ?? []))
  }, [report])

  const handleSave = useCallback(async () => {
    if (!report || !cohortId) return
    const taskNames = report.taskNames.filter(
      (task) => !excludedTasks.has(task),
    )
    setIsSaving(true)
    try {
      await saveProgressReport({
        cohortId,
        taskNames,
        fellows: filterProgressFellowsByTasks(report.fellows, excludedTasks),
        sourceRowCount: report.sourceRowCount,
      })
      toast.success("Progress report saved for fellows.")
      setParsed(null)
      setShowImporter(false)
      setExcludedTasks(new Set())
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save the report.",
      )
    } finally {
      setIsSaving(false)
    }
  }, [cohortId, excludedTasks, report, saveProgressReport])

  if (isLoading || cohort === undefined) {
    return (
      <>
        <PageHeader title="Progress Report" description="Loading…" />
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
          title="Progress Report"
          description="Review Task modules that fellows have not submitted."
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
          title="Progress Report"
          description="Progress Report is available to fellows and pod leaders."
        />
        <PageBody>
          <EmptyState
            title="No access"
            description="Progress Report is available to fellows and pod leaders."
          />
        </PageBody>
      </>
    )
  }

  if (savedReport === undefined) {
    return (
      <>
        <PageHeader title="Progress Report" description="Loading…" />
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
          title="Progress Report"
          description="Your unsubmitted Task modules."
        />
        <PageBody>
          <EmptyState
            title="No progress report yet"
            description="Your pod leader has not saved an LMS progress report yet."
          />
        </PageBody>
      </>
    )
  }

  if (isLeader && (showImporter || !report)) {
    return (
      <>
        <PageHeader
          title="Progress Report"
          description="Import the latest LMS CSV so fellows can see their own report."
        />
        <PageBody>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon data-icon="inline-start" />
                    Import progress report
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
                            Use the LMS Activity completion report for the
                            selected pod.
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
                    Paste CSV
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="progress-report-csv">
                        Activity completion export
                      </FieldLabel>
                      <FieldDescription>
                        Only Task columns are included, and only unsubmitted
                        rows are shown.
                      </FieldDescription>
                      <Textarea
                        id="progress-report-csv"
                        value={rawInput}
                        onChange={(event) => {
                          setRawInput(event.target.value)
                          setUploadName(null)
                        }}
                        placeholder="First name / Last name,Email address,Task 1: ..."
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
                <ListChecksIcon />
                Save the report so fellows can see their own pending Task
                modules.
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

  const fellows = sortProgressFellows(
    filterProgressFellowsByTasks(report.fellows, excludedTasks),
    sortMode,
  )
  const visibleTaskCount = report.taskNames.length - excludedTasks.size
  const visiblePendingTaskCount = new Set(
    fellows.flatMap((fellow) => fellow.pendingTasks),
  ).size

  return (
    <>
      <PageHeader
        title="Progress Report"
        description={
          isLeader
            ? `${fellows.length} fellows · ${visiblePendingTaskCount} Task modules not submitted`
            : `${visiblePendingTaskCount} Task modules not submitted`
        }
      />
      <PageBody>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <ListChecksIcon />
                {visibleTaskCount} Task modules included
              </Badge>
              {isLeader ? (
                <Badge variant="outline">
                  {report.sourceRowCount} fellows in report
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={sortMode === "pending" ? "outline" : "ghost"}
                size="sm"
                onClick={() => setSortMode("pending")}
              >
                Most pending
              </Button>
              <Button
                variant={sortMode === "name" ? "outline" : "ghost"}
                size="sm"
                onClick={() => setSortMode("name")}
              >
                <ArrowDownAZIcon data-icon="inline-start" />
                Name
              </Button>
              {isLeader && (parsed !== null || excludedTasks.size > 0) ? (
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

          {isLeader ? (
            <details className="rounded-lg border border-border/70 bg-card/80">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
                <span>Exclude columns</span>
                <Badge variant="outline">{excludedTasks.size} excluded</Badge>
              </summary>
              <div className="border-t border-border/70 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Excluded Task columns are omitted when you save the report
                    for fellows.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={excludeAllTasks}
                      disabled={excludedTasks.size === report.taskNames.length}
                    >
                      Exclude all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearExcludedTasks}
                      disabled={excludedTasks.size === 0}
                    >
                      Clear exclusions
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {report.taskNames.map((task, index) => {
                    const checkboxId = `exclude-task-${index}`
                    return (
                      <div
                        key={task}
                        className="flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={excludedTasks.has(task)}
                          onCheckedChange={(checked) =>
                            toggleExcludedTask(task, checked === true)
                          }
                        />
                        <label
                          htmlFor={checkboxId}
                          className="min-w-0 cursor-pointer text-sm leading-snug text-muted-foreground"
                        >
                          {task}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </details>
          ) : null}

          {fellows.length === 0 ? (
            <EmptyState
              title={
                excludedTasks.size > 0
                  ? "No included unsubmitted Task modules"
                  : "No unsubmitted Task modules"
              }
              description={
                excludedTasks.size > 0
                  ? "Clear exclusions to restore the full report."
                  : "Every fellow in this report has completed the Task columns."
              }
            />
          ) : (
            <Card className="border-border/70 bg-card/80">
              <CardHeader>
                <CardTitle>Not submitted</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fellow</TableHead>
                        <TableHead>Task modules</TableHead>
                        <TableHead className="w-28 text-right">
                          Pending
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fellows.map((fellow) => (
                        <TableRow key={`${fellow.email}-${fellow.name}`}>
                          <TableCell className="align-top font-medium">
                            {fellow.name}
                          </TableCell>
                          <TableCell className="min-w-[24rem] align-top">
                            <ul className="flex flex-col gap-1.5">
                              {fellow.pendingTasks.map((task) => (
                                <li
                                  key={`${fellow.email}-${task}`}
                                  className="text-sm text-muted-foreground"
                                >
                                  {task}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell className="align-top text-right tabular-nums">
                            <Badge variant="outline">
                              {fellow.pendingTasks.length}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
            <FileSpreadsheetIcon />
            Only columns beginning with{" "}
            <span className="font-medium">Task:</span> are included; statuses
            other than Completed are treated as not submitted.
          </div>
        </div>
      </PageBody>
    </>
  )
}
