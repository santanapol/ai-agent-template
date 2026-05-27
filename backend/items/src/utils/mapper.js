export function mapItemToResponse(document) {
  return {
    id: document._id.toString(),
    name: document.name,
    desc: document.desc,
    cr_by: document.cr_by,
    cr_date: document.cr_date.toISOString(),
    upd_by: document.upd_by,
    upd_date: document.upd_date.toISOString(),
  };
}
