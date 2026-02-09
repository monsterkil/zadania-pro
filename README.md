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

### 6. Utwórz tabele w bazie

Aby utworzyć tabele, uruchom jednorazowo:

```bash
npm run db:push
```

Lub uruchom seed (tworzy tabele + przykładowe dane):

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

## Konfiguracja EmailLabs

1. Zaloguj się na [panel.emaillabs.net.pl](https://panel.emaillabs.net.pl)
2. Przejdź do **Ustawienia** → **API**
3. Skopiuj **App Key** i **Secret Key**
4. Nazwa konta SMTP znajdziesz w **Konta SMTP** (np. `1.biostima.smtp`)
5. Upewnij się, że domena `biostima.pl` jest dodana i zweryfikowana

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
