# Registro de pruebas

Plantilla para el Capítulo 4. El PDF pide, por cada prueba: **escenario, configuración, resultado esperado, resultado observado y conclusión**. Las mediciones deben provenir del prototipo desplegado, no de datos simulados.

Cómo llenarlo: ejecuta cada prueba, pega los números de `resultados/` y escribe la conclusión. Si algo falla, no lo borres: explica qué pasó y qué se corrigió.

## Datos generales

| Campo | Valor |
|---|---|
| Fecha de las pruebas | 2026-10-31, entre las 06:43 y las 07:45 (hora de Colombia) |
| Versión desplegada (commit de API / worker / frontend) | Backend `2d5fad1` (task definitions `eventos-u-api:3` y `eventos-u-worker:2`), frontend `2e23837` |
| Región y cuenta de AWS | us-east-1 |
| Destino de las pruebas | ALB `http://eventos-u-alb-272815655.us-east-1.elb.amazonaws.com`, desde un computador en Medellín |
| Quién las ejecutó | David Franco |

## PR-01: Flujo normal

| Campo | Detalle |
|---|---|
| Escenario | Un organizador crea un evento, un estudiante lo ve, se inscribe y recibe la confirmación. |
| Configuración | Frontend publicado en CloudFront, API con 2 réplicas, worker con 1 réplica. |
| Resultado esperado | La inscripción queda guardada, el cupo baja en 1, se encola el mensaje y el worker marca la notificación como enviada. |
| Resultado observado | Funciona de punta a punta en AWS: el registro con correo de EAFIT, la inscripción (el cupo bajó de 19 a 18) y el aviso publicado en SNS por el worker se verificaron el 2026-10-30 por CloudFront. Hoy la sonda de escritura logró 74 inscripciones confirmadas en 7 corridas; las únicas fallas fueron 10 respuestas 503 durante los cortes provocados con 1 réplica. |
| Evidencia | `evidencias/2026-10-31/disponibilidad-2-replicas/*/sonda-inscripciones-*.json` |
| Conclusión | El flujo distribuido completo (CloudFront, ALB, API, RDS, SQS, worker, SNS) funciona en el entorno desplegado. |

## PR-02: Carga base

| Campo | Detalle |
|---|---|
| Escenario | Usuarios concurrentes listando, viendo e inscribiéndose a un evento. |
| Configuración | `k6 run -e NIVEL=base k6/carga.js` (10 usuarios, 2 min). Éxito: respuesta correcta en menos de 2000 ms. |
| Resultado esperado | p95 < 2000 ms y errores < 1 %. |
| Resultado observado | Duración: 125 s · Usuarios: 10 · Solicitudes totales: 1336 · Solicitudes/s: 10,7 · Media: 124 ms · **p95: 117 ms** · **Errores: 0 %** (100 % de operaciones exitosas) |
| Evidencia | `evidencias/2026-10-31/carga/carga-base-*` |
| Conclusión | Cumple el objetivo con amplio margen. |

## PR-03: Carga alta

| Campo | Detalle |
|---|---|
| Escenario | Misma operación con mayor demanda. |
| Configuración | `k6 run -e NIVEL=alto k6/carga.js` (50 usuarios, 2 min). |
| Resultado esperado | Latencia mayor que en la carga base; indicar si se mantiene dentro del objetivo. |
| Resultado observado | Duración: 125 s · Usuarios: 50 · Solicitudes totales: 5775 · Solicitudes/s: 46,1 · Media: 261 ms · **p95: 421 ms** · **Errores: 0,48 %** (99,42 % de operaciones exitosas) · Máxima: 18 s |
| Evidencia | `evidencias/2026-10-31/carga/carga-alto-*` y los logs de la API |
| Conclusión | El p95 se mantiene dentro del objetivo (421 ms frente a 2000 ms). Hallazgo principal: los 27 errores (16 respuestas 500 y 7 503 en el registro, 4 503 en lecturas) ocurrieron todos en los primeros 11 s, mientras los 50 usuarios se registraban a la vez; después no hubo ninguno. El registro usa bcrypt, que consume CPU, en tareas de 0,25 vCPU. Mejora prioritaria: más CPU por tarea o escalado automático, y volver a medir el mismo arranque. La causa exacta de los 500 no se verificó. |

## PR-04: Consistencia del cupo bajo concurrencia

| Campo | Detalle |
|---|---|
| Escenario | 50 usuarios intentan inscribirse a la vez en un evento de cupo 20. |
| Configuración | `k6 run k6/cupo.js` |
| Resultado esperado | Exactamente 20 inscripciones aceptadas y 30 rechazadas por cupo lleno. |
| Resultado observado | Aceptadas: 20 · Rechazadas por cupo: 29 · Inscritos según la API: 20 ("RESULTADO: 20 inscritos registrados de un cupo de 20 (50 intentos). CORRECTO"). Un registro de los 50 falló antes de intentar inscribirse. |
| Evidencia | `evidencias/2026-10-31/carga/cupo-salida-k6.log` |
| Conclusión | Sin sobrecupo bajo concurrencia: el bloqueo de la fila del evento en Postgres serializa las inscripciones de las 2 réplicas. |

## PR-05: Falla del servicio externo

| Campo | Detalle |
|---|---|
| Escenario | Se cae el servicio de validación de correo mientras hay usuarios registrándose. |
| Configuración | `./fallas/falla-servicio-externo.sh 60` y, en paralelo, `node sondeo/sondeo.mjs`. |
| Resultado esperado | El usuario no ve un error técnico: el sistema degrada (por ejemplo "validación pendiente"). El circuit breaker se abre y se cierra al recuperarse. |
| Resultado observado | Qué vio el usuario: los 12 registros durante la caída respondieron 201, sin error. · Cómo se detectó: el circuit breaker se abrió en las dos réplicas a los 15 s (log "Circuito ABIERTO") y los registros bajaron de ~850 ms a 484 ms. · Tiempo de recuperación: 1 s tras restaurar la Lambda (43 s de caída en total). |
| Evidencia | `evidencias/2026-10-31/falla-servicio-externo/` |
| Pérdida o duplicación de datos | Ninguna: las cuentas se crean con el correo "pendiente" de validar. |
| Conclusión | La dependencia externa no tumba el registro: el sistema degrada en vez de fallar. |

## PR-06: Falla del worker de notificaciones

| Campo | Detalle |
|---|---|
| Escenario | Se detiene el worker mientras hay inscripciones. |
| Configuración | `./fallas/falla-worker.sh 60`, con inscripciones ocurriendo en paralelo. |
| Resultado esperado | Las inscripciones siguen funcionando, la cola acumula mensajes y se vacía al restaurar. No se pierden ni duplican notificaciones. |
| Resultado observado | 12 inscripciones confirmadas y guardadas con el worker caído. El worker estuvo fuera 75 s (incluye el arranque de la tarea nueva) y al volver entregó los 12 avisos de una vez. · Mensajes en la DLQ: 0. |
| Evidencia | `evidencias/2026-10-31/falla-worker/`, incluido el log del worker con los 12 avisos (ids 194 a 205) |
| Pérdida o duplicación de datos | Ninguna: 12 avisos, cada uno una sola vez. El contador de SQS es aproximado y el script dio la cola por vacía antes de tiempo; la evidencia de entrega es el log del worker. |
| Conclusión | El worker caído retrasa los avisos pero no los pierde ni afecta las inscripciones. |

## PR-07: Caída de una réplica de la API

| Campo | Detalle |
|---|---|
| Escenario | Se detiene una de las 2 réplicas de la API bajo tráfico. |
| Configuración | `./fallas/falla-replica-api.sh` con el sondeo corriendo. |
| Resultado esperado | La otra réplica atiende, sin cortes (o muy breves), y ECS repone la tarea. |
| Resultado observado | Con 2 réplicas (3 corridas): 0 cortes, 100 % de disponibilidad, réplicas repuestas en 100, 39 y 56 s, 12/12 inscripciones guardadas. Con 1 réplica (línea base, 3 corridas): un corte de 29,2 a 30,2 s por corrida, 84,9 a 85,4 % de disponibilidad. |
| Evidencia | `evidencias/2026-10-31/RESULTADOS.md` (protocolo completo), `evidencias/2026-10-31/disponibilidad-2-replicas/` y `evidencias/2026-10-31/base-1-replica/` |
| Conclusión | Meta cumplida: la segunda réplica elimina el corte de ~30 s. Son tiempos observados en 3 corridas, no un MTTR robusto. |

## Resumen de disponibilidad

Tomado del sondeo de una ventana representativa.

| Métrica | Valor |
|---|---|
| Operación monitoreada | login + listar + detalle |
| Frecuencia de sondeo | Un sondeo tras otro, cada ~1 s |
| Criterio de éxito | Correcto en menos de 2000 ms |
| Tiempo observado | 150 s por corrida (2 réplicas) y 200 s (1 réplica) |
| Tiempo indisponible | 0 s con 2 réplicas; 29,2 a 30,2 s con 1 réplica |
| **Disponibilidad observada** | **100 % con 2 réplicas**; 84,9 a 85,4 % con 1 réplica |
| Tasa de éxito (solicitudes exitosas / totales) | 151/151 con 2 réplicas; 171 a 172 de 201 con 1 réplica |
| Mayor corte observado | 0 s con 2 réplicas; 30,2 s con 1 réplica |

## Lo que sigue simulado o no se pudo validar

- El envío de correos es simulado: el worker publica en un tema de SNS sin suscriptores de correo y deja el aviso en el log.
- El servicio externo de validación es una Lambda simulada que acepta cualquier dominio `.edu.co`; qué universidades valen lo decide el catálogo del backend.
- No se probó la caída de una zona de disponibilidad ni de RDS, que está en una sola zona y sin cifrado de disco.
- Las pruebas de disponibilidad corrieron sin carga adicional; con tráfico real, una réplica sola podría saturarse mientras se repone la otra.
- Tres corridas cortas por configuración dan tiempos observados, no un MTTR ni una disponibilidad anual.
