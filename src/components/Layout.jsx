import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { MODO_MOCK } from "../api/client.js";

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const salir = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {MODO_MOCK && (
        <div className="banner-mock">Modo demostración: los datos se guardan solo en este navegador</div>
      )}
      <header className="cabecera">
        <div className="contenedor cabecera-interior">
          <Link to="/" className="marca">
            <span className="marca-icono" aria-hidden="true">◆</span> Campus Eventos
          </Link>
          {usuario && (
            <nav className="nav" aria-label="Principal">
              <NavLink to="/" end>Eventos</NavLink>
              <NavLink to="/mis-inscripciones">Mis inscripciones</NavLink>
              {usuario.rol === "organizador" && <NavLink to="/nuevo">Crear evento</NavLink>}
              <button type="button" className="enlace" onClick={salir}>
                Salir ({usuario.nombre.split(" ")[0]})
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="contenedor principal">{children}</main>
    </>
  );
}
