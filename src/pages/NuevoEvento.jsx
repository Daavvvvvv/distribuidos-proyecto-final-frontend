import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { CATEGORIAS } from "../utils.js";

export default function NuevoEvento() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha: "",
    lugar: "",
    cupo: 30,
    categoria: CATEGORIAS[0],
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const creado = await api.crearEvento({
        ...form,
        cupo: Number(form.cupo),
        fecha: new Date(form.fecha).toISOString(),
      });
      navigate(`/eventos/${creado.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };

  return (
    <section className="tarjeta formulario-centrado">
      <h1>Crear evento</h1>
      <form onSubmit={enviar}>
        <label>
          Título
          <input required maxLength={120} value={form.titulo} onChange={cambiar("titulo")} />
        </label>
        <label>
          Descripción
          <textarea required rows={4} value={form.descripcion} onChange={cambiar("descripcion")} />
        </label>
        <label>
          Fecha y hora
          <input type="datetime-local" required value={form.fecha} onChange={cambiar("fecha")} />
        </label>
        <label>
          Lugar
          <input required value={form.lugar} onChange={cambiar("lugar")} />
        </label>
        <div className="fila-doble">
          <label>
            Cupo máximo
            <input type="number" required min={1} max={5000} value={form.cupo} onChange={cambiar("cupo")} />
          </label>
          <label>
            Categoría
            <select value={form.categoria} onChange={cambiar("categoria")}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="alerta alerta-error" role="alert">{error}</p>}

        <button className="boton" disabled={enviando}>{enviando ? "Publicando…" : "Publicar evento"}</button>
      </form>
    </section>
  );
}
