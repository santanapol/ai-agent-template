"use client"

import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  formatDisplayMonth,
  parseBillingMonth,
  toBillingMonth,
} from "@/lib/date-utils"

interface MonthPickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function MonthPicker({
  id,
  value = "",
  onChange,
  placeholder = "Pick a month",
  className,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MonthPickerProps) {
  const selected = parseBillingMonth(value)

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn("w-[200px]", className)}
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {value ? formatDisplayMonth(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(date) => onChange(date ? toBillingMonth(date) : "")}
        />
      </PopoverContent>
    </Popover>
  )
}
