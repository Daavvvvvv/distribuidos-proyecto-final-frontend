# Registro de pruebas

Plantilla para el Capítulo 4. El PDF pide, por cada prueba: **escenario, configuración, resultado esperado, resultado observado y conclusión**. Las mediciones deben provenir del prototipo desplegado, no de datos simulados.

Cómo llenarlo: ejecuta cada prueba, pega los números de `resultados/` y escribe la conclusión. Si algo falla, no lo borres: explica qué pasó y qué se corrigió.

## Datos generales

| Campo | Valor |
|---|---|
| Fecha de las pruebas | |
| Versión desplegada (commit de API / worker / frontend) | |
| Región y cuenta de AWS | us-east-1 |
| Destino de las pruebas | |
| Quién las ejecutó | |

## PR-01: Flujo normal

| Campo | Detalle |
|---|---|
| Escenario | Un organizador crea un evento, un estudiante lo ve, se inscribe y recibe la confirmación. |
| Configuración | Frontend publicado en CloudFront, API con 2 réplicas, worker con 1 réplica. |
| Resultado esperado | La inscripción queda guardada, el cupo baja en 1, se encola el mensaje y el worker marca la notificación como enviada. |
| Resultado observado | |
| Evidencia | Capturas, `resultados/logs-*` |
| Conclusión | |

## PR-02: Carga base

| Campo | Detalle |
|---|---|
| Escenario | Usuarios concurrentes listando, viendo e inscribiéndose a un evento. |
| Configuración | `k6 run -e NIVEL=base k6/carga.js` (10 usuarios, 2 min). Éxito: respuesta correcta en menos de 2000 ms. |
| Resultado esperado | p95 < 2000 ms y errores < 1 %. |
| Resultado observado | Duración: · Usuarios: · Solicitudes totales: · Solicitudes/s: · **p95:** · **Errores:** |
| Evidencia | `resultados/carga-base-*.md` |
| Conclusión | |

## PR-03: Carga alta

| Campo | Detalle |
|---|---|
| Escenario | Misma operación con mayor demanda. |
| Configuración | `k6 run -e NIVEL=alto k6/carga.js` (50 usuarios, 2 min). |
| Resultado esperado | Latencia mayor que en la carga base; indicar si se mantiene dentro del objetivo. |
| Resultado observado | Duración: · Usuarios: · Solicitudes totales: · Solicitudes/s: · **p95:** · **Errores:** |
| Evidencia | `resultados/carga-alto-*.md`, captura del dashboard de CloudWatch |
| Conclusión | Hallazgo principal y mejora prioritaria. |

## PR-04: Consistencia del cupo bajo concurrencia

| Campo | Detalle |
|---|---|
| Escenario | 50 usuarios intentan inscribirse a la vez en un evento de cupo 20. |
| Configuración | `k6 run k6/cupo.js` |
| Resultado esperado | Exactamente 20 inscripciones aceptadas y 30 rechazadas por cupo lleno. |
| Resultado observado | Aceptadas: · Rechazadas por cupo: · Inscritos según la API: |
| Evidencia | Salida de k6 |
| Conclusión | |

## PR-05: Falla del servicio externo

| Campo | Detalle |
|---|---|
| Escenario | Se cae el servicio de validación de correo mientras hay usuarios registrándose. |
| Configuración | `./fallas/falla-servicio-externo.sh 60` y, en paralelo, `node sondeo/sondeo.mjs`. |
| Resultado esperado | El usuario no ve un error técnico: el sistema degrada (por ejemplo "validación pendiente"). El circuit breaker se abre y se cierra al recuperarse. |
| Resultado observado | Qué vio el usuario: · Cómo se detectó: · Tiempo de recuperación: |
| Evidencia | `resultados/falla-servicio-externo-*.log`, `resultados/sondeo-*.json` |
| Pérdida o duplicación de datos | |
| Conclusión | |

## PR-06: Falla del worker de notificaciones

| Campo | Detalle |
|---|---|
| Escenario | Se detiene el worker mientras hay inscripciones. |
| Configuración | `./fallas/falla-worker.sh 60`, con inscripciones ocurriendo en paralelo. |
| Resultado esperado | Las inscripciones siguen funcionando, la cola acumula mensajes y se vacía al restaurar. No se pierden ni duplican notificaciones. |
| Resultado observado | Mensajes acumulados: · Tiempo en vaciar la cola: · Mensajes en la DLQ: |
| Evidencia | `resultados/falla-worker-*.log`, `./fallas/verificar-cola.sh`, `fallas/verificar-notificaciones.sql` |
| Pérdida o duplicación de datos | |
| Conclusión | |

## PR-07: Caída de una réplica de la API

| Campo | Detalle |
|---|---|
| Escenario | Se detiene una de las 2 réplicas de la API bajo tráfico. |
| Configuración | `./fallas/falla-replica-api.sh` con el sondeo corriendo. |
| Resultado esperado | La otra réplica atiende, sin cortes (o muy breves), y ECS repone la tarea. |
| Resultado observado | Cortes en el sondeo: · Mayor corte: · Tiempo hasta tener 2 réplicas sanas: |
| Evidencia | `resultados/falla-replica-api-*.log`, `resultados/sondeo-*.json` |
| Conclusión | Recordar que una sola falla da un tiempo de recuperación **observado**, no una estimación robusta del MTTR. |

## Resumen de disponibilidad

Tomado del sondeo de una ventana representativa.

| Métrica | Valor |
|---|---|
| Operación monitoreada | login + listar + detalle |
| Frecuencia de sondeo | |
| Criterio de éxito | Correcto en menos de 2000 ms |
| Tiempo observado | |
| Tiempo indisponible | |
| **Disponibilidad observada** | |
| Tasa de éxito (solicitudes exitosas / totales) | |
| Mayor corte observado | |

## Lo que sigue simulado o no se pudo validar

Escribe aquí con honestidad lo que no se probó (por ejemplo: envío real de correos, falla de una zona de disponibilidad completa, RDS Multi-AZ). El PDF pide señalarlo.
