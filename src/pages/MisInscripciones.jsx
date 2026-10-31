import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import ListaEventos from "../components/ListaEventos.jsx";

export default function MisInscripciones() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.misInscripciones().then(setEventos).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="encabezado-pagina">
        <h1>Mis inscripciones</h1>
        <p className="suave">Los eventos a los que te inscribiste.</p>
      </div>
      {error ? (
        <p className="alerta alerta-error" role="alert">{error}</p>
      ) : (
        <ListaEventos
          eventos={eventos}
          vacio={
            <>
              <p>Todavía no te has inscrito a ningún evento.</p>
              <Link to="/" className="boton">Ver eventos</Link>
            </>
          }
        />
      )}
    </>
  );
}
