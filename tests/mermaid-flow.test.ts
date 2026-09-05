import assert from "node:assert/strict";
import test from "node:test";
import { getElementProgress, getFlowSchedule, getSerpentinePosition, parseMermaidFlowchart } from "../src/assets/mermaid-flow/timeline.ts";

test("Mermaid flowcharts parse and schedule nodes after their incoming line", () => {
  const chart = parseMermaidFlowchart(`flowchart LR
    A[User] --> B[Browser]
    B --> C[Agent]
    C --> D[API]`);

  assert.equal(chart.direction, "LR");
  assert.deepEqual(chart.nodes.map(({ label }) => label), ["User", "Browser", "Agent", "API"]);
  assert.deepEqual(chart.edges, [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }]);

  const schedule = getFlowSchedule(chart);
  assert.equal(schedule.nodeStarts.get("A"), 0);
  assert.ok(schedule.edgeStarts[0] > schedule.nodeStarts.get("A")!);
  assert.ok(schedule.nodeStarts.get("B")! > schedule.edgeStarts[0]);
  assert.equal(getElementProgress(schedule.edgeStarts[0], schedule.edgeStarts[0], 0.45), 0);
  assert.equal(getElementProgress(schedule.edgeStarts[0] + 0.45, schedule.edgeStarts[0], 0.45), 1);

  const continued = parseMermaidFlowchart(`flowchart LR
    A["Web Page"]
    --> B["Explore"]
    --> C["Discover API / UI"]`);
  assert.deepEqual(continued.nodes.map(({ label }) => label), ["Web Page", "Explore", "Discover API / UI"]);
  assert.equal(continued.edges.length, 2);
});

test("long linear flows balance nodes across alternating rows", () => {
  assert.deepEqual(getSerpentinePosition(0, 7, 5), { lane: 0, slot: 0, lanes: 2 });
  assert.deepEqual(getSerpentinePosition(3, 7, 5), { lane: 0, slot: 3, lanes: 2 });
  assert.deepEqual(getSerpentinePosition(4, 7, 5), { lane: 1, slot: 3, lanes: 2 });
  assert.deepEqual(getSerpentinePosition(6, 7, 5), { lane: 1, slot: 1, lanes: 2 });
  const laneCounts = Array.from({ length: 13 }, (_, index) => getSerpentinePosition(index, 13, 5).lane)
    .reduce<number[]>((counts, lane) => { counts[lane] = (counts[lane] ?? 0) + 1; return counts; }, []);
  assert.deepEqual(laneCounts, [5, 4, 4]);
});

test("Mermaid flow parser rejects unsupported input", () => {
  assert.throws(() => parseMermaidFlowchart("sequenceDiagram\nA->>B: hello"), /Start with flowchart/);
  assert.throws(() => parseMermaidFlowchart("flowchart LR\nA -.-> B"), /Unsupported Mermaid syntax/);
});
