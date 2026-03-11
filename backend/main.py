from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import engine, get_db
import models
import schemas
from openai_service import fetch_place_data_from_openai

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
