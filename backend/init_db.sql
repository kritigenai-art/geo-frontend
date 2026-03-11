-- Run this once to create the database
-- Connect to PostgreSQL as superuser first, then run:

CREATE DATABASE geo_places_db;

-- After connecting to geo_places_db, the table is auto-created by SQLAlchemy.
-- But if you want to create it manually:

CREATE TABLE IF NOT EXISTS places (
    id                  SERIAL PRIMARY KEY,
    place_name          VARCHAR(255) NOT NULL,
    country_name        VARCHAR(255),
    district            VARCHAR(255),
    state               VARCHAR(255),
    continent           VARCHAR(100),
    latitude            FLOAT,
    longitude           FLOAT,
    population          VARCHAR(100),
    language            VARCHAR(255),
    currency            VARCHAR(100),
    timezone            VARCHAR(100),
    description         TEXT,
    famous_for          TEXT,
    best_time_to_visit  VARCHAR(255),
    nearby_areas        JSONB,
    hotels              JSONB,
    attractions         JSONB,
    restaurants         JSONB,
    transport           JSONB,
    raw_ai_response     JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

-- Index for fast case-insensitive search
CREATE INDEX IF NOT EXISTS idx_places_name_lower ON places (LOWER(place_name));
