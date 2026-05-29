import client from "prom-client";

const registry = new client.Registry();
const staffAuthRevokePendingTotal = new client.Counter({
  name: "staff_auth_revoke_pending_total",
  help: "Total archive operations where auth revoke remained pending",
  registers: [registry],
});

export function incrementAuthRevokePendingTotal() {
  staffAuthRevokePendingTotal.inc();
}

export function getMetricsRegistry() {
  return registry;
}

export function resetMetricsForTests() {
  staffAuthRevokePendingTotal.reset();
}
