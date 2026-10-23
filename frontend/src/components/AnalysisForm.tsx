import React, { useState } from "react";
import { ArrowRight, Globe, AlertCircle, X, Shield, Sparkles } from "lucide-react";
import type { NetworkProfileId } from "../types/api";
import { NETWORK_PROFILES } from "../constants/profiles";

interface AnalysisFormProps {
  onSubmit: (url: string, profile: NetworkProfileId) => void;
  isLoading: boolean;
  initialUrl?: string;
  initialProfile?: NetworkProfileId;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({
  onSubmit,
  isLoading,
  initialUrl = "",
  initialProfile = "4g",
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [profile, setProfile] = useState<NetworkProfileId>(initialProfile);
  const [clientError, setClientError] = useState<string | null>(null);

  const presets = [
    { label: "example.com", url: "https://example.com" },
    { label: "wikipedia.org", url: "https://www.wikipedia.org" },
  ];

  const validateUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Veuillez saisir l'URL du site à analyser.";
    }
    if (trimmed.length > 2048) {
      return "L'URL est trop longue (maximum 2048 caractères).";
    }
    try {
      const candidate = normalizeUrl(trimmed);
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "Seuls les protocoles HTTP et HTTPS sont pris en charge.";
      }
      if (parsed.username || parsed.password) {
        return "Les identifiants dans l'URL ne sont pas autorisés pour des raisons de sécurité.";
      }
      if (!parsed.hostname) {
        return "Veuillez renseigner un nom d'hôte valide.";
      }
    } catch {
      return "Le format de l'URL est invalide.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    const normalizedUrl = normalizeUrl(trimmed);
    const error = validateUrl(normalizedUrl);
    if (error) {
      setClientError(error);
      return;
    }
    setClientError(null);
    setUrl(normalizedUrl);
    onSubmit(normalizedUrl, profile);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (clientError) {
      setClientError(null);
    }
  };

  const applyPreset = (presetUrl: string) => {
    if (isLoading) return;
    setUrl(presetUrl);
    setClientError(null);
  };

  const renderLatencyBars = (id: NetworkProfileId) => {
    const levels: Record<NetworkProfileId, number> = {
      fast: 4,
      "4g": 3,
      "3g": 2,
      slow_3g: 1,
    };
    const activeLevel = levels[id];

    return (
      <div className="flex items-end gap-1 h-3.5" title={`Signal simulé niveau ${activeLevel}/4`}>
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            style={{ height: `${bar * 25}%` }}
            className={`w-1 rounded-sm transition-colors ${
              bar <= activeLevel ? "bg-accent" : "bg-muted/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input Section */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label
              htmlFor="target-url"
              className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4 text-accent" />
              <span>URL cible du benchmark</span>
            </label>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted font-mono text-[11px] mr-0.5">Exemples :</span>
              {presets.map((p) => (
                <button
                  type="button"
                  key={p.url}
                  disabled={isLoading}
                  onClick={() => applyPreset(p.url)}
                  className="px-2 py-0.5 rounded-md border border-outline/40 text-[11px] font-mono text-muted hover:border-accent hover:text-foreground hover:bg-surface-raised transition-all cursor-pointer disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-muted">
              <Globe className="w-4 h-4" />
            </div>

            <input
              id="target-url"
              type="text"
              inputMode="url"
              disabled={isLoading}
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className={`url-input w-full pl-10 pr-10 py-3.5 text-sm sm:text-base font-mono rounded-xl bg-surface text-foreground placeholder:text-muted/60 transition-all shadow-sm ${
                clientError
                  ? "border-[3px] border-danger bg-danger/5 focus:outline-none"
                  : "border-[3px] border-[var(--url-border)] focus:outline-none focus:ring-4 focus:ring-accent/25"
              } ${isLoading ? "opacity-60 cursor-not-allowed bg-surface-raised" : ""}`}
              aria-describedby={clientError ? "url-error-message" : "url-help-text"}
              aria-invalid={clientError ? "true" : "false"}
            />

            {url && !isLoading && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute right-3.5 p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Effacer le champ"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {clientError ? (
            <div
              id="url-error-message"
              role="alert"
              className="flex items-center gap-2 text-xs font-semibold text-danger bg-danger/10 px-3.5 py-2.5 rounded-lg border border-danger/30"
            >
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <span>{clientError}</span>
            </div>
          ) : (
            <div id="url-help-text" className="flex items-center justify-between text-[11px] text-muted font-mono">
              <span>Saisissez un nom de domaine ou une URL complète (le préfixe https:// est ajouté automatiquement).</span>
              <span>Max 2048 caractères</span>
            </div>
          )}
        </div>

        {/* Network Profile Selection */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Conditions réseau émulées (Chromium CDP)</span>
            </label>
            <span className="text-[11px] font-mono text-muted bg-surface-raised px-2.5 py-0.5 rounded-md border border-outline/30">
              4 profils de laboratoire
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {NETWORK_PROFILES.map((p) => {
              const isSelected = profile === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  disabled={isLoading}
                  onClick={() => setProfile(p.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-180 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-accent bg-surface-raised shadow-md"
                      : "border-outline/30 bg-surface hover:border-outline/70 hover:bg-surface-raised/40"
                  } ${isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold font-mono tracking-wide ${
                          isSelected ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {p.name}
                      </span>
                      {renderLatencyBars(p.id)}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-outline/20 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Débit :</span>
                      <span className="font-semibold text-foreground">{p.downloadSpeed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Latence RTT :</span>
                      <span
                        className={`font-semibold ${
                          isSelected ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {p.latency}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button & Trust Info */}
        <div className="pt-3 border-t border-outline/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <span>Inspection anti-SSRF préalable et isolation stricte du processus Chromium.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`px-7 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-180 flex items-center justify-center gap-2.5 shadow-sm cursor-pointer ${
              isLoading
                ? "bg-muted/20 text-muted cursor-not-allowed"
                : "bg-accent text-ink hover:bg-accent-strong active:scale-[0.99] shadow-soft"
            }`}
          >
            <span>{isLoading ? "Session d'audit en cours..." : "Lancer l'audit de connectivité"}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
