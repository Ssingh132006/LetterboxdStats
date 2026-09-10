"use client";

import React, { useState, useRef } from "react";
import { Upload, User, Globe, FileText, ArrowRight, Loader2, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { UserStats } from "../types";

interface DataIngestionProps {
  primaryStats: UserStats | null;
  comparisonStats: UserStats | null;
  onUploadCsv: (file: File, userLabel?: string) => Promise<void>;
  onScrapeUsername: (username: string, isComparison: boolean, scrapeAll: boolean) => Promise<void>;
  isProcessingPrimary: boolean;
  isProcessingComparison: boolean;
  onLoadAlexDemo: () => void;
  onLoadTaylorDemo: () => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({
  primaryStats,
  comparisonStats,
  onUploadCsv,
  onScrapeUsername,
  isProcessingPrimary,
  isProcessingComparison,
  onLoadAlexDemo,
  onLoadTaylorDemo,
}) => {
  const [primaryTab, setPrimaryTab] = useState<"csv" | "username">("csv");
  const [primaryUsername, setPrimaryUsername] = useState("");
  const [comparisonUsername, setComparisonUsername] = useState("");
  const [primaryScrapeAll, setPrimaryScrapeAll] = useState(true);
  const [comparisonScrapeAll, setComparisonScrapeAll] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        onUploadCsv(file, "My Library");
      } else {
        alert("Please upload a .csv file (watched.csv or diary.csv).");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onUploadCsv(file, "My Library");
    }
  };

  const handlePrimaryUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (primaryUsername.trim()) {
      onScrapeUsername(primaryUsername.trim(), false, primaryScrapeAll);
    }
  };

  const handleComparisonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comparisonUsername.trim()) {
      onScrapeUsername(comparisonUsername.trim(), true, comparisonScrapeAll);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      {/* 1. Primary User Ingestion Card */}
      <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#00e054]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e054]"></span>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Step 1: Your Letterboxd History
              </h2>
            </div>
            {primaryStats && (
              <span className="flex items-center gap-1 text-xs font-semibold text-[#00e054] bg-[#00e054]/10 px-2.5 py-1 rounded-full border border-[#00e054]/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {primaryStats.total_films} Films Analyzed
              </span>
            )}
          </div>

          <p className="text-xs text-[#99aabb] mb-4">
            Upload your Letterboxd <code className="text-[#00e054] font-mono bg-[#14181c] px-1.5 py-0.5 rounded">watched.csv</code> export or enter your username to scrape all your public watched films across all pages.
          </p>

          {/* Subtabs for Primary User */}
          <div className="flex items-center gap-2 mb-4 p-1 rounded-xl bg-[#14181c] border border-[#2c3440] w-fit">
            <button
              onClick={() => setPrimaryTab("csv")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                primaryTab === "csv"
                  ? "bg-[#242c34] text-white shadow-sm"
                  : "text-[#99aabb] hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV (All Films)
            </button>
            <button
              onClick={() => setPrimaryTab("username")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                primaryTab === "username"
                  ? "bg-[#242c34] text-white shadow-sm"
                  : "text-[#99aabb] hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Letterboxd Username
            </button>
          </div>

          {/* CSV Upload Dropzone */}
          {primaryTab === "csv" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragOver
                  ? "border-[#00e054] bg-[#00e054]/5"
                  : "border-[#2c3440] hover:border-[#445566] bg-[#14181c]/60"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".csv"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 rounded-full bg-[#242c34] text-[#00e054]">
                  {isProcessingPrimary ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div className="text-sm font-medium text-white">
                  {isProcessingPrimary
                    ? "Enriching all films & calculating stats..."
                    : "Drop watched.csv here or click to browse"}
                </div>
                <p className="text-xs text-[#556677]">
                  Parses 100% of rows from your Letterboxd watched.csv or diary.csv
                </p>
              </div>
            </div>
          ) : (
            /* Username Scraping Form */
            <form onSubmit={handlePrimaryUsernameSubmit} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#556677] text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={primaryUsername}
                    onChange={(e) => setPrimaryUsername(e.target.value)}
                    placeholder="e.g. your Letterboxd username"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] text-sm text-white placeholder-[#556677] focus:outline-none focus:border-[#00e054] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessingPrimary || !primaryUsername.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#00e054] hover:bg-[#00e054]/90 text-black text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isProcessingPrimary ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Analyze All Films
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-[#99aabb] px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primaryScrapeAll}
                    onChange={(e) => setPrimaryScrapeAll(e.target.checked)}
                    className="rounded accent-[#00e054]"
                  />
                  <span>Scrape all available pages (complete filmography)</span>
                </label>
              </div>
            </form>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-[#2c3440]/60 flex items-center justify-between text-xs text-[#99aabb]">
          <span>Don&apos;t have an export handy?</span>
          <button
            onClick={onLoadAlexDemo}
            className="text-[#00e054] hover:underline font-medium inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[#ff8000]" /> Use Alex&apos;s Profile (Demo)
          </button>
        </div>
      </div>

      {/* 2. Comparison User Ingestion Card */}
      <div className="rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#40bcf4]/10 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#40bcf4]"></span>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Step 2: Comparison Letterboxd User
              </h2>
            </div>
            {comparisonStats && (
              <span className="flex items-center gap-1 text-xs font-semibold text-[#40bcf4] bg-[#40bcf4]/10 px-2.5 py-1 rounded-full border border-[#40bcf4]/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {comparisonStats.label} ({comparisonStats.total_films} films)
              </span>
            )}
          </div>

          <p className="text-xs text-[#99aabb] mb-4">
            Enter any public Letterboxd username to scrape their entire filmography across all pages and compare side-by-side.
          </p>

          <form onSubmit={handleComparisonSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#99aabb] uppercase tracking-wider">
                Letterboxd Username / ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#556677] text-sm">
                    https://letterboxd.com/
                  </span>
                  <input
                    type="text"
                    value={comparisonUsername}
                    onChange={(e) => setComparisonUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-44 pr-3 py-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] text-sm text-white placeholder-[#556677] focus:outline-none focus:border-[#40bcf4] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessingComparison || !comparisonUsername.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#40bcf4] hover:bg-[#40bcf4]/90 text-black text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {isProcessingComparison ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Compare All
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#99aabb] px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comparisonScrapeAll}
                  onChange={(e) => setComparisonScrapeAll(e.target.checked)}
                  className="rounded accent-[#40bcf4]"
                />
                <span>Scrape all available pages for comparison</span>
              </label>
            </div>
          </form>
        </div>

        <div className="mt-4 pt-3 border-t border-[#2c3440]/60 flex items-center justify-between text-xs text-[#99aabb]">
          <span>Need a profile to test against?</span>
          <button
            onClick={onLoadTaylorDemo}
            className="text-[#40bcf4] hover:underline font-medium inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[#ff8000]" /> Use Taylor&apos;s Profile (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};
