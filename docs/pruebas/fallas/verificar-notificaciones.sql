-- Verificación de pérdida o duplicación de datos tras una falla.
-- Las tablas y columnas son las del esquema del backend (shared/src/schema.ts).
-- En local se ejecuta contra el Postgres del docker compose del backend:
--   docker compose -f <repo-backend>/docker-compose.yml exec -T postgres psql -U eventos_admin -d eventos -f - < fallas/verificar-notificaciones.sql
-- En AWS la base está en una subred privada y la API no expone acceso a ella; desde fuera,
-- el indicador disponible es la métrica notificaciones_atascadas de /metrics.

-- 1. Inscripciones sin notificación registrada (pérdida). Esperado: 0 filas.
-- La inscripción y su aviso se guardan en la misma transacción, por eso comparten creado_en.
SELECT i.*
FROM inscripciones i
LEFT JOIN notificaciones n
  ON n.usuario_id = i.usuario_id AND n.evento_id = i.evento_id AND n.creado_en = i.creado_en
WHERE n.id IS NULL;

-- Notificaciones duplicadas: la base guarda un solo estado por aviso, así que una entrega doble
-- solo se ve en los logs del worker. En CloudWatch Logs Insights, sobre /ecs/eventos-u/worker:
--   filter msg = "notificacion_enviada" | stats count(*) as veces by notificacion_id | sort veces desc | limit 5
-- Esperado: ningún notificacion_id con veces mayor que 1.

-- 2. Notificaciones por estado. Esperado: ninguna PENDIENTE una vez recuperado el servicio
-- (DESCARTADA es normal: son avisos de inscripciones que se cancelaron antes de enviarse).
SELECT estado, COUNT(*) FROM notificaciones GROUP BY estado;

-- 3. Eventos que superaron su cupo. Esperado: 0 filas.
SELECT e.id, e.titulo, e.cupo, COUNT(i.*) AS inscritos
FROM eventos e
JOIN inscripciones i ON i.evento_id = e.id
GROUP BY e.id, e.titulo, e.cupo
HAVING COUNT(i.*) > e.cupo;

-- 4. Inscripciones duplicadas (mismo usuario y evento). Esperado: 0 filas.
SELECT evento_id, usuario_id, COUNT(*) AS veces
FROM inscripciones
GROUP BY evento_id, usuario_id
HAVING COUNT(*) > 1;

-- 5. Mayor tiempo entre la inscripción y el envío de su notificación (para medir la recuperación).
SELECT MAX(enviada_en - creado_en) AS mayor_demora
FROM notificaciones
WHERE estado = 'ENVIADA';
