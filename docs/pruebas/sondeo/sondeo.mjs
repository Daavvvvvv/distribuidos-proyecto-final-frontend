// Sondeo de disponibilidad: ejecuta el flujo de lectura completo cada pocos segundos
// y mide disponibilidad observada y tiempo de recuperación tras una caída.
//
//   node sondeo/sondeo.mjs                         hasta Ctrl+C
//   DURACION=300 INTERVALO=3 node sondeo/sondeo.mjs
//
// Operación monitoreada: login -> listar eventos -> ver detalle del primer evento.
// Criterio de éxito: las tres responden bien y en menos de UMBRAL_MS en total.
//
// Disponibilidad observada = (tiempo observado - tiempo indisponible) / tiempo observado x 100
// Tasa de éxito            = sondeos exitosos / sondeos totales (es OTRA métrica)
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";

const BASE_URL = (process.env.BASE_URL || "http://eventos-u-alb-272815655.us-east-1.elb.amazonaws.com").replace(/\/$/, "");
const INTERVALO_MS = Number(process.env.INTERVALO || 5) * 1000;
const DURACION_S = Number(process.env.DURACION || 0); // 0 = hasta Ctrl+C
const UMBRAL_MS = Number(process.env.UMBRAL_MS || 2000);
const EMAIL = process.env.SONDA_EMAIL || "sonda@universidad.edu.co";
const PASSWORD = process.env.SONDA_PASSWORD || "Sonda12345!";
const RUTAS = {
  login: "/api/auth/login",
  registro: "/api/auth/registro",
  eventos: "/api/eventos",
};

mkdirSync("resultados", { recursive: true });
const sello = new Date().toISOString().replace(/[:.]/g, "-");
const ARCHIVO_CSV = `resultados/sondeo-${sello}.csv`;
const ARCHIVO_RESUMEN = `resultados/sondeo-${sello}.json`;
appendFileSync(ARCHIVO_CSV, "fecha_hora,exito,latencia_ms,detalle\n");

async function pedir(ruta, { method = "GET", body, token } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), UMBRAL_MS);
  try {
    const res = await fetch(BASE_URL + ruta, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    });
    const datos = await res.json().catch(() => null);
    return { status: res.status, datos };
  } finally {
    clearTimeout(temporizador);
  }
}

let token = null;

async function iniciarSesion() {
  let r = await pedir(RUTAS.login, { method: "POST", body: { email: EMAIL, password: PASSWORD } });
  if (r.status !== 200) {
    r = await pedir(RUTAS.registro, {
      method: "POST",
      body: { nombre: "Usuario sonda", email: EMAIL, password: PASSWORD, rol: "estudiante" },
    });
  }
  if (r.status !== 200 && r.status !== 201) throw new Error(`login/registro respondió ${r.status}`);
  token = r.datos?.token;
  if (!token) throw new Error("la respuesta no trae token");
}

async function sondear() {
  if (!token) await iniciarSesion();
  const lista = await pedir(RUTAS.eventos, { token });
  if (lista.status === 401) {
    token = null;
    throw new Error("sesión expirada");
  }
  if (lista.status !== 200 || !Array.isArray(lista.datos)) throw new Error(`listar eventos respondió ${lista.status}`);
  if (lista.datos.length > 0) {
    const detalle = await pedir(`${RUTAS.eventos}/${lista.datos[0].id}`, { token });
    if (detalle.status !== 200) throw new Error(`ver evento respondió ${detalle.status}`);
  }
}

const inicio = Date.now();
let total = 0;
let exitosos = 0;
let cortes = []; // { desde, hasta }
let corteActual = null;

function registrarSondeo(ok, latencia, detalle) {
  const ahora = Date.now();
  total++;
  if (ok) exitosos++;
  appendFileSync(ARCHIVO_CSV, `${new Date(ahora).toISOString()},${ok ? 1 : 0},${latencia},"${detalle}"\n`);
  console.log(`${new Date(ahora).toISOString()}  ${ok ? "OK   " : "FALLA"}  ${String(latencia).padStart(5)} ms  ${detalle}`);

  if (!ok && !corteActual) {
    corteActual = { desde: ahora };
    console.log(">>> CAÍDA detectada");
  } else if (ok && corteActual) {
    corteActual.hasta = ahora;
    cortes.push(corteActual);
    console.log(`>>> RECUPERADO tras ${((ahora - corteActual.desde) / 1000).toFixed(1)} s`);
    corteActual = null;
  }
}

function resumen() {
  const fin = Date.now();
  if (corteActual) cortes.push({ desde: corteActual.desde, hasta: fin, sinRecuperar: true });
  const observadoS = (fin - inicio) / 1000;
  const indisponibleS = cortes.reduce((s, c) => s + (c.hasta - c.desde) / 1000, 0);
  const mayorCorteS = cortes.reduce((m, c) => Math.max(m, (c.hasta - c.desde) / 1000), 0);
  const r = {
    destino: BASE_URL,
    inicio: new Date(inicio).toISOString(),
    fin: new Date(fin).toISOString(),
    frecuencia_sondeo_s: INTERVALO_MS / 1000,
    criterio_exito: `login + listar + detalle correctos en menos de ${UMBRAL_MS} ms`,
    tiempo_observado_s: Number(observadoS.toFixed(1)),
    tiempo_indisponible_s: Number(indisponibleS.toFixed(1)),
    disponibilidad_observada_pct: Number((((observadoS - indisponibleS) / observadoS) * 100).toFixed(2)),
    sondeos_totales: total,
    sondeos_exitosos: exitosos,
    tasa_de_exito_pct: total ? Number(((exitosos / total) * 100).toFixed(2)) : null,
    numero_de_cortes: cortes.length,
    mayor_corte_s: Number(mayorCorteS.toFixed(1)),
    cortes: cortes.map((c) => ({
      desde: new Date(c.desde).toISOString(),
      hasta: new Date(c.hasta).toISOString(),
      duracion_s: Number(((c.hasta - c.desde) / 1000).toFixed(1)),
      sin_recuperar: Boolean(c.sinRecuperar),
    })),
  };
  writeFileSync(ARCHIVO_RESUMEN, JSON.stringify(r, null, 2));
  console.log("\n===== RESUMEN DEL SONDEO =====");
  console.log(`Tiempo observado:            ${r.tiempo_observado_s} s`);
  console.log(`Tiempo indisponible:         ${r.tiempo_indisponible_s} s`);
  console.log(`Disponibilidad observada:    ${r.disponibilidad_observada_pct} %`);
  console.log(`Tasa de éxito:               ${r.tasa_de_exito_pct} % (${r.sondeos_exitosos}/${r.sondeos_totales} sondeos)`);
  console.log(`Cortes: ${r.numero_de_cortes}   Mayor corte (recuperación observada): ${r.mayor_corte_s} s`);
  console.log(`Detalle: ${ARCHIVO_CSV} y ${ARCHIVO_RESUMEN}`);
}

let terminando = false;
function terminar() {
  if (terminando) return;
  terminando = true;
  resumen();
  process.exit(0);
}
process.on("SIGINT", terminar);
process.on("SIGTERM", terminar);

console.log(`Sondeando ${BASE_URL} cada ${INTERVALO_MS / 1000} s${DURACION_S ? ` durante ${DURACION_S} s` : " (Ctrl+C para terminar)"}\n`);

while (true) {
  const t0 = Date.now();
  let ok = false;
  let detalle = "";
  try {
    await sondear();
    ok = Date.now() - t0 < UMBRAL_MS;
    detalle = ok ? "flujo completo correcto" : `demasiado lento (> ${UMBRAL_MS} ms)`;
  } catch (err) {
    detalle = err.name === "AbortError" ? `sin respuesta en ${UMBRAL_MS} ms` : err.message;
  }
  registrarSondeo(ok, Date.now() - t0, detalle);

  if (DURACION_S && Date.now() - inicio >= DURACION_S * 1000) terminar();
  await new Promise((r) => setTimeout(r, Math.max(0, INTERVALO_MS - (Date.now() - t0))));
}
