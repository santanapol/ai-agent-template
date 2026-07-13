export const BRANCH_REPORT_CODE_MESSAGES: Record<string, string> = {
  INVALID_PARAM: "Invalid report parameters. Check your filters and try again.",
  INVALID_RESPONSE: "Unexpected report response. Please try again.",
  PERMISSION_DENIED: "You do not have permission to run this report.",
  GATEWAY_SECRET_REJECTED: "Report request was rejected. Please sign in again.",
  MISSING_GATEWAY_USER_CONTEXT: "Session context is missing. Please sign in again.",
  INVALID_USER_CONTEXT: "Session context is invalid. Please sign in again.",
};

export function branchReportUserMessage(
  code: string,
  fallback = "Unable to complete the branch report request. Please try again.",
): string {
  return BRANCH_REPORT_CODE_MESSAGES[code] ?? fallback;
}
