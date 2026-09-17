#!/usr/bin/env bash
# Testes de banco (migrations + RLS) num Postgres real e descartável.
#
# O que faz, em ordem:
#   1. sobe um container efêmero da mesma imagem do Supabase;
#   2. carrega a baseline de produção (supabase/schema_producao.sql);
#   3. aplica as migrations POSTERIORES à versão registrada em
#      supabase/schema_producao.version — e aplica de novo, para provar que
#      são idempotentes;
#   4. roda cada supabase/tests/*.test.sql (pgTAP) numa transação que termina
#      em ROLLBACK;
#   5. derruba o container — sempre, inclusive em erro ou Ctrl+C.
#
# Uso:  scripts/db-test.sh [filtro]
#   filtro   parte do nome do arquivo de teste (ex.: `sales`)
#
# Variáveis:
#   DB_TEST_IMAGE   imagem do Postgres (padrão: a do projeto)
#   DB_TEST_KEEP=1  não derruba o container no fim (depuração; derrube à mão)
#
# Detalhes em docs/testes/banco.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${DB_TEST_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.155}"
CONTAINER="aguiar-db-test-$$-$(date +%s)"
BASELINE="$ROOT/supabase/schema_producao.sql"
BASELINE_VERSION_FILE="$ROOT/supabase/schema_producao.version"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
TESTS_DIR="$ROOT/supabase/tests"
FILTER="${1:-}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  local status=$?
  if [[ "${DB_TEST_KEEP:-}" == "1" ]]; then
    log "DB_TEST_KEEP=1: container $CONTAINER continua de pé (docker rm -f $CONTAINER)"
  else
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

command -v docker >/dev/null || fail "docker não encontrado"
[[ -f "$BASELINE" ]] || fail "baseline ausente: $BASELINE"
[[ -f "$BASELINE_VERSION_FILE" ]] || fail "versão da baseline ausente: $BASELINE_VERSION_FILE"

BASELINE_VERSION="$(tr -d '[:space:]' < "$BASELINE_VERSION_FILE")"
[[ "$BASELINE_VERSION" =~ ^[0-9]{14}$ ]] \
  || fail "$BASELINE_VERSION_FILE precisa conter só a versão (14 dígitos), achei '$BASELINE_VERSION'"
ls "$MIGRATIONS_DIR/${BASELINE_VERSION}_"*.sql >/dev/null 2>&1 \
  || fail "a versão da baseline ($BASELINE_VERSION) não corresponde a nenhuma migration"

# Migrations pendentes: versão (prefixo numérico) maior que a da baseline.
PENDING=()
while IFS= read -r file; do
  version="$(basename "$file" | cut -d_ -f1)"
  if [[ "$version" > "$BASELINE_VERSION" ]]; then
    PENDING+=("$file")
  fi
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '[0-9]*_*.sql' | LC_ALL=C sort)

# `postgres` é o papel que aplica migrations no Supabase (não é superusuário,
# como na produção). `supabase_admin` só prepara o schema `auth` de teste.
psql_as() {
  local user="$1"; shift
  docker exec -i -e PGPASSWORD=postgres -e PGOPTIONS="-c client_min_messages=warning" "$CONTAINER" psql -X -q -v ON_ERROR_STOP=1 \
    -U "$user" -h 127.0.0.1 -d postgres "$@"
}
psql_in() { psql_as postgres "$@"; }

log "subindo $IMAGE ($CONTAINER)"
docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  "$IMAGE" >/dev/null

# A imagem reinicia o servidor depois dos scripts de init; só confia depois
# de algumas respostas seguidas.
ready=0
for _ in $(seq 1 90); do
  if docker exec "$CONTAINER" psql -X -U postgres -h 127.0.0.1 -d postgres -Atc 'select 1' >/dev/null 2>&1; then
    ready=$((ready + 1))
    [[ $ready -ge 3 ]] && break
  else
    ready=0
  fi
  sleep 1
done
[[ $ready -ge 3 ]] || { docker logs "$CONTAINER" 2>&1 | tail -30; fail "Postgres não ficou pronto"; }

log "preparando o ambiente de teste (auth, pgTAP)"
psql_as supabase_admin < "$TESTS_DIR/bootstrap/00_auth.sql" >/dev/null

log "carregando a baseline de produção (até $BASELINE_VERSION)"
psql_in < "$BASELINE" >/dev/null

if [[ ${#PENDING[@]} -eq 0 ]]; then
  log "nenhuma migration pendente"
else
  for pass in 1 2; do
    for file in "${PENDING[@]}"; do
      log "migration pendente ($pass/2): $(basename "$file")"
      psql_in < "$file" >/dev/null
    done
  done
fi

psql_in < "$TESTS_DIR/bootstrap/10_helpers.sql" >/dev/null

TEST_FILES=()
while IFS= read -r file; do
  [[ -z "$FILTER" || "$(basename "$file")" == *"$FILTER"* ]] && TEST_FILES+=("$file")
done < <(find "$TESTS_DIR" -maxdepth 1 -name '*.test.sql' | LC_ALL=C sort)
[[ ${#TEST_FILES[@]} -gt 0 ]] || fail "nenhum teste encontrado (filtro: '${FILTER}')"

failed=0
total=0
for file in "${TEST_FILES[@]}"; do
  name="$(basename "$file")"
  set +e
  output="$(psql_in -At < "$file" 2>&1)"
  status=$?
  set -e
  # Chamadas `void` (seed, login) saem como linhas vazias.
  printf '%s\n' "$output" | grep -v '^[[:space:]]*$' | sed "s/^/  [$name] /" || true
  planned="$(printf '%s\n' "$output" | grep -Eo '^1\.\.[0-9]+' | head -1 | cut -d. -f3)"
  total=$((total + ${planned:-0}))
  if [[ $status -ne 0 ]] \
     || printf '%s\n' "$output" | grep -Eq '^not ok|^# Looks like|ERROR:'; then
    failed=$((failed + 1))
    printf '\033[1;31mFALHOU\033[0m %s\n' "$name"
  else
    printf '\033[1;32mOK\033[0m     %s\n' "$name"
  fi
done

if [[ $failed -gt 0 ]]; then
  fail "$failed de ${#TEST_FILES[@]} arquivo(s) de teste falharam"
fi
log "todos os ${#TEST_FILES[@]} arquivo(s) passaram ($total asserções)"
