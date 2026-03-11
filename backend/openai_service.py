import os
import json
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY is not set in .env file")
        _client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=endpoint,
        )
    return _client


PROMPT_TEMPLATE = """
You are a travel data assistant. For the place "{place}", return a detailed JSON object with the following structure.
Return ONLY valid JSON — no markdown, no explanation, no code block.

{{
  "place_name": "Full official name of the place",
  "country_name": "Country it belongs to",
  "district": "District or county name",
  "state": "State or province name",
  "continent": "Continent name",
  "latitude": 0.0,
  "longitude": 0.0,
  "population": "Approximate population as string",
  "language": "Primary languages spoken",
  "currency": "Local currency name and code",
  "timezone": "UTC offset e.g. UTC+5:30",
  "description": "2-3 sentence overview of the place",
  "famous_for": "What the place is famous for",
  "best_time_to_visit": "Best months/season to visit",
  "nearby_areas": [
    {{"name": "Nearby city or town", "distance_km": 10}}
  ],
  "hotels": [
    {{
      "name": "Hotel name",
      "star_rating": 4,
      "price_range": "2000-5000 per night",
      "address": "Hotel address",
      "amenities": ["WiFi", "Pool", "Parking"]
    }}
  ],
  "attractions": [
    {{
      "name": "Attraction name",
      "type": "Historical / Natural / Religious / etc",
      "description": "Short description",
      "entry_fee": "Free / 50 / etc"
    }}
  ],
  "restaurants": [
    {{
      "name": "Restaurant name",
      "cuisine": "Type of cuisine",
      "price_range": "Budget / Mid-range / Expensive",
      "address": "Address"
    }}
  ],
  "transport": [
    {{
      "mode": "Bus / Train / Flight / Auto",
      "details": "How to reach or use this transport",
      "cost_estimate": "Approximate cost"
    }}
  ],
  "famous_foods": [
    {{
      "name": "Food item name",
      "description": "Short description of the dish and where to find it"
    }}
  ],
  "souvenirs": [
    {{
      "name": "Souvenir / artifact name",
      "description": "What it is and where to buy it"
    }}
  ]
}}

Provide exactly 6 attractions, exactly 6 hotels, exactly 6 restaurants, exactly 6 famous_foods, exactly 6 souvenirs, and at least 4 nearby_areas and 4 transport entries. Be accurate and realistic.
"""


def fetch_place_data_from_openai(place: str) -> dict:
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
    prompt = PROMPT_TEMPLATE.format(place=place)
    client = get_client()

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": "You are a travel information assistant that returns structured JSON data."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)
