import type { MermaidFlowParameters } from "./definition";
import { getElementProgress, getFlowSchedule, getSerpentinePosition, parseMermaidFlowchart, type Flowchart } from "./timeline";

type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Box = { x: number; y: number; width: number; height: number };

function layout(chart: Flowchart, width: number, height: number) {
  const ranks = new Map(chart.nodes.map(({ id }) => [id, 0]));
  const indegree = new Map(chart.nodes.map(({ id }) => [id, 0]));
  chart.edges.forEach(({ to }) => indegree.set(to, (indegree.get(to) ?? 0) + 1));
  const queue = chart.nodes.filter(({ id }) => !indegree.get(id)).map(({ id }) => id);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    chart.edges.filter(({ from }) => from === id).forEach(({ to }) => {
      ranks.set(to, Math.max(ranks.get(to) ?? 0, (ranks.get(id) ?? 0) + 1));
      indegree.set(to, (indegree.get(to) ?? 1) - 1);
      if (!indegree.get(to)) queue.push(to);
    });
  }

  const horizontal = chart.direction === "LR" || chart.direction === "RL";
  const reverse = chart.direction === "RL" || chart.direction === "BT";
  const maxRank = Math.max(...ranks.values());
  const groups = new Map<number, string[]>();
  chart.nodes.forEach(({ id }) => groups.set(ranks.get(id)!, [...(groups.get(ranks.get(id)!) ?? []), id]));
  const unit = Math.min(width, height) / 1080;
  const largestGroup = Math.max(...[...groups.values()].map(({ length }) => length));
  const linear = largestGroup === 1 && chart.edges.length === chart.nodes.length - 1;
  const capacity = Math.max(2, Math.floor(((horizontal ? width : height) - 120 * unit) / ((horizontal ? 310 : 180) * unit)));
  if (linear && chart.nodes.length > capacity) {
    const boxes = new Map<string, Box>();
    const lanes = Math.ceil(chart.nodes.length / capacity);
    const columns = Math.ceil(chart.nodes.length / lanes);
    const boxWidth = Math.min(250 * unit, width / (horizontal ? columns : lanes) * (horizontal ? 0.64 : 0.55));
    const boxHeight = Math.min(108 * unit, height / (horizontal ? lanes : columns) * (horizontal ? 0.48 : 0.55));
    chart.nodes.forEach(({ id }) => {
      const rank = ranks.get(id)!;
      const position = getSerpentinePosition(rank, chart.nodes.length, capacity, reverse);
      const primary = (horizontal ? width : height) * (position.slot + 1) / (columns + 1);
      const cross = (horizontal ? height : width) * (position.lane + 1) / (position.lanes + 1);
      boxes.set(id, horizontal
        ? { x: primary, y: cross, width: boxWidth, height: boxHeight }
        : { x: cross, y: primary, width: boxWidth, height: boxHeight });
    });
    return boxes;
  }

  const boxWidth = Math.min(250 * unit, width / (horizontal ? maxRank + 1 : largestGroup) * 0.64);
  const boxHeight = Math.min(108 * unit, height / (horizontal ? largestGroup : maxRank + 1) * 0.58);
  const boxes = new Map<string, Box>();

  for (const [rank, ids] of groups) {
    const displayedRank = reverse ? maxRank - rank : rank;
    const primarySize = horizontal ? width : height;
    const primary = primarySize * (displayedRank + 1) / (maxRank + 2);
    ids.forEach((id, index) => {
      const cross = (horizontal ? height : width) * (index + 1) / (ids.length + 1);
      boxes.set(id, horizontal
        ? { x: primary, y: cross, width: boxWidth, height: boxHeight }
        : { x: cross, y: primary, width: boxWidth, height: boxHeight });
    });
  }
  return boxes;
}

function endpoints(from: Box, to: Box) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const fromScale = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  const toScale = 1 / Math.max(Math.abs(dx) / (to.width / 2), Math.abs(dy) / (to.height / 2));
  return {
    start: { x: from.x + dx * fromScale, y: from.y + dy * fromScale },
    end: { x: to.x - dx * toScale, y: to.y - dy * toScale },
  };
}

function roundedRect(context: RenderContext, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function renderMermaidFlowFrame(context: RenderContext, width: number, height: number, parameters: MermaidFlowParameters, time: number) {
  context.clearRect(0, 0, width, height);
  const chart = parseMermaidFlowchart(parameters.mermaid);
  const boxes = layout(chart, width, height);
  const schedule = getFlowSchedule(chart, parameters.animationSpeed);
  const unit = Math.min(width, height) / 1080;
  const speed = Math.max(0.1, parameters.animationSpeed);
  const edgeDuration = 0.45 / speed;
  const nodeDuration = 0.35 / speed;

  context.strokeStyle = parameters.lineColor;
  context.fillStyle = parameters.lineColor;
  context.lineWidth = 5 * unit;
  context.lineCap = "round";
  chart.edges.forEach((edge, index) => {
    const from = boxes.get(edge.from)!;
    const to = boxes.get(edge.to)!;
    const { start, end } = endpoints(from, to);
    const progress = getElementProgress(time, schedule.edgeStarts[index], edgeDuration);
    if (!progress) return;
    const x = start.x + (end.x - start.x) * progress;
    const y = start.y + (end.y - start.y) * progress;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(x, y);
    context.stroke();
    if (progress > 0.88) {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const size = 18 * unit;
      context.save();
      context.globalAlpha = (progress - 0.88) / 0.12;
      context.translate(end.x, end.y);
      context.rotate(angle);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-size, -size * 0.55);
      context.lineTo(-size, size * 0.55);
      context.closePath();
      context.fill();
      context.restore();
    }
  });

  chart.nodes.forEach((node) => {
    const box = boxes.get(node.id)!;
    const raw = getElementProgress(time, schedule.nodeStarts.get(node.id)!, nodeDuration);
    if (!raw) return;
    const progress = 1 - (1 - raw) ** 3;
    const scale = 0.82 + 0.18 * progress;
    context.save();
    context.globalAlpha = progress;
    context.translate(box.x, box.y);
    context.scale(scale, scale);
    roundedRect(context, -box.width / 2, -box.height / 2, box.width, box.height, 16 * unit);
    context.fillStyle = parameters.nodeColor;
    context.fill();
    let fontSize = 34 * unit;
    context.font = `600 ${fontSize}px "${parameters.fontFamily.replaceAll('"', '\\"')}", sans-serif`;
    const measured = context.measureText(node.label).width;
    if (measured > box.width * 0.78) fontSize *= box.width * 0.78 / measured;
    context.font = `600 ${fontSize}px "${parameters.fontFamily.replaceAll('"', '\\"')}", sans-serif`;
    context.fillStyle = parameters.textColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(node.label, 0, 1 * unit);
    context.restore();
  });
}
