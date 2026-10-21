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
- `<kontynent>` musi mieć tłumaczenie `continent.<kontynent>`, a `<Kraj>` (po angielsku) `country.<kraj>`
  w `src/i18n/pl.js` i `src/i18n/en.js`. Klucz kraju to nazwa katalogu małymi literami ze spacjami zamienionymi na `_`
  (`South Africa` → `country.south_africa`). Bez tłumaczenia etykieta powstanie z nazwy katalogu („South africa”).
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
- **`continent` musi mieć tłumaczenie** `continent.<kontynent>` w `src/i18n/pl.js` i `src/i18n/en.js`.
  Polskie nazwy krajów skrypt pobiera z Wikidata do pola `countryName` (w wersji angielskiej też są po polsku).

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

Aplikacja to statyczny build serwowany przez nginx (`Dockerfile`, `nginx/`). Obraz **nie zawiera danych**:
koszulki i dane stadionów leżą na serwerze w dwóch katalogach montowanych do kontenera (tylko do odczytu).
Dlatego są trzy niezależne rodzaje wdrożeń:

| Co się zmieniło | Jak wdrożyć | Redeploy aplikacji? |
|---|---|---|
| Kod aplikacji, tłumaczenia (`src/i18n/`), `clubsDb.js`, `nationsDb.js`, **overridy stadionów** (`stadiumsOverrides.js`) | push do gałęzi podpiętej w Coolify | tak |
| Dane stadionów z Wikidata (`generated/stadiums/`) | `npm run stadiums:deploy` (pobranie z serwera: `stadiums:pull`) | nie |
| Koszulki (`kits/`) | `npm run kits:deploy` | nie |

### Ściągawka poleceń

```bash
# Stadiony: import z Wikidata i wysyłka na serwer
npm run fetch:stadiums                              # pełny import (kilka minut)
npm run fetch:stadiums -- --continent africa,asia   # tylko wybrane kontynenty
npm run stadiums:deploy -- --dry-run                # podgląd wysyłki
npm run stadiums:deploy                             # wysyłka na serwer

# Stadiony: pobranie z serwera (zamiast importu z Wikidata)
npm run stadiums:pull -- --dry-run                  # podgląd różnic względem lokalnych danych
npm run stadiums:pull                               # pobranie, gdy lokalnie nie ma jeszcze danych
npm run stadiums:pull -- --force                    # zastąpienie istniejących lokalnych danych kopią z serwera

# Koszulki: wysyłka na serwer
npm run kits:deploy -- --dry-run                    # podgląd: co zostanie wysłane i usunięte
npm run kits:deploy                                 # manifest + zmienione pliki + usunięcie skasowanych lokalnie
npm run kits:deploy -- --keep                       # bez usuwania czegokolwiek z serwera

# Koszulki: pobranie z serwera
npm run kits:pull -- --dry-run                      # podgląd
npm run kits:pull                                   # nowe i zmienione pliki, lokalnych nic nie usuwa
npm run kits:pull -- --mirror                       # dokładna kopia serwera (USUWA lokalne pliki, których tam nie ma)
```

Overridy stadionów nie mają osobnego polecenia: to część kodu, wdraża się je commitem (opis niżej).

### Jednorazowa konfiguracja

**Na serwerze** załóż katalogi na dane i nadaj je użytkownikowi, którym logujesz się po SSH:

```bash
sudo mkdir -p /data/football-quiz/kits /data/football-quiz/stadium-data
sudo chown -R <użytkownik-ssh>: /data/football-quiz
```

**Lokalnie** skopiuj `.env.example` do `.env` (plik nie trafia do gita) i ustaw cele wysyłki:

```bash
KITS_DEPLOY_TARGET=<użytkownik-ssh>@<serwer>:/data/football-quiz/kits
STADIUMS_DEPLOY_TARGET=<użytkownik-ssh>@<serwer>:/data/football-quiz/stadium-data
```

Skrypty przyjmują tylko postać `user@host:/ścieżka/absolutna`. Każdą inną wartość odrzucają, więc w zmiennej
nie da się przemycić opcji rsync ani poleceń powłoki.

**Narzędzia:** skrypty używają `rsync` i `ssh` z logowaniem **po kluczu** (bez hasła).
W devcontainerze ich nie ma: zainstaluj je (`sudo apt install rsync openssh-client`) albo uruchamiaj skrypty z hosta.
Sprawdzenie połączenia: `ssh <użytkownik-ssh>@<serwer> ls /data/football-quiz`.

**W Coolify:**
1. Nowy zasób z repozytorium, Build Pack „Docker Compose”, plik `docker-compose.yml`.
2. Domena na usłudze `web` (port 80). TLS obsługuje proxy Coolify.
3. Zmienne `BASIC_AUTH_USER` i `BASIC_AUTH_PASSWORD`, oznaczone jako sekret. Bez nich kontener nie wystartuje,
   więc strona nigdy nie jest dostępna bez hasła. Przy starcie `nginx/basic-auth.sh` zapisuje z nich plik htpasswd (bcrypt).
   Zmiana hasła to zmiana zmiennej i restart, bez przebudowy. `/healthz` działa bez hasła (healthcheck).
4. Opcjonalnie `KITS_HOST_DIR` i `STADIUM_DATA_HOST_DIR`, jeśli katalogi na serwerze są w innym miejscu niż domyślne `/data/football-quiz/...`.

### Wdrożenie aplikacji

Wystarczy push do gałęzi podpiętej w Coolify. Jeśli auto-deploy jest wyłączony, kliknij **Redeploy** w Coolify.
Build robi tylko `npm ci` i `npm run build`, nie pobiera danych i nie łączy się z Wikidata.
Lokalnie build sprawdzisz poleceniem `npm run build`.

Po pierwszym wdrożeniu wgraj dane (stadiony i koszulki, opis niżej). Bez nich ekrany zakresu pokażą błąd wczytywania.

### Import stadionów i wysyłka na serwer

1. **Import z Wikidata** do `generated/stadiums/` (szczegóły w sekcji „Pobieranie stadionów”):

   ```bash
   npm run fetch:stadiums
   ```

   Gdy import przerwie się w połowie, dociągnij brakujące kontynenty: `npm run fetch:stadiums -- --continent asia`.

2. **Sprawdzenie lokalne:** `npm run dev` serwuje `generated/stadiums/` pod `/stadium-data/`.
   Przejdź kilka rund quizu i zerknij na licznik w ustawieniach. Dane w Wikidata zmieniają się między importami.

3. **Wysyłka na serwer** (bez redeployu):

   ```bash
   npm run stadiums:deploy -- --dry-run
   npm run stadiums:deploy
   ```

   Kolejność wysyłki: najpierw pliki kontynentów, potem `index.json`, na końcu usuwanie nieaktualnych plików.
   Dzięki temu nikt w trakcie wysyłki nie dostanie indeksu wskazującego brakujący plik.
   Skrypt odmówi wysłania pustego albo uszkodzonego indeksu.
   Nginx serwuje te pliki z `Cache-Control: no-cache`, więc nowe dane widać od razu po odświeżeniu strony.

### Stadiony: pobranie z serwera

Na nowym komputerze albo żeby pracować na dokładnie tych danych, które są na produkcji,
nie trzeba importować z Wikidata. Wystarczy pobrać kopię z serwera:

```bash
npm run stadiums:pull -- --dry-run   # podgląd: co zmieni się lokalnie
npm run stadiums:pull                # gdy w generated/stadiums/ nie ma jeszcze danych
npm run stadiums:pull -- --force     # gdy lokalne dane istnieją i chcesz je zastąpić
```

Indeks i pliki kontynentów tworzą jeden spójny zestaw, więc skrypt (`scripts/pull-stadiums.mjs`) nie łączy ich plik po pliku.
Pobiera wszystko do katalogu tymczasowego `generated/stadiums.pull/` i sprawdza `index.json` (czy jest poprawny i niepusty).
Dopiero wtedy podmienia `generated/stadiums/` w całości. Przerwane albo nieudane pobranie zostawia lokalne dane bez zmian.

**Bez `--force` skrypt nie nadpisze istniejących lokalnych danych.** Mogą to być świeżo zaimportowane dane, jeszcze niewysłane na serwer.
Z `--force` przepadają, a odzyskasz je tylko ponownym `npm run fetch:stadiums`.

### Overridy stadionów

Poprawki z `src/data/stadiumsOverrides.js` (aliasy, nazwy, zdjęcia, kluby, wykluczenia; opis w sekcji „Ręczne poprawki”)
są **częścią kodu aplikacji**, a nie danych na serwerze. Aplikacja nakłada je na pobrany JSON w przeglądarce.

1. Zmień `src/data/stadiumsOverrides.js`. Id stadionu (np. `Q188699`) znajdziesz w polu `"id"` w `generated/stadiums/continents/*.json`.
2. Sprawdź lokalnie w `npm run dev`. Override działa od razu, bez ponownego importu.
3. Commit i push, a potem wdrożenie aplikacji (patrz wyżej).

`npm run stadiums:deploy` **nie wysyła** overridów, a ponowny import z Wikidata ich nie nadpisuje.

### Koszulki: wysyłka na serwer

Po dodaniu, zmianie albo usunięciu plików w `kits/` (bez redeployu):

```bash
npm run kits:deploy -- --dry-run   # zawsze najpierw podgląd: sprawdź listę usuwanych plików
npm run kits:deploy
```

Skrypt (`scripts/deploy-kits.mjs`):
1. przebudowuje `kits/manifest.json` (to samo co `npm run kits:manifest`) i odmawia wysyłki pustego manifestu,
2. wysyła nowe i zmienione obrazki,
3. wysyła manifest,
4. usuwa z serwera pliki skasowane lokalnie.

Dzięki tej kolejności grający w trakcie wysyłki nigdy nie dostaną manifestu wskazującego brakujący plik.
Uprawnienia plików są ustawiane tak, żeby nginx w kontenerze mógł je czytać.

**Uwaga na krok 4:** `kits:deploy` traktuje lokalny katalog `kits/` jako źródło prawdy.
Jeśli nie masz lokalnie wszystkich koszulek (np. ktoś inny wgrał nowe), najpierw zrób `npm run kits:pull`
albo wyślij z `--keep`, które nic nie usuwa z serwera.

### Koszulki: pobranie z serwera

Na nowym komputerze, przed własną wysyłką albo żeby sprawdzić, co jest na produkcji:

```bash
npm run kits:pull -- --dry-run     # podgląd
npm run kits:pull                  # pobiera nowe i zmienione pliki, lokalnych nie usuwa
npm run kits:pull -- --mirror      # dokładna kopia serwera: usuwa lokalne pliki, których tam nie ma
```

Plik zmieniony po obu stronach nie zostanie nadpisany starszą wersją (wygrywa nowszy).
Przy `--mirror` przepadną lokalne koszulki, których jeszcze nie wysłałeś, więc zawsze zacznij od `--dry-run`.

Typowy cykl pracy z koszulkami:

```bash
npm run kits:pull                  # dociągnij to, co jest na serwerze
# ...dodaj pliki w kits/, sprawdź w npm run dev (manifest generuje się na bieżąco)...
npm run kits:deploy -- --dry-run
npm run kits:deploy
```

Jeśli nowe koszulki mają nowe kluby albo reprezentacje, dopisz je do `clubsDb.js` / `nationsDb.js`.
To zmiana kodu, więc wymaga też wdrożenia aplikacji.

### Przeniesienie koszulek do bucketu (opcjonalnie)

Koszulki można później przenieść do bucketu (S3/R2): wystarczy wgrać tam ten sam katalog z `manifest.json`,
zbudować z `VITE_KITS_BASE_URL=https://...`, dodać ten host do CSP w `nginx/security-headers.conf` i ustawić CORS bucketu na domenę aplikacji.
