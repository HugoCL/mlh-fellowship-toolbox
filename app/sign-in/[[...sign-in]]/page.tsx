import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.97_0.01_90),_transparent_55%),linear-gradient(180deg,oklch(0.985_0.002_90),oklch(0.97_0.004_80))] px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <p className="font-heading text-2xl font-semibold tracking-tight">
            Fellowship Toolbox
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage your pod
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
