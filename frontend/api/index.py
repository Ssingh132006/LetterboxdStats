"""
FastAPI Serverless Entrypoint for Vercel
Serves API endpoints under /api/py (and /api) for full-stack Next.js deployment on Vercel.
"""
import os
import sys

# Ensure api directory is in sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import application logic from app subpackage
from app.tmdb import tmdb_client
from app.scraper import scrape_letterboxd_user
from app.processor import parse_letterboxd_csv, aggregate_user_stats
from app.comparator import compare_user_profiles
from app.sample_data import SAMPLE_PROFILE_ALEX, SAMPLE_PROFILE_TAYLOR

app = FastAPI(
    title="Letterboxd Analytics API",
    description="FastAPI Backend for Letterboxd Stats running on Vercel Serverless Functions",
    version="1.1.0",
    docs_url="/api/py/docs",
    openapi_url="/api/py/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


class TMDBKeyRequest(BaseModel):
    api_key: str


class ScrapeRequest(BaseModel):
    username: str
    max_pages: Optional[int] = None
    force_refresh: Optional[bool] = False
    user_label: Optional[str] = None


class CompareRequest(BaseModel):
    user1_data: Dict[str, Any]
    user2_data: Dict[str, Any]


@router.get("/health")
def health_check():
    return {
        "status": "online",
        "runtime": "vercel_python_serverless",
        "has_tmdb_key": tmdb_client.has_api_key(),
    }


@router.post("/settings/tmdb-key")
def set_tmdb_key(payload: TMDBKeyRequest):
    tmdb_client.set_api_key(payload.api_key)
    return {
        "message": "TMDB API key updated successfully",
        "has_tmdb_key": tmdb_client.has_api_key(),
    }


@router.post("/analyze/csv")
async def analyze_csv(
    file: UploadFile = File(...),
    user_label: Optional[str] = Form("Primary User")
):
    """
    Ingests an uploaded Letterboxd export CSV (watched.csv, diary.csv).
    Parses ALL rows in the CSV and aggregates stats.
    """
    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    films = parse_letterboxd_csv(content_str)
    if not films:
        raise HTTPException(
            status_code=400,
            detail="No valid film entries could be parsed from the CSV. Make sure you upload a standard Letterboxd watched.csv or diary.csv export."
        )

    label = user_label or "Primary User"
    stats = await aggregate_user_stats(films, user_label=label, client=tmdb_client)
    return stats


@router.post("/analyze/username")
async def analyze_username(payload: ScrapeRequest):
    """
    Scrapes films from a Letterboxd user profile across ALL pages.
    Bypasses Cloudflare using Chrome TLS impersonation.
    """
    username = payload.username.strip().strip("@/")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required.")

    try:
        scraped = await scrape_letterboxd_user(
            username=username,
            max_pages=payload.max_pages,
            force_refresh=payload.force_refresh or False,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    films = scraped.get("films", [])
    if not films:
        raise HTTPException(status_code=404, detail=f"No watched films found for Letterboxd user '{username}'.")

    label = payload.user_label or f"@{username}"
    stats = await aggregate_user_stats(films, user_label=label, client=tmdb_client)
    stats["scraped_metadata"] = {
        "username": username,
        "total_scraped": scraped.get("total_films", 0),
        "total_pages_scraped": scraped.get("total_pages_scraped", 1),
        "total_available_pages": scraped.get("total_available_pages", 1),
        "cached": scraped.get("cached", False),
    }
    return stats


@router.post("/compare")
async def compare_profiles(payload: CompareRequest):
    """
    Compares two analyzed profile objects and returns shared statistics,
    side-by-side charts, and compatibility metrics.
    """
    comparison = compare_user_profiles(payload.user1_data, payload.user2_data)
    return comparison


@router.get("/sample")
async def get_sample_data():
    """
    Returns pre-analyzed demo data for Alex and Taylor
    so users can immediately test all app features.
    """
    stats_alex = await aggregate_user_stats(SAMPLE_PROFILE_ALEX, user_label="Alex (Sample)", client=tmdb_client)
    stats_taylor = await aggregate_user_stats(SAMPLE_PROFILE_TAYLOR, user_label="Taylor (Sample)", client=tmdb_client)
    comparison = compare_user_profiles(stats_alex, stats_taylor)

    return {
        "primary_user": stats_alex,
        "comparison_user": stats_taylor,
        "comparison": comparison,
    }


# Register routes for both /api/py and /api prefixes
app.include_router(router, prefix="/api/py")
app.include_router(router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)
