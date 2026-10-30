import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { MODO_MOCK } from "../api/client.js";

export default function Login() {
  const { usuario, login, registro } = useAuth();
  const navigate = useNavigate();
  const [modoRegistro, setModoRegistro] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "estudiante" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

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
    <section className="tarjeta formulario-centrado">
      <h1>{modoRegistro ? "Crea tu cuenta" : "Inicia sesión"}</h1>
      <p className="suave">Usa tu correo institucional para ver y reservar eventos del campus.</p>

      <form onSubmit={enviar}>
        {modoRegistro && (
          <label>
            Nombre completo
            <input required value={form.nombre} onChange={cambiar("nombre")} autoComplete="name" />
          </label>
        )}
        <label>
          Correo institucional
          <input type="email" required value={form.email} onChange={cambiar("email")} autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={cambiar("password")}
            autoComplete={modoRegistro ? "new-password" : "current-password"}
          />
        </label>
        {modoRegistro && (
          <label>
            Tipo de cuenta
            <select value={form.rol} onChange={cambiar("rol")}>
              <option value="estudiante">Estudiante</option>
              <option value="organizador">Organizador de eventos</option>
            </select>
          </label>
        )}

        {error && <p className="alerta alerta-error" role="alert">{error}</p>}

        <button className="boton" disabled={enviando}>
          {enviando ? "Un momento…" : modoRegistro ? "Registrarme" : "Entrar"}
        </button>
      </form>

      <button type="button" className="enlace" onClick={() => { setModoRegistro(!modoRegistro); setError(""); }}>
        {modoRegistro ? "Ya tengo cuenta" : "No tengo cuenta, quiero registrarme"}
      </button>

      {MODO_MOCK && (
        <p className="nota">
          Cuentas de prueba: <code>ana@universidad.edu.co</code> / <code>ana123</code> (estudiante) y{" "}
          <code>club@universidad.edu.co</code> / <code>club123</code> (organizador).
        </p>
      )}
    </section>
  );
}
