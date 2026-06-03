# Neues Event anlegen – Checkliste

## 1. Branch erstellen
```bash
git checkout main
git clone https://github.com/KBW-eV/bunny-script-standalone-tickets-v2.git
cd bunny-script-standalone-tickets-v2
git pull origin main
git checkout -b feat/model-EVENTNAME
```

## 2. Bunny Pull Zone anlegen
1. bunny.net → CDN → Pull Zone → „Add Pull Zone"
2. Name: `kbw-EVENTNAME`
3. Origin: Storage Zone `kbw-EVENTNAME` (vorher anlegen)
4. Custom Hostname: `EVENTNAME.kbw.de`
5. **Pull Zone ID notieren** (steht in der URL nach dem Anlegen)

## 3. Drei Dateien anpassen

### api/event_config.json
- `event.*` → Name, Datum, Ort, Prefix
- `bunny.*` → storage_zone, pull_zone_id, cdn_url
- `smtp.*`  → from_name, reply_to
- `phases.*` → opens_at, closes_at
- `selections.*` → Fachforen, Programmpunkte

### static/config/event.js
- Spiegelt event_config.json für den Browser
- `EVENT.cdnUrl` → Pull Zone URL

### api/schema_event.sql
- Seed-Daten für `fachforen` und `programmpunkte` anpassen
- `reference_number_seq` → Startpunkt prüfen

## 4. Deployen
```bash
# .env prüfen: BUNNY_STORAGE_KEY + BUNNY_API_KEY gesetzt?
cd dashboard
node deploy.js --dry-run   # erst testen
node deploy.js             # dann deployen
```

## 5. DNS
```
EVENTNAME.kbw.de  CNAME  kbw-EVENTNAME.b-cdn.net
```

## Parallele Events – Übersicht

| Branch                    | CDN URL                          | Pull Zone         |
|---------------------------|----------------------------------|-------------------|
| feat/model-personaltage   | https://personaltage.kbw.de     | kbw-personaltage  |
| feat/model-pruefertage    | https://pruefertage.kbw.de      | kbw-pruefertage   |
| feat/model-auslaender     | https://auslaender.kbw.de       | kbw-auslaender    |
| feat/model-EVENTNAME      | https://EVENTNAME.kbw.de        | kbw-EVENTNAME     |
