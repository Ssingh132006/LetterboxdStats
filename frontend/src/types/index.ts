export interface FilmSummary {
  title: string;
  year: number | null;
  poster_path?: string | null;
  character?: string;
  rating?: string | null;
  letterboxd_uri?: string | null;
  source?: string;
}

export interface TalentEntry {
  id: number | null;
  name: string;
  profile_path: string | null;
  count: number;
  career_total: number;
  completion_pct: number;
  profile_pct: number;
  films: FilmSummary[];
}

export interface DecadeStat {
  decade: string;
  count: number;
  percentage: number;
}

export interface CollaborationPair {
  director: string;
  actor: string;
  count: number;
  films: string[];
}

export interface UserSummary {
  total_films: number;
  total_directors: number;
  total_actors: number;
  top_director: string | null;
  top_actor: string | null;
  highest_completion: {
    name: string;
    role: string;
    pct: number;
    count: number;
    total: number;
  } | null;
  average_year?: number | null;
  earliest_film?: FilmSummary | null;
  latest_film?: FilmSummary | null;
  auteur_concentration?: number;
  exploration_ratio?: number;
}

export interface UserStats {
  label: string;
  total_films: number;
  summary: UserSummary;
  decades?: DecadeStat[];
  collaborations?: CollaborationPair[];
  directors: TalentEntry[];
  actors: TalentEntry[];
  films: FilmSummary[];
  scraped_metadata?: {
    username: string;
    total_scraped: number;
    total_pages_scraped: number;
    total_available_pages: number;
    cached: boolean;
  };
}

export interface SharedTalent {
  name: string;
  profile_path: string | null;
  user1_count: number;
  user2_count: number;
  combined_count: number;
  difference: number;
  career_total: number;
  user1_completion_pct: number;
  user2_completion_pct: number;
  user1_profile_pct: number;
  user2_profile_pct: number;
}

export interface ChartDataPoint {
  name: string;
  User1: number;
  User2: number;
  user1_label: string;
  user2_label: string;
}

export interface ComparisonResult {
  user1_name: string;
  user2_name: string;
  compatibility_score: number;
  shared_movies_count: number;
  shared_movies_sample: string[];
  shared_directors_count: number;
  shared_actors_count: number;
  shared_directors: SharedTalent[];
  shared_actors: SharedTalent[];
  chart_directors: ChartDataPoint[];
  chart_actors: ChartDataPoint[];
  exclusives: {
    user1_directors: TalentEntry[];
    user2_directors: TalentEntry[];
    user1_actors: TalentEntry[];
    user2_actors: TalentEntry[];
  };
}
