# Guía de la demo

Cómo ejecutar la demostración (Capítulo 4). El PDF pide **al menos 6 minutos de demo** dentro de 30 de sustentación, con esta secuencia: flujo normal, carga en dos niveles, falla con recuperación y evolución.

> Los scripts usan las rutas del API acordadas con el backend. Si algo no coincide, se ajusta en `docs/pruebas/k6/lib/config.js` y en `docs/pruebas/sondeo/sondeo.mjs`.

## Datos de acceso

| Qué | Valor |
|---|---|
| Aplicación | https://dmvgl7drikkrv.cloudfront.net |
| Balanceador (destino de las pruebas) | http://eventos-u-alb-272815655.us-east-1.elb.amazonaws.com |
| Dashboard de CloudWatch | https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=eventos-u |
| Usuarios de la demo | Los que cree el seed con datos **ficticios** (estudiante y organizador) |

Los datos de prueba deben ser ficticios: el PDF no permite datos reales.

## 1. Antes de la sustentación (30 minutos antes)

Marca cada punto.

- [ ] Sesión de AWS válida: `aws sts get-caller-identity`
- [ ] La API y el worker están encendidos (la API con 2 réplicas):
  ```bash
  aws ecs describe-services --cluster eventos-u-cluster --services api worker \
    --query 'services[].[serviceName,desiredCount,runningCount]' --output table
  ```
  Si están en 0: en `infra/`, `terraform apply -var app_enabled=true`.
- [ ] La API responde: `curl -s -o /dev/null -w "%{http_code}\n" http://eventos-u-alb-272815655.us-east-1.elb.amazonaws.com/health` debe dar `200`.
- [ ] El frontend publicado es la versión **real**, no la de demostración (no debe verse el banner amarillo). Si hace falta:
  ```bash
  npm run build
  aws s3 sync dist/ s3://eventos-u-frontend-240864711260 --delete
  aws cloudfront create-invalidation --distribution-id E3036AOB4ZBTB9 --paths "/*"
  ```
- [ ] k6 instalado: `k6 version` (si no, `brew install k6`)
- [ ] Ejecutar **una corrida de humo**: `cd docs/pruebas && k6 run -e NIVEL=base -e DURACION=15s k6/carga.js`
- [ ] Colas vacías: `./fallas/verificar-cola.sh`
- [ ] Preparadas **tres ventanas**: una terminal en `docs/pruebas`, el dashboard de CloudWatch y la consola de ECS (servicios `api` y `worker`).
- [ ] Capturas y un video corto del flujo, la carga y la falla, como respaldo si algo falla en vivo.

## 2. Secuencia de la demo

### A. Flujo normal (≈ 2 min)

1. Abrir la aplicación y entrar como **organizador**.
2. Crear un evento (con un cupo pequeño, por ejemplo 3).
3. Salir y entrar como **estudiante**. Ver el evento, inscribirse y mostrar la confirmación.
4. Mostrar la **persistencia**: recargar la página y ver que la inscripción sigue.
5. Mostrar la **integración** y los **registros**: `./fallas/../descargar-logs.sh 5` o los logs de `/ecs/eventos-u/api` y `/ecs/eventos-u/worker` en CloudWatch.

### B. Carga en dos niveles (≈ 2 min)

Para que quepa en la demo, usa una duración corta; los resultados completos de 2 minutos se presentan ya guardados.

```bash
cd docs/pruebas
k6 run -e NIVEL=base -e DURACION=45s k6/carga.js    # 10 usuarios concurrentes
k6 run -e NIVEL=alto -e DURACION=45s k6/carga.js    # 50 usuarios concurrentes
```

Mostrar para cada nivel: usuarios concurrentes, solicitudes totales, solicitudes por segundo, **p95** y **% de errores**. Comparar los dos niveles y mirar el dashboard de CloudWatch mientras corren.

Opcional (consistencia): `k6 run k6/cupo.js`. Debe terminar con `RESULTADO: 20 inscritos ... CORRECTO`.

### C. Falla y recuperación (≈ 2 min)

Con **dos terminales**:

```bash
# Terminal 1: disponibilidad en vivo
cd docs/pruebas
node sondeo/sondeo.mjs

# Terminal 2: provocar la falla (elige una)
./fallas/falla-worker.sh 30
./fallas/falla-servicio-externo.sh 30
./fallas/falla-replica-api.sh
```

Qué mostrar y decir:
- **Qué ve el usuario:** hacer una inscripción en la aplicación durante la falla y mostrar que sigue funcionando (o cómo degrada).
- **Cómo se detecta:** el sondeo imprime `CAÍDA detectada`, y en CloudWatch se ve la métrica o la alarma.
- **Cómo se recupera:** el script restaura el componente y el sondeo imprime `RECUPERADO tras X s`.
- **Datos:** `./fallas/verificar-cola.sh` demuestra que la cola se vació y la DLQ quedó en 0 (sin pérdida de mensajes).

Al terminar, `Ctrl+C` en la terminal 1 para ver el resumen: disponibilidad observada, tasa de éxito y mayor corte.

### D. Evolución (≈ 1 min)

- El principal hallazgo (por ejemplo, qué métrica se degradó con 50 usuarios).
- Una mejora priorizada y cómo se volvería a medir.
- Lo que sigue **simulado** (envío real de correos, el servicio externo) y lo que **no se pudo validar** (falla de una zona completa, RDS Multi-AZ).

## 3. Si algo sale mal en vivo

| Problema | Qué hacer |
|---|---|
| La API no responde | Mostrar la consola de ECS (tareas) y los logs; usar el video de respaldo. |
| Un script de falla se queda colgado | Restaurar a mano: `aws ecs update-service --cluster eventos-u-cluster --service worker --desired-count 1` o `aws lambda delete-function-concurrency --function-name eventos-u-mock-externo`. |
| No hay internet | Mostrar las capturas y los resultados guardados en `docs/pruebas/resultados/`. |

## 4. Después de la sustentación

- Descargar y guardar la evidencia: `./descargar-logs.sh 60` y la carpeta `resultados/`.
- **Destruir la infraestructura** para dejar de pagar (en `infra/`): `terraform destroy`.
- Revocar los accesos IAM que se crearon para el equipo.
