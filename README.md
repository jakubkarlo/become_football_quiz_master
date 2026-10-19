# Football Quiz

Quiz piłkarski (React + Vite): stroje klubowe i stadiony.

```bash
npm install
npm run dev
```

## Koszulki

Grafiki koszulek **nie są w repo ani w obrazie Dockera**. Lokalnie leżą w `kits/`, na produkcji w woluminie na serwerze.
Aplikacja pobiera `/kits/manifest.json` przy wejściu w zakres koszulek, a obrazki z `/kits/...`.

Układ katalogów:

```
kits/<kontynent>/<Kraj>/<Liga>/<Sezon>/<klub>_<n>.png     np. kits/europe/England/Premier League/2026_27/arsenal1.png
kits/nations/<Konfederacja>/<Sezon>/<reprezentacja><n>.png np. kits/nations/UEFA/2025_26/poland1.png
```

- `<n>` to 1 (domowa), 2 (wyjazdowa) albo 3 (trzecia). Separator `_` przed numerem jest opcjonalny.
- Koszulki alternatywne leżą w podkatalogu `alt/` (lub `Alt/`) danego sezonu.
- `<kontynent>` musi mieć polską nazwę w `src/data/geoLabels.js`, a `<Kraj>` (po angielsku) w `COUNTRY_LABELS`.
- Sezon ma format `2025_26`.

**Manifest** generuje `npm run kits:manifest`, który zapisuje `kits/manifest.json` (`scripts/kits-manifest.mjs`).
`npm run dev` serwuje manifest generowany na bieżąco, więc lokalnie wystarczy wrzucić pliki i odświeżyć stronę.

**Nazwy drużyn** są w `src/data/clubsDb.js` (kluby) i `src/data/nationsDb.js` (reprezentacje): polska nazwa plus aliasy,
które zalicza się jako odpowiedź. Klucz to nazwa pliku bez numeru.
Gdy w nowym sezonie plik tego samego klubu nazywa się inaczej (np. `manchester_city1.png` zamiast `man_city_1.png`),
dopisz go do `ID_ALIASES` w `clubsDb.js`. Inaczej klub pojawi się w podpowiedziach dwa razy, a wybór z listy zostanie uznany za błąd.
Drużyna bez wpisu dostaje nazwę z pliku (np. „hull city”).

## Stadiony

Dane stadionów pochodzą z [Wikidata](https://www.wikidata.org), a zdjęcia z [Wikimedia Commons](https://commons.wikimedia.org).
Zdjęć **nie trzymamy w repo**. Quiz wyświetla je bezpośrednio z Wikimedii jako miniatury o szerokości 1280 px.
**Dane stadionów (JSON) nie są częścią aplikacji ani repo.** Generujesz je u siebie tylko wtedy, gdy chcesz je odświeżyć,
wgrywasz na serwer (`npm run stadiums:deploy`), a aplikacja pobiera je w trakcie działania spod `/stadium-data/`.
Deploy aplikacji ich nie dotyka i nie łączy się z Wikidata.

| Plik | Co zawiera | Kto edytuje |
|---|---|---|
| `scripts/fetch-stadiums.mjs` | skrypt pobierający dane z Wikidata | programista (konfiguracja krajów) |
| `generated/stadiums/index.json` | kraje i `[id, pojemność]` każdego stadionu (dla filtrów i licznika w ustawieniach) | tylko skrypt, **nie jest w gicie**, na serwer przez `stadiums:deploy` |
| `generated/stadiums/continents/<kontynent>.json` | pełne dane stadionów, osobny plik na kontynent | tylko skrypt, **nie jest w gicie** |
| `src/data/stadiumsOverrides.js` | ręczne poprawki: aliasy, nazwy, wykluczenia | ręcznie |

### Pobieranie stadionów

```bash
npm run fetch:stadiums
```

Skrypt odpytuje Wikidata (SPARQL) i pobiera dane **kontynent po kontynencie**.
Każdy kontynent zapisuje od razu po pobraniu: plik `continents/<kontynent>.json` i swoje wpisy w `index.json`.
Katalog `generated/` jest w `.gitignore`, więc każdy generuje dane u siebie.

**Ani `npm run dev`, ani `npm run build` niczego nie pobierają.** `npm run dev` serwuje `generated/stadiums/` pod `/stadium-data/`.
Bez danych ekran zakresu stadionów pokaże błąd wczytywania. Wtedy uruchom `npm run fetch:stadiums` i odśwież stronę.
Na serwer dane trafiają przez `npm run stadiums:deploy` (sekcja „Deploy”).

Dane w Wikidata zmieniają się między pobraniami, więc po odświeżeniu warto przejrzeć quiz albo sam JSON.

Do quizu trafia stadion, który w Wikidata:
- leży w kraju z regionów skonfigurowanych w `REGIONS` (opis niżej),
- jest stadionem piłkarskim albo ma przypisany sport „piłka nożna”,
- ma pojemność, współrzędne i zdjęcie,
- ma pojemność co najmniej `MIN_CAPACITY` (domyślnie 5000),
- nie ma daty rozbiórki ani zamknięcia.

**Kluby gospodarze** (`clubs`, `clubAliases`) skrypt dociąga osobnymi zapytaniami: właściwość „użytkownik” (P466) stadionu
albo „obiekt domowy” (P115) klubu, tylko aktualne (bez daty końca) i tylko nierozwiązane kluby piłkarskie.
Zostaje najwyżej `MAX_CLUBS` (4) klubów, każdy z co najmniej `CLUB_MIN_SHARE` (25%) artykułów w Wikipedii
najbardziej znanego z nich. To odsiewa rezerwy i przypadkowe wpisy, a zostawia stadiony dzielone (San Siro: Milan i Inter).
Stadion bez klubu w Wikidata po prostu nie ma podpowiedzi „Klub”.

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

  // poprawka klubów gospodarzy (zastępuje listę z Wikidata)
  Q928642: { clubs: ['Legia Warszawa'] },

  // usunięcie stadionu z quizu
  Q3967962: { exclude: true },
}
```

Zasady:
- **`aliases` są dopisywane** do aliasów z Wikidata, a nie je zastępują.
- **Każde inne pole zastępuje** wartość z Wikidata. Dotyczy to `stadiumName`, `city`, `clubs`, `capacity`, `image`, `imageSource` i pozostałych pól.
- **Po zmianie `stadiumName` stara nazwa przestaje być akceptowana**, chyba że jest w aliasach. Jeśli ma dalej działać, dopisz ją do `aliases`.
- **`exclude: true`** usuwa stadion z quizu. Użyj tego przy złym zdjęciu albo obiekcie, który nie jest stadionem piłkarskim.

### Jak sprawdzana jest odpowiedź

Odpowiedź jest poprawna, jeśli po znormalizowaniu (małe litery, bez polskich znaków i interpunkcji)
jest równa nazwie stadionu albo któremuś aliasowi, lub jednemu słowu z nich.
Przykład: „Bułgarska” i „bulgarska” zaliczają Stadion Miejski w Poznaniu.
**Miasto i kluby nie są zaliczane**, bo są podpowiedziami (Kraj, Miasto, Klub).
Podpowiedzi przy wpisywaniu szukają też po mieście i klubach, więc „Lech” znajdzie stadion w Poznaniu.

### Licencje zdjęć

Zdjęcia z Commons są zwykle na licencji CC BY-SA, która wymaga podania autora.
Dlatego po każdej odpowiedzi quiz pokazuje link do strony zdjęcia (`imageSource`), gdzie widać autora i licencję.
Nie usuwaj tego linku.

## Deploy (Coolify)

Aplikacja to statyczny build serwowany przez nginx (`Dockerfile`, `nginx/`). Build trwa krótko, bo nie zawiera danych:
koszulki i dane stadionów leżą w dwóch katalogach na serwerze, montowanych do kontenera, i wgrywa się je osobno, bez redeployu.

1. **Koszulki na serwer** (pierwszy raz i przy każdej zmianie, bez redeployu):

   Jednorazowo załóż katalog na serwerze (`sudo mkdir -p /data/football-quiz/kits` i `chown` na użytkownika SSH),
   a lokalnie skopiuj `.env.example` do `.env` i ustaw `KITS_DEPLOY_TARGET=user@serwer:/data/football-quiz/kits`.
   Potem:

   ```bash
   npm run kits:deploy -- --dry-run   # podgląd: co zostanie wysłane, a co usunięte
   npm run kits:deploy                # manifest + wysyłka tylko zmienionych plików
   npm run kits:deploy -- --keep      # bez usuwania z serwera plików, których nie ma lokalnie
   ```

   Skrypt (`scripts/deploy-kits.mjs`) przebudowuje `kits/manifest.json` i wysyła katalog przez rsync po SSH:
   najpierw nowe obrazki, potem manifest, na końcu usuwa pliki skasowane lokalnie.
   Dzięki tej kolejności grający w trakcie wysyłki nigdy nie dostaną manifestu wskazującego brakujący plik.
   Wymaga `rsync` i `ssh` z dostępem po kluczu (w devcontainerze ich nie ma: `sudo apt install rsync openssh-client` albo uruchom z hosta).
   Uprawnienia plików są ustawiane tak, żeby nginx w kontenerze mógł je czytać.
   **Pobranie koszulek z serwera** (np. na nowym komputerze albo żeby sprawdzić, co jest na produkcji):

   ```bash
   npm run kits:pull -- --dry-run     # podgląd
   npm run kits:pull                  # pobiera nowe i zmienione pliki, lokalnych nie usuwa
   npm run kits:pull -- --mirror      # dokładna kopia serwera: usuwa lokalne pliki, których tam nie ma
   ```

   Plik zmieniony po obu stronach nie zostanie nadpisany starszą wersją (wygrywa nowszy).

2. **Dane stadionów na serwer** (po każdym `npm run fetch:stadiums`, bez redeployu):

   Jednorazowo: `sudo mkdir -p /data/football-quiz/stadium-data` (+ `chown`) i `STADIUMS_DEPLOY_TARGET` w `.env`.

   ```bash
   npm run stadiums:deploy -- --dry-run
   npm run stadiums:deploy
   ```

   Najpierw idą pliki kontynentów, potem `index.json`, na końcu usuwane są nieaktualne pliki.
   Skrypt odmówi wysłania pustego indeksu.

3. **Coolify:** nowy zasób z repozytorium, Build Pack „Docker Compose”, plik `docker-compose.yml`.
   Domenę ustaw w Coolify na usłudze `web` (port 80). TLS obsługuje proxy Coolify.
   Inne ścieżki na serwerze ustawisz zmiennymi `KITS_HOST_DIR` i `STADIUM_DATA_HOST_DIR`.
   Build robi tylko `npm ci` i `npm run build`, bez pobierania danych.

Koszulki można później przenieść do bucketu (S3/R2): wystarczy wgrać tam ten sam katalog z `manifest.json`,
zbudować z `VITE_KITS_BASE_URL=https://...`, dodać ten host do CSP w `nginx/security-headers.conf` i ustawić CORS bucketu na domenę aplikacji.
