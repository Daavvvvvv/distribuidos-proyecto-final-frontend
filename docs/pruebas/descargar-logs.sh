#!/usr/bin/env bash
# Descarga los logs de la API, el worker y el servicio externo con fecha y hora,
# para adjuntarlos como evidencia.
#
#   ./descargar-logs.sh [minutos]     (por defecto los últimos 30)
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/fallas/comun.sh"
requerir_aws

MIN="${1:-30}"
SELLO="$(date +%Y%m%d-%H%M%S)"

for par in "api:/ecs/eventos-u/api" "worker:/ecs/eventos-u/worker" "servicio-externo:/aws/lambda/eventos-u-mock-externo"; do
  nombre="${par%%:*}"
  grupo="${par#*:}"
  destino="$DIR_RESULTADOS/logs-$SELLO-$nombre.log"
  aws logs tail "$grupo" --since "${MIN}m" --format short > "$destino" 2>/dev/null || true
  echo "$nombre: $(wc -l < "$destino" | tr -d ' ') líneas -> $destino"
done
