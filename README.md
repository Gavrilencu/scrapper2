# Scrapper Pro

Aplicație pentru extragere date din pagini web, inserare în baze de date Oracle și planificare job-uri cu notificări email.

## Funcționalități

- **Conexiuni baze de date** – Oracle (mai multe conexiuni)
- **Job-uri** – fiecare job are URL, conexiune asignată, programare (cron)
- **Analiză pagină** – scanare URL, detectare tabele/date, selectare ce se extrage și mapare coloane
- **Script inserare** – INSERT cu placeholdere `{{nume_coloană}}` pentru datele extrase
- **Script verificare** – înainte de inserare: dacă scriptul returnează un număr > 0 (ex: `SELECT COUNT(*) ...`), rândul nu se inserează (evită duplicate)
- **Email** – SMTP/Exchange (Outlook): notificări la succes și/sau la eroare, către destinatari configurabili
- **Scheduler** – job-urile active rulează conform expresiei cron

## Cerințe

- Node.js 18+
- Pentru Oracle: driver oracledb (inclus; mod thin nu necesită Oracle Client)
- Pentru scraping: Playwright (se instalează browsere la primul build)

## Instalare

```bash
npm install
npx playwright install chromium
npm run db:init
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000).

## Scripturi job

- **Verificare (înainte de inserare):** trebuie să returneze un rând cu o valoare numerică (ex: prima coloană). Dacă valoarea > 0, rândul nu se inserează. Exemplu:  
  `SELECT COUNT(*) AS cnt FROM mytable WHERE cod = '{{cod}}'`

- **Inserare:** folosește `{{nume_coloană}}` pentru valorile extrase. Exemplu:  
  `INSERT INTO mytable (cod, denumire) VALUES ('{{cod}}', '{{denumire}}')`

## Programare (cron)

Exemple: `0 * * * *` = la fiecare oră; `0 9 * * *` = zilnic la 9:00; `*/15 * * * *` = la 15 minute.

## Date aplicație

Baza SQLite a aplicației (conexiuni, job-uri, rulări) este în `data/scrapper.db`.
