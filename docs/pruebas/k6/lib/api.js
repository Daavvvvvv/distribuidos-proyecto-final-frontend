import http from "k6/http";
import { check } from "k6";
import { BASE_URL, DOMINIO, PASSWORD, RUTAS } from "./config.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function opciones(token, operacion) {
  const headers = token ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` } : JSON_HEADERS;
  // La etiqueta "operacion" agrupa las métricas (en vez de una por cada URL con id).
  return { headers, tags: { operacion } };
}

// Correo único por ejecución y por usuario virtual, para poder repetir la prueba.
export function correoUnico(prefijo) {
  const sufijo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  return `${prefijo}.${sufijo}@${DOMINIO}`;
}

export function registrar(rol, prefijo) {
  const res = http.post(
    `${BASE_URL}${RUTAS.registro}`,
    JSON.stringify({
      nombre: `Usuario de prueba ${prefijo}`,
      email: correoUnico(prefijo),
      password: PASSWORD,
      rol,
    }),
    opciones(null, "registro"),
  );
  const ok = check(res, { "registro 200/201": (r) => r.status === 200 || r.status === 201 });
  if (!ok) throw new Error(`No se pudo registrar (${rol}): HTTP ${res.status} ${res.body}`);
  return res.json("token");
}

export function crearEvento(tokenOrganizador, cupo) {
  const manana = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const res = http.post(
    `${BASE_URL}${RUTAS.eventos}`,
    JSON.stringify({
      titulo: `Evento de prueba ${new Date().toISOString()}`,
      descripcion: "Creado automáticamente por la prueba de carga.",
      fecha: manana,
      lugar: "Laboratorio",
      cupo,
      categoria: "Tecnología",
    }),
    opciones(tokenOrganizador, "crear_evento"),
  );
  const ok = check(res, { "crear evento 200/201": (r) => r.status === 200 || r.status === 201 });
  if (!ok) throw new Error(`No se pudo crear el evento: HTTP ${res.status} ${res.body}`);
  return res.json("id");
}

export const listarEventos = (token) =>
  http.get(`${BASE_URL}${RUTAS.eventos}`, opciones(token, "listar_eventos"));

export const verEvento = (token, id) =>
  http.get(`${BASE_URL}${RUTAS.evento(id)}`, opciones(token, "ver_evento"));

export const inscribirse = (token, id) =>
  http.post(`${BASE_URL}${RUTAS.inscripcion(id)}`, null, opciones(token, "inscribirse"));

export const cancelar = (token, id) =>
  http.del(`${BASE_URL}${RUTAS.inscripcion(id)}`, null, opciones(token, "cancelar"));
