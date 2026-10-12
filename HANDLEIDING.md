# DE MACHTENTEMPEL — HANDLEIDING

## Eerst testen (zonder accounts)
1. Pak het ZIP-bestand uit.
2. Open `index.html` in Chrome of Edge.
3. Kies **Leerkracht → Demonstratie spelen**.
4. Klik **Start avontuur** en vervolgens **Willekeurig team vooruit**. Zo zie je de tempel, de voortgang en de duels.
5. Klik **Finale starten** om het finalescherm te zien.

De demonstratie is een lokale test. Andere laptops kunnen hier nog niet aan deelnemen.

## Eenmalig online instellen (voor 6–8 echte laptops)

Je hebt **GitHub Pages én Firebase** nodig. Je installeert niets op de schoolcomputers.

### A. Firebase (Google)
1. Ga naar https://console.firebase.google.com/ en maak een project aan.
2. Voeg in **Projectinstellingen → Jouw apps** een **Web-app** toe (het `</>`-symbool). Kopieer de getoonde Firebase-configuratie.
3. Open **Build → Authentication → Sign-in method** en schakel **Anoniem** in.
4. Open **Build → Realtime Database → Database maken**. Kies een regio en beveiligde modus.
5. Open het tabblad **Regels** en vervang de regels door de inhoud van `database.rules.json` (onderaan ook hier). Klik op Publiceren.
6. Open `firebase-config.js` met Kladblok. Vul `apiKey`, `authDomain`, `databaseURL`, `projectId` en `appId` in met de waarden van je web-app en de Realtime Database. Bewaar het bestand.

### B. GitHub Pages
1. Maak een GitHub-account op https://github.com/ (als je dat nog niet hebt).
2. Klik op **New repository** en geef het bijvoorbeeld de naam `machtentempel`. Kies **Public**.
3. Upload **alle bestanden uit de uitgepakte map** naar de hoofdmap van de repository (niet het ZIP-bestand zelf).
4. Ga naar **Settings → Pages → Build and deployment → Deploy from a branch**. Kies `main` en `/ (root)`. Bewaar.
5. Open de link die GitHub Pages toont (kan enkele minuten duren).

### C. In de klas
1. Open de GitHub Pages-link op de leerkrachtencomputer, die op het grote scherm is aangesloten.
2. Klik **Leerkracht → Online klassikaal spel**. Er verschijnt een spelcode van zes tekens.
3. Laat elk groepje dezelfde website openen op de eigen laptop en **Leerling → Deelnemen** kiezen.
4. Laat de leerlingen de spelcode en een unieke teamnaam invullen.
5. Als alle 6–8 groepjes zichtbaar zijn, klik **Start avontuur**.
6. Elk juist antwoord verplaatst de avonturier. Bij een ontmoeting op hetzelfde knooppunt krijgen twee teams een duel. Na 12 minuten begint de finale automatisch; de eerste juiste oplossing wint. Je kunt de finale ook zelf starten.

**Belangrijk:** houd het leerkrachtentabblad open tijdens het spel. Het leerkrachtenscherm verwerkt de antwoorden. Alle computers moeten internet hebben.

## Realtime Database-regels

Het meegeleverde `database.rules.json` gebruikt anonieme Firebase-aanmelding en laat aangemelde deelnemers de spelkamers benaderen. Dit is bedoeld voor een **kleinschalige onderwijsdemo, zonder persoonsgegevens**. Deel geen privégegevens in teamnamen en gebruik dit niet als beveiligde toetsomgeving. De code bevat geen beheerderssleutels, maar de database is niet bestand tegen leerlingen die bewust via de ontwikkelaarstools gegevens manipuleren.

## Wat is wel en niet inbegrepen?
- **Wel:** eigen 2.5D-canvaswereld, 6–8 teams, verschillende routes, punten, automatische voortgang, duels, getoetste opdrachten over machten van product/quotiënt, finale, timer, online synchronisatie, demonstratie.
- **Niet:** een commerciële 3D-game-engine, geluidseffecten, beveiligde accounts, automatische voortgang wanneer het leerkrachtentabblad gesloten is.

## Probleemoplossing
- **Online spel werkt niet:** controleer `firebase-config.js`, de Realtime Database-URL, de anonieme aanmelding en de gepubliceerde database-regels.
- **Leerling blijft wachten:** houd het leerkrachtentabblad open en controleer of alle apparaten internet hebben.
- **Geen teams zichtbaar:** vernieuw de leerkrachtenpagina niet tijdens het aanmelden; start zo nodig een nieuwe spelcode.
- **Een leerling herlaadt de pagina:** laat het team opnieuw deelnemen met een nieuwe naam. Gebruik dit spel in één aaneengesloten sessie.
- **GitHub Pages geeft 404:** controleer of `index.html` in de hoofdmap van de repository staat en of Pages op `main / (root)` is ingesteld.
