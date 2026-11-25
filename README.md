# 🐼 Red Panda Poker

Planning Poker fürs Refinement – ohne Werbung, im Rote-Panda-Design.

**Live:** https://tibar-collab.github.io/red-panda-poker/

## So funktioniert's

1. Link öffnen (Standardraum `team`, eigener Raum über `…/#/mein-raum`).
2. Namen eingeben, optional „nur zuschauen“.
3. Alle wählen verdeckt eine Karte (Fibonacci: 0, ½, 1, 2, 3, 5, 8, 13, 21, ?, ☕).
4. Jeder darf **Karten aufdecken** → Durchschnitt, Spanne, Verteilung.
   Niedrigste Karte grün, höchste gelb umrandet. Bei Einigkeit jubelt der Panda.
5. **Neue Runde** setzt alle Karten und das Ticket-Feld zurück.

## Technik

- **Angular 22** (Standalone Components, Signals, zoneless)
- **Supabase Realtime** – ohne Datenbanktabellen:
  - *Presence* zeigt, wer gerade im Raum ist.
  - *Broadcast* überträgt den Zustand jedes Teilnehmers (Name, gewählt ja/nein,
    Karte erst nach dem Aufdecken, aktuelle Runde). Jeder Client wiederholt
    seinen Stand alle 15 s, damit verlorene Nachrichten sich selbst heilen.
  - Die „neueste“ Runde gewinnt (höchste Rundennummer, dann jüngster
    Zeitstempel) – so übernehmen Nachzügler automatisch den aktuellen Stand.
- **GitHub Pages** – Deployment per GitHub Actions bei jedem Push auf `main`.
- Ein zweiter Workflow pingt Supabase alle 3 Tage, damit das kostenlose
  Projekt nicht pausiert wird.

Supabase-Projekt: `red-panda-poker` (Region Frankfurt). URL und
Publishable Key stehen in `src/app/config.ts` – der Key ist öffentlich gedacht.

### Wichtige Dateien

| Datei | Inhalt |
|---|---|
| `src/app/poker.service.ts` | Echtzeit-Logik (Supabase-Kanal, Runden-Zustand, Auswertung) |
| `src/app/room/` | Spieltisch, Kartenhand, Ergebnis |
| `src/app/join/` | Anmeldung mit Namen |
| `src/app/panda/` | Maskottchen als SVG mit Stimmungen |
| `src/app/config.ts` | Supabase-Zugang, Kartendeck, Standardraum |
| `src/styles.scss` | Farbwelt & globale Styles |

## Lokal entwickeln

```bash
npm install
npm start        # http://localhost:4200
```

Mehrere Spieler testen: dieselbe URL in mehreren Tabs/Fenstern öffnen.

## Hinweis

Wer den Link kennt, kann den Raum betreten. Es werden keine Daten gespeichert –
Schätzungen existieren nur, solange jemand im Raum ist.
