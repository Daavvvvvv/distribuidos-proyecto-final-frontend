import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth.jsx";
import EventoCard from "../components/EventoCard.jsx";
import { useCategorias } from "../useCategorias.js";

// Fecha local en el formato de <input type="date"> (AAAA-MM-DD).
const diaLocal = (d) => d.toLocaleDateString("en-CA");
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

export default function NuevoEvento() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const categorias = useCategorias();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    dia: diaLocal(enDias(7)),
    hora: "18:00",
    lugar: "",
    cupo: 30,
    categoria: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  // La fecha y la hora se escriben en hora local; el backend recibe ISO con zona (UTC).
  const momento = new Date(`${form.dia}T${form.hora}`);
  const fechaIso = Number.isNaN(momento.getTime()) ? null : momento.toISOString();

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const { dia, hora, ...resto } = form;
      const creado = await api.crearEvento({ ...resto, cupo: Number(form.cupo), fecha: fechaIso });
      navigate(`/eventos/${creado.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  const vistaPrevia = fechaIso && {
    id: 0,
    titulo: form.titulo.trim() || "Título del evento",
    fecha: fechaIso,
    lugar: form.lugar.trim() || "Lugar",
    cupo: Math.max(Number(form.cupo) || 1, 1),
    inscritos: 0,
    categoria: form.categoria || "Categoría",
    organizador: usuario.nombre,
    universidad: usuario.universidad ?? null,
    inscrito: false,
  };

  return (
    <>
      <div className="encabezado-pagina">
        <h1>Crear evento</h1>
        <p className="suave">Publícalo y las personas de cualquier universidad podrán inscribirse.</p>
      </div>

      <div className="crear">
        <form className="tarjeta crear-formulario" onSubmit={enviar}>
          <label>
            Título
            <input required maxLength={120} value={form.titulo} onChange={cambiar("titulo")} placeholder="Taller de introducción a Docker" />
            <span className="campo-ayuda">Así aparece en la lista de eventos.</span>
          </label>
          <label>
            Descripción
            <textarea required rows={5} value={form.descripcion} onChange={cambiar("descripcion")} />
            <span className="campo-ayuda">Qué se va a hacer, a quién va dirigido y si hay que llevar algo.</span>
          </label>
          <div className="fila-doble">
            <label>
              Día
              <input type="date" required min={diaLocal(new Date())} value={form.dia} onChange={cambiar("dia")} />
            </label>
            <label>
              Hora
              <input type="time" required value={form.hora} onChange={cambiar("hora")} />
            </label>
          </div>
          <label>
            Lugar
            <input required value={form.lugar} onChange={cambiar("lugar")} placeholder="Bloque 19, sala 302" />
          </label>
          <div className="fila-doble">
            <label>
              Cupo
              <input type="number" required min={1} value={form.cupo} onChange={cambiar("cupo")} />
              <span className="campo-ayuda">Cuántas personas pueden inscribirse.</span>
            </label>
            <label>
              Categoría
              <select required value={form.categoria} onChange={cambiar("categoria")}>
                <option value="" disabled>Elige una</option>
                {categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          {error && <p className="alerta alerta-error" role="alert">{error}</p>}

          <button className="boton" disabled={enviando}>{enviando ? "Publicando…" : "Publicar evento"}</button>
        </form>

        {vistaPrevia && (
          <aside className="crear-vista">
            <h2>Así se verá en la lista</h2>
            <div className="vista-previa" inert="">
              <EventoCard evento={vistaPrevia} />
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
