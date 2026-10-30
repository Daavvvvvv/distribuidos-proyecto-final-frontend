#!/usr/bin/env bash
# Falla controlada 1: se cae el worker de notificaciones.
# Esperado: las inscripciones siguen funcionando, los mensajes se acumulan en la cola
# y se entregan solos cuando el worker vuelve.
#
#   ./fallas/falla-worker.sh [segundos_caido]     (por defecto 60)
#
# Recomendado: en otra terminal, corre el sondeo (node sondeo/sondeo.mjs) y genera
# inscripciones (k6 run k6/carga.js) mientras el worker está caído.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
requerir_aws
iniciar_registro "falla-worker"

CAIDO_S="${1:-60}"
log "FALLA: se detiene el worker (desired-count 0) durante ${CAIDO_S} s"
t_falla=$(date +%s)
aws ecs update-service --cluster "$CLUSTER" --service worker --desired-count 0 >/dev/null

while (( $(date +%s) - t_falla < CAIDO_S )); do
  log "worker caído | mensajes en cola: $(mensajes_en_cola "$COLA_URL") | en DLQ: $(mensajes_en_cola "$DLQ_URL")"
  sleep 5
done
acumulados=$(mensajes_en_cola "$COLA_URL")
log "Mensajes acumulados al restaurar: $acumulados"

log "RECUPERACIÓN: se restaura el worker (desired-count 1)"
t_recupera=$(date +%s)
aws ecs update-service --cluster "$CLUSTER" --service worker --desired-count 1 >/dev/null

vacia=0
while (( $(date +%s) - t_recupera < 600 )); do
  n=$(mensajes_en_cola "$COLA_URL")
  log "worker reiniciando | mensajes en cola: $n"
  if [[ "$n" == "0" ]]; then
    vacia=$((vacia + 1))
    (( vacia >= 2 )) && break   # dos lecturas seguidas en cero (el conteo de SQS es aproximado)
  else
    vacia=0
  fi
  sleep 5
done

t_fin=$(date +%s)
en_dlq=$(mensajes_en_cola "$DLQ_URL")
log "------ RESUMEN ------"
log "Tiempo con el worker caído:                 $((t_recupera - t_falla)) s"
log "Mensajes acumulados durante la caída:       $acumulados"
log "Tiempo hasta vaciar la cola tras restaurar: $((t_fin - t_recupera)) s"
log "Tiempo total de interrupción a recuperación: $((t_fin - t_falla)) s"
log "Mensajes en la cola de mensajes fallidos:   $en_dlq (si es mayor que 0 hubo procesamiento fallido)"
