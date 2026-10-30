#!/usr/bin/env bash
# Estado de las colas: sirve para comprobar que no se perdieron mensajes tras una falla.
#   ./fallas/verificar-cola.sh
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
requerir_aws

detalle() {
  aws sqs get-queue-attributes --queue-url "$1" \
    --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    --query 'Attributes' --output json
}

echo "== Cola principal (visibles = pendientes, no visibles = en proceso) =="
detalle "$COLA_URL"
echo
echo "== Cola de mensajes fallidos (DLQ): debe estar en 0 =="
detalle "$DLQ_URL"
