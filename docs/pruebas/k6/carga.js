// Prueba de carga del flujo central: listar, ver detalle, inscribirse y cancelar.
//
//   k6 run -e NIVEL=base k6/carga.js     10 usuarios concurrentes (por defecto)
//   k6 run -e NIVEL=alto k6/carga.js     50 usuarios concurrentes
//
// Variables: BASE_URL, NIVEL (base|alto), VUS, DURACION (por ejemplo 2m), UMBRAL_MS.
// Al terminar guarda resultados/carga-<nivel>-<fecha>.json y .md.
import { sleep } from "k6";
import { Rate } from "k6/metrics";
import { BASE_URL, UMBRAL_MS } from "./lib/config.js";
import { registrar, crearEvento, listarEventos, verEvento, inscribirse, cancelar } from "./lib/api.js";

const NIVELES = {
  base: { vus: 10, duracion: "2m" },
  alto: { vus: 50, duracion: "2m" },
};
const nivel = __ENV.NIVEL || "base";
if (!NIVELES[nivel]) throw new Error(`NIVEL debe ser base o alto, no "${nivel}"`);
const VUS = Number(__ENV.VUS || NIVELES[nivel].vus);
const DURACION = __ENV.DURACION || NIVELES[nivel].duracion;

// Exitosa = respuesta correcta Y dentro del umbral de tiempo.
const operacionExitosa = new Rate("operacion_exitosa");

export const options = {
  scenarios: {
    carga: { executor: "constant-vus", vus: VUS, duration: DURACION },
  },
  thresholds: {
    operacion_exitosa: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: [`p(95)<${UMBRAL_MS}`],
  },
};

export function setup() {
  const tokenOrganizador = registrar("organizador", "org");
  // Cupo enorme: en esta prueba se mide el servicio bajo carga, no el límite de cupo.
  const eventoId = crearEvento(tokenOrganizador, 100000);
  return { eventoId };
}

let token = null; // se conserva entre iteraciones del mismo usuario virtual

function registrarResultado(res, aceptados = [200, 201, 204]) {
  operacionExitosa.add(aceptados.includes(res.status) && res.timings.duration < UMBRAL_MS);
}

export default function (data) {
  if (!token) token = registrar("estudiante", `vu${__VU}`);

  registrarResultado(listarEventos(token));
  sleep(Math.random() + 0.3);

  registrarResultado(verEvento(token, data.eventoId));
  sleep(Math.random() + 0.3);

  registrarResultado(inscribirse(token, data.eventoId));
  sleep(Math.random() + 0.3);

  // Se cancela para que el mismo usuario pueda volver a inscribirse en la siguiente vuelta.
  registrarResultado(cancelar(token, data.eventoId));
  sleep(Math.random() + 0.3);
}

const num = (m, clave, dec = 1) => (m && m.values[clave] !== undefined ? Number(m.values[clave]).toFixed(dec) : "n/d");

export function handleSummary(data) {
  const m = data.metrics;
  const fila = {
    nivel,
    fecha: new Date().toISOString(),
    destino: BASE_URL,
    usuarios_concurrentes: VUS,
    duracion_configurada: DURACION,
    duracion_real_s: (data.state.testRunDurationMs / 1000).toFixed(1),
    solicitudes_totales: m.http_reqs.values.count,
    solicitudes_por_segundo: num(m.http_reqs, "rate", 2),
    latencia_media_ms: num(m.http_req_duration, "avg"),
    latencia_p95_ms: num(m.http_req_duration, "p(95)"),
    latencia_maxima_ms: num(m.http_req_duration, "max"),
    errores_http_pct: (m.http_req_failed.values.rate * 100).toFixed(2),
    operaciones_exitosas_pct: m.operacion_exitosa ? (m.operacion_exitosa.values.rate * 100).toFixed(2) : "n/d",
    umbral_exito_ms: UMBRAL_MS,
  };

  const md = [
    `# Prueba de carga, nivel ${nivel}`,
    "",
    "| Métrica | Valor |",
    "|---|---|",
    `| Fecha | ${fila.fecha} |`,
    `| Destino | ${fila.destino} |`,
    `| Usuarios concurrentes | ${fila.usuarios_concurrentes} |`,
    `| Duración | ${fila.duracion_real_s} s |`,
    `| Solicitudes totales | ${fila.solicitudes_totales} |`,
    `| Solicitudes por segundo | ${fila.solicitudes_por_segundo} |`,
    `| Latencia media | ${fila.latencia_media_ms} ms |`,
    `| **Latencia p95** | **${fila.latencia_p95_ms} ms** |`,
    `| Latencia máxima | ${fila.latencia_maxima_ms} ms |`,
    `| **Errores HTTP** | **${fila.errores_http_pct} %** |`,
    `| Operaciones exitosas (correctas y en menos de ${UMBRAL_MS} ms) | ${fila.operaciones_exitosas_pct} % |`,
    "",
  ].join("\n");

  const base = `resultados/carga-${nivel}-${fila.fecha.replace(/[:.]/g, "-")}`;
  return {
    stdout: `\n${md}\n`,
    [`${base}.json`]: JSON.stringify(fila, null, 2),
    [`${base}.md`]: md,
  };
}
