#!/bin/bash
# setup-branches.sh
# Erstellt alle Event-Branches und kopiert die zugehörige Konfiguration.
# Ausführen: bash setup-branches.sh
#
# Voraussetzung: du bist im Repo-Root, main ist ausgecheckt & committed.

set -e

EVENTS=(
  "steuerrecht"
  "oeffentliche-finanzen"
  "lohnpfaendung"
  "vollstreckungsrecht"
  "fuehrungstage"
  "personalvertretungsrecht"
  "staatsangehoerigkeitsrecht"
  "insolvenzrecht"
  "datenschutz"
  "waffenrecht"
  "gleichstellung"
  "sozialrecht-sgb-ix"
  "sozialrecht-sgb-xii"
  "personaltage"
  "gemeinnuetzigkeitsrecht"
  "kindesunterhalt"
  "betreuungsrecht"
  "vormundschaft"
  "auslaenderrecht"
  "jugendhilfe"
  "beamtenrecht"
)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  KBW Tagungsapp – Branch Setup 2026          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Sicherstellen dass main sauber ist
git checkout main
git status --short | grep -q '.' && echo "⚠  Uncommitted changes – bitte erst committen." && exit 1

for SLUG in "${EVENTS[@]}"; do
  BRANCH="feat/model-${SLUG}"
  CONFIG_SRC="configs/event_config.${SLUG}.json"

  echo "──────────────────────────────────────────────"
  echo "  Branch: ${BRANCH}"

  # Branch anlegen (oder wechseln falls schon vorhanden)
  if git show-ref --quiet "refs/heads/${BRANCH}"; then
    echo "  ℹ  Branch existiert bereits – wechsle hinein"
    git checkout "${BRANCH}"
  else
    git checkout -b "${BRANCH}"
    echo "  ✓  Branch erstellt"
  fi

  # Config kopieren
  if [ -f "${CONFIG_SRC}" ]; then
    cp "${CONFIG_SRC}" api/event_config.json

    # event.js mit Slug + CDN-URL aktualisieren
    UPPER_SLUG=$(echo "$SLUG" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
    sed -i.bak "s|cdnUrl:.*|cdnUrl:    'https://${SLUG}.kbw.de',|g" static/config/event.js
    rm -f static/config/event.js.bak

    git add api/event_config.json static/config/event.js
    git commit -m "feat: ${SLUG} 2026 – event_config + CDN-URL" --allow-empty
    echo "  ✓  Committed"
  else
    echo "  ⚠  Config nicht gefunden: ${CONFIG_SRC}"
  fi

  # Zurück zu main
  git checkout main
done

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅  ${#EVENTS[@]} Branches angelegt"
echo ""
echo "  Jetzt pushen:"
echo "  git remote add origin https://github.com/KBW-eV/bunny-script-standalone-tickets-v2.git"
echo "  git push origin --all"
echo ""
echo "  Dann pro Branch deployen:"
echo "  git checkout feat/model-personaltage"
echo "  node dashboard/deploy.js"
echo "══════════════════════════════════════════════"
echo ""
