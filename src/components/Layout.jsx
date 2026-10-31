import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { MODO_MOCK } from "../api/client.js";

// Íconos de trazo simple; heredan el color del texto del enlace.
const Icono = ({ children }) => (
  <svg className="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconoCalendario = () => (
  <Icono><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></Icono>
);
const IconoTiquete = () => (
  <Icono><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="m9 11 2 2 4-4" /></Icono>
);
const IconoMas = () => (
  <Icono><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Icono>
);

function Marca() {
  return (
    <Link to="/" className="marca">
      <svg className="marca-logo" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <rect x="8" y="10" width="16" height="14" rx="3" fill="none" stroke="#fff" strokeWidth="2.2" />
        <path d="M8 15h16M12 7.5v4M20 7.5v4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="16" cy="19.5" r="1.8" fill="#fff" />
      </svg>
      Campus Eventos
    </Link>
  );
}

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
          <Marca />
          {usuario && (
            <>
              <nav className="nav" aria-label="Principal">
                <NavLink to="/" end><IconoCalendario />Eventos</NavLink>
                <NavLink to="/mis-inscripciones"><IconoTiquete />Mis inscripciones</NavLink>
                {usuario.rol === "organizador" && <NavLink to="/nuevo"><IconoMas />Crear evento</NavLink>}
              </nav>
              <div className="usuario">
                <span className="avatar" aria-hidden="true">{usuario.nombre.charAt(0).toUpperCase()}</span>
                <span className="usuario-nombre">{usuario.nombre}</span>
                <button type="button" className="boton-texto" onClick={salir}>Salir</button>
              </div>
            </>
          )}
        </div>
      </header>
      <main className={`contenedor principal ${usuario ? "con-nav" : ""}`}>{children}</main>
    </>
  );
}
