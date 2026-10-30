-- Verificación de pérdida o duplicación de datos tras una falla.
-- Los nombres de tablas y columnas siguen el contrato de integración; ajústalos al esquema real.
-- La base de datos está en una subred privada: estas consultas se ejecutan desde dentro de
-- la VPC (por ejemplo, desde un endpoint de administración de la API) y no desde un portátil.

-- 1. Inscripciones sin notificación registrada (pérdida). Esperado: 0 filas.
SELECT i.*
FROM inscripciones i
LEFT JOIN notificaciones n ON n.inscripcion_id = i.id
WHERE n.id IS NULL;

-- 2. Notificaciones duplicadas para una misma inscripción. Esperado: 0 filas.
SELECT inscripcion_id, COUNT(*) AS veces
FROM notificaciones
GROUP BY inscripcion_id
HAVING COUNT(*) > 1;

-- 3. Notificaciones que siguen pendientes. Esperado: 0 filas una vez recuperado el servicio.
SELECT estado, COUNT(*) FROM notificaciones GROUP BY estado;

-- 4. Eventos que superaron su cupo. Esperado: 0 filas.
SELECT e.id, e.titulo, e.cupo, COUNT(i.*) AS inscritos
FROM eventos e
JOIN inscripciones i ON i.evento_id = e.id
GROUP BY e.id, e.titulo, e.cupo
HAVING COUNT(i.*) > e.cupo;

-- 5. Inscripciones duplicadas (mismo usuario y evento). Esperado: 0 filas.
SELECT evento_id, usuario_id, COUNT(*) AS veces
FROM inscripciones
GROUP BY evento_id, usuario_id
HAVING COUNT(*) > 1;

-- 6. Tiempo entre la inscripción y el envío de la notificación (para medir la recuperación).
SELECT MAX(n.enviada_en - i.creado_en) AS mayor_demora
FROM notificaciones n
JOIN inscripciones i ON i.id = n.inscripcion_id
WHERE n.estado = 'ENVIADA';
