import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Doc } from "@/convex/_generated/dataModel"
import type { NotificationFormState } from "./notification-types"

export function NotificationTargetFields<T extends NotificationFormState>({
  form,
  setForm,
  fellows,
}: {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  fellows: Doc<"fellows">[]
}) {
  function toggleFellowSelection(fellowId: string) {
    setForm((prev) => {
      const next = new Set(prev.selectedFellowIds)
      if (next.has(fellowId)) {
        next.delete(fellowId)
      } else {
        next.add(fellowId)
      }
      return { ...prev, selectedFellowIds: next }
    })
  }

  return (
    <>
      <Field>
        <FieldLabel>Audience</FieldLabel>
        <Select
          value={form.targetMode}
          onValueChange={(value) => {
            if (value === "all" || value === "specific") {
              setForm((prev) => ({ ...prev, targetMode: value }))
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {form.targetMode === "all" ? "All fellows" : "Specific fellows"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All fellows</SelectItem>
              <SelectItem value="specific">Specific fellows</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {form.targetMode === "specific" ? (
        <Field>
          <FieldLabel>Fellows</FieldLabel>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {fellows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fellows in this pod yet.
              </p>
            ) : (
              fellows.map((fellow) => (
                <div
                  key={fellow._id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`fellow-${fellow._id}`}
                    checked={form.selectedFellowIds.has(fellow._id)}
                    onCheckedChange={() => toggleFellowSelection(fellow._id)}
                  />
                  <label htmlFor={`fellow-${fellow._id}`}>{fellow.name}</label>
                </div>
              ))
            )}
          </div>
        </Field>
      ) : null}
    </>
  )
}
