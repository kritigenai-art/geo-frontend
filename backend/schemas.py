from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class HotelSchema(BaseModel):
    id: int
    place_id: int
    name: str
    star_rating: Optional[int]
    price_range: Optional[str]
    address: Optional[str]
    amenities: Optional[List[str]]

    class Config:
        from_attributes = True


class NearbyAreaSchema(BaseModel):
    id: int
    place_id: int
    name: str
    distance_km: Optional[float]

    class Config:
        from_attributes = True


class AttractionSchema(BaseModel):
    id: int
    place_id: int
    name: str
    type: Optional[str]
    description: Optional[str]
    entry_fee: Optional[str]

    class Config:
        from_attributes = True


class RestaurantSchema(BaseModel):
    id: int
    place_id: int
    name: str
    cuisine: Optional[str]
    price_range: Optional[str]
    address: Optional[str]

    class Config:
        from_attributes = True


class TransportSchema(BaseModel):
    id: int
    place_id: int
    mode: str
    details: Optional[str]
    cost_estimate: Optional[str]

    class Config:
        from_attributes = True


class PlaceResponse(BaseModel):
    id: int
    place_name: str
    country_name: Optional[str]
    district: Optional[str]
    state: Optional[str]
    continent: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    population: Optional[str]
    language: Optional[str]
    currency: Optional[str]
    timezone: Optional[str]
    description: Optional[str]
    famous_for: Optional[str]
    best_time_to_visit: Optional[str]
    famous_foods: Optional[List[Any]] = []
    souvenirs: Optional[List[Any]] = []
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    hotels: List[HotelSchema] = []
    nearby_areas: List[NearbyAreaSchema] = []
    attractions: List[AttractionSchema] = []
    restaurants: List[RestaurantSchema] = []
    transport: List[TransportSchema] = []

    class Config:
        from_attributes = True


class SearchRequest(BaseModel):
    place: str
