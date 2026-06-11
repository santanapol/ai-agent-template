import cron from "node-cron";
import { runReportScript } from "./sandbox-runner.service.js";
import { exportReport } from "./file-exporter.service.js";
import { findReports } from "./reports.repository.js";
import { insertDownloadHistory } from "./download-history.repository.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * คำนวณช่วงเวลา "เมื่อวาน" แบบเต็มวัน (00:00:00.000 - 23:59:59.999) ตาม timezone offset
 * แล้วคืนค่าเป็น `Date` ใน UTC — ใช้เป็นค่า `params.startDate`/`params.endDate` ที่ inject เข้า sandbox
 *
 * @param {Date} [now]
 * @param {number} [timezoneOffsetMinutes] - offset จาก UTC เป็นนาที เช่น +07:00 = 420
 * @returns {{ startDate: Date, endDate: Date }}
 */
export function computePreviousDayRange(
  now = new Date(),
  timezoneOffsetMinutes = 0,
) {
  const offsetMs = timezoneOffsetMinutes * 60 * 1000;
  const localNow = new Date(now.getTime() + offsetMs);
  const localStartOfToday = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  );

  return {
    startDate: new Date(localStartOfToday - MS_PER_DAY - offsetMs),
    endDate: new Date(localStartOfToday - 1 - offsetMs),
  };
}

/**
 * แปลง schedule config จาก UI dropdown ให้เป็น cron expression
 * @param {object} schedule
 * @param {"daily"|"weekly"|"monthly"} schedule.frequency
 * @param {number} [schedule.hour]
 * @param {number} [schedule.minute]
 * @param {number} [schedule.dayOfWeek] - 0-6 (สำหรับ weekly)
 * @param {number} [schedule.dayOfMonth] - 1-31 (สำหรับ monthly)
 * @returns {string}
 */
export function scheduleToCron({
  frequency,
  hour = 0,
  minute = 0,
  dayOfWeek = 0,
  dayOfMonth = 1,
}) {
  switch (frequency) {
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly":
      return `${minute} ${hour} * * ${dayOfWeek}`;
    case "monthly":
      if (dayOfMonth === "last") {
        return `${minute} ${hour} 28,29,30,31 * *`;
      }
      return `${minute} ${hour} ${dayOfMonth} * *`;
    default:
      throw new Error(
        `[Scheduler] Unsupported schedule frequency: ${frequency}`,
      );
  }
}

/**
 * คืนค่า true หาก `now` คือวันสุดท้ายของเดือน เมื่อพิจารณาตาม timezone ที่กำหนด
 * (เปรียบเทียบเดือนของ `now` กับเดือนของ `now + 1 วัน` ใน timezone เดียวกัน)
 *
 * @param {Date} now
 * @param {string} [timezone] - IANA timezone เช่น "Asia/Bangkok", ค่าเริ่มต้นคือ UTC
 * @returns {boolean}
 */
export function isLastDayOfMonth(now, timezone = "UTC") {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "2-digit",
  });
  const tomorrow = new Date(now.getTime() + MS_PER_DAY);
  return formatter.format(now) !== formatter.format(tomorrow);
}

/** แปลงผลลัพธ์ของสคริปต์ (Array/Object/null) ให้เป็น Array ของแถวสำหรับ export */
function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result === null || result === undefined) return [];
  return [result];
}

function buildFileName(report, format, now) {
  const ext = format === "excel" ? "xlsx" : "csv";
  const slug =
    report.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "report";
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `${slug}-${timestamp}.${ext}`;
}

/**
 * รันสคริปต์รายงานหนึ่งฉบับ: แทนที่ placeholder วันที่, รันใน sandbox, ส่งออกไฟล์,
 * แล้วบันทึกผลลงใน download_history (ทั้งกรณีสำเร็จและล้มเหลว)
 *
 * @param {import('mongodb').Db} db
 * @param {import('./reports.repository.js').Report} report
 * @param {object} [options]
 * @param {Date} [options.now]
 * @param {"manual"|"scheduler"} [options.triggeredBy]
 * @returns {Promise<import('./download-history.repository.js').DownloadHistory>}
 */
export async function runReport(
  db,
  report,
  { now = new Date(), triggeredBy = "manual" } = {},
) {
  const startedAt = now;
  const { startDate, endDate } = computePreviousDayRange(
    now,
    report.params?.timezoneOffsetMinutes ?? 0,
  );
  const params = {
    ...report.params,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
  const script = report.script;

  const baseRecord = {
    reportId: report._id,
    reportName: report.name,
    format: report.outputFormat,
    triggeredBy,
    startedAt,
    cr_by: "system",
    cr_date: startedAt,
    cr_prog:
      triggeredBy === "scheduler"
        ? "/scheduler"
        : "/api/v1/smart-reports/:id/run",
  };

  try {
    const result = await runReportScript({ script, params });
    const rows = toRows(result);
    const fileName = buildFileName(report, report.outputFormat, now);
    const filePath = await exportReport(rows, {
      fileName,
      format: report.outputFormat,
    });

    return insertDownloadHistory(db, {
      ...baseRecord,
      fileName,
      filePath,
      status: "success",
      recordCount: rows.length,
      error: null,
      finishedAt: new Date(),
    });
  } catch (error) {
    return insertDownloadHistory(db, {
      ...baseRecord,
      fileName: null,
      filePath: null,
      status: "failed",
      recordCount: null,
      error: error.message,
      finishedAt: new Date(),
    });
  }
}

/**
 * สแกนรายงานทั้งหมดที่ enabled และมี schedule แล้วลงทะเบียน cron task สำหรับแต่ละรายงาน
 * @param {import('mongodb').Db} db
 * @returns {Promise<{ reportId: import('mongodb').ObjectId, task: import('node-cron').ScheduledTask }[]>}
 */
export async function startScheduler(db) {
  const reports = await findReports(db);

  return reports
    .filter((report) => report.enabled && report.schedule)
    .map((report) => {
      const expression = scheduleToCron(report.schedule);
      const options = report.schedule.timezone
        ? { timezone: report.schedule.timezone }
        : undefined;
      const task = cron.schedule(
        expression,
        () => {
          if (
            report.schedule.frequency === "monthly" &&
            report.schedule.dayOfMonth === "last" &&
            !isLastDayOfMonth(new Date(), report.schedule.timezone)
          ) {
            // ยังไม่ใช่วันสุดท้ายของเดือนใน timezone ของ report นี้ ข้ามการรัน
            return;
          }
          return runReport(db, report, { triggeredBy: "scheduler" });
        },
        options,
      );
      return { reportId: report._id, task };
    });
}

/**
 * หยุดและทำลาย cron tasks ทั้งหมดที่ลงทะเบียนไว้จาก `startScheduler`
 * @param {{ task: import('node-cron').ScheduledTask }[]} tasks
 */
export function stopScheduler(tasks) {
  for (const { task } of tasks) {
    task.stop();
  }
}

let activeSchedulerTasks = [];

/**
 * สตาร์ทและลงทะเบียนรายงานทั้งหมด
 * @param {import('mongodb').Db} db
 */
export async function initializeScheduler(db) {
  stopScheduler(activeSchedulerTasks);
  activeSchedulerTasks = await startScheduler(db);
  return activeSchedulerTasks;
}

/**
 * โหลดตัวตั้งเวลารันใหม่ทั้งหมดเมื่อมีการแก้ไขข้อมูลรายงาน
 * @param {import('mongodb').Db} db
 */
export async function reloadScheduler(db) {
  await initializeScheduler(db);
}
