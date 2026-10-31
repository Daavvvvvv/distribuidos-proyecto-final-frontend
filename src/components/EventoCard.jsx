import { Link } from "react-router-dom";
import { partesFecha, yaPaso } from "../utils.js";

function estadoCupo(evento) {
  const libres = Math.max(evento.cupo - evento.inscritos, 0);
  if (libres === 0) return { clase: "agotado", texto: `Agotado: ${evento.inscritos} de ${evento.cupo} inscritos` };
  if (libres / evento.cupo <= 0.2) return { clase: "pocos", texto: `Últimos ${libres} ${libres === 1 ? "cupo" : "cupos"} de ${evento.cupo}` };
  return { clase: "", texto: `Quedan ${libres} de ${evento.cupo} cupos` };
}

export default function EventoCard({ evento }) {
  const fecha = partesFecha(evento.fecha);
  const pasado = yaPaso(evento.fecha);
  const cupo = estadoCupo(evento);
  const porcentaje = Math.min(100, Math.round((evento.inscritos / evento.cupo) * 100));

  return (
    <Link to={`/eventos/${evento.id}`} className={`tarjeta evento ${pasado ? "evento-pasado" : ""}`}>
      <div className="evento-cabeza">
        <div className="fecha-bloque">
          <span className="fecha-dia">{fecha.dia}</span>
          <span className="fecha-texto">
            <span>{fecha.mes}, {fecha.diaSemana}</span>
            <span>{fecha.hora}</span>
          </span>
        </div>
        <span className="etiqueta">{evento.categoria}</span>
      </div>

      <h3 className="evento-titulo">{evento.titulo}</h3>
      <p className="evento-dato">{evento.lugar}</p>
      <p className="evento-dato">
        {evento.organizador}
        {evento.universidad && <span className="sigla">{evento.universidad.sigla}</span>}
      </p>

      <div className="evento-pie">
        {pasado ? (
          <span className="suave">Ya pasó</span>
        ) : (
          <div className={`cupo ${cupo.clase}`}>
            <div className="cupo-barra" aria-hidden="true">
              <div className="cupo-relleno" style={{ width: `${porcentaje}%` }} />
            </div>
            <span className="cupo-texto">{cupo.texto}</span>
          </div>
        )}
        {evento.inscrito && <span className="etiqueta etiqueta-ok">Inscrito</span>}
      </div>
    </Link>
  );
}
