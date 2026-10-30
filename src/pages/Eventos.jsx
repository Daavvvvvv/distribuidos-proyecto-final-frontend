import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import EventoCard from "../components/EventoCard.jsx";
import { CATEGORIAS } from "../utils.js";

export default function Eventos() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");

  useEffect(() => {
    let cancelado = false;
    // pequeña espera para no consultar en cada tecla
    const timer = setTimeout(async () => {
      setError("");
      try {
        const datos = await api.listarEventos({ q, categoria });
        if (!cancelado) setEventos(datos);
      } catch (err) {
        if (!cancelado) setError(err.message);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [q, categoria]);

  return (
    <>
      <h1>Próximos eventos</h1>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, lugar o tema"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar eventos"
        />
        <div className="chips" role="group" aria-label="Categoría">
          <button type="button" className={`chip ${categoria === "" ? "activo" : ""}`} onClick={() => setCategoria("")}>
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${categoria === c ? "activo" : ""}`}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="alerta alerta-error" role="alert">{error}</p>}
      {!eventos && !error && <p className="suave">Cargando eventos…</p>}
      {eventos?.length === 0 && <p className="suave">No hay eventos que coincidan con tu búsqueda.</p>}

      <div className="rejilla">
        {eventos?.map((e) => <EventoCard key={e.id} evento={e} />)}
      </div>
    </>
  );
}
