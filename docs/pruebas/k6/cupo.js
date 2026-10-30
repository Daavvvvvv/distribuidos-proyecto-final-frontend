// Prueba de consistencia: muchas personas intentan inscribirse AL MISMO TIEMPO
// en un evento con cupo limitado. El resultado correcto es que se acepten
// exactamente CUPO inscripciones, ni una más.
//
//   k6 run k6/cupo.js
//   k6 run -e USUARIOS=100 -e CUPO=30 k6/cupo.js
import http from "k6/http";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, RUTAS } from "./lib/config.js";
import { registrar, crearEvento, inscribirse, opciones } from "./lib/api.js";

const USUARIOS = Number(__ENV.USUARIOS || 50);
const CUPO = Number(__ENV.CUPO || 20);

const aceptadas = new Counter("inscripciones_aceptadas");
const rechazadasPorCupo = new Counter("inscripciones_rechazadas_cupo");
const otrosResultados = new Counter("inscripciones_otro_resultado");

export const options = {
  scenarios: {
    simultaneo: { executor: "per-vu-iterations", vus: USUARIOS, iterations: 1, maxDuration: "2m" },
  },
  thresholds: {
    // Exactamente CUPO aceptadas y el resto rechazadas por cupo lleno.
    inscripciones_aceptadas: [`count==${CUPO}`],
    inscripciones_otro_resultado: ["count==0"],
  },
};

export function setup() {
  const tokenOrganizador = registrar("organizador", "org-cupo");
  const eventoId = crearEvento(tokenOrganizador, CUPO);
  // Margen para que todos los usuarios alcancen a registrarse antes del disparo común.
  return { eventoId, tokenOrganizador, disparo: Date.now() + 20000 };
}

export default function (data) {
  const token = registrar("estudiante", `cupo${__VU}`);

  // Todos esperan al mismo instante para inscribirse a la vez.
  const espera = (data.disparo - Date.now()) / 1000;
  if (espera > 0) sleep(espera);

  const res = inscribirse(token, data.eventoId);
  if (res.status === 200 || res.status === 201) aceptadas.add(1);
  else if (res.status === 409) rechazadasPorCupo.add(1);
  else otrosResultados.add(1);
}

export function teardown(data) {
  const res = http.get(`${BASE_URL}${RUTAS.evento(data.eventoId)}`, opciones(data.tokenOrganizador, "ver_evento"));
  const inscritos = res.json("inscritos");
  const veredicto = inscritos === CUPO ? "CORRECTO" : "FALLO: se sobrepasó o no se llenó el cupo";
  console.log(`\nRESULTADO: ${inscritos} inscritos registrados de un cupo de ${CUPO} (${USUARIOS} intentos). ${veredicto}\n`);
}
