"use strict";

const { formatLatencyReport } = require("../../latency-report");

describe("latency-report", () => {
  it("formatLatencyReport builds markdown table with PASS when under threshold", () => {
    const out = formatLatencyReport({
      generatedAt: "2026-05-14T00:00:00.000Z",
      metrics: [
        { label: "List items", p95Ms: 10, thresholdMs: 100 },
        { label: "Create item", p95Ms: 50, thresholdMs: 100 },
      ],
    });
    expect(out).toContain("# Latency Benchmark Report");
    expect(out).toContain("| List items | 10.00 | 100 | PASS |");
    expect(out).toContain("| Create item | 50.00 | 100 | PASS |");
  });

  it("formatLatencyReport marks FAIL when p95 exceeds threshold", () => {
    const out = formatLatencyReport({
      generatedAt: "2026-05-14T00:00:00.000Z",
      metrics: [{ label: "Slow", p95Ms: 200, thresholdMs: 100 }],
    });
    expect(out).toContain("| Slow | 200.00 | 100 | FAIL |");
  });
});
