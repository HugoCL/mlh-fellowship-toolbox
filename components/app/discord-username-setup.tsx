"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { InfoCallout } from "@/components/app/info-callout"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import { hasDiscordUsername } from "@/lib/discord-username"
import { cn } from "@/lib/utils"

type DiscordUsernameSetupProps = {
  discordUsername?: string | null
  variant?: "default" | "action"
  fieldId?: string
  onSave?: (discordUsername: string) => Promise<void>
}

export function DiscordUsernameSetup({
  discordUsername,
  variant = "default",
  fieldId = "discord-username",
  onSave,
}: DiscordUsernameSetupProps) {
  const updateDiscordUsername = useMutation(api.users.updateMyDiscordUsername)
  const [username, setUsername] = useState(discordUsername ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const missing = !hasDiscordUsername(discordUsername)
  const showAction = variant === "action" && missing

  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        showAction ? "border-primary/30 bg-primary/5" : "border-border bg-card",
      )}
    >
      {showAction ? (
        <InfoCallout variant="info" className="mb-4">
          Add your Discord username so podmates can find you in the server.
        </InfoCallout>
      ) : null}

      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const trimmed = username.trim()
          if (!trimmed) {
            toast.error("Enter a Discord username.")
            return
          }
          setIsSaving(true)
          try {
            if (onSave) {
              await onSave(trimmed)
            } else {
              await updateDiscordUsername({ discordUsername: trimmed })
            }
            toast.success("Discord username saved.")
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to save Discord username.",
            )
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={fieldId}>
              {missing ? "Your Discord username" : "Update Discord username"}
            </FieldLabel>
            <Input
              id={fieldId}
              name="discordUsername"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              autoComplete="off"
              required
            />
          </Field>
          <Button type="submit" className="self-start" disabled={isSaving}>
            {isSaving ? "Saving…" : missing ? "Add Discord username" : "Save"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  )
}
