# Geo Places Backend

Python FastAPI backend that uses OpenAI to fetch place data and stores it in PostgreSQL.
Swagger UI is available out-of-the-box at `http://localhost:8000/docs`.

## Stack
- **FastAPI** — API framework with auto Swagger UI
- **PostgreSQL** — database via SQLAlchemy ORM
- **OpenAI GPT-4o-mini** — AI data source
- **Uvicorn** — ASGI server

## Setup

### 1. PostgreSQL
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE geo_places_db;"
```

### 2. Environment variables
```bash
cp .env.example .env
# Edit .env and fill in your values:
#   OPENAI_API_KEY=sk-...
#   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/geo_places_db
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/health` | Health check |
| POST | `/api/places/search` | Search a place (OpenAI + cache) |
| GET | `/api/places` | List all cached places |
| GET | `/api/places/{id}` | Get place by ID |
| DELETE | `/api/places/{id}` | Delete a place |
| PUT | `/api/places/{id}/refresh` | Re-fetch from OpenAI |

## Swagger UI
Open `http://localhost:8000/docs` in your browser.

## Example Search Request
```bash
curl -X POST http://localhost:8000/api/places/search \
  -H "Content-Type: application/json" \
  -d '{"place": "Hyderabad"}'
```
