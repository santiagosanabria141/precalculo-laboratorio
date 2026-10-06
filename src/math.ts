export type Point = { x: number; y: number };

export type SampledCurve = {
  points: Point[];
  domainIntervals: Array<[number, number]>;
  visibleRange: [number, number] | null;
};

export type InverseResult = {
  available: boolean;
  points: Point[];
  message: string;
};

const MAX_EXPRESSION_LENGTH = 140;
const ALLOWED_WORDS = new Set(["x", "sin", "cos", "tan", "sqrt", "abs", "log", "ln", "exp", "pi"]);

export function formatNumber(value: number, digits = 2): string {
  const normalized = Math.abs(value) < 0.000001 ? 0 : value;
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(normalized);
}

export function compileExpression(rawExpression: string): (x: number) => number {
  const source = rawExpression
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/,/g, ".");

  if (!source) throw new Error("Escribe una expresión antes de graficar.");
  if (source.length > MAX_EXPRESSION_LENGTH) throw new Error("Usa una expresión de hasta 140 caracteres.");
  if (!/^[0-9a-zA-Z+\-*/^().\s]+$/.test(source)) {
    throw new Error("Solo se permiten números, x, operaciones y funciones matemáticas comunes.");
  }

  const words = source.match(/[a-zA-Z]+/g) ?? [];
  if (words.some((word) => !ALLOWED_WORDS.has(word.toLowerCase()))) {
    throw new Error("Usa sin, cos, tan, sqrt, abs, log, ln, exp, pi y la variable x.");
  }

  const replacements: Record<string, string> = {
    sin: "Math.sin",
    cos: "Math.cos",
    tan: "Math.tan",
    sqrt: "Math.sqrt",
    abs: "Math.abs",
    log: "Math.log10",
    ln: "Math.log",
    exp: "Math.exp",
    pi: "Math.PI",
  };

  let expression = source.toLowerCase().replace(/\^/g, "**");
  expression = expression.replace(/\b(sin|cos|tan|sqrt|abs|log|ln|exp|pi)\b/g, (word) => replacements[word]);

  let evaluator: (x: number) => unknown;
  try {
    evaluator = new Function("x", `"use strict"; return (${expression});`) as (x: number) => unknown;
    evaluator(1);
  } catch {
    throw new Error("No se pudo interpretar esa expresión. Prueba, por ejemplo, x^2 - 4.");
  }

  return (x: number) => {
    try {
      const result = evaluator(x);
      return typeof result === "number" && Number.isFinite(result) ? result : Number.NaN;
    } catch {
      return Number.NaN;
    }
  };
}

export function sampleFunction(
  evaluator: (x: number) => number,
  xMin = -10,
  xMax = 10,
  yMin = -10,
  yMax = 10,
  samples = 720,
): SampledCurve {
  const allPoints: Point[] = [];
  const visiblePoints: Point[] = [];
  const intervals: Array<[number, number]> = [];
  const step = (xMax - xMin) / samples;
  let intervalStart: number | null = null;
  let previousX: number | null = null;
  let previousValid: Point | null = null;

  for (let index = 0; index <= samples; index += 1) {
    const x = xMin + index * step;
    const y = evaluator(x);
    const isValid = Number.isFinite(y) && Math.abs(y) < 1_000_000;

    if (isValid) {
      const current = { x, y };
      const discontinuity = previousValid !== null
        && Math.sign(y) !== Math.sign(previousValid.y)
        && Math.abs(y - previousValid.y) > 40;
      if (discontinuity && intervalStart !== null && previousX !== null) {
        intervals.push([intervalStart, previousX]);
        intervalStart = x;
        allPoints.push({ x: Number.NaN, y: Number.NaN });
      }
      allPoints.push(current);
      if (intervalStart === null) intervalStart = x;
      previousX = x;
      previousValid = current;
      if (y >= yMin && y <= yMax) visiblePoints.push({ x, y });
    } else if (intervalStart !== null && previousX !== null) {
      intervals.push([intervalStart, previousX]);
      intervalStart = null;
      previousX = null;
      if (previousValid !== null) allPoints.push({ x: Number.NaN, y: Number.NaN });
      previousValid = null;
    }
  }

  if (intervalStart !== null && previousX !== null) intervals.push([intervalStart, previousX]);

  const rangeCandidates = visiblePoints.map((point) => point.y);
  const visibleRange = rangeCandidates.length
    ? [Math.min(...rangeCandidates), Math.max(...rangeCandidates)] as [number, number]
    : null;

  return { points: allPoints, domainIntervals: intervals, visibleRange };
}

export function determineInverse(points: Point[], domainIntervals: Array<[number, number]>): InverseResult {
  const validPoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (validPoints.length < 3) {
    return { available: false, points: [], message: "No hay suficientes puntos válidos para estimar una inversa." };
  }

  let direction = 0;
  let directionChanges = 0;
  let previous: Point | null = null;

  for (const current of points) {
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) {
      previous = null;
      continue;
    }
    if (previous === null) {
      previous = current;
      continue;
    }
    const delta = current.y - previous.y;
    if (Math.abs(delta) > 0.035) {
      const nextDirection = delta > 0 ? 1 : -1;
      if (direction !== 0 && nextDirection !== direction) directionChanges += 1;
      direction = nextDirection;
    }
    previous = current;
  }

  if (directionChanges > 0 || domainIntervals.length === 0) {
    return {
      available: false,
      points: [],
      message: "La gráfica no parece pasar la prueba de la recta horizontal. Restringe el dominio antes de definir una inversa que sea función.",
    };
  }

  return {
    available: true,
    points: points.map(({ x, y }) => ({ x: y, y: x })),
    message: "La inversa se muestra como una estimación numérica y refleja la curva respecto de y = x.",
  };
}

export function formatIntervals(intervals: Array<[number, number]>): string {
  if (!intervals.length) return "sin valores reales en esta ventana";
  if (intervals.length > 3) return "varios intervalos dentro de la ventana";
  return intervals
    .map(([start, end], index) => `${index === 0 ? "[" : "("}${formatNumber(start, 1)}, ${formatNumber(end, 1)}${index === intervals.length - 1 ? "]" : ")"}`)
    .join(" ∪ ");
}

export function formatRange(range: [number, number] | null): string {
  if (!range) return "sin valores visibles";
  return `[${formatNumber(range[0], 2)}, ${formatNumber(range[1], 2)}]`;
}

export function distanceBetween(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function linePoints(slope: number, intercept: number, min = -10, max = 10): Point[] {
  return [
    { x: min, y: slope * min + intercept },
    { x: max, y: slope * max + intercept },
  ];
}

export function circlePoints(centerX: number, centerY: number, radius: number): Point[] {
  return Array.from({ length: 240 }, (_, index) => {
    const angle = (index / 239) * Math.PI * 2;
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });
}

export function parabolaPoints(a: number, h: number, k: number): Point[] {
  return Array.from({ length: 320 }, (_, index) => {
    const x = -10 + (index / 319) * 20;
    return { x, y: a * (x - h) ** 2 + k };
  });
}

export function ellipsePoints(h: number, k: number, a: number, b: number): Point[] {
  return Array.from({ length: 240 }, (_, index) => {
    const angle = (index / 239) * Math.PI * 2;
    return { x: h + a * Math.cos(angle), y: k + b * Math.sin(angle) };
  });
}

export function hyperbolaBranches(h: number, k: number, a: number, b: number): [Point[], Point[], Point[], Point[]] {
  const branch = (direction: -1 | 1, vertical: -1 | 1): Point[] => {
    const points: Point[] = [];
    for (let value = a; value <= 11; value += 0.035) {
      const x = h + direction * value;
      const yOffset = b * Math.sqrt((value * value) / (a * a) - 1);
      points.push({ x, y: k + vertical * yOffset });
    }
    return points;
  };
  return [branch(-1, 1), branch(-1, -1), branch(1, 1), branch(1, -1)];
}
