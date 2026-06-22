"use client"

import {
  ArrowDownAZIcon,
  ClockIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  Maximize2Icon,
  Minimize2Icon,
  NotebookPenIcon,
  PlayIcon,
  RotateCcwIcon,
  ShuffleIcon,
  SparklesIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/app/empty-state"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { UmbrellaAdminActivityNotice } from "@/components/app/umbrella-admin-activity-notice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  type FellowNote,
  NOTE_KIND_LABEL,
  type ParsedNotes,
  parseLmsNotesJson,
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

  const presentRef = useRef<HTMLDivElement | null>(null)

  const notes = parsed?.notes ?? []
  const currentNote = parsed ? notes[order[position]] : undefined

  const handleLoad = useCallback(() => {
    const result = parseLmsNotesJson(rawInput)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    setParsed(result.data)
    setOrder(result.data.notes.map((_, index) => index))
    setPosition(0)
  }, [rawInput])

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
          description="Paste a retro or standup export and present it during the meeting."
        />
        <PageBody>
          <Card className="mx-auto w-full max-w-3xl">
            <CardContent className="flex flex-col gap-4 py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <NotebookPenIcon className="size-4" />
                Paste the JSON export from the LMS report below.
              </div>
              <Textarea
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                placeholder='[[{ "userfullname": "…", "date": "…", … }]]'
                className="min-h-64 font-mono text-xs"
                spellCheck={false}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setRawInput("")}
                  disabled={rawInput.length === 0}
                >
                  Clear
                </Button>
                <Button size="lg" onClick={handleLoad}>
                  <PlayIcon data-icon="inline-start" />
                  Load notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageBody>
      </>
    )
  }

  const total = order.length
  const highlightSections =
    currentNote?.sections.filter(
      (section) => !section.isEmpty && section.isHighlight,
    ) ?? []

  const board = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-4",
        presenting ? "p-6" : "",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <SparklesIcon />
            {NOTE_KIND_LABEL[parsed.kind]}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {position + 1} / {total}
          </span>
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

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden min-h-0 flex-col overflow-auto rounded-xl border border-border/70 bg-card/40 p-2 lg:flex">
          <p className="px-2 py-1.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Running order
          </p>
          <ul className="flex flex-col gap-0.5">
            {order.map((noteIndex, queueIndex) => {
              const note = notes[noteIndex]
              const isCurrent = queueIndex === position
              return (
                <li key={`${noteIndex}-${note.email || note.name}`}>
                  <button
                    type="button"
                    onClick={() => setPosition(queueIndex)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      isCurrent
                        ? "bg-primary/10 font-medium text-foreground"
                        : queueIndex < position
                          ? "text-muted-foreground hover:bg-muted"
                          : "hover:bg-muted",
                    )}
                  >
                    <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                      {queueIndex + 1}
                    </span>
                    <span className="truncate">{note.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {currentNote ? (
          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-h-0 flex-col overflow-auto rounded-xl border border-border/70 bg-card/30 p-6">
              <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
                <h2
                  className={cn(
                    "font-heading font-semibold tracking-tight text-balance",
                    presenting ? "text-4xl" : "text-3xl",
                  )}
                >
                  {currentNote.name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {currentNote.submittedAtLabel ? (
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {currentNote.submittedAtLabel}
                    </span>
                  ) : null}
                  {showEmail && currentNote.email ? (
                    <span className="inline-flex items-center gap-1">
                      <MailIcon className="size-3.5" />
                      {currentNote.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-5 pt-5">
                {currentNote.sections.map((section) => {
                  if (section.isEmpty && !showEmpty) return null
                  return (
                    <div key={section.key} className="flex flex-col gap-1.5">
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
                            "whitespace-pre-line leading-relaxed text-foreground",
                            presenting ? "text-lg" : "text-base",
                          )}
                        >
                          {section.content}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <aside className="hidden min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-primary/30 bg-primary/5 p-4 xl:flex">
              <p className="text-[0.7rem] font-medium tracking-wide text-primary uppercase">
                Talk about
              </p>
              {highlightSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No highlighted items this round.
                </p>
              ) : (
                highlightSections.map((section) => (
                  <div key={section.key} className="flex flex-col gap-1">
                    <h4 className="text-xs font-semibold text-foreground">
                      {section.label}
                    </h4>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {section.content}
                    </p>
                  </div>
                ))
              )}
            </aside>
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
