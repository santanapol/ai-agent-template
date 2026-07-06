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
  formatDisplayDate,
  parseIsoDate,
  toIsoDate,
} from "@/lib/date-utils"

interface DatePickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function DatePicker({
  id,
  value = "",
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const selected = parseIsoDate(value)

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn("w-[180px]", className)}
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
        {value ? formatDisplayDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(date) => onChange(date ? toIsoDate(date) : "")}
        />
      </PopoverContent>
    </Popover>
  )
}
