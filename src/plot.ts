import type { Point } from "./math";

export type PlotSeries = {
  points: Point[];
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
  connectByOrder?: boolean;
};

export type PlotMarker = Point & {
  label: string;
  color?: string;
};

export type PlotOptions = {
  title: string;
  subtitle?: string;
  series?: PlotSeries[];
  markers?: PlotMarker[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  diagonal?: boolean;
};

const escapeSvg = (text: string) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[character] ?? character));

export function renderPlot(target: HTMLElement, options: PlotOptions): void {
  const width = 820;
  const height = 452;
  const padding = { top: 42, right: 30, bottom: 44, left: 54 };
  const requestedXMin = options.xMin ?? -10;
  const requestedXMax = options.xMax ?? 10;
  const requestedYMin = options.yMin ?? -10;
  const requestedYMax = options.yMax ?? 10;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const requestedXSpan = requestedXMax - requestedXMin;
  const requestedYSpan = requestedYMax - requestedYMin;
  const viewportAspect = plotWidth / plotHeight;
  const requestedAspect = requestedXSpan / requestedYSpan;

  // Expand the narrower coordinate span so one unit on x equals one unit on y
  // while still using the complete drawing surface.
  const xSpan = requestedAspect < viewportAspect ? requestedYSpan * viewportAspect : requestedXSpan;
  const ySpan = requestedAspect > viewportAspect ? requestedXSpan / viewportAspect : requestedYSpan;
  const xCenter = (requestedXMin + requestedXMax) / 2;
  const yCenter = (requestedYMin + requestedYMax) / 2;
  const xMin = xCenter - xSpan / 2;
  const xMax = xCenter + xSpan / 2;
  const yMin = yCenter - ySpan / 2;
  const yMax = yCenter + ySpan / 2;
  const xScale = (value: number) => padding.left + ((value - xMin) / xSpan) * plotWidth;
  const yScale = (value: number) => padding.top + ((yMax - value) / ySpan) * plotHeight;
  const inFrame = (point: Point) => point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax;
  const tickStartX = Math.ceil(xMin);
  const tickEndX = Math.floor(xMax);
  const tickStartY = Math.ceil(yMin);
  const tickEndY = Math.floor(yMax);

  const xGrid = Array.from({ length: Math.max(0, tickEndX - tickStartX + 1) }, (_, index) => tickStartX + index)
    .map((value) => `<line class="plot-grid ${value === 0 ? "plot-axis" : ""}" x1="${xScale(value)}" x2="${xScale(value)}" y1="${padding.top}" y2="${height - padding.bottom}" />
      ${value !== 0 && value % 2 === 0 ? `<text class="plot-tick" x="${xScale(value)}" y="${height - padding.bottom + 22}" text-anchor="middle">${value}</text>` : ""}`)
    .join("");
  const yGrid = Array.from({ length: Math.max(0, tickEndY - tickStartY + 1) }, (_, index) => tickStartY + index)
    .map((value) => `<line class="plot-grid ${value === 0 ? "plot-axis" : ""}" x1="${padding.left}" x2="${width - padding.right}" y1="${yScale(value)}" y2="${yScale(value)}" />
      ${value !== 0 && value % 2 === 0 ? `<text class="plot-tick" x="${padding.left - 12}" y="${yScale(value) + 4}" text-anchor="end">${value}</text>` : ""}`)
    .join("");

  const seriesMarkup = (options.series ?? []).map((series) => {
    let path = "";
    let previous: Point | null = null;
    const sparseSeries = series.points.length <= 3;
    const connectByOrder = series.connectByOrder ?? sparseSeries;
    for (const point of series.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        previous = null;
        continue;
      }
      const shouldBreak = previous === null
        || (!connectByOrder && Math.abs(point.x - previous.x) > 0.14)
        || (!connectByOrder && Math.abs(yScale(point.y) - yScale(previous.y)) > plotHeight * 0.68);
      const command = shouldBreak ? "M" : "L";
      path += `${command}${xScale(point.x).toFixed(2)},${yScale(point.y).toFixed(2)} `;
      previous = point;
    }
    return `<path d="${path}" class="plot-series" stroke="${series.color}" stroke-width="${series.width ?? 3.2}" ${series.dashed ? 'stroke-dasharray="8 8"' : ""} />`;
  }).join("");

  const diagonalStart = Math.max(xMin, yMin);
  const diagonalEnd = Math.min(xMax, yMax);
  const diagonal = options.diagonal
    ? `<line class="plot-diagonal" x1="${xScale(diagonalStart)}" y1="${yScale(diagonalStart)}" x2="${xScale(diagonalEnd)}" y2="${yScale(diagonalEnd)}" />
       <text class="plot-diagonal-label" x="${xScale(Math.min(diagonalEnd - 1, 7.2))}" y="${yScale(Math.min(diagonalEnd - 1, 7.2)) - 8}">y = x</text>`
    : "";

  const markers = (options.markers ?? []).filter(inFrame).map((marker) => `
    <g class="plot-marker">
      <circle cx="${xScale(marker.x)}" cy="${yScale(marker.y)}" r="6.6" fill="${marker.color ?? "#ffca6b"}" />
      <circle cx="${xScale(marker.x)}" cy="${yScale(marker.y)}" r="11" fill="none" stroke="${marker.color ?? "#ffca6b"}" opacity="0.35" />
      <text x="${xScale(marker.x) + 11}" y="${yScale(marker.y) - 12}">${escapeSvg(marker.label)}</text>
    </g>`).join("");

  const legend = (options.series ?? []).filter((series) => series.label).map((series) => `
    <span class="plot-legend-item"><i style="background:${series.color};${series.dashed ? "border-top:2px dashed " + series.color + "; background:transparent" : ""}"></i>${escapeSvg(series.label ?? "")}</span>`).join("");

  target.innerHTML = `
    <div class="plot-header">
      <div><p class="eyebrow">Plano cartesiano</p><h3>${escapeSvg(options.title)}</h3>${options.subtitle ? `<p>${escapeSvg(options.subtitle)}</p>` : ""}</div>
      <div class="plot-legend">${legend}</div>
    </div>
    <div class="plot-frame">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvg(options.title)}" preserveAspectRatio="xMidYMid meet">
        <defs><clipPath id="plot-clip"><rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="10" /></clipPath></defs>
        <rect class="plot-bg" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        ${xGrid}${yGrid}
        ${diagonal}
        <g clip-path="url(#plot-clip)">${seriesMarkup}${markers}</g>
        <text class="plot-axis-label" x="${width - padding.right + 3}" y="${yScale(0) - 10}">x</text>
        <text class="plot-axis-label" x="${xScale(0) + 10}" y="${padding.top + 10}">y</text>
      </svg>
    </div>`;
}
