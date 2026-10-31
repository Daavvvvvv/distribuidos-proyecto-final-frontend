// Backend simulado en el navegador (localStorage). Se activa con VITE_USE_MOCK=true.
// Sirve para desarrollar y demostrar el frontend sin depender del API real.
const DOMINIO = import.meta.env.VITE_EMAIL_DOMAIN || "universidad.edu.co";
const KEY = "mock_db_v1";
const LATENCIA_MS = 300;

class MockError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const dias = (n, hora = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};

const semilla = () => ({
  siguienteId: 100,
  usuarios: [
    { id: 1, nombre: "Club de Software", email: `club@${DOMINIO}`, password: "club123", rol: "organizador" },
    { id: 2, nombre: "Ana Estudiante", email: `ana@${DOMINIO}`, password: "ana123", rol: "estudiante" },
  ],
  eventos: [
    { id: 1, titulo: "Hackathon de Sistemas Distribuidos", descripcion: "24 horas construyendo soluciones para problemas de la comunidad. Equipos de 3 a 4 personas, mentores y premios.", fecha: dias(5, 8), lugar: "Auditorio Central", cupo: 40, categoria: "Tecnología", organizadorId: 1 },
    { id: 2, titulo: "Charla: Carreras en la nube", descripcion: "Profesionales de la industria cuentan cómo empezaron en AWS, qué habilidades piden y cómo prepararse.", fecha: dias(3, 17), lugar: "Aula 204", cupo: 80, categoria: "Académico", organizadorId: 1 },
    { id: 3, titulo: "Torneo interfacultades de fútbol sala", descripcion: "Inscripción por equipos. Habrá hidratación, árbitros y premiación al final.", fecha: dias(8, 15), lugar: "Coliseo", cupo: 60, categoria: "Deportes", organizadorId: 1 },
    { id: 4, titulo: "Noche de cine y debate", descripcion: "Proyección de un documental sobre ciudades sostenibles y conversatorio abierto.", fecha: dias(10, 19), lugar: "Sala de proyecciones", cupo: 25, categoria: "Cultura", organizadorId: 1 },
    { id: 5, titulo: "Taller de primeros auxilios", descripcion: "Aprende RCP y manejo básico de emergencias con la Cruz Roja. Cupos muy limitados.", fecha: dias(2, 10), lugar: "Laboratorio 3", cupo: 2, categoria: "Bienestar", organizadorId: 1 },
  ],
  inscripciones: [
    { eventoId: 5, usuarioId: 99 },
    { eventoId: 2, usuarioId: 2 },
  ],
});

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(KEY));
    if (guardado) return guardado;
  } catch {
    /* si el contenido está dañado se vuelve a sembrar */
  }
  const db = semilla();
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

const guardar = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const esperar = () => new Promise((r) => setTimeout(r, LATENCIA_MS));

function usuarioActual(db) {
  const token = localStorage.getItem("token") || "";
  const id = Number(token.replace("mock-", ""));
  const usuario = db.usuarios.find((u) => u.id === id);
  if (!usuario) throw new MockError("Tu sesión expiró. Inicia sesión de nuevo.", 401);
  return usuario;
}

const publico = ({ password, ...resto }) => resto;

// Imita las reglas del backend (esOrganizador, puedeInscribirse, puedeCancelar, motivo).
function conDetalle(db, evento, usuarioId) {
  const inscritos = db.inscripciones.filter((i) => i.eventoId === evento.id).length;
  const organizador = db.usuarios.find((u) => u.id === evento.organizadorId);
  const inscrito = db.inscripciones.some((i) => i.eventoId === evento.id && i.usuarioId === usuarioId);
  const esOrganizador = evento.organizadorId === usuarioId;
  const pasado = new Date(evento.fecha) < new Date();
  const puedeInscribirse = !esOrganizador && !inscrito && !pasado && inscritos < evento.cupo;
  const puedeCancelar = inscrito && !pasado;
  let motivo = null;
  if (!puedeInscribirse && !puedeCancelar) {
    if (esOrganizador) motivo = "Eres el organizador de este evento";
    else if (pasado) motivo = "El evento ya ocurrió";
    else motivo = "No quedan cupos para este evento";
  }
  return {
    ...evento,
    inscritos,
    organizador: organizador?.nombre ?? "Organizador",
    universidad: null,
    inscrito,
    esOrganizador,
    puedeInscribirse,
    puedeCancelar,
    motivo,
  };
}

export const mockApi = {
  async login({ email, password }) {
    await esperar();
    const db = cargar();
    const u = db.usuarios.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new MockError("Correo o contraseña incorrectos.", 401);
    return { token: `mock-${u.id}`, usuario: publico(u) };
  },

  async registro({ nombre, email, password, rol }) {
    await esperar();
    const db = cargar();
    const correo = email.trim().toLowerCase();
    if (!correo.endsWith(`@${DOMINIO}`)) {
      throw new MockError(`Usa tu correo institucional (@${DOMINIO}).`, 400);
    }
    if (db.usuarios.some((u) => u.email === correo)) {
      throw new MockError("Ese correo ya está registrado.", 409);
    }
    const u = { id: db.siguienteId++, nombre, email: correo, password, rol: rol || "estudiante" };
    db.usuarios.push(u);
    guardar(db);
    return { token: `mock-${u.id}`, usuario: publico(u) };
  },

  async listarEventos({ q, categoria } = {}) {
    await esperar();
    const db = cargar();
    const yo = db.usuarios.find((u) => `mock-${u.id}` === localStorage.getItem("token"));
    const texto = (q || "").trim().toLowerCase();
    return db.eventos
      .filter((e) => !categoria || e.categoria === categoria)
      .filter((e) => !texto || `${e.titulo} ${e.descripcion} ${e.lugar}`.toLowerCase().includes(texto))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map((e) => conDetalle(db, e, yo?.id));
  },

  async obtenerEvento(id) {
    await esperar();
    const db = cargar();
    const e = db.eventos.find((x) => x.id === Number(id));
    if (!e) throw new MockError("No se encontró el evento.", 404);
    return conDetalle(db, e, usuarioActual(db).id);
  },

  async crearEvento(datos) {
    await esperar();
    const db = cargar();
    const yo = usuarioActual(db);
    if (yo.rol !== "organizador") throw new MockError("Solo los organizadores pueden crear eventos.", 403);
    const evento = {
      id: db.siguienteId++,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      fecha: datos.fecha,
      lugar: datos.lugar,
      cupo: Number(datos.cupo),
      categoria: datos.categoria,
      organizadorId: yo.id,
    };
    db.eventos.push(evento);
    guardar(db);
    return conDetalle(db, evento, yo.id);
  },

  async listarInscritos(id) {
    await esperar();
    const db = cargar();
    const yo = usuarioActual(db);
    const e = db.eventos.find((x) => x.id === Number(id));
    if (!e) throw new MockError("No se encontró el evento.", 404);
    if (e.organizadorId !== yo.id) throw new MockError("No tienes permiso para ver los inscritos.", 403);
    return db.inscripciones
      .filter((i) => i.eventoId === e.id)
      .map((i) => db.usuarios.find((u) => u.id === i.usuarioId))
      .filter(Boolean)
      .map(({ id: uid, nombre, email }) => ({ id: uid, nombre, email }));
  },

  async inscribirse(id) {
    await esperar();
    const db = cargar();
    const yo = usuarioActual(db);
    const e = db.eventos.find((x) => x.id === Number(id));
    if (!e) throw new MockError("No se encontró el evento.", 404);
    if (db.inscripciones.some((i) => i.eventoId === e.id && i.usuarioId === yo.id)) {
      return conDetalle(db, e, yo.id); // idempotente: repetir no duplica
    }
    const ocupados = db.inscripciones.filter((i) => i.eventoId === e.id).length;
    if (ocupados >= e.cupo) throw new MockError("El cupo de este evento está lleno.", 409);
    db.inscripciones.push({ eventoId: e.id, usuarioId: yo.id });
    guardar(db);
    return conDetalle(db, e, yo.id);
  },

  async cancelarInscripcion(id) {
    await esperar();
    const db = cargar();
    const yo = usuarioActual(db);
    db.inscripciones = db.inscripciones.filter((i) => !(i.eventoId === Number(id) && i.usuarioId === yo.id));
    guardar(db);
    const e = db.eventos.find((x) => x.id === Number(id));
    return conDetalle(db, e, yo.id);
  },

  async misInscripciones() {
    await esperar();
    const db = cargar();
    const yo = usuarioActual(db);
    return db.inscripciones
      .filter((i) => i.usuarioId === yo.id)
      .map((i) => db.eventos.find((e) => e.id === i.eventoId))
      .filter(Boolean)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map((e) => conDetalle(db, e, yo.id));
  },
};
