import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cohortPath } from "@/lib/cohort-routes"

export function UmbrellaAdminActivityNotice({
  settingsProgramCode,
}: {
  settingsProgramCode: string
}) {
  return (
    <Alert>
      <AlertDescription>
        Pod leaders manage mentors, 1:1s, and activities inside their own pods.
        Use{" "}
        <Link
          href={cohortPath(settingsProgramCode, "settings")}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Cohort Settings
        </Link>{" "}
        to invite pod leaders and view pods in this cohort.
      </AlertDescription>
    </Alert>
  )
}
