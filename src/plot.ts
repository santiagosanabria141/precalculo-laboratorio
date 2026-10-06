import type { Point } from "./math";

export type PlotSeries = {
  points: Point[];
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
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
  const xMin = options.xMin ?? -10;
  const xMax = options.xMax ?? 10;
  const yMin = options.yMin ?? -10;
  const yMax = options.yMax ?? 10;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xScale = (value: number) => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (value: number) => padding.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const inFrame = (point: Point) => point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax;

  const xGrid = Array.from({ length: xMax - xMin + 1 }, (_, index) => xMin + index)
    .map((value) => `<line class="plot-grid ${value === 0 ? "plot-axis" : ""}" x1="${xScale(value)}" x2="${xScale(value)}" y1="${padding.top}" y2="${height - padding.bottom}" />
      ${value !== 0 && value % 2 === 0 ? `<text class="plot-tick" x="${xScale(value)}" y="${height - padding.bottom + 22}" text-anchor="middle">${value}</text>` : ""}`)
    .join("");
  const yGrid = Array.from({ length: yMax - yMin + 1 }, (_, index) => yMin + index)
    .map((value) => `<line class="plot-grid ${value === 0 ? "plot-axis" : ""}" x1="${padding.left}" x2="${width - padding.right}" y1="${yScale(value)}" y2="${yScale(value)}" />
      ${value !== 0 && value % 2 === 0 ? `<text class="plot-tick" x="${padding.left - 12}" y="${yScale(value) + 4}" text-anchor="end">${value}</text>` : ""}`)
    .join("");

  const seriesMarkup = (options.series ?? []).map((series) => {
    let path = "";
    let previous: Point | null = null;
    const sparseSeries = series.points.length <= 3;
    for (const point of series.points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        previous = null;
        continue;
      }
      const shouldBreak = previous === null
        || (!sparseSeries && Math.abs(point.x - previous.x) > 0.14)
        || (!sparseSeries && Math.abs(yScale(point.y) - yScale(previous.y)) > plotHeight * 0.68);
      const command = shouldBreak ? "M" : "L";
      path += `${command}${xScale(point.x).toFixed(2)},${yScale(point.y).toFixed(2)} `;
      previous = point;
    }
    return `<path d="${path}" class="plot-series" stroke="${series.color}" stroke-width="${series.width ?? 3.2}" ${series.dashed ? 'stroke-dasharray="8 8"' : ""} />`;
  }).join("");

  const diagonal = options.diagonal
    ? `<line class="plot-diagonal" x1="${xScale(Math.max(xMin, yMin))}" y1="${yScale(Math.max(xMin, yMin))}" x2="${xScale(Math.min(xMax, yMax))}" y2="${yScale(Math.min(xMax, yMax))}" />
       <text class="plot-diagonal-label" x="${xScale(7.2)}" y="${yScale(7.2) - 8}">y = x</text>`
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
