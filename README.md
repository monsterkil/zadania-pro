# Zadania Pro

System zarządzania zadaniami z widokiem Kanban, wycenami, uploadem plików i powiadomieniami email.

## Stack

- **Next.js 14** (App Router)
- **Vercel Postgres** (Neon) — baza danych
- **Vercel Blob** — upload plików (max 30 MB)
- **EmailLabs** — powiadomienia email
- **Tailwind CSS** — stylowanie
- **Drizzle ORM** — warstwa bazodanowa

## Szybki start (deploy na Vercel)

### 1. Przygotowanie repozytorium

```bash
git init
git add .
git commit -m "Initial commit"
```

Wrzuć na GitHub (publiczne lub prywatne repo).

### 2. Deploy na Vercel

1. Przejdź na [vercel.com](https://vercel.com) i kliknij **"New Project"**
2. Zaimportuj swoje repozytorium z GitHub
3. Vercel automatycznie wykryje Next.js

### 3. Dodaj Vercel Postgres

1. W dashboardzie projektu → **Storage** → **Create Database** → **Postgres**
2. Vercel automatycznie doda zmienne `POSTGRES_URL` itp.

### 4. Dodaj Vercel Blob

1. **Storage** → **Create Store** → **Blob**
2. Vercel automatycznie doda `BLOB_READ_WRITE_TOKEN`

### 5. Skonfiguruj zmienne środowiskowe

W Vercel → **Settings** → **Environment Variables** dodaj:

| Zmienna | Wartość |
|---------|---------|
| `ADMIN_PASSWORD` | Twoje hasło admina |
| `COLLABORATOR_PASSWORD` | Hasło współpracownika |
| `CLIENT_PASSWORD` | Hasło klienta |
| `JWT_SECRET` | Losowy ciąg znaków (min 32 znaki) |
| `EMAILLABS_APP_KEY` | Klucz API z EmailLabs |
| `EMAILLABS_SECRET_KEY` | Secret z EmailLabs |
| `EMAILLABS_SMTP_ACCOUNT` | Nazwa konta SMTP (np. `1.biostima.smtp`) |
| `EMAIL_FROM` | `zadania@biostima.pl` |
| `EMAIL_FROM_NAME` | `Zadania Pro` |
| `NEXT_PUBLIC_APP_URL` | `https://twoja-subdomena.vercel.app` |

### 6. Utwórz tabele w bazie (Neon)

**Jednorazowo** musisz utworzyć tabele w tej samej bazie Neon, której używa Vercel:

1. W Vercel → **Settings** → **Environment Variables** skopiuj wartość **`POSTGRES_URL`** lub **`DATABASE_URL`** (z integracji Neon).
2. Lokalnie w projekcie utwórz plik **`.env.local`** (jeśli go nie ma) i wklej:
   ```env
   POSTGRES_URL=postgresql://...   # wklej skopiowany URL
   ```
   (Możesz dodać też inne zmienne z `.env.local.example`.)
3. W katalogu projektu uruchom:
   ```bash
   npm install
   npm run db:push
   ```
   To utworzy tabele `tasks`, `task_files`, `comments` w Twojej bazie Neon. Po tym deploy na Vercel będzie mógł dodawać zadania.

Opcjonalnie — seed (przykładowe dane):

```bash
npm run db:seed
```

### 7. Redeploy

Po ustawieniu zmiennych, kliknij **Redeploy** w Vercel.

## Struktura emaili

| Zdarzenie | Odbiorcy | Zmienne env |
|-----------|----------|-------------|
| Nowe zadanie | damian@biostima.pl, sklep@biostima.pl | `EMAIL_NEW_TASK_TO` |
| W realizacji (z terminem) | biuro@biostima.pl | `EMAIL_STATUS_CHANGE_TO` |
| Ukończone | biuro@biostima.pl | `EMAIL_STATUS_CHANGE_TO` |

## Konfiguracja EmailLabs (klucze API)

1. Zaloguj się na [panel.emaillabs.net.pl](https://panel.emaillabs.net.pl)
2. Przejdź do **Ustawienia** → **API**
3. Skopiuj **App Key** i **Secret Key** → ustaw w Vercel jako `EMAILLABS_APP_KEY`, `EMAILLABS_SECRET_KEY`
4. W **Konta SMTP** znajdź nazwę konta (np. `1.biostima.smtp`) → ustaw w Vercel jako `EMAILLABS_SMTP_ACCOUNT`

## Autoryzacja nadawcy (EMAIL_FROM) — dlaczego „Sender address is not valid”

EmailLabs wymaga **autoryzacji domeny**, z której wysyłasz maile. Bez tego API zwraca błąd „Sender address is not valid”.

### Kroki w panelu EmailLabs (stary panel: emaillabs.net.pl)

1. Zaloguj się do panelu EmailLabs.
2. Z lewego menu wybierz **Administrator** → **Autoryzacja nadawcy**.
3. Po prawej stronie kliknij **„Dodaj domenę”**.
4. **Wybierz subkonto (konto SMTP)** — to samo, którego nazwę podałeś w `EMAILLABS_SMTP_ACCOUNT` (np. konto odpowiadające `1.biostima.smtp`).
5. W polu **„Domena From”** wpisz **domenę** z adresu `EMAIL_FROM`:
   - jeśli masz `EMAIL_FROM=zadania@biostima.pl`, wpisz: **`biostima.pl`**
   - tylko domena, bez `http://`, bez `www`, bez adresu e-mail.
6. W ustawieniach zaawansowanych w polu **„Selektor DKIM”** wpisz krótką etykietę (max 7 znaków, np. `pl` lub `elabs`).
7. Kliknij **„Zapisz”**. Panel wygeneruje **kilka rekordów DNS** (CNAME itd.).
8. W panelu **DNS u swojego hostingu** (gdzie zarządzasz domeną, np. biostima.pl) dodaj **dokładnie** te rekordy, które pokazał EmailLabs (typ, nazwa, wartość). Każdy hosting ma inny interfejs — szukaj sekcji „DNS”, „Rekordy DNS”, „Zarządzaj domeną”.
9. Poczekaj na **propagację DNS** (zazwyczaj 15 minut – 24 godziny).
10. Wróć do EmailLabs, w sekcji Autoryzacja nadawcy przy swojej domenie kliknij **„Check”**. Status powinien zmienić się na **„Accepted”**.
11. Gdy status = **Accepted**, możesz wysyłać maile z **dowolnego adresu** na tej domenie, np. `zadania@biostima.pl`, `noreply@biostima.pl`.

### Uwagi

- **EMAIL_FROM** w Vercel musi być w formacie `cokolwiek@twoja-zweryfikowana-domena.pl` (np. `zadania@biostima.pl`). Domena po `@` musi być tą samą, którą zautoryzowałeś w kroku 5.
- Jeśli konto EmailLabs zostało utworzone **przed 30.01.2024**, po dodaniu rekordów DNS wyślij mail do **bok@emaillabs.pl**, że dokończyłeś autoryzację — wtedy przełączą wysyłki na nowy system.
- Pełna dokumentacja: [Autoryzacja nadawcy – EmailLabs](https://docs.emaillabs.io/panel-analityczny/administrator/autoryzacja-nadawcy/autoryzacja-domeny-from-konfigurator)

### Nadal „Sender address is not valid” mimo Accepted?

1. **Sprawdź, co faktycznie idzie do API**  
   Vercel → **wybierz projekt** (kliknij nazwę projektu) → u góry kliknij zakładkę **„Logs”** (obok Deployments, Settings). W lewym panelu ustaw filtr **Request Path** → wpisz `api/tasks` albo **Request Method** → `POST`. Kliknij wiersz z wywołaniem POST do `/api/tasks` i w dolnej części zobacz **Log Message** — szukaj linii:  
   `[EmailLabs] Odrzucono nadawcę. Wysłano: from=... smtp_account=...`  
   Upewnij się, że `from` i `smtp_account` są **dokładnie** takie jak w Environment Variables (bez spacji na początku/końcu).

2. **Użyj tego samego adresu co w działającej aplikacji**  
   Jeśli w innej aplikacji maile z EmailLabs działają, ustaw w Vercel **`EMAIL_FROM`** na **ten sam adres** (np. `biuro@biostima.pl`).

3. **Dwa panele EmailLabs**  
   Są panel stary (emaillabs.net.pl) i nowy (newpanel.emaillabs.io). Klucze API i autoryzacja mogą być przypisane do jednego z nich. Upewnij się, że klucze (`EMAILLABS_APP_KEY`, `EMAILLABS_SECRET_KEY`) są z tego samego panelu, w którym zrobiłeś autoryzację domeny dla konta `1.biostima.smtp`.

4. **Kontakt z EmailLabs**  
   Jeśli domena ma status **Accepted** i `EMAIL_FROM` jest w formacie `xxx@biostima.pl`, napisz do **bok@emaillabs.pl**: opisz błąd „Sender address is not valid”, podaj adres `from` i `smtp_account` (np. `1.biostima.smtp`) oraz że rekordy DNS są Accepted — poproś o sprawdzenie po stronie API.

## Role użytkowników

| Rola | Uprawnienia |
|------|-------------|
| **Admin** | Pełne — dodaje, edytuje, przenosi, wycenia, usuwa |
| **Współpracownik** | Dodaje, edytuje, przenosi, wycenia |
| **Klient** | Dodaje zadania, akceptuje/odrzuca wyceny, komentuje |

## Lokalny development

```bash
cp .env.local.example .env.local
# Uzupełnij zmienne w .env.local
npm install
npm run db:push
npm run dev
```

Aplikacja dostępna na `http://localhost:3000`
