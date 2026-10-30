# Pruebas y evidencias (Capítulo 4)

Scripts para generar las evidencias que pide el profe: carga en dos niveles, falla controlada con recuperación, disponibilidad observada y registro de pruebas. **Todo se ejecuta contra la infraestructura desplegada en AWS**, porque las mediciones deben venir del prototipo.

## Requisitos

| Herramienta | Para qué | Instalación |
|---|---|---|
| k6 | Carga y consistencia del cupo | `brew install k6` |
| Node 18+ | Sondeo de disponibilidad | Ya instalado |
| AWS CLI con sesión válida | Fallas controladas y logs | `aws sts get-caller-identity` debe funcionar |

Todo se ejecuta **desde esta carpeta** (`pruebas/`). Los resultados quedan en `resultados/` (ignorada por git).

**Antes de empezar:** la API y el worker deben estar corriendo en AWS (`terraform apply -var app_enabled=true` en `infra/`). El destino por defecto es el balanceador; se puede cambiar con `BASE_URL`.

> Las rutas del API están en [`k6/lib/config.js`](k6/lib/config.js) y en [`sondeo/sondeo.mjs`](sondeo/sondeo.mjs) (tabla `RUTAS`). Si el backend usa otras, se cambian ahí.

## Orden recomendado

### 1. Humo (1 minuto)
```bash
k6 run -e NIVEL=base -e DURACION=15s k6/carga.js
```
Si esto falla, no sigas: el backend no responde como espera el script.

### 2. Carga en dos niveles
```bash
k6 run -e NIVEL=base k6/carga.js     # 10 usuarios concurrentes, 2 min
k6 run -e NIVEL=alto k6/carga.js     # 50 usuarios concurrentes, 2 min
```
Cada ejecución imprime y guarda: duración, usuarios, solicitudes totales, solicitudes por segundo, p95, % de errores y % de operaciones exitosas (correctas **y** en menos de 2 s). Mientras corre, deja abierto el dashboard de CloudWatch (`terraform output dashboard`) y toma capturas.

### 3. Consistencia del cupo
```bash
k6 run k6/cupo.js
```
Debe terminar con `RESULTADO: 20 inscritos ... CORRECTO`.

### 4. Falla controlada con recuperación

Abre **dos terminales**. En la primera arranca el sondeo; en la segunda provoca la falla.

```bash
# Terminal 1
node sondeo/sondeo.mjs

# Terminal 2 (elige una)
./fallas/falla-worker.sh 60
./fallas/falla-servicio-externo.sh 60
./fallas/falla-replica-api.sh
```

Para que la falla se note, genera tráfico en una tercera terminal (`k6 run -e NIVEL=base k6/carga.js`) o usa la aplicación a mano.

Cuando termine la falla, detén el sondeo con `Ctrl+C`: imprime la **disponibilidad observada**, la tasa de éxito, el número de cortes y el **mayor corte (recuperación observada)**.

Después comprueba que no se perdieron ni duplicaron datos:
```bash
./fallas/verificar-cola.sh
```
y, si el backend ofrece un punto de acceso a la base de datos, las consultas de [`fallas/verificar-notificaciones.sql`](fallas/verificar-notificaciones.sql).

### 5. Logs como evidencia
```bash
./descargar-logs.sh 30      # últimos 30 minutos de API, worker y servicio externo
```

### 6. Llenar el registro
Pega los resultados en [`REGISTRO-DE-PRUEBAS.md`](REGISTRO-DE-PRUEBAS.md).

## Qué mide cada cosa

| Pedido del PDF | Dónde sale |
|---|---|
| Duración, usuarios concurrentes, solicitudes totales, p95, solicitudes/s, % errores | `resultados/carga-*.md` |
| Disponibilidad observada por tiempo | `resultados/sondeo-*.json` (`disponibilidad_observada_pct`) |
| Tasa de éxito (distinta de la disponibilidad) | `resultados/sondeo-*.json` (`tasa_de_exito_pct`) |
| Tiempo entre la interrupción y la recuperación del flujo | `mayor_corte_s` del sondeo y el resumen de cada `falla-*.log` |
| Logs con fecha y hora | `resultados/falla-*.log`, `resultados/logs-*` |
| Pérdida o duplicación de datos | `verificar-cola.sh` y `verificar-notificaciones.sql` |

## Qué decir en la sustentación

- Una sola falla da un tiempo de recuperación **observado**, no una estimación robusta del MTTR. Repítanla 2 o 3 veces y reporten el mayor corte.
- Una prueba corta no demuestra disponibilidad anual.
- Dos réplicas en la misma zona no demuestran tolerancia a perder esa zona.

## Estado de estos scripts

Escritos contra el contrato de API de `infra/CONTRATO-INTEGRACION.md` y el README del frontend. **No se han ejecutado contra una API real** (todavía no existe en AWS), así que la primera corrida puede requerir ajustar rutas o campos de respuesta.
