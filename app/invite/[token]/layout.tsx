import { EnsureUser } from "@/components/app/ensure-user"

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EnsureUser>{children}</EnsureUser>
}
