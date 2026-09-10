"""
Unit tests for Letterboxd analytics processor, scraper, and comparator.
"""
import pytest
import asyncio
from app.processor import parse_letterboxd_csv, aggregate_user_stats
from app.scraper import parse_title_and_year, extract_films_from_html
from app.comparator import compare_user_profiles


def test_parse_title_and_year():
    title, year = parse_title_and_year("Oppenheimer (2023)")
    assert title == "Oppenheimer"
    assert year == 2023

    title, year = parse_title_and_year("Spider-Man: Brand New Day (2026)")
    assert title == "Spider-Man: Brand New Day"
    assert year == 2026

    # Test slug fallback
    title, year = parse_title_and_year("Scarlet", slug="scarlet-2025")
    assert title == "Scarlet"
    assert year == 2025


def test_parse_letterboxd_csv():
    sample_csv = """Date,Name,Year,Letterboxd URI
2024-01-15,Oppenheimer,2023,https://letterboxd.com/film/oppenheimer/
2024-01-16,Interstellar,2014,https://letterboxd.com/film/interstellar/
2024-01-17,Dune: Part Two,2024,https://letterboxd.com/film/dune-part-two/
"""
    films = parse_letterboxd_csv(sample_csv)
    assert len(films) == 3
    assert films[0]["title"] == "Oppenheimer"
    assert films[0]["year"] == 2023
    assert films[1]["title"] == "Interstellar"
    assert films[1]["year"] == 2014


def test_extract_films_from_html():
    sample_html = """
    <ul class="grid -p70">
        <li class="griditem">
            <div class="react-component" data-component-class="LazyPoster" 
                 data-item-name="Inception (2010)" 
                 data-item-slug="inception" 
                 data-item-link="/film/inception/">
                <img src="/poster.jpg" alt="Inception" />
            </div>
        </li>
        <li class="griditem">
            <div class="react-component" data-component-class="LazyPoster" 
                 data-item-name="The Dark Knight (2008)" 
                 data-item-slug="the-dark-knight" 
                 data-item-link="/film/the-dark-knight/">
                <img src="/poster2.jpg" alt="The Dark Knight" />
            </div>
        </li>
    </ul>
    """
    films = extract_films_from_html(sample_html)
    assert len(films) == 2
    assert films[0]["title"] == "Inception"
    assert films[0]["year"] == 2010
    assert films[1]["title"] == "The Dark Knight"
    assert films[1]["year"] == 2008


@pytest.mark.asyncio
async def test_aggregate_stats_and_metrics():
    sample_films = [
        {"title": "Oppenheimer", "year": 2023},
        {"title": "Interstellar", "year": 2014},
        {"title": "Inception", "year": 2010},
        {"title": "Dune: Part Two", "year": 2024},
    ]
    stats = await aggregate_user_stats(sample_films, user_label="TestUser")
    assert stats["total_films"] == 4
    assert len(stats["directors"]) > 0

    # Christopher Nolan should be top director (3 out of 4 films)
    top_dir = stats["directors"][0]
    assert top_dir["name"] == "Christopher Nolan"
    assert top_dir["count"] == 3
    # Absolute count is 3
    # Profile pct is 3 / 4 = 75%
    assert top_dir["profile_pct"] == 75.0
    # Completion pct should be 3 / 12 = 25.0%
    assert top_dir["completion_pct"] == 25.0


@pytest.mark.asyncio
async def test_comparator():
    user1_films = [
        {"title": "Oppenheimer", "year": 2023},
        {"title": "Interstellar", "year": 2014},
        {"title": "Inception", "year": 2010},
        {"title": "Barbie", "year": 2023},
    ]
    user2_films = [
        {"title": "Barbie", "year": 2023},
        {"title": "Little Women", "year": 2019},
        {"title": "Oppenheimer", "year": 2023},
    ]

    u1_stats = await aggregate_user_stats(user1_films, user_label="User 1")
    u2_stats = await aggregate_user_stats(user2_films, user_label="User 2")

    comp = compare_user_profiles(u1_stats, u2_stats)
    assert comp["compatibility_score"] > 0
    assert comp["shared_movies_count"] >= 2  # Barbie, Oppenheimer
    assert len(comp["shared_directors"]) > 0
    # Both have watched Greta Gerwig (Barbie, Little Women) and Christopher Nolan (Oppenheimer)
    dir_names = [d["name"] for d in comp["shared_directors"]]
    assert "Christopher Nolan" in dir_names
    assert "Greta Gerwig" in dir_names
