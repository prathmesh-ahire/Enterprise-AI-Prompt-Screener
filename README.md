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
6. Open [http://localhost:5173](http://localhost:5173) - you should see the login page.
   Log in with the `ADMIN_USERNAME`/`ADMIN_PASSWORD` from your `.env`.

## Offline operation

Once the Ollama model has been pulled once, the whole stack (MySQL, Ollama, backend,
frontend) runs entirely on your machine with no internet connection required - prompt
screening and AI responses both happen locally.

## Project layout

- `backend/` - Spring Boot app (`src/main/java/com/screener/`: `controller`, `service`,
  `repository`, `model`, `dto`, `detection`, `config`)
- `frontend/` - React + TypeScript app (`src/pages/`, `src/components/`, `src/api/`)
- `docker-compose.yml` - runs MySQL + Ollama + backend + frontend
- `.github/workflows/` - CI pipeline
