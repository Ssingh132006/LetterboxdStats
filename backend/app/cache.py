"""
SQLite Cache layer for Letterboxd scraper & TMDB queries.
Ensures we do not repeatedly call TMDB or re-scrape Letterboxd for previously processed data.
"""
import sqlite3
import json
import os
import re
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache.db")


def normalize_title(title: str) -> str:
    if not title:
        return ""
    # Lowercase, remove accents/punctuation for stable key matching
    cleaned = title.lower().strip()
    cleaned = re.sub(r"[^\w\s]", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def init_db(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Movie cache table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS movies (
            lookup_key TEXT PRIMARY KEY,
            tmdb_id INTEGER,
            title TEXT,
            year INTEGER,
            poster_path TEXT,
            directors TEXT,
            cast TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Person credits cache table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS persons (
            person_id INTEGER PRIMARY KEY,
            name TEXT,
            profile_path TEXT,
            total_acting_movies INTEGER DEFAULT 0,
            total_directing_movies INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Scraped Letterboxd profile cache table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scraped_profiles (
            username TEXT PRIMARY KEY,
            films_json TEXT,
            total_scraped INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()


def get_cached_movie(title: str, year: Optional[int] = None, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    key = f"{normalize_title(title)}:{year if year else ''}"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT tmdb_id, title, year, poster_path, directors, "cast" FROM movies WHERE lookup_key = ?', (key,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        # Fallback to key without year if year was provided but wasn't exact match
        if year:
            key_no_year = f"{normalize_title(title)}:"
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute('SELECT tmdb_id, title, year, poster_path, directors, "cast" FROM movies WHERE lookup_key = ?', (key_no_year,))
            row = cur.fetchone()
            conn.close()
            
    if row:
        return {
            "tmdb_id": row[0],
            "title": row[1],
            "year": row[2],
            "poster_path": row[3],
            "directors": json.loads(row[4] or "[]"),
            "cast": json.loads(row[5] or "[]"),
        }
    return None


def set_cached_movie(title: str, year: Optional[int], movie_data: Dict[str, Any], db_path: str = DB_PATH):
    key = f"{normalize_title(title)}:{year if year else ''}"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO movies (lookup_key, tmdb_id, title, year, poster_path, directors, "cast")
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        key,
        movie_data.get("tmdb_id"),
        movie_data.get("title", title),
        movie_data.get("year", year),
        movie_data.get("poster_path"),
        json.dumps(movie_data.get("directors", [])),
        json.dumps(movie_data.get("cast", [])),
    ))
    conn.commit()
    conn.close()


def get_cached_person(person_id: int, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT person_id, name, profile_path, total_acting_movies, total_directing_movies FROM persons WHERE person_id = ?", (person_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {
            "person_id": row[0],
            "name": row[1],
            "profile_path": row[2],
            "total_acting_movies": row[3],
            "total_directing_movies": row[4],
        }
    return None


def set_cached_person(person_id: int, name: str, profile_path: Optional[str], total_acting: int, total_directing: int, db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO persons (person_id, name, profile_path, total_acting_movies, total_directing_movies)
        VALUES (?, ?, ?, ?, ?)
    """, (person_id, name, profile_path, total_acting, total_directing))
    conn.commit()
    conn.close()


def get_cached_profile(username: str, db_path: str = DB_PATH) -> Optional[List[Dict[str, Any]]]:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT films_json FROM scraped_profiles WHERE lower(username) = lower(?)", (username,))
    row = cur.fetchone()
    conn.close()
    if row and row[0]:
        try:
            return json.loads(row[0])
        except Exception:
            return None
    return None


def set_cached_profile(username: str, films: List[Dict[str, Any]], db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO scraped_profiles (username, films_json, total_scraped)
        VALUES (?, ?, ?)
    """, (username.lower().strip(), json.dumps(films), len(films)))
    conn.commit()
    conn.close()


# Initialize database schema on load
init_db()
