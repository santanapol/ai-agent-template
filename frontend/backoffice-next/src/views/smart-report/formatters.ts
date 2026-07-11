import dayjs from "dayjs";

import type {
  DownloadHistoryRecord,
  DownloadHistoryStatus,
  DownloadHistoryTrigger,
  Report,
  ReportSchedule,
  ValidationStatus,
} from "../../types/smartReport";

export type ScheduleOption = "manual" | "daily" | "weekly" | "monthly";
export type ReportStatus = "completed" | "running" | "failed" | "idle";

export const SCHEDULE_FREQUENCY_ITEMS: { value: ScheduleOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const WEEKLY_DAY_ITEMS: { value: string; label: string }[] = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

export const MONTHLY_DAY_ITEMS: { value: string; label: string }[] = [
  { value: "last", label: "Last day of month" },
  ...Array.from({ length: 31 }, (_, index) => ({
    value: String(index + 1),
    label: `Day ${index + 1}`,
  })),
];

export interface ReportRow extends Report {
  derivedStatus: ReportStatus;
  lastRun: string;
}

export const DEFAULT_QUERY_EXAMPLE = `// --- 0. Define Time Range (Dynamic Parameters) ---
const startDate = ISODate(params.startDate);
const endDate = ISODate(params.endDate);

// --- 1. Connect to Target Database ---
const targetDB = db.getSiblingDB("your_database_name");

// --- 2. Write Aggregate Query to Fetch Report Data ---
targetDB.your_collection_name.aggregate([
    {
        $match: {
            // Filter data by date range
            created_at: { $gte: startDate, $lte: endDate }
        }
    },
    {
        $project: {
            _id: 0, // 0 = hide this column, 1 = show this column
            column_name_1: "$field_name_1",
            column_name_2: "$field_name_2",
            created_at: 1
        }
    }
]);`;

export function formatValidationStatusLabel(status: ValidationStatus | undefined): string {
  if (status === "valid") return "Validated";
  if (status === "invalid") return "Invalid";
  if (status === "pending") return "Pending";
  return "Not validated";
}

export function validationStatusColor(status: ValidationStatus | undefined): string {
  if (status === "valid") return "success";
  if (status === "invalid") return "error";
  return "default";
}

export function formatScheduleLabel(schedule: ReportSchedule | null): string {
  if (!schedule) return "Manual (No schedule)";
  const hourStr = String(schedule.hour ?? 0).padStart(2, "0");
  const minStr = String(schedule.minute ?? 0).padStart(2, "0");
  const timeStr = `${hourStr}:${minStr}`;

  if (schedule.frequency === "daily") {
    return `Daily (Every day at ${timeStr})`;
  }
  if (schedule.frequency === "weekly") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[schedule.dayOfWeek ?? 1];
    return `Weekly (Every ${dayName} at ${timeStr})`;
  }
  if (schedule.frequency === "monthly") {
    if (schedule.dayOfMonth === "last") {
      return `Monthly (Last day of the month at ${timeStr})`;
    }
    return `Monthly (Day ${schedule.dayOfMonth ?? 1} of the month at ${timeStr})`;
  }
  return "Manual (No schedule)";
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Compact label for table cells; use formatScheduleLabel for tooltips. */
export function formatScheduleShort(schedule: ReportSchedule | null): string {
  if (!schedule) return "Manual";
  const hourStr = String(schedule.hour ?? 0).padStart(2, "0");
  const minStr = String(schedule.minute ?? 0).padStart(2, "0");
  const timeStr = `${hourStr}:${minStr}`;

  if (schedule.frequency === "daily") {
    return `Daily · ${timeStr}`;
  }
  if (schedule.frequency === "weekly") {
    const dayName = WEEKDAY_SHORT[schedule.dayOfWeek ?? 1] ?? "Mon";
    return `Weekly · ${dayName} ${timeStr}`;
  }
  if (schedule.frequency === "monthly") {
    if (schedule.dayOfMonth === "last") {
      return `Monthly · Last day ${timeStr}`;
    }
    return `Monthly · Day ${schedule.dayOfMonth ?? 1} ${timeStr}`;
  }
  return "Manual";
}

export function formatLastRunDisplay(iso: string | null | undefined): string {
  if (!iso) return "Never";
  return formatDateTime(iso);
}

export function scheduleToUiValue(schedule: ReportSchedule | null): ScheduleOption {
  if (!schedule) return "manual";
  if (schedule.frequency === "daily" || schedule.frequency === "weekly" || schedule.frequency === "monthly") {
    return schedule.frequency;
  }
  return "manual";
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = dayjs(iso);
  if (!d.isValid()) return "—";
  return d.format("YYYY-MM-DD HH:mm:ss");
}

/** Compact timestamp for narrow panels (e.g. download history sheet). */
export function formatDateTimeCompact(iso: string | null): string {
  if (!iso) return "—";
  const d = dayjs(iso);
  if (!d.isValid()) return "—";
  return d.format("MMM D, HH:mm");
}

export function formatDownloadTrigger(trigger: DownloadHistoryTrigger): string {
  return trigger === "scheduler" ? "Scheduled" : "Manual";
}

export function formatRecordCount(count: number | null | undefined): string {
  if (count == null) return "—";
  return count.toLocaleString();
}

export function deriveReportStatusFromHistory(status: DownloadHistoryStatus): ReportStatus {
  if (status === "running") return "running";
  if (status === "success") return "completed";
  return "failed";
}

export function indexLatestHistoryByReportId(
  history: DownloadHistoryRecord[],
): Map<string, DownloadHistoryRecord> {
  const latestByReportId = new Map<string, DownloadHistoryRecord>();
  for (const record of history) {
    const existing = latestByReportId.get(record.reportId);
    if (!existing) {
      latestByReportId.set(record.reportId, record);
      continue;
    }
    const recordTime = record.finishedAt ?? record.startedAt;
    const existingTime = existing.finishedAt ?? existing.startedAt;
    if (recordTime > existingTime) {
      latestByReportId.set(record.reportId, record);
    }
  }
  return latestByReportId;
}
