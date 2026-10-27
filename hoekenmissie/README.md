# Hoekenmissie — ruimte-memory

Afzonderlijke map binnen het bestaande GitHub Pages-project; de bestanden van De Machtentempel zijn niet gewijzigd.

## Openen
https://intunez.github.io/DeMachtenTempel/hoekenmissie/

## Firebase
Deze eerste versie gebruikt dezelfde Firebase-configuratie als De Machtentempel en bewaart teamkamers onder `rooms/hoekenmissie-<spelcode>`. Firebase Authentication > Anonymous moet aanstaan. De gepubliceerde Realtime Database-regels moeten de nieuwe kamerstructuur toestaan; dit is nog niet geverifieerd. De meegeleverde database.rules.json in de repository is geen bewijs dat regels live gepubliceerd zijn.

## Belangrijke status
**Eerste speelbare prototype, niet de definitieve klasversie.** Solomodi werken lokaal in de browser; persoonlijke records worden bewaard met localStorage. Teamspel gebruikt Firebase voor synchronisatie, maar de beveiliging van de leerkrachtenrol en het afdwingen van beurten en punten op de server ontbreken nog. Niet gebruiken in een onbetrouwbare/openbare omgeving. Teamspel is nog niet end-to-end getest met meerdere apparaten. Visuele astronauten, raket- en luikanimaties zijn nog placeholders; niet het afgesproken fotorealistische eindontwerp. Pauze en hervatten, teamherstel en volledige wedstrijdregie moeten nog worden uitgehard.

## Soloregels
24 kaarten, 12 paren (2 definities en 10 berekeningen). 5 seconden preview, daarna omdraaien. Vrij oefenen: 5 seconden fout paar, minimum pogingen als record, na het resultaat handmatig volgend bord. Tijdchallenge: 3 seconden fout paar, klok automatisch na preview, klok pauzeert tijdens korte animaties, snelste eindtijd als record. Elk nieuw bord heeft andere getallen en kaartposities.
