import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { fechaLarga, partesFecha } from "../utils.js";

function Volver() {
  return (
    <Link to="/" className="volver">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      Todos los eventos
    </Link>
  );
}

// Qué puede hacer la persona con el evento. Lo decide la API (puedeInscribirse, puedeCancelar, motivo);
// aquí solo se muestra.
function Accion({ evento, trabajando, onInscribir, onCancelar }) {
  const [confirmando, setConfirmando] = useState(false);

  if (evento.puedeInscribirse) {
    return (
      <button className="boton boton-ancho" disabled={trabajando} onClick={onInscribir}>
        {trabajando ? "Inscribiendo…" : "Inscribirme"}
      </button>
    );
  }
  if (evento.puedeCancelar) {
    if (confirmando) {
      return (
        <div className="confirmar" role="group" aria-label="Confirmar cancelación">
          <p>¿Cancelar tu inscripción? Tu cupo queda libre para otra persona.</p>
          <div className="confirmar-botones">
            <button className="boton" disabled={trabajando} onClick={async () => { await onCancelar(); setConfirmando(false); }}>
              {trabajando ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <button className="boton boton-secundario" disabled={trabajando} onClick={() => setConfirmando(false)}>No</button>
          </div>
        </div>
      );
    }
    return (
      <>
        <p className="estado-inscrito">Estás inscrito en este evento.</p>
        <button className="boton boton-secundario boton-ancho" onClick={() => setConfirmando(true)}>Cancelar inscripción</button>
      </>
    );
  }
  return (
    <>
      {evento.inscrito && <p className="estado-inscrito">Estás inscrito en este evento.</p>}
      {evento.motivo && <p className="motivo">{evento.motivo}</p>}
    </>
  );
}

export default function EventoDetalle() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [inscritos, setInscritos] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    // React reutiliza esta pantalla al pasar de un evento a otro: se limpia lo del evento anterior.
    setEvento(null);
    setInscritos(null);
    setError("");
    setMensaje("");
    (async () => {
      try {
        const e = await api.obtenerEvento(id);
        if (cancelado) return;
        setEvento(e);
        if (e.esOrganizador) {
          const lista = await api.listarInscritos(id);
          if (!cancelado) setInscritos(lista);
        }
      } catch (err) {
        if (!cancelado) setError(err.message);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [id]);

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
        <Volver />
        <p className="alerta alerta-error" role="alert">{error}</p>
      </>
    );
  }
  if (!evento) return <><Volver /><p className="suave">Cargando evento…</p></>;

  const fecha = partesFecha(evento.fecha);
  const libres = Math.max(evento.cupo - evento.inscritos, 0);

  return (
    <>
      <Volver />
      <div className="detalle">
        <header className="detalle-titulo">
          <span className="etiqueta">{evento.categoria}</span>
          <h1>{evento.titulo}</h1>
          <p className="suave">
            Organiza {evento.organizador}
            {evento.universidad && <span className="sigla" title={evento.universidad.nombre}>{evento.universidad.sigla}</span>}
          </p>
        </header>

        <aside className="tarjeta panel">
          <dl className="panel-datos">
            <div>
              <dt>Cuándo</dt>
              <dd>{fechaLarga(evento.fecha)}<br />{fecha.hora}</dd>
            </div>
            <div>
              <dt>Dónde</dt>
              <dd>{evento.lugar}</dd>
            </div>
            <div>
              <dt>Cupos</dt>
              <dd>{libres === 0 ? `Agotado, ${evento.cupo} de ${evento.cupo} inscritos` : `Quedan ${libres} de ${evento.cupo}`}</dd>
            </div>
          </dl>

          {mensaje && <p className="alerta alerta-ok" role="status">{mensaje}</p>}
          {error && <p className="alerta alerta-error" role="alert">{error}</p>}

          <Accion
            evento={evento}
            trabajando={trabajando}
            onInscribir={() => accion(api.inscribirse, "")}
            onCancelar={() => accion(api.cancelarInscripcion, "Cancelaste tu inscripción.")}
          />
        </aside>

        <section className="detalle-cuerpo">
          <h2>Sobre el evento</h2>
          <p className="descripcion">{evento.descripcion}</p>

          {inscritos && (
            <div className="inscritos">
              <h2>Inscritos ({inscritos.length})</h2>
              {inscritos.length === 0 ? (
                <p className="suave">Todavía no se ha inscrito nadie.</p>
              ) : (
                <table className="tabla">
                  <thead><tr><th>Nombre</th><th>Correo</th></tr></thead>
                  <tbody>
                    {inscritos.map((p) => (
                      <tr key={p.id}><td>{p.nombre}</td><td>{p.email}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
