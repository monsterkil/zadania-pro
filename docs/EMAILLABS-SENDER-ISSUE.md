# Opis problemu: „Sender address is not valid” w EmailLabs API

**Rozwiązanie (2025-02):** API EmailLabs `new_sendmail` wymaga **`application/x-www-form-urlencoded`**, nie JSON. Wysłanie body jako JSON powodowało, że serwer nie parsował pól (m.in. `from`) i zwracał „Sender address is not valid”. W kodzie (`lib/email.js`) zmieniono na `Content-Type: application/x-www-form-urlencoded` i body jako `URLSearchParams`.

---

## Co się działo (krótko)

Aplikacja wysyła maile przez API EmailLabs (`new_sendmail`). API zwraca **HTTP 500** z komunikatem **„Sender address is not valid”**, mimo że:
- używany adres nadawcy (**sklep@biostima.pl**) działa w **innej aplikacji** z tym samym kontem EmailLabs,
- domena **biostima.pl** ma w panelu EmailLabs status **Accepted** w Autoryzacji nadawcy,
- konto SMTP **1.biostima.smtp** jest poprawne i używane także w działającej aplikacji.

---

## Co dokładnie robi aplikacja

1. Użytkownik dodaje zadanie w aplikacji (np. Zadania Pro na Vercel).
2. Backend wywołuje **POST** na `https://api.emaillabs.net.pl/api/new_sendmail`.
3. W body żądania wysyła m.in.:
   - **from:** `sklep@biostima.pl` (z zmiennej środowiskowej EMAIL_FROM),
   - **from_name:** np. „Zadania Pro”,
   - **smtp_account:** `1.biostima.smtp`,
   - **to:** adresy odbiorców,
   - **subject**, **html**, **text**.
4. Autoryzacja: **Basic Auth** (Base64 z `AppKey:SecretKey` z panelu EmailLabs).
5. Odpowiedź API: **HTTP 500**, body np.:
   ```json
   {
     "code": 500,
     "status": "fail",
     "message": "Sender address is not valid",
     "data": "",
     "req_id": "G8jkW3LXhf"
   }
   ```

---

## Co jest już sprawdzone po stronie klienta

- **Adres nadawcy:** `sklep@biostima.pl` – ten sam, z którego w **innej aplikacji** maile wychodzą poprawnie (ta sama domena, to samo konto SMTP w EmailLabs).
- **Konto SMTP:** `1.biostima.smtp` – poprawne, używane także w działającej aplikacji.
- **Autoryzacja domeny w panelu EmailLabs:**
  - Domena **biostima.pl** dodana w **Autoryzacja nadawcy**,
  - Wybrane subkonto: **1.biostima.smtp**,
  - Wszystkie 4 rekordy DNS (DKIM, Return Path, Tracking, DMARC) mają status **Accepted**.
- **Zmienne w Vercel:** brak spacji, wartości zgodne z działającą aplikacją (EMAILLABS_APP_KEY, EMAILLABS_SECRET_KEY, EMAILLABS_SMTP_ACCOUNT, EMAIL_FROM).
- W logach widać dokładnie wysyłane wartości: `from=sklep@biostima.pl`, `smtp_account=1.biostima.smtp`.

---

## Czego nie wiadomo / o co trzeba doprecyzować

- Czy dla **tego samego** adresu (`sklep@biostima.pl`) i konta (`1.biostima.smtp`) API może zwracać „Sender address is not valid” w zależności od **aplikacji** (App Key / Secret Key)?
- Czy po stronie EmailLabs jest **osobna lista dozwolonych nadawców** lub dodatkowa weryfikacja (np. per App Key), która mogłaby blokować ten adres tylko dla jednej z aplikacji?
- Czy **stary** endpoint `api.emaillabs.net.pl` i **nowy** panel (newpanel) używają tej samej logiki weryfikacji nadawcy – i czy autoryzacja zrobiona w jednym panelu obowiązuje przy wywołaniach do `api.emaillabs.net.pl`?

---

## O co konkretnie pytać w EmailLabs (np. bok@emaillabs.pl)

Można wysłać wiadomość w poniższej formie (skopiować i ewentualnie uzupełnić):

---

**Temat:** API zwraca „Sender address is not valid” mimo zweryfikowanej domeny i działającego adresu w innej aplikacji

**Treść:**

Dzień dobry,

Wysyłam maile przez API EmailLabs (endpoint **POST** `https://api.emaillabs.net.pl/api/new_sendmail`). Przy części wywołań otrzymuję odpowiedź **HTTP 500** z komunikatem **„Sender address is not valid”**.

**Parametry żądania:**
- **from:** sklep@biostima.pl  
- **from_name:** np. Zadania Pro  
- **smtp_account:** 1.biostima.smtp  
- Autoryzacja: Basic (App Key + Secret Key z panelu)

**Stan po stronie panelu EmailLabs:**
- Domena **biostima.pl** jest dodana w **Autoryzacja nadawcy** i przypisana do subkonta **1.biostima.smtp**.
- Wszystkie rekordy DNS (DKIM, Return Path, Tracking, DMARC) mają status **Accepted**.
- Z adresu **sklep@biostima.pl** i konta **1.biostima.smtp** maile wychodzą poprawnie z **innej** aplikacji (te same dane: App Key, Secret Key, smtp_account, from).

**Przykładowy req_id z błędu:** G8jkW3LXhf (lub aktualny z logów).

**Pytania:**
1. Dlaczego dla tego samego adresu nadawcy (sklep@biostima.pl) i tego samego konta SMTP (1.biostima.smtp) API w jednej aplikacji akceptuje wysyłkę, a w drugiej zwraca „Sender address is not valid”?
2. Czy weryfikacja nadawcy zależy od App Key / „aplikacji” w panelu (np. czy trzeba osobno coś dodać/zweryfikować dla tej drugiej aplikacji)?
3. Czy autoryzacja domeny wykonana w panelu (stary lub nowy) w pełni obowiązuje przy wywołaniach do `api.emaillabs.net.pl`?

Proszę o wskazanie, co po stronie konfiguracji panelu lub API należy zmienić, żeby wysyłka z **sklep@biostima.pl** działała także z tej drugiej aplikacji.

Z góry dziękuję,  
[Twoje imię / firma]

---

## Pliki / miejsce w kodzie

- Wysyłka maila: `lib/email.js` (funkcja `sendEmail`, wywołanie `new_sendmail`).
- Wywołanie przy dodaniu zadania: `app/api/tasks/route.js` (np. `notifyNewTask`).

Po rozwiązaniu problemu ten plik można zostawić jako dokumentację incydentu lub usunąć.
