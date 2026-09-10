"use client";

import React from "react";
import { Key, Sparkles, Film, RefreshCw, BarChart3 } from "lucide-react";

interface HeaderProps {
  hasTmdbKey: boolean;
  onOpenSettings: () => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hasTmdbKey,
  onOpenSettings,
  onLoadSample,
  isLoadingSample,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2c3440] bg-[#14181c]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          {/* Letterboxd iconic 3 dots */}
          <div className="flex items-center -space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#00e054] shadow-sm shadow-[#00e054]/50"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#40bcf4] shadow-sm shadow-[#40bcf4]/50"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#ff8000] shadow-sm shadow-[#ff8000]/50"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-lg uppercase text-white">
                Letterboxd <span className="text-[#00e054]">Stats</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2c3440] text-[#99aabb] font-mono uppercase tracking-wider">
                Pro
              </span>
            </div>
            <p className="text-xs text-[#99aabb] hidden sm:block">
              Actor & Director Analytics & Cinema Compatibility
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* 1-Click Demo Data Button */}
          <button
            onClick={onLoadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242c34] hover:bg-[#2c3440] text-[#99aabb] hover:text-white border border-[#2c3440] text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Load curated sample profiles (Alex vs Taylor) to preview all features instantly"
          >
            {isLoadingSample ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00e054]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#ff8000]" />
            )}
            <span className="hidden md:inline">Quick Demo:</span> Alex vs Taylor
          </button>

          {/* TMDB Key Config Button */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm ${
              hasTmdbKey
                ? "bg-[#00e054]/10 border-[#00e054]/30 text-[#00e054] hover:bg-[#00e054]/20"
                : "bg-[#242c34] border-[#2c3440] text-[#99aabb] hover:text-white hover:border-[#445566]"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TMDB API:</span>
            <span>{hasTmdbKey ? "Active" : "Key"}</span>
            {hasTmdbKey && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e054] animate-pulse"></span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
