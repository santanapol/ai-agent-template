export function buildAuditCreate({ userId, prog }) {
  const now = new Date();

  return {
    cr_by: userId,
    cr_date: now,
    cr_prog: prog,
    upd_by: userId,
    upd_date: now,
    upd_prog: prog,
  };
}
