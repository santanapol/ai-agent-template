"use client"

import { useState } from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
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

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index)

function formatMonthLabel(monthIndex: number, year: number): string {
  return new Date(year, monthIndex, 1).toLocaleString("en-GB", { month: "short" })
}

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
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => selected?.getFullYear() ?? new Date().getFullYear())

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setViewYear(selected?.getFullYear() ?? new Date().getFullYear())
    }
  }

  const selectMonth = (monthIndex: number) => {
    onChange(toBillingMonth(new Date(viewYear, monthIndex, 1)))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous year"
              onClick={() => setViewYear((year) => year - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-sm font-medium tabular-nums">{viewYear}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next year"
              onClick={() => setViewYear((year) => year + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_INDEXES.map((monthIndex) => {
              const isSelected =
                selected?.getFullYear() === viewYear && selected.getMonth() === monthIndex

              return (
                <Button
                  key={monthIndex}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="min-w-16"
                  onClick={() => selectMonth(monthIndex)}
                >
                  {formatMonthLabel(monthIndex, viewYear)}
                </Button>
              )
            })}
          </div>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
