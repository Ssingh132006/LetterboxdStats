"""
Letterboxd Web Scraper (Cloudflare-Bypassing)
Uses curl_cffi with Chrome 124 browser fingerprint impersonation
to reliably scrape all pages from https://letterboxd.com/{username}/films/
without getting 403 blocked by Cloudflare.
"""
import re
import asyncio
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

try:
    from curl_cffi.requests import AsyncSession
except ImportError:
    import httpx
    AsyncSession = None

from .cache import get_cached_profile, set_cached_profile

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://letterboxd.com/",
}


def parse_title_and_year(raw_name: str, slug: Optional[str] = None) -> tuple[str, Optional[int]]:
    """
    Parses title and release year from names like "Spider-Man: Brand New Day (2026)".
    """
    if not raw_name:
        return "", None

    match = re.search(r"^(.*?)\s*\((\d{4})\)\s*$", raw_name.strip())
    if match:
        title = match.group(1).strip()
        try:
            return title, int(match.group(2))
        except ValueError:
            return title, None

    title = raw_name.strip()
    year = None
    if slug:
        slug_match = re.search(r"-(\d{4})$", slug)
        if slug_match:
            try:
                year = int(slug_match.group(1))
            except ValueError:
                pass

    return title, year


def extract_films_from_html(html_text: str) -> List[Dict[str, Any]]:
    """Extracts all film entries from Letterboxd HTML."""
    soup = BeautifulSoup(html_text, "html.parser")
    films = []
    seen_keys = set()

    grid = soup.find("ul", class_=lambda c: c and "grid" in c.split())
    container = grid if grid else soup

    posters = container.find_all(attrs={"data-component-class": "LazyPoster"})
    if not posters:
        posters = container.select("div.film-poster, div.poster, li.poster-container")

    for poster in posters:
        item_name = poster.get("data-item-name")
        slug = poster.get("data-item-slug")
        link = poster.get("data-item-link") or poster.get("data-target-link")

        if not item_name:
            item_name = poster.get("data-film-name")

        if not item_name:
            img = poster.find("img")
            if img and img.get("alt"):
                item_name = img.get("alt")

        if not item_name:
            continue

        raw_year = poster.get("data-film-release-year")
        parsed_title, parsed_year = parse_title_and_year(item_name, slug)

        final_year = parsed_year
        if not final_year and raw_year:
            try:
                final_year = int(raw_year)
            except ValueError:
                pass

        dedup_key = f"{parsed_title.lower()}:{final_year}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        films.append({
            "title": parsed_title,
            "year": final_year,
            "slug": slug,
            "link": f"https://letterboxd.com{link}" if link and link.startswith("/") else link,
            "source": "scraped",
        })

    return films


async def fetch_rss_feed(username: str, session: Any) -> List[Dict[str, Any]]:
    """
    Fetches the user's public RSS feed from https://letterboxd.com/{username}/rss/
    Contains recent diary entries with actual TMDB IDs, star ratings, and watch dates.
    """
    rss_url = f"https://letterboxd.com/{username}/rss/"
    try:
        resp = await session.get(rss_url)
        if resp.status_code != 200:
            return []

        root = ET.fromstring(resp.text)
        rss_films = []

        for item in root.findall("./channel/item"):
            title_elem = item.find("{https://letterboxd.com}filmTitle")
            year_elem = item.find("{https://letterboxd.com}filmYear")
            rating_elem = item.find("{https://letterboxd.com}memberRating")
            tmdb_elem = item.find("{https://themoviedb.org}movieId")
            link_elem = item.find("link")

            title = title_elem.text.strip() if title_elem is not None and title_elem.text else None
            if not title:
                continue

            year = int(year_elem.text.strip()) if year_elem is not None and year_elem.text and year_elem.text.isdigit() else None
            rating = float(rating_elem.text.strip()) if rating_elem is not None and rating_elem.text else None
            tmdb_id = int(tmdb_elem.text.strip()) if tmdb_elem is not None and tmdb_elem.text and tmdb_elem.text.isdigit() else None
            link = link_elem.text.strip() if link_elem is not None and link_elem.text else None

            rss_films.append({
                "title": title,
                "year": year,
                "tmdb_id": tmdb_id,
                "rating": rating,
                "link": link,
                "source": "rss",
            })

        return rss_films
    except Exception:
        return []


async def scrape_letterboxd_user(
    username: str,
    max_pages: Optional[int] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Scrapes all watched films across all pages for a Letterboxd user.
    If max_pages is None, 0, or negative, scrapes ALL available pages.
    """
    clean_username = username.strip().strip("@/").lower()
    if not clean_username:
        raise ValueError("Letterboxd username is required")

    # Check cache if not forcing refresh and not requesting all pages on a previously truncated cache
    if not force_refresh:
        cached = get_cached_profile(clean_username)
        if cached:
            # If cached has substantial films or max_pages was already satisfied
            if max_pages and len(cached) >= max_pages * 70:
                return {
                    "username": clean_username,
                    "total_films": len(cached),
                    "films": cached,
                    "cached": True,
                }
            elif not max_pages and len(cached) > 200:
                return {
                    "username": clean_username,
                    "total_films": len(cached),
                    "films": cached,
                    "cached": True,
                }

    all_films: List[Dict[str, Any]] = []
    seen_identifiers = set()

    # Use curl_cffi with Chrome 124 TLS impersonation
    session_ctx = AsyncSession(impersonate="chrome124") if AsyncSession else httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=15.0)

    async with session_ctx as session:
        # Step 1: Fetch Page 1
        first_url = f"https://letterboxd.com/{clean_username}/films/"
        try:
            resp = await session.get(first_url)
        except Exception as err:
            raise RuntimeError(f"Network error connecting to Letterboxd: {err}")

        if resp.status_code == 404:
            raise ValueError(f"Letterboxd user '{clean_username}' was not found.")

        if resp.status_code != 200:
            raise RuntimeError(f"Letterboxd returned HTTP {resp.status_code} for user '{clean_username}'.")

        page1_films = extract_films_from_html(resp.text)
        if not page1_films:
            # Check if user has zero watched films
            return {
                "username": clean_username,
                "total_films": 0,
                "total_pages_scraped": 1,
                "total_available_pages": 1,
                "films": [],
                "cached": False,
            }

        for f in page1_films:
            ident = f"{f['title'].lower()}:{f.get('year')}"
            if ident not in seen_identifiers:
                seen_identifiers.add(ident)
                all_films.append(f)

        # Step 2: Determine total pages from pagination
        soup = BeautifulSoup(resp.text, "html.parser")
        paginate_div = soup.find("div", class_="pagination")
        total_available_pages = 1

        if paginate_div:
            page_elements = paginate_div.select("li.paginate-page a, li.paginate-page span")
            nums = [int(el.text.strip()) for el in page_elements if el.text.strip().isdigit()]
            if nums:
                total_available_pages = max(nums)

        # Determine target pages
        if max_pages is not None and max_pages > 0:
            target_pages = min(max_pages, total_available_pages)
        else:
            # Scrape ALL pages (safety ceiling of 100 pages = 7,200 films)
            target_pages = min(total_available_pages, 100)

        # Step 3: Fetch remaining pages concurrently in batches of 5
        if target_pages > 1:
            batch_size = 5
            for batch_start in range(2, target_pages + 1, batch_size):
                batch_end = min(batch_start + batch_size, target_pages + 1)
                
                async def fetch_page(p_num: int):
                    page_url = f"https://letterboxd.com/{clean_username}/films/page/{p_num}/"
                    try:
                        p_resp = await session.get(page_url)
                        if p_resp.status_code == 200:
                            return extract_films_from_html(p_resp.text)
                    except Exception:
                        pass
                    return []

                batch_results = await asyncio.gather(*[fetch_page(p) for p in range(batch_start, batch_end)])
                for p_films in batch_results:
                    for f in p_films:
                        ident = f"{f['title'].lower()}:{f.get('year')}"
                        if ident not in seen_identifiers:
                            seen_identifiers.add(ident)
                            all_films.append(f)

                # Polite delay between batches
                await asyncio.sleep(0.15)

        # Step 4: Augment with RSS feed if available
        rss_items = await fetch_rss_feed(clean_username, session)
        rss_map = {f"{r['title'].lower()}:{r.get('year')}": r for r in rss_items}
        for f in all_films:
            ident = f"{f['title'].lower()}:{f.get('year')}"
            if ident in rss_map:
                r_item = rss_map[ident]
                if r_item.get("rating") is not None:
                    f["rating"] = str(r_item["rating"])
                if r_item.get("tmdb_id"):
                    f["tmdb_id"] = r_item["tmdb_id"]

    # Save complete dataset to cache
    if all_films:
        set_cached_profile(clean_username, all_films)

    return {
        "username": clean_username,
        "total_films": len(all_films),
        "total_pages_scraped": target_pages,
        "total_available_pages": total_available_pages,
        "films": all_films,
        "cached": False,
    }
