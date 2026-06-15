import { EnsureAuthenticated } from "@/components/app/ensure-authenticated"

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EnsureAuthenticated>{children}</EnsureAuthenticated>
}
