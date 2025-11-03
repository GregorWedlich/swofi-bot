# Push Feature Testing Guide

## 🚀 Setup vor dem Testen

### 1. Bot Commands bei BotFather registrieren

Sende diese Nachricht an [@BotFather](https://t.me/BotFather):

```
/setcommands
```

Wähle deinen Bot aus und füge dann diese Commands hinzu:

```
submit - Event einreichen
search - Events suchen
edit - Event bearbeiten
delete - Event löschen
push - Event pushen (bumpen)
templates - Vorlagen verwalten
support - Support kontaktieren
rules - Regeln anzeigen
blacklist - Blacklist verwalten (nur Admin)
```

### 2. Testing-Konfiguration setzen

Um das Feature zu testen **ohne 7 Tage zu warten**, füge diese Zeile zu deiner `.env` Datei hinzu:

```bash
PUSH_MIN_AGE_DAYS=0
```

**WICHTIG:** Nach dem Testing für Production wieder auf `7` setzen!

```bash
PUSH_MIN_AGE_DAYS=7
```

### 3. Bot neu starten

```bash
pnpm build
# Dann deinen Bot neu starten (Docker restart, pm2 restart, etc.)
```

---

## ✅ Testing Checklist

### Test 1: User Flow - Normaler Push
- [ ] `/push` Command eingeben
- [ ] "Ja" Button klicken
- [ ] Liste der pushbaren Events wird angezeigt
- [ ] Event auswählen
- [ ] Preview wird korrekt angezeigt (mit Bild falls vorhanden)
- [ ] "Bestätigen" Button klicken
- [ ] Alte Nachricht im Channel wird gelöscht
- [ ] Neue Nachricht im Channel erscheint (identischer Inhalt)
- [ ] Success-Nachricht vom Bot erhalten
- [ ] Admin erhält Notification mit 🔄 Icon

### Test 2: Kein pushbares Event
- [ ] User hat kein Event oder alle schon gepusht
- [ ] `/push` eingeben
- [ ] "Keine pushbaren Events" Nachricht erscheint
- [ ] Requirements werden angezeigt (7 Tage, approved, etc.)

### Test 3: Abbrechen auf verschiedenen Stufen
- [ ] Bei erster Bestätigung "Nein" klicken → Abbruch-Nachricht
- [ ] Bei Event-Liste "Abbrechen" klicken → Abbruch-Nachricht  
- [ ] Nach Preview "Abbrechen" klicken → Abbruch-Nachricht

### Test 4: Push Limit (kann nur 1x pushen)
- [ ] Event pushen (erfolgreich)
- [ ] `/push` nochmal eingeben
- [ ] Event erscheint **nicht** mehr in der Liste
- [ ] (Weil `pushedCount` jetzt 1 ist, max erlaubt ist 1)

### Test 5: Edge Cases

#### 5a. Event wurde im Channel gelöscht
- [ ] Channel-Nachricht manuell löschen
- [ ] Event pushen
- [ ] Bot zeigt Fehler (message not found) → sollte graceful behandelt werden

#### 5b. Zukünftiges Event ist abgelaufen
- [ ] Event mit `endDate` in der Vergangenheit
- [ ] Erscheint **nicht** in pushbaren Events

#### 5c. Pending/Rejected Event
- [ ] Event mit Status PENDING oder REJECTED
- [ ] Erscheint **nicht** in pushbaren Events

---

## 🔍 Was zu überprüfen ist

### In der Datenbank (Prisma Studio oder SQL)
```bash
npx prisma studio
```

Nach einem erfolgreichen Push:
- `pushedAt` sollte aktuelles Timestamp sein
- `pushedCount` sollte von 0 auf 1 erhöht worden sein
- `messageId` sollte die neue Message ID sein (optional zu prüfen)

### Im Admin Channel
- Neue Nachricht vom Bot mit Text: "🔄 Gepushtes Event"
- Event Details sollten korrekt sein
- Keine Action Buttons (nur Info)

### Im Public Channel
- Alte Nachricht ist weg
- Neue Nachricht ist identisch (gleicher Text, gleiches Bild)
- Neue Nachricht ist die **neueste** Nachricht im Channel

---

## 🐛 Bekannte Probleme / TODOs

### Zu überprüfen beim Testing:
1. **Telegram Rate Limits**: Viele schnelle Pushes könnten Rate Limiting triggern
2. **Bildgröße**: Events mit großen Bildern (>5MB) könnten Fehler werfen
3. **Lange Texte**: Events mit sehr langen Beschreibungen (>4096 chars) überprüfen
4. **Concurrent Pushes**: Was passiert wenn User 2x gleichzeitig pusht?

---

## 🔧 Debugging

### Logs checken
```bash
# Docker
docker logs -f swofi-bot

# PM2
pm2 logs

# Nodemon (dev)
pnpm dev
```

### Wichtige Log-Zeilen:
- `Pushing event...` - Push startet
- `Event pushed successfully` - Push erfolgreich
- `Error pushing event` - Push Fehler
- `Admin notified about pushed event` - Admin Notification gesendet

---

## 📊 Production Deployment

### Vor dem Go-Live:

1. ✅ Alle Tests durchgeführt
2. ✅ `.env` setzen: `PUSH_MIN_AGE_DAYS=7`
3. ✅ Bot Commands bei BotFather registriert
4. ✅ Code deployed
5. ✅ Bot neu gestartet
6. ✅ Feature in Bot-Regeln/Hilfe dokumentieren

### Monitoring nach Launch:

- [ ] Fehler-Logs beobachten (erste 24h)
- [ ] User Feedback sammeln
- [ ] Anzahl der Pushes pro Tag tracken (optional)
- [ ] Admin Notifications überprüfen

---

## 💡 Tipps

- **Test User**: Am besten mit einem echten Test-User testen (nicht Admin)
- **Test Events**: Erstelle mehrere Test-Events mit verschiedenen Stati
- **Timing**: Für realistisches Testing `PUSH_MIN_AGE_DAYS=1` setzen (1 Tag statt 7)
- **Screenshots**: Mache Screenshots der UI für Dokumentation

---

## ❓ Fragen / Issues

Bei Problemen:
1. Logs checken
2. Prisma Studio: Datenbank Zustand überprüfen
3. TypeScript neu builden: `pnpm build`
4. Prisma Client neu generieren: `npx prisma generate`
