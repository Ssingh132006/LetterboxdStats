"""
Letterboxd Data Processor
Parses watched.csv exports and scraped profile data,
enriches with Letterboxd & TMDB cast/crew, and calculates:
- Complete talent extraction (no arbitrary cast truncation)
- Absolute Number, Completion Percentage, Profile Percentage
- Decade / Era distribution
- Director-Actor Collaboration Duos (Power Combos)
- Auteur Concentration & Diversity indices
- Temporal Milestones (earliest/latest film, average release year)
"""
import io
import csv
import re
import asyncio
from typing import List, Dict, Any, Optional
from collections import defaultdict
from bs4 import BeautifulSoup

try:
    from curl_cffi.requests import AsyncSession
except ImportError:
    import httpx
    AsyncSession = None

from .tmdb import tmdb_client, TMDBClient
from .cache import (
    normalize_title,
    get_cached_movie,
    set_cached_movie,
    get_cached_person,
    set_cached_person
)
from .sample_data import (
    SAMPLE_MOVIES_METADATA,
    FAMOUS_DIRECTORS_CAREER,
    FAMOUS_ACTORS_CAREER
)


def slugify(text: str) -> str:
    """Converts a title into a URL slug, e.g. 'Dune: Part Two' -> 'dune-part-two'."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")


def parse_letterboxd_csv(file_content: str) -> List[Dict[str, Any]]:
    """
    Parses a Letterboxd export CSV (watched.csv, diary.csv, ratings.csv).
    Extracts title, year, letterboxd_uri, rating, and film slug for 100% of rows.
    """
    f = io.StringIO(file_content)
    reader = csv.reader(f)

    try:
        raw_headers = next(reader)
    except StopIteration:
        return []

    headers = [h.strip().lower() for h in raw_headers]

    title_idx = -1
    year_idx = -1
    uri_idx = -1
    rating_idx = -1

    for i, h in enumerate(headers):
        if h in ("name", "title", "film", "movie"):
            title_idx = i
        elif h in ("year", "release year"):
            year_idx = i
        elif "uri" in h or "url" in h:
            uri_idx = i
        elif "rating" in h:
            rating_idx = i

    if title_idx == -1:
        if len(headers) >= 3:
            title_idx = 1
            year_idx = 2
        else:
            title_idx = 0

    films: List[Dict[str, Any]] = []
    seen = set()

    for row in reader:
        if not row or len(row) <= title_idx:
            continue

        raw_title = row[title_idx].strip()
        if not raw_title:
            continue

        raw_year = None
        if year_idx != -1 and len(row) > year_idx and row[year_idx].strip():
            try:
                raw_year = int(row[year_idx].strip())
            except ValueError:
                raw_year = None

        uri = row[uri_idx].strip() if uri_idx != -1 and len(row) > uri_idx else None
        rating = row[rating_idx].strip() if rating_idx != -1 and len(row) > rating_idx else None

        if not raw_year:
            m = re.search(r"^(.*?)\s*\((\d{4})\)$", raw_title)
            if m:
                raw_title = m.group(1).strip()
                try:
                    raw_year = int(m.group(2))
                except ValueError:
                    pass

        # Extract slug from Letterboxd URI if present
        slug = None
        if uri:
            slug_match = re.search(r"/film/([^/]+)/?", uri)
            if slug_match:
                slug = slug_match.group(1)

        if not slug:
            slug = slugify(raw_title)

        dedup_key = f"{raw_title.lower()}:{raw_year}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        films.append({
            "title": raw_title,
            "year": raw_year,
            "slug": slug,
            "letterboxd_uri": uri,
            "rating": rating,
            "source": "csv",
        })

    return films


async def fetch_film_metadata_from_letterboxd(session: Any, slug: str, title: str, year: Optional[int]) -> Dict[str, Any]:
    """
    Scrapes the exact film page from Letterboxd to extract:
    - ALL directors
    - ALL cast members (no arbitrary truncation so cameos/credits are preserved)
    - Poster image
    """
    url = f"https://letterboxd.com/film/{slug}/"
    try:
        resp = await session.get(url)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Directors
            dirs = [a.text.strip() for a in soup.select('a[href*="/director/"]')]
            directors = list(dict.fromkeys([d for d in dirs if d]))

            # Cast (extract all cast links to preserve all appearances like cameos)
            cast_links = [a.text.strip() for a in soup.select('a[href*="/actor/"]')]
            cast = list(dict.fromkeys([c for c in cast_links if c]))

            poster_el = soup.select_one("div.film-poster img, div.poster img, img.image")
            poster_url = poster_el.get("src") if poster_el else None

            # Clean placeholder
            if poster_url and "empty-poster" in poster_url:
                poster_url = None

            return {
                "directors": [{"name": d} for d in directors],
                "cast": [{"name": c} for c in cast],
                "poster_path": poster_url,
            }
    except Exception:
        pass

    return {"directors": [], "cast": [], "poster_path": None}


async def enrich_movie_item(film: Dict[str, Any], client: TMDBClient, session: Any, sem: asyncio.Semaphore) -> Dict[str, Any]:
    """
    Enriches a single movie item using:
    1. Curated sample metadata (instant)
    2. SQLite cache (instant)
    3. TMDB API (if key active)
    4. Letterboxd film page scraper with candidate slugs (exact cast & directors)
    """
    title = film.get("title", "")
    year = film.get("year")
    norm = normalize_title(title)

    # 1. Check curated sample metadata first (instant & canonical)
    if norm in SAMPLE_MOVIES_METADATA:
        meta = SAMPLE_MOVIES_METADATA[norm]
        # Match if no year or years align within 1 year
        meta_year = meta.get("year")
        if not year or not meta_year or abs(year - meta_year) <= 1:
            return {
                **film,
                "title": meta.get("title", title),
                "year": meta_year or year,
                "poster_path": meta.get("poster_path"),
                "directors": meta.get("directors", []),
                "cast": meta.get("cast", []),
            }

    # 2. Check local SQLite cache
    cached = get_cached_movie(title, year)
    if cached and (cached.get("directors") or cached.get("cast")):
        return {
            **film,
            "title": cached.get("title", title),
            "year": cached.get("year", year),
            "poster_path": cached.get("poster_path"),
            "directors": cached.get("directors", []),
            "cast": cached.get("cast", []),
        }

    # 3. Check TMDB if API key active
    if client.has_api_key():
        info = await client.search_movie(title, year)
        if info and (info.get("directors") or info.get("cast")):
            set_cached_movie(title, year, info)
            return {
                **film,
                "tmdb_id": info.get("tmdb_id"),
                "title": info.get("title", title),
                "year": info.get("year", year),
                "poster_path": info.get("poster_path"),
                "directors": info.get("directors", []),
                "cast": info.get("cast", []),
            }

    # 4. Direct Letterboxd Film Scraping (gives 100% of cast & directors for ANY film on Letterboxd!)
    slug = film.get("slug")
    if not slug and film.get("letterboxd_uri"):
        m = re.search(r"/film/([^/]+)/?", film["letterboxd_uri"])
        if m:
            slug = m.group(1)
    if not slug:
        slug = slugify(title)

    candidate_slugs = []
    if year and not re.search(r"-\d{4}$", slug):
        candidate_slugs.append(f"{slug}-{year}")
    candidate_slugs.append(slug)

    async with sem:
        for c_slug in candidate_slugs:
            lb_info = await fetch_film_metadata_from_letterboxd(session, c_slug, title, year)
            if lb_info.get("directors") or lb_info.get("cast"):
                movie_data = {
                    "title": title,
                    "year": year,
                    "poster_path": lb_info.get("poster_path"),
                    "directors": lb_info.get("directors", []),
                    "cast": lb_info.get("cast", []),
                }
                set_cached_movie(title, year, movie_data)
                return {
                    **film,
                    **movie_data,
                }

    return {
        **film,
        "directors": [],
        "cast": [],
        "poster_path": None,
    }


async def enrich_film_list(films: List[Dict[str, Any]], client: Optional[TMDBClient] = None) -> List[Dict[str, Any]]:
    """Concurrently enriches a list of films with Semaphore throttle."""
    c = client or tmdb_client
    sem = asyncio.Semaphore(15)

    session_ctx = AsyncSession(impersonate="chrome124") if AsyncSession else httpx.AsyncClient(timeout=15.0)

    async with session_ctx as session:
        tasks = [enrich_movie_item(f, c, session, sem) for f in films]
        return await asyncio.gather(*tasks)


async def fetch_person_career_count_from_letterboxd(session: Any, person_name: str, role: str) -> int:
    """
    Scrapes Letterboxd /actor/{slug}/ or /director/{slug}/ to calculate exact career films count.
    """
    slug = slugify(person_name)
    endpoint = "director" if role == "Director" else "actor"
    url = f"https://letterboxd.com/{endpoint}/{slug}/"
    try:
        resp = await session.get(url)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            paginate_div = soup.find("div", class_="pagination")
            pages = 1
            if paginate_div:
                nums = [int(el.text.strip()) for el in paginate_div.select("li.paginate-page a, li.paginate-page span") if el.text.strip().isdigit()]
                if nums:
                    pages = max(nums)
            posters = soup.select('div.react-component[data-component-class="LazyPoster"]')
            count_on_page = len(posters)
            if pages > 1:
                return (pages - 1) * 72 + count_on_page
            return count_on_page
    except Exception:
        pass
    return 0


def calculate_decade_stats(films: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Groups films by release decade and calculates counts & percentages."""
    decade_counts = defaultdict(int)
    valid_count = 0

    for f in films:
        year = f.get("year")
        if year and 1880 <= year <= 2035:
            valid_count += 1
            if year >= 2020:
                decade = "2020s"
            elif year >= 2010:
                decade = "2010s"
            elif year >= 2000:
                decade = "2000s"
            elif year >= 1990:
                decade = "1990s"
            elif year >= 1980:
                decade = "1980s"
            elif year >= 1970:
                decade = "1970s"
            elif year >= 1960:
                decade = "1960s"
            else:
                decade = "Classic (<1960)"
            decade_counts[decade] += 1

    order = ["2020s", "2010s", "2000s", "1990s", "1980s", "1970s", "1960s", "Classic (<1960)"]
    result = []
    for d in order:
        if d in decade_counts:
            cnt = decade_counts[d]
            pct = round((cnt / valid_count * 100), 1) if valid_count > 0 else 0
            result.append({"decade": d, "count": cnt, "percentage": pct})

    return result


async def aggregate_user_stats(
    films: List[Dict[str, Any]],
    user_label: str = "User",
    client: Optional[TMDBClient] = None
) -> Dict[str, Any]:
    """
    Enriches all films and aggregates director and actor leaderboards with exact counts.
    """
    c = client or tmdb_client
    enriched_films = await enrich_film_list(films, c)
    total_user_films = len(enriched_films)

    if total_user_films == 0:
        return {
            "label": user_label,
            "total_films": 0,
            "summary": {
                "total_films": 0,
                "total_directors": 0,
                "total_actors": 0,
                "top_director": None,
                "top_actor": None,
                "highest_completion": None,
                "average_year": None,
                "earliest_film": None,
                "latest_film": None,
                "auteur_concentration": 0,
                "exploration_ratio": 0,
            },
            "decades": [],
            "collaborations": [],
            "directors": [],
            "actors": [],
            "films": [],
        }

    directors_map = defaultdict(lambda: {
        "id": None,
        "name": "",
        "profile_path": None,
        "count": 0,
        "films": []
    })

    actors_map = defaultdict(lambda: {
        "id": None,
        "name": "",
        "profile_path": None,
        "count": 0,
        "films": []
    })

    collaborations_map = defaultdict(lambda: {
        "director": "",
        "actor": "",
        "count": 0,
        "films": []
    })

    years = []
    earliest_film = None
    latest_film = None

    for f in enriched_films:
        film_summary = {
            "title": f.get("title"),
            "year": f.get("year"),
            "poster_path": f.get("poster_path"),
            "rating": f.get("rating"),
        }

        y = f.get("year")
        if y and 1880 <= y <= 2035:
            years.append(y)
            if not earliest_film or y < earliest_film["year"]:
                earliest_film = film_summary
            if not latest_film or y > latest_film["year"]:
                latest_film = film_summary

        film_directors = f.get("directors", [])
        film_cast = f.get("cast", [])

        for d in film_directors:
            d_name = d.get("name")
            if not d_name:
                continue
            entry = directors_map[d_name]
            entry["id"] = d.get("id") or entry["id"]
            entry["name"] = d_name
            entry["profile_path"] = d.get("profile_path") or entry["profile_path"]
            entry["count"] += 1
            entry["films"].append(film_summary)

            for actor in film_cast:
                a_name = actor.get("name")
                if not a_name:
                    continue
                combo_key = f"{d_name}___{a_name}"
                c_entry = collaborations_map[combo_key]
                c_entry["director"] = d_name
                c_entry["actor"] = a_name
                c_entry["count"] += 1
                c_entry["films"].append(f.get("title"))

        for actor in film_cast:
            a_name = actor.get("name")
            if not a_name:
                continue
            entry = actors_map[a_name]
            entry["id"] = actor.get("id") or entry["id"]
            entry["name"] = a_name
            entry["profile_path"] = actor.get("profile_path") or entry["profile_path"]
            entry["count"] += 1
            actor_film_summary = dict(film_summary)
            actor_film_summary["character"] = actor.get("character", "")
            entry["films"].append(actor_film_summary)

    sorted_directors = sorted(directors_map.values(), key=lambda x: x["count"], reverse=True)[:50]
    sorted_actors = sorted(actors_map.values(), key=lambda x: x["count"], reverse=True)[:50]

    career_session = AsyncSession(impersonate="chrome124") if AsyncSession else httpx.AsyncClient(timeout=15.0)

    async with career_session as session:
        async def fetch_director_career(d_item):
            name = d_item["name"]
            p_id = d_item.get("id")
            career_total = 0

            # 1. TMDB check
            if p_id and c.has_api_key():
                res = await c.get_person_career_totals(p_id, name, d_item.get("profile_path"))
                career_total = res.get("total_directing_movies", 0)
                if res.get("profile_path") and not d_item.get("profile_path"):
                    d_item["profile_path"] = res.get("profile_path")

            # 2. Curated fallback
            if career_total == 0 and name in FAMOUS_DIRECTORS_CAREER:
                career_total = FAMOUS_DIRECTORS_CAREER[name]

            # 3. Direct Letterboxd director career count
            if career_total == 0:
                career_total = await fetch_person_career_count_from_letterboxd(session, name, "Director")

            if career_total < d_item["count"]:
                career_total = d_item["count"]

            watched_count = d_item["count"]
            completion_pct = round((watched_count / career_total * 100), 1) if career_total > 0 else 100.0
            completion_pct = min(completion_pct, 100.0)
            profile_pct = round((watched_count / total_user_films * 100), 1)

            return {
                **d_item,
                "career_total": career_total,
                "completion_pct": completion_pct,
                "profile_pct": profile_pct,
            }

        async def fetch_actor_career(a_item):
            name = a_item["name"]
            p_id = a_item.get("id")
            career_total = 0

            # 1. TMDB check
            if p_id and c.has_api_key():
                res = await c.get_person_career_totals(p_id, name, a_item.get("profile_path"))
                career_total = res.get("total_acting_movies", 0)
                if res.get("profile_path") and not a_item.get("profile_path"):
                    a_item["profile_path"] = res.get("profile_path")

            # 2. Curated fallback
            if career_total == 0 and name in FAMOUS_ACTORS_CAREER:
                career_total = FAMOUS_ACTORS_CAREER[name]

            # 3. Direct Letterboxd actor career count
            if career_total == 0:
                career_total = await fetch_person_career_count_from_letterboxd(session, name, "Actor")

            if career_total < a_item["count"]:
                career_total = a_item["count"]

            watched_count = a_item["count"]
            completion_pct = round((watched_count / career_total * 100), 1) if career_total > 0 else 100.0
            completion_pct = min(completion_pct, 100.0)
            profile_pct = round((watched_count / total_user_films * 100), 1)

            return {
                **a_item,
                "career_total": career_total,
                "completion_pct": completion_pct,
                "profile_pct": profile_pct,
            }

        final_directors = await asyncio.gather(*[fetch_director_career(d) for d in sorted_directors])
        final_actors = await asyncio.gather(*[fetch_actor_career(a) for a in sorted_actors])

    final_directors = sorted(final_directors, key=lambda x: x["count"], reverse=True)
    final_actors = sorted(final_actors, key=lambda x: x["count"], reverse=True)

    top_director = final_directors[0]["name"] if final_directors else None
    top_actor = final_actors[0]["name"] if final_actors else None

    completion_candidates = [
        {"name": d["name"], "role": "Director", "pct": d["completion_pct"], "count": d["count"], "total": d["career_total"]}
        for d in final_directors if d["count"] >= 2
    ] + [
        {"name": a["name"], "role": "Actor", "pct": a["completion_pct"], "count": a["count"], "total": a["career_total"]}
        for a in final_actors if a["count"] >= 3
    ]
    highest_completion = sorted(completion_candidates, key=lambda x: (x["pct"], x["count"]), reverse=True)[0] if completion_candidates else None

    sorted_combos = sorted(
        [c for c in collaborations_map.values() if c["count"] >= 2],
        key=lambda x: x["count"],
        reverse=True
    )[:15]

    decades_data = calculate_decade_stats(enriched_films)
    top5_dir_count = sum(d["count"] for d in final_directors[:5])
    auteur_concentration = round((top5_dir_count / total_user_films * 100), 1) if total_user_films > 0 else 0
    avg_year = round(sum(years) / len(years)) if years else None

    return {
        "label": user_label,
        "total_films": total_user_films,
        "summary": {
            "total_films": total_user_films,
            "total_directors": len(directors_map),
            "total_actors": len(actors_map),
            "top_director": top_director,
            "top_actor": top_actor,
            "highest_completion": highest_completion,
            "average_year": avg_year,
            "earliest_film": earliest_film,
            "latest_film": latest_film,
            "auteur_concentration": auteur_concentration,
            "exploration_ratio": round(total_user_films / max(len(directors_map), 1), 1),
        },
        "decades": decades_data,
        "collaborations": sorted_combos,
        "directors": final_directors,
        "actors": final_actors,
        "films": enriched_films,
    }
