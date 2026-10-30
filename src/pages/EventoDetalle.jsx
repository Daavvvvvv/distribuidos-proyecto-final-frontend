import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth.jsx";
import { formatearFecha } from "../utils.js";

export default function EventoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [evento, setEvento] = useState(null);
  const [inscritos, setInscritos] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const e = await api.obtenerEvento(id);
        if (cancelado) return;
        setEvento(e);
        if (usuario.rol === "organizador") {
          try {
            const lista = await api.listarInscritos(id);
            if (!cancelado) setInscritos(lista);
          } catch {
            /* si no es el organizador de este evento simplemente no se muestra la lista */
          }
        }
      } catch (err) {
        if (!cancelado) setError(err.message);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [id, usuario.rol]);

  const accion = async (fn, textoOk) => {
    setError("");
    setMensaje("");
    setTrabajando(true);
    try {
      setEvento(await fn(id));
      setMensaje(textoOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  if (error && !evento) {
    return (
      <>
        <p className="alerta alerta-error" role="alert">{error}</p>
        <Link to="/">← Volver a los eventos</Link>
      </>
    );
  }
  if (!evento) return <p className="suave">Cargando evento…</p>;

  const libres = Math.max(evento.cupo - evento.inscritos, 0);
  const lleno = libres === 0;

  return (
    <article className="tarjeta detalle">
      <Link to="/">← Volver a los eventos</Link>
      <span className="etiqueta">{evento.categoria}</span>
      <h1>{evento.titulo}</h1>
      <p className="suave">Organiza: {evento.organizador}</p>

      <dl className="datos">
        <div><dt>Cuándo</dt><dd>{formatearFecha(evento.fecha)}</dd></div>
        <div><dt>Dónde</dt><dd>{evento.lugar}</dd></div>
        <div>
          <dt>Cupos</dt>
          <dd>{evento.inscritos} de {evento.cupo} ocupados{lleno ? " (agotado)" : ""}</dd>
        </div>
      </dl>

      <p>{evento.descripcion}</p>

      {mensaje && <p className="alerta alerta-ok" role="status">{mensaje}</p>}
      {error && <p className="alerta alerta-error" role="alert">{error}</p>}

      {evento.inscrito ? (
        <button
          className="boton boton-secundario"
          disabled={trabajando}
          onClick={() => accion(api.cancelarInscripcion, "Cancelaste tu inscripción.")}
        >
          {trabajando ? "Un momento…" : "Cancelar mi inscripción"}
        </button>
      ) : (
        <button
          className="boton"
          disabled={trabajando || lleno}
          onClick={() => accion(api.inscribirse, "¡Listo! Quedaste inscrito. Te enviaremos una confirmación.")}
        >
          {lleno ? "Cupo agotado" : trabajando ? "Inscribiendo…" : "Inscribirme"}
        </button>
      )}

      {inscritos && (
        <section className="inscritos">
          <h2>Inscritos ({inscritos.length})</h2>
          {inscritos.length === 0 ? (
            <p className="suave">Aún no hay inscritos.</p>
          ) : (
            <ul>
              {inscritos.map((p) => (
                <li key={p.id}>{p.nombre} <span className="suave">· {p.email}</span></li>
              ))}
            </ul>
          )}
        </section>
      )}
    </article>
  );
}
