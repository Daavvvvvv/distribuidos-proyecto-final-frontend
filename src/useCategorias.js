import { useEffect, useState } from "react";
import { api } from "./api/client.js";

// Categorías que acepta el backend (GET /api/categorias). Mientras cargan, la lista está vacía.
export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  useEffect(() => {
    api.categorias().then(setCategorias).catch(() => setCategorias([]));
  }, []);
  return categorias;
}
