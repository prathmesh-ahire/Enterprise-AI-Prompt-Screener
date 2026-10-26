# Enterprise AI Prompt Screening System

A secure, self-hosted system that screens user prompts for sensitive data (PII, secrets,
org-confidential terms) and prompt-injection risk before they reach a local Ollama model,
with masking, human review, and audit logging built in.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)
- ~4GB free disk space for the Ollama model image

## Setup

1. Clone this repository.
2. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
3. Fill in `.env`:
   - `DB_PASSWORD` - any password for the local MySQL container
   - `JWT_SECRET` - a random 64-character string
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` - credentials for the seeded admin account
   - Leave `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `VITE_API_BASE_URL`, and the rest at their defaults unless you have a reason to change them.
4. Start everything:
   ```
   docker compose up --build
   ```
   This builds and starts 4 containers: `mysql`, `ollama`, `backend`, `frontend`.
5. In a second terminal, pull the model (one-time, ~2GB download):
   ```
   docker exec screener-ollama ollama pull llama3.2
   ```
   (or whichever model name you set as `OLLAMA_MODEL` in `.env`)
6. Open [http://localhost:5173](http://localhost:5173) - you should see the public Home page.
   Choose "Open the app" and sign in with the `ADMIN_USERNAME`/`ADMIN_PASSWORD` from your `.env`. The seeded admin
   holds both the `ADMIN` and `USER` roles, so it can submit prompts as well as administer.

## Pages

The interface is dark only.

**Public pages** (no sign-in, no API calls; they read a snapshot of the real screening pipeline that a
backend test keeps in step with the code):

| Page | Address |
|---|---|
| Home | `/` |
| How it works | `/how-it-works` |
| Detectors | `/detectors` |
| Examples | `/examples` |
| Evaluation | `/evaluation` |
| Limitations | `/limitations` |
| Architecture | `/architecture` |

**Sign-in pages:** `/login`, `/register`, `/forgot-password`, `/reset-password`.

**App pages** (sign in first; each role sees only the links it can open):

| Page | Address | Roles |
|---|---|---|
| Prompt | `/prompt` | User |
| History (prompts and audit trail) | `/history` | User |
| Review queue | `/review` | Reviewer, Admin |
| Admin dashboard | `/admin` | Admin |
| Policy | `/admin/policy` | Admin |
| Models | `/admin/models` | Admin |
| Audit log | `/admin/audit` | Admin |
| Reports | `/admin/reports` | Admin |

An address that is not a page shows a Not Found page. Swagger is available on a running instance at
[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).

### Upgrading a database created before V1.1

Fresh installs need nothing extra - Hibernate creates the unique constraint and the
indexes when it creates the tables. A database that already existed does **not** get them,
because `ddl-auto: update` adds new tables and columns but silently declines to add a
constraint or index to an existing one. Apply them once:

```
docker exec -i screener-mysql mysql -uroot -p"$DB_PASSWORD" screener_db \
  < backend/src/main/resources/schema-upgrade.sql
```

The script checks `information_schema` before each statement, so it is safe to re-run.

## Rebuilding after a code change

Both apps are built into their images; there is no bind mount. After editing backend or
frontend source, rebuild rather than restarting:

```
docker compose up --build -d
```

## Offline operation

Once the Ollama model has been pulled once, the whole stack (MySQL, Ollama, backend,
frontend) runs entirely on your machine with no internet connection required - prompt
screening and AI responses both happen locally.

## Project layout

- `backend/` - Spring Boot app (`src/main/java/com/screener/`: `controller`, `service`,
  `repository`, `model`, `dto`, `detection`, `config`)
- `frontend/` - React + TypeScript app (`src/pages/`, `src/components/`, `src/api/`)
- `database/schema.sql` - the 13 tables, structure only, exported from the running MySQL database. Hibernate creates the same tables on start; this is the reference copy
- `docker-compose.yml` - runs MySQL + Ollama + backend + frontend
- `.github/workflows/` - CI pipeline
