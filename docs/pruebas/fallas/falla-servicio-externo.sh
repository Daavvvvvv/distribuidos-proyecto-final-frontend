#!/usr/bin/env bash
# Falla controlada 2: se cae el servicio externo de validación de correo.
# Se simula poniendo en 0 la concurrencia reservada de la Lambda (todas las llamadas fallan).
# Esperado: el backend aplica timeout, reintentos y circuit breaker, y degrada el servicio
# (por ejemplo "validación pendiente") en lugar de tumbar el flujo completo.
#
#   ./fallas/falla-servicio-externo.sh [segundos_caido]     (por defecto 60)
#
# Recomendado: corre el sondeo y haz registros/inscripciones en la app durante la falla.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
requerir_aws
iniciar_registro "falla-servicio-externo"

CAIDO_S="${1:-60}"

# Llamada directa al servicio externo: imprime código HTTP y tiempo.
llamar_externo() {
  curl -s -o /dev/null -m 10 -w "HTTP %{http_code} en %{time_total}s" \
    -X POST "$URL_EXTERNO/validar-correo" -H 'content-type: application/json' \
    -d '{"email":"prueba@universidad.edu.co"}' || echo "sin respuesta"
}

log "ANTES de la falla: $(llamar_externo)"

log "FALLA: concurrencia reservada de la Lambda = 0 durante ${CAIDO_S} s"
t_falla=$(date +%s)
aws lambda put-function-concurrency --function-name "$FUNCION_MOCK" --reserved-concurrent-executions 0 >/dev/null

while (( $(date +%s) - t_falla < CAIDO_S )); do
  log "servicio externo caído | $(llamar_externo)"
  sleep 5
done

log "RECUPERACIÓN: se quita la restricción de concurrencia"
t_recupera=$(date +%s)
aws lambda delete-function-concurrency --function-name "$FUNCION_MOCK" >/dev/null

recuperado=0
while (( $(date +%s) - t_recupera < 120 )); do
  r=$(llamar_externo)
  log "esperando recuperación | $r"
  if [[ "$r" == HTTP\ 200* ]]; then recuperado=1; break; fi
  sleep 2
done

t_fin=$(date +%s)
log "------ RESUMEN ------"
log "Tiempo con el servicio externo caído:     $((t_recupera - t_falla)) s"
if (( recuperado )); then
  log "Tiempo hasta responder 200 tras restaurar: $((t_fin - t_recupera)) s"
  log "Tiempo total de interrupción a recuperación: $((t_fin - t_falla)) s"
else
  log "El servicio NO respondió 200 en 120 s tras restaurar. Revisar la Lambda."
fi
