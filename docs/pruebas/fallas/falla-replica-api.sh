#!/usr/bin/env bash
# Falla controlada 3: se cae una réplica de la API.
# Con 2 réplicas, la otra atiende mientras ECS lanza una tarea nueva por su cuenta.
# Con 1 réplica (línea base: terraform apply -var app_enabled=true -var api_replicas=1),
# el servicio se corta hasta que la tarea nueva pasa los health checks del balanceador.
#
#   ./fallas/falla-replica-api.sh
#
# Recomendado: corre el sondeo y una carga suave mientras se ejecuta.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
requerir_aws
iniciar_registro "falla-replica-api"

DESEADAS=$(aws ecs describe-services --cluster "$CLUSTER" --services api --query 'services[0].desiredCount' --output text)
if (( DESEADAS < 1 )); then
  echo "La API está apagada (0 réplicas). Enciéndela con terraform apply -var app_enabled=true." >&2
  exit 1
fi

TG_ARN=$(aws elbv2 describe-target-groups --names eventos-u-api --query 'TargetGroups[0].TargetGroupArn' --output text)
# Réplicas sanas sin contar la detenida: el balanceador la sigue viendo sana unos segundos
# hasta sacarla, y contarla haría parecer que el servicio se recuperó antes de tiempo.
IP_CAIDA=""
sanas() {
  aws elbv2 describe-target-health --target-group-arn "$TG_ARN" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy' && Target.Id!='$IP_CAIDA'])" --output text
}

log "ESTADO INICIAL: réplicas sanas = $(sanas) de $DESEADAS"
TAREA=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name api --desired-status RUNNING --query 'taskArns[0]' --output text)
IP_CAIDA=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TAREA" \
  --query "tasks[0].attachments[0].details[?name=='privateIPv4Address'].value | [0]" --output text)
log "FALLA: se detiene la tarea ${TAREA##*/} ($IP_CAIDA)"
t_falla=$(date +%s)
aws ecs stop-task --cluster "$CLUSTER" --task "$TAREA" --reason "Falla controlada de prueba" >/dev/null

recuperado=0
while (( $(date +%s) - t_falla < 600 )); do
  s=$(sanas)
  log "réplicas sanas sin la detenida = $s de $DESEADAS"
  if (( s >= DESEADAS )); then recuperado=1; break; fi
  sleep 5
done

t_fin=$(date +%s)
log "------ RESUMEN ------"
if (( recuperado )); then
  log "Tiempo hasta tener de nuevo $DESEADAS réplicas sanas: $((t_fin - t_falla)) s"
else
  log "NO se recuperaron las réplicas en 600 s. Revisar el servicio en ECS."
fi
