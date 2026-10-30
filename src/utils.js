export const CATEGORIAS = ["Académico", "Tecnología", "Cultura", "Deportes", "Bienestar", "Otro"];

export function formatearFecha(iso) {
  const texto = new Date(iso).toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Convierte una fecha ISO al formato que espera <input type="datetime-local">.
export function aInputFecha(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
