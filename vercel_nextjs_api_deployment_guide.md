## Przewodnik Wdrażania Aplikacji Backendowej API (Next.js/TypeScript) na Vercel

Ten przewodnik krok po kroku pomoże Ci wdrożyć Twoją aplikację backendową API, zbudowaną w Next.js i TypeScript, na platformie Vercel. Zakładamy, że masz już konto Vercel, zainstalowane niezbędne narzędzia (Git, Vercel CLI - opcjonalnie) oraz kod aplikacji w repozytorium Git.

### Krok 1: Przygotowanie Repozytorium Kodu

Zanim rozpoczniesz wdrażanie, upewnij się, że Twoje repozytorium kodu jest odpowiednio skonfigurowane:

1.  **Struktura Projektu Next.js:**
    *   Twoje pliki API (np. `bestsellers.ts`, `categories.ts`, `product/[asin].ts`) powinny znajdować się w katalogu `pages/api/` (lub `src/pages/api/` jeśli używasz katalogu `src`). Vercel automatycznie wykryje i obsłuży te pliki jako Serverless Functions.

2.  **Zależności w `package.json`:**
    *   Sprawdź, czy wszystkie wymagane zależności są zdefiniowane w pliku `package.json` w sekcji `dependencies` lub `devDependencies`. Kluczowe pakiety dla Twojego API to prawdopodobnie:
        *   `next` (framework Next.js)
        *   `@supabase/supabase-js` (do interakcji z bazą Supabase)
        *   `typescript`, `@types/react`, `@types/node` (jeśli używasz TypeScript)
    *   Aby zainstalować brakujące zależności, użyj `npm install <nazwa-pakietu>` lub `yarn add <nazwa-pakietu>`.

3.  **Plik `.gitignore`:**
    *   Upewnij się, że Twój plik `.gitignore` zawiera wpisy uniemożliwiające wysyłanie do repozytorium Git niepotrzebnych lub wrażliwych plików/katalogów, takich jak:
        ```
        node_modules/
        .env.local
        .env*.local
        .next/
        out/
        # inne specyficzne dla projektu pliki
        ```
    *   Pliki `.env.local` (lub podobne) służą do przechowywania zmiennych środowiskowych lokalnie i nigdy nie powinny być commitowane. Zamiast tego, zmienne środowiskowe dla Vercel będą konfigurowane bezpośrednio na platformie.

### Krok 2: Logowanie do Vercel CLI (Opcjonalne, ale Zalecane)

Jeśli planujesz zarządzać projektem lub wdrażać go również z linii komend, zaloguj się do Vercel CLI:

1.  Otwórz terminal/wiersz poleceń.
2.  Wpisz komendę:
    ```bash
    vercel login
    ```
3.  Vercel CLI poprosi Cię o wybór metody logowania (np. przez email). Postępuj zgodnie z instrukcjami wyświetlanymi w terminalu i przeglądarce, aby autoryzować CLI.

### Krok 3: Łączenie Projektu z Vercel

Masz dwie główne opcje połączenia swojego lokalnego projektu z Vercel:

**Opcja A (Preferowana - przez interfejs Vercel.com):**

Ta opcja jest zalecana, jeśli masz już projekt Vercel stworzony i połączony z Twoim repozytorium Git (np. GitHub, GitLab, Bitbucket), zgodnie z wcześniejszymi instrukcjami konfiguracji Vercel.

1.  **Jeśli Projekt Vercel jest już połączony z Git:**
    *   Super! W większości przypadków nie musisz robić nic więcej w tym kroku. Vercel automatycznie wykryje zmiany w Twoim repozytorium. Przejdź do Kroku 4 (Konfiguracja Zmiennych Środowiskowych).
2.  **Jeśli Projekt Vercel nie istnieje lub nie jest połączony:**
    *   Zaloguj się na swoje konto na [Vercel.com](https://vercel.com/).
    *   Kliknij przycisk **"+ New Project"**.
    *   Wybierz repozytorium Git, w którym znajduje się Twój kod API (np. z listy Twoich repozytoriów GitHub).
    *   **Konfiguracja Projektu:**
        *   **Project Name:** Vercel zasugeruje nazwę na podstawie repozytorium, ale możesz ją zmienić.
        *   **Framework Preset:** Vercel powinien automatycznie wykryć **"Next.js"**. Jeśli nie, wybierz go z listy.
        *   **Root Directory:** Zazwyczaj pozostaje domyślne (`./`), chyba że Twój kod Next.js znajduje się w podkatalogu repozytorium.
        *   Kliknij **"Deploy"**. Początkowe wdrożenie może się nie powieść, jeśli zmienne środowiskowe nie są jeszcze ustawione – skonfigurujemy je w następnym kroku.

**Opcja B (Alternatywa - Inicjalizacja z Vercel CLI w katalogu projektu):**

Możesz również połączyć projekt bezpośrednio z terminala, będąc w głównym katalogu swojego projektu.

1.  Otwórz terminal i przejdź do głównego katalogu swojego projektu Next.js:
    ```bash
    cd /sciezka/do/twojego/projektu
    ```
2.  Uruchom komendę:
    ```bash
    vercel
    ```
3.  Postępuj zgodnie z instrukcjami wyświetlanymi przez CLI:
    *   **Potwierdzenie konta:** CLI zapyta, czy chcesz użyć aktualnie zalogowanego konta.
    *   **Link to existing project?** Jeśli projekt był już wcześniej stworzony na Vercel, możesz go tutaj połączyć. Wybierz `Y` i wskaż odpowiedni projekt.
    *   **Set up and deploy?** Jeśli to nowy projekt, wybierz `Y`.
    *   **Which scope?** Wybierz swój personalny scope lub team.
    *   **Project name:** Potwierdź lub zmień nazwę projektu.
    *   **Directory location:** Potwierdź lokalizację kodu (powinno być auto-wykryte).
    *   **Auto-detected settings:** Vercel automatycznie wykryje ustawienia dla Next.js. Zazwyczaj możesz je zatwierdzić.
    *   CLI rozpocznie proces wdrażania. Może on się nie udać, jeśli zmienne środowiskowe nie są jeszcze ustawione.

### Krok 4: Konfiguracja Zmiennych Środowiskowych w Vercel

Twoje API będzie potrzebowało kluczy dostępu do Supabase oraz własnego klucza API do autoryzacji. **Nigdy nie umieszczaj tych kluczy bezpośrednio w kodzie ani w plikach commitowanych do Git!**

**Kluczowe Zmienne Środowiskowe do Ustawienia:**

*   `SUPABASE_URL`: URL Twojego projektu Supabase (znajdziesz w Supabase Dashboard -> Project Settings -> API -> Project URL).
*   `SUPABASE_SERVICE_ROLE_KEY`: Klucz serwisowy Supabase (znajdziesz w Supabase Dashboard -> Project Settings -> API -> Project API Keys -> `service_role` key). Ten klucz ma pełne uprawnienia do Twojej bazy danych i powinien być traktowany jak hasło.
*   `MERCHBOT_API_KEY`: Twój własny, zdefiniowany klucz API, którego będziesz używał do zabezpieczania dostępu do Twoich punktów końcowych API na Vercel (np. wygeneruj silny, losowy ciąg znaków).

**Sposoby Ustawiania Zmiennych Środowiskowych:**

*   **Przez Interfejs Vercel.com (Zalecane):**
    1.  Zaloguj się na [Vercel.com](https://vercel.com/).
    2.  Wybierz swój projekt z listy.
    3.  Przejdź do zakładki **"Settings"**.
    4.  W menu po lewej stronie wybierz **"Environment Variables"**.
    5.  Dla każdej zmiennej (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MERCHBOT_API_KEY`):
        *   Kliknij **"Add New"** (lub edytuj istniejące).
        *   W polu **"Name"** wpisz nazwę zmiennej (np. `SUPABASE_URL`).
        *   W polu **"Value"** wklej jej wartość.
        *   **Ważne:** Upewnij się, że zaznaczyłeś odpowiednie środowiska, dla których zmienna ma być dostępna: **Production, Preview, i Development**. Dla kluczy API i danych wrażliwych, zazwyczaj wszystkie trzy są potrzebne, aby funkcje działały poprawnie we wszystkich typach wdrożeń Vercel.
        *   Kliknij **"Save"**.
    6.  Powtórz dla wszystkich trzech zmiennych. Po dodaniu zmiennych, Vercel może automatycznie zasugerować ponowne wdrożenie (redeploy), aby zmiany zostały uwzględnione.

*   **Przez Vercel CLI (dla zaawansowanych):**
    Będąc w katalogu projektu, możesz użyć komend:
    ```bash
    vercel env add SUPABASE_URL
    # (CLI poprosi o wartość i środowiska)

    vercel env add SUPABASE_SERVICE_ROLE_KEY
    # (CLI poprosi o wartość i środowiska - upewnij się, że dodajesz ją jako "Secret")

    vercel env add MERCHBOT_API_KEY
    # (CLI poprosi o wartość i środowiska - upewnij się, że dodajesz ją jako "Secret")
    ```
    Alternatywnie, możesz podać wartość i środowiska bezpośrednio:
    ```bash
    vercel env add SUPABASE_URL twoj_supabase_url production,preview,development
    vercel env add SUPABASE_SERVICE_ROLE_KEY twoj_supabase_service_key production,preview,development -t secret
    vercel env add MERCHBOT_API_KEY twoj_merchbot_api_key production,preview,development -t secret
    ```
    Użycie `-t secret` (lub `--type secret`) jest zalecane dla wartości wrażliwych.

### Krok 5: Proces Wdrażania (Deployment)

*   **Automatyczne Wdrożenia (z Integracji Git):**
    *   Jeśli Twój projekt Vercel jest poprawnie połączony z repozytorium Git (np. GitHub):
        *   Każde wypchnięcie (`git push`) zmian do głównej gałęzi (np. `main`, `master`) lub skonfigurowanej gałęzi produkcyjnej automatycznie uruchomi nowy proces budowania i wdrażania na Vercel dla środowiska produkcyjnego.
        *   Wypchnięcie do innych gałęzi lub utworzenie Pull Request (w zależności od konfiguracji) stworzy wdrożenie typu "Preview".
    *   Możesz monitorować postęp wdrożenia w panelu Vercel w sekcji "Deployments".

*   **Ręczne Wdrożenie (z Vercel CLI):**
    *   Aby wdrożyć wersję produkcyjną z lokalnego katalogu projektu (upewnij się, że wszystkie zmiany są commitowane i wypchnięte, jeśli pracujesz z Git):
        ```bash
        vercel --prod
        ```
    *   Aby stworzyć wdrożenie deweloperskie/preview:
        ```bash
        vercel
        ```
    *   Postępuj zgodnie z instrukcjami CLI. Status wdrożenia będzie widoczny w terminalu oraz w panelu Vercel.

### Krok 6: Weryfikacja Wdrożenia

Po pomyślnym zakończeniu procesu wdrażania:

1.  **Uzyskaj URL:**
    *   Vercel dostarczy Ci unikalny URL produkcyjny (zazwyczaj w formacie `nazwa-projektu.vercel.app`) oraz URL dla każdego wdrożenia preview. Znajdziesz je w panelu Vercel w sekcji "Deployments" lub "Domains".

2.  **Testowanie Punktów Końcowych API:**
    *   Możesz teraz przetestować swoje wdrożone punkty końcowe API. Pamiętaj o dodaniu nagłówka `X-API-Key` z wartością Twojego `MERCHBOT_API_KEY`.
    *   **Przykład testowania `/api/amazon/categories` (prosty GET):**
        Możesz spróbować otworzyć w przeglądarce (choć przeglądarka nie pozwoli łatwo ustawić nagłówka `X-API-Key`):
        `https://twoja-nazwa-projektu.vercel.app/api/amazon/categories`
        Spodziewaj się błędu 401 (Unauthorized) bez poprawnego klucza API.
    *   **Użyj narzędzia typu Postman, Insomnia lub `curl`:**
        Przykład użycia `curl` do testowania endpointu `/api/amazon/categories`:
        ```bash
        curl -H "X-API-Key: twoj_merchbot_api_key" https://twoja-nazwa-projektu.vercel.app/api/amazon/categories
        ```
        Przykład dla `/api/amazon/bestsellers` z parametrami:
        ```bash
        curl -H "X-API-Key: twoj_merchbot_api_key" "https://twoja-nazwa-projektu.vercel.app/api/amazon/bestsellers?category=T-Shirts&limit=5"
        ```
        Przykład dla `/api/amazon/product/[asin]`:
        ```bash
        curl -H "X-API-Key: twoj_merchbot_api_key" https://twoja-nazwa-projektu.vercel.app/api/amazon/product/B0EXAMPLEASIN
        ```
    *   Sprawdź, czy odpowiedzi JSON są zgodne z oczekiwaniami (zarówno dla sukcesu, jak i dla błędów, np. podając zły klucz API).

### Krok 7: Dostęp do Logów (Debugging)

Jeśli napotkasz problemy lub chcesz monitorować działanie swoich funkcji API:

1.  Przejdź do panelu swojego projektu na Vercel.com.
2.  Wybierz zakładkę **"Logs"** lub **"Functions"**.
    *   W sekcji "Functions" możesz wybrać konkretną funkcję API (np. `/api/amazon/bestsellers`).
    *   Zobaczysz tam logi czasu rzeczywistego (real-time logs) oraz logi historyczne.
    *   Wszelkie wywołania `console.log()`, `console.error()` z Twojego kodu API będą tutaj widoczne, jak również informacje o błędach wykonania funkcji.

---

Pamiętaj, aby zawsze dbać o bezpieczeństwo swoich kluczy API i zmiennych środowiskowych. Regularnie monitoruj logi i status swoich wdrożeń. Powodzenia!
