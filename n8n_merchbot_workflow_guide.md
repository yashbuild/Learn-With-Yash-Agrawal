## Szczegółowe Instrukcje Wdrażania Workflow n8n dla Merchbot API

Ten przewodnik krok po kroku pomoże Ci skonfigurować workflow w n8n do automatycznego pobierania danych o bestsellerach Amazon z zewnętrznego API (np. `real-time-amazon-data` z RapidAPI), ich transformacji i zapisu (upsert) do Twojej bazy danych Supabase. Zakładamy, że masz już działającą instancję n8n (Cloud lub Self-Hosted) oraz skonfigurowaną bazę Supabase z tabelą `amazon_products` (zgodnie z wcześniej dostarczonym schematem `merchbot_schema.sql`).

### Krok 1: Tworzenie Nowego Workflow w n8n

1.  **Zaloguj się** do swojej instancji n8n.
2.  W panelu po lewej stronie kliknij **"Workflows"**.
3.  W prawym górnym rogu kliknij przycisk **"+ New workflow"** (lub "Add workflow").
4.  Zobaczysz pusty obszar roboczy z jednym węzłem startowym ("Start").

### Krok 2: Konfiguracja Węzła Wyzwalacza (Trigger Node - np. Schedule/Cron)

Ten węzeł będzie automatycznie uruchamiał Twój workflow zgodnie z ustalonym harmonogramem.

1.  Kliknij na przycisk **"+"** na obszarze roboczym lub na węzeł "Start", aby dodać nowy węzeł.
2.  W polu wyszukiwania wpisz **"Schedule"** i wybierz węzeł "Schedule".
3.  **Ustawienia Harmonogramu:**
    *   **Mode:** Wybierz `Cron` dla elastycznego harmonogramu lub `Every X hours/minutes/days` dla prostszych ustawień.
    *   **Cron Expression (jeśli wybrałeś Cron):**
        *   Aby uruchamiać codziennie o północy: `0 0 * * *`
        *   Aby uruchamiać co 12 godzin: `0 */12 * * *`
        *   Możesz użyć [generatora cron](https://crontab.guru/) do stworzenia własnego wyrażenia.
    *   **Timezone:** Ustaw swoją strefę czasową, aby harmonogram działał poprawnie.
    *   **Custom Name (opcjonalnie):** Możesz nadać węzłowi własną nazwę, np. "Codzienne Pobieranie Danych".

### Krok 3: Konfiguracja Węzła HTTP Request (Pobieranie Danych z Zewnętrznego API)

Ten węzeł będzie pobierał dane z API `real-time-amazon-data`.

1.  Kliknij na przycisk **"+"** po węźle "Schedule", aby dodać nowy węzeł.
2.  W polu wyszukiwania wpisz **"HTTP Request"** i wybierz węzeł.
3.  **Ustawienia Główne (zakładka "Parameters"):**
    *   **Method:** Wybierz `GET`.
    *   **URL:** Tutaj wklej URL do API. Dla `real-time-amazon-data` i wyszukiwania bestsellerów, URL może wyglądać podobnie do (zastąp `YOUR_AMAZON_CATEGORY_URL` rzeczywistym linkiem do kategorii bestsellerów Amazon, np. dla T-shirtów):
        `https://real-time-amazon-data.p.rapidapi.com/request?type=bestsellers&url=YOUR_AMAZON_CATEGORY_URL&amazon_domain=amazon.com`
        *Przykład URL dla bestsellerów w kategorii męskich T-shirtów na amazon.com:*
        `https://real-time-amazon-data.p.rapidapi.com/request?type=bestsellers&url=https%3A%2F%2Fwww.amazon.com%2FBest-Sellers-Mens-T-Shirts%2Fzgbs%2Ffashion%2F2476517011&amazon_domain=amazon.com`
        **Ważne:** Upewnij się, że URL kategorii jest poprawnie zakodowany (URL encoded).
    *   **Send Query Parameters:** Upewnij się, że ta opcja jest włączona, jeśli parametry są częścią URL (jak powyżej). Alternatywnie, możesz dodać parametry w sekcji "Query Parameters" poniżej:
        *   Kliknij "Add Option" w sekcji "Query Parameters":
            *   Name: `type`, Value: `bestsellers`
            *   Name: `url`, Value: `YOUR_AMAZON_CATEGORY_URL` (np. `https://www.amazon.com/Best-Sellers-Mens-T-Shirts/zgbs/fashion/2476517011`)
            *   Name: `amazon_domain`, Value: `amazon.com` (lub inny, np. `amazon.de`)

4.  **Uwierzytelnianie/Nagłówki:**
    *   Przejdź do zakładki **"Authentication"** lub upewnij się, że w sekcji **"Headers"** (w zakładce "Parameters" lub dedykowanej) możesz dodać nagłówki.
    *   **Credentials for Header Auth:**
        *   Kliknij na listę rozwijaną i wybierz **"Create New Credential"**.
        *   Wybierz typ poświadczenia: **"Generic Credential Type"** -> **"Header Auth"**.
        *   **Credential Name:** Nazwij swoje poświadczenie, np. `RapidAPI RealTimeAmazon`.
        *   **Name (Header Name):** Wpisz `X-RapidAPI-Key`.
        *   **Value (Header Value):** Wklej swój klucz API z RapidAPI dla `real-time-amazon-data`.
        *   Kliknij **"Save"**. Po zapisaniu, wybierz to poświadczenie z listy.
    *   **Dodatkowy Nagłówek (jeśli nie jest częścią poświadczenia):**
        *   W sekcji "Headers" (lub "Options" -> "Headers" w starszych wersjach n8n) kliknij "Add Header".
            *   Name: `X-RapidAPI-Host`, Value: `real-time-amazon-data.p.rapidapi.com`

5.  **Opcje Odpowiedzi (zakładka "Options"):**
    *   **Response Format:** Upewnij się, że wybrane jest `JSON`.
    *   **Always Output Data:** Zazwyczaj chcesz to włączone.
    *   **Split Out Items / Split Into Items (jeśli API zwraca listę):** Jeśli API zwraca listę produktów (np. `data.products` jest tablicą) i chcesz, aby każdy produkt był przetwarzany jako osobny element w n8n, włącz tę opcję. Ścieżka do tablicy może być np. `data.products` (zależnie od struktury odpowiedzi API). Jeśli API `real-time-amazon-data` zwraca listę bestsellerów w polu np. `bestsellers`, ścieżka może być `bestsellers`. Sprawdź odpowiedź API, aby poprawnie ustawić tę ścieżkę.

### Krok 4: Konfiguracja Węzła Function (Transformacja Danych)

Ten węzeł przekształci dane z formatu API na format Twojej tabeli `amazon_products`.

1.  Kliknij na przycisk **"+"** po węźle "HTTP Request", aby dodać nowy węzeł.
2.  W polu wyszukiwania wpisz **"Function"** i wybierz węzeł. (Alternatywnie "Edit Fields" lub "Set" mogą wystarczyć dla prostych mapowań, ale "Function" daje największą elastyczność).
3.  **Wklej Kod JavaScript:**
    Skasuj istniejący kod i wklej poniższy kod. **Pamiętaj, aby dostosować go do dokładnej struktury odpowiedzi, jaką otrzymujesz z Twojego API!**

    ```javascript
    // Pobierz wszystkie elementy (itemy) z poprzedniego węzła.
    // Jeśli użyłeś "Split Out Items" w węźle HTTP Request, każdy produkt będzie osobnym itemem.
    // W przeciwnym razie, będziesz musiał iterować po tablicy produktów wewnątrz jednego itemu.
    const items = $input.all();

    // Mapa do transformacji danych
    return items.map(entry => {
      // Sprawdź strukturę 'entry.json'. Poniżej kilka typowych ścieżek do danych produktów.
      // Dostosuj 'productDataSource' do rzeczywistej ścieżki w odpowiedzi API.
      let productDataSource = null;
      if (entry.json && entry.json.bestsellers) { // Dla API, które zwracają listę bezpośrednio w 'bestsellers'
          productDataSource = entry.json.bestsellers;
      } else if (entry.json && entry.json.data && Array.isArray(entry.json.data.products)) { // Dla API opakowujących produkty w 'data.products'
          productDataSource = entry.json.data.products;
      } else if (Array.isArray(entry.json)) { // Jeśli poprzedni węzeł zwraca bezpośrednio tablicę produktów
          productDataSource = entry.json;
      } else if (entry.json) { // Jeśli produkt jest pojedynczym obiektem json (po "Split Out Items")
          productDataSource = [entry.json]; // Traktuj jako tablicę jednoelementową dla spójności
      } else {
          console.error("Nie znaleziono oczekiwanej tablicy produktów w odpowiedzi API:", entry.json);
          return []; // Zwróć pustą tablicę, aby uniknąć błędów w kolejnych węzłach
      }
      
      // Jeśli productDataSource nie jest tablicą (np. pojedynczy obiekt po "Split Out Items"), opakuj w tablicę
      if (!Array.isArray(productDataSource)) {
          productDataSource = [productDataSource];
      }

      return productDataSource.map(item => {
        // Logika wyciągania ceny (często wymaga specjalnego traktowania)
        let price = null;
        if (item.price && typeof item.price.value !== 'undefined') {
            price = parseFloat(item.price.value);
        } else if (item.product_price) {
            // Próba usunięcia symbolu waluty i konwersji
            const priceString = String(item.product_price).replace('$', '').replace('€', '').replace('£', '').trim();
            price = parseFloat(priceString);
            if (isNaN(price)) price = null; // Jeśli konwersja się nie uda
        }

        // Logika wyciągania BSR
        let bsr = null;
        if (item.bsr) {
            bsr = parseInt(item.bsr);
        } else if (item.product_details && item.product_details.bsr_information && item.product_details.bsr_information.rank) {
            bsr = parseInt(item.product_details.bsr_information.rank);
        }
        if (isNaN(bsr)) bsr = null;


        // Logika wyciągania daty pierwszej dostępności
        let dateFirstAvailable = null;
        if (item.date_first_available) { // Zakładamy, że to już jest w formacie ISO lub parsowalnym przez Date
            try {
                dateFirstAvailable = new Date(item.date_first_available).toISOString();
            } catch (e) {
                console.warn(`Nie udało się sparsować daty: ${item.date_first_available}`);
            }
        }


        return {
          // Pola z Twojej tabeli `amazon_products`
          asin: item.asin || null,
          title: item.title || item.product_title || "Brak tytułu", // Zapewnij domyślną wartość dla NOT NULL
          price: price,
          currency: (item.price && item.price.currency) || (item.product_price && item.product_price.includes('$') ? 'USD' : null) || 'USD', // Domyślnie USD
          bsr: bsr,
          rating: item.rating || item.product_star_rating ? parseFloat(item.rating || item.product_star_rating) : null,
          reviews_count: item.ratings_total || item.product_num_ratings ? parseInt(item.ratings_total || item.product_num_ratings) : 0,
          image_url: item.image || item.product_photo || null,
          product_url: item.link || item.product_url || null,
          category: item.category_name || item.category || 'Domyślna Kategoria', // Dostosuj lub ustaw później
          date_first_available: dateFirstAvailable,
          is_prime: typeof item.is_prime === 'boolean' ? item.is_prime : false,
          is_fba: typeof item.is_fulfilled_by_amazon === 'boolean' ? item.is_fulfilled_by_amazon : false, // Sprawdź dokładną nazwę pola
          sales_volume_text: item.sales_volume || item.monthly_sales || null, // Dostosuj do API
          delivery_info_text: item.delivery || null,
          data_source_api: 'real-time-amazon-data', // Lub nazwa Twojego API
          fetched_at: new Date().toISOString()
          // created_at zostanie ustawione przez Supabase (DEFAULT CURRENT_TIMESTAMP)
        };
      });
    }).flat(); // .flat() jest potrzebne, jeśli mapowanie zwraca tablice tablic (np. jeśli nie użyłeś Split Out Items, a API zwraca listę produktów w jednym itemie)
    ```
4.  **Ważne:**
    *   **Struktura Odpowiedzi API:** Dokładnie przeanalizuj strukturę JSON, którą zwraca Twoje API. Ścieżki dostępu do danych (np. `entry.json.bestsellers`, `item.asin`, `item.price.value`) muszą być precyzyjnie dopasowane. Użyj wyników testowych z węzła HTTP Request, aby zobaczyć rzeczywiste dane.
    *   **Pola NOT NULL:** Upewnij się, że dla pól w Supabase zdefiniowanych jako `NOT NULL` (np. `asin`, `title`) zawsze dostarczasz wartość lub odpowiednią wartość domyślną w kodzie transformacji.
    *   **Typy Danych:** Zwróć uwagę na konwersję typów danych (np. `parseFloat` dla ceny, `parseInt` dla BSR, formatowanie daty).

### Krok 5: Konfiguracja Węzła PostgreSQL/Supabase (Zapis Danych)

Ten węzeł zapisze przetworzone dane do Twojej tabeli `amazon_products` w Supabase.

1.  Kliknij na przycisk **"+"** po węźle "Function", aby dodać nowy węzeł.
2.  W polu wyszukiwania wpisz **"PostgreSQL"** i wybierz węzeł.
3.  **Uwierzytelnianie (Credentials):**
    *   Kliknij na listę rozwijaną **"Credential for PostgreSQL"**.
    *   Jeśli nie masz jeszcze skonfigurowanego poświadczenia dla Supabase:
        *   Wybierz **"Create New Credential"**.
        *   **Credential Name:** Nazwij je, np. `Supabase Merchbot DB`.
        *   **Host:** Znajdziesz w Supabase Dashboard -> Project Settings -> Database -> Connection info -> Host (np. `db.YOUR_PROJECT_ID.supabase.co`).
        *   **Database:** `postgres` (standardowo dla Supabase).
        *   **User:** `postgres` (standardowo dla Supabase).
        *   **Password:** Hasło, które ustawiłeś podczas tworzenia projektu Supabase.
        *   **Port:** Znajdziesz w Supabase Dashboard -> Project Settings -> Database -> Connection info -> Port.
        *   **SSL Mode:** Zazwyczaj `require` lub `allow`. Sprawdź ustawienia Supabase.
        *   Kliknij **"Save"**.
    *   Wybierz skonfigurowane poświadczenie z listy.
4.  **Ustawienia Operacji (Parameters):**
    *   **Operation:** Wybierz `Upsert`.
    *   **Schema:** Wpisz `public` (chyba że używasz innego schematu w Supabase).
    *   **Table:** Wpisz `amazon_products`.
    *   **Conflict Target Column(s):** Wpisz `asin`. To jest kluczowa kolumna, na podstawie której `Upsert` będzie wiedział, czy zaktualizować istniejący wiersz, czy wstawić nowy.
    *   **Columns (and expressions to map to them):** Tutaj mapujesz dane z poprzedniego węzła (Function) na kolumny tabeli. n8n spróbuje automatycznie zmapować pola o tych samych nazwach. Upewnij się, że nazwy pól zwracane przez węzeł "Function" odpowiadają nazwom kolumn w tabeli `amazon_products`.
        *   Możesz użyć wyrażeń JavaScript (np. `{{ $json.nazwaPolaZFunction }}`) do mapowania, jeśli nazwy nie pasują idealnie lub potrzebujesz drobnych modyfikacji. Przejrzyj "Input Data" z węzła Function, aby zobaczyć dostępne pola.
        *   Jeśli węzeł "Function" zwraca tablicę obiektów, gdzie każdy obiekt ma klucze odpowiadające kolumnom tabeli, n8n powinien sobie z tym poradzić automatycznie dla operacji `Upsert` (dla każdego elementu tablicy wykona Upsert).

### Krok 6: Testowanie Workflow

1.  **Zapisz Workflow:** Kliknij przycisk "Save" (lub Ctrl+S/Cmd+S), aby zapisać swoje postępy. Nadaj mu nazwę, np. "Pobieranie Bestsellerów Amazon".
2.  **Uruchamianie Ręczne:**
    *   **Krok po Kroku:** Możesz uruchomić każdy węzeł indywidualnie, klikając na nim przycisk "Execute node" (ikona Play). To pozwoli Ci sprawdzić dane wejściowe i wyjściowe dla każdego etapu.
    *   **Cały Workflow:** Kliknij przycisk "Execute workflow" w lewym dolnym rogu (lub "Play" na górze), aby uruchomić cały przepływ.
3.  **Sprawdzanie Danych:**
    *   Po wykonaniu węzła, kliknij na niego, aby zobaczyć jego dane wejściowe ("Input") i wyjściowe ("Output") w panelu po prawej stronie. Sprawdź, czy dane są poprawne na każdym etapie.
    *   **HTTP Request:** Sprawdź, czy otrzymujesz poprawną odpowiedź JSON z API.
    *   **Function:** Sprawdź, czy transformacja danych działa zgodnie z oczekiwaniami i czy struktura danych wyjściowych pasuje do tabeli Supabase.
    *   **PostgreSQL:** Sprawdź, czy nie ma błędów. W panelu wyjściowym powinieneś zobaczyć informację o liczbie przetworzonych wierszy.
4.  **Weryfikacja w Supabase:**
    *   Zaloguj się do swojego panelu Supabase.
    *   Przejdź do "Table Editor" i wybierz tabelę `amazon_products`.
    *   Sprawdź, czy nowe dane zostały dodane lub istniejące zaktualizowane.

### Krok 7: Aktywacja Workflow

Gdy jesteś pewien, że workflow działa poprawnie:

1.  W prawym górnym rogu edytora workflow znajdziesz przełącznik **"Inactive" / "Active"**.
2.  Przełącz go na **"Active"**.
3.  Workflow będzie teraz automatycznie uruchamiany zgodnie z harmonogramem ustawionym w węźle "Schedule".

### Krok 8: Obsługa Błędów (Podstawy)

Profesjonalne workflowy powinny zawierać mechanizmy obsługi błędów.

1.  **Ustawienia Węzła:**
    *   W każdym węźle, w zakładce "Settings" (lub "Ustawienia"), znajdziesz opcje takie jak:
        *   **"Continue on Fail"**: Pozwala workflow kontynuować, nawet jeśli dany węzeł napotka błąd.
        *   **"Retry on Fail"**: Automatycznie ponawia próbę wykonania węzła w przypadku błędu.
    *   Używaj tych opcji ostrożnie, w zależności od krytyczności danego kroku.
2.  **Powiadomienia o Błędach:**
    *   Możesz dodać osobną gałąź w workflow, która będzie uruchamiana w przypadku błędu.
    *   Po węźle, który może zawieść, dodaj węzeł "Error Trigger" lub skonfiguruj ścieżkę błędu.
    *   Za nim dodaj węzeł powiadamiający, np. "Send Email", "Slack", itp., aby informować Cię o problemach.

---

Pamiętaj, że to jest podstawowy przewodnik. Możesz rozbudowywać ten workflow o dodatkowe funkcje, takie jak bardziej zaawansowana transformacja danych, obsługa wielu kategorii produktów, bardziej szczegółowa obsługa błędów i logowanie. Regularnie sprawdzaj logi wykonań ("Executions" w n8n), aby monitorować działanie workflow. Powodzenia!
