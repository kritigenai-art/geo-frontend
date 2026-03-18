import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load variables from a .env file if one exists
load_dotenv()

# --- DATABASE CONFIGURATION ---
# We use os.getenv() to check for terminal exports first.
# If not found, it falls back to your specific AWS RDS details.

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "Kritigen1")
DB_HOST = os.getenv("DB_HOST", "database-1.ce1a8cws0zq4.us-east-1.rds.amazonaws.com")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

# Construct the SQLAlchemy Connection URL
# Format: postgresql+driver://user:password@host:port/dbname
# dev DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+pg8000://postgres:password@localhost:5432/geo_places_db")
DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create the Engine
# 'pool_pre_ping=True' is recommended for cloud DBs to handle dropped connections
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True
)

# Create Session and Base classes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get a database session in your FastAPI/Flask routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()