#!/usr/bin/env bash
# Прогоняет Skylos (dead code / security / secrets / quality / SCA) по всему репозиторию.
# Используется одинаково в CI job'e skylos-check, локально (`npm run check:skylos`) и AI-агентами.
#
# Phase A (informational): падение этого скрипта не блокирует merge — GitHub Ruleset
# для skylos-check ещё не настроен (см. docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md).

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Дефолтный grep-verification budget (30s) стабильно не хватает на этом репозитории и
# приводит к SKY-ANALYSIS-INCOMPLETE (exit 2) вместо честного pass/fail по находкам.
export SKYLOS_GREP_BUDGET="${SKYLOS_GREP_BUDGET:-120}"

EXCLUDES=(--exclude coverage --exclude graphify-out)
CONFIG=(--config-file "$ROOT_DIR/pyproject.toml")
DIFF_BASE_REF="${SKYLOS_DIFF_BASE:-origin/${GITHUB_BASE_REF:-develop}}"
DIFF_ARGS=()

if git rev-parse --verify --quiet "$DIFF_BASE_REF" >/dev/null; then
    DIFF_ARGS=(--diff-base "$DIFF_BASE_REF")
else
    echo "WARN: Skylos diff base '$DIFF_BASE_REF' not found; falling back to full repository scan."
fi

# --format и --github взаимоисключающие флаги Skylos (нельзя запросить и читаемый лог,
# и GitHub PR-аннотации одной командой) — гоняем анализ дважды: один раз для читаемого
# лога (нужен для сравнения находок между прогонами в baseline-периоде), второй раз для
# inline-аннотаций прямо на diff в PR.
echo "==> Skylos audit (readable log)"
concise_status=0
skylos . -a --format concise --baseline "${DIFF_ARGS[@]}" "${EXCLUDES[@]}" "${CONFIG[@]}" || concise_status=$?

echo
echo "==> Skylos audit (GitHub PR annotations)"
github_status=0
skylos . -a --github --baseline "${DIFF_ARGS[@]}" "${EXCLUDES[@]}" "${CONFIG[@]}" || github_status=$?

exit "$concise_status"
