# Scrapper Pro (Python)

Aceeași aplicație Scrapper Pro rescrisă în Python: extragere date din pagini web, inserare în Oracle, job-uri planificate (cron) și notificări email.

## Stack

- **Backend:** FastAPI
- **Baza de date (app):** SQLite (`data/scrapper.db`)
- **Baza țintă:** Oracle (oracledb)
- **Scraping:** Playwright (Chromium)
- **Planificare:** APScheduler (cron)
- **Frontend:** Jinja2 + CSS (același look ca varianta Next.js)

## Cerințe

- Python 3.11 sau 3.12 (recomandat pentru wheel-uri precompilate; pe Python 3.14 poate fi nevoie de Microsoft C++ Build Tools pentru oracledb/playwright)
- Pentru Oracle: driver `oracledb` (mod thin, fără Oracle Client)
- Playwright: după `pip install` rulați `playwright install chromium`

## Rulare pe server Linux (fără interfață grafică)

Aplicația folosește Playwright în mod **headless** (fără display). Pe un server Linux fără GUI:

```bash
pip install -r requirements.txt
playwright install chromium
# Instalare dependențe de sistem pentru Chromium headless (libs, fonts etc.):
playwright install-deps chromium
```

Apoi porniți aplicația ca de obicei (ex. `uvicorn app.main:app --host 0.0.0.0 --port 8000`). Chromium rulează cu `--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage` etc., potrivit pentru mediu server.

## Instalare

```bash
cd python
python -m venv venv
venv\Scripts\activate   # Windows
# sau: source venv/bin/activate   # Linux/macOS

pip install -r requirements.txt
playwright install chromium
python -c "from app.database import init_db; init_db(); print('DB OK')"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Deschide [http://localhost:8000](http://localhost:8000).

La prima accesare se deschide **Configurare inițială** (utilizator + parolă admin). Apoi autentificare pe **Login**.

## Scripturi job (la fel ca în varianta Next.js)

- **Verificare (înainte de inserare):** trebuie să returneze un rând cu o valoare numerică. Dacă > 0, rândul nu se inserează.  
  Exemplu: `SELECT COUNT(*) AS cnt FROM mytable WHERE cod = '{{cod}}'`

- **Inserare:** folosește `{{nume_coloană}}`.  
  Exemplu: `INSERT INTO mytable (cod, denumire) VALUES ('{{cod}}', '{{denumire}}')`

## Programare (cron)

Exemple: `0 * * * *` = la fiecare oră; `0 9 * * *` = zilnic la 9:00; `*/15 * * * *` = la 15 minute.

## Structură

```
python/
  app/
    main.py           # FastAPI app, pagini (Jinja2)
    database.py       # SQLite, schema
    auth.py           # Hash parolă, sesiune (cookie HMAC)
    oracle_client.py  # Conexiune Oracle, run script, test
    scraper.py        # analyze_page, extract_with_config (Playwright)
    job_runner.py     # run_job: scrape → verify → insert → email
    scheduler.py      # APScheduler (cron)
    email_sender.py   # SMTP
    deps.py
    config.py
    routers/          # API: auth, connections, jobs, email-config, scrape, scheduler
    templates/        # Jinja2: dashboard, login, setup, connections, jobs, email, runs, documentatie, settings
    static/
      style.css
  data/               # creat la run; scrapper.db
  requirements.txt
```

## Variabilă de mediu

- `SESSION_SECRET` – secret pentru semnarea cookie-ului de sesiune (implicit: `scrapper-dev-secret`; în producție setați un secret puternic).
