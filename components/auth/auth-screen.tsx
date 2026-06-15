import { Quote } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { generateMotivationalQuote } from "@/app/actions/generateMotivationalQuote"
import { getRandomPhoto } from "@/lib/unsplash"

type AuthScreenProps = {
  children: ReactNode
}

export async function AuthScreen({ children }: AuthScreenProps) {
  const [photo, quote] = await Promise.all([
    getRandomPhoto("nature"),
    generateMotivationalQuote(),
  ])

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 bg-white p-6 text-foreground md:p-10 dark:bg-white dark:text-gray-900">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
              FT
            </div>
            Fellowship Toolbox
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        {photo ? (
          <>
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              priority
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.5] dark:grayscale"
            />
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-lg rounded-2xl border border-white/20 bg-black/30 p-8 text-center shadow-2xl backdrop-blur-md">
                <Quote className="mx-auto mb-4 size-10 text-white/80" />
                <blockquote className="mb-2 font-serif text-2xl font-medium leading-relaxed tracking-wide text-white">
                  {quote.text}
                </blockquote>
                <cite className="font-serif text-base font-light tracking-wide text-white/70 not-italic">
                  — {quote.author}
                </cite>
              </div>
            </div>
            <a
              href={photo.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 bottom-2 text-xs text-white/70 hover:text-white"
            >
              Photo by {photo.photographer}
            </a>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted" />
        )}
      </div>
    </div>
  )
}
