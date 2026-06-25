"use client"

import {
  ArrowDownAZIcon,
  ClipboardPasteIcon,
  ClockIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FileJsonIcon,
  MailIcon,
  Maximize2Icon,
  Minimize2Icon,
  NotebookPenIcon,
  PlayIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
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
import { Textarea } from "@/components/ui/textarea"
import {
  type FellowNote,
  NOTE_KIND_LABEL,
  type ParsedNotes,
  parseLmsNotesJson,
  parseLmsNotesUpload,
  shuffleNotes,
  sortNotesByName,
  sortNotesBySubmission,
} from "@/lib/lms-notes-viewer"
import { useCohortRoute } from "@/lib/use-cohort-route"
import { useIsImpersonating } from "@/lib/use-impersonation"
import { cn } from "@/lib/utils"

function buildCopyText(note: FellowNote): string {
  const lines = [note.name]
  if (note.submittedAtLabel) {
    lines.push(`Submitted ${note.submittedAtLabel}`)
  }
  lines.push("")
  for (const section of note.sections) {
    if (section.isEmpty) continue
    lines.push(`${section.label}:`)
    lines.push(section.content)
    lines.push("")
  }
  return lines.join("\n").trim()
}

export default function NotesViewerPage() {
  const {
    cohortData: cohort,
    settingsProgramCode,
    isLoading,
  } = useCohortRoute()
  const { isImpersonating } = useIsImpersonating()

  const canAccess =
    !isImpersonating &&
    cohort?.role === "podLeader" &&
    (cohort.canManagePod || cohort.isUmbrellaViewer)

  const isUmbrellaAdminBlocked =
    cohort?.role === "podLeader" &&
    !cohort.canManagePod &&
    cohort.hasChildPods &&
    !cohort.isUmbrellaViewer

  const [rawInput, setRawInput] = useState("")
  const [parsed, setParsed] = useState<ParsedNotes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [position, setPosition] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const presentRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const notes = parsed?.notes ?? []
  const currentNote = parsed ? notes[order[position]] : undefined

  const applyParseResult = useCallback(
    (result: ReturnType<typeof parseLmsNotesJson>) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setParsed(result.data)
      setOrder(result.data.notes.map((_, index) => index))
      setPosition(0)
    },
    [],
  )

  const handleLoad = useCallback(() => {
    applyParseResult(parseLmsNotesJson(rawInput))
  }, [applyParseResult, rawInput])

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const content = await file.text()
        setRawInput(content)
        setUploadName(file.name)
        applyParseResult(parseLmsNotesUpload({ fileName: file.name, content }))
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

  const reorder = useCallback((next: number[]) => {
    setOrder(next)
    setPosition(0)
  }, [])

  const handleShuffle = useCallback(() => {
    setOrder((prev) => shuffleNotes(prev, Math.floor(Math.random() * 2 ** 31)))
    setPosition(0)
  }, [])

  const handleSortByName = useCallback(() => {
    if (!parsed) return
    const indices = parsed.notes.map((_, index) => index)
    reorder(
      sortNotesByName(
        indices.map((index) => ({ index, name: parsed.notes[index].name })),
      ).map((entry) => entry.index),
    )
  }, [parsed, reorder])

  const handleSortBySubmission = useCallback(() => {
    if (!parsed) return
    const indices = parsed.notes.map((_, index) => index)
    reorder(
      sortNotesBySubmission(
        indices.map((index) => ({
          index,
          name: parsed.notes[index].name,
          submittedAt: parsed.notes[index].submittedAt,
        })),
      ).map((entry) => entry.index),
    )
  }, [parsed, reorder])

  const handleReset = useCallback(() => {
    if (!parsed) return
    reorder(parsed.notes.map((_, index) => index))
  }, [parsed, reorder])

  const goNext = useCallback(() => {
    setPosition((prev) => Math.min(prev + 1, Math.max(order.length - 1, 0)))
  }, [order.length])

  const goPrev = useCallback(() => {
    setPosition((prev) => Math.max(prev - 1, 0))
  }, [])

  const togglePresenting = useCallback(() => {
    setPresenting((prev) => {
      const next = !prev
      if (next) {
        presentRef.current?.requestFullscreen?.().catch(() => {})
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      return next
    })
  }, [])

  const handleCopy = useCallback(async () => {
    if (!currentNote) return
    try {
      await navigator.clipboard.writeText(buildCopyText(currentNote))
      toast.success("Copied notes to clipboard.")
    } catch {
      toast.error("Couldn't copy to clipboard.")
    }
  }, [currentNote])

  const handleUnload = useCallback(() => {
    setParsed(null)
    setError(null)
    setPresenting(false)
    setPosition(0)
    setOrder([])
  }, [])

  useEffect(() => {
    if (!parsed) return
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
      ) {
        return
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        goNext()
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        goPrev()
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault()
        handleShuffle()
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault()
        togglePresenting()
      } else if (event.key === "Escape" && presenting) {
        setPresenting(false)
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [parsed, presenting, goNext, goPrev, handleShuffle, togglePresenting])

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        setPresenting(false)
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  if (isLoading || cohort === undefined) {
    return (
      <>
        <PageHeader title="Notes Viewer" description="Loading…" />
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
          title="Notes Viewer"
          description="Present retro and standup notes during meetings."
        />
        <PageBody>
          <UmbrellaAdminActivityNotice
            settingsProgramCode={settingsProgramCode ?? ""}
          />
        </PageBody>
      </>
    )
  }

  if (!canAccess) {
    return (
      <>
        <PageHeader
          title="Notes Viewer"
          description="Pod leader access required."
        />
        <PageBody>
          <EmptyState
            title="Pod leaders only"
            description="Notes Viewer is for pod leaders to present retro and standup submissions during meetings."
          />
        </PageBody>
      </>
    )
  }

  if (!parsed) {
    return (
      <>
        <PageHeader
          title="Notes Viewer"
          description="Drop an LMS export or paste JSON."
        />
        <PageBody>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Card className="border-border/70 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon data-icon="inline-start" />
                    Import notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt,application/json,text/plain"
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
                          <FileJsonIcon />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-heading text-xl font-semibold tracking-tight">
                            Drop a JSON export
                          </p>
                          <p className="max-w-sm text-sm text-muted-foreground">
                            The file loads locally in your browser and is ready
                            to present as soon as it parses.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">.json</Badge>
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
                    Paste JSON
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor="notes-json">
                        LMS export content
                      </FieldLabel>
                      <FieldDescription>
                        Use this when copying directly from the report export.
                      </FieldDescription>
                      <Textarea
                        id="notes-json"
                        value={rawInput}
                        onChange={(event) => {
                          setRawInput(event.target.value)
                          setUploadName(null)
                        }}
                        placeholder='[[{ "userfullname": "...", "date": "...", ... }]]'
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
                <NotebookPenIcon />
                Notes stay on this page only.
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
                  Load notes
                </Button>
              </div>
            </div>
          </div>
        </PageBody>
      </>
    )
  }

  const total = order.length

  const board = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-4",
        presenting ? "p-6" : "",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <SparklesIcon />
              {NOTE_KIND_LABEL[parsed.kind]}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {position + 1} of {total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${((position + 1) / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={position === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={position >= total - 1}
          >
            Next
          </Button>
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            <ShuffleIcon data-icon="inline-start" />
            Shuffle
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSortByName}>
            <ArrowDownAZIcon data-icon="inline-start" />
            Name
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSortBySubmission}>
            <ClockIcon data-icon="inline-start" />
            Time
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            title="Copy notes"
          >
            <CopyIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowEmail((prev) => !prev)}
            title={showEmail ? "Hide emails" : "Show emails"}
          >
            {showEmail ? <MailIcon /> : <MailIcon className="opacity-40" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowEmpty((prev) => !prev)}
            title={showEmpty ? "Hide empty fields" : "Show empty fields"}
          >
            {showEmpty ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
          <Button variant="outline" size="sm" onClick={togglePresenting}>
            {presenting ? (
              <Minimize2Icon data-icon="inline-start" />
            ) : (
              <Maximize2Icon data-icon="inline-start" />
            )}
            {presenting ? "Exit" : "Present"}
          </Button>
          {!presenting ? (
            <Button variant="ghost" size="sm" onClick={handleUnload}>
              Load other notes
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col overflow-auto border-r border-border/70 pr-4 lg:flex">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background/95 py-2 backdrop-blur-sm">
            <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
              Running order
            </p>
            <Badge variant="outline">{total}</Badge>
          </div>
          <ul className="flex flex-col gap-1">
            {order.map((noteIndex, queueIndex) => {
              const note = notes[noteIndex]
              const isCurrent = queueIndex === position
              const isPast = queueIndex < position
              return (
                <li key={`${noteIndex}-${note.email || note.name}`}>
                  <button
                    type="button"
                    onClick={() => setPosition(queueIndex)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                      isCurrent
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums ring-1 ring-border/70",
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-primary"
                          : isPast
                            ? "bg-muted text-muted-foreground"
                            : "bg-background text-muted-foreground",
                      )}
                    >
                      {queueIndex + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {note.name}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {currentNote ? (
          <div className="flex min-h-0 flex-col overflow-auto rounded-lg bg-card/50 ring-1 ring-border/70">
            <div className="flex flex-col gap-4 border-b border-border/70 p-5 lg:p-7">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Current submission
                  </span>
                  <h2
                    className={cn(
                      "font-heading font-semibold tracking-tight text-balance",
                      presenting ? "text-5xl" : "text-4xl",
                    )}
                  >
                    {currentNote.name}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {currentNote.submittedAtLabel ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                      <ClockIcon />
                      {currentNote.submittedAtLabel}
                    </span>
                  ) : null}
                  {showEmail && currentNote.email ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                      <MailIcon />
                      {currentNote.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-0 divide-y divide-border/70 p-5 lg:p-7">
              {currentNote.sections.map((section) => {
                if (section.isEmpty && !showEmpty) return null
                return (
                  <section
                    key={section.key}
                    className="grid gap-3 py-5 first:pt-0 last:pb-0 lg:grid-cols-[13rem_minmax(0,1fr)]"
                  >
                    <h3
                      className={cn(
                        "text-xs font-semibold tracking-wide uppercase",
                        section.isHighlight
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {section.label}
                    </h3>
                    {section.isEmpty ? (
                      <p className="text-sm text-muted-foreground/60 italic">
                        No response
                      </p>
                    ) : (
                      <p
                        className={cn(
                          "whitespace-pre-line text-pretty leading-relaxed text-foreground",
                          presenting ? "text-xl" : "text-lg",
                        )}
                      >
                        {section.content}
                      </p>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <div ref={presentRef} className={cn(presenting && "bg-background")}>
      {presenting ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {board}
        </div>
      ) : (
        <>
          <PageHeader
            title="Notes Viewer"
            description={`${NOTE_KIND_LABEL[parsed.kind]} · ${total} ${
              total === 1 ? "submission" : "submissions"
            }`}
          />
          <PageBody>{board}</PageBody>
        </>
      )}
    </div>
  )
}
