# Campus Eventos: frontend

Interfaz web (React + Vite) para publicar, descubrir e inscribirse a eventos universitarios. Responsive y con tema claro/oscuro automático.

## Pantallas

| Ruta | Quién | Qué hace |
|---|---|---|
| `#/login` | Todos | Inicio de sesión y registro (correo institucional) |
| `#/` | Autenticados | Lista de eventos con búsqueda y filtro por categoría |
| `#/eventos/:id` | Autenticados | Detalle, inscribirse o cancelar; el organizador ve los inscritos |
| `#/mis-inscripciones` | Autenticados | Eventos a los que me inscribí |
| `#/nuevo` | Organizadores | Crear un evento |

Las rutas usan `#` (HashRouter) para que los enlaces directos funcionen en S3/CloudFront sin configurar redirecciones.

## Cómo correrlo

```bash
npm install

npm run dev:mock    # datos simulados en el navegador, no necesita backend
npm run dev         # usa el API real; /api se reenvía a http://localhost:3000
```

Con `npm run dev:mock` hay cuentas de prueba:

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `ana@universidad.edu.co` | `ana123` |
| Organizador | `club@universidad.edu.co` | `club123` |

Para apuntar a otro backend en desarrollo: `VITE_API_TARGET=http://otro-host:3000 npm run dev`.

## Contrato con el backend

Todo el acceso al API está en [`src/api/client.js`](src/api/client.js). Si el backend usa otras rutas, solo se cambia ese archivo. El modo mock ([`src/api/mock.js`](src/api/mock.js)) tiene la misma interfaz.

El frontend asume estas rutas y formas de respuesta. **Hay que acordarlas con quien hace el backend**:

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/auth/registro` | `{nombre, email, password, rol}` | `{token, usuario: {id, nombre, email, rol}}` |
| `POST /api/auth/login` | `{email, password}` | `{token, usuario}` |
| `GET /api/eventos?q=&categoria=` | | `[evento]` |
| `GET /api/eventos/:id` | | `evento` |
| `POST /api/eventos` (organizador) | `{titulo, descripcion, fecha, lugar, cupo, categoria}` | `evento` |
| `GET /api/eventos/:id/inscritos` (organizador) | | `[{id, nombre, email}]` |
| `POST /api/eventos/:id/inscripcion` | | `evento` actualizado |
| `DELETE /api/eventos/:id/inscripcion` | | `evento` actualizado |
| `GET /api/mis-inscripciones` | | `[evento]` |

Forma de `evento`:

```json
{
  "id": 1, "titulo": "...", "descripcion": "...", "fecha": "2026-11-03T08:00:00.000Z",
  "lugar": "...", "cupo": 40, "inscritos": 12, "categoria": "Tecnología",
  "organizador": "Club de Software", "inscrito": true
}
```

- `inscrito` indica si el usuario autenticado ya está inscrito.
- El token se envía como `Authorization: Bearer <token>`.
- Los errores deben responder con el código HTTP correcto y `{ "error": "mensaje para el usuario" }`. Ese texto se muestra tal cual. Un `409` significa cupo lleno.
- Las llamadas usan rutas relativas (`/api/...`) y tienen un timeout de 10 s.

## Despliegue en AWS

```bash
npm run build
aws s3 sync dist/ s3://<bucket-del-frontend> --delete
```

El nombre del bucket sale de `terraform output bucket_frontend` (carpeta `infra/`). CloudFront sirve `index.html` y reenvía `/api/*` al balanceador. Si no se ve el cambio, invalidar la caché:

```bash
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```
