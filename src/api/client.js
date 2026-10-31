// Único lugar donde el frontend habla con el backend.
// Si el contrato del API cambia, solo se ajusta este archivo.
import { mockApi } from "./mock.js";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = "/api"; // ruta relativa: CloudFront reenvía /api/* al balanceador
const TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => localStorage.getItem("token");

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err.name === "AbortError";
    throw new ApiError(
      timedOut
        ? "El servidor tardó demasiado en responder. Intenta de nuevo."
        : "No se pudo conectar con el servidor.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || data?.mensaje || mensajePorEstado(res.status), res.status);
  }
  return data;
}

function mensajePorEstado(status) {
  if (status === 401) return "Tu sesión expiró. Inicia sesión de nuevo.";
  if (status === 403) return "No tienes permiso para hacer esto.";
  if (status === 404) return "No se encontró lo que buscas.";
  if (status === 409) return "Esta acción ya se realizó o el cupo está lleno.";
  if (status >= 500) return "El servicio no está disponible en este momento.";
  return "Ocurrió un error inesperado.";
}

const realApi = {
  login: (datos) => request("/auth/login", { method: "POST", body: datos }),
  registro: (datos) => request("/auth/registro", { method: "POST", body: datos }),
  universidades: () => request("/universidades"),

  listarEventos: ({ q, categoria } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria) params.set("categoria", categoria);
    const qs = params.toString();
    return request(`/eventos${qs ? `?${qs}` : ""}`);
  },
  obtenerEvento: (id) => request(`/eventos/${id}`),
  crearEvento: (datos) => request("/eventos", { method: "POST", body: datos }),
  listarInscritos: (id) => request(`/eventos/${id}/inscritos`),

  inscribirse: (id) => request(`/eventos/${id}/inscripcion`, { method: "POST" }),
  cancelarInscripcion: (id) => request(`/eventos/${id}/inscripcion`, { method: "DELETE" }),
  misInscripciones: () => request("/mis-inscripciones"),
};

export const api = USE_MOCK ? mockApi : realApi;
export const MODO_MOCK = USE_MOCK;
