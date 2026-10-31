import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth.jsx";
import ListaEventos from "../components/ListaEventos.jsx";
import { CATEGORIAS } from "../utils.js";

export default function Eventos() {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [intento, setIntento] = useState(0);

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
  }, [q, categoria, intento]);

  const hayFiltros = q.trim() !== "" || categoria !== "";
  const quitarFiltros = () => {
    setQ("");
    setCategoria("");
  };

  return (
    <>
      <div className="encabezado-pagina">
        <h1>Eventos</h1>
        <p className="suave">Charlas, talleres y encuentros de las universidades de Medellín.</p>
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por nombre o descripción"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar eventos"
        />
        <div className="chips" role="group" aria-label="Categoría">
          <button type="button" className={`chip ${categoria === "" ? "activo" : ""}`} aria-pressed={categoria === ""} onClick={() => setCategoria("")}>
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${categoria === c ? "activo" : ""}`}
              aria-pressed={categoria === c}
              onClick={() => setCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="alerta alerta-error alerta-con-accion" role="alert">
          <span>{error}</span>
          <button type="button" className="boton-texto" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>
        </div>
      ) : (
        <ListaEventos
          eventos={eventos}
          vacio={
            hayFiltros ? (
              <>
                <p>Ningún evento coincide con tu búsqueda.</p>
                <button type="button" className="boton boton-secundario" onClick={quitarFiltros}>Quitar filtros</button>
              </>
            ) : (
              <>
                <p>Todavía no hay eventos publicados.</p>
                {usuario.rol === "organizador" && <Link to="/nuevo" className="boton">Crear el primero</Link>}
              </>
            )
          }
        />
      )}
    </>
  );
}
