import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import EventoCard from "../components/EventoCard.jsx";

export default function MisInscripciones() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.misInscripciones().then(setEventos).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h1>Mis inscripciones</h1>
      {error && <p className="alerta alerta-error" role="alert">{error}</p>}
      {!eventos && !error && <p className="suave">Cargando…</p>}
      {eventos?.length === 0 && (
        <p className="suave">
          Todavía no te has inscrito a ningún evento. <Link to="/">Ver eventos disponibles</Link>
        </p>
      )}
      <div className="rejilla">
        {eventos?.map((e) => <EventoCard key={e.id} evento={e} />)}
      </div>
    </>
  );
}
