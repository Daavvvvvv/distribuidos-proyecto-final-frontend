import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";
import Eventos from "./pages/Eventos.jsx";
import EventoDetalle from "./pages/EventoDetalle.jsx";
import NuevoEvento from "./pages/NuevoEvento.jsx";
import MisInscripciones from "./pages/MisInscripciones.jsx";

function Protegida({ children, rol }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (rol && usuario.rol !== rol) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protegida><Eventos /></Protegida>} />
        <Route path="/eventos/:id" element={<Protegida><EventoDetalle /></Protegida>} />
        <Route path="/nuevo" element={<Protegida rol="organizador"><NuevoEvento /></Protegida>} />
        <Route path="/mis-inscripciones" element={<Protegida><MisInscripciones /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
