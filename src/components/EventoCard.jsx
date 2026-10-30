import { Link } from "react-router-dom";
import { formatearFecha } from "../utils.js";

export default function EventoCard({ evento }) {
  const libres = Math.max(evento.cupo - evento.inscritos, 0);
  const lleno = libres === 0;
  const porcentaje = Math.min(100, Math.round((evento.inscritos / evento.cupo) * 100));

  return (
    <Link to={`/eventos/${evento.id}`} className="tarjeta evento">
      <div className="evento-fila">
        <span className="etiqueta">{evento.categoria}</span>
        {evento.inscrito && <span className="etiqueta etiqueta-ok">Inscrito</span>}
      </div>
      <h3>{evento.titulo}</h3>
      <p className="suave">{formatearFecha(evento.fecha)}</p>
      <p className="suave">{evento.lugar}</p>
      <div className="cupo" aria-label={`${evento.inscritos} de ${evento.cupo} cupos ocupados`}>
        <div className="cupo-barra">
          <div className={`cupo-relleno ${lleno ? "lleno" : ""}`} style={{ width: `${porcentaje}%` }} />
        </div>
        <span className={lleno ? "texto-error" : "suave"}>
          {lleno ? "Cupo agotado" : `${libres} cupos disponibles`}
        </span>
      </div>
    </Link>
  );
}
