#!/usr/bin/env bash
# Falla controlada 3: se cae una de las dos réplicas de la API.
# Esperado: la otra réplica atiende, el balanceador deja de enviarle tráfico a la caída
# y ECS lanza una tarea nueva por su cuenta.
#
#   ./fallas/falla-replica-api.sh
#
# Recomendado: corre el sondeo y una carga suave mientras se ejecuta.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
requerir_aws
iniciar_registro "falla-replica-api"

DESEADAS=$(aws ecs describe-services --cluster "$CLUSTER" --services api --query 'services[0].desiredCount' --output text)
if (( DESEADAS < 2 )); then
  echo "La API tiene $DESEADAS réplica(s) deseada(s). Para esta falla hacen falta 2 (terraform apply -var app_enabled=true)." >&2
  exit 1
fi

TG_ARN=$(aws elbv2 describe-target-groups --names eventos-u-api --query 'TargetGroups[0].TargetGroupArn' --output text)
sanas() {
  aws elbv2 describe-target-health --target-group-arn "$TG_ARN" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])" --output text
}

log "ESTADO INICIAL: réplicas sanas = $(sanas) de $DESEADAS"
TAREA=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name api --desired-status RUNNING --query 'taskArns[0]' --output text)
log "FALLA: se detiene la tarea ${TAREA##*/}"
t_falla=$(date +%s)
aws ecs stop-task --cluster "$CLUSTER" --task "$TAREA" --reason "Falla controlada de prueba" >/dev/null

recuperado=0
while (( $(date +%s) - t_falla < 600 )); do
  s=$(sanas)
  log "réplicas sanas = $s de $DESEADAS"
  if (( s >= DESEADAS )) && (( $(date +%s) - t_falla > 10 )); then recuperado=1; break; fi
  sleep 5
done

t_fin=$(date +%s)
log "------ RESUMEN ------"
if (( recuperado )); then
  log "Tiempo hasta tener de nuevo $DESEADAS réplicas sanas: $((t_fin - t_falla)) s"
else
  log "NO se recuperaron las réplicas en 600 s. Revisar el servicio en ECS."
fi
