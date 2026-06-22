"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themes = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const

type ThemeValue = (typeof themes)[number]["value"]

export function ThemeRadioGroup() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuRadioGroup
      value={theme}
      onValueChange={(value) => {
        if (value) setTheme(value as ThemeValue)
      }}
    >
      <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Theme
      </DropdownMenuLabel>
      {themes.map((item) => (
        <DropdownMenuRadioItem key={item.value} value={item.value}>
          <item.icon className="size-4" />
          {item.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

export function ThemeSelector() {
  const { theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = themes.find((item) => item.value === theme) ?? themes[2]
  const ActiveIcon = activeTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Select theme"
          />
        }
      >
        {mounted ? (
          <ActiveIcon className="size-4" />
        ) : (
          <span className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <ThemeRadioGroup />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
