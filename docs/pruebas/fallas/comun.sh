#!/usr/bin/env bash
# Funciones y valores comunes de los scripts de falla controlada.
# Los valores por defecto corresponden a la infraestructura desplegada (infra/);
# se pueden cambiar con variables de entorno.
export AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
CLUSTER="${CLUSTER:-eventos-u-cluster}"
FUNCION_MOCK="${FUNCION_MOCK:-eventos-u-mock-externo}"
URL_EXTERNO="${URL_EXTERNO:-https://1cc5h4f9vd.execute-api.us-east-1.amazonaws.com}"
COLA_URL="${COLA_URL:-https://sqs.us-east-1.amazonaws.com/240864711260/eventos-u-notificaciones}"
DLQ_URL="${DLQ_URL:-https://sqs.us-east-1.amazonaws.com/240864711260/eventos-u-notificaciones-dlq}"

mkdir -p "$(dirname "${BASH_SOURCE[0]}")/../resultados"
DIR_RESULTADOS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../resultados" && pwd)"

# Escribe en pantalla y en el archivo de registro de la falla (con fecha y hora).
iniciar_registro() {
  ARCHIVO_LOG="$DIR_RESULTADOS/$1-$(date +%Y%m%d-%H%M%S).log"
  : > "$ARCHIVO_LOG"
  echo "Registro: $ARCHIVO_LOG"
}

log() {
  local linea
  linea="$(date -u +%Y-%m-%dT%H:%M:%SZ)  $*"
  echo "$linea" | tee -a "$ARCHIVO_LOG"
}

# Mensajes en la cola: visibles + en proceso.
mensajes_en_cola() {
  local url="$1"
  aws sqs get-queue-attributes --queue-url "$url" \
    --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    --query 'Attributes.[ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible]' \
    --output text | awk '{print $1 + $2}'
}

requerir_aws() {
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "No hay sesión de AWS válida. Revisa tus credenciales (aws sts get-caller-identity)." >&2
    exit 1
  fi
}
