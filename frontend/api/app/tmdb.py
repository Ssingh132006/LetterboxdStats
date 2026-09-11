"""
Async TMDB API Client
Handles movie search, credits extraction (Directors & Top Cast),
and career filmography totals from TMDB Person API with rate limiting and SQLite caching.
"""
import asyncio
import os
from typing import List, Dict, Any, Optional, Set
import httpx

from .cache import (
    get_cached_movie,
    set_cached_movie,
    get_cached_person,
    set_cached_person
)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
DEFAULT_CONCURRENCY = 8
REQUEST_DELAY = 0.05  # small delay to prevent bursting TMDB rate limit


class TMDBClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TMDB_API_KEY", "a156ba385cb9672d42ce6b1bc687afd1").strip()
        self.semaphore = asyncio.Semaphore(DEFAULT_CONCURRENCY)

    def set_api_key(self, api_key: str):
        self.api_key = api_key.strip()

    def has_api_key(self) -> bool:
        return bool(self.api_key)

    async def _get(self, endpoint: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Makes an async GET request to TMDB with rate limit retry."""
        if not self.has_api_key():
            return None

        merged_params = dict(params)
        merged_params["api_key"] = self.api_key

        async with self.semaphore:
            await asyncio.sleep(REQUEST_DELAY)
            for attempt in range(3):
                try:
                    async with httpx.AsyncClient(timeout=12.0) as client:
                        resp = await client.get(f"{TMDB_BASE_URL}{endpoint}", params=merged_params)
                        
                        if resp.status_code == 200:
                            return resp.json()
                        elif resp.status_code == 429:
                            retry_after = float(resp.headers.get("Retry-After", 1.5))
                            await asyncio.sleep(retry_after)
                        elif resp.status_code in (401, 404):
                            return None
                        else:
                            await asyncio.sleep(0.5 * (attempt + 1))
                except (httpx.HTTPError, asyncio.TimeoutError):
                    await asyncio.sleep(0.5 * (attempt + 1))
        return None

    async def search_movie(self, title: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Searches TMDB for a movie by title and optional release year."""
        # 1. Check local cache
        cached = get_cached_movie(title, year)
        if cached:
            return cached

        if not self.has_api_key():
            return None

        # 2. Query TMDB with year
        params = {"query": title, "include_adult": False, "language": "en-US"}
        if year:
            params["year"] = year

        data = await self._get("/search/movie", params)
        results = data.get("results", []) if data else []

        # If no results and year was specified, retry without year restriction
        if not results and year:
            params.pop("year", None)
            data = await self._get("/search/movie", params)
            results = data.get("results", []) if data else []

        if not results:
            return None

        # Pick best matching result
        best = results[0]
        tmdb_id = best.get("id")
        movie_title = best.get("title", title)
        release_date = best.get("release_date", "")
        extracted_year = int(release_date[:4]) if release_date and len(release_date) >= 4 and release_date[:4].isdigit() else year
        poster_path = best.get("poster_path")

        # Fetch credits for this movie
        credits = await self.get_movie_credits(tmdb_id)
        directors = credits.get("directors", [])
        cast = credits.get("cast", [])

        movie_info = {
            "tmdb_id": tmdb_id,
            "title": movie_title,
            "year": extracted_year,
            "poster_path": f"https://image.tmdb.org/t/p/w300{poster_path}" if poster_path else None,
            "directors": directors,
            "cast": cast,
        }

        # Cache result
        set_cached_movie(title, year, movie_info)
        return movie_info

    async def get_movie_credits(self, tmdb_id: int) -> Dict[str, Any]:
        """Fetches directors and top cast members for a movie."""
        if not self.has_api_key():
            return {"directors": [], "cast": []}

        data = await self._get(f"/movie/{tmdb_id}/credits", {"language": "en-US"})
        if not data:
            return {"directors": [], "cast": []}

        directors = []
        for crew_member in data.get("crew", []):
            if crew_member.get("job") == "Director":
                profile = crew_member.get("profile_path")
                directors.append({
                    "id": crew_member.get("id"),
                    "name": crew_member.get("name"),
                    "profile_path": f"https://image.tmdb.org/t/p/w185{profile}" if profile else None,
                })

        # Top 8 cast members
        cast = []
        raw_cast = sorted(data.get("cast", []), key=lambda x: x.get("order", 999))
        for member in raw_cast[:8]:
            profile = member.get("profile_path")
            cast.append({
                "id": member.get("id"),
                "name": member.get("name"),
                "character": member.get("character", ""),
                "profile_path": f"https://image.tmdb.org/t/p/w185{profile}" if profile else None,
            })

        return {"directors": directors, "cast": cast}

    async def get_person_career_totals(self, person_id: int, name: str = "", profile_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Pings TMDB Person Movie Credits API to calculate total career acting and directing counts.
        Caches results locally to avoid redundant calls.
        """
        cached = get_cached_person(person_id)
        if cached:
            return cached

        if not self.has_api_key():
            return {
                "person_id": person_id,
                "name": name,
                "profile_path": profile_path,
                "total_acting_movies": 0,
                "total_directing_movies": 0,
            }

        data = await self._get(f"/person/{person_id}/movie_credits", {"language": "en-US"})
        if not data:
            return {
                "person_id": person_id,
                "name": name,
                "profile_path": profile_path,
                "total_acting_movies": 0,
                "total_directing_movies": 0,
            }

        # Count unique movie IDs for acting
        acting_movies: Set[int] = set()
        for role in data.get("cast", []):
            m_id = role.get("id")
            if m_id:
                acting_movies.add(m_id)

        # Count unique movie IDs for directing
        directing_movies: Set[int] = set()
        for credit in data.get("crew", []):
            if credit.get("job") == "Director":
                m_id = credit.get("id")
                if m_id:
                    directing_movies.add(m_id)

        total_acting = len(acting_movies)
        total_directing = len(directing_movies)

        set_cached_person(person_id, name, profile_path, total_acting, total_directing)

        return {
            "person_id": person_id,
            "name": name,
            "profile_path": profile_path,
            "total_acting_movies": total_acting,
            "total_directing_movies": total_directing,
        }

    async def batch_enrich_movies(self, movies: List[Dict[str, Any]], progress_callback=None) -> List[Dict[str, Any]]:
        """
        Concurrently enriches a list of films (title, year) with TMDB data.
        Uses rate-limiting semaphore and progress updates.
        """
        enriched: List[Dict[str, Any]] = []
        total = len(movies)
        processed = 0

        async def enrich_one(movie: Dict[str, Any]):
            nonlocal processed
            title = movie.get("title", "")
            year = movie.get("year")
            
            info = await self.search_movie(title, year)
            processed += 1
            if progress_callback and processed % 10 == 0:
                await progress_callback(processed, total)

            if info:
                return {
                    **movie,
                    "tmdb_id": info.get("tmdb_id"),
                    "title": info.get("title", title),
                    "year": info.get("year", year),
                    "poster_path": info.get("poster_path"),
                    "directors": info.get("directors", []),
                    "cast": info.get("cast", []),
                }
            return {
                **movie,
                "directors": [],
                "cast": [],
            }

        tasks = [enrich_one(m) for m in movies]
        enriched = await asyncio.gather(*tasks)
        return enriched


# Global default client instance
tmdb_client = TMDBClient()
