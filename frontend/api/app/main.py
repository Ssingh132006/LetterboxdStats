"""
FastAPI Main Application
Serves API endpoints for CSV ingestion, Letterboxd profile scraping,
TMDB data enrichment, stats calculation, and comparison analysis.
"""
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .tmdb import tmdb_client
from .scraper import scrape_letterboxd_user
from .processor import parse_letterboxd_csv, aggregate_user_stats
from .comparator import compare_user_profiles
from .sample_data import SAMPLE_PROFILE_ALEX, SAMPLE_PROFILE_TAYLOR

app = FastAPI(
    title="Letterboxd Analytics API",
    description="Analyzes Letterboxd watch history to generate actor/director leaderboards and comparison views.",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TMDBKeyRequest(BaseModel):
    api_key: str


class ScrapeRequest(BaseModel):
    username: str
    max_pages: Optional[int] = None  # None = scrape ALL pages
    force_refresh: Optional[bool] = False
    user_label: Optional[str] = None


class CompareRequest(BaseModel):
    user1_data: Dict[str, Any]
    user2_data: Dict[str, Any]


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "has_tmdb_key": tmdb_client.has_api_key(),
    }


@app.post("/api/settings/tmdb-key")
def set_tmdb_key(payload: TMDBKeyRequest):
    tmdb_client.set_api_key(payload.api_key)
    return {
        "message": "TMDB API key updated successfully",
        "has_tmdb_key": tmdb_client.has_api_key(),
    }


@app.post("/api/analyze/csv")
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


@app.post("/api/analyze/username")
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
            max_pages=payload.max_pages,  # None means scrape all pages!
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


@app.post("/api/compare")
async def compare_profiles(payload: CompareRequest):
    """
    Compares two analyzed profile objects and returns shared statistics,
    side-by-side charts, and compatibility metrics.
    """
    comparison = compare_user_profiles(payload.user1_data, payload.user2_data)
    return comparison


@app.get("/api/sample")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
