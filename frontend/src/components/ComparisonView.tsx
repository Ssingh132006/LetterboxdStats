"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Sparkles,
  Users,
  Clapperboard,
  Film,
  TrendingUp,
  HeartHandshake,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { ComparisonResult, UserStats } from "../types";

interface ComparisonViewProps {
  comparison: ComparisonResult;
  primaryStats: UserStats;
  comparisonStats: UserStats;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  comparison,
  primaryStats,
  comparisonStats,
}) => {
  const [chartType, setChartType] = useState<"directors" | "actors">("directors");

  const currentChartData =
    chartType === "directors" ? comparison.chart_directors : comparison.chart_actors;

  const currentSharedList =
    chartType === "directors" ? comparison.shared_directors : comparison.shared_actors;

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* 1. Header Overview & Compatibility Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1c2228] to-[#14181c] border border-[#2c3440] p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Compatibility Ring / Score */}
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-full bg-[#14181c] border-4 border-[#2c3440] shadow-inner shrink-0">
              <div
                className="absolute inset-0 rounded-full border-4 transition-all duration-1000"
                style={{
                  borderColor:
                    comparison.compatibility_score >= 70
                      ? "#00e054"
                      : comparison.compatibility_score >= 45
                      ? "#40bcf4"
                      : "#ff8000",
                  clipPath: `inset(0 0 0 0)`,
                }}
              ></div>
              <div className="text-center">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {comparison.compatibility_score}%
                </span>
                <span className="block text-[10px] text-[#99aabb] uppercase font-bold tracking-wider">
                  Match
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#00e054] uppercase tracking-wider mb-1">
                <HeartHandshake className="w-4 h-4" />
                Cinema Compatibility Index
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {comparison.user1_name} <span className="text-[#556677] font-normal">vs</span> {comparison.user2_name}
              </h2>
              <p className="text-xs text-[#99aabb] mt-1 max-w-md">
                Based on film overlap, shared director filmographies, and common top cast frequencies.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="p-3 rounded-2xl bg-[#14181c] border border-[#2c3440] text-center min-w-[95px]">
              <div className="text-xl font-bold text-[#00e054]">{comparison.shared_movies_count}</div>
              <div className="text-[10px] text-[#99aabb] uppercase font-semibold">Shared Films</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#14181c] border border-[#2c3440] text-center min-w-[95px]">
              <div className="text-xl font-bold text-[#40bcf4]">{comparison.shared_directors_count}</div>
              <div className="text-[10px] text-[#99aabb] uppercase font-semibold">Common Dirs</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#14181c] border border-[#2c3440] text-center min-w-[95px]">
              <div className="text-xl font-bold text-[#ff8000]">{comparison.shared_actors_count}</div>
              <div className="text-[10px] text-[#99aabb] uppercase font-semibold">Common Actors</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Comparative Bar Chart */}
      <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00e054]" />
              Side-by-Side Talent Comparison
            </h3>
            <p className="text-xs text-[#99aabb]">
              Head-to-head watched counts for top shared talent
            </p>
          </div>

          {/* Chart Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#14181c] border border-[#2c3440]">
            <button
              onClick={() => setChartType("directors")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === "directors"
                  ? "bg-[#00e054] text-black shadow-sm"
                  : "text-[#99aabb] hover:text-white"
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              Shared Directors
            </button>
            <button
              onClick={() => setChartType("actors")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === "actors"
                  ? "bg-[#40bcf4] text-black shadow-sm"
                  : "text-[#99aabb] hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Shared Actors
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        {currentChartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[#556677] text-xs">
            <Film className="w-8 h-8 mb-2" />
            No shared talent found with current watch history.
          </div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={currentChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2c3440" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#99aabb"
                  fontSize={11}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tickLine={false}
                />
                <YAxis stroke="#99aabb" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1c2228",
                    borderColor: "#2c3440",
                    borderRadius: "0.75rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "15px", fontSize: "12px" }}
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-white">
                      {value === "User1" ? comparison.user1_name : comparison.user2_name}
                    </span>
                  )}
                />
                <Bar
                  dataKey="User1"
                  name="User1"
                  fill="#00e054"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="User2"
                  name="User2"
                  fill="#40bcf4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Detailed Shared Talent Grid */}
      <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 shadow-md">
        <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
          <span>Top Shared {chartType === "directors" ? "Directors" : "Actors"} Breakdown</span>
          <span className="text-xs text-[#99aabb] font-normal">
            {currentSharedList.length} shared in total
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentSharedList.slice(0, 12).map((item) => (
            <div
              key={item.name}
              className="p-3.5 rounded-xl bg-[#14181c] border border-[#2c3440] flex items-center justify-between gap-3 hover:border-[#445566] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.profile_path ? (
                  <img
                    src={item.profile_path}
                    alt={item.name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#2c3440] shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#242c34] flex items-center justify-center text-xs font-bold text-[#99aabb] shrink-0">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{item.name}</div>
                  <div className="text-[11px] text-[#99aabb]">
                    Career: {item.career_total} films
                  </div>
                </div>
              </div>

              {/* Head-to-Head watched badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#00e054]">
                    {item.user1_count} <span className="text-[10px] text-[#556677] font-normal">films</span>
                  </div>
                  <div className="text-[10px] text-[#556677] truncate max-w-[80px]">
                    {comparison.user1_name}
                  </div>
                </div>
                <div className="text-[#556677] font-bold text-xs">/</div>
                <div className="text-left">
                  <div className="text-xs font-bold text-[#40bcf4]">
                    {item.user2_count} <span className="text-[10px] text-[#556677] font-normal">films</span>
                  </div>
                  <div className="text-[10px] text-[#556677] truncate max-w-[80px]">
                    {comparison.user2_name}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Unique Favorites / Differentiators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User 1 Exclusives */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e054]"></span>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {comparison.user1_name}&apos;s Unique Favorites
            </h4>
          </div>
          <p className="text-xs text-[#99aabb] mb-4">
            Talent you watch frequently that {comparison.user2_name} has barely seen:
          </p>
          <div className="space-y-2">
            {comparison.exclusives.user1_directors.slice(0, 4).map((d) => (
              <div
                key={d.name}
                className="p-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] flex items-center justify-between"
              >
                <div className="text-xs font-semibold text-white">{d.name} (Director)</div>
                <div className="text-xs font-bold text-[#00e054]">{d.count} watched</div>
              </div>
            ))}
            {comparison.exclusives.user1_actors.slice(0, 3).map((a) => (
              <div
                key={a.name}
                className="p-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] flex items-center justify-between"
              >
                <div className="text-xs font-semibold text-white">{a.name} (Actor)</div>
                <div className="text-xs font-bold text-[#00e054]">{a.count} watched</div>
              </div>
            ))}
          </div>
        </div>

        {/* User 2 Exclusives (Recommendations) */}
        <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#40bcf4]"></span>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {comparison.user2_name}&apos;s Highlights to Explore
            </h4>
          </div>
          <p className="text-xs text-[#99aabb] mb-4">
            Top talent loved by {comparison.user2_name} that you haven&apos;t explored yet:
          </p>
          <div className="space-y-2">
            {comparison.exclusives.user2_directors.slice(0, 4).map((d) => (
              <div
                key={d.name}
                className="p-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] flex items-center justify-between"
              >
                <div className="text-xs font-semibold text-white">{d.name} (Director)</div>
                <div className="text-xs font-bold text-[#40bcf4]">{d.count} watched</div>
              </div>
            ))}
            {comparison.exclusives.user2_actors.slice(0, 3).map((a) => (
              <div
                key={a.name}
                className="p-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] flex items-center justify-between"
              >
                <div className="text-xs font-semibold text-white">{a.name} (Actor)</div>
                <div className="text-xs font-bold text-[#40bcf4]">{a.count} watched</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
