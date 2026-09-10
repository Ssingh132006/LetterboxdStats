"use client";

import React, { useState, useMemo } from "react";
import {
  Clapperboard,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Percent,
  Hash,
  PieChart,
  Film,
  Sparkles,
  Calendar,
  Flame,
  Star,
} from "lucide-react";
import { UserStats, TalentEntry, DecadeStat, CollaborationPair } from "../types";

interface LeaderboardViewProps {
  stats: UserStats;
}

type SortMetric = "absolute" | "completion" | "profile";
type ViewTab = "directors" | "actors" | "collaborations" | "decades" | "all_films";

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ stats }) => {
  const [viewTab, setViewTab] = useState<ViewTab>("directors");
  const [sortMetric, setSortMetric] = useState<SortMetric>("absolute");
  const [searchQuery, setSearchQuery] = useState("");
  const [minFilms, setMinFilms] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rawList: TalentEntry[] = viewTab === "directors" ? stats.directors : stats.actors;

  // Filter & Sort for Directors / Actors
  const processedTalentList = useMemo(() => {
    if (viewTab !== "directors" && viewTab !== "actors") return [];

    return rawList
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesMin = item.count >= minFilms;
        return matchesSearch && matchesMin;
      })
      .sort((a, b) => {
        if (sortMetric === "absolute") {
          return b.count - a.count || b.completion_pct - a.completion_pct;
        } else if (sortMetric === "completion") {
          return b.completion_pct - a.completion_pct || b.count - a.count;
        } else {
          return b.profile_pct - a.profile_pct || b.count - a.count;
        }
      });
  }, [rawList, searchQuery, minFilms, sortMetric, viewTab]);

  // Filter for All Films
  const processedFilms = useMemo(() => {
    if (viewTab !== "all_films") return [];
    return stats.films.filter((f) =>
      f.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [stats.films, searchQuery, viewTab]);

  const toggleExpand = (name: string) => {
    setExpandedId((prev) => (prev === name ? null : name));
  };

  return (
    <div className="w-full space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#14181c] border border-[#2c3440]">
          <button
            onClick={() => {
              setViewTab("directors");
              setExpandedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "directors"
                ? "bg-[#00e054] text-black shadow-md"
                : "text-[#99aabb] hover:text-white"
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            Directors ({stats.directors.length})
          </button>

          <button
            onClick={() => {
              setViewTab("actors");
              setExpandedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "actors"
                ? "bg-[#00e054] text-black shadow-md"
                : "text-[#99aabb] hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Actors ({stats.actors.length})
          </button>

          <button
            onClick={() => {
              setViewTab("collaborations");
              setExpandedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "collaborations"
                ? "bg-[#ff8000] text-black shadow-md"
                : "text-[#99aabb] hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Power Duos ({stats.collaborations?.length || 0})
          </button>

          <button
            onClick={() => {
              setViewTab("decades");
              setExpandedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "decades"
                ? "bg-[#40bcf4] text-black shadow-md"
                : "text-[#99aabb] hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Decades ({stats.decades?.length || 0})
          </button>

          <button
            onClick={() => {
              setViewTab("all_films");
              setExpandedId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              viewTab === "all_films"
                ? "bg-white text-black shadow-md"
                : "text-[#99aabb] hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            All Films ({stats.total_films})
          </button>
        </div>

        {/* Filter Controls (Shown on relevant tabs) */}
        {(viewTab === "directors" || viewTab === "actors" || viewTab === "all_films") && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#556677]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#14181c] border border-[#2c3440] text-xs text-white placeholder-[#556677] focus:outline-none focus:border-[#00e054]"
              />
            </div>

            {/* Metric Selector Dropdown (Only for directors & actors) */}
            {(viewTab === "directors" || viewTab === "actors") && (
              <>
                <div className="flex items-center gap-1 bg-[#14181c] border border-[#2c3440] rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-semibold text-[#556677] uppercase tracking-wider">
                    Sort:
                  </span>
                  <select
                    value={sortMetric}
                    onChange={(e) => setSortMetric(e.target.value as SortMetric)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="absolute" className="bg-[#1c2228] text-white">
                      Absolute Number (Watched)
                    </option>
                    <option value="completion" className="bg-[#1c2228] text-white">
                      Career Completion %
                    </option>
                    <option value="profile" className="bg-[#1c2228] text-white">
                      Profile Share %
                    </option>
                  </select>
                </div>

                <select
                  value={minFilms}
                  onChange={(e) => setMinFilms(Number(e.target.value))}
                  className="bg-[#14181c] border border-[#2c3440] rounded-xl px-2.5 py-1.5 text-xs text-[#99aabb] focus:outline-none focus:border-[#00e054] cursor-pointer"
                >
                  <option value={1} className="bg-[#1c2228] text-white">Min: 1 film</option>
                  <option value={2} className="bg-[#1c2228] text-white">Min: 2 films</option>
                  <option value={3} className="bg-[#1c2228] text-white">Min: 3 films</option>
                  <option value={5} className="bg-[#1c2228] text-white">Min: 5 films</option>
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* 1. Directors & Actors List */}
      {(viewTab === "directors" || viewTab === "actors") && (
        <div className="space-y-3">
          {processedTalentList.length === 0 ? (
            <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-12 text-center text-[#99aabb]">
              <Film className="w-8 h-8 mx-auto mb-2 text-[#556677]" />
              <p className="text-sm font-semibold text-white">No talent matching current filters</p>
              <p className="text-xs text-[#556677] mt-1">Try lowering the minimum films or clearing your search.</p>
            </div>
          ) : (
            processedTalentList.map((item, index) => {
              const isExpanded = expandedId === item.name;
              const rank = index + 1;

              return (
                <div
                  key={item.name}
                  className="rounded-2xl bg-[#1c2228] border border-[#2c3440] hover:border-[#445566] transition-all overflow-hidden shadow-sm"
                >
                  {/* Main Row */}
                  <div
                    onClick={() => toggleExpand(item.name)}
                    className="p-4 flex items-center justify-between cursor-pointer gap-4 select-none hover:bg-[#242c34]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Rank Badge */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          rank === 1
                            ? "bg-[#ffb400]/20 text-[#ffb400] border border-[#ffb400]/40 shadow-sm"
                            : rank === 2
                            ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                            : rank === 3
                            ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                            : "bg-[#14181c] text-[#556677] border border-[#2c3440]"
                        }`}
                      >
                        {rank}
                      </div>

                      {/* Talent Avatar */}
                      {item.profile_path ? (
                        <img
                          src={item.profile_path}
                          alt={item.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#2c3440] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#242c34] border border-[#2c3440] flex items-center justify-center text-xs font-bold text-[#99aabb] shrink-0">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Name & Quick stats */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate hover:text-[#00e054] transition-colors">
                            {item.name}
                          </span>
                          {item.completion_pct >= 75 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ffb400]/15 text-[#ffb400] border border-[#ffb400]/30 shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> High Completion
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#99aabb] flex items-center gap-2 mt-0.5">
                          <span>
                            {item.count} film{item.count > 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span>
                            {item.career_total} in career
                          </span>
                          <span>•</span>
                          <span className="text-[#00e054] font-medium">
                            {item.profile_pct}% of your list
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metric Badges & Progress */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Completion Meter */}
                      <div className="hidden sm:flex flex-col items-end w-32">
                        <div className="flex items-center justify-between w-full text-[11px] font-semibold mb-1">
                          <span className="text-[#99aabb]">Career:</span>
                          <span className="text-[#00e054] font-mono">{item.completion_pct}%</span>
                        </div>
                        <div className="w-full bg-[#14181c] rounded-full h-2 overflow-hidden border border-[#2c3440]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(item.completion_pct, 100)}%`,
                              backgroundColor:
                                item.completion_pct >= 75
                                  ? "#00e054"
                                  : item.completion_pct >= 40
                                  ? "#40bcf4"
                                  : "#ff8000",
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Primary Metric Number */}
                      <div className="text-right min-w-[70px]">
                        {sortMetric === "absolute" && (
                          <div>
                            <div className="text-base font-black text-white">{item.count}</div>
                            <div className="text-[10px] text-[#556677] uppercase font-semibold">Watched</div>
                          </div>
                        )}
                        {sortMetric === "completion" && (
                          <div>
                            <div className="text-base font-black text-[#00e054]">{item.completion_pct}%</div>
                            <div className="text-[10px] text-[#556677] uppercase font-semibold">
                              {item.count}/{item.career_total} films
                            </div>
                          </div>
                        )}
                        {sortMetric === "profile" && (
                          <div>
                            <div className="text-base font-black text-[#40bcf4]">{item.profile_pct}%</div>
                            <div className="text-[10px] text-[#556677] uppercase font-semibold">Profile Share</div>
                          </div>
                        )}
                      </div>

                      <div className="text-[#556677]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Film List Drawer */}
                  {isExpanded && (
                    <div className="border-t border-[#2c3440] bg-[#14181c]/70 p-4 animate-fadeIn">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#99aabb] mb-3 flex items-center justify-between">
                        <span>Films You&apos;ve Watched featuring {item.name} ({item.films.length})</span>
                        <span className="text-[11px] text-[#556677]">
                          Career: {item.count} of {item.career_total} films ({item.completion_pct}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {item.films.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-[#1c2228] border border-[#2c3440]"
                          >
                            {f.poster_path ? (
                              <img
                                src={f.poster_path}
                                alt={f.title}
                                className="w-9 h-13 rounded object-cover border border-[#2c3440] shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-13 rounded bg-[#242c34] flex items-center justify-center text-[10px] text-[#556677] shrink-0">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate" title={f.title}>
                                {f.title}
                              </div>
                              <div className="text-[11px] text-[#99aabb]">
                                {f.year || "Year unknown"}
                                {f.character && (
                                  <span className="text-[#556677]"> as {f.character}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Director + Actor Power Duos */}
      {viewTab === "collaborations" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#1c2228] border border-[#2c3440]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#ff8000]" />
              Director & Actor Frequent Collaborations
            </h3>
            <p className="text-xs text-[#99aabb]">
              The power duos that appear together most often across your watched films.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(stats.collaborations || []).map((c, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-[#1c2228] border border-[#2c3440] flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <span className="text-[#40bcf4]">{c.director}</span>
                    <span className="text-[#556677] font-normal">+</span>
                    <span className="text-[#ff8000]">{c.actor}</span>
                  </div>
                  <div className="text-[11px] text-[#99aabb] mt-1 truncate" title={c.films.join(", ")}>
                    Films: {c.films.join(", ")}
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#ff8000]/10 border border-[#ff8000]/30 text-[#ff8000] text-xs font-bold shrink-0">
                  {c.count} films
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Decades Breakdown */}
      {viewTab === "decades" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#1c2228] border border-[#2c3440]">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#40bcf4]" />
              Decade & Era Distribution
            </h3>
            <p className="text-xs text-[#99aabb]">
              Explore which cinematic eras dominate your watch history.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(stats.decades || []).map((d) => (
              <div
                key={d.decade}
                className="p-4 rounded-2xl bg-[#1c2228] border border-[#2c3440] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{d.decade}</span>
                  <span className="text-xs font-mono font-bold text-[#40bcf4]">
                    {d.percentage}%
                  </span>
                </div>

                <div className="w-full bg-[#14181c] rounded-full h-2.5 overflow-hidden border border-[#2c3440] mb-2">
                  <div
                    className="h-full rounded-full bg-[#40bcf4] transition-all duration-500"
                    style={{ width: `${Math.min(d.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="text-xs text-[#99aabb]">
                  {d.count} film{d.count > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. All Watched Films Table */}
      {viewTab === "all_films" && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-[#1c2228] border border-[#2c3440] flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Showing {processedFilms.length} of {stats.total_films} total films
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {processedFilms.map((f, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-[#1c2228] border border-[#2c3440] flex items-center gap-3"
              >
                {f.poster_path ? (
                  <img
                    src={f.poster_path}
                    alt={f.title}
                    className="w-10 h-14 rounded-lg object-cover border border-[#2c3440] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-[#242c34] flex items-center justify-center text-xs text-[#556677] shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate" title={f.title}>
                    {f.title}
                  </div>
                  <div className="text-xs text-[#99aabb] flex items-center gap-2 mt-0.5">
                    <span>{f.year || "Year unknown"}</span>
                    {f.rating && (
                      <span className="flex items-center gap-0.5 text-[#ffb400]">
                        <Star className="w-3 h-3 fill-current" /> {f.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
