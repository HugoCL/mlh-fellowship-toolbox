"use client"

import Link from "next/link"
import { PageBody, PageHeader } from "@/components/app/page-frame"
import { Button } from "@/components/ui/button"

type ErrorFallbackPanelProps = {
  error: Error & { digest?: string }
  reset: () => void
  layout: "app" | "segment"
  title?: string
  description?: string
  homeHref?: string
  homeLabel?: string
}

function ErrorFallbackContent({
  error,
  reset,
  title,
  description,
  homeHref,
  homeLabel,
  showTitle = true,
}: Omit<ErrorFallbackPanelProps, "layout"> & { showTitle?: boolean }) {
  return (
    <div className="max-w-md">
      {showTitle ? (
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title ?? "Something went wrong"}
        </h1>
      ) : null}
      <p
        className={
          showTitle
            ? "mt-3 text-sm text-muted-foreground"
            : "text-sm text-muted-foreground"
        }
      >
        {description ??
          "An unexpected error occurred. Try again or return home."}
      </p>
      {error.digest ? (
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        {homeHref ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={homeHref} />}
          >
            {homeLabel ?? "Go home"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function ErrorFallbackPanel({
  layout,
  homeHref = "/",
  homeLabel,
  title,
  description,
  ...contentProps
}: ErrorFallbackPanelProps) {
  if (layout === "app") {
    return (
      <>
        <PageHeader title="Error" description="Something went wrong." />
        <PageBody>
          <ErrorFallbackContent
            {...contentProps}
            showTitle={false}
            description={description}
            homeHref={homeHref}
            homeLabel={homeLabel ?? "Go to dashboard"}
          />
        </PageBody>
      </>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <ErrorFallbackContent
          {...contentProps}
          title={title}
          description={description}
          homeHref={homeHref}
          homeLabel={homeLabel ?? "Go to home"}
        />
      </div>
    </div>
  )
}
