/** Raw ISO `upd_date` for admin menu PATCH/DELETE `If-Match` (not `W/"..."` ETag). */
export function ifMatchFromUpdDate(updDate: string): string {
  return updDate;
}
