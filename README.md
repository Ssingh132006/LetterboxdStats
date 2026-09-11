# Letterboxd Stats & Comparison: Actor & Director Leaderboards

A full-stack web application that analyzes Letterboxd watch histories to generate sorted leaderboards of most-watched actors and directors, complete with career completion percentages, profile share metrics, and a side-by-side comparison engine with taste compatibility scoring.

---

## 🚀 Key Features

1. **Dual Data Ingestion**:
   - **Primary User**: Upload your standard Letterboxd `watched.csv` or `diary.csv` export, or enter a username to scrape public history.
   - **Comparison User**: Enter any public Letterboxd username (`https://letterboxd.com/{username}/films/`) to scrape films on the fly.
2. **Robust Letterboxd Scraper**:
   - Built with **BeautifulSoup4** and **Async HTTP** with browser-mimicking headers.
   - Follows pagination (`/page/2/`, etc.) extracting film titles, release years, poster slugs, and links.
   - Automatically caches scraped user lists in local SQLite (`cache.db`) to avoid redundant requests.
3. **TMDB Async Enrichment**:
   - Movie Search API with fallback year relaxation.
   - Movie Credits API extracting Directors and Top Cast.
   - **Career Filmography Totals**: Pings TMDB Person API (`/person/{person_id}/movie_credits`) for Top 50 talent to compute exact career totals.
   - Concurrency throttling with `asyncio.Semaphore(8)` and SQLite caching.
4. **Advanced Sorting Metrics**:
   - **Absolute Number**: Raw count of films watched featuring that actor/director.
   - **Completion Percentage**: Number of watched films divided by total career filmography count (e.g. 8 of Tarantino's 10 films = 80%).
   - **Profile Percentage**: Percentage of the user's total watched list that this actor/director makes up.
5. **Head-to-Head Comparison View**:
   - **Cinema Compatibility Index**: Multi-factor similarity score based on film overlap and talent frequency vectors.
   - **Side-by-Side Bar Charts**: Interactive Recharts comparing top shared directors and actors.
   - **Shared Talent Breakdown**: Exact head-to-head counts and combined statistics.
   - **Exclusive Favorites**: Identifies favorite talent of User 1 not watched by User 2, and vice-versa.
6. **Zero-Setup Demo Mode**:
   - Pre-loaded with rich sample profiles (**Alex vs Taylor**) and 150+ cinema classics with cast/crew data so anyone can test the app without needing an immediate TMDB API key.
   - Built-in runtime modal to plug in a TMDB API Key at any time.

---

## 📁 Folder Structure

```
letterboxd/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI endpoints & CORS
│   │   ├── scraper.py           # BeautifulSoup Letterboxd scraper with pagination
│   │   ├── tmdb.py              # Async TMDB API client with rate limiting & career counts
│   │   ├── processor.py         # CSV parsing, metric calculations & aggregations
│   │   ├── comparator.py        # Comparison engine & compatibility score
│   │   ├── cache.py             # SQLite database layer for movies, persons & profiles
│   │   └── sample_data.py       # Curated cinema metadata & demo profiles
│   ├── tests/
│   │   └── test_processor.py    # Pytest unit & async integration tests
│   ├── requirements.txt         # Python backend dependencies
│   ├── pytest.ini               # Pytest configuration
│   └── cache.db                 # Persistent SQLite cache
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with dark cinema theme
│   │   │   ├── globals.css      # Letterboxd palette, glow effects & Tailwind
│   │   │   └── page.tsx         # Main page with tabs, stat cards & states
│   │   ├── components/
│   │   │   ├── Header.tsx       # Brand navbar with TMDB status & demo loader
│   │   │   ├── DataIngestion.tsx# CSV drag-and-drop & username scraper input
│   │   │   ├── StatCards.tsx    # High-level summary metrics
│   │   │   ├── LeaderboardView.tsx # Sortable leaderboard with film drawer
│   │   │   ├── ComparisonView.tsx  # Side-by-side charts & compatibility
│   │   │   └── ConfigModal.tsx  # TMDB API Key settings modal
│   │   └── types/
│   │       └── index.ts         # TypeScript definitions
│   ├── package.json             # Frontend dependencies (Next.js, Recharts, Tailwind)
│   ├── tsconfig.json
│   └── next.config.ts
├── sample_watched.csv           # Ready-to-use sample export file
└── README.md
```

---

## 🛠️ Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run unit tests
pytest

# Start FastAPI server (runs on http://localhost:8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Start Next.js dev server (runs on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎬 How to Use

1. **Instant Demo**: Click **"Quick Demo: Alex vs Taylor"** in the top navigation or **"Load Interactive Demo Profiles"** in the center to view pre-calculated leaderboards, side-by-side bar charts, and compatibility metrics.
2. **Analyze Your Export**:
   - In Step 1, drag and drop your Letterboxd `watched.csv` export (or use the provided `sample_watched.csv`).
   - Or switch to the **Letterboxd Username** tab to scrape your public profile directly.
3. **Sort Leaderboard**:
   - Toggle between **Directors** and **Actors**.
   - Use the **Sort** dropdown to sort by:
     - **Absolute Number**: Most watched.
     - **Career Completion %**: Percentage of their entire career filmography you've watched.
     - **Profile Share %**: Percentage of your overall library that features them.
   - Click on any person's card to expand the drawer and inspect the exact watched films.
4. **Compare Taste**:
   - In Step 2, enter any Letterboxd username (e.g. `dave` or your friend's handle) and click **Compare**.
   - Switch to the **Compare Taste** tab to view your **Cinema Compatibility Index**, side-by-side Recharts bar chart, and unique talent recommendations.
5. **Add TMDB API Key (Optional)**:
   - Click **"TMDB API: Key"** in the header to enter your TMDB v3 API key. All movie credits and person filmography totals will be fetched live and cached in SQLite.

---

## ⚡ 100% Free 1-Click Deployment on Vercel (No Credit Card Required)

The project merges the FastAPI backend directly into Next.js using Vercel's native Python Serverless Functions (`frontend/api/index.py` with `frontend/vercel.json`). This means **both frontend and backend are hosted on Vercel for free with zero credit card required**.

### Steps to Deploy:
1. Push this repository to your GitHub account (already pushed to [LetterboxdStats](https://github.com/Ssingh132006/LetterboxdStats)).
2. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub (100% free, no credit card required).
3. Click **"Add New..."** $\rightarrow$ **"Project"** $\rightarrow$ Select **`LetterboxdStats`**.
4. In the Project Configuration:
   - **Root Directory**: Click *Edit* and select **`frontend`**.
   - **Framework Preset**: Next.js (automatically detected).
   - *(Optional)* Expand **Environment Variables** and add:
     - `TMDB_API_KEY`: `a156ba385cb9672d42ce6b1bc687afd1`
5. Click **Deploy**!
   - Vercel will automatically build the Next.js frontend AND provision the FastAPI Python serverless backend under `/api/py`.
   - Your full-stack app is live with SSL and zero separate backend costs!

