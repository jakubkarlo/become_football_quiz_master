# Football Quiz

Quiz piłkarski (React + Vite): stroje klubowe i stadiony.

```bash
npm install
npm run dev
```

## Stadiony

Dane stadionów pochodzą z [Wikidata](https://www.wikidata.org), a zdjęcia z [Wikimedia Commons](https://commons.wikimedia.org).
Zdjęć **nie trzymamy w repo**. Quiz wyświetla je bezpośrednio z Wikimedii jako miniatury o szerokości 1280 px.
W repo jest tylko lista stadionów w JSON-ie.

| Plik | Co zawiera | Kto edytuje |
|---|---|---|
| `scripts/fetch-stadiums.mjs` | skrypt pobierający dane z Wikidata | programista (konfiguracja krajów) |
| `src/data/stadiums.json` | wygenerowana lista stadionów | **tylko skrypt**, nie edytować ręcznie |
| `src/data/stadiumsOverrides.js` | ręczne poprawki: aliasy, nazwy, wykluczenia | ręcznie |

### Pobieranie stadionów

```bash
node scripts/fetch-stadiums.mjs
```

Skrypt odpytuje Wikidata (SPARQL) i **nadpisuje** `src/data/stadiums.json`. Trwa to kilka sekund.
Wynik warto przejrzeć w `git diff` przed commitem, bo dane w Wikidata zmieniają się między pobraniami.

Do quizu trafia stadion, który w Wikidata:
- leży w kraju z listy `COUNTRIES`,
- jest stadionem piłkarskim albo ma przypisany sport „piłka nożna”,
- ma pojemność, współrzędne i zdjęcie,
- ma pojemność co najmniej `MIN_CAPACITY` (domyślnie 5000),
- nie ma daty rozbiórki ani zamknięcia.

**Dodanie kraju:** dopisz wpis do `COUNTRIES` w skrypcie i uruchom go ponownie.

```js
const COUNTRIES = [
  { qid: 'Q36', key: 'poland', continent: 'europe', nameLang: 'pl' },
  { qid: 'Q145', key: 'united_kingdom', continent: 'europe', nameLang: 'en', metroAreas: { Q23306: 'Londyn' } },
  { qid: 'Q183', key: 'germany', continent: 'europe', nameLang: 'en' },
]
```

- `qid` to id kraju w Wikidata. Znajdziesz je na końcu adresu strony kraju, np. `wikidata.org/wiki/Q183`.
  Anglia, Szkocja i Walia nie są w Wikidata państwami, dlatego są razem jako Wielka Brytania (`Q145`).
- `nameLang` to język etykiety użytej jako nazwa stadionu. Druga etykieta trafia do aliasów.
  Dla krajów zagranicznych ustawiaj `'en'`, bo polskie etykiety często mają stare nazwy sponsorskie.
- `metroAreas` (opcjonalne): obszar w Wikidata → nazwa miasta, przypisywana wszystkim stadionom w tym obszarze.
  Potrzebne tam, gdzie stadiony są przypisane do dzielnic, np. stadiony Londynu leżą w boroughs.
- `key` i `continent` muszą odpowiadać kluczom w `src/data/geoLabels.js`, bo stamtąd biorą się polskie nazwy w ustawieniach.
  Jeśli klucza tam nie ma, dopisz go.

### Ręczne poprawki (`stadiumsOverrides.js`)

Wikidata nie zawsze ma nazwę, której używają kibice, a czasem ma słabe zdjęcie.
Poprawki zapisujemy w `src/data/stadiumsOverrides.js`, a **nie** w `stadiums.json`.
Dzięki temu nie giną przy ponownym pobraniu. Aplikacja nakłada je na dane z JSON-a przy starcie.

Wpis jest przypisany do id stadionu z Wikidata. To pole `"id"` w `stadiums.json`, np. `Q188699`.

```js
const overrides = {
  // dodatkowe akceptowane odpowiedzi
  Q188699: { aliases: ['Inea Stadion', 'Inea', 'Bułgarska'] },

  // zmiana wyświetlanej nazwy; starą nazwę dopisujemy do aliasów, żeby dalej była akceptowana
  Q182385: { stadiumName: 'Polsat Plus Arena Gdańsk', aliases: ['Gdańsk Arena'] },

  // inne zdjęcie z Commons: zawsze podmieniaj oba pola
  Q606059: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Arena_Zabrze.jpg',
    imageSource: 'https://commons.wikimedia.org/wiki/File:Arena_Zabrze.jpg',
  },

  // usunięcie stadionu z quizu
  Q3967962: { exclude: true },
}
```

Zasady:
- **`aliases` są dopisywane** do aliasów z Wikidata, a nie je zastępują.
- **Każde inne pole zastępuje** wartość z Wikidata. Dotyczy to `stadiumName`, `city`, `capacity`, `image`, `imageSource` i pozostałych pól.
- **Po zmianie `stadiumName` stara nazwa przestaje być akceptowana**, chyba że jest w aliasach. Jeśli ma dalej działać, dopisz ją do `aliases`.
- **`exclude: true`** usuwa stadion z quizu. Użyj tego przy złym zdjęciu albo obiekcie, który nie jest stadionem piłkarskim.

### Jak sprawdzana jest odpowiedź

Odpowiedź jest poprawna, jeśli po znormalizowaniu (małe litery, bez polskich znaków i interpunkcji)
jest równa nazwie stadionu, miastu albo któremuś aliasowi, lub jednemu słowu z nich.
Przykład: „Bułgarska”, „bulgarska” i „Poznań” zaliczają Stadion Miejski w Poznaniu.
Te same pola zasilają podpowiedzi przy wpisywaniu.

### Licencje zdjęć

Zdjęcia z Commons są zwykle na licencji CC BY-SA, która wymaga podania autora.
Dlatego po każdej odpowiedzi quiz pokazuje link do strony zdjęcia (`imageSource`), gdzie widać autora i licencję.
Nie usuwaj tego linku.
