# Kompletna Dokumentacja Techniczna: Faza 1 - System Backend API Merchbot

## 1. Wprowadzenie i Cele Systemu

*   **Cel Systemu:** Opis celu systemu backendowego Fazy 1, którym jest stworzenie solidnych fundamentów do gromadzenia, zarządzania i udostępniania danych związanych z platformą Merch by Amazon. System ma wspierać przyszłe narzędzia analityczne i agentów AI.
*   **Główne Funkcjonalności:**
    *   Automatyczne gromadzenie danych o produktach i bestsellerach z Amazon (za pośrednictwem n8n i zewnętrznych API).
    *   Przechowywanie i strukturyzowanie zebranych danych w dedykowanej bazie danych PostgreSQL (Supabase).
    *   Udostępnianie przetworzonych danych poprzez bezpieczne i filtrowalne punkty końcowe API (Vercel Serverless Functions).
    *   Obsługa zadań dla agentów AI, w tym kolejkowanie i zapisywanie wyników.
    *   Zarządzanie zapisanymi wyszukiwaniami użytkowników i danymi dotyczącymi badań nisz.
*   **Docelowi Użytkownicy API:**
    *   Agent AI `mba_agent` do wykonywania zadań i pobierania informacji.
    *   Przyszły interfejs użytkownika/dashboard Merchbot.
    *   Potencjalnie inne zintegrowane narzędzia i systemy.

## 2. Architektura Systemu

*   **Opis Ogólnej Architektury:**
    *   **Vercel:** Platforma hostingowa dla backendowego API, wykorzystująca Next.js API Routes jako Serverless Functions (Node.js/TypeScript). Odpowiedzialna za obsługę żądań od klientów API.
    *   **Supabase:** Platforma BaaS (Backend as a Service) dostarczająca zarządzaną bazę danych PostgreSQL, system uwierzytelniania (choć API używa własnego klucza) oraz inne narzędzia backendowe. Główny magazyn danych.
    *   **n8n:** Narzędzie do automatyzacji przepływów pracy, używane do orkiestracji pobierania danych z zewnętrznych źródeł, ich transformacji i ładowania do bazy Supabase.
*   **Przepływ Danych:**
    1.  **n8n:** Cyklicznie (np. codziennie) odpytuje zewnętrzne API (np. RapidAPI `real-time-amazon-data`) o dane produktowe Amazon.
    2.  **n8n:** Przetwarza (transformuje) otrzymane dane, dostosowując je do schematu bazy danych.
    3.  **n8n:** Zapisuje (operacja Upsert) przetworzone dane do odpowiednich tabel w bazie Supabase.
    4.  **Vercel API:** Odbiera żądania od klientów (np. `mba_agent`).
    5.  **Vercel API:** Odpytuje bazę Supabase w celu pobrania lub modyfikacji danych.
    6.  **Vercel API:** Zwraca odpowiedź do klienta.
*   **Diagram Architektury:** *(Ta sekcja będzie zawierać odniesienie do diagramu architektury systemu, który zostanie stworzony w Kroku 9. Diagram ten wizualnie przedstawi interakcje między Vercel, Supabase, n8n, zewnętrznymi API oraz klientami API.)*

## 3. Baza Danych (Supabase/PostgreSQL)

*   **Schemat Bazy Danych:**
    *   Pełny skrypt SQL do tworzenia tabel i indeksów znajduje się w pliku `merchbot_schema.sql`. (Należy dołączyć zawartość pliku lub link do niego).
    *   **Tabele Zdefiniowane:**
        *   `amazon_products`: Przechowuje szczegółowe dane o produktach Amazon. Kluczowe kolumny: `asin` (UNIQUE), `title`, `price`, `bsr`, `category`, `date_first_available`.
        *   `agent_tasks`: (Jeśli zdefiniowano w `merchbot_schema.sql` - nie było w poprzednich krokach, ale dodaję jako typowy element dla agentów) Służy do kolejkowania zadań dla agentów AI. Kluczowe kolumny: `task_type`, `parameters`, `status`, `priority`.
        *   `agent_task_results`: (Jeśli zdefiniowano w `merchbot_schema.sql`) Przechowuje wyniki wykonanych zadań przez agentów AI. Kluczowe kolumny: `task_id` (FK), `result_data`, `status`.
        *   `saved_user_searches`: (Jeśli zdefiniowano w `merchbot_schema.sql`) Przechowuje zapisane przez użytkowników kryteria wyszukiwania. Kluczowe kolumny: `user_id`, `search_name`, `search_parameters`.
        *   `ip_risk_terms`: Przechowuje listę terminów mogących stanowić ryzyko IP. Kluczowe kolumny: `term` (UNIQUE), `risk_level`, `reason`.
        *   `niche_research_keywords`: Przechowuje słowa kluczowe powiązane z badaniami nisz. Kluczowe kolumny: `niche_query`, `keyword` (UNIQUE z `niche_query`).
        *   `sub_niche_ideas`: Przechowuje pomysły na sub-nisze. Kluczowe kolumny: `niche_query`, `sub_niche_description`.
    *   **Indeksy:** Opisane w `merchbot_schema.sql`; stworzone w celu optymalizacji zapytań na często filtrowanych lub sortowanych kolumnach (np. `amazon_products.asin`, `amazon_products.bsr`, `niche_research_keywords.keyword`).
*   **Row Level Security (RLS):**
    *   Obecnie RLS nie jest skonfigurowane na poziomie skryptu `merchbot_schema.sql`.
    *   Dla dostępu backendowego (np. z Vercel API, n8n) przy użyciu klucza `SERVICE_ROLE_KEY`, RLS jest domyślnie omijane.
    *   Rekomenduje się wdrożenie RLS, jeśli planowany jest bezpośredni dostęp do bazy z frontendu przy użyciu klucza `ANON_KEY`, aby zapewnić odpowiednią kontrolę dostępu do danych.
*   **Diagram ERD:** *(Ta sekcja będzie zawierać odniesienie do diagramu relacji encji (ERD) dla bazy danych, który zostanie stworzony w Kroku 9. Diagram ten wizualnie przedstawi tabele, ich kolumny oraz relacje między nimi.)*

## 4. Przepływ Pracy Przetwarzania Danych (n8n)

*   **Cel Workflow:** Automatyzacja procesu regularnego pobierania aktualnych danych o produktach i bestsellerach Amazon, ich transformacji w celu dopasowania do schematu bazy danych oraz ładowania (Upsert) do bazy Supabase.
*   **Źródło Danych:** Zewnętrzne API, np. `real-time-amazon-data` z platformy RapidAPI.
    *   Kluczowy endpoint używany: Wyszukiwanie produktów/bestsellerów (np. `/request?type=bestsellers&url=...`).
*   **Kroki Workflow (zgodnie z `n8n_merchbot_workflow_guide.md`):**
    1.  **Trigger (Schedule/Cron):** Uruchamia workflow automatycznie w zdefiniowanych interwałach (np. codziennie o północy).
    2.  **HTTP Request Node:** Wysyła żądanie GET do zewnętrznego API w celu pobrania danych. Konfiguracja obejmuje URL, parametry zapytania (np. kategoria Amazon, domena) oraz nagłówki autoryzacyjne (`X-RapidAPI-Key`, `X-RapidAPI-Host`).
    3.  **Function Node (Transformacja):** Przetwarza odpowiedź JSON z API. Logika obejmuje mapowanie pól z odpowiedzi API na kolumny tabeli `amazon_products`, konwersję typów danych (np. string na liczbę, formatowanie dat), obsługę brakujących wartości i zapewnienie zgodności ze schematem docelowym. (Przykładowy fragment kodu JS zawarty jest w przewodniku n8n).
    4.  **PostgreSQL/Supabase Node (Zapis):** Łączy się z bazą Supabase i wykonuje operację `Upsert` na tabeli `amazon_products`, używając kolumny `asin` jako klucza konfliktu do aktualizacji istniejących rekordów lub wstawiania nowych.
*   **Obsługa Błędów w n8n:** Podstawowe strategie obejmują konfigurację opcji "Retry on Fail" oraz "Continue on Fail" w węzłach, a także możliwość tworzenia dedykowanych gałęzi do obsługi błędów i wysyłania powiadomień.
*   **Diagram Przepływu n8n:** *(Ta sekcja będzie zawierać odniesienie do diagramu wizualnego przepływu pracy n8n, który zostanie stworzony w Kroku 9. Diagram ten zilustruje sekwencję węzłów i przepływ danych w n8n.)*

## 5. Backend API (Vercel Serverless Functions)

*   **Technologia:** Punkty końcowe API zaimplementowane jako Serverless Functions przy użyciu Next.js API Routes. Język programowania: TypeScript. Platforma hostingowa: Vercel.
*   **Uwierzytelnianie:** Dostęp do API jest chroniony za pomocą klucza API. Klient musi przesłać prawidłowy klucz w nagłówku `X-API-Key`. Klucz ten jest weryfikowany na serwerze względem wartości zapisanej w zmiennej środowiskowej `MERCHBOT_API_KEY`.
*   **Dokumentacja Punktów Końcowych:**
    *(Dla każdego endpointu należy podać szczegóły zgodnie z wygenerowanymi specyfikacjami w Kroku 4 i plikami TypeScript w Kroku 5. Poniżej skrócony przykład dla jednego endpointu, reszta analogicznie):*
    *   **`GET /api/amazon/bestsellers`**
        *   **Opis:** Pobiera listę produktów Amazon z możliwością filtrowania, sortowania i paginacji.
        *   **Parametry Zapytania:** `bsrMin`, `bsrMax`, `priceMin`, `priceMax`, `category`, `sortBy`, `page`, `limit`, itd. (pełna lista w specyfikacji).
        *   **Odpowiedź Sukcesu (200 OK):** `{ success: true, data: { products: Product[], pagination: Pagination } }`.
        *   **Odpowiedzi Błędów:** 400 (Bad Request), 401 (Unauthorized), 500 (Internal Server Error).
    *   **`GET /api/amazon/categories`**
        *   **Opis:** Pobiera listę unikalnych kategorii produktów dostępnych w bazie.
        *   **Parametry Zapytania:** Brak.
        *   **Odpowiedź Sukcesu (200 OK):** `{ success: true, data: { categories: string[] } }`.
    *   **`GET /api/amazon/product/[asin]`**
        *   **Opis:** Pobiera szczegółowe informacje o produkcie na podstawie jego numeru ASIN.
        *   **Parametry Ścieżki:** `asin` (string, wymagany).
        *   **Odpowiedź Sukcesu (200 OK):** `{ success: true, data: Product }`.
        *   **Odpowiedzi Błędów:** 404 (Not Found).
    *   *(Należy dodać specyfikacje dla pozostałych planowanych endpointów, np. `POST /api/agent/tasks`, `GET /api/agent/tasks/queue`, `PUT /api/agent/tasks/[task_id]/results`, `GET /api/user/searches`, `POST /api/user/searches`, jeśli zostały zdefiniowane w poprzednich krokach. Na razie nie były one częścią generowania kodu API w Krokach 4 i 5, więc ta sekcja może być rozbudowana później.)*
*   **Tabela API:** *(Ta sekcja będzie zawierać odniesienie do zbiorczej tabeli API, która zostanie stworzona w Kroku 9. Tabela ta podsumuje wszystkie punkty końcowe, ich metody, parametry i krótkie opisy.)*
*   **Kod Źródłowy:** Główna logika API znajduje się w katalogu `pages/api/` projektu Next.js. Przykładowe pliki: `pages/api/amazon/bestsellers.ts`, `pages/api/amazon/categories.ts`, `pages/api/amazon/product/[asin].ts`.

## 6. System Obsługi Błędów (Backend API)

*   **Standardowe Kody Statusu HTTP:**
    *   `200 OK`: Żądanie zakończone sukcesem.
    *   `201 Created`: Zasób został pomyślnie utworzony (dla POST/PUT).
    *   `400 Bad Request`: Błąd w żądaniu klienta (np. brakujące parametry, nieprawidłowy format danych).
    *   `401 Unauthorized`: Brak lub nieprawidłowy klucz API.
    *   `403 Forbidden`: Klient nie ma uprawnień do zasobu (nawet jeśli jest uwierzytelniony).
    *   `404 Not Found`: Żądany zasób nie został znaleziony.
    *   `405 Method Not Allowed`: Użyto niedozwolonej metody HTTP dla danego endpointu.
    *   `500 Internal Server Error`: Ogólny błąd serwera (np. błąd bazy danych, nieprzewidziany wyjątek).
*   **Format Odpowiedzi JSON dla Błędów:** `{ success: false, message: string, details?: any }` (gdzie `details` może zawierać dodatkowe informacje o błędzie, np. błędy walidacji).
*   **Logowanie Błędów:** Błędy serwera oraz potencjalnie inne istotne zdarzenia są logowane za pomocą `console.error()` i dostępne w logach funkcji Vercel.

## 7. System Informacji Operacyjnych API (Backend API)

*   **Logowanie Żądań/Odpowiedzi:**
    *   Podstawowe logowanie (np. metoda, URL, status odpowiedzi) jest automatycznie dostarczane przez Vercel.
    *   Dodatkowe, niestandardowe logowanie kluczowych informacji (np. czas przetwarzania, specyficzne parametry – zanonimizowane jeśli wrażliwe) może być implementowane w kodzie funkcji API przy użyciu `console.log()`.
*   **Dostęp do Logów:** Logi są dostępne w panelu Vercel, w sekcji "Logs" lub "Functions" dla danego projektu i wdrożenia.

## 8. Strategia Testowania (Backend API)

*   **Testy Jednostkowe (Unit Tests):**
    *   Cel: Testowanie małych, izolowanych fragmentów kodu (np. pojedyncze funkcje pomocnicze, logika transformacji danych) bez zależności od zewnętrznych systemów (jak baza danych).
    *   Narzędzia: Frameworki takie jak Jest lub Vitest.
*   **Testy Integracyjne (Integration Tests):**
    *   Cel: Testowanie interakcji między komponentami, w szczególności punktów końcowych API z (testową) bazą danych Supabase.
    *   Narzędzia: Jest/Vitest w połączeniu z bibliotekami do wysyłania żądań HTTP (np. `supertest`, `axios`, `node-fetch`) lub przez bezpośrednie wywołanie handlerów Next.js API.
*   **Kluczowe Przypadki Testowe:**
    *   Uwierzytelnianie (poprawny/niepoprawny klucz API).
    *   Walidacja parametrów wejściowych (wymagane pola, formaty danych, zakresy wartości).
    *   Logika biznesowa (np. poprawność filtrowania i sortowania w `GET /api/amazon/bestsellers`).
    *   Obsługa przypadków brzegowych i błędów (np. nieznaleziony ASIN, błędy bazy danych).
    *   Poprawność struktur odpowiedzi (sukces, błąd).
*   **Zarządzanie Danymi Testowymi:** Wykorzystanie dedykowanej testowej instancji Supabase lub mechanizmów seedowania/czyszczenia danych przed/po testach.

## 9. Instrukcje Wdrażania

*   Ta sekcja będzie zawierać odniesienia do szczegółowych, wcześniej wygenerowanych przewodników krok po kroku:
    *   **Wdrażanie Schematu Bazy Danych w Supabase:** (Odniesienie do `supabase_schema_deployment_guide.md` lub podobnego dokumentu wygenerowanego w Kroku 6).
    *   **Konfiguracja i Wdrażanie Workflow n8n:** (Odniesienie do `n8n_merchbot_workflow_guide.md` wygenerowanego w Kroku 7).
    *   **Wdrażanie Aplikacji Backendowej API na Vercel:** (Odniesienie do `vercel_nextjs_api_deployment_guide.md` wygenerowanego w Kroku 8).
    *   Należy podkreślić znaczenie poprawnej konfiguracji zmiennych środowiskowych w każdym z tych systemów.

## 10. Zmienne Środowiskowe

*   **Vercel (dla Next.js API):**
    *   `SUPABASE_URL`: Adres URL projektu Supabase.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Klucz serwisowy Supabase do dostępu do bazy danych z uprawnieniami administracyjnymi.
    *   `MERCHBOT_API_KEY`: Własny klucz API do zabezpieczania punktów końcowych API Merchbot.
*   **n8n:**
    *   `DB_TYPE` (jeśli używana baza danych dla n8n, np. `postgresdb`)
    *   `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_PASSWORD`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_SCHEMA` (jeśli n8n jest self-hosted i używa PostgreSQL do przechowywania swoich danych).
    *   Poświadczenia dla węzłów (Credentials):
        *   **RapidAPI (dla `real-time-amazon-data`):** Przechowywane w systemie poświadczeń n8n (Header Auth: `X-RapidAPI-Key`).
        *   **Supabase/PostgreSQL:** Przechowywane w systemie poświadczeń n8n (Host, Baza, Użytkownik, Hasło, Port).
*   **Lokalne Środowisko Deweloperskie:**
    *   Zalecane użycie pliku `.env.local` (niecommitowanego do Git) do przechowywania tych samych zmiennych, co dla Vercel, aby umożliwić lokalne testowanie.

---

Ten szkic dokumentacji technicznej stanowi podstawę. Każda sekcja powinna zostać rozwinięta o szczegółowe informacje i odniesienia do konkretnych artefaktów projektowych, aby stworzyć kompletną i użyteczną dokumentację dla Fazy 1 systemu Merchbot API.I have generated the sketch for the "Complete Technical Documentation: Phase 1 - Merchbot Backend API System" and saved it as `merchbot_backend_api_phase1_technical_documentation_sketch.md`.

The document follows the requested structure:

1.  **Wprowadzenie i Cele Systemu:** Outlines the system's purpose, main functionalities, and target API users.
2.  **Architektura Systemu:** Describes the Vercel, Supabase, and n8n components and the overall data flow. It includes a placeholder for a future architecture diagram.
3.  **Baza Danych (Supabase/PostgreSQL):**
    *   References `merchbot_schema.sql`.
    *   Lists key tables (`amazon_products`, `ip_risk_terms`, `niche_research_keywords`, `sub_niche_ideas`) and placeholders for potential agent-related tables (`agent_tasks`, `agent_task_results`, `saved_user_searches`) with brief descriptions.
    *   Mentions indexes and RLS status.
    *   Includes a placeholder for a future ERD.
4.  **Przepływ Pracy Przetwarzania Danych (n8n):**
    *   Details the purpose, data source (RapidAPI `real-time-amazon-data`), and steps of the n8n workflow (Trigger, HTTP Request, Transformation, PostgreSQL/Supabase Upsert).
    *   References the `n8n_merchbot_workflow_guide.md`.
    *   Includes a placeholder for a future n8n flow diagram.
5.  **Backend API (Vercel Serverless Functions):**
    *   Specifies the technology (Next.js API Routes on Vercel, TypeScript) and authentication method (API Key).
    *   Provides a structure for documenting endpoints (`GET /api/amazon/bestsellers`, `GET /api/amazon/categories`, `GET /api/amazon/product/[asin]`) and placeholders for potential future agent/user related endpoints. Each endpoint documentation should cover method, path, description, parameters, and example responses.
    *   References the TypeScript files generated for the API.
    *   Includes a placeholder for a future API summary table.
6.  **System Obsługi Błędów (Backend API):** Lists standard HTTP status codes, error JSON format, and logging via Vercel.
7.  **System Informacji Operacyjnych API (Backend API):** Describes logging of requests/responses and access to logs via Vercel.
8.  **Strategia Testowania (Backend API):** Outlines approaches for unit and integration tests, key test cases, and test data management.
9.  **Instrukcje Wdrażania:** References previously generated guides for Supabase schema, n8n workflow, and Vercel API deployment.
10. **Zmienne Środowiskowe:** Lists required environment variables for Vercel and n8n, and for local development.

This sketch provides a comprehensive framework that the user can expand with the detailed content from the previously generated artifacts and future diagrams.
