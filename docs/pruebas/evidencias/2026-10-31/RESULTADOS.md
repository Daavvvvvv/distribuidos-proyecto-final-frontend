# Prueba PAM de disponibilidad (2026-10-31)

Eje principal: **A, disponibilidad**. Pregunta: ¿cuánto se corta el servicio para un estudiante cuando se cae una réplica de la API, y una segunda réplica lo evita?

## Qué significa "disponible"

La operación monitoreada es la de un estudiante que entra, lista los eventos y abre uno (`POST /api/auth/login`, `GET /api/eventos`, `GET /api/eventos/:id`). El servicio está disponible cuando las tres responden bien en menos de 2 s en total.

Se mide desde fuera de AWS, desde un computador en Medellín por internet, contra el balanceador de la aplicación, con un sondeo detrás de otro (uno por segundo, aproximadamente). La ventana es la duración de cada corrida.

Disponibilidad observada = (tiempo observado − tiempo indisponible) / tiempo observado × 100.

## Hipótesis y meta (fijadas a las 06:42, antes de medir)

- **Línea base, 1 réplica.** Al perder la única tarea, el servicio se corta hasta que ECS lanza otra y el balanceador la ve sana (dos health checks de 15 s).
- **Mejora, 2 réplicas.** Meta: el mayor corte es de 5 s o menos, la disponibilidad observada es del 99 % o más, y no se pierde ninguna inscripción.

## Condiciones

| | |
|---|---|
| Entorno | AWS `us-east-1`. API en ECS Fargate (0,25 vCPU y 512 MB por tarea) detrás de un ALB. Health check `/health` cada 15 s: sana tras 2 aciertos, caída tras 3 fallos; drenado de 10 s. |
| Versiones | Backend `2d5fad1` (task definition `eventos-u-api:3`), frontend `2e23837`. |
| Falla | `fallas/falla-replica-api.sh`: detiene una tarea de la API con `aws ecs stop-task`. La recuperación es automática: ECS reemplaza la tarea sin intervención manual. |
| Lectura | `sondeo/sondeo.mjs` con `INTERVALO=1` y criterio de 2000 ms. |
| Escritura | `scripts/sonda-inscripciones.mjs` (repo del backend): 12 estudiantes de prueba se inscriben, uno cada 8 s, en el evento fijo "Prueba de disponibilidad (PAM)". Al final compara las inscripciones confirmadas por la API con las guardadas. |
| Carga | Solo el tráfico de las dos sondas, sin carga adicional. |
| Repeticiones | 3 por configuración. La falla se provoca 15 s después de arrancar las sondas. |
| Configuración | `terraform apply -var app_enabled=true -var api_replicas=1` (línea base) o `api_replicas=2` (mejora). |

## Resultados

| Configuración | Rep. | Disponibilidad observada | Cortes | Mayor corte | Réplicas sanas de nuevo | Inscripciones confirmadas / guardadas |
|---|---|---|---|---|---|---|
| 1 réplica | 1 | 84,94 % (171/201) | 1 | 30,2 s | 72 s | 8 / 8 (4 recibieron 503) |
| 1 réplica | 2 | 84,93 % (171/201) | 1 | 30,2 s | 40 s | 9 / 9 (3 recibieron 503) |
| 1 réplica | 3 | 85,43 % (172/201) | 1 | 29,2 s | 56 s | 9 / 9 (3 recibieron 503) |
| 2 réplicas | 1 | 100 % (151/151) | 0 | 0 s | 100 s | 12 / 12 |
| 2 réplicas | 2 | 100 % (151/151) | 0 | 0 s | 39 s | 12 / 12 |
| 2 réplicas | 3 | 100 % (151/151) | 0 | 0 s | 56 s | 12 / 12 |

"Réplicas sanas de nuevo" es el tiempo hasta que ECS repone la capacidad perdida: la tarea nueva está corriendo y el balanceador la ve sana. Con 2 réplicas el usuario no lo nota, porque la otra atiende mientras tanto.

Evidencias por repetición en `base-1-replica/` y `disponibilidad-2-replicas/`: CSV y JSON del sondeo, registro de la falla y resumen de la sonda de escritura.

## Interpretación

**La meta se cumplió.** Con 2 réplicas, perder una no cortó el servicio en ninguna de las tres repeticiones: 0 s de corte (meta: 5 s o menos), 100 % de disponibilidad observada (meta: 99 % o más) y ninguna inscripción perdida (12 de 12 confirmadas y guardadas en cada corrida).

**La línea base confirma que la segunda réplica es la que evita el corte.** Con una sola, cada falla dejó al usuario unos 30 s sin servicio (29,2 a 30,2 s) y la disponibilidad de la ventana de 200 s bajó a cerca del 85 %. Durante el corte, entre 3 y 4 inscripciones por corrida recibieron un error 503: el estudiante ve el error y puede reintentar. Aun así, ninguna inscripción confirmada se perdió y ninguna se guardó sin que el usuario la viera confirmada.

**El corte dura menos que la reposición de la réplica** (unos 30 s frente a 40 a 72 s). La explicación probable, no verificada en esta prueba, es que cuando el balanceador no tiene ninguna tarea sana envía el tráfico a todas las registradas, así que el servicio vuelve en cuanto la tarea nueva arranca, antes de pasar los dos health checks.

**Decisión que se confirma:** mantener 2 réplicas de la API. El compromiso es pagar el doble de Fargate para la API.

El porcentaje depende de la ventana: un corte de 30 s es el 15 % de 200 s, pero sería una fracción mínima de un mes. Por eso el dato que importa para comparar es el corte (unos 30 s frente a 0 s), no el porcentaje.

## Pruebas de carga (con 2 réplicas, k6, 2 minutos cada una)

| Nivel | Usuarios | Solicitudes | Solicitudes/s | Media | p95 | Errores |
|---|---|---|---|---|---|---|
| Base | 10 | 1336 | 10,7 | 124 ms | 117 ms | 0 % |
| Alto | 50 | 5775 | 46,1 | 261 ms | 421 ms | 0,48 % |

Con 5 veces más usuarios, el sistema atendió 4,3 veces más solicitudes por segundo y el p95 subió de 117 a 421 ms, todavía lejos del umbral de 2 s. Los 27 errores del nivel alto ocurrieron todos en los primeros 11 s, mientras los 50 usuarios se registraban a la vez (16 respuestas 500 y 7 503 en el registro, 4 503 en lecturas); después no hubo ninguno. El registro usa bcrypt, que consume CPU, en tareas de 0,25 vCPU. La mejora prioritaria es más CPU por tarea o escalado automático, y volver a medir ese arranque. La causa exacta de los 500 no se verificó.

**Consistencia del cupo:** 50 personas compitieron a la vez por 20 cupos y se aceptaron exactamente 20 (29 rechazadas por cupo lleno; un registro falló antes de intentarlo). No hubo sobrecupo.

Evidencias en `carga/`.

## Otras fallas medidas (con 2 réplicas)

**Worker de notificaciones caído 50 s** (`falla-worker/`). Las 12 inscripciones hechas durante la caída se confirmaron y guardaron. Los avisos esperaron en la cola y, cuando ECS levantó el worker nuevo (75 s después de apagarlo), salieron los 12, cada uno una sola vez (identificadores 194 a 205 en el log del worker). La DLQ quedó en 0.

**Servicio externo de validación de correo caído 43 s** (`falla-servicio-externo/`). Los 12 registros hechos durante la caída respondieron 201; el usuario no vio ningún error. El circuit breaker se abrió en las dos réplicas a los 15 s de la falla y, desde ahí, los registros pasaron de unos 850 ms a 484 ms, porque dejaron de esperar al servicio caído y quedaron con el correo "pendiente". A los 15 s pasó a medio abierto para probar el servicio, que respondió 200 un segundo después de restaurarlo.

## Limitaciones

- Tres corridas cortas dan tiempos de recuperación **observados**. No son un MTTR robusto ni demuestran disponibilidad anual.
- El sondeo sale de un solo punto de internet. Un problema de esa red se contaría como indisponibilidad.
- Las pruebas corren sin carga adicional. Con tráfico real, una sola réplica podría saturarse mientras la otra se repone; eso no se midió.
- No se probó la caída de una zona de disponibilidad, ni de RDS, que está en una sola zona. Dos réplicas de la API no protegen de eso.
- En la prueba del worker, el contador de mensajes de SQS es aproximado y el script dio la cola por vacía antes de tiempo. La evidencia de entrega es el log del worker.
- La prueba de humo de las 06:43 (`prueba-de-humo/`) usó una versión del script de falla que contaba como sana la tarea detenida y reportó una recuperación de 12 s que no era real. Se corrigió (commit `d73f31e` del frontend) antes de las repeticiones válidas. El sondeo de esa corrida sí es válido: 100 %, sin cortes.
