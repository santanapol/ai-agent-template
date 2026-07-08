/**
 * Format member `reg_date` (UTC) as DD/MM/YYYY for API responses.
 * @param {Date | string | number} regDate
 * @returns {string}
 */
export function formatRegisterDate(regDate) {
  const date = regDate instanceof Date ? regDate : new Date(regDate);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}
