#!/bin/bash
# scripts/setup-dev-branches.sh
# Legt dev + alle Feature-Branches an.
# Einmalig ausführen: bash scripts/setup-dev-branches.sh

set -e

REMOTE="https://alltheflowers-121@github.com/alltheflowers-121/tagungen-2026.git"

FEATURE_BRANCHES=(
  "feat/import-excel"
  "feat/listen-erstellung"
  "feat/api-auth"
  "feat/qr-scanner"
  "feat/email-versand"
)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Dev + Feature-Branches anlegen              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

git checkout main

# ── dev-Branch ────────────────────────────────────────────────
echo "── dev"
if git show-ref --quiet refs/heads/dev; then
  echo "  ℹ  Existiert bereits"
  git checkout dev
else
  git checkout -b dev
  git commit --allow-empty -m "chore: dev integration branch"
  echo "  ✓  Erstellt"
fi
git checkout main

# ── Feature-Branches von dev ──────────────────────────────────
for BRANCH in "${FEATURE_BRANCHES[@]}"; do
  echo "── $BRANCH"
  git checkout dev
  if git show-ref --quiet "refs/heads/$BRANCH"; then
    echo "  ℹ  Existiert bereits"
  else
    git checkout -b "$BRANCH"
    git commit --allow-empty -m "feat: branch $BRANCH erstellt"
    echo "  ✓  Erstellt"
  fi
  git checkout main
done

# ── Alles pushen ──────────────────────────────────────────────
echo ""
echo "🚀  Pushe alle Branches…"
git push "$REMOTE" dev
git push "$REMOTE" --all

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅  Fertig"
echo ""
echo "  Nächste Schritte:"
echo "  git checkout feat/import-excel    → Import weiterentwickeln"
echo "  git checkout feat/listen-erstellung → Listen bauen"
echo "══════════════════════════════════════════════"
