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

# --format и --github взаимоисключающие флаги Skylos (нельзя запросить и читаемый лог,
# и GitHub PR-аннотации одной командой) — гоняем анализ дважды: один раз для читаемого
# лога (нужен для сравнения находок между прогонами в baseline-периоде), второй раз для
# inline-аннотаций прямо на diff в PR.
echo "==> Skylos audit (readable log)"
concise_status=0
skylos . -a --format concise "${EXCLUDES[@]}" || concise_status=$?

echo
echo "==> Skylos audit (GitHub PR annotations)"
github_status=0
skylos . -a --github "${EXCLUDES[@]}" || github_status=$?

exit "$concise_status"
