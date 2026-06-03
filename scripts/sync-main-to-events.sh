#!/bin/bash
# scripts/sync-main-to-events.sh
# Verteilt Updates aus main in alle Event-Branches.
# Ausführen nach jedem main-Merge: bash scripts/sync-main-to-events.sh

set -e

REMOTE="https://alltheflowers-121@github.com/alltheflowers-121/tagungen-2026.git"

EVENT_BRANCHES=(
  "feat/model-steuerrecht"
  "feat/model-oeffentliche-finanzen"
  "feat/model-lohnpfaendung"
  "feat/model-vollstreckungsrecht"
  "feat/model-fuehrungstage"
  "feat/model-personalvertretungsrecht"
  "feat/model-staatsangehoerigkeitsrecht"
  "feat/model-insolvenzrecht"
  "feat/model-datenschutz"
  "feat/model-waffenrecht"
  "feat/model-gleichstellung"
  "feat/model-sozialrecht-sgb-ix"
  "feat/model-sozialrecht-sgb-xii"
  "feat/model-personaltage"
  "feat/model-gemeinnuetzigkeitsrecht"
  "feat/model-kindesunterhalt"
  "feat/model-betreuungsrecht"
  "feat/model-vormundschaft"
  "feat/model-auslaenderrecht"
  "feat/model-jugendhilfe"
  "feat/model-beamtenrecht"
)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  main → alle Event-Branches synchronisieren  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Sicherstellen dass main aktuell ist
git checkout main
git pull origin main 2>/dev/null || echo "  ℹ  Kein remote pull (lokal)"

OK=0; FAIL=0; SKIP=0

for BRANCH in "${EVENT_BRANCHES[@]}"; do
  echo "──────────────────────────────────────────────"
  echo "  $BRANCH"

  git checkout "$BRANCH" 2>/dev/null || { echo "  ⚠  Branch nicht gefunden"; SKIP=$((SKIP+1)); continue; }

  # Merge main → Konflikte prüfen
  if git merge main --no-edit 2>/dev/null; then
    echo "  ✓  Gemergt"
    OK=$((OK+1))
  else
    echo "  ✗  Konflikt – bitte manuell lösen:"
    echo "     git checkout $BRANCH && git merge main"
    git merge --abort 2>/dev/null || true
    FAIL=$((FAIL+1))
  fi
done

# Alles pushen
echo ""
echo "🚀  Pushe alle Branches…"
git push "$REMOTE" --all

git checkout main

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅  $OK Branches aktualisiert"
[ $SKIP -gt 0 ] && echo "  ℹ  $SKIP übersprungen"
[ $FAIL -gt 0 ] && echo "  ✗  $FAIL Konflikte – bitte manuell lösen"
echo "══════════════════════════════════════════════"
