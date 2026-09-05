export type FlowDirection = "LR" | "RL" | "TD" | "TB" | "BT";
export type FlowNode = { id: string; label: string };
export type FlowEdge = { from: string; to: string };
export type Flowchart = { direction: FlowDirection; nodes: FlowNode[]; edges: FlowEdge[] };
export type FlowSchedule = { nodeStarts: Map<string, number>; edgeStarts: number[]; duration: number };

const NODE_TIME = 0.35;
const EDGE_TIME = 0.45;
const HOLD_TIME = 0.8;

function parseNode(source: string, line: number) {
  const match = source.trim().match(/^([A-Za-z_][\w-]*)(?:\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}))?$/);
  if (!match) throw new Error(`Unsupported Mermaid syntax on line ${line}.`);
  const label = (match[2] ?? match[3] ?? match[4] ?? match[1]).trim().replace(/^(["'])(.*)\1$/, "$2");
  return { id: match[1], label };
}

export function parseMermaidFlowchart(source: string): Flowchart {
  if (source.length > 5000) throw new Error("Mermaid input must be 5,000 characters or fewer.");
  const lines = source.split(/\r?\n|;/).map((line) => line.replace(/%%.*$/, "").trim()).filter(Boolean);
  const header = lines.shift()?.match(/^flowchart\s+(LR|RL|TD|TB|BT)$/i);
  if (!header) throw new Error("Start with flowchart LR, RL, TD, TB, or BT.");
  const statements: string[] = [];
  for (const line of lines) {
    if (line.startsWith("-->") || statements.at(-1)?.endsWith("-->")) {
      if (!statements.length) throw new Error("A connection needs a source node.");
      statements[statements.length - 1] += ` ${line}`;
    } else {
      statements.push(line);
    }
  }

  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const addNode = (node: FlowNode) => nodes.set(node.id, nodes.has(node.id) && node.label === node.id ? nodes.get(node.id)! : node);

  statements.forEach((statement, index) => {
    const parts = statement.split(/\s*-->\s*/);
    if (parts.length > 1) {
      if (parts.some((part) => !part)) throw new Error(`Incomplete connection on line ${index + 2}.`);
      const parsed = parts.map((part) => parseNode(part, index + 2));
      parsed.forEach(addNode);
      for (let part = 0; part < parsed.length - 1; part += 1) {
        if (parsed[part].id === parsed[part + 1].id) throw new Error(`Self-connections are not supported on line ${index + 2}.`);
        edges.push({ from: parsed[part].id, to: parsed[part + 1].id });
      }
    } else {
      addNode(parseNode(statement, index + 2));
    }
  });

  if (!nodes.size) throw new Error("Add at least one flowchart node.");
  if (nodes.size > 50 || edges.length > 100) throw new Error("Flowcharts support up to 50 nodes and 100 connections.");
  return { direction: header[1].toUpperCase() as FlowDirection, nodes: [...nodes.values()], edges };
}

export function getFlowSchedule(chart: Flowchart, speed = 1): FlowSchedule {
  const scale = 1 / Math.max(0.1, speed);
  const nodeStarts = new Map<string, number>();
  const edgeStarts = Array(chart.edges.length).fill(-1);
  const outgoing = new Map<string, number[]>();
  chart.edges.forEach((edge, index) => outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), index]));
  let cursor = 0;

  const visit = (id: string) => {
    if (!nodeStarts.has(id)) {
      nodeStarts.set(id, cursor);
      cursor += NODE_TIME * scale;
    }
    for (const edgeIndex of outgoing.get(id) ?? []) {
      if (edgeStarts[edgeIndex] >= 0) continue;
      edgeStarts[edgeIndex] = cursor;
      cursor += EDGE_TIME * scale;
      visit(chart.edges[edgeIndex].to);
    }
  };

  const incoming = new Set(chart.edges.map(({ to }) => to));
  chart.nodes.filter(({ id }) => !incoming.has(id)).forEach(({ id }) => visit(id));
  chart.nodes.forEach(({ id }) => visit(id));
  return { nodeStarts, edgeStarts, duration: cursor + HOLD_TIME };
}

export function getMermaidFlowDuration(source: string, speed = 1) {
  try {
    return getFlowSchedule(parseMermaidFlowchart(source), speed).duration;
  } catch {
    return 1;
  }
}

export function getSerpentinePosition(index: number, count: number, capacity: number, reverse = false) {
  const lanes = Math.ceil(count / capacity);
  const shortSize = Math.floor(count / lanes);
  const longLanes = count % lanes;
  let lane = 0;
  let firstIndex = 0;
  while (index >= firstIndex + shortSize + (lane < longLanes ? 1 : 0)) {
    firstIndex += shortSize + (lane < longLanes ? 1 : 0);
    lane += 1;
  }
  const laneSizes = Array.from({ length: lanes }, (_, current) => shortSize + (current < longLanes ? 1 : 0));
  const direction = (current: number) => ((current % 2 === 1) !== reverse ? -1 : 1);
  let startSlot = reverse ? Math.max(...laneSizes) - 1 : 0;
  for (let current = 0; current < lane; current += 1) startSlot += direction(current) * (laneSizes[current] - 1);
  const offset = index - firstIndex;
  return { lane, slot: startSlot + direction(lane) * offset, lanes };
}

export function getElementProgress(time: number, start: number, duration: number) {
  return Math.max(0, Math.min(1, (time - start) / duration));
}
