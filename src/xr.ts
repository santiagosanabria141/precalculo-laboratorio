export type XRCase = "cylinder" | "cone" | "paraboloid";

export type XRParams = {
  radius: number;
  height: number;
};

export type XRSceneState = {
  progress: number;
  rotation: number;
  tilt: number;
  zoom: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function project(x: number, y: number, z: number, state: XRSceneState, cx: number, cy: number, unit: number): [number, number] {
  const angle = state.rotation;
  const rx = x * Math.cos(angle) - z * Math.sin(angle);
  const rz = x * Math.sin(angle) + z * Math.cos(angle);
  return [cx + rx * unit * state.zoom, cy - (y - rz * 0.42 + state.tilt * rz * 0.02) * unit * state.zoom];
}

function line(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, color: string, width = 2, dashed = false): void {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [6, 7] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, fill = ""): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function renderXRScene(canvas: HTMLCanvasElement, type: XRCase, params: XRParams, state: XRSceneState): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width || 700);
  const height = Math.max(320, rect.height || 480);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * .5, height * .45, 10, width * .5, height * .45, width * .7);
  gradient.addColorStop(0, "rgba(18, 63, 99, .7)");
  gradient.addColorStop(1, "rgba(3, 13, 30, .98)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(71, 205, 238, .12)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

  const cx = width / 2;
  const base = height * .7;
  const unit = Math.min(width, height) * .045;
  const r = params.radius;
  const h = params.height * state.progress;
  const cyan = "#47e7ed";
  const lime = "#c2f23e";
  const orange = "#ff9a52";
  const white = "#f5fbff";
  const glow = ctx.createRadialGradient(cx, base, 4, cx, base, width * .42);
  glow.addColorStop(0, "rgba(71, 231, 237, .2)"); glow.addColorStop(1, "rgba(71, 231, 237, 0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);

  if (type === "cylinder") {
    const depth = r * unit * .9;
    const top = base - h * unit;
    ctx.fillStyle = "rgba(71,231,237,.14)";
    ctx.beginPath(); ctx.ellipse(cx, base, r * unit, depth * .3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - r * unit, base); ctx.lineTo(cx - r * unit, top); ctx.ellipse(cx, top, r * unit, depth * .3, 0, Math.PI, Math.PI * 2); ctx.lineTo(cx + r * unit, base); ctx.ellipse(cx, base, r * unit, depth * .3, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    line(ctx, [[cx - r * unit, base], [cx - r * unit, top]], cyan, 2.5); line(ctx, [[cx + r * unit, base], [cx + r * unit, top]], cyan, 2.5);
    ellipse(ctx, cx, top, r * unit, depth * .3, lime, "rgba(194,242,62,.12)");
    ellipse(ctx, cx, base, r * unit, depth * .3, cyan);
    line(ctx, [[cx + r * unit + 20, base], [cx + r * unit + 20, top]], orange, 2, true);
    ctx.fillStyle = orange; ctx.font = "600 13px DM Mono, monospace"; ctx.fillText(`h = ${params.height.toFixed(1)}`, cx + r * unit + 30, (base + top) / 2);
  } else if (type === "cone") {
    const top = base - h * unit;
    ctx.fillStyle = "rgba(255,154,82,.16)";
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + r * unit, base); ctx.ellipse(cx, base, r * unit, r * unit * .28, 0, 0, Math.PI); ctx.lineTo(cx - r * unit, base); ctx.closePath(); ctx.fill();
    line(ctx, [[cx, top], [cx - r * unit, base]], orange, 2.5); line(ctx, [[cx, top], [cx + r * unit, base]], orange, 2.5);
    ellipse(ctx, cx, base, r * unit, r * unit * .28, cyan, "rgba(71,231,237,.14)");
    line(ctx, [[cx + r * unit + 20, base], [cx + r * unit + 20, top]], lime, 2, true);
    ctx.fillStyle = lime; ctx.font = "600 13px DM Mono, monospace"; ctx.fillText(`h = ${params.height.toFixed(1)}`, cx + r * unit + 30, (base + top) / 2);
  } else {
    const top = base - h * unit;
    const rings = 9;
    for (let i = 0; i <= rings; i += 1) {
      const t = i / rings;
      const y = base - (h * unit) * t;
      const ringR = r * unit * Math.sqrt(t) * state.progress;
      if (ringR > 1) ellipse(ctx, cx, y, ringR, ringR * .28, i === rings ? lime : cyan, i === rings ? "rgba(194,242,62,.1)" : "");
    }
    line(ctx, [[cx - r * unit, base], [cx, top], [cx + r * unit, base]], cyan, 2.5);
    line(ctx, [[cx + r * unit + 20, base], [cx + r * unit + 20, top]], orange, 2, true);
    ctx.fillStyle = orange; ctx.font = "600 13px DM Mono, monospace"; ctx.fillText(`h = ${params.height.toFixed(1)}`, cx + r * unit + 30, (base + top) / 2);
  }

  ctx.fillStyle = white; ctx.font = "600 14px DM Mono, monospace";
  ctx.fillText(state.progress < .05 ? "FIGURA 2D" : state.progress > .95 ? "SÓLIDO 3D" : "TRANSFORMACIÓN", 24, 32);
  ctx.fillStyle = "rgba(245,251,255,.6)"; ctx.font = "12px DM Mono, monospace";
  ctx.fillText(`${Math.round(state.progress * 100)}% construido · arrastra para rotar · rueda para zoom`, 24, height - 20);
}

export function normalizeXRZoom(value: number): number {
  return clamp(value, .65, 2.2);
}
