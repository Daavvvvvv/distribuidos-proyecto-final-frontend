// "Viernes, 6 de noviembre"
export function fechaLarga(iso) {
  const texto = new Date(iso).toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Espacios que no parten línea: así "8:40 p. m." nunca queda cortado en dos renglones.
const sinCortes = (texto) => texto.replace(/\s/g, " ");

// Piezas de la fecha para mostrarla como bloque en las tarjetas.
export function partesFecha(iso) {
  const d = new Date(iso);
  return {
    dia: d.getDate(),
    mes: d.toLocaleString("es-CO", { month: "short" }).replace(".", ""),
    diaSemana: d.toLocaleString("es-CO", { weekday: "long" }),
    hora: sinCortes(d.toLocaleString("es-CO", { hour: "numeric", minute: "2-digit" })),
  };
}

export const yaPaso = (iso) => new Date(iso).getTime() < Date.now();

// Separa una lista (ya ordenada por el backend) en próximos y pasados, para mostrarlos en secciones.
export function separarPorFecha(eventos) {
  return {
    proximos: eventos.filter((e) => !yaPaso(e.fecha)),
    pasados: eventos.filter((e) => yaPaso(e.fecha)),
  };
}

// Convierte una fecha ISO al formato que espera <input type="datetime-local">.
export function aInputFecha(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
