import type { ClerkAppearanceTheme } from "@clerk/nextjs/types"

export const clerkAppearance: ClerkAppearanceTheme = {
  theme: "simple",
  variables: {
    colorPrimary: "var(--primary)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorBackground: "var(--background)",
    colorInput: "var(--input)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorDanger: "var(--destructive)",
    colorSuccess: "var(--success)",
    colorWarning: "var(--warning)",
    colorRing: "var(--ring)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.875rem",
    spacing: "1rem",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 p-0 gap-4",
    cardBox: "shadow-none",
    headerTitle: "font-heading text-2xl font-semibold tracking-tight",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButton:
      "rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-muted",
    formButtonPrimary:
      "rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-none hover:bg-primary/80",
    formFieldInput:
      "rounded-md border border-input bg-background text-sm text-foreground shadow-none",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-sm text-muted-foreground",
    identityPreviewText: "text-sm text-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formResendCodeLink: "text-primary hover:text-primary/80",
    otpCodeFieldInput:
      "rounded-md border border-input bg-background text-foreground",
    alertText: "text-sm",
    dividerLine: "bg-border",
    dividerText: "text-xs text-muted-foreground",
  },
}
