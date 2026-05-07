from sqlalchemy import Column, Integer, String, Float, Text, JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Place(Base):
    __tablename__ = "places"

    id                 = Column(Integer, primary_key=True, index=True)
    place_name         = Column(String(255), nullable=False, index=True)
    country_name       = Column(String(255), nullable=True)
    district           = Column(String(255), nullable=True)
    state              = Column(String(255), nullable=True)
    continent          = Column(String(100), nullable=True)
    latitude           = Column(Float, nullable=True)
    longitude          = Column(Float, nullable=True)
    population         = Column(String(100), nullable=True)
    language           = Column(String(255), nullable=True)
    currency           = Column(String(100), nullable=True)
    timezone           = Column(String(100), nullable=True)
    description        = Column(Text, nullable=True)
    famous_for         = Column(Text, nullable=True)
    best_time_to_visit = Column(String(255), nullable=True)
    famous_foods       = Column(JSON, nullable=True)   # list of {name, description, image_url}
    souvenirs          = Column(JSON, nullable=True)   # list of {name, description, image_url}
    hero_images        = Column(JSON, nullable=True)   # list of image URLs for hero carousel
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    hotels       = relationship("Hotel",      back_populates="place", cascade="all, delete-orphan")
    nearby_areas = relationship("NearbyArea", back_populates="place", cascade="all, delete-orphan")
    attractions  = relationship("Attraction", back_populates="place", cascade="all, delete-orphan")
    restaurants  = relationship("Restaurant", back_populates="place", cascade="all, delete-orphan")
    transport    = relationship("Transport",  back_populates="place", cascade="all, delete-orphan")


class Hotel(Base):
    __tablename__ = "hotels"

    id          = Column(Integer, primary_key=True, index=True)
    place_id    = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    star_rating = Column(Integer, nullable=True)
    price_range = Column(String(255), nullable=True)
    address     = Column(String(500), nullable=True)
    amenities   = Column(JSON, nullable=True)   # list of strings
    image_url   = Column(Text, nullable=True)

    place = relationship("Place", back_populates="hotels")


class NearbyArea(Base):
    __tablename__ = "nearby_areas"

    id          = Column(Integer, primary_key=True, index=True)
    place_id    = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    distance_km = Column(Float, nullable=True)

    place = relationship("Place", back_populates="nearby_areas")


class Attraction(Base):
    __tablename__ = "attractions"

    id          = Column(Integer, primary_key=True, index=True)
    place_id    = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    type        = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    entry_fee   = Column(String(100), nullable=True)
    image_url   = Column(Text, nullable=True)

    place = relationship("Place", back_populates="attractions")


class Restaurant(Base):
    __tablename__ = "restaurants"

    id          = Column(Integer, primary_key=True, index=True)
    place_id    = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    name        = Column(String(255), nullable=False)
    cuisine     = Column(String(255), nullable=True)
    price_range = Column(String(100), nullable=True)
    address     = Column(String(500), nullable=True)
    image_url   = Column(Text, nullable=True)

    place = relationship("Place", back_populates="restaurants")


class Transport(Base):
    __tablename__ = "transport"

    id            = Column(Integer, primary_key=True, index=True)
    place_id      = Column(Integer, ForeignKey("places.id", ondelete="CASCADE"), nullable=False)
    mode          = Column(String(100), nullable=False)
    details       = Column(Text, nullable=True)
    cost_estimate = Column(String(255), nullable=True)

    place = relationship("Place", back_populates="transport")
