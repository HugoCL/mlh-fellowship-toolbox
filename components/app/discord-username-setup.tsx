"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import { hasDiscordUsername } from "@/lib/discord-username"

type DiscordUsernameSetupProps = {
  discordUsername?: string | null
  variant?: "default" | "action"
}

export function DiscordUsernameSetup({
  discordUsername,
  variant = "default",
}: DiscordUsernameSetupProps) {
  const updateDiscordUsername = useMutation(api.users.updateMyDiscordUsername)
  const [username, setUsername] = useState(discordUsername ?? "")
  const [isSaving, setIsSaving] = useState(false)

  const missing = !hasDiscordUsername(discordUsername)
  const showAction = variant === "action" && missing

  return (
    <section
      className={
        showAction
          ? "rounded-lg border border-primary/30 bg-primary/5 p-4"
          : "rounded-lg border border-border/70 p-4"
      }
    >
      {showAction ? (
        <Alert className="mb-4 border-0 bg-transparent p-0">
          <AlertDescription>
            Add your Discord username so podmates can find you in the server.
          </AlertDescription>
        </Alert>
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
            await updateDiscordUsername({ discordUsername: trimmed })
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
            <FieldLabel htmlFor="discord-username">
              {missing ? "Your Discord username" : "Update Discord username"}
            </FieldLabel>
            <Input
              id="discord-username"
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
