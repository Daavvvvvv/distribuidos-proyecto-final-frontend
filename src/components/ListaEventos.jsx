import EventoCard from "./EventoCard.jsx";
import { separarPorFecha } from "../utils.js";

const Rejilla = ({ eventos }) => (
  <div className="rejilla">
    {eventos.map((e) => <EventoCard key={e.id} evento={e} />)}
  </div>
);

// Lista de tarjetas con sus estados: cargando (null), vacía, y separada en próximos y pasados.
export default function ListaEventos({ eventos, vacio }) {
  if (!eventos) {
    return (
      <div className="rejilla" aria-busy="true" aria-label="Cargando eventos">
        {[1, 2, 3, 4].map((n) => <div key={n} className="tarjeta esqueleto" />)}
      </div>
    );
  }
  if (eventos.length === 0) return <div className="vacio">{vacio}</div>;

  const { proximos, pasados } = separarPorFecha(eventos);
  return (
    <>
      {proximos.length > 0 && <Rejilla eventos={proximos} />}
      {pasados.length > 0 && (
        <section className="seccion-pasados">
          <h2>Ya pasaron</h2>
          <Rejilla eventos={pasados} />
        </section>
      )}
    </>
  );
}
