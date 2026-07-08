import dayjs from "dayjs";

import type { Report, ReportSchedule, ValidationStatus } from "../../types/smartReport";

export type ScheduleOption = "manual" | "daily" | "weekly" | "monthly";
export type ReportStatus = "completed" | "running" | "failed" | "idle";

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
