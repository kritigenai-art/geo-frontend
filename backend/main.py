import re
import json
import os
from html import escape as he
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import engine, get_db
import models
import schemas
from openai_service import fetch_place_data_from_openai, get_client

# Root of the repo  (backend/ → parent = geo-frontend/)
_ROOT = Path(__file__).parent.parent


def _get_index_html() -> str:
    """
    Return the correct index.html:
    - Production  → read dist/index.html (built, no preamble needed)
    - Development → fetch from Vite dev server so Vite injects its React-refresh
      preamble (<script>window.__vite_plugin_react_preamble_installed__</script>).
      Without this, @vitejs/plugin-react throws "can't detect preamble" and the
      app renders blank.
    """
    # Production build takes priority
    dist = _ROOT / "dist" / "index.html"
    if dist.exists():
        return dist.read_text(encoding="utf-8")

    # Development: ask Vite for the processed HTML so the preamble is included
    import urllib.request
    try:
        with urllib.request.urlopen("http://localhost:5173/", timeout=3) as r:
            return r.read().decode("utf-8")
    except Exception:
        pass

    # Last resort: raw file (preamble missing — will show blank in dev, but at
    # least won't crash the server)
    raw = _ROOT / "index.html"
    if raw.exists():
        return raw.read_text(encoding="utf-8")

    return "<html><body>GlideMyWay</body></html>"


def _inject_seo(html: str, place: models.Place) -> str:
    """Replace every SEO placeholder in index.html with real destination data."""
    pname   = place.place_name or ""
    state   = place.state or ""
    country = place.country_name or ""
    famous  = place.famous_for or ""
    lat     = place.latitude or 0.0
    lng     = place.longitude or 0.0

    # Avoid "Kerala, Kerala, India" — skip state when it equals place name
    state_label = "" if state.lower() == pname.lower() else state

    title = (
        pname
        + (f", {state_label}" if state_label else "")
        + (f", {country}"     if country     else "")
        + " — Travel Guide | GlideMyWay"
    )
    desc = (
        f"Plan your trip to {pname}. "
        + (f"Famous for {famous}. " if famous else "")
        + "Explore top attractions, hotels, restaurants, local foods and get a "
          "complete AI-powered travel guide — GlideMyWay."
    )
    keywords = (
        f"{pname} travel guide, {pname} tourism, things to do in {pname}, "
        f"{pname} hotels, {pname} restaurants, visit {pname} 2026"
        + (f", {country} travel" if country else "")
    )

    # Build canonical URL
    slug_parts = [pname] + ([state_label] if state_label else []) + ([country] if country else [])
    slug     = "_".join(p.strip().replace(" ", "_") for p in slug_parts)
    page_url = f"https://www.glidemyway.com/Tourism-{slug}-Tourism"
    image    = "https://www.glidemyway.com/og-cover.jpg"

    # Attractions for JSON-LD
    attractions_ld = [
        {"@type": "TouristAttraction", "name": a.name, "description": a.description or ""}
        for a in (place.attractions or [])[:6]
    ]

    # Hotels for JSON-LD
    hotels_ld = [
        {
            "@type": "LodgingBusiness",
            "name": h.name,
            "starRating": {"@type": "Rating", "ratingValue": str(h.star_rating or "")},
            "priceRange": h.price_range or "",
        }
        for h in (place.hotels or [])[:6]
    ]

    # Destination JSON-LD
    dest_ld = {
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        "@id": f"{page_url}#destination",
        "name": pname,
        "description": desc,
        "url": page_url,
        "image": {"@type": "ImageObject", "url": image, "width": 1200, "height": 630},
        "geo": {"@type": "GeoCoordinates", "latitude": lat, "longitude": lng},
        "containedInPlace": [
            p for p in [
                ({"@type": "AdministrativeArea", "name": state_label} if state_label else None),
                ({"@type": "Country",            "name": country}      if country     else None),
            ] if p
        ],
        "touristType": ["Leisure", "Business", "Sightseeing", "Adventure", "Culture"],
        "includesAttraction": attractions_ld,
        "amenityFeature":     hotels_ld,
    }

    # Breadcrumb JSON-LD
    bc_items = [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.glidemyway.com/"},
    ]
    if country:
        bc_items.append({
            "@type": "ListItem", "position": 2,
            "name": country,
            "item": f"https://www.glidemyway.com/Tourism-{country.replace(' ', '_')}-Tourism",
        })
    bc_items.append({"@type": "ListItem", "position": len(bc_items) + 1, "name": pname, "item": page_url})

    bc_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": bc_items}

    # Safe replacement helper — uses lambda so content is never interpreted as a regex
    def sub(pattern: str, value: str, text: str, flags: int = 0) -> str:
        v = he(value, quote=True)
        return re.sub(pattern, lambda m: m.group(1) + v + m.group(2), text, flags=flags)

    # Raw replacement (value already safe, e.g. URL or JSON string)
    def sub_raw(pattern: str, value: str, text: str, flags: int = 0) -> str:
        return re.sub(pattern, lambda m: m.group(1) + value + m.group(2), text, flags=flags)

    # <title>
    html = re.sub(r'<title>[^<]*</title>', lambda _: f'<title>{he(title)}</title>', html)

    # Primary meta tags
    html = sub(r'(<meta\s[^>]*name="title"[^>]*\scontent=")[^"]*(")',       title,    html)
    html = sub(r'(<meta\s[^>]*name="description"[^>]*\scontent=")[^"]*(")', desc,     html)
    html = sub(r'(<meta\s[^>]*name="keywords"[^>]*\scontent=")[^"]*(")',    keywords, html)

    # Geo
    html = sub(r'(<meta\s[^>]*name="geo\.placename"[^>]*\scontent=")[^"]*(")',
               f"{pname}{', ' + country if country else ''}", html)
    if lat and lng:
        html = sub_raw(r'(<meta\s[^>]*name="geo\.position"[^>]*\scontent=")[^"]*(")', f"{lat};{lng}",   html)
        html = sub_raw(r'(<meta\s[^>]*name="ICBM"[^>]*\scontent=")[^"]*(")',          f"{lat}, {lng}",  html)

    # Canonical
    html = sub_raw(r'(<link[^>]*id="canonical-link"[^>]*href=")[^"]*(")', page_url, html)

    # Open Graph (targeted by id)
    html = sub    (r'(<meta[^>]*id="og-title"[^>]*\scontent=")[^"]*(")',       title,    html)
    html = sub    (r'(<meta[^>]*id="og-description"[^>]*\scontent=")[^"]*(")', desc,     html)
    html = sub_raw(r'(<meta[^>]*id="og-url"[^>]*\scontent=")[^"]*(")',         page_url, html)
    html = sub_raw(r'(<meta[^>]*id="og-image"[^>]*\scontent=")[^"]*(")',       image,    html)

    # Twitter Card (targeted by id)
    html = sub    (r'(<meta[^>]*id="twitter-title"[^>]*\scontent=")[^"]*(")',       title, html)
    html = sub    (r'(<meta[^>]*id="twitter-description"[^>]*\scontent=")[^"]*(")', desc,  html)
    html = sub_raw(r'(<meta[^>]*id="twitter-image"[^>]*\scontent=")[^"]*(")',       image, html)

    # JSON-LD scripts (targeted by id)
    dest_json = json.dumps(dest_ld, indent=2)
    bc_json   = json.dumps(bc_ld,   indent=2)
    html = re.sub(
        r'(<script[^>]*id="json-ld-destination"[^>]*>)[\s\S]*?(</script>)',
        lambda m: m.group(1) + "\n" + dest_json + "\n" + m.group(2),
        html, flags=re.DOTALL,
    )
    html = re.sub(
        r'(<script[^>]*id="json-ld-breadcrumb"[^>]*>)[\s\S]*?(</script>)',
        lambda m: m.group(1) + "\n" + bc_json + "\n" + m.group(2),
        html, flags=re.DOTALL,
    )

    return html

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Geo Places API",
    description="""
## Geo Places API

Search any place and get comprehensive travel data powered by **Azure OpenAI**.
Data is stored in **6 normalized PostgreSQL tables**.

### Tables
- **places** — core place info (name, country, district, state, coordinates, etc.)
- **hotels** — hotels with star rating, price range, amenities
- **nearby_areas** — surrounding towns/cities with distances
- **attractions** — tourist spots with type and entry fee
- **restaurants** — dining options with cuisine and price range
- **transport** — transport modes with cost estimates
    """,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _save_place(ai_data: dict, db: Session, place_name: str) -> models.Place:
    """Create Place + all related rows from AI JSON."""
    place = models.Place(
        place_name         = place_name,  # Always use the original search query so DB lookups match
        country_name       = ai_data.get("country_name"),
        district           = ai_data.get("district"),
        state              = ai_data.get("state"),
        continent          = ai_data.get("continent"),
        latitude           = ai_data.get("latitude"),
        longitude          = ai_data.get("longitude"),
        population         = ai_data.get("population"),
        language           = ai_data.get("language"),
        currency           = ai_data.get("currency"),
        timezone           = ai_data.get("timezone"),
        description        = ai_data.get("description"),
        famous_for         = ai_data.get("famous_for"),
        best_time_to_visit = ai_data.get("best_time_to_visit"),
        famous_foods       = ai_data.get("famous_foods", []),
        souvenirs          = ai_data.get("souvenirs", []),
    )
    db.add(place)
    db.flush()  # get place.id before inserting children

    for h in ai_data.get("hotels", []):
        db.add(models.Hotel(
            place_id    = place.id,
            name        = h.get("name"),
            star_rating = h.get("star_rating"),
            price_range = h.get("price_range"),
            address     = h.get("address"),
            amenities   = h.get("amenities", []),
        ))

    for n in ai_data.get("nearby_areas", []):
        db.add(models.NearbyArea(
            place_id    = place.id,
            name        = n.get("name"),
            distance_km = n.get("distance_km"),
        ))

    for a in ai_data.get("attractions", []):
        db.add(models.Attraction(
            place_id    = place.id,
            name        = a.get("name"),
            type        = a.get("type"),
            description = a.get("description"),
            entry_fee   = a.get("entry_fee"),
        ))

    for r in ai_data.get("restaurants", []):
        db.add(models.Restaurant(
            place_id    = place.id,
            name        = r.get("name"),
            cuisine     = r.get("cuisine"),
            price_range = r.get("price_range"),
            address     = r.get("address"),
        ))

    for t in ai_data.get("transport", []):
        db.add(models.Transport(
            place_id      = place.id,
            mode          = t.get("mode"),
            details       = t.get("details"),
            cost_estimate = t.get("cost_estimate"),
        ))

    db.commit()
    db.refresh(place)
    return place


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Geo Places API is running"}


# ── Search a place ────────────────────────────────────────────────────────────
@app.post(
    "/api/places/search",
    response_model=schemas.PlaceResponse,
    tags=["Places"],
    summary="Search a place",
    description="Returns cached data from DB if available; otherwise fetches from Azure OpenAI, saves to 6 PostgreSQL tables, then returns the result.",
)
def search_place(request: schemas.SearchRequest, db: Session = Depends(get_db)):
    place_query = request.place.strip()
    if not place_query:
        raise HTTPException(status_code=400, detail="Place name cannot be empty")

    existing = (
        db.query(models.Place)
        .filter(func.lower(models.Place.place_name) == place_query.lower())
        .first()
    )
    if existing:
        return existing

    try:
        ai_data = fetch_place_data_from_openai(place_query)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Azure OpenAI error: {str(e)}")

    return _save_place(ai_data, db, place_query)


# ── List all places ───────────────────────────────────────────────────────────
@app.get(
    "/api/places",
    response_model=List[schemas.PlaceResponse],
    tags=["Places"],
    summary="List all cached places",
)
def list_places(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.Place).offset(skip).limit(limit).all()


# ── Get place by ID ───────────────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}",
    response_model=schemas.PlaceResponse,
    tags=["Places"],
    summary="Get place by ID",
)
def get_place(place_id: int, db: Session = Depends(get_db)):
    place = db.query(models.Place).filter(models.Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


# ── Delete place ──────────────────────────────────────────────────────────────
@app.delete("/api/places/{place_id}", tags=["Places"], summary="Delete a place")
def delete_place(place_id: int, db: Session = Depends(get_db)):
    place = db.query(models.Place).filter(models.Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    db.delete(place)
    db.commit()
    return {"message": f"Place '{place.place_name}' and all related data deleted"}


# ── Refresh place data ────────────────────────────────────────────────────────
@app.put(
    "/api/places/{place_id}/refresh",
    response_model=schemas.PlaceResponse,
    tags=["Places"],
    summary="Refresh place data from Azure OpenAI",
)
def refresh_place(place_id: int, db: Session = Depends(get_db)):
    place = db.query(models.Place).filter(models.Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    try:
        ai_data = fetch_place_data_from_openai(place.place_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Azure OpenAI error: {str(e)}")

    db.delete(place)
    db.commit()
    return _save_place(ai_data, db, place.place_name)


# ── Hotels for a place ────────────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}/hotels",
    response_model=List[schemas.HotelSchema],
    tags=["Details"],
    summary="Get hotels for a place",
)
def get_hotels(place_id: int, db: Session = Depends(get_db)):
    return db.query(models.Hotel).filter(models.Hotel.place_id == place_id).all()


# ── Attractions for a place ───────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}/attractions",
    response_model=List[schemas.AttractionSchema],
    tags=["Details"],
    summary="Get attractions for a place",
)
def get_attractions(place_id: int, db: Session = Depends(get_db)):
    return db.query(models.Attraction).filter(models.Attraction.place_id == place_id).all()


# ── Restaurants for a place ───────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}/restaurants",
    response_model=List[schemas.RestaurantSchema],
    tags=["Details"],
    summary="Get restaurants for a place",
)
def get_restaurants(place_id: int, db: Session = Depends(get_db)):
    return db.query(models.Restaurant).filter(models.Restaurant.place_id == place_id).all()


# ── Nearby areas for a place ──────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}/nearby",
    response_model=List[schemas.NearbyAreaSchema],
    tags=["Details"],
    summary="Get nearby areas for a place",
)
def get_nearby(place_id: int, db: Session = Depends(get_db)):
    return db.query(models.NearbyArea).filter(models.NearbyArea.place_id == place_id).all()


# ── Transport for a place ─────────────────────────────────────────────────────
@app.get(
    "/api/places/{place_id}/transport",
    response_model=List[schemas.TransportSchema],
    tags=["Details"],
    summary="Get transport options for a place",
)
def get_transport(place_id: int, db: Session = Depends(get_db)):
    return db.query(models.Transport).filter(models.Transport.place_id == place_id).all()


# ── AI Trip Planner ───────────────────────────────────────────────────────────
class PlanRequest(BaseModel):
    place: str
    days: int = 3
    travelers: int = 2
    interests: list[str] = []

PLAN_PROMPT = """
You are an expert travel itinerary planner. Create a detailed {days}-day trip plan for "{place}" for {travelers} traveler(s).
Their interests: {interests}.

Return ONLY valid JSON — no markdown, no explanation.

{{
  "destination": "Full place name",
  "duration": "{days} days",
  "travelers": {travelers},
  "best_time": "Best season/months to visit",
  "total_budget_estimate": "Approximate total budget per person in local currency",
  "itinerary": [
    {{
      "day": 1,
      "title": "Day 1: Arrival & First Impressions",
      "theme": "Short theme (e.g. Heritage Walk)",
      "morning":   {{ "time": "8:00 AM – 12:00 PM", "activity": "What to do", "place": "Specific place name", "tip": "Practical tip" }},
      "afternoon": {{ "time": "12:00 PM – 5:00 PM",  "activity": "What to do", "place": "Specific place name", "tip": "Practical tip" }},
      "evening":   {{ "time": "5:00 PM – 10:00 PM",  "activity": "What to do", "place": "Specific place name", "tip": "Practical tip" }},
      "meals": {{ "breakfast": "Place name + dish", "lunch": "Place name + dish", "dinner": "Place name + dish" }},
      "daily_budget": "Approx cost per person"
    }}
  ],
  "travel_tips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"],
  "best_areas_to_stay": ["Area 1 — reason", "Area 2 — reason"],
  "packing_essentials": ["item 1", "item 2", "item 3"]
}}

Provide exactly {days} day objects in itinerary. Be specific, accurate, and practical.
"""

@app.post("/api/places/plan", tags=["Places"], summary="Generate AI trip itinerary")
def plan_trip(request: PlanRequest):
    interests_str = ", ".join(request.interests) if request.interests else "General sightseeing"
    prompt = PLAN_PROMPT.format(
        place=request.place,
        days=request.days,
        travelers=request.travelers,
        interests=interests_str,
    )
    client = get_client()
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": "You are a professional travel planner that returns structured JSON itineraries."},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


# ── Dynamic sitemap.xml ───────────────────────────────────────────────────────
@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(db: Session = Depends(get_db)):
    BASE = "https://www.glidemyway.com"

    def slug(p):
        parts = [x for x in [p.place_name, p.state, p.country_name] if x]
        return "_".join(part.strip().replace(" ", "_") for part in parts)

    places = db.query(models.Place).all()

    urls = [f"""  <url>
    <loc>{BASE}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>"""]

    for p in places:
        loc = f"{BASE}/Tourism-{slug(p)}-Tourism"
        updated = (p.updated_at or p.created_at)
        lastmod = f"\n    <lastmod>{updated.strftime('%Y-%m-%d')}</lastmod>" if updated else ""
        urls.append(f"""  <url>
    <loc>{he(loc)}</loc>{lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


# ── SSR-like page — pre-fills all SEO meta tags in HTML before sending ─────────
@app.get("/Tourism-{slug}-Tourism", include_in_schema=False)
def destination_page(slug: str, db: Session = Depends(get_db)):
    # First segment of slug is the place name (e.g. "Kerala_Kerala_India" → "Kerala")
    place_name = slug.split("_")[0].replace("-", " ")
    place = (
        db.query(models.Place)
        .filter(func.lower(models.Place.place_name) == place_name.lower())
        .first()
    )
    html = _get_index_html()
    if place:
        html = _inject_seo(html, place)
    return HTMLResponse(content=html, status_code=200)
