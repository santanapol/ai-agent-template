"use strict";

function statusFromThreshold(p95Ms, thresholdMs) {
  return p95Ms <= thresholdMs ? "PASS" : "FAIL";
}

function formatLatencyReport({ generatedAt, metrics }) {
  const header = [
    "# Latency Benchmark Report",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "| Metric | p95 (ms) | Threshold (ms) | Status |",
    "| --- | ---: | ---: | --- |",
  ];

  const rows = metrics.map((metric) => {
    const status = statusFromThreshold(metric.p95Ms, metric.thresholdMs);
    return `| ${metric.label} | ${metric.p95Ms.toFixed(2)} | ${metric.thresholdMs} | ${status} |`;
  });

  return [...header, ...rows, ""].join("\n");
}

module.exports = {
  formatLatencyReport,
};
