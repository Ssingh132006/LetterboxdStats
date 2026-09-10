"use client";

import React from "react";
import {
  Film,
  Clapperboard,
  Users,
  Trophy,
  Calendar,
  Compass,
  Sparkles,
  Layers,
} from "lucide-react";
import { UserStats } from "../types";

interface StatCardsProps {
  stats: UserStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const { summary, directors, actors } = stats;

  const topDirectorObj = directors.length > 0 ? directors[0] : null;
  const topActorObj = actors.length > 0 ? actors[0] : null;

  return (
    <div className="space-y-4 mb-8">
      {/* Primary Key Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Films */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-4 flex flex-col justify-between shadow-md hover:border-[#445566] transition-colors">
          <div className="flex items-center justify-between text-[#99aabb] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Films Analyzed</span>
            <Film className="w-4 h-4 text-[#00e054]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stats.total_films}</div>
            <div className="text-[11px] text-[#99aabb] mt-0.5">
              {summary.total_directors} directors • {summary.total_actors} actors
            </div>
          </div>
        </div>

        {/* 2. Top Director */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-4 flex flex-col justify-between shadow-md hover:border-[#445566] transition-colors">
          <div className="flex items-center justify-between text-[#99aabb] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Director</span>
            <Clapperboard className="w-4 h-4 text-[#40bcf4]" />
          </div>
          <div>
            <div className="text-lg font-bold text-white truncate" title={summary.top_director || "N/A"}>
              {summary.top_director || "N/A"}
            </div>
            {topDirectorObj && (
              <div className="text-[11px] text-[#00e054] font-medium mt-0.5">
                {topDirectorObj.count} films ({topDirectorObj.completion_pct}% of career)
              </div>
            )}
          </div>
        </div>

        {/* 3. Top Actor */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-4 flex flex-col justify-between shadow-md hover:border-[#445566] transition-colors">
          <div className="flex items-center justify-between text-[#99aabb] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Actor</span>
            <Users className="w-4 h-4 text-[#ff8000]" />
          </div>
          <div>
            <div className="text-lg font-bold text-white truncate" title={summary.top_actor || "N/A"}>
              {summary.top_actor || "N/A"}
            </div>
            {topActorObj && (
              <div className="text-[11px] text-[#ff8000] font-medium mt-0.5">
                {topActorObj.count} films ({topActorObj.profile_pct}% of your list)
              </div>
            )}
          </div>
        </div>

        {/* 4. Filmography Completion Leader */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-4 flex flex-col justify-between shadow-md hover:border-[#445566] transition-colors">
          <div className="flex items-center justify-between text-[#99aabb] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Peak</span>
            <Trophy className="w-4 h-4 text-[#ffb400]" />
          </div>
          <div>
            {summary.highest_completion ? (
              <>
                <div className="text-lg font-bold text-white truncate" title={summary.highest_completion.name}>
                  {summary.highest_completion.name}
                </div>
                <div className="text-[11px] text-[#ffb400] font-medium mt-0.5">
                  {summary.highest_completion.pct}% ({summary.highest_completion.count}/{summary.highest_completion.total} {summary.highest_completion.role.toLowerCase()} films)
                </div>
              </>
            ) : (
              <div className="text-sm text-[#99aabb]">Explore more films</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Cinema Insights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Average Release Year & Timeline */}
        <div className="rounded-xl bg-[#181e24] border border-[#2c3440] p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#40bcf4]/10 text-[#40bcf4] shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#99aabb] font-semibold uppercase tracking-wider">
              Era Center
            </div>
            <div className="text-sm font-bold text-white">
              {summary.average_year ? `Avg: ${summary.average_year}` : "N/A"}
              {summary.earliest_film && summary.latest_film && (
                <span className="text-[11px] text-[#556677] font-normal ml-1.5">
                  ({summary.earliest_film.year} – {summary.latest_film.year})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Auteur Concentration */}
        <div className="rounded-xl bg-[#181e24] border border-[#2c3440] p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00e054]/10 text-[#00e054] shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#99aabb] font-semibold uppercase tracking-wider">
              Auteur Loyalty
            </div>
            <div className="text-sm font-bold text-white">
              {summary.auteur_concentration || 0}% from Top 5
              <span className="text-[11px] text-[#556677] font-normal ml-1">
                {summary.auteur_concentration && summary.auteur_concentration > 30 ? "High Focus" : "Eclectic"}
              </span>
            </div>
          </div>
        </div>

        {/* Exploration Ratio */}
        <div className="rounded-xl bg-[#181e24] border border-[#2c3440] p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ff8000]/10 text-[#ff8000] shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-[#99aabb] font-semibold uppercase tracking-wider">
              Exploration Ratio
            </div>
            <div className="text-sm font-bold text-white">
              {summary.exploration_ratio || 0} films/dir
              <span className="text-[11px] text-[#556677] font-normal ml-1">
                ({summary.total_directors} distinct)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
