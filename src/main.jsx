import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./auth.jsx";
import "./styles.css";

// HashRouter: las rutas viven después del "#", así no hace falta configurar
// redirecciones en S3/CloudFront para que funcionen los enlaces directos.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
