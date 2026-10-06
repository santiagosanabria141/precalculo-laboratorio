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
  autoFrame?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
};

const escapeSvg = (text: string) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}[character] ?? character));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function niceTickStep(span: number): number {
  const roughStep = span / 18;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 0.0001)));
  const normalized = roughStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function formatTick(value: number): string {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function valuesForAxis(min: number, max: number, sharedStep?: number): { values: number[]; step: number } {
  const step = sharedStep ?? niceTickStep(max - min);
  const first = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let value = first; value <= max + step * 0.001 && values.length < 80; value += step) {
    values.push(Number(value.toFixed(8)));
  }
  return { values, step };
}

function dataBounds(options: PlotOptions): { xMin: number; xMax: number; yMin: number; yMax: number } | null {
  const points = [
    ...(options.series ?? []).flatMap((series) => series.points),
    ...(options.markers ?? []),
  ].filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!points.length) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const rawXMin = Math.min(...xs);
  const rawXMax = Math.max(...xs);
  const rawYMin = Math.min(...ys);
  const rawYMax = Math.max(...ys);
  const xMargin = Math.max(1, (rawXMax - rawXMin) * 0.16);
  const yMargin = Math.max(1, (rawYMax - rawYMin) * 0.16);
  return {
    xMin: rawXMin - xMargin,
    xMax: rawXMax + xMargin,
    yMin: rawYMin - yMargin,
    yMax: rawYMax + yMargin,
  };
}

export function renderPlot(target: HTMLElement, options: PlotOptions): void {
  const width = 820;
  const height = 452;
  const padding = { top: 42, right: 30, bottom: 44, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const bounds = options.autoFrame ? dataBounds(options) : null;
  const baseXMin = options.xMin ?? bounds?.xMin ?? -10;
  const baseXMax = options.xMax ?? bounds?.xMax ?? 10;
  const baseYMin = options.yMin ?? bounds?.yMin ?? -10;
  const baseYMax = options.yMax ?? bounds?.yMax ?? 10;
  const baseXSpan = Math.max(baseXMax - baseXMin, 1);
  const baseYSpan = Math.max(baseYMax - baseYMin, 1);
  const zoom = clamp(options.zoom ?? 1, 0.5, 4);
  const requestedXSpan = baseXSpan / zoom;
  const requestedYSpan = baseYSpan / zoom;
  const requestedXCenter = (baseXMin + baseXMax) / 2;
  const requestedYCenter = (baseYMin + baseYMax) / 2;
  const requestedXMin = requestedXCenter - requestedXSpan / 2;
  const requestedXMax = requestedXCenter + requestedXSpan / 2;
  const requestedYMin = requestedYCenter - requestedYSpan / 2;
  const requestedYMax = requestedYCenter + requestedYSpan / 2;
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
  const sharedGridStep = niceTickStep(Math.max(xSpan, ySpan));
  const xAxis = valuesForAxis(xMin, xMax, sharedGridStep);
  const yAxis = valuesForAxis(yMin, yMax, sharedGridStep);
  const isZero = (value: number, step: number) => Math.abs(value) < step * 0.001;

  const xGrid = xAxis.values
    .map((value) => `<line class="plot-grid ${isZero(value, xAxis.step) ? "plot-axis" : ""}" x1="${xScale(value)}" x2="${xScale(value)}" y1="${padding.top}" y2="${height - padding.bottom}" />
      ${!isZero(value, xAxis.step) ? `<text class="plot-tick" x="${xScale(value)}" y="${height - padding.bottom + 22}" text-anchor="middle">${formatTick(value)}</text>` : ""}`)
    .join("");
  const yGrid = yAxis.values
    .map((value) => `<line class="plot-grid ${isZero(value, yAxis.step) ? "plot-axis" : ""}" x1="${padding.left}" x2="${width - padding.right}" y1="${yScale(value)}" y2="${yScale(value)}" />
      ${!isZero(value, yAxis.step) ? `<text class="plot-tick" x="${padding.left - 12}" y="${yScale(value) + 4}" text-anchor="end">${formatTick(value)}</text>` : ""}`)
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
  const diagonalLabelValue = clamp(7.2, diagonalStart, diagonalEnd);
  const diagonal = options.diagonal
    ? `<line class="plot-diagonal" x1="${xScale(diagonalStart)}" y1="${yScale(diagonalStart)}" x2="${xScale(diagonalEnd)}" y2="${yScale(diagonalEnd)}" />
       <text class="plot-diagonal-label" x="${xScale(diagonalLabelValue)}" y="${yScale(diagonalLabelValue) - 8}">y = x</text>`
    : "";

  const markers = (options.markers ?? []).filter(inFrame).map((marker) => `
    <g class="plot-marker">
      <circle cx="${xScale(marker.x)}" cy="${yScale(marker.y)}" r="6.6" fill="${marker.color ?? "#ffca6b"}" />
      <circle cx="${xScale(marker.x)}" cy="${yScale(marker.y)}" r="11" fill="none" stroke="${marker.color ?? "#ffca6b"}" opacity="0.35" />
      <text x="${xScale(marker.x) + 11}" y="${yScale(marker.y) - 12}">${escapeSvg(marker.label)}</text>
    </g>`).join("");

  const legend = (options.series ?? []).filter((series) => series.label).map((series) => `
    <span class="plot-legend-item"><i style="background:${series.color};${series.dashed ? "border-top:2px dashed " + series.color + "; background:transparent" : ""}"></i>${escapeSvg(series.label ?? "")}</span>`).join("");
  const zoomPercent = `${Math.round(zoom * 100)}%`;

  target.innerHTML = `
    <div class="plot-header">
      <div><p class="eyebrow">Plano cartesiano</p><h3>${escapeSvg(options.title)}</h3>${options.subtitle ? `<p>${escapeSvg(options.subtitle)}</p>` : ""}</div>
      <div class="plot-header-tools">
        <div class="plot-zoom" aria-label="Controles de zoom">
          <button type="button" data-plot-zoom="out" aria-label="Alejar" ${zoom <= 0.5 ? "disabled" : ""}>−</button>
          <span aria-live="polite">${zoomPercent}</span>
          <button type="button" data-plot-zoom="in" aria-label="Acercar" ${zoom >= 4 ? "disabled" : ""}>+</button>
          <button type="button" data-plot-zoom="reset" aria-label="Restablecer zoom">1:1</button>
        </div>
        <div class="plot-legend">${legend}</div>
      </div>
    </div>
    <div class="plot-frame">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeSvg(options.title)}" preserveAspectRatio="xMidYMid meet">
        <defs><clipPath id="plot-clip"><rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="10" /></clipPath></defs>
        <rect class="plot-bg" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        ${xGrid}${yGrid}
        ${diagonal}
        <g clip-path="url(#plot-clip)">${seriesMarkup}${markers}</g>
        <text class="plot-axis-label" x="${width - padding.right + 3}" y="${clamp(yScale(0), padding.top + 12, height - padding.bottom - 6)}">x</text>
        <text class="plot-axis-label" x="${clamp(xScale(0) + 10, padding.left + 8, width - padding.right - 8)}" y="${padding.top + 10}">y</text>
      </svg>
    </div>`;

  target.querySelectorAll<HTMLButtonElement>("[data-plot-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.plotZoom;
      const nextZoom = action === "reset" ? 1 : action === "in" ? zoom * 1.5 : zoom / 1.5;
      options.onZoomChange?.(clamp(nextZoom, 0.5, 4));
    });
  });
}
