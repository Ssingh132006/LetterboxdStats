"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  BarChart3,
  Users2,
  AlertCircle,
  Sparkles,
  Info,
  Film,
  ArrowRight,
} from "lucide-react";
import { Header } from "../components/Header";
import { ConfigModal } from "../components/ConfigModal";
import { DataIngestion } from "../components/DataIngestion";
import { StatCards } from "../components/StatCards";
import { LeaderboardView } from "../components/LeaderboardView";
import { ComparisonView } from "../components/ComparisonView";
import { UserStats, ComparisonResult } from "../types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000/api";

export default function Home() {
  const [primaryStats, setPrimaryStats] = useState<UserStats | null>(null);
  const [comparisonStats, setComparisonStats] = useState<UserStats | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const [activeTab, setActiveTab] = useState<"my_stats" | "compare">("my_stats");
  const [isProcessingPrimary, setIsProcessingPrimary] = useState(false);
  const [isProcessingComparison, setIsProcessingComparison] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const [hasTmdbKey, setHasTmdbKey] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check health and TMDB status on mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((data) => {
        setHasTmdbKey(Boolean(data.has_tmdb_key));
      })
      .catch(() => {
        console.warn("Backend API not reachable yet on port 8000");
      });
  }, []);

  // Update comparison whenever both profiles are present
  const runComparison = async (u1: UserStats, u2: UserStats) => {
    try {
      const res = await fetch(`${API_BASE}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user1_data: u1,
          user2_data: u2,
        }),
      });
      if (res.ok) {
        const compData: ComparisonResult = await res.json();
        setComparisonResult(compData);
        if (compData.compatibility_score >= 65) {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
      }
    } catch (err) {
      console.error("Comparison error:", err);
    }
  };

  // Upload Primary CSV
  const handleUploadCsv = async (file: File, userLabel: string = "My Library") => {
    setIsProcessingPrimary(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_label", userLabel);

    try {
      const res = await fetch(`${API_BASE}/analyze/csv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to process Letterboxd CSV");
      }

      const data: UserStats = await res.json();
      setPrimaryStats(data);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

      if (comparisonStats) {
        await runComparison(data, comparisonStats);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while analyzing the CSV.");
    } finally {
      setIsProcessingPrimary(false);
    }
  };

  // Scrape Username (Primary or Comparison)
  const handleScrapeUsername = async (
    username: string,
    isComparison: boolean,
    scrapeAll: boolean = true
  ) => {
    setErrorMessage(null);
    if (isComparison) {
      setIsProcessingComparison(true);
    } else {
      setIsProcessingPrimary(true);
    }

    try {
      const res = await fetch(`${API_BASE}/analyze/username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          max_pages: scrapeAll ? null : 5,
          force_refresh: true,
          user_label: `@${username}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Failed to scrape Letterboxd profile for @${username}`);
      }

      const data: UserStats = await res.json();

      if (isComparison) {
        setComparisonStats(data);
        if (primaryStats) {
          await runComparison(primaryStats, data);
          setActiveTab("compare");
        }
      } else {
        setPrimaryStats(data);
        if (comparisonStats) {
          await runComparison(data, comparisonStats);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while scraping the Letterboxd profile.");
    } finally {
      if (isComparison) {
        setIsProcessingComparison(false);
      } else {
        setIsProcessingPrimary(false);
      }
    }
  };

  // 1-Click Load Sample Data
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE}/sample`);
      if (!res.ok) throw new Error("Failed to load sample dataset");
      const sample = await res.json();

      setPrimaryStats(sample.primary_user);
      setComparisonStats(sample.comparison_user);
      setComparisonResult(sample.comparison);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      setErrorMessage("Could not load demo data. Ensure the backend is running.");
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleSaveTmdbKey = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/settings/tmdb-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key }),
      });
      if (res.ok) {
        setHasTmdbKey(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#14181c] text-white">
      {/* Navigation Header */}
      <Header
        hasTmdbKey={hasTmdbKey}
        onOpenSettings={() => setIsConfigOpen(true)}
        onLoadSample={handleLoadSample}
        isLoadingSample={isLoadingSample}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3 shadow-md animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <div className="flex-1">
              <span className="font-semibold">Notice: </span>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-400 hover:text-white underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            Letterboxd <span className="text-[#00e054]">Talent</span> Leaderboard & Compare
          </h1>
          <p className="text-sm text-[#99aabb] mt-1.5 max-w-2xl">
            Uncover your most-watched actors and directors with career completion percentages, profile share metrics, and head-to-head cinema compatibility.
          </p>
        </div>

        {/* Data Ingestion Section */}
        <DataIngestion
          primaryStats={primaryStats}
          comparisonStats={comparisonStats}
          onUploadCsv={handleUploadCsv}
          onScrapeUsername={handleScrapeUsername}
          isProcessingPrimary={isProcessingPrimary}
          isProcessingComparison={isProcessingComparison}
          onLoadAlexDemo={handleLoadSample}
          onLoadTaylorDemo={handleLoadSample}
        />

        {/* Main Tabs (Visible when primary user data is loaded) */}
        {primaryStats && (
          <div className="mt-8 space-y-6 animate-fadeIn">
            {/* High-Level Stat Cards */}
            <StatCards stats={primaryStats} />

            {/* Tab Navigation Pill */}
            <div className="flex items-center justify-between border-b border-[#2c3440] pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("my_stats")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeTab === "my_stats"
                      ? "bg-[#00e054] text-black shadow-md"
                      : "bg-[#1c2228] text-[#99aabb] hover:text-white border border-[#2c3440]"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  My Stats & Leaderboard
                </button>

                <button
                  onClick={() => setActiveTab("compare")}
                  disabled={!comparisonStats}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:pointer-events-none ${
                    activeTab === "compare"
                      ? "bg-[#40bcf4] text-black shadow-md"
                      : "bg-[#1c2228] text-[#99aabb] hover:text-white border border-[#2c3440]"
                  }`}
                >
                  <Users2 className="w-4 h-4" />
                  Compare Taste
                  {comparisonStats ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 font-mono">
                      vs {comparisonStats.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#556677]">(Enter User in Step 2)</span>
                  )}
                </button>
              </div>

              <div className="text-xs text-[#99aabb] hidden sm:block">
                Showing data for <span className="text-white font-bold">{primaryStats.label}</span>
              </div>
            </div>

            {/* Tab 1: My Stats Leaderboard */}
            {activeTab === "my_stats" && <LeaderboardView stats={primaryStats} />}

            {/* Tab 2: Comparison View */}
            {activeTab === "compare" && comparisonStats && comparisonResult && (
              <ComparisonView
                comparison={comparisonResult}
                primaryStats={primaryStats}
                comparisonStats={comparisonStats}
              />
            )}
          </div>
        )}

        {/* Initial Empty State Guide */}
        {!primaryStats && (
          <div className="rounded-3xl bg-[#1c2228]/50 border border-[#2c3440] p-12 text-center my-8 shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-[#00e054]/10 border border-[#00e054]/20 flex items-center justify-center mx-auto mb-4 text-[#00e054]">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Ready to analyze your watch history?
            </h3>
            <p className="text-xs text-[#99aabb] max-w-md mx-auto mb-6">
              Export your data from Letterboxd (Settings &rarr; Data &rarr; Export Data &rarr; watched.csv) and drop it in Step 1 above, or click below to preview with sample cinephile profiles!
            </p>
            <button
              onClick={handleLoadSample}
              disabled={isLoadingSample}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e054] hover:bg-[#00e054]/90 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-black" />
              Load Interactive Demo Profiles
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2c3440] py-6 text-center text-xs text-[#556677]">
        <p>
          Film data provided by TMDb & Letterboxd. Not affiliated with or endorsed by Letterboxd Limited.
        </p>
      </footer>

      {/* TMDB Key Config Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        hasTmdbKey={hasTmdbKey}
        onSaveKey={handleSaveTmdbKey}
      />
    </div>
  );
}
