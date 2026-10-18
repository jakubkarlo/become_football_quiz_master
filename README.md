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
| `generated/stadiums/index.json` | kraje i `[id, pojemność]` każdego stadionu (dla filtrów i licznika w ustawieniach) | tylko skrypt, **nie jest w gicie** |
| `generated/stadiums/continents/<kontynent>.json` | pełne dane stadionów, osobny plik na kontynent | tylko skrypt, **nie jest w gicie** |
| `src/data/stadiumsOverrides.js` | ręczne poprawki: aliasy, nazwy, wykluczenia | ręcznie |

### Pobieranie stadionów

```bash
npm run fetch:stadiums
```

Skrypt odpytuje Wikidata (SPARQL) i pobiera dane **kontynent po kontynencie**.
Każdy kontynent zapisuje od razu po pobraniu: plik `continents/<kontynent>.json` i swoje wpisy w `index.json`.
Katalog `generated/` jest w `.gitignore`, więc każdy generuje dane u siebie.

**`npm run dev` niczego nie pobiera.** Bez danych kafelek „STADIONY” w menu jest wyszarzony,
a po `npm run fetch:stadiums` odblokowuje się sam (w razie czego odśwież stronę).
`npm run build` (przez `prebuild`) pobiera dane tylko wtedy, gdy ich brakuje, a istniejących nie rusza.
Build wymaga więc dostępu do `query.wikidata.org`, jeśli `generated/stadiums/index.json` jeszcze nie istnieje.

Dane w Wikidata zmieniają się między pobraniami, więc po odświeżeniu warto przejrzeć quiz albo sam JSON.

Do quizu trafia stadion, który w Wikidata:
- leży w kraju z regionów skonfigurowanych w `REGIONS` (opis niżej),
- jest stadionem piłkarskim albo ma przypisany sport „piłka nożna”,
- ma pojemność, współrzędne i zdjęcie,
- ma pojemność co najmniej `MIN_CAPACITY` (domyślnie 5000),
- nie ma daty rozbiórki ani zamknięcia.

**Zakres krajów** ustawia się w `REGIONS` w skrypcie. Region to albo jawna lista krajów, albo kontynent z Wikidata.
Dla kontynentu skrypt sam pobiera wszystkie leżące na nim państwa i odpytuje każde z osobna.
Jedno zapytanie na cały kontynent przekroczyłoby limit 60 s.

```js
const REGIONS = [
  { continent: 'europe', countries: EUROPE },                  // jawna lista: Polska, Wielka Brytania, top 5, ...
  { continent: 'central_america', countries: CENTRAL_AMERICA },
  { continent: 'north_america', wikidataContinent: 'Q49' },     // wszystkie państwa kontynentu
  { continent: 'south_america', wikidataContinent: 'Q18' },
  { continent: 'africa', wikidataContinent: WD_AFRICA },
  { continent: 'asia', wikidataContinent: 'Q48', excludeContinents: [WD_EUROPE, WD_AFRICA] },
]
```

- **Dodanie kraju europejskiego:** dopisz jego id z Wikidata do `EUROPE`. Id znajdziesz na końcu adresu strony kraju, np. `wikidata.org/wiki/Q183`.
  Anglia, Szkocja i Walia nie są w Wikidata państwami, dlatego są razem jako Wielka Brytania (`Q145`).
- **Kraj należy do pierwszego regionu, który go zwróci.** Dlatego jawne listy są na początku.
  Państwa przesmyku z `CENTRAL_AMERICA` (Gwatemala–Panama) nie trafiają więc do Ameryki Północnej.
  Meksyk i Karaiby zostają w Ameryce Północnej, a Egipt trafia do Afryki.
- **Państwa leżące częściowo w Europie** (Rosja, Turcja, Kazachstan, Gruzja...) są wykluczone z Azji, bo grają w UEFA.
  Dostaną się do quizu tylko po dopisaniu do `EUROPE`.
- **`continent` musi mieć polską nazwę** w `src/data/geoLabels.js` (`CONTINENT_LABELS`).
  Polskie nazwy krajów skrypt pobiera z Wikidata do pola `countryName`.

Ustawienia dla pojedynczych krajów są w `COUNTRY_OPTIONS`. Domyślnie żadne nie są potrzebne:

```js
const COUNTRY_OPTIONS = {
  Q36: { nameLang: 'pl' },
  Q145: { metroAreas: { Q23306: 'Londyn' } },
}
```

- `nameLang` to język etykiety użytej jako nazwa stadionu, domyślnie `'en'`. Druga etykieta trafia do aliasów.
  Polskie etykiety zagranicznych stadionów często mają stare nazwy sponsorskie, dlatego `'pl'` jest tylko dla Polski.
- `metroAreas`: obszar w Wikidata → nazwa miasta, przypisywana wszystkim stadionom w tym obszarze.
  Potrzebne tam, gdzie stadiony są przypisane do dzielnic, np. stadiony Londynu leżą w boroughs.

Pełne pobranie obejmuje ponad 130 krajów i trwa kilka minut. Skrypt wysyła najwyżej 4 zapytania naraz,
a po błędzie 429/5xx ponawia zapytanie do 3 razy.

**Gdy pobieranie przerwie się w połowie**, kontynenty pobrane przed błędem zostają zapisane,
a kontynent, na którym wystąpił błąd, zachowuje swoje poprzednie dane. Dociągasz tylko brakujące:

```bash
npm run fetch:stadiums -- --continent asia
npm run fetch:stadiums -- --continent africa,asia
```

Pliki zapisywane są atomowo (najpierw plik tymczasowy, potem zmiana nazwy), więc przerwanie nie zostawi uszkodzonego JSON-a.
Pełne uruchomienie (bez `--continent`) usuwa też dane kontynentów, których nie ma już w `REGIONS`.

### Ładowanie danych w aplikacji

Główna paczka JS nie zawiera danych stadionów. Vite tworzy z każdego pliku osobny fragment (chunk):
1. po wejściu w ustawienia quizu stadionów ładuje się tylko `index.json` (kilkadziesiąt kB), czyli lista krajów i licznik;
2. po kliknięciu „Rozpocznij” ładują się pliki tylko tych kontynentów, które obejmuje wybór.

Poprawki z `stadiumsOverrides.js` są nakładane także na indeks, więc licznik w ustawieniach uwzględnia wykluczenia i zmiany pojemności.

### Ręczne poprawki (`stadiumsOverrides.js`)

Wikidata nie zawsze ma nazwę, której używają kibice, a czasem ma słabe zdjęcie.
Poprawki zapisujemy w `src/data/stadiumsOverrides.js`, a **nie** w `generated/`.
Dzięki temu nie giną przy ponownym pobraniu. Aplikacja nakłada je na dane z JSON-a przy starcie.

Wpis jest przypisany do id stadionu z Wikidata. To pole `"id"` w `generated/stadiums/continents/*.json`, np. `Q188699`.

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
