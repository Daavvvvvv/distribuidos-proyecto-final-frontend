import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api, MODO_MOCK } from "../api/client.js";

const ROLES = [
  { valor: "estudiante", titulo: "Estudiante", texto: "Busco eventos y me inscribo." },
  { valor: "organizador", titulo: "Organizador", texto: "Publico eventos de mi grupo, semillero o facultad." },
];

// Universidades aceptadas, tal como las entrega el backend; se ordenan por sigla para encontrar la propia rápido.
function Universidades({ universidades }) {
  const porSigla = [...universidades].sort((a, b) => a.sigla.localeCompare(b.sigla, "es"));
  return (
    <ul className="universidades" aria-label="Universidades en Campus Eventos">
      {porSigla.map((u) => (
        <li key={u.id} title={`${u.nombre} (@${u.dominio})`}>{u.sigla}</li>
      ))}
    </ul>
  );
}

export default function Login() {
  const { usuario, login, registro } = useAuth();
  const navigate = useNavigate();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "estudiante" });
  const [verContrasena, setVerContrasena] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [universidades, setUniversidades] = useState(null);

  useEffect(() => {
    api.universidades().then(setUniversidades).catch(() => setUniversidades([]));
  }, []);

  if (usuario) return <Navigate to="/" replace />;

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const cambiarModo = (registro) => {
    setModoRegistro(registro);
    setError("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (modoRegistro) await registro(form);
      else await login({ email: form.email, password: form.password });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <section className="acceso-intro">
        <h1>Los eventos de las universidades de Medellín, en un solo lugar.</h1>
        <p className="suave">
          Encuentra charlas, talleres y encuentros abiertos, e inscríbete con el correo de tu universidad.
        </p>
      </section>

      {universidades?.length > 0 && (
        <section className="acceso-universidades">
          <h2 className="acceso-subtitulo">Universidades en Campus Eventos</h2>
          <Universidades universidades={universidades} />
        </section>
      )}

      <section className="tarjeta acceso-formulario">
        <div className="pestanas" role="tablist" aria-label="Acceso">
          <button type="button" role="tab" aria-selected={!modoRegistro} className={!modoRegistro ? "activa" : ""} onClick={() => cambiarModo(false)}>
            Entrar
          </button>
          <button type="button" role="tab" aria-selected={modoRegistro} className={modoRegistro ? "activa" : ""} onClick={() => cambiarModo(true)}>
            Crear cuenta
          </button>
        </div>

        <form onSubmit={enviar}>
          {modoRegistro && (
            <label>
              Nombre completo
              <input required minLength={2} value={form.nombre} onChange={cambiar("nombre")} autoComplete="name" />
            </label>
          )}
          <label>
            Correo de tu universidad
            <input
              type="email"
              required
              value={form.email}
              onChange={cambiar("email")}
              autoComplete="email"
              placeholder="nombre@eafit.edu.co"
            />
          </label>
          <label>
            Contraseña
            <span className="contrasena">
              <input
                type={verContrasena ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={cambiar("password")}
                autoComplete={modoRegistro ? "new-password" : "current-password"}
              />
              <button type="button" className="contrasena-ver" onClick={() => setVerContrasena(!verContrasena)} aria-pressed={verContrasena}>
                {verContrasena ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            {modoRegistro && <span className="campo-ayuda">Mínimo 6 caracteres.</span>}
          </label>

          {modoRegistro && (
            <fieldset className="roles">
              <legend>¿Cómo vas a usar Campus Eventos?</legend>
              {ROLES.map((r) => (
                <label key={r.valor} className={`rol ${form.rol === r.valor ? "elegido" : ""}`}>
                  <input type="radio" name="rol" value={r.valor} checked={form.rol === r.valor} onChange={cambiar("rol")} />
                  <span>
                    <strong>{r.titulo}</strong>
                    <span className="suave">{r.texto}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {error && <p className="alerta alerta-error" role="alert">{error}</p>}

          <button className="boton" disabled={enviando}>
            {enviando ? "Un momento…" : modoRegistro ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        {MODO_MOCK && (
          <p className="nota">
            Cuentas de prueba: <code>ana@universidad.edu.co</code> / <code>ana123</code> (estudiante) y{" "}
            <code>club@universidad.edu.co</code> / <code>club123</code> (organizador).
          </p>
        )}
      </section>
    </div>
  );
}
