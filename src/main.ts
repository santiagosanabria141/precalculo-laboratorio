import "./styles.css";
import {
  circlePoints,
  compileExpression,
  determineInverse,
  distanceBetween,
  ellipsePoints,
  formatIntervals,
  formatNumber,
  formatRange,
  hyperbolaBranches,
  linePoints,
  parabolaPoints,
  sampleFunction,
  type Point,
} from "./math";
import { renderPlot } from "./plot";

type Section = "algebra" | "geometry" | "functions";
type GeometryMode = "points" | "line" | "circle" | "parabola" | "ellipse" | "hyperbola";
type AlgebraMode = keyof typeof algebraLessons;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("No se encontró el contenedor de la aplicación.");

const state = {
  active: "algebra" as Section,
  algebraMode: "factorizacion" as AlgebraMode,
  geometryMode: "points" as GeometryMode,
  expression: "x^2 - 4",
  showInverse: true,
  tutorResponse: "Estoy listo para darte una pista. Elige una pregunta o escribe la tuya.",
  pointA: { x: -4, y: 1 },
  pointB: { x: 3, y: 5 },
  line: { m: 1.5, b: -1 },
  circle: { h: 0, k: 0, r: 4 },
  parabola: { a: 0.45, h: 0, k: -3 },
  ellipse: { h: 0, k: 0, a: 6, b: 3 },
  hyperbola: { h: 0, k: 0, a: 3, b: 2 },
};

const sectionMeta: Record<Section, { number: string; label: string; description: string; icon: string }> = {
  algebra: { number: "01", label: "Álgebra", description: "Manipula símbolos con intención", icon: "∑" },
  geometry: { number: "02", label: "Geometría analítica", description: "Convierte ecuaciones en espacio", icon: "⌁" },
  functions: { number: "03", label: "Funciones", description: "Observa reglas en movimiento", icon: "ƒ" },
};

const algebraLessons = {
  operaciones: {
    title: "Expresiones y operaciones",
    formula: "(2x + 3)(x − 4) = 2x² − 5x − 12",
    prompt: "Distribuye cada término antes de combinar semejantes.",
    steps: ["Multiplica 2x · x y 2x · (−4).", "Multiplica 3 · x y 3 · (−4).", "Agrupa 2x² − 8x + 3x − 12."],
  },
  factorizacion: {
    title: "Factorización por diferencia de cuadrados",
    formula: "x² − 25 = (x − 5)(x + 5)",
    prompt: "Busca dos cuadrados perfectos unidos por una resta.",
    steps: ["Reconoce x² como (x)² y 25 como (5)².", "Aplica a² − b² = (a − b)(a + b).", "Comprueba multiplicando los binomios."],
  },
  racionalizacion: {
    title: "Racionalización de un denominador",
    formula: "1 / (√x − 1) · (√x + 1)/(√x + 1) = (√x + 1)/(x − 1), con x ≥ 0 y x ≠ 1",
    prompt: "El conjugado cambia el signo entre los dos términos.",
    steps: ["Identifica el binomio √x − 1 y su restricción x ≠ 1.", "Multiplica arriba y abajo por su conjugado √x + 1.", "Usa (a − b)(a + b) = a² − b²."],
  },
  exponentes: {
    title: "Propiedades de exponentes",
    formula: "x³ · x⁻⁵ = x⁽³⁻⁵⁾ = x⁻² = 1/x²",
    prompt: "Al multiplicar potencias de la misma base, se suman exponentes.",
    steps: ["Conserva la base x.", "Suma los exponentes: 3 + (−5).", "Reescribe el exponente negativo como recíproco."],
  },
};

function renderApp(): void {
  app!.innerHTML = `
    <div class="cosmic-backdrop" aria-hidden="true"></div>
    <div class="app-shell">
      <aside class="side-rail">
        <a class="brand" href="#inicio" aria-label="Inicio de PreCálculo">
          <span class="brand-orbit"><i>∿</i></span>
          <span><strong>PreCálculo</strong><small>laboratorio visual</small></span>
        </a>
        <nav class="section-nav" aria-label="Áreas de estudio">
          ${Object.entries(sectionMeta).map(([key, item]) => `
            <button class="nav-item ${state.active === key ? "is-active" : ""}" data-section="${key}">
              <span class="nav-number">${item.number}</span><span class="nav-icon">${item.icon}</span>
              <span><strong>${item.label}</strong><small>${item.description}</small></span>
            </button>`).join("")}
        </nav>
        <div class="rail-bottom">
          <div class="orbit-pulse"><span></span><span></span><span></span></div>
          <p><strong>Modo exploración</strong><br />Cambia un valor. Mira qué ocurre.</p>
        </div>
      </aside>
      <div class="main-column">
        <header class="topbar" id="inicio">
          <div class="crumb"><span class="signal-dot"></span> PRE-CÁLCULO / ${sectionMeta[state.active].label.toUpperCase()}</div>
          <div class="topbar-actions"><span class="progress-chip">3 módulos conectados</span><button class="help-button" data-focus-tutor aria-label="Abrir tutor contextual">? <span>Tutor</span></button></div>
        </header>
        <main class="content-area">
          ${state.active === "algebra" ? algebraView() : ""}
          ${state.active === "geometry" ? geometryView() : ""}
          ${state.active === "functions" ? functionsView() : ""}
        </main>
        ${tutorView()}
      </div>
    </div>`;

  bindNavigation();
  setText("#tutor-response", state.tutorResponse);
  bindTutor();
  if (state.active === "algebra") bindAlgebra();
  if (state.active === "geometry") bindGeometry();
  if (state.active === "functions") bindFunctions();
}

function hero(kicker: string, title: string, accent: string, description: string, badge: string): string {
  return `<section class="module-hero">
    <div class="hero-copy"><p class="eyebrow">${kicker}</p><h1>${title}<em>${accent}</em></h1><p>${description}</p></div>
    <div class="hero-badge"><span class="hero-badge-orbit"></span><strong>${badge}</strong><small>experimento activo</small></div>
  </section>`;
}

function algebraView(): string {
  const lesson = algebraLessons[state.algebraMode];
  return `${hero("MÓDULO 01", "El álgebra es", "una caja de herramientas.", "No memorices pasos aislados: identifica la estructura y elige la herramienta que la transforma.", "4 técnicas")}
    <section class="concept-strip" aria-label="Temas de álgebra">
      <button class="concept-chip ${state.algebraMode === "operaciones" ? "is-selected" : ""}" data-algebra="operaciones">Expresiones</button>
      <button class="concept-chip ${state.algebraMode === "factorizacion" ? "is-selected" : ""}" data-algebra="factorizacion">Factorización</button>
      <button class="concept-chip ${state.algebraMode === "racionalizacion" ? "is-selected" : ""}" data-algebra="racionalizacion">Racionalización</button>
      <button class="concept-chip ${state.algebraMode === "exponentes" ? "is-selected" : ""}" data-algebra="exponentes">Exponentes</button>
    </section>
    <section class="algebra-lab">
      <div class="lesson-card glow-card">
        <div class="card-kicker"><span>CUADERNO DE PASOS</span><span class="status-live">● en foco</span></div>
        <h2 id="algebra-title">${lesson.title}</h2>
        <div class="big-formula" id="algebra-formula">${lesson.formula}</div>
        <p class="lesson-prompt" id="algebra-prompt">${lesson.prompt}</p>
        <ol class="lesson-steps" id="algebra-steps">${lesson.steps.map((step) => `<li>${step}</li>`).join("")}</ol>
        <div class="formula-footer"><span>Consejo de laboratorio</span><span>Comprueba siempre sustituyendo un valor.</span></div>
      </div>
      <aside class="algebra-reference">
        <p class="eyebrow">MAPA RÁPIDO</p>
        <div class="reference-item"><span>a⁰ = 1</span><p>Exponente cero</p></div>
        <div class="reference-item"><span>a⁻ⁿ = 1/aⁿ</span><p>Exponente negativo</p></div>
        <div class="reference-item"><span>(aᵐ)ⁿ = aᵐⁿ</span><p>Potencia de potencia</p></div>
        <div class="rule-note"><strong>Pregunta guía</strong><p>¿Qué patrón puedes nombrar antes de operar?</p></div>
      </aside>
    </section>`;
}

function geometryView(): string {
  return `${hero("MÓDULO 02", "Dibuja la ecuación", "para entenderla.", "Cada parámetro deja una huella en el plano. Modifícalo y descubre cuál.", "Plano activo")}
    <section class="geometry-tabs" aria-label="Exploradores de geometría">
      ${([
        ["points", "Puntos y distancia"], ["line", "La recta"], ["circle", "Circunferencia"], ["parabola", "Parábola"], ["ellipse", "Elipse"], ["hyperbola", "Hipérbola"],
      ] as Array<[GeometryMode, string]>).map(([mode, label]) => `<button data-geometry-mode="${mode}" class="geometry-tab ${state.geometryMode === mode ? "is-active" : ""}">${label}</button>`).join("")}
    </section>
    <section class="workspace-grid geometry-workspace">
      <div class="control-panel"><div class="panel-heading"><p class="eyebrow">PARÁMETROS</p><h2 id="geometry-label"></h2></div><div id="geometry-controls"></div><div class="formula-panel"><span>ECUACIÓN</span><strong id="geometry-formula"></strong><p id="geometry-insight"></p></div></div>
      <div class="graph-panel"><div id="geometry-plot"></div></div>
    </section>`;
}

function functionsView(): string {
  return `${hero("MÓDULO 03", "Una regla cobra vida", "cuando la puedes ver.", "Escribe una función, identifica qué x son posibles y comprueba si puede deshacerse con una inversa.", "Graficador")}
    <section class="function-toolbar">
      <form class="expression-form" id="expression-form">
        <label for="expression">f(x) =</label><input id="expression" autocomplete="off" aria-label="Expresión de la función" />
        <button class="primary-button" type="submit">Graficar <span>↗</span></button>
      </form>
      <div class="preset-row"><span>Prueba:</span><button data-preset="x^2 - 4">cuadrática</button><button data-preset="2*x - 3">lineal</button><button data-preset="sqrt(x)">raíz</button><button data-preset="sin(x)">seno</button><button data-preset="1/x">racional</button></div>
    </section>
    <section class="workspace-grid function-workspace">
      <div class="graph-panel function-graph"><div id="function-plot"></div></div>
      <aside class="function-inspector">
        <div class="inspector-header"><p class="eyebrow">LECTURA DE LA FUNCIÓN</p><label class="toggle"><input id="inverse-toggle" type="checkbox" ${state.showInverse ? "checked" : ""}/><span></span> ver inversa</label></div>
        <div class="metric-card"><span>DOMINIO · VENTANA</span><strong id="domain-value">—</strong><p>Valores de x detectados entre −10 y 10.</p></div>
        <div class="metric-card"><span>RANGO · VENTANA</span><strong id="range-value">—</strong><p>Valores de y visibles en el plano actual.</p></div>
        <div class="inverse-card" id="inverse-card"></div>
        <div class="input-guide"><strong>Sintaxis útil</strong><p>Usa <code>x^2</code>, <code>sqrt(x)</code>, <code>sin(x)</code>, <code>abs(x)</code> y <code>pi</code>.</p></div>
      </aside>
    </section>`;
}

function tutorView(): string {
  const topic = sectionMeta[state.active].label;
  return `<aside class="tutor-dock" id="tutor-dock">
    <div class="tutor-mark">✦</div><div class="tutor-copy"><p><strong>Tutor contextual</strong><span> · ${topic}</span></p><div class="tutor-response" id="tutor-response"></div></div>
    <form id="tutor-form"><input id="tutor-input" placeholder="Escribe una duda…" aria-label="Pregunta para el tutor"/><button type="submit" aria-label="Enviar pregunta">↑</button></form>
    <div class="tutor-suggestions"><button data-tutor-question="Dame una pista">Pista</button><button data-tutor-question="¿Cómo identifico el dominio?">Dominio</button><button data-tutor-question="¿Por qué no existe la inversa?">Inversa</button></div>
  </aside>`;
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.active = button.dataset.section as Section;
      state.tutorResponse = `Ahora estás en ${sectionMeta[state.active].label}. Describe lo que observas y te daré una pista para empezar.`;
      renderApp();
    });
  });
  document.querySelector<HTMLButtonElement>("[data-focus-tutor]")?.addEventListener("click", () => {
    document.querySelector<HTMLInputElement>("#tutor-input")?.focus();
  });
}

function bindAlgebra(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-algebra]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.algebra as keyof typeof algebraLessons;
      const lesson = algebraLessons[key];
      state.algebraMode = key;
      document.querySelectorAll("[data-algebra]").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      setText("#algebra-title", lesson.title);
      setText("#algebra-formula", lesson.formula);
      setText("#algebra-prompt", lesson.prompt);
      const steps = document.querySelector<HTMLOListElement>("#algebra-steps");
      if (steps) steps.innerHTML = lesson.steps.map((step) => `<li>${step}</li>`).join("");
      state.tutorResponse = `Estás explorando ${lesson.title.toLowerCase()}. ${lesson.prompt}`;
      setText("#tutor-response", state.tutorResponse);
    });
  });
}

function bindGeometry(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-geometry-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.geometryMode = button.dataset.geometryMode as GeometryMode;
      renderApp();
    });
  });
  renderGeometryLab();
}

function geometryControl(label: string, key: string, value: number, min: number, max: number, step = 1): string {
  return `<label class="range-control"><span>${label}<b id="value-${key}">${formatNumber(value, 2)}</b></span><input data-geo-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /></label>`;
}

function renderGeometryLab(): void {
  const controls = document.querySelector<HTMLDivElement>("#geometry-controls");
  if (!controls) return;
  const mode = state.geometryMode;
  const controlsByMode: Record<GeometryMode, string> = {
    points: `<div class="point-grid">
      ${numberField("x₁", "pointA.x", state.pointA.x)}${numberField("y₁", "pointA.y", state.pointA.y)}
      ${numberField("x₂", "pointB.x", state.pointB.x)}${numberField("y₂", "pointB.y", state.pointB.y)}
      </div>`,
    line: geometryControl("Pendiente m", "line.m", state.line.m, -4, 4, 0.25) + geometryControl("Ordenada b", "line.b", state.line.b, -6, 6, 0.5),
    circle: geometryControl("Centro h", "circle.h", state.circle.h, -5, 5) + geometryControl("Centro k", "circle.k", state.circle.k, -5, 5) + geometryControl("Radio r", "circle.r", state.circle.r, 1, 8, 0.5),
    parabola: geometryControl("Apertura a", "parabola.a", state.parabola.a, -1.5, 1.5, 0.15) + geometryControl("Vértice h", "parabola.h", state.parabola.h, -5, 5) + geometryControl("Vértice k", "parabola.k", state.parabola.k, -5, 5),
    ellipse: geometryControl("Centro h", "ellipse.h", state.ellipse.h, -4, 4) + geometryControl("Centro k", "ellipse.k", state.ellipse.k, -4, 4) + geometryControl("Semieje a", "ellipse.a", state.ellipse.a, 1, 8, 0.5) + geometryControl("Semieje b", "ellipse.b", state.ellipse.b, 1, 8, 0.5),
    hyperbola: geometryControl("Centro h", "hyperbola.h", state.hyperbola.h, -4, 4) + geometryControl("Centro k", "hyperbola.k", state.hyperbola.k, -4, 4) + geometryControl("Semieje a", "hyperbola.a", state.hyperbola.a, 1, 6, 0.5) + geometryControl("Semieje b", "hyperbola.b", state.hyperbola.b, 1, 6, 0.5),
  };
  controls.innerHTML = controlsByMode[mode];

  document.querySelectorAll<HTMLInputElement>("[data-geo-key]").forEach((input) => {
    input.addEventListener("input", () => {
      let nextValue = Number(input.value);
      if (input.dataset.geoKey === "parabola.a" && Math.abs(nextValue) < 0.001) {
        nextValue = 0.15;
        input.value = String(nextValue);
      }
      setNestedState(input.dataset.geoKey ?? "", nextValue);
      setText(`#value-${input.dataset.geoKey}`, formatNumber(nextValue, 2));
      renderGeometryPlot();
    });
  });
  document.querySelectorAll<HTMLInputElement>("[data-point-key]").forEach((input) => {
    input.addEventListener("input", () => {
      setNestedState(input.dataset.pointKey ?? "", Number(input.value));
      renderGeometryPlot();
    });
  });
  renderGeometryPlot();
}

function numberField(label: string, key: string, value: number): string {
  return `<label class="number-field"><span>${label}</span><input type="number" data-point-key="${key}" value="${value}" min="-10" max="10" step="1" /></label>`;
}

function renderGeometryPlot(): void {
  const target = document.querySelector<HTMLElement>("#geometry-plot");
  if (!target) return;
  const label = document.querySelector<HTMLElement>("#geometry-label");
  const formula = document.querySelector<HTMLElement>("#geometry-formula");
  const insight = document.querySelector<HTMLElement>("#geometry-insight");
  const accent = "#4de2c5";

  if (state.geometryMode === "points") {
    const distance = distanceBetween(state.pointA, state.pointB);
    if (label) label.textContent = "Distancia entre dos puntos";
    if (formula) formula.textContent = `d = √((${state.pointB.x} − ${state.pointA.x})² + (${state.pointB.y} − ${state.pointA.y})²) = ${formatNumber(distance, 2)}`;
    if (insight) insight.textContent = "La distancia es la hipotenusa formada por los cambios horizontal y vertical.";
    renderPlot(target, { title: "Dos puntos, una distancia", subtitle: `Δx = ${state.pointB.x - state.pointA.x} · Δy = ${state.pointB.y - state.pointA.y}`, series: [{ points: [state.pointA, state.pointB], color: "#9a8cff", label: "segmento", width: 2.5 }], markers: [{ ...state.pointA, label: `A(${state.pointA.x}, ${state.pointA.y})`, color: "#ffca6b" }, { ...state.pointB, label: `B(${state.pointB.x}, ${state.pointB.y})`, color: accent }] });
    return;
  }

  if (state.geometryMode === "line") {
    const { m, b } = state.line;
    if (label) label.textContent = "La recta";
    if (formula) formula.textContent = `y = ${formatNumber(m, 2)}x ${b >= 0 ? "+" : "−"} ${formatNumber(Math.abs(b), 2)}`;
    if (insight) insight.textContent = "m controla la inclinación; b decide dónde la recta cruza al eje y.";
    renderPlot(target, { title: "Pendiente e intersección", subtitle: "Mueve m y b para explorar", series: [{ points: linePoints(m, b), color: accent, label: "y = mx + b" }] });
    return;
  }

  if (state.geometryMode === "circle") {
    const { h, k, r } = state.circle;
    if (label) label.textContent = "La circunferencia";
    if (formula) formula.textContent = `(x ${h >= 0 ? "−" : "+"} ${formatNumber(Math.abs(h))})² + (y ${k >= 0 ? "−" : "+"} ${formatNumber(Math.abs(k))})² = ${formatNumber(r)}²`;
    if (insight) insight.textContent = "Todos los puntos se mantienen a la misma distancia del centro.";
    renderPlot(target, { title: "Centro y radio", subtitle: `Centro (${h}, ${k}) · radio ${r}`, series: [{ points: circlePoints(h, k, r), color: accent, label: "circunferencia" }], markers: [{ x: h, y: k, label: "centro", color: "#ffca6b" }] });
    return;
  }

  if (state.geometryMode === "parabola") {
    const { a, h, k } = state.parabola;
    if (label) label.textContent = "La parábola";
    if (formula) formula.textContent = `y = ${formatNumber(a, 2)}(x ${h >= 0 ? "−" : "+"} ${formatNumber(Math.abs(h))})² ${k >= 0 ? "+" : "−"} ${formatNumber(Math.abs(k))}`;
    if (insight) insight.textContent = "a controla la apertura y su signo indica si la parábola mira arriba o abajo.";
    renderPlot(target, { title: "Vértice y apertura", subtitle: "Forma de vértice y = a(x − h)² + k", series: [{ points: parabolaPoints(a, h, k), color: accent, label: "parábola" }], markers: [{ x: h, y: k, label: "vértice", color: "#ffca6b" }] });
    return;
  }

  if (state.geometryMode === "ellipse") {
    const { h, k, a, b } = state.ellipse;
    if (label) label.textContent = "La elipse";
    if (formula) formula.textContent = `(x ${h >= 0 ? "−" : "+"} ${formatNumber(Math.abs(h))})²/${formatNumber(a)}² + (y ${k >= 0 ? "−" : "+"} ${formatNumber(Math.abs(k))})²/${formatNumber(b)}² = 1`;
    if (insight) insight.textContent = "Los semiejes a y b estiran la curva horizontal y verticalmente.";
    renderPlot(target, { title: "Semiejes de la elipse", subtitle: "Observa cómo a y b modifican su contorno", series: [{ points: ellipsePoints(h, k, a, b), color: accent, label: "elipse" }], markers: [{ x: h, y: k, label: "centro", color: "#ffca6b" }] });
    return;
  }

  const { h, k, a, b } = state.hyperbola;
  const [leftUpper, leftLower, rightUpper, rightLower] = hyperbolaBranches(h, k, a, b);
  if (label) label.textContent = "La hipérbola";
  if (formula) formula.textContent = `(x ${h >= 0 ? "−" : "+"} ${formatNumber(Math.abs(h))})²/${formatNumber(a)}² − (y ${k >= 0 ? "−" : "+"} ${formatNumber(Math.abs(k))})²/${formatNumber(b)}² = 1`;
  if (insight) insight.textContent = "Sus ramas se acercan a asíntotas sin alcanzarlas; a y b regulan su apertura.";
  renderPlot(target, { title: "Ramas y asíntotas", subtitle: "Forma horizontal de una hipérbola", series: [{ points: leftUpper, color: accent, label: "rama superior" }, { points: leftLower, color: accent, label: "rama inferior" }, { points: rightUpper, color: accent }, { points: rightLower, color: accent }], markers: [{ x: h, y: k, label: "centro", color: "#ffca6b" }] });
}

function bindFunctions(): void {
  const expressionField = document.querySelector<HTMLInputElement>("#expression");
  if (expressionField) expressionField.value = state.expression;
  document.querySelector<HTMLFormElement>("#expression-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const field = document.querySelector<HTMLInputElement>("#expression");
    if (field) state.expression = field.value;
    renderFunctionPlot();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.expression = button.dataset.preset ?? state.expression;
      const field = document.querySelector<HTMLInputElement>("#expression");
      if (field) field.value = state.expression;
      renderFunctionPlot();
    });
  });
  document.querySelector<HTMLInputElement>("#inverse-toggle")?.addEventListener("change", (event) => {
    state.showInverse = (event.target as HTMLInputElement).checked;
    renderFunctionPlot();
  });
  renderFunctionPlot();
}

function renderFunctionPlot(): void {
  const target = document.querySelector<HTMLElement>("#function-plot");
  const domain = document.querySelector<HTMLElement>("#domain-value");
  const range = document.querySelector<HTMLElement>("#range-value");
  const inverseCard = document.querySelector<HTMLElement>("#inverse-card");
  if (!target || !domain || !range || !inverseCard) return;

  try {
    const evaluator = compileExpression(state.expression);
    const sample = sampleFunction(evaluator);
    const inverse = determineInverse(sample.points, sample.domainIntervals);
    domain.textContent = `x ∈ ${formatIntervals(sample.domainIntervals)}`;
    range.textContent = `y ∈ ${formatRange(sample.visibleRange)}`;

    const series: Array<{ points: Point[]; color: string; label: string; dashed?: boolean }> = [
      { points: sample.points, color: "#4de2c5", label: `f(x) = ${state.expression}` },
    ];
    if (state.showInverse && inverse.available) series.push({ points: inverse.points, color: "#9a8cff", label: "f⁻¹(x)", dashed: true });
    renderPlot(target, { title: "Exploración de f(x)", subtitle: `f(x) = ${state.expression}`, series, diagonal: state.showInverse && inverse.available });

    inverseCard.innerHTML = inverse.available
      ? `<span class="inverse-status success">● Inversa disponible</span><strong>Inversa numérica estimada</strong><p>Dominio de f⁻¹: ${formatRange(sample.visibleRange)} · Rango de f⁻¹: ${formatIntervals(sample.domainIntervals)}.</p>`
      : `<span class="inverse-status warning">▲ Revisa la restricción</span><strong>La inversa no es función en esta ventana</strong><p>${inverse.message}</p>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocurrió un error al evaluar la función.";
    domain.textContent = "—";
    range.textContent = "—";
    inverseCard.innerHTML = `<span class="inverse-status warning">▲ Ajusta la expresión</span><strong>No se pudo graficar</strong><p>${message}</p>`;
    renderPlot(target, { title: "Espera una expresión válida", subtitle: message });
  }
}

function bindTutor(): void {
  document.querySelector<HTMLFormElement>("#tutor-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const field = document.querySelector<HTMLInputElement>("#tutor-input");
    const question = field?.value.trim() ?? "";
    if (!question) return;
    state.tutorResponse = tutorAnswer(question);
    setText("#tutor-response", state.tutorResponse);
    if (field) field.value = "";
  });
  document.querySelectorAll<HTMLButtonElement>("[data-tutor-question]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tutorResponse = tutorAnswer(button.dataset.tutorQuestion ?? "Dame una pista");
      setText("#tutor-response", state.tutorResponse);
    });
  });
}

function tutorAnswer(question: string): string {
  const prompt = question.toLowerCase();
  if (prompt.includes("dominio")) return "Para el dominio, pregunta: ¿qué valor de x rompe la regla? Evita dividir entre cero y, en raíces pares, exige que el radicando sea ≥ 0. El plano te muestra la parte detectada.";
  if (prompt.includes("inversa")) return "Intercambia x e y, pero antes aplica la prueba de la recta horizontal: si una horizontal corta la curva dos veces, necesitarás restringir el dominio para que la inversa sea función.";
  if (state.active === "algebra") return "Pista de álgebra: nombra el patrón antes de calcular. ¿Ves términos semejantes, un producto notable, un factor común o una potencia con la misma base?";
  if (state.active === "geometry") return "Pista geométrica: cambia un solo parámetro y compara la nueva gráfica con la anterior. Así puedes asociar cada letra de la ecuación con un movimiento, tamaño o apertura.";
  return `Para f(x) = ${state.expression}, empieza con tres valores de x sencillos y observa cómo cambia y. Luego busca restricciones: denominadores, raíces y la prueba de la recta horizontal.`;
}

function setNestedState(path: string, value: number): void {
  const [group, key] = path.split(".");
  const root = state as unknown as Record<string, Record<string, number>>;
  if (root[group] && key) root[group][key] = value;
}

function setText(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

renderApp();
