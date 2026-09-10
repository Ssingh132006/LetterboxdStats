"use client";

import React, { useState } from "react";
import { X, Key, Check, AlertCircle, ExternalLink, Database } from "lucide-react";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasTmdbKey: boolean;
  onSaveKey: (key: string) => Promise<boolean>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  hasTmdbKey,
  onSaveKey,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    const success = await onSaveKey(apiKey.trim());
    setIsSaving(false);

    if (success) {
      setStatusMessage({
        type: "success",
        text: "TMDB API key successfully updated! Live queries are enabled.",
      });
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1200);
    } else {
      setStatusMessage({
        type: "error",
        text: "Failed to set TMDB API key. Please check the backend connection.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#1c2228] border border-[#2c3440] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#99aabb] hover:text-white hover:bg-[#242c34] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#00e054]/10 border border-[#00e054]/20 text-[#00e054]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">TMDB API Settings</h3>
            <p className="text-xs text-[#99aabb]">
              Connect live movie credits & actor filmography data
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-5 p-3.5 rounded-xl bg-[#242c34]/70 border border-[#2c3440] text-xs space-y-2">
          <div className="flex items-start gap-2 text-[#99aabb]">
            <Database className="w-4 h-4 text-[#40bcf4] shrink-0 mt-0.5" />
            <span>
              <strong>Smart SQLite Cache:</strong> Every movie and actor fetched is cached locally so you never exhaust TMDB rate limits.
            </span>
          </div>
          <p className="text-[#99aabb]">
            Don&apos;t have a key? The app automatically includes curated sample data for instant exploration, or you can grab a free key from TMDB.
          </p>
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#00e054] hover:underline font-medium"
          >
            Get a free TMDB API Key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#99aabb] uppercase tracking-wider mb-1.5">
              Enter TMDB v3 API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasTmdbKey ? "••••••••••••••••••••••••••••••••" : "e.g. 3a1b2c4d..."}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181c] border border-[#2c3440] text-sm text-white placeholder-[#556677] focus:outline-none focus:border-[#00e054] transition-colors"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-[#00e054]/10 border border-[#00e054]/30 text-[#00e054]"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#99aabb] hover:text-white hover:bg-[#242c34] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00e054]/90 text-black text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? "Saving..." : "Save Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
