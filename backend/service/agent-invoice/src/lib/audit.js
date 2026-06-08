export function buildCreateAudit(actor, prog) {
  const now = new Date();
  return {
    cr_by: actor,
    cr_prog: prog,
    cr_date: now,
    upd_by: actor,
    upd_prog: prog,
    upd_date: now,
  };
}

export function buildUpdateAudit(actor, prog) {
  const now = new Date();
  return {
    upd_by: actor,
    upd_prog: prog,
    upd_date: now,
  };
}
