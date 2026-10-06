# Plan de implementación — PreCálculo: Laboratorio visual

## Alcance
Construir una web educativa en español para estudiantes de precálculo, organizada en Álgebra, Geometría analítica y Funciones. La experiencia será interactiva, autocontenida en el navegador y usable en escritorio y móvil.

## Dirección visual aprobada
- **Movimiento:** Cuaderno Cósmico: laboratorio nocturno, preciso y exploratorio.
- **Principios:** claridad académica, exploración con controles directos, contraste alto sin perder calma, y visualización como herramienta de aprendizaje.
- **Paleta:** fondo azul tinta `#0b1226` / `#15224a`; menta luminosa `#4de2c5` para acciones y trazos; lavanda `#9a8cff` para relaciones e inversas; ámbar `#ffca6b` para atención y resultados. La paleta hace que el plano cartesiano sea el protagonista.
- **Layout:** escritorio de laboratorio con una barra lateral fija para cambiar de área y un lienzo de trabajo amplio a la derecha; en móvil, la navegación se convierte en pestañas desplazables.
- **Firma visual:** microcuadrículas, tarjetas con borde fino luminoso, y un indicador circular de “experimento activo” que acompaña las herramientas.
- **Interacción:** cada control debe producir una respuesta visible inmediata en la fórmula, el gráfico o la explicación; estados activos se distinguen con menta y brillo suave.
- **Animación:** transiciones cortas de 160–220 ms, entrada escalonada de tarjetas y trazos del plano que se dibujan suavemente, sin animaciones decorativas excesivas.
- **Tipografía:** Atkinson Hyperlegible para lectura y controles; fórmulas en una pila monoespaciada para reforzar la idea de cuaderno técnico.
- **Esencia de marca:** un laboratorio visual para entender, probar y conectar ideas de precálculo sin memorizar a ciegas. Personalidad: curioso, preciso, alentador.
- **Voz:** directa y acompañante. Ejemplos: “Mueve el parámetro y observa qué cambia.” / “Una pista, no la respuesta: empieza por identificar la pendiente.”
- **Logotipo:** monograma `∿x` dentro de un círculo de órbita, junto al nombre PreCálculo; se implementará como marca tipográfica + símbolo CSS, sin imagen externa.
- **Color distintivo:** menta luminosa `#4de2c5`.

## Implementación
- Aplicación frontend ligera con Vite + TypeScript, sin backend ni base de datos.
- `src/main.ts` concentra el estado de navegación, controles y renderizado; los cálculos y el trazado se separan en módulos de utilidades para mantener la lógica legible.
- `src/styles.css` contiene el sistema visual, responsive layout, tarjetas, controles e indicadores de estado.
- `public/manus-routes.json` declara la ruta raíz según el contrato de Webdev.
- El plano cartesiano se dibuja con SVG nativo para poder señalar puntos, curvas, dominio/rango y la reflexión `y=x` sin depender de una librería externa.
- Álgebra y geometría se presentan como módulos de estudio con ejemplos calculables en la misma vista.
- El graficador acepta expresiones frecuentes (`sin`, `cos`, `tan`, `sqrt`, `abs`, potencias y `x`) mediante un evaluador seguro acotado; muestra dominio/rango estimados a partir del muestreo visible y calcula la inversa por intercambio numérico de pares cuando procede.
- El apoyo de IA se integra mediante el agente externo de Jotform proporcionado por el usuario, cargado desde su script oficial de embed; el tutor local se retira para evitar asistentes duplicados.

## Estructura
- `index.html`: entrada de la SPA y metadatos.
- `src/main.ts`: composición de la aplicación, estado y eventos.
- `src/math.ts`: evaluación, muestreo, dominio/rango, distancia e inversa.
- `src/plot.ts`: SVG del plano cartesiano y curvas.
- `src/styles.css`: diseño Cuaderno Cósmico y responsive.
- `public/manus-routes.json`: manifiesto de rutas.
- `app.config.ts`: metadatos de proyecto.

## Restricciones y decisiones
- No se habilitan servidor ni base de datos porque la primera versión no necesita cuentas, persistencia ni llamadas privadas.
- Se prioriza feedback visual inmediato y datos educativos explícitos sobre una navegación profunda.
- La inversa se etiqueta como estimada cuando proviene de muestreo; se avisa cuando la gráfica no parece uno-a-uno en el intervalo visible.
