import { createContext, useContext, useState } from "react";
import { api } from "./api/client.js";

const AuthContext = createContext(null);

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario"));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuario);

  const guardarSesion = ({ token, usuario: u }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("usuario", JSON.stringify(u));
    setUsuario(u);
  };

  const value = {
    usuario,
    login: async (datos) => guardarSesion(await api.login(datos)),
    registro: async (datos) => guardarSesion(await api.registro(datos)),
    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      setUsuario(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
