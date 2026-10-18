# Controle van de testversie — 18 oktober 2026

## Uitgevoerde controles

`node test-v2/tests/regression.mjs`

- 3, 8 en 30 teams: unieke slots, avatarselectie, zes hoofdstukken, foute antwoorden, finale tot vak 16.
- Geen gelijke posities bij dezelfde hoofdstukstand; finale gebruikt slot, niet route.
- Een duel tegen slot 16 komt bij dat team terecht, ook wanneer route 0 wordt gedeeld.
- Dubbele nieuwe antwoordverzoeken leveren geen extra hoofdstuk of racevak op.
- Minimaal drie teams om een klassikaal avontuur te starten.
- Algebraïsche exponenten en breukweergave.

Daarnaast is de scene met de echte Three.js-scènegraaf en een renderer-stub doorgelopen: 3/8/30 teams, beide camera's, alle zes foutgebeurtenissen, finale en overwinning. Dit controleert objecten en uitvoerbare animatiecode, **geen GPU-rendering of visuele kwaliteit**.

De bestaande tree_pine.glb (17.220 bytes), tree_oak.glb (14.644 bytes) en rock_large.glb (7.552 bytes) zijn gedownload en als glTF 2 GLB gecontroleerd. Bron: https://github.com/syuhei176/ai-game-assets/tree/v1 — de README vermeldt Kenney Nature Kit, CC0. Dit zijn eenvoudige modellen. De scene gebruikt ze al; deze wijziging voegt geen nieuwe licentieclaims toe.

## Beschikbare lokale test

Leerkracht → Test zonder spelcode → 3, 8 of 30 teams. Dit gebruikt geen Firebase. Het testpaneel laat een team, hoofdstuk, goed/fout antwoord en leerlingweergave kiezen. Met 'Terug naar leerkracht' keert het scherm terug. De bestaande online spelmodus blijft beschikbaar.

## Controles op de gepubliceerde pagina

De browser heeft de nieuwe versie daadwerkelijk geladen. Lokale sessies met 3, 8 en 30 teams zijn geopend. Voor 3 teams zijn avatarfase, avontuur en finale doorlopen. Met 30 teams zijn een echte woordpuzzel (+100 punten, volgend hoofdstuk), een fout antwoord (-10 punten, nieuwe poging), een correct finaleantwoord (vak 8 naar 9) en een duel met Testteam 17 gecontroleerd. De console bevestigt dat GPU-rendering in deze browser niet beschikbaar is. Dit zijn lokale sessies, geen Firebase-belastingstest.

## Nog niet aangetoond / niet af

- De cloudbrowser kon geen WebGL-context maken. Er is geen visuele 3D-goedkeuring.
- De bestaande Soldier-varianten zijn nog geen dertig onafhankelijke fantasyhelden.
- De wereld en draak voldoen nog niet aan de aangeleverde artistieke referentie.
- De automatische tests bootsen geen dertig gelijktijdige Firebase-clients na.
- Responsieve 3D-prestaties en alle animaties moeten op een WebGL-browser visueel gecontroleerd worden.

Deze versie is een functionele verbetering van `test-v2/`, geen afgeronde levering van de volledige fantasygame. Productiebestanden buiten `test-v2/` zijn niet gewijzigd.
