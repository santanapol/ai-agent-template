"use strict";

const { formatLatencyReport } = require("../../latency-report");

describe("formatLatencyReport", () => {
  it("renders pass/fail rows based on thresholds", () => {
    const markdown = formatLatencyReport({
      generatedAt: "2026-05-11T03:00:00.000Z",
      metrics: [
        {
          key: "dashboard",
          label: "Dashboard summary",
          p95Ms: 180.2,
          thresholdMs: 400,
        },
        {
          key: "errors",
          label: "Error response",
          p95Ms: 280.8,
          thresholdMs: 250,
        },
      ],
    });

    expect(markdown).toContain("# Latency Benchmark Report");
    expect(markdown).toContain("| Dashboard summary | 180.20 | 400 | PASS |");
    expect(markdown).toContain("| Error response | 280.80 | 250 | FAIL |");
  });
});
