// Configuración común de los scripts de k6.
// Todo se puede cambiar con variables de entorno: k6 run -e BASE_URL=http://... carga.js
export const BASE_URL = (
  __ENV.BASE_URL || "http://eventos-u-alb-272815655.us-east-1.elb.amazonaws.com"
).replace(/\/$/, "");

export const DOMINIO = __ENV.DOMINIO || "universidad.edu.co";
export const PASSWORD = "Prueba123!";

// Una operación se considera exitosa si responde bien Y dentro de este tiempo
// (el PDF aclara que un HTTP 200 por sí solo no prueba que el servicio sea útil).
export const UMBRAL_MS = Number(__ENV.UMBRAL_MS || 2000);

// Rutas del API. Si el backend usa otras, se cambian aquí y nada más.
export const RUTAS = {
  registro: "/api/auth/registro",
  login: "/api/auth/login",
  eventos: "/api/eventos",
  evento: (id) => `/api/eventos/${id}`,
  inscripcion: (id) => `/api/eventos/${id}/inscripcion`,
};
